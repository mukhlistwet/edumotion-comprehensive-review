import crypto from 'node:crypto';
import {
  appendXpLedgerEntry,
  computeCompetencyMasteryFromEvidence,
  computeNextSpacedRepetitionSchedule,
  gradeQuestionResponse,
  shouldUseHearts,
  toStudentDeliveryDto
} from '@edumotion/domain';
import { HttpApiError } from '../security/errors.js';
import { requireAuthenticatedUser, withTransactionIdempotency } from './authz-helpers.js';
import { enqueueOutboxEvent } from './outbox-worker.js';

export function createLearningService({ repos, db }) {
  return {
    getTaxonomy() {
      return repos.listTaxonomy();
    },

    async listPaths(filters = {}) {
      const lpRes = await db.query(`SELECT * FROM learning_paths ORDER BY id`);
      const chRes = await db.query(`SELECT * FROM journey_chapters ORDER BY journey_id, sequence`);
      const nodesRes = await db.query(`SELECT * FROM journey_nodes ORDER BY chapter_id, sequence`);

      let paths = lpRes.rows.map((r) => ({
        id: r.id,
        journeyId: r.journey_id,
        subjectId: r.subject_id,
        subjectCode: r.subject_code,
        curriculumId: r.curriculum_id,
        curriculumVersionId: r.curriculum_version_id,
        gradeLevelId: r.grade_level_id,
        educationLevel: r.education_level,
        title: r.title,
        description: r.description,
        version: r.version,
        status: r.status
      }));
      if (filters.subjectId) paths = paths.filter((p) => p.subjectId === filters.subjectId);
      if (filters.educationLevel) paths = paths.filter((p) => p.educationLevel === filters.educationLevel);

      const chapters = chRes.rows.map((c) => ({
        id: c.id,
        journeyId: c.journey_id,
        pathId: c.path_id,
        sequence: c.sequence,
        title: c.title,
        subjectCode: c.subject_code,
        educationLevel: c.education_level,
        dominantActivityKind: c.dominant_activity_kind,
        status: c.status,
        startedAt: c.started_at,
        nodes: nodesRes.rows
          .filter((n) => n.chapter_id === c.id)
          .map((n) => ({
            id: n.id,
            sequence: n.sequence,
            kind: n.kind,
            title: n.title,
            description: n.description,
            prerequisiteNodeIds: n.prerequisite_node_ids || [],
            activityIds: n.activity_ids || [],
            rewardPreview: n.reward_preview_json || {},
            levelMilestoneBadge: n.level_milestone_badge
          }))
      }));
      return { items: paths, chapters };
    },

    async getLearningPathById(pathId) {
      const { items, chapters } = await this.listPaths();
      const found = items.find((p) => p.id === pathId);
      if (!found) throw new HttpApiError({ code: 'PATH_NOT_FOUND', message: 'Learning path tidak ditemukan.', status: 404 });
      return { ...found, chapters: chapters.filter((c) => c.pathId === pathId) };
    },

    async listActivities() {
      const res = await db.query(`SELECT * FROM activities ORDER BY id`);
      return res.rows.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        subjectId: a.subject_id,
        mode: a.mode,
        estimatedMinutes: a.estimated_minutes,
        xpReward: a.xp_reward,
        heartsEnabled: Boolean(a.hearts_enabled),
        questionIds: a.policy_json?.questionIds || []
      }));
    },

    async getActivityDelivery(ctx, activityId) {
      const user = requireAuthenticatedUser(ctx);
      const actRes = await db.query(`SELECT * FROM activities WHERE id = $1`, [activityId]);
      if (actRes.rows.length === 0) {
        throw new HttpApiError({ code: 'ACTIVITY_NOT_FOUND', message: 'Aktivitas tidak ditemukan.', status: 404 });
      }
      const act = actRes.rows[0];
      const qIds = act.policy_json?.questionIds || [];
      const questions = [];
      for (const qid of qIds) {
        const qRes = await db.query(
          `SELECT payload_json FROM question_versions WHERE question_id = $1 ORDER BY (CASE WHEN governance_status='published' THEN 0 ELSE 1 END), version DESC LIMIT 1`,
          [qid]
        );
        if (qRes.rows.length > 0) {
          questions.push(toStudentDeliveryDto(qRes.rows[0].payload_json, { mode: act.mode }));
        }
      }
      const metaRes = await db.query(`SELECT hearts FROM user_gamification_meta WHERE user_id = $1`, [user.id]);
      const hearts = metaRes.rows[0]?.hearts ?? 5;
      return {
        activity: {
          id: act.id,
          type: act.type,
          title: act.title,
          mode: act.mode,
          xpReward: act.xp_reward,
          heartsEnabled: shouldUseHearts(act.mode),
          hearts: shouldUseHearts(act.mode) ? hearts : null
        },
        questions
      };
    },

    async getQuestionHint(ctx, questionId, hintIndex = 0) {
      requireAuthenticatedUser(ctx);
      const res = await db.query(
        `SELECT payload_json FROM question_versions WHERE question_id = $1 ORDER BY version DESC LIMIT 1`,
        [questionId]
      );
      if (res.rows.length === 0) {
        throw new HttpApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      }
      const hints = res.rows[0].payload_json?.explanation?.hints || [];
      return {
        hint: hints[Number(hintIndex)] || hints[0] || 'Periksa kembali konsep dasar pada materi ini.',
        totalHints: hints.length
      };
    },

    async submitPracticeAttempt(ctx, activityId, { questionId, response, hintUsed = false, idempotencyKey } = {}) {
      const user = requireAuthenticatedUser(ctx);
      const out = await withTransactionIdempotency(
        db,
        `attempt:${user.id}:${activityId}:${questionId}`,
        idempotencyKey,
        async (tx) => {
          const actRes = await tx.query(`SELECT * FROM activities WHERE id = $1`, [activityId]);
          const qRes = await tx.query(
            `SELECT * FROM question_versions WHERE question_id = $1 ORDER BY (CASE WHEN governance_status='published' THEN 0 ELSE 1 END), version DESC LIMIT 1`,
            [questionId]
          );
          if (actRes.rows.length === 0 || qRes.rows.length === 0) {
            throw new HttpApiError({ code: 'NOT_FOUND', message: 'Aktivitas atau soal tidak ditemukan.', status: 404 });
          }
          const activity = actRes.rows[0];
          const question = qRes.rows[0].payload_json;
          const graded = gradeQuestionResponse(question, response);

          const metaRes = await tx.query(`SELECT * FROM user_gamification_meta WHERE user_id = $1`, [user.id]);
          let hearts = metaRes.rows[0]?.hearts ?? 5;
          if (metaRes.rows.length === 0) {
            await tx.query(
              `INSERT INTO user_gamification_meta (user_id, streak_days, best_streak, hearts, max_hearts, gems, daily_xp_target, daily_xp_earned)
               VALUES ($1,1,1,5,5,50,30,0) ON CONFLICT (user_id) DO NOTHING`,
              [user.id]
            );
          }
          if (!graded.correct && shouldUseHearts(activity.mode) && hearts > 0) {
            hearts -= 1;
            await tx.query(`UPDATE user_gamification_meta SET hearts = $2, updated_at = NOW() WHERE user_id = $1`, [user.id, hearts]);
          }

          const attemptId = `att_${crypto.randomUUID().slice(0, 12)}`;
          await tx.query(
            `INSERT INTO activity_attempts (id, user_id, activity_id, question_id, question_version, correct, score, max_score, hint_used, response_json, idempotency_key)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)`,
            [
              attemptId,
              user.id,
              activityId,
              question.id,
              question.version,
              graded.correct,
              Math.round(Number(graded.earnedPoints ?? graded.score ?? 0)),
              Math.round(Number(graded.maxPoints ?? 10)),
              Boolean(hintUsed),
              JSON.stringify(response ?? null),
              idempotencyKey || null
            ]
          );

          for (const compId of question.metadata?.competencyIds || []) {
            await tx.query(
              `INSERT INTO competency_mastery_evidence (id, user_id, competency_id, question_id, question_version, correct, difficulty, hint_used)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [
                `ev_${crypto.randomUUID().slice(0, 10)}`,
                user.id,
                compId,
                question.id,
                question.version,
                graded.correct,
                question.metadata?.difficulty || 'medium',
                Boolean(hintUsed)
              ]
            );
            const evRows = await tx.query(
              `SELECT * FROM competency_mastery_evidence WHERE user_id = $1 AND competency_id = $2`,
              [user.id, compId]
            );
            const computed = computeCompetencyMasteryFromEvidence(
              evRows.rows.map((e) => ({
                questionId: e.question_id,
                questionVersion: e.question_version,
                correct: e.correct,
                difficulty: e.difficulty,
                hintUsed: e.hint_used,
                occurredAt: e.occurred_at
              }))
            );
            await tx.query(
              `INSERT INTO competency_mastery_current (user_id, competency_id, score, confidence, distinct_question_count, updated_at)
               VALUES ($1,$2,$3,$4,$5,NOW())
               ON CONFLICT (user_id, competency_id) DO UPDATE SET score = EXCLUDED.score, confidence = EXCLUDED.confidence, distinct_question_count = EXCLUDED.distinct_question_count, updated_at = NOW()`,
              [user.id, compId, computed.score, computed.confidence, computed.distinctQuestionCount]
            );
          }

          let xpAwarded = 0;
          if (graded.correct) {
            xpAwarded = 15;
            const xpRows = await tx.query(`SELECT * FROM xp_ledger WHERE user_id = $1`, [user.id]);
            const xpKey = idempotencyKey || `q_${activityId}_${questionId}_${attemptId}`;
            const xpRes = appendXpLedgerEntry(
              xpRows.rows.map((r) => ({ id: r.id, userId: r.user_id, amount: r.amount, direction: r.direction, idempotencyKey: r.idempotency_key })),
              {
                userId: user.id,
                amount: xpAwarded,
                sourceType: 'practice_question',
                sourceId: `${activityId}:${questionId}`,
                reason: `Menjawab tepat soal ${question.metadata?.code || question.id}`,
                idempotencyKey: xpKey
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
                `UPDATE user_gamification_meta SET daily_xp_earned = daily_xp_earned + $2, weekly_xp = weekly_xp + $2, updated_at = NOW() WHERE user_id = $1`,
                [user.id, xpAwarded]
              );
            }
          }

          await enqueueOutboxEvent(tx, {
            eventName: 'ACTIVITY_ATTEMPT_RECORDED',
            aggregateType: 'activity_attempts',
            aggregateId: attemptId,
            userId: user.id,
            tenantId: user.tenantId,
            correlationId: ctx.correlationId,
            payload: { activityId, questionId, correct: graded.correct }
          });

          return {
            attemptId,
            ...graded,
            xpAwarded,
            heartsRemaining: shouldUseHearts(activity.mode) ? hearts : null,
            feedback: {
              message: graded.correct
                ? question.explanation?.correctFeedback || 'Jawaban tepat!'
                : question.explanation?.incorrectFeedback || 'Belum tepat, pelajari pembahasannya.',
              steps: question.explanation?.steps || [],
              remediationCompetencyId: question.explanation?.remediationCompetencyId || null
            }
          };
        }
      );
      return out.data;
    },

    async listInteractiveGallery() {
      const res = await db.query(
        `SELECT payload_json FROM question_versions WHERE governance_status = 'published' ORDER BY version DESC`
      );
      const byType = new Map();
      for (const r of res.rows) {
        const q = r.payload_json;
        if (!byType.has(q.type)) {
          byType.set(q.type, q);
        }
      }
      return [...byType.values()].map((q) => ({
        question: toStudentDeliveryDto(q, { mode: 'practice' }),
        competencyId: q.metadata?.competencyIds?.[0] || null
      }));
    },

    async gradeGalleryPreview(questionId, { response }) {
      const res = await db.query(
        `SELECT payload_json FROM question_versions WHERE question_id = $1 ORDER BY version DESC LIMIT 1`,
        [questionId]
      );
      if (res.rows.length === 0) {
        throw new HttpApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      }
      const q = res.rows[0].payload_json;
      const graded = gradeQuestionResponse(q, response);
      return {
        ...graded,
        feedback: {
          message: graded.correct ? q.explanation?.correctFeedback || 'Tepat!' : q.explanation?.incorrectFeedback || 'Belum tepat.',
          steps: q.explanation?.steps || []
        }
      };
    },

    async getMasteryOverview(ctx) {
      const user = requireAuthenticatedUser(ctx);
      const [compRes, evRes, srRes] = await Promise.all([
        db.query(`SELECT * FROM competencies ORDER BY id`),
        db.query(`SELECT * FROM competency_mastery_evidence WHERE user_id = $1`, [user.id]),
        db.query(`SELECT * FROM spaced_repetition_schedules WHERE user_id = $1 ORDER BY next_review_at ASC`, [user.id])
      ]);
      const srItems = srRes.rows.map((s) => ({
        id: s.id,
        userId: s.user_id,
        competencyId: s.competency_id,
        stageIndex: s.stage_index,
        intervalDays: s.interval_days,
        nextReviewAt: s.next_review_at,
        recommendedActivityId: s.recommended_activity_id
      }));
      const competencies = compRes.rows.map((c) => {
        const compEv = evRes.rows
          .filter((e) => e.competency_id === c.id)
          .map((e) => ({
            questionId: e.question_id,
            questionVersion: e.question_version,
            correct: e.correct,
            difficulty: e.difficulty,
            hintUsed: e.hint_used,
            occurredAt: e.occurred_at
          }));
        const computed = computeCompetencyMasteryFromEvidence(compEv);
        const sr = srItems.find((s) => s.competencyId === c.id) || null;
        return {
          id: c.id,
          topicId: c.topic_id,
          code: c.code,
          description: c.description,
          ...computed,
          spacedRepetition: sr
        };
      });
      return {
        competencies,
        remedialRecommendations: competencies.filter((c) => c.remedialRecommended),
        dueReviews: srItems
      };
    },

    async completeSpacedReview(ctx, srId, { wasCorrect = true } = {}) {
      const user = requireAuthenticatedUser(ctx);
      const srRes = await db.query(
        `SELECT * FROM spaced_repetition_schedules WHERE id = $1 AND user_id = $2`,
        [srId, user.id]
      );
      if (srRes.rows.length === 0) {
        throw new HttpApiError({ code: 'REVIEW_NOT_FOUND', message: 'Jadwal review tidak ditemukan.', status: 404 });
      }
      const item = srRes.rows[0];
      const evRes = await db.query(
        `SELECT * FROM competency_mastery_evidence WHERE user_id = $1 AND competency_id = $2`,
        [user.id, item.competency_id]
      );
      const currentMastery = computeCompetencyMasteryFromEvidence(
        evRes.rows.map((e) => ({
          questionId: e.question_id,
          questionVersion: e.question_version,
          correct: e.correct,
          difficulty: e.difficulty,
          hintUsed: e.hint_used,
          occurredAt: e.occurred_at
        }))
      ).score;
      const next = computeNextSpacedRepetitionSchedule({
        currentStageIndex: item.stage_index,
        masteryScore: currentMastery,
        wasCorrect: Boolean(wasCorrect)
      });
      await db.query(
        `UPDATE spaced_repetition_schedules SET stage_index = $2, interval_days = $3, next_review_at = $4 WHERE id = $1`,
        [srId, next.stageIndex, next.intervalDays, next.nextReviewAt]
      );
      return {
        id: item.id,
        userId: item.user_id,
        competencyId: item.competency_id,
        stageIndex: next.stageIndex,
        intervalDays: next.intervalDays,
        nextReviewAt: next.nextReviewAt,
        recommendedActivityId: item.recommended_activity_id
      };
    },

    async getHistory(ctx) {
      const user = requireAuthenticatedUser(ctx);
      const res = await db.query(
        `SELECT * FROM activity_history WHERE user_id = $1 ORDER BY completed_at DESC`,
        [user.id]
      );
      return res.rows.map((h) => ({
        id: h.id,
        userId: h.user_id,
        activityId: h.activity_id,
        title: h.title,
        mode: h.mode,
        score: h.score,
        xpEarned: h.xp_earned,
        completedAt: h.completed_at
      }));
    }
  };
}
