import {
  appendXpLedgerEntry,
  buildCanonicalJourneyViewModel,
  computeXpBalance,
  evaluateTemplateEligibility,
  resolveChapterTemplate,
  validateNodePrerequisites
} from '@edumotion/domain';
import { HttpApiError } from '../security/errors.js';
import { requireAuthenticatedUser, withTransactionIdempotency } from './authz-helpers.js';
import { enqueueOutboxEvent } from './outbox-worker.js';

export function createJourneyService({ repos, db }) {
  async function ensureSeedPreferencesAndUnlocks(userId, tx = db) {
    const prefRes = await tx.query(`SELECT * FROM user_journey_preferences WHERE user_id = $1`, [userId]);
    let preferences;
    if (prefRes.rows.length === 0) {
      await tx.query(
        `INSERT INTO user_journey_preferences (user_id, selection_mode, preferred_template_id, pending_template_id)
         VALUES ($1,'adaptive','adventure',NULL) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      preferences = { selectionMode: 'adaptive', preferredTemplateId: 'adventure', pendingTemplateId: null };
    } else {
      const row = prefRes.rows[0];
      preferences = {
        selectionMode: row.selection_mode,
        preferredTemplateId: row.preferred_template_id,
        pendingTemplateId: row.pending_template_id
      };
    }

    let ulkRes = await tx.query(`SELECT * FROM journey_template_unlocks WHERE user_id = $1`, [userId]);
    if (ulkRes.rows.length === 0) {
      for (const tplId of ['adventure', 'board', 'skill']) {
        await tx.query(
          `INSERT INTO journey_template_unlocks (id, user_id, template_id, source)
           VALUES ($1,$2,$3,'base') ON CONFLICT (user_id, template_id) DO NOTHING`,
          [`ulk_${userId}_${tplId}`, userId, tplId]
        );
      }
      ulkRes = await tx.query(`SELECT * FROM journey_template_unlocks WHERE user_id = $1`, [userId]);
    }
    const unlocks = ulkRes.rows.map((u) => ({
      templateId: u.template_id,
      source: u.source,
      sourceReferenceId: u.source_reference_id,
      startsAt: u.starts_at,
      expiresAt: u.expires_at
    }));
    return { preferences, unlocks };
  }

  async function computeNodesForUser(userId, chapter, tx = db) {
    const progRes = await tx.query(
      `SELECT node_id, status FROM user_node_progress WHERE user_id = $1`,
      [userId]
    );
    const statusMap = new Map(progRes.rows.map((r) => [r.node_id, r.status]));
    const rawNodes = chapter.nodes.map((n) => ({ ...n, status: 'locked' }));

    for (const node of rawNodes) {
      const saved = statusMap.get(node.id);
      if (saved === 'completed') {
        node.status = 'completed';
      } else {
        const prereq = validateNodePrerequisites(node, rawNodes);
        if (prereq.met) {
          node.status = saved === 'in_progress' ? 'in_progress' : 'available';
        } else {
          node.status = 'locked';
        }
      }
    }
    return rawNodes;
  }

  async function getOrCreateChapterSnapshot(user, chapter, tx = db, previousTemplateId = null) {
    const existing = await tx.query(
      `SELECT * FROM journey_chapter_snapshots WHERE user_id = $1 AND chapter_id = $2`,
      [user.id, chapter.id]
    );
    if (existing.rows.length > 0) {
      const s = existing.rows[0];
      return {
        templateId: s.template_id,
        templateVersion: s.template_version,
        selectionMode: s.selection_mode,
        selectionReason: s.selection_reason_json || {},
        layoutConfig: s.layout_snapshot_json || {},
        fallbackNotice: s.fallback_notice || null
      };
    }

    const catalog = await repos.listTemplateCatalog(tx);
    const { preferences, unlocks } = await ensureSeedPreferencesAndUnlocks(user.id, tx);
    const resolved = resolveChapterTemplate({
      catalog,
      chapterContext: {
        userId: user.id,
        chapterId: chapter.id,
        sequence: chapter.sequence,
        subjectCode: chapter.subjectCode,
        educationLevel: chapter.educationLevel,
        dominantActivityKind: chapter.dominantActivityKind,
        previousTemplateId
      },
      unlockContext: { grants: unlocks, now: new Date().toISOString() },
      preferences
    });

    const snapshot = {
      templateId: resolved.template.id,
      templateVersion: resolved.template.version,
      selectionMode: resolved.selectionMode,
      selectionReason: resolved.selectionReason,
      layoutConfig: { theme: resolved.template.id },
      fallbackNotice: resolved.fallbackNotice || null
    };

    await tx.query(
      `INSERT INTO journey_chapter_snapshots (
        id, user_id, chapter_id, template_id, template_version, selection_mode, selection_reason_json, layout_snapshot_json, fallback_notice
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9) ON CONFLICT (user_id, chapter_id) DO NOTHING`,
      [
        `snap_${user.id}_${chapter.id}`,
        user.id,
        chapter.id,
        snapshot.templateId,
        snapshot.templateVersion,
        snapshot.selectionMode,
        JSON.stringify(snapshot.selectionReason),
        JSON.stringify(snapshot.layoutConfig),
        snapshot.fallbackNotice
      ]
    );
    if (resolved.consumedPending) {
      await tx.query(
        `UPDATE user_journey_preferences SET pending_template_id = NULL, updated_at = NOW() WHERE user_id = $1`,
        [user.id]
      );
    }
    return snapshot;
  }

  return {
    async listTemplates(ctx) {
      const user = requireAuthenticatedUser(ctx);
      const [catalog, { unlocks }] = await Promise.all([
        repos.listTemplateCatalog(),
        ensureSeedPreferencesAndUnlocks(user.id)
      ]);
      const now = new Date().toISOString();
      return catalog.map((tpl) => {
        const check = evaluateTemplateEligibility({
          template: tpl,
          chapterContext: { educationLevel: user.educationLevel || 'SMP', subjectCode: 'mathematics' },
          unlockContext: { grants: unlocks, now }
        });
        return {
          ...tpl,
          unlocked: check.reasonCode !== 'TEMPLATE_LOCKED' && check.reasonCode !== 'TEMPLATE_DISABLED',
          eligible: check.eligible,
          reasonCode: check.reasonCode,
          reasonMessage: check.message
        };
      });
    },

    async getPreferences(ctx) {
      const user = requireAuthenticatedUser(ctx);
      const { preferences, unlocks } = await ensureSeedPreferencesAndUnlocks(user.id);
      return { ...preferences, unlocks };
    },

    async getUnlocks(ctx) {
      const user = requireAuthenticatedUser(ctx);
      const { unlocks } = await ensureSeedPreferencesAndUnlocks(user.id);
      return unlocks;
    },

    async updatePreferences(ctx, { selectionMode, preferredTemplateId }) {
      const user = requireAuthenticatedUser(ctx);
      const { preferences } = await ensureSeedPreferencesAndUnlocks(user.id);
      const nextPreferred = preferredTemplateId || preferences.preferredTemplateId;
      const nextPending = selectionMode === 'personal' ? preferences.pendingTemplateId : null;
      await db.query(
        `UPDATE user_journey_preferences SET selection_mode = $2, preferred_template_id = $3, pending_template_id = $4, updated_at = NOW() WHERE user_id = $1`,
        [user.id, selectionMode, nextPreferred, nextPending]
      );
      return { selectionMode, preferredTemplateId: nextPreferred, pendingTemplateId: nextPending };
    },

    async setPendingTemplate(ctx, { templateId }) {
      const user = requireAuthenticatedUser(ctx);
      const [catalog, { unlocks }] = await Promise.all([
        repos.listTemplateCatalog(),
        ensureSeedPreferencesAndUnlocks(user.id)
      ]);
      const tpl = catalog.find((t) => t.id === templateId);
      const check = evaluateTemplateEligibility({
        template: tpl,
        chapterContext: { educationLevel: user.educationLevel || 'SMP', subjectCode: 'mathematics' },
        unlockContext: { grants: unlocks, now: new Date().toISOString() }
      });
      if (!check.eligible) {
        throw new HttpApiError({ code: check.reasonCode, message: check.message, status: 403 });
      }
      await db.query(
        `UPDATE user_journey_preferences SET pending_template_id = $2, selection_mode = 'personal', updated_at = NOW() WHERE user_id = $1`,
        [user.id, templateId]
      );
      const { preferences } = await ensureSeedPreferencesAndUnlocks(user.id);
      return {
        preferences,
        message: 'Pilihan disimpan untuk chapter berikutnya. Snapshot chapter aktif tetap dipertahankan.'
      };
    },

    async getChapterMap(ctx, journeyId, chapterId, accessibility = {}) {
      const user = requireAuthenticatedUser(ctx);
      const chapter = await repos.getChapterWithNodes(journeyId, chapterId);
      if (!chapter) {
        throw new HttpApiError({ code: 'CHAPTER_NOT_FOUND', message: 'Chapter tidak ditemukan.', status: 404 });
      }
      const snapshot = await db.transaction((tx) => getOrCreateChapterSnapshot(user, chapter, tx));
      const nodes = await computeNodesForUser(user.id, chapter);
      const viewModel = buildCanonicalJourneyViewModel({
        journeyId,
        pathId: chapter.pathId,
        chapter,
        snapshot,
        nodes,
        accessibility
      });
      return { empty: false, viewModel };
    },

    async startNode(ctx, journeyId, nodeId) {
      const user = requireAuthenticatedUser(ctx);
      const chRes = await db.query(
        `SELECT n.chapter_id FROM journey_nodes n JOIN journey_chapters c ON c.id = n.chapter_id WHERE n.id = $1 AND c.journey_id = $2`,
        [nodeId, journeyId]
      );
      if (chRes.rows.length === 0) {
        throw new HttpApiError({ code: 'NODE_NOT_FOUND', message: 'Checkpoint tidak ditemukan.', status: 404 });
      }
      const chapter = await repos.getChapterWithNodes(journeyId, chRes.rows[0].chapter_id);
      const nodes = await computeNodesForUser(user.id, chapter);
      const target = nodes.find((n) => n.id === nodeId);
      if (target.status === 'locked') {
        throw new HttpApiError({
          code: 'NODE_PREREQUISITE_NOT_MET',
          message: 'Selesaikan checkpoint prasyarat terlebih dahulu.',
          status: 409
        });
      }
      if (target.status !== 'completed') {
        await db.query(
          `INSERT INTO user_node_progress (user_id, node_id, status, started_at, attempt_count)
           VALUES ($1,$2,'in_progress',NOW(),1)
           ON CONFLICT (user_id, node_id) DO UPDATE SET status = CASE WHEN user_node_progress.status = 'completed' THEN 'completed' ELSE 'in_progress' END`,
          [user.id, nodeId]
        );
      }
      return { nodeId, status: target.status === 'completed' ? 'completed' : 'in_progress' };
    },

    async completeNode(ctx, journeyId, nodeId, { idempotencyKey } = {}) {
      const user = requireAuthenticatedUser(ctx);
      const out = await withTransactionIdempotency(
        db,
        `completeNode:${user.id}:${nodeId}`,
        idempotencyKey || `${journeyId}:${nodeId}`,
        async (tx) => {
          const chRes = await tx.query(
            `SELECT n.chapter_id FROM journey_nodes n JOIN journey_chapters c ON c.id = n.chapter_id WHERE n.id = $1 AND c.journey_id = $2`,
            [nodeId, journeyId]
          );
          if (chRes.rows.length === 0) {
            throw new HttpApiError({ code: 'NODE_NOT_FOUND', message: 'Checkpoint tidak ditemukan.', status: 404 });
          }
          const chapter = await repos.getChapterWithNodes(journeyId, chRes.rows[0].chapter_id, tx);
          const nodes = await computeNodesForUser(user.id, chapter, tx);
          const target = nodes.find((n) => n.id === nodeId);
          if (target.status === 'locked') {
            throw new HttpApiError({
              code: 'NODE_PREREQUISITE_NOT_MET',
              message: 'Tidak dapat menyelesaikan checkpoint sebelum prasyarat terpenuhi.',
              status: 409
            });
          }

          const alreadyCompleted = target.status === 'completed';
          const xpResRows = await tx.query(`SELECT * FROM xp_ledger WHERE user_id = $1 ORDER BY created_at ASC`, [user.id]);
          const existingEntries = xpResRows.rows.map((r) => ({
            id: r.id,
            userId: r.user_id,
            amount: r.amount,
            direction: r.direction,
            idempotencyKey: r.idempotency_key
          }));
          let xpBalance = computeXpBalance(existingEntries);
          const xpReward = Number(target.rewardPreview?.xp || 50);

          if (!alreadyCompleted) {
            await tx.query(
              `INSERT INTO user_node_progress (user_id, node_id, status, completed_at, best_score, attempt_count)
               VALUES ($1,$2,'completed',NOW(),100,1)
               ON CONFLICT (user_id, node_id) DO UPDATE SET status = 'completed', completed_at = COALESCE(user_node_progress.completed_at, NOW()), attempt_count = user_node_progress.attempt_count + 1`,
              [user.id, nodeId]
            );
            const ledgerRes = appendXpLedgerEntry(existingEntries, {
              userId: user.id,
              amount: xpReward,
              sourceType: 'journey_node_completed',
              sourceId: nodeId,
              reason: `Menyelesaikan checkpoint ${target.title}`,
              idempotencyKey: `node_complete:${nodeId}`
            });
            xpBalance = ledgerRes.balance;
            if (!ledgerRes.duplicate) {
              const newEntry = ledgerRes.entry;
              await tx.query(
                `INSERT INTO xp_ledger (id, user_id, amount, direction, source_type, source_id, reason, idempotency_key)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id, idempotency_key) DO NOTHING`,
                [newEntry.id, user.id, newEntry.amount, newEntry.direction, newEntry.sourceType, newEntry.sourceId, newEntry.reason, newEntry.idempotencyKey]
              );
              await tx.query(
                `UPDATE user_gamification_meta SET daily_xp_earned = daily_xp_earned + $2, weekly_xp = weekly_xp + $2, updated_at = NOW() WHERE user_id = $1`,
                [user.id, xpReward]
              );
              await enqueueOutboxEvent(tx, {
                eventName: 'JOURNEY_NODE_COMPLETED',
                aggregateType: 'journey_node_progress',
                aggregateId: nodeId,
                userId: user.id,
                tenantId: user.tenantId,
                correlationId: ctx.correlationId,
                payload: { xpAmount: xpReward, journeyId }
              });
            }

            if (target.rewardPreview?.achievementId) {
              const achRes = await tx.query(`SELECT * FROM achievements WHERE id = $1`, [target.rewardPreview.achievementId]);
              if (achRes.rows.length > 0) {
                const ach = achRes.rows[0];
                await tx.query(
                  `INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1,$2) ON CONFLICT (user_id, achievement_id) DO NOTHING`,
                  [user.id, ach.id]
                );
                if (ach.unlocks_template_id) {
                  await tx.query(
                    `INSERT INTO journey_template_unlocks (id, user_id, template_id, source, source_reference_id)
                     VALUES ($1,$2,$3,'achievement',$4) ON CONFLICT (user_id, template_id) DO NOTHING`,
                    [`ulk_${user.id}_${ach.unlocks_template_id}`, user.id, ach.unlocks_template_id, ach.id]
                  );
                }
              }
            }
          }

          return {
            completed: true,
            alreadyCompleted,
            xpAwarded: alreadyCompleted ? 0 : xpReward,
            xpBalance
          };
        }
      );
      return out.data;
    },

    async startNextChapter(ctx, journeyId, { currentChapterId, idempotencyKey, forceAllowDemo = false } = {}) {
      const user = requireAuthenticatedUser(ctx);
      const out = await withTransactionIdempotency(
        db,
        `nextChapter:${user.id}:${journeyId}:${currentChapterId}`,
        idempotencyKey || `${journeyId}:${currentChapterId}`,
        async (tx) => {
          const current = await repos.getChapterWithNodes(journeyId, currentChapterId, tx);
          if (!current) {
            throw new HttpApiError({ code: 'CHAPTER_NOT_FOUND', message: 'Chapter saat ini tidak ditemukan.', status: 404 });
          }
          const nodes = await computeNodesForUser(user.id, current, tx);
          const allDone = nodes.every((n) => n.status === 'completed');
          if (!allDone && !forceAllowDemo) {
            throw new HttpApiError({
              code: 'CHAPTER_PREREQUISITE_NOT_MET',
              message: 'Selesaikan seluruh checkpoint chapter saat ini terlebih dahulu.',
              status: 409
            });
          }
          const nextRes = await tx.query(
            `SELECT id FROM journey_chapters WHERE journey_id = $1 AND sequence = $2`,
            [journeyId, current.sequence + 1]
          );
          if (nextRes.rows.length === 0) {
            throw new HttpApiError({
              code: 'NO_NEXT_CHAPTER',
              message: 'Ini adalah chapter terakhir pada jalur belajar ini.',
              status: 404
            });
          }
          const nextChapter = await repos.getChapterWithNodes(journeyId, nextRes.rows[0].id, tx);
          const prevSnapRes = await tx.query(
            `SELECT template_id FROM journey_chapter_snapshots WHERE user_id = $1 AND chapter_id = $2`,
            [user.id, current.id]
          );
          const previousTemplateId = prevSnapRes.rows[0]?.template_id || null;
          const snapshot = await getOrCreateChapterSnapshot(user, nextChapter, tx, previousTemplateId);

          await tx.query(
            `UPDATE journey_chapters SET status = 'in_progress', started_at = COALESCE(started_at, NOW()) WHERE id = $1`,
            [nextChapter.id]
          );
          await enqueueOutboxEvent(tx, {
            eventName: 'JOURNEY_CHAPTER_STARTED',
            aggregateType: 'journey_chapter_snapshots',
            aggregateId: nextChapter.id,
            userId: user.id,
            tenantId: user.tenantId,
            correlationId: ctx.correlationId,
            payload: { templateId: snapshot.templateId, selectionMode: snapshot.selectionMode }
          });
          return {
            chapterId: nextChapter.id,
            snapshot
          };
        }
      );
      return out.data;
    },

    async rejectSnapshotMutation(ctx, chapterId) {
      requireAuthenticatedUser(ctx);
      throw new HttpApiError({
        code: 'CHAPTER_TEMPLATE_IMMUTABLE',
        message: `Snapshot chapter '${chapterId}' bersifat immutable setelah dimulai.`,
        status: 409
      });
    }
  };
}
