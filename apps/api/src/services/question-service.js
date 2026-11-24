import crypto from 'node:crypto';
import {
  PERMISSIONS,
  ROLES,
  canAccessTenantResource,
  createNextQuestionVersion,
  normalizeLegacyQuestionInput,
  toStudentDeliveryDto,
  transitionQuestionStatus,
  validateQuestionAuthoring
} from '@edumotion/domain';
import { HttpApiError } from '../security/errors.js';
import { validateAndPrepareMediaUpload } from '../security/media-validator.js';
import { recordAuditEntry, requireAuthenticatedUser, requirePermission, withTransactionIdempotency } from './authz-helpers.js';
import { enqueueOutboxEvent } from './outbox-worker.js';

export function createQuestionService({ repos, db }) {
  async function findLatestVersionRow(questionId, version = null, tx = db) {
    const res = version
      ? await tx.query(`SELECT * FROM question_versions WHERE question_id = $1 AND version = $2`, [questionId, Number(version)])
      : await tx.query(`SELECT * FROM question_versions WHERE question_id = $1 ORDER BY version DESC LIMIT 1`, [questionId]);
    return res.rows[0] || null;
  }

  return {
    async list(ctx, filters = {}) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.QUESTION_READ);
      const res = await db.query(`SELECT * FROM question_versions ORDER BY created_at DESC, version DESC`);
      let list = res.rows
        .map((r) => r.payload_json)
        .filter((q) => {
          const tenantId = q.governance?.tenantId || null;
          const isGlobalPub = q.delivery?.visibility === 'global' && q.governance?.status === 'published';
          if ([ROLES.PLATFORM_SUPER_ADMIN, ROLES.PLATFORM_CURRICULUM_ADMIN].includes(user.role)) return true;
          return canAccessTenantResource(user, tenantId) || isGlobalPub;
        });

      if (filters.search) {
        const s = String(filters.search).toLowerCase();
        list = list.filter(
          (q) =>
            String(q.content?.stem || '').toLowerCase().includes(s) ||
            String(q.metadata?.title || '').toLowerCase().includes(s) ||
            String(q.metadata?.code || '').toLowerCase().includes(s)
        );
      }
      if (filters.type && filters.type !== 'all') list = list.filter((q) => q.type === filters.type);
      if (filters.status && filters.status !== 'all') list = list.filter((q) => q.governance?.status === filters.status);
      if (filters.subjectId && filters.subjectId !== 'all') list = list.filter((q) => q.metadata?.subjectId === filters.subjectId);
      if (filters.sort === 'version_desc') list = [...list].sort((a, b) => b.version - a.version);

      const page = Math.max(1, Number(filters.page || 1));
      const pageSize = Math.max(1, Number(filters.pageSize || 20));
      const totalItems = list.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const start = (page - 1) * pageSize;
      return {
        items: list.slice(start, start + pageSize),
        pagination: { page, pageSize, totalItems, totalPages }
      };
    },

    async getById(ctx, questionId, version = null) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.QUESTION_READ);
      const row = await findLatestVersionRow(questionId, version);
      if (!row) {
        throw new HttpApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      }
      const q = row.payload_json;
      if (
        !canAccessTenantResource(user, q.governance?.tenantId, {
          allowPlatformCrossTenant: true,
          allowGlobalRead: q.delivery?.visibility === 'global' && q.governance?.status === 'published'
        })
      ) {
        throw new HttpApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses lintas tenant ditolak.', status: 403 });
      }
      const verRes = await db.query(
        `SELECT question_id, version, governance_status FROM question_versions WHERE question_id = $1 ORDER BY version DESC`,
        [questionId]
      );
      return {
        question: q,
        versions: verRes.rows.map((v) => ({ id: v.question_id, version: v.version, status: v.governance_status })),
        validation: validateQuestionAuthoring(q)
      };
    },

    async createDraft(ctx, rawInput) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.QUESTION_CREATE_DRAFT);
      const normalized = normalizeLegacyQuestionInput(rawInput);
      const newId = normalized.id || crypto.randomUUID();
      const tenantId = user.tenantId || normalized.governance?.tenantId || 'tenant_cendekia';
      const record = {
        ...normalized,
        schemaVersion: 'edumotion-question-v1',
        id: newId,
        version: 1,
        governance: {
          ...(normalized.governance || {}),
          status: 'draft',
          tenantId,
          createdBy: user.id
        }
      };
      const validation = validateQuestionAuthoring(record);

      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO questions (id, tenant_id, owner_id, current_version, status) VALUES ($1,$2,$3,1,'draft')`,
          [newId, tenantId, user.id]
        );
        await tx.query(
          `INSERT INTO question_versions (id, question_id, version, schema_version, type, tenant_id, governance_status, visibility, payload_json, created_by)
           VALUES ($1,$2,1,'edumotion-question-v1',$3,$4,'draft',$5,$6::jsonb,$7)`,
          [
            `${newId}_v1`,
            newId,
            record.type,
            tenantId,
            record.delivery?.visibility || 'tenant',
            JSON.stringify(record),
            user.id
          ]
        );
      });
      return { question: record, validation };
    },

    async updateDraft(ctx, questionId, patch) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.QUESTION_EDIT_DRAFT);
      const row = await findLatestVersionRow(questionId);
      if (!row) throw new HttpApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const existing = row.payload_json;
      if (!canAccessTenantResource(user, existing.governance?.tenantId, { allowPlatformCrossTenant: true })) {
        throw new HttpApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses edit lintas tenant ditolak.', status: 403 });
      }
      if (existing.governance?.status === 'published') {
        throw new HttpApiError({
          code: 'PUBLISHED_QUESTION_IMMUTABLE',
          message: 'Versi published bersifat immutable. Gunakan Buat Versi Baru untuk mengedit.',
          status: 409
        });
      }
      const updated = normalizeLegacyQuestionInput({
        ...existing,
        ...patch,
        id: existing.id,
        version: existing.version,
        governance: { ...existing.governance, ...(patch.governance || {}), status: 'draft' }
      });
      await db.transaction(async (tx) => {
        await tx.query(
          `UPDATE question_versions SET type = $2, governance_status = 'draft', payload_json = $3::jsonb WHERE id = $1`,
          [row.id, updated.type, JSON.stringify(updated)]
        );
        await tx.query(`UPDATE questions SET status = 'draft' WHERE id = $1`, [questionId]);
      });
      return { question: updated, validation: validateQuestionAuthoring(updated) };
    },

    async validateQuestion(ctx, rawInput) {
      await requirePermission(repos, ctx, PERMISSIONS.QUESTION_READ);
      return validateQuestionAuthoring(rawInput);
    },

    async previewAsStudent(ctx, rawInput, mode = 'practice') {
      await requirePermission(repos, ctx, PERMISSIONS.QUESTION_READ);
      return toStudentDeliveryDto(rawInput, { mode });
    },

    async submitForReview(ctx, questionId) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.QUESTION_EDIT_DRAFT);
      const row = await findLatestVersionRow(questionId);
      if (!row) throw new HttpApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const q = row.payload_json;
      if (!canAccessTenantResource(user, q.governance?.tenantId, { allowPlatformCrossTenant: true })) {
        throw new HttpApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses lintas tenant ditolak.', status: 403 });
      }
      const val = validateQuestionAuthoring(q);
      if (!val.valid) {
        const failed = transitionQuestionStatus(q, 'validation_failed', { userId: user.id });
        await db.query(
          `UPDATE question_versions SET governance_status = 'validation_failed', payload_json = $2::jsonb WHERE id = $1`,
          [row.id, JSON.stringify(failed)]
        );
        throw new HttpApiError({
          code: 'VALIDATION_BLOCKING_ERRORS',
          message: 'Soal masih memiliki error validasi pemblokir sebelum dapat diajukan ke review.',
          status: 422,
          details: val,
          fieldErrors: val.fieldErrors
        });
      }
      const updated = transitionQuestionStatus(q, 'in_review', { userId: user.id });
      await db.transaction(async (tx) => {
        await tx.query(
          `UPDATE question_versions SET governance_status = 'in_review', payload_json = $2::jsonb WHERE id = $1`,
          [row.id, JSON.stringify(updated)]
        );
        await tx.query(`UPDATE questions SET status = 'in_review' WHERE id = $1`, [questionId]);
      });
      return { question: updated };
    },

    async reviewQuestion(ctx, questionId, { decision, comment = '' }) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.QUESTION_REVIEW);
      const row = await findLatestVersionRow(questionId);
      if (!row) throw new HttpApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const q = row.payload_json;
      if (!canAccessTenantResource(user, q.governance?.tenantId, { allowPlatformCrossTenant: true })) {
        throw new HttpApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses lintas tenant ditolak.', status: 403 });
      }
      const nextStatus = decision === 'approve' ? 'approved' : 'draft';
      const updated = transitionQuestionStatus(q, nextStatus, { userId: user.id });
      updated.governance.reviewComment = comment;
      await db.transaction(async (tx) => {
        await tx.query(
          `UPDATE question_versions SET governance_status = $2, payload_json = $3::jsonb WHERE id = $1`,
          [row.id, nextStatus, JSON.stringify(updated)]
        );
        await tx.query(`UPDATE questions SET status = $2 WHERE id = $1`, [questionId, nextStatus]);
        await tx.query(
          `INSERT INTO question_reviews (id, question_id, question_version, reviewer_id, decision, comment) VALUES ($1,$2,$3,$4,$5,$6)`,
          [`rev_${crypto.randomUUID().slice(0, 10)}`, questionId, row.version, user.id, decision === 'approve' ? 'approve' : 'request_changes', comment]
        );
        await recordAuditEntry(tx, {
          actor: user,
          action: decision === 'approve' ? 'QUESTION_APPROVED' : 'QUESTION_CHANGES_REQUESTED',
          targetId: questionId,
          tenantId: q.governance?.tenantId,
          reason: comment || 'Review SME',
          correlationId: ctx.correlationId
        });
      });
      return { question: updated };
    },

    async publishQuestion(ctx, questionId, { idempotencyKey } = {}) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.QUESTION_PUBLISH);
      const out = await withTransactionIdempotency(
        db,
        `publish:${questionId}`,
        idempotencyKey,
        async (tx) => {
          const row = await findLatestVersionRow(questionId, null, tx);
          if (!row) throw new HttpApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
          const q = row.payload_json;
          if (!canAccessTenantResource(user, q.governance?.tenantId, { allowPlatformCrossTenant: true })) {
            throw new HttpApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses lintas tenant ditolak.', status: 403 });
          }
          if (q.governance?.status === 'published') {
            return { question: q, idempotentReplay: true };
          }
          const updated = transitionQuestionStatus(q, 'published', { userId: user.id });
          await tx.query(
            `UPDATE question_versions SET governance_status = 'published', published_at = NOW(), payload_json = $2::jsonb WHERE id = $1`,
            [row.id, JSON.stringify(updated)]
          );
          await tx.query(`UPDATE questions SET status = 'published', current_version = $2 WHERE id = $1`, [questionId, updated.version]);
          await recordAuditEntry(tx, {
            actor: user,
            action: 'QUESTION_PUBLISHED',
            targetId: questionId,
            tenantId: q.governance?.tenantId,
            reason: 'Publikasi versi soal ke Question Bank',
            correlationId: ctx.correlationId
          });
          await enqueueOutboxEvent(tx, {
            eventName: 'QUESTION_VERSION_PUBLISHED',
            aggregateType: 'questions',
            aggregateId: questionId,
            userId: user.id,
            tenantId: q.governance?.tenantId,
            correlationId: ctx.correlationId,
            payload: { version: updated.version }
          });
          return { question: updated, idempotentReplay: false };
        }
      );
      return out.data;
    },

    async createNewVersion(ctx, questionId) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.QUESTION_CREATE_DRAFT);
      const row = await findLatestVersionRow(questionId);
      if (!row) throw new HttpApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const nextVer = createNextQuestionVersion(row.payload_json, user.id);
      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO question_versions (id, question_id, version, schema_version, type, tenant_id, governance_status, visibility, payload_json, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,$8::jsonb,$9)`,
          [
            `${questionId}_v${nextVer.version}`,
            questionId,
            nextVer.version,
            nextVer.schemaVersion,
            nextVer.type,
            nextVer.governance?.tenantId || user.tenantId || null,
            nextVer.delivery?.visibility || 'tenant',
            JSON.stringify(nextVer),
            user.id
          ]
        );
        await tx.query(`UPDATE questions SET current_version = $2, status = 'draft' WHERE id = $1`, [questionId, nextVer.version]);
      });
      return { question: nextVer };
    },

    async archiveQuestion(ctx, questionId) {
      const user = await requirePermission(repos, ctx, PERMISSIONS.QUESTION_ARCHIVE);
      const row = await findLatestVersionRow(questionId);
      if (!row) throw new HttpApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const updated = transitionQuestionStatus(row.payload_json, 'archived', { userId: user.id });
      await db.transaction(async (tx) => {
        await tx.query(
          `UPDATE question_versions SET governance_status = 'archived', payload_json = $2::jsonb WHERE id = $1`,
          [row.id, JSON.stringify(updated)]
        );
        await tx.query(`UPDATE questions SET status = 'archived' WHERE id = $1`, [questionId]);
      });
      return { question: updated };
    },

    async uploadQuestionMedia(ctx, payload) {
      const user = requireAuthenticatedUser(ctx);
      const asset = validateAndPrepareMediaUpload(payload || {});
      await db.query(
        `INSERT INTO question_media (id, file_name, storage_key, mime_type, size_bytes, width, height, alt_text, checksum_sha256, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          asset.id,
          asset.fileName,
          asset.storageKey,
          asset.mimeType,
          asset.sizeBytes,
          asset.width,
          asset.height,
          asset.altText,
          asset.checksumSha256,
          user.id
        ]
      );
      return { ...asset, uploadedAt: new Date().toISOString() };
    }
  };
}
