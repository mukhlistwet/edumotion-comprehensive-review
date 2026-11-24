import crypto from 'node:crypto';
import {
  AI_PIPELINE_STAGES,
  PERMISSIONS,
  ROLES,
  promoteGeneratedItemToDraft,
  validateGenerationBrief,
  verifyGeneratedItemDeterministic
} from '@edumotion/domain';
import { HttpApiError } from '../security/errors.js';
import { requirePermission } from './authz-helpers.js';
import { enqueueOutboxEvent } from './outbox-worker.js';

export function createAiService({ repos, db }) {
  async function loadRunWithItems(runId, tx = db) {
    const runRes = await tx.query(`SELECT * FROM ai_generation_runs WHERE id = $1`, [runId]);
    if (runRes.rows.length === 0) return null;
    const r = runRes.rows[0];
    const itemsRes = await tx.query(`SELECT * FROM ai_generation_items WHERE run_id = $1 ORDER BY id ASC`, [runId]);
    return {
      id: r.id,
      tenantId: r.tenant_id,
      requestedBy: r.requested_by,
      status: r.status,
      progressPct: r.progress_pct,
      estimatedCostUsd: Number(r.estimated_cost_usd),
      actualCostUsd: Number(r.actual_cost_usd),
      budgetCapUsd: Number(r.budget_cap_usd),
      maxRetries: r.max_retries,
      createdAt: r.created_at,
      completedAt: r.completed_at,
      brief: r.brief_json,
      auditTrail: r.audit_trail_json || [],
      items: itemsRes.rows.map((it) => ({
        id: it.id,
        runId: it.run_id,
        status: it.status,
        attemptCount: it.attempt_count,
        generation: it.generation_json,
        validationReport: it.validation_report_json,
        question: it.question_json,
        acceptedQuestionId: it.accepted_question_id
      }))
    };
  }

  return {
    getStages() {
      return structuredClone(AI_PIPELINE_STAGES);
    },

    async listRuns(ctx) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.AI_GENERATE);
      const runsRes = await db.query(`SELECT id, tenant_id FROM ai_generation_runs ORDER BY created_at DESC`);
      const visibleIds = runsRes.rows
        .filter((r) => user.role === ROLES.PLATFORM_SUPER_ADMIN || !r.tenant_id || r.tenant_id === user.tenantId)
        .map((r) => r.id);
      const out = [];
      for (const id of visibleIds) {
        const full = await loadRunWithItems(id);
        if (full) out.push(full);
      }
      return out;
    },

    async getRun(ctx, runId) {
      await requirePermission(repos, ctx, PERMISSIONS.AI_GENERATE);
      const found = await loadRunWithItems(runId);
      if (!found) throw new HttpApiError({ code: 'RUN_NOT_FOUND', message: 'Generation run tidak ditemukan.', status: 404 });
      return found;
    },

    async listRunItems(ctx, runId) {
      const run = await this.getRun(ctx, runId);
      return run.items;
    },

    async getItem(ctx, itemId) {
      await requirePermission(repos, ctx, PERMISSIONS.AI_GENERATE);
      const res = await db.query(`SELECT * FROM ai_generation_items WHERE id = $1`, [itemId]);
      if (res.rows.length === 0) {
        throw new HttpApiError({ code: 'ITEM_NOT_FOUND', message: 'Item AI tidak ditemukan.', status: 404 });
      }
      const it = res.rows[0];
      return {
        id: it.id,
        runId: it.run_id,
        status: it.status,
        attemptCount: it.attempt_count,
        generation: it.generation_json,
        validationReport: it.validation_report_json,
        question: it.question_json
      };
    },

    async createRun(ctx, { brief, simulateFailureMode = 'normal' } = {}) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.AI_GENERATE);
      const check = validateGenerationBrief(brief);
      if (!check.valid) {
        throw new HttpApiError({
          code: 'VALIDATION_ERROR',
          message: 'Konfigurasi generation brief belum lengkap atau distribusi ≠ 100%.',
          status: 422,
          fieldErrors: check.fieldErrors
        });
      }
      const estimatedCost = Number((Number(brief.quantity || 1) * 0.06).toFixed(2));
      if (estimatedCost > Number(brief.budgetCapUsd || 1.0) || simulateFailureMode === 'cost_cap') {
        throw new HttpApiError({
          code: 'AI_COST_CAP_EXCEEDED',
          message: `Estimasi biaya ($${estimatedCost}) melebihi batas anggaran run ($${brief.budgetCapUsd}). Proses diblokir.`,
          status: 402
        });
      }

      const compRes = await db.query(`SELECT id FROM competencies`);
      const validCompIds = compRes.rows.map((r) => r.id);
      const runId = `run_${crypto.randomUUID().slice(0, 10)}`;
      const qty = Math.min(Number(brief.quantity || 2), 4);
      const qType = (brief.questionTypes && brief.questionTypes[0]) || 'single_choice';
      const maxRetries = Number(brief.maxRetries ?? 2);
      const tenantId = user.tenantId || 'tenant_cendekia';

      const items = [];
      for (let i = 0; i < qty; i += 1) {
        const itemId = `ai_itm_${crypto.randomUUID().slice(0, 10)}`;
        let rawPayload = {
          schemaVersion: 'edumotion-question-v1',
          id: crypto.randomUUID(),
          version: 1,
          type: qType === 'mixed' ? 'single_choice' : qType,
          metadata: {
            code: `AI-GEN-${i + 1}`,
            title: `Soal AI #${i + 1} · ${brief.topicId}`,
            curriculumId: brief.curriculumId,
            curriculumVersionId: brief.curriculumVersionId || 'ver_merdeka_2026',
            gradeLevelId: brief.gradeLevelId,
            subjectId: brief.subjectId,
            topicId: brief.topicId,
            competencyIds: brief.competencyIds,
            difficulty: i === 0 ? 'easy' : 'medium',
            bloomLevel: brief.bloomLevel || 'apply',
            locale: brief.locale || 'id-ID',
            estimatedSeconds: 60
          },
          content: {
            stem: `Draf AI #${i + 1}: Jika \\(${2 + i}x + 4 = ${10 + i * 3}\\), tentukan nilai \\(x\\).`,
            instruction: 'Pilih satu jawaban yang tepat.',
            media: []
          },
          interaction: {
            options: [
              { id: 'opt_a', label: '2' },
              { id: 'opt_b', label: '3' },
              { id: 'opt_c', label: '4' },
              { id: 'opt_d', label: '5' }
            ]
          },
          answerSpec: { correctOptionIds: ['opt_b'] },
          scoring: { method: 'exact_match', maxPoints: 10 },
          explanation: {
            steps: [`Kurangi kedua ruas dengan 4, lalu bagi dengan ${2 + i}.`],
            hints: ['Gunakan operasi invers secara bertahap.'],
            correctFeedback: 'Tepat!',
            incorrectFeedback: 'Cek ulang langkah eliminasi konstanta.'
          },
          delivery: { allowedModes: ['practice', 'challenge'], hintPolicy: 'progressive', feedbackPolicy: 'immediate' },
          accessibility: {},
          governance: { status: 'draft', tenantId, createdBy: user.id }
        };

        let detCheck = { expression: `(10 + ${i}*3 - 4) / (2 + ${i})`, claimedAnswer: 3 };
        if (i === 0 && simulateFailureMode === 'malformed_json') {
          rawPayload = '{ "stem": "JSON terpotong tanpa penutup';
        } else if (i === 0 && simulateFailureMode === 'wrong_calculation') {
          detCheck = { expression: '120 / 10', claimedAnswer: 18 };
        } else if (i === 0 && simulateFailureMode === 'unknown_taxonomy') {
          rawPayload.metadata.competencyIds = ['comp_fiktif_999'];
        } else if (i === 0 && simulateFailureMode === 'executable_code') {
          rawPayload.content.stem = 'Hitung nilai x <script>alert(1)</script>';
        }

        const report = verifyGeneratedItemDeterministic({
          rawPayload,
          validCompetencyIds: validCompIds,
          deterministicCheck: typeof rawPayload === 'object' ? detCheck : null
        });

        const failedAllRetries = !report.passed && (simulateFailureMode !== 'normal' || i > 0);
        items.push({
          id: itemId,
          runId,
          status: report.passed ? 'needs_review' : failedAllRetries ? 'failed' : 'needs_review',
          attemptCount: report.passed ? 1 : maxRetries,
          generation: {
            modelId: brief.modelPolicyId || 'edu-math-reasoner-v1',
            promptVersion: 'qgen-v1.2',
            tokensUsed: 640,
            costUsd: 0.06
          },
          validationReport: report,
          question: typeof rawPayload === 'object' ? rawPayload : null
        });
      }

      const runStatus = items.some((x) => x.status === 'failed') ? 'completed_with_errors' : 'completed';
      const auditTrail = [
        {
          timestamp: new Date().toISOString(),
          actor: user.displayName,
          action: 'RUN_STARTED',
          detail: `Membuat ${qty} item soal (${simulateFailureMode}).`
        }
      ];

      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO ai_generation_runs (
            id, tenant_id, requested_by, status, progress_pct, estimated_cost_usd, actual_cost_usd, budget_cap_usd, max_retries, brief_json, audit_trail_json, completed_at
          ) VALUES ($1,$2,$3,$4,100,$5,$6,$7,$8,$9::jsonb,$10::jsonb,NOW())`,
          [
            runId,
            tenantId,
            user.id,
            runStatus,
            estimatedCost,
            Number((items.length * 0.06).toFixed(2)),
            Number(brief.budgetCapUsd || 1.0),
            maxRetries,
            JSON.stringify(brief),
            JSON.stringify(auditTrail)
          ]
        );
        for (const it of items) {
          await tx.query(
            `INSERT INTO ai_generation_items (id, run_id, status, attempt_count, generation_json, validation_report_json, question_json)
             VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb)`,
            [
              it.id,
              runId,
              it.status,
              it.attemptCount,
              JSON.stringify(it.generation),
              JSON.stringify(it.validationReport),
              it.question ? JSON.stringify(it.question) : null
            ]
          );
        }
        await enqueueOutboxEvent(tx, {
          eventName: 'AI_GENERATION_RUN_COMPLETED',
          aggregateType: 'ai_generation_runs',
          aggregateId: runId,
          userId: user.id,
          tenantId,
          correlationId: ctx.correlationId,
          payload: { itemCount: items.length, status: runStatus }
        });
      });

      return loadRunWithItems(runId);
    },

    async cancelRun(ctx, runId) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.AI_GENERATE);
      const run = await loadRunWithItems(runId);
      if (!run) throw new HttpApiError({ code: 'RUN_NOT_FOUND', message: 'Run tidak ditemukan.', status: 404 });
      const nextTrail = [
        ...run.auditTrail,
        { timestamp: new Date().toISOString(), actor: user.displayName, action: 'RUN_CANCELLED', detail: 'Pengguna membatalkan run.' }
      ];
      await db.query(
        `UPDATE ai_generation_runs SET status = 'cancelled', audit_trail_json = $2::jsonb WHERE id = $1`,
        [runId, JSON.stringify(nextTrail)]
      );
      return loadRunWithItems(runId);
    },

    async acceptItemToDraft(ctx, itemId) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.AI_GENERATE);
      return db.transaction(async (tx) => {
        const itRes = await tx.query(`SELECT * FROM ai_generation_items WHERE id = $1`, [itemId]);
        if (itRes.rows.length === 0) {
          throw new HttpApiError({ code: 'ITEM_NOT_FOUND', message: 'Item AI tidak ditemukan.', status: 404 });
        }
        const row = itRes.rows[0];
        const item = {
          id: row.id,
          runId: row.run_id,
          status: row.status,
          attemptCount: row.attempt_count,
          generation: row.generation_json,
          validationReport: row.validation_report_json,
          question: row.question_json
        };
        const draft = promoteGeneratedItemToDraft(item, user.id);
        draft.governance.tenantId = user.tenantId || draft.governance?.tenantId || 'tenant_cendekia';

        await tx.query(
          `INSERT INTO questions (id, tenant_id, owner_id, current_version, status) VALUES ($1,$2,$3,1,'draft') ON CONFLICT (id) DO NOTHING`,
          [draft.id, draft.governance.tenantId, user.id]
        );
        await tx.query(
          `INSERT INTO question_versions (id, question_id, version, schema_version, type, tenant_id, governance_status, visibility, payload_json, created_by)
           VALUES ($1,$2,1,$3,$4,$5,'draft',$6,$7::jsonb,$8) ON CONFLICT (question_id, version) DO NOTHING`,
          [
            `${draft.id}_v1`,
            draft.id,
            draft.schemaVersion,
            draft.type,
            draft.governance.tenantId,
            draft.delivery?.visibility || 'tenant',
            JSON.stringify(draft),
            user.id
          ]
        );
        await tx.query(
          `UPDATE ai_generation_items SET status = 'accepted', accepted_question_id = $2 WHERE id = $1`,
          [itemId, draft.id]
        );
        return { item: { ...item, status: 'accepted' }, draftQuestion: draft };
      });
    },

    async rejectItem(ctx, itemId, reason = 'Ditolak reviewer') {
      const user = await requirePermission(repos, ctx, PERMISSIONS.AI_GENERATE);
      const itRes = await db.query(`SELECT * FROM ai_generation_items WHERE id = $1`, [itemId]);
      if (itRes.rows.length === 0) {
        throw new HttpApiError({ code: 'ITEM_NOT_FOUND', message: 'Item AI tidak ditemukan.', status: 404 });
      }
      await db.query(`UPDATE ai_generation_items SET status = 'rejected' WHERE id = $1`, [itemId]);
      const run = await loadRunWithItems(itRes.rows[0].run_id);
      if (run) {
        const nextTrail = [
          ...run.auditTrail,
          { timestamp: new Date().toISOString(), actor: user.displayName, action: 'ITEM_REJECTED', detail: reason }
        ];
        await db.query(`UPDATE ai_generation_runs SET audit_trail_json = $2::jsonb WHERE id = $1`, [run.id, JSON.stringify(nextTrail)]);
      }
      return { ...(itRes.rows[0].question_json || {}), id: itemId, status: 'rejected' };
    },

    async retryItem(ctx, itemId) {
      await requirePermission(repos, ctx, PERMISSIONS.AI_GENERATE);
      const res = await db.query(
        `SELECT i.*, r.max_retries FROM ai_generation_items i JOIN ai_generation_runs r ON r.id = i.run_id WHERE i.id = $1`,
        [itemId]
      );
      if (res.rows.length === 0) {
        throw new HttpApiError({ code: 'ITEM_NOT_FOUND', message: 'Item AI tidak ditemukan.', status: 404 });
      }
      const row = res.rows[0];
      if (row.attempt_count >= row.max_retries && row.status === 'failed') {
        throw new HttpApiError({
          code: 'MAX_RETRIES_EXCEEDED',
          message: `Batas percobaan ulang (${row.max_retries}) telah tercapai untuk item ini.`,
          status: 409
        });
      }
      const nextAttempt = Number(row.attempt_count) + 1;
      const report = { passed: true, qualityScore: 90, findings: [] };
      await db.query(
        `UPDATE ai_generation_items SET attempt_count = $2, status = 'needs_review', validation_report_json = $3::jsonb WHERE id = $1`,
        [itemId, nextAttempt, JSON.stringify(report)]
      );
      return { id: itemId, runId: row.run_id, status: 'needs_review', attemptCount: nextAttempt, validationReport: report, question: row.question_json };
    }
  };
}
