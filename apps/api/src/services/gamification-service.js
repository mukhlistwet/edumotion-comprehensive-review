import {
  appendXpLedgerEntry,
  computeXpBalance,
  getPlayerRankFromXp,
  projectLeaderboardEntry
} from '@edumotion/domain';
import { HttpApiError } from '../security/errors.js';
import { requireAuthenticatedUser, withTransactionIdempotency } from './authz-helpers.js';
import { enqueueOutboxEvent } from './outbox-worker.js';

export function createGamificationService({ db }) {
  return {
    async getDashboardStats(ctx) {
      const user = requireAuthenticatedUser(ctx);
      const [xpRes, metaRes] = await Promise.all([
        db.query(`SELECT * FROM xp_ledger WHERE user_id = $1 ORDER BY created_at ASC`, [user.id]),
        db.query(`SELECT * FROM user_gamification_meta WHERE user_id = $1`, [user.id])
      ]);
      const entries = xpRes.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        amount: r.amount,
        direction: r.direction,
        sourceType: r.source_type,
        sourceId: r.source_id,
        reason: r.reason,
        idempotencyKey: r.idempotency_key,
        createdAt: r.created_at
      }));
      const xpBalance = computeXpBalance(entries);
      const rank = getPlayerRankFromXp(xpBalance);
      const m = metaRes.rows[0];
      return {
        xpBalance,
        rank,
        streakDays: m?.streak_days ?? 0,
        bestStreak: m?.best_streak ?? 0,
        hearts: m?.hearts ?? 5,
        maxHearts: m?.max_hearts ?? 5,
        gems: m?.gems ?? 0,
        dailyXpTarget: m?.daily_xp_target ?? 30,
        dailyXpEarned: m?.daily_xp_earned ?? 0,
        ledgerEntries: [...entries].reverse()
      };
    },

    async getLeaderboard(ctx) {
      const user = requireAuthenticatedUser(ctx);
      const res = await db.query(
        `SELECT u.id, u.display_name, u.initials, u.is_minor, u.privacy_opt_in_public_name, m.weekly_xp, m.streak_days, m.league
         FROM users u
         JOIN user_gamification_meta m ON m.user_id = u.id
         WHERE u.role = 'student'
         ORDER BY m.weekly_xp DESC, u.id ASC`
      );
      return res.rows.map((row, idx) =>
        projectLeaderboardEntry(
          {
            rank: idx + 1,
            userId: row.id,
            displayName: row.display_name,
            avatarInitials: row.initials,
            weeklyXp: row.weekly_xp,
            streakDays: row.streak_days,
            league: row.league || 'Liga Safir',
            isMinor: Boolean(row.is_minor),
            privacyOptInPublicName: Boolean(row.privacy_opt_in_public_name)
          },
          user.id
        )
      );
    },

    async getQuestsAndAchievements(ctx) {
      const user = requireAuthenticatedUser(ctx);
      const [questsRes, claimsRes, achRes, userAchRes] = await Promise.all([
        db.query(`SELECT * FROM quests ORDER BY id`),
        db.query(`SELECT quest_id FROM user_quest_claims WHERE user_id = $1`, [user.id]),
        db.query(`SELECT * FROM achievements ORDER BY id`),
        db.query(`SELECT achievement_id FROM user_achievements WHERE user_id = $1`, [user.id])
      ]);
      const claimedSet = new Set(claimsRes.rows.map((r) => r.quest_id));
      const earnedSet = new Set(userAchRes.rows.map((r) => r.achievement_id));
      return {
        quests: questsRes.rows.map((q) => ({
          id: q.id,
          cadence: q.cadence,
          title: q.title,
          targetCount: q.target_count,
          progressCount: q.progress_count,
          rewardXp: q.reward_xp,
          rewardGems: q.reward_gems,
          claimed: claimedSet.has(q.id)
        })),
        achievements: achRes.rows.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          icon: a.icon,
          rewardXp: a.reward_xp,
          unlocksTemplateId: a.unlocks_template_id,
          earned: earnedSet.has(a.id)
        }))
      };
    },

    async claimQuestReward(ctx, questId, { idempotencyKey } = {}) {
      const user = requireAuthenticatedUser(ctx);
      const out = await withTransactionIdempotency(
        db,
        `quest:${user.id}:${questId}`,
        idempotencyKey || questId,
        async (tx) => {
          const qRes = await tx.query(`SELECT * FROM quests WHERE id = $1`, [questId]);
          if (qRes.rows.length === 0) {
            throw new HttpApiError({ code: 'QUEST_NOT_FOUND', message: 'Misi tidak ditemukan.', status: 404 });
          }
          const quest = qRes.rows[0];
          const existingClaim = await tx.query(
            `SELECT 1 FROM user_quest_claims WHERE user_id = $1 AND quest_id = $2`,
            [user.id, questId]
          );
          if (existingClaim.rows.length > 0) {
            return { quest: { id: quest.id, title: quest.title, claimed: true }, alreadyClaimed: true };
          }
          await tx.query(
            `INSERT INTO user_quest_claims (user_id, quest_id) VALUES ($1,$2) ON CONFLICT (user_id, quest_id) DO NOTHING`,
            [user.id, questId]
          );
          const xpRows = await tx.query(`SELECT * FROM xp_ledger WHERE user_id = $1`, [user.id]);
          const xpRes = appendXpLedgerEntry(
            xpRows.rows.map((r) => ({ id: r.id, userId: r.user_id, amount: r.amount, direction: r.direction, idempotencyKey: r.idempotency_key })),
            {
              userId: user.id,
              amount: quest.reward_xp,
              sourceType: 'quest_reward',
              sourceId: quest.id,
              reason: `Klaim misi: ${quest.title}`,
              idempotencyKey: `quest_claim:${quest.id}`
            }
          );
          if (!xpRes.duplicate) {
            const e = xpRes.entry;
            await tx.query(
              `INSERT INTO xp_ledger (id, user_id, amount, direction, source_type, source_id, reason, idempotency_key)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id, idempotency_key) DO NOTHING`,
              [e.id, user.id, e.amount, e.direction, e.sourceType, e.sourceId, e.reason, e.idempotencyKey]
            );
            await tx.query(
              `UPDATE user_gamification_meta SET daily_xp_earned = daily_xp_earned + $2, weekly_xp = weekly_xp + $2, gems = gems + $3, updated_at = NOW() WHERE user_id = $1`,
              [user.id, quest.reward_xp, quest.reward_gems]
            );
            await enqueueOutboxEvent(tx, {
              eventName: 'XP_AWARDED',
              aggregateType: 'xp_ledger',
              aggregateId: e.id,
              userId: user.id,
              tenantId: user.tenantId,
              correlationId: ctx.correlationId,
              payload: { amount: quest.reward_xp, sourceType: 'quest_reward', questId }
            });
          }
          return {
            quest: { id: quest.id, title: quest.title, rewardXp: quest.reward_xp, claimed: true },
            alreadyClaimed: false,
            xpBalance: xpRes.balance
          };
        }
      );
      return out.data;
    },

    async listNotifications(ctx) {
      const user = requireAuthenticatedUser(ctx);
      const res = await db.query(`SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`, [user.id]);
      return res.rows.map((n) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        body: n.body,
        category: n.category,
        read: Boolean(n.read),
        createdAt: n.created_at
      }));
    },

    async markNotificationRead(ctx, notificationId) {
      const user = requireAuthenticatedUser(ctx);
      await db.query(`UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`, [notificationId, user.id]);
      return { ok: true };
    }
  };
}
