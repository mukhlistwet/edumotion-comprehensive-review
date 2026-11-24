import crypto from 'node:crypto';
import { hasPermission } from '@edumotion/domain';
import { HttpApiError } from '../security/errors.js';

export function requireAuthenticatedUser(ctx) {
  if (!ctx?.user) {
    throw new HttpApiError({
      code: 'UNAUTHORIZED',
      message: 'Autentikasi Bearer diperlukan untuk mengakses layanan ini.',
      status: 401
    });
  }
  return ctx.user;
}

export async function requirePermission(repos, ctx, permission) {
  const user = requireAuthenticatedUser(ctx);
  const customRoles = user.tenantId ? await repos.listCustomRoles(user.tenantId) : [];
  if (!hasPermission(user, permission, customRoles)) {
    throw new HttpApiError({
      code: 'FORBIDDEN',
      message: `Peran '${user.role}' tidak memiliki izin '${permission}'.`,
      status: 403
    });
  }
  return user;
}

export async function recordAuditEntry(txOrDb, { actor, action, targetId, tenantId = null, reason, correlationId = null }) {
  const id = `aud_${crypto.randomUUID().slice(0, 12)}`;
  await txOrDb.query(
    `INSERT INTO audit_logs (id, actor_id, actor_name, tenant_id, action, target_id, reason, correlation_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id,
      actor?.id || 'system',
      actor?.displayName || 'System',
      tenantId || actor?.tenantId || null,
      action,
      String(targetId),
      String(reason || ''),
      correlationId || null
    ]
  );
  return id;
}

export async function withTransactionIdempotency(db, scopeKey, idempotencyKey, fn) {
  if (!idempotencyKey) {
    const result = await db.transaction((tx) => fn(tx));
    return { replayed: false, data: result };
  }
  return db.transaction(async (tx) => {
    const existing = await tx.query(
      `SELECT response_json FROM idempotency_records WHERE scope_key = $1 AND idempotency_key = $2`,
      [scopeKey, String(idempotencyKey)]
    );
    if (existing.rows.length > 0) {
      return { replayed: true, data: existing.rows[0].response_json };
    }
    const result = await fn(tx);
    await tx.query(
      `INSERT INTO idempotency_records (scope_key, idempotency_key, status_code, response_json)
       VALUES ($1,$2,200,$3::jsonb) ON CONFLICT (scope_key, idempotency_key) DO NOTHING`,
      [scopeKey, String(idempotencyKey), JSON.stringify(result)]
    );
    return { replayed: false, data: result };
  });
}
