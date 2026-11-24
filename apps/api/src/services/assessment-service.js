import crypto from 'node:crypto';
import {
  PERMISSIONS,
  buildImmutableExamSnapshots,
  computeRemainingExamSeconds,
  gradeAssessmentSession,
  isSessionExpired
} from '@edumotion/domain';
import { HttpApiError } from '../security/errors.js';
import { requireAuthenticatedUser, requirePermission, withTransactionIdempotency } from './authz-helpers.js';
import { enqueueOutboxEvent } from './outbox-worker.js';

export function createAssessmentService({ repos, db }) {
  async function serializeSessionForStudent(sessionRow, tx = db) {
    const respRes = await tx.query(`SELECT * FROM assessment_responses WHERE session_id = $1`, [sessionRow.id]);
    const responses = {};
    for (const r of respRes.rows) {
      responses[r.question_snapshot_id] = {
        response: r.response_json,
        bookmarked: Boolean(r.bookmarked),
        savedAt: r.saved_at
      };
    }
    const serverNowMs = Date.now();
    return {
      id: sessionRow.id,
      assessmentId: sessionRow.assessment_id,
      title: sessionRow.title,
      mode: sessionRow.mode,
      status: sessionRow.status,
      startedAt: sessionRow.started_at,
      expiresAt: sessionRow.expires_at,
      heartsEnabled: false,
      xpAffectsGrade: false,
      remainingSeconds: computeRemainingExamSeconds({ expiresAt: sessionRow.expires_at, serverNowMs }),
      serverNowMs,
      clientObservedNowMs: serverNowMs,
      snapshots: (sessionRow.snapshots_json || []).map(({ authoringSnapshot: _a, ...pub }) => pub),
      responses
    };
  }

  return {
    async listAssessments(ctx) {
      const user = requireAuthenticatedUser(ctx);
      const res = await db.query(`SELECT * FROM assessments ORDER BY id`);
      return res.rows
        .filter((a) => !a.tenant_id || !user.tenantId || a.tenant_id === user.tenantId)
        .map((a) => ({
          id: a.id,
          tenantId: a.tenant_id,
          title: a.title,
          subtitle: a.subtitle,
          mode: a.mode,
          subjectId: a.subject_id,
          durationMinutes: a.duration_minutes,
          heartsEnabled: Boolean(a.hearts_enabled),
          xpAffectsGrade: Boolean(a.xp_affects_grade),
          scheduledLabel: a.scheduled_label,
          releasePolicy: a.release_policy,
          releaseAt: a.release_at,
          questionIds: a.question_ids || []
        }));
    },

    async startSession(ctx, assessmentId, { idempotencyKey } = {}) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.STUDENT_ASSESSMENT);
      const out = await withTransactionIdempotency(
        db,
        `startAssessment:${user.id}:${assessmentId}`,
        idempotencyKey || `${user.id}:${assessmentId}`,
        async (tx) => {
          const existing = await tx.query(
            `SELECT * FROM assessment_sessions WHERE assessment_id = $1 AND user_id = $2 AND status IN ('created', 'started') LIMIT 1`,
            [assessmentId, user.id]
          );
          if (existing.rows.length > 0) {
            return { session: await serializeSessionForStudent(existing.rows[0], tx) };
          }
          const asmRes = await tx.query(`SELECT * FROM assessments WHERE id = $1`, [assessmentId]);
          if (asmRes.rows.length === 0) {
            throw new HttpApiError({ code: 'ASSESSMENT_NOT_FOUND', message: 'Ujian tidak ditemukan.', status: 404 });
          }
          const asm = asmRes.rows[0];
          const questions = [];
          for (const qid of asm.question_ids || []) {
            const qRes = await tx.query(
              `SELECT payload_json FROM question_versions WHERE question_id = $1 ORDER BY version DESC LIMIT 1`,
              [qid]
            );
            if (qRes.rows.length > 0) questions.push(qRes.rows[0].payload_json);
          }
          const snapshots = buildImmutableExamSnapshots(questions, asm.mode);
          const serverNow = Date.now();
          const startedAt = new Date(serverNow).toISOString();
          const expiresAt = new Date(serverNow + Number(asm.duration_minutes) * 60 * 1000).toISOString();
          const sessionId = `sess_${crypto.randomUUID().slice(0, 12)}`;

          await tx.query(
            `INSERT INTO assessment_sessions (id, assessment_id, user_id, title, mode, status, started_at, expires_at, release_at, snapshots_json)
             VALUES ($1,$2,$3,$4,$5,'started',$6,$7,$8,$9::jsonb)`,
            [sessionId, asm.id, user.id, asm.title, asm.mode, startedAt, expiresAt, asm.release_at || null, JSON.stringify(snapshots)]
          );
          const inserted = await tx.query(`SELECT * FROM assessment_sessions WHERE id = $1`, [sessionId]);
          return { session: await serializeSessionForStudent(inserted.rows[0], tx) };
        }
      );
      return out.data;
    },

    async getSession(ctx, sessionId) {
      const user = requireAuthenticatedUser(ctx);
      const res = await db.query(`SELECT * FROM assessment_sessions WHERE id = $1 AND user_id = $2`, [sessionId, user.id]);
      if (res.rows.length === 0) {
        throw new HttpApiError({ code: 'SESSION_NOT_FOUND', message: 'Sesi ujian tidak ditemukan.', status: 404 });
      }
      const row = res.rows[0];
      if (row.status === 'started' && isSessionExpired({ expiresAt: row.expires_at, serverNowMs: Date.now() })) {
        await db.query(`UPDATE assessment_sessions SET status = 'expired' WHERE id = $1`, [sessionId]);
        row.status = 'expired';
      }
      return serializeSessionForStudent(row);
    },

    async autosaveResponse(ctx, sessionId, questionSnapshotId, { response, bookmarked = false, idempotencyKey } = {}) {
      const user = requireAuthenticatedUser(ctx);
      const out = await withTransactionIdempotency(
        db,
        `autosave:${sessionId}:${questionSnapshotId}`,
        idempotencyKey,
        async (tx) => {
          const res = await tx.query(`SELECT * FROM assessment_sessions WHERE id = $1 AND user_id = $2`, [sessionId, user.id]);
          if (res.rows.length === 0) {
            throw new HttpApiError({ code: 'SESSION_NOT_FOUND', message: 'Sesi ujian tidak ditemukan.', status: 404 });
          }
          const session = res.rows[0];
          if (session.status !== 'started') {
            throw new HttpApiError({ code: 'SESSION_LOCKED', message: 'Sesi ujian sudah dikunci.', status: 409 });
          }
          if (isSessionExpired({ expiresAt: session.expires_at, serverNowMs: Date.now() })) {
            await tx.query(`UPDATE assessment_sessions SET status = 'expired' WHERE id = $1`, [sessionId]);
            throw new HttpApiError({ code: 'SESSION_EXPIRED', message: 'Waktu ujian telah habis menurut server.', status: 409 });
          }
          const savedAt = new Date().toISOString();
          await tx.query(
            `INSERT INTO assessment_responses (session_id, question_snapshot_id, response_json, bookmarked, saved_at)
             VALUES ($1,$2,$3::jsonb,$4,$5)
             ON CONFLICT (session_id, question_snapshot_id) DO UPDATE SET response_json = EXCLUDED.response_json, bookmarked = EXCLUDED.bookmarked, saved_at = EXCLUDED.saved_at`,
            [sessionId, questionSnapshotId, JSON.stringify(response ?? null), Boolean(bookmarked), savedAt]
          );
          return { saved: true, questionSnapshotId, savedAt };
        }
      );
      return out.data;
    },

    async submitSession(ctx, sessionId, { idempotencyKey } = {}) {
      const user = requireAuthenticatedUser(ctx);
      const out = await withTransactionIdempotency(
        db,
        `submitAssessment:${sessionId}`,
        idempotencyKey || sessionId,
        async (tx) => {
          const res = await tx.query(`SELECT * FROM assessment_sessions WHERE id = $1 AND user_id = $2`, [sessionId, user.id]);
          if (res.rows.length === 0) {
            throw new HttpApiError({ code: 'SESSION_NOT_FOUND', message: 'Sesi ujian tidak ditemukan.', status: 404 });
          }
          const row = res.rows[0];
          if (row.result_json) return row.result_json;

          const respRows = await tx.query(`SELECT * FROM assessment_responses WHERE session_id = $1`, [sessionId]);
          const responsesMap = {};
          for (const r of respRows.rows) {
            responsesMap[r.question_snapshot_id] = { response: r.response_json, bookmarked: Boolean(r.bookmarked), savedAt: r.saved_at };
          }
          const serverNowMs = Date.now();
          const result = gradeAssessmentSession({
            session: { id: row.id, assessmentId: row.assessment_id, status: 'submitted' },
            snapshots: row.snapshots_json || [],
            responses: responsesMap,
            releaseAt: row.release_at,
            serverNowMs
          });

          await tx.query(
            `UPDATE assessment_sessions SET status = $2, submitted_at = NOW(), result_json = $3::jsonb WHERE id = $1`,
            [sessionId, result.status, JSON.stringify(result)]
          );
          await tx.query(
            `INSERT INTO assessment_results (session_id, academic_score, release_at, result_json)
             VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (session_id) DO NOTHING`,
            [sessionId, result.academicScore, row.release_at || null, JSON.stringify(result)]
          );
          await enqueueOutboxEvent(tx, {
            eventName: 'ASSESSMENT_SUBMITTED',
            aggregateType: 'assessment_sessions',
            aggregateId: sessionId,
            userId: user.id,
            tenantId: user.tenantId,
            correlationId: ctx.correlationId,
            payload: { assessmentId: row.assessment_id, academicScore: result.academicScore }
          });
          await enqueueOutboxEvent(tx, {
            eventName: 'ASSESSMENT_GRADED',
            aggregateType: 'assessment_results',
            aggregateId: sessionId,
            userId: user.id,
            tenantId: user.tenantId,
            correlationId: ctx.correlationId,
            payload: { resultsReleased: result.resultsReleased }
          });
          return result;
        }
      );
      return out.data;
    },

    async getResult(ctx, sessionId) {
      const user = requireAuthenticatedUser(ctx);
      const res = await db.query(`SELECT result_json FROM assessment_sessions WHERE id = $1 AND user_id = $2`, [sessionId, user.id]);
      if (res.rows.length === 0 || !res.rows[0].result_json) {
        throw new HttpApiError({ code: 'RESULT_NOT_FOUND', message: 'Hasil ujian belum tersedia.', status: 404 });
      }
      return res.rows[0].result_json;
    }
  };
}
