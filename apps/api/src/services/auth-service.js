import crypto from 'node:crypto';
import { hashPassword, verifyPassword } from '../security/password.js';
import { createAccessToken, generateRefreshToken, hashRefreshToken } from '../security/tokens.js';
import { HttpApiError } from '../security/errors.js';
import { recordAuditEntry, requireAuthenticatedUser } from './authz-helpers.js';
import { enqueueOutboxEvent } from './outbox-worker.js';

export function createAuthService({
  repos,
  db,
  jwtSecret,
  allowDemoPersonaLogin = process.env.ALLOW_DEMO_PERSONA_LOGIN !== 'false'
}) {
  async function issueSessionTokens(tx, user) {
    const accessToken = createAccessToken(
      { sub: user.id, role: user.role, tenantId: user.tenantId },
      { secret: jwtSecret, expiresInSeconds: 900 }
    );
    const rawRefresh = generateRefreshToken();
    const tokenId = `rtk_${crypto.randomUUID().slice(0, 12)}`;
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await tx.query(
      `INSERT INTO auth_refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1,$2,$3,$4)`,
      [tokenId, user.id, hashRefreshToken(rawRefresh), refreshExpiresAt]
    );
    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresAt: new Date(Date.now() + 900 * 1000).toISOString()
    };
  }

  return {
    async listPersonas() {
      if (!allowDemoPersonaLogin) {
        throw new HttpApiError({
          code: 'DEMO_MODE_DISABLED',
          message: 'Daftar persona demo dinonaktifkan pada environment ini.',
          status: 403
        });
      }
      return repos.listPublicPersonas();
    },

    async getSession(ctx) {
      if (!ctx?.user) {
        return { authenticated: false, user: null };
      }
      const user = await repos.getUserById(ctx.user.id);
      if (!user) return { authenticated: false, user: null };
      return { authenticated: true, user };
    },

    async loginWithCredentials({ email, password }) {
      const fieldErrors = {};
      if (!email || !String(email).includes('@')) {
        fieldErrors.email = 'Masukkan alamat email yang valid.';
      }
      if (!password || String(password).length < 6) {
        fieldErrors.password = 'Kata sandi minimal 6 karakter.';
      }
      if (Object.keys(fieldErrors).length > 0) {
        throw new HttpApiError({
          code: 'VALIDATION_ERROR',
          message: 'Periksa kembali kolom masuk.',
          status: 422,
          fieldErrors
        });
      }
      const found = await repos.getUserAuthByEmail(email);
      if (!found || !verifyPassword(password, found.passwordHash)) {
        throw new HttpApiError({
          code: 'INVALID_CREDENTIALS',
          message: 'Email atau kata sandi tidak valid.',
          status: 401
        });
      }
      const tokens = await db.transaction((tx) => issueSessionTokens(tx, found.user));
      return { user: found.user, tokens };
    },

    async loginAsPersona({ userId }) {
      if (!allowDemoPersonaLogin) {
        throw new HttpApiError({
          code: 'DEMO_MODE_DISABLED',
          message: 'Login persona demo dinonaktifkan pada environment produksi.',
          status: 403
        });
      }
      const user = await repos.getUserById(userId);
      if (!user) {
        throw new HttpApiError({
          code: 'PERSONA_NOT_FOUND',
          message: `Persona '${userId}' tidak ditemukan.`,
          status: 404
        });
      }
      const tokens = await db.transaction((tx) => issueSessionTokens(tx, user));
      return { user, tokens };
    },

    async refreshTokens({ refreshToken }) {
      if (!refreshToken) {
        throw new HttpApiError({
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token wajib disediakan.',
          status: 401
        });
      }
      const hashed = hashRefreshToken(refreshToken);
      return db.transaction(async (tx) => {
        const res = await tx.query(`SELECT * FROM auth_refresh_tokens WHERE token_hash = $1`, [hashed]);
        if (res.rows.length === 0) {
          throw new HttpApiError({ code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token tidak dikenal.', status: 401 });
        }
        const row = res.rows[0];
        if (row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) {
          // Security defense: revoke any chain tokens for user when revoked token reuse is detected
          await tx.query(`UPDATE auth_refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = $1`, [row.user_id]);
          throw new HttpApiError({
            code: 'TOKEN_REVOKED_OR_EXPIRED',
            message: 'Refresh token sudah dicabut atau kedaluwarsa. Silakan masuk ulang.',
            status: 401
          });
        }
        const user = await repos.getUserById(row.user_id, tx);
        if (!user) {
          throw new HttpApiError({ code: 'UNAUTHORIZED', message: 'Pengguna tidak ditemukan.', status: 401 });
        }
        const tokens = await issueSessionTokens(tx, user);
        const newHash = hashRefreshToken(tokens.refreshToken);
        const newRow = await tx.query(`SELECT id FROM auth_refresh_tokens WHERE token_hash = $1`, [newHash]);
        await tx.query(
          `UPDATE auth_refresh_tokens SET revoked_at = NOW(), replaced_by_id = $2 WHERE id = $1`,
          [row.id, newRow.rows[0]?.id || null]
        );
        return { user, tokens };
      });
    },

    async register({ displayName, email, password, educationLevel = 'SMP', curriculumId = 'cur_merdeka' }) {
      const fieldErrors = {};
      if (!displayName || String(displayName).trim().length < 2) {
        fieldErrors.displayName = 'Nama lengkap minimal 2 karakter.';
      }
      if (!email || !String(email).includes('@')) {
        fieldErrors.email = 'Format email tidak valid.';
      }
      if (!password || String(password).length < 6) {
        fieldErrors.password = 'Kata sandi minimal 6 karakter.';
      }
      if (Object.keys(fieldErrors).length > 0) {
        throw new HttpApiError({ code: 'VALIDATION_ERROR', message: 'Data pendaftaran belum valid.', status: 422, fieldErrors });
      }
      const existing = await repos.getUserAuthByEmail(email);
      if (existing) {
        throw new HttpApiError({
          code: 'EMAIL_EXISTS',
          message: 'Email sudah terdaftar.',
          status: 422,
          fieldErrors: { email: 'Email sudah terdaftar.' }
        });
      }

      const id = `usr_reg_${crypto.randomUUID().slice(0, 8)}`;
      const gradeMap = {
        SD: 'grade_sd_5',
        SMP: 'grade_smp_8',
        SMA: 'grade_sma_10',
        UNIVERSITY: 'grade_univ_1'
      };
      const cleanName = String(displayName).trim();
      const initials = cleanName.slice(0, 2).toUpperCase();
      const passwordHash = hashPassword(password);

      return db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO users (id, email, password_hash, display_name, initials, role, tenant_id, education_level, curriculum_id, grade_level_id, entitlement, is_minor, privacy_opt_in_public_name, title, description)
           VALUES ($1,$2,$3,$4,$5,'student',NULL,$6,$7,$8,'freemium',$9,FALSE,$10,'Akun baru siswa EduMotion.')`,
          [
            id,
            String(email).trim(),
            passwordHash,
            cleanName,
            initials,
            educationLevel,
            curriculumId,
            gradeMap[educationLevel] || 'grade_smp_8',
            educationLevel !== 'UNIVERSITY',
            `${cleanName} · Siswa`
          ]
        );
        await tx.query(
          `INSERT INTO user_gamification_meta (user_id, streak_days, best_streak, hearts, max_hearts, gems, daily_xp_target, daily_xp_earned, weekly_xp)
           VALUES ($1,1,1,5,5,50,30,0,0)`,
          [id]
        );
        await tx.query(
          `INSERT INTO user_journey_preferences (user_id, selection_mode, preferred_template_id) VALUES ($1,'adaptive','adventure')`,
          [id]
        );
        for (const tplId of ['adventure', 'board', 'skill']) {
          await tx.query(
            `INSERT INTO journey_template_unlocks (id, user_id, template_id, source) VALUES ($1,$2,$3,'base')`,
            [`ulk_${id}_${tplId}`, id, tplId]
          );
        }
        const user = await repos.getUserById(id, tx);
        const tokens = await issueSessionTokens(tx, user);
        return { user, tokens };
      });
    },

    async requestPasswordReset({ email }) {
      if (!email || !String(email).includes('@')) {
        throw new HttpApiError({
          code: 'VALIDATION_ERROR',
          message: 'Masukkan alamat email yang valid.',
          status: 422,
          fieldErrors: { email: 'Format email tidak valid.' }
        });
      }
      return { sent: true, message: 'Tautan reset kata sandi telah dikirim jika email terdaftar.' };
    },

    async resetPassword({ token, newPassword }) {
      const fieldErrors = {};
      if (!token) fieldErrors.token = 'Token reset wajib diisi.';
      if (!newPassword || String(newPassword).length < 6) fieldErrors.newPassword = 'Kata sandi baru minimal 6 karakter.';
      if (Object.keys(fieldErrors).length > 0) {
        throw new HttpApiError({ code: 'VALIDATION_ERROR', message: 'Input reset tidak valid.', status: 422, fieldErrors });
      }
      return { reset: true };
    },

    async logout(ctx, { refreshToken } = {}) {
      if (refreshToken) {
        await db.query(
          `UPDATE auth_refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE token_hash = $1`,
          [hashRefreshToken(refreshToken)]
        );
      } else if (ctx?.user?.id) {
        await db.query(
          `UPDATE auth_refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = $1`,
          [ctx.user.id]
        );
      }
      return { ok: true };
    },

    async upgradeEntitlement(ctx, { planId }) {
      const user = requireAuthenticatedUser(ctx);
      if (!planId) {
        throw new HttpApiError({ code: 'VALIDATION_ERROR', message: 'Pilih paket entitlement.', status: 422, fieldErrors: { planId: 'Wajib diisi.' } });
      }
      return db.transaction(async (tx) => {
        await tx.query(`UPDATE users SET entitlement = $2 WHERE id = $1`, [user.id, planId]);
        if (['premium', 'family', 'institution_pro'].includes(planId)) {
          for (const tplId of ['explore', 'racing', 'galaxy']) {
            await tx.query(
              `INSERT INTO journey_template_unlocks (id, user_id, template_id, source)
               VALUES ($1,$2,$3,'premium') ON CONFLICT (user_id, template_id) DO NOTHING`,
              [`ulk_${user.id}_${tplId}`, user.id, tplId]
            );
          }
        }
        await enqueueOutboxEvent(tx, {
          eventName: 'SUBSCRIPTION_ENTITLEMENT_CHANGED',
          aggregateType: 'user',
          aggregateId: user.id,
          userId: user.id,
          tenantId: user.tenantId,
          correlationId: ctx.correlationId,
          payload: { planId }
        });
        await recordAuditEntry(tx, {
          actor: user,
          action: 'ENTITLEMENT_UPGRADED',
          targetId: user.id,
          tenantId: user.tenantId,
          reason: `Perubahan paket ke ${planId}`,
          correlationId: ctx.correlationId
        });
        const updated = await repos.getUserById(user.id, tx);
        return { user: updated, planId };
      });
    },

    async updateProfile(ctx, patch = {}) {
      const user = requireAuthenticatedUser(ctx);
      if (patch.displayName !== undefined && !String(patch.displayName).trim()) {
        throw new HttpApiError({
          code: 'VALIDATION_ERROR',
          message: 'Nama tampilan tidak boleh kosong.',
          status: 422,
          fieldErrors: { displayName: 'Nama wajib diisi.' }
        });
      }
      const nextName = patch.displayName !== undefined ? String(patch.displayName).trim() : user.displayName;
      const nextOptIn = patch.privacyOptInPublicName !== undefined ? Boolean(patch.privacyOptInPublicName) : user.privacyOptInPublicName;
      await db.query(
        `UPDATE users SET display_name = $2, privacy_opt_in_public_name = $3 WHERE id = $1`,
        [user.id, nextName, nextOptIn]
      );
      return { user: await repos.getUserById(user.id) };
    }
  };
}
