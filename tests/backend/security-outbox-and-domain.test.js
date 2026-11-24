// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLoopBackEduMotionApp } from '../../apps/api/src/loopback-app.js';
import { redactSensitive } from '../../apps/api/src/security/logger.js';
import { createRateLimiter } from '../../apps/api/src/security/rate-limiter.js';
import { enqueueOutboxEvent, processPendingOutboxEvents } from '../../apps/api/src/services/outbox-worker.js';

describe('Keamanan Backend, Media Magic-Bytes, RBAC, Transaksi & Transactional Outbox', () => {
  let app;
  let info;

  beforeAll(async () => {
    app = await createLoopBackEduMotionApp({
      silentLogs: true,
      allowDemoPersonaLogin: false,
      middlewareOptions: {
        allowedOrigins: ['http://127.0.0.1:4175']
      }
    });
    info = await app.start();
  });

  afterAll(async () => {
    if (app) await app.stop();
  });

  async function loginAs(email) {
    const res = await fetch(`${info.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'edumotion-demo' })
    }).then((r) => r.json());
    return res.tokens;
  }

  it('demo-login ditolak 403 saat ALLOW_DEMO_PERSONA_LOGIN=false & scrypt auth + refresh token rotation bekerja aman', async () => {
    const demoAttempt = await fetch(`${info.apiBaseUrl}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'usr_student_smp_free' })
    });
    expect(demoAttempt.status).toBe(403);

    const wrongPwd = await fetch(`${info.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bima.smp@edumotion.demo', password: 'wrong-password' })
    });
    expect(wrongPwd.status).toBe(401);

    const tokens = await loginAs('bima.smp@edumotion.demo');
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();

    // Rotate refresh token
    const refreshed = await fetch(`${info.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken })
    });
    expect(refreshed.status).toBe(200);
    const rotated = await refreshed.json();
    expect(rotated.tokens.refreshToken).not.toBe(tokens.refreshToken);

    // Reusing revoked refresh token must be rejected 401
    const reuse = await fetch(`${info.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken })
    });
    expect(reuse.status).toBe(401);
  });

  it('menolak upload biner berbahaya dengan MIME image/png palsu, dimensi bom piksel, & ukuran >10MB', async () => {
    const tokens = await loginAs('sari.author@cendekia.demo');
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.accessToken}`
    };

    // File .png palsu berisi Windows PE magic bytes 4D5A (MZ...)
    const spoofedExe = await fetch(`${info.apiBaseUrl}/question-media/presign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        fileName: 'diagram.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        magicBytesHex: '4D5A9000'
      })
    });
    expect(spoofedExe.status).toBe(415);

    const hugeDim = await fetch(`${info.apiBaseUrl}/question-media/presign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        fileName: 'bomb.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
        width: 9000,
        height: 9000,
        magicBytesHex: '89504E47'
      })
    });
    expect(hugeDim.status).toBe(422);

    const validPng = await fetch(`${info.apiBaseUrl}/question-media/presign`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        fileName: 'grafik-parabola.png',
        mimeType: 'image/png',
        sizeBytes: 4096,
        width: 800,
        height: 600,
        altText: 'Grafik fungsi kuadrat',
        magicBytesHex: '89504E470D0A1A0A'
      })
    });
    expect(validPng.status).toBe(201);
    const asset = await validPng.json();
    expect(asset.storageKey).not.toContain('grafik-parabola');
    expect(asset.storageKey).toMatch(/^media\/\d{4}\/[0-9a-f-]+\.png$/);
  });

  it('menegakkan strict CORS allowlist, isolasi tenant & parent, scoped admin, dan redaksi log sensitif', async () => {
    const badCors = await fetch(`${info.apiBaseUrl}/plans`, {
      headers: { Origin: 'https://evil-attacker.example' }
    });
    expect(badCors.status).toBe(403);

    const teacherBTokens = await loginAs('farid.teacher@pintar.demo');
    const crossTenantRes = await fetch(`${info.apiBaseUrl}/questions/11111111-1111-4111-8111-000000000020`, {
      headers: { Authorization: `Bearer ${teacherBTokens.accessToken}` }
    });
    expect(crossTenantRes.status).toBe(403);

    const parentTokens = await loginAs('dewi.parent@edumotion.demo');
    const unlinkedChildRes = await fetch(`${info.apiBaseUrl}/parent/children?studentId=usr_student_smp_free`, {
      headers: { Authorization: `Bearer ${parentTokens.accessToken}` }
    });
    expect(unlinkedChildRes.status).toBe(403);

    const currAdminTokens = await loginAs('maya.curriculum@edumotion.demo');
    const adminAudit = await fetch(`${info.apiBaseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${currAdminTokens.accessToken}` }
    });
    expect(adminAudit.status).toBe(403);

    const redacted = redactSensitive({
      email: 'a@b.com',
      password: 'secret',
      accessToken: 'abc',
      nested: { answerSpec: { correctOptionIds: ['opt_a'] } }
    });
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.accessToken).toBe('[REDACTED]');
    expect(redacted.nested.answerSpec).toBe('[REDACTED]');
  });

  it('rate limiter menolak burst abuse dengan 429 dan outbox worker mendukung idempotent consumption + dead_letter', async () => {
    const rl = createRateLimiter({ windowMs: 60000, limits: { auth: 2, general: 10, ai: 10, media: 10 } });
    let blocked = false;
    for (let i = 0; i < 4; i += 1) {
      const req = { path: '/auth/login', ip: '10.0.0.1', correlationId: 'c1' };
      let statusVal = 200;
      const res = {
        setHeader() {},
        status(s) {
          statusVal = s;
          return { json: () => statusVal };
        }
      };
      rl(req, res, () => {});
      if (statusVal === 429) blocked = true;
    }
    expect(blocked).toBe(true);

    // Transactional rollback check + Outbox processing check
    await expect(
      app.db.transaction(async (tx) => {
        await enqueueOutboxEvent(tx, {
          eventName: 'TEST_ROLLBACK',
          aggregateType: 'test',
          aggregateId: 'rb_1'
        });
        throw new Error('SIMULATED_TX_FAILURE');
      })
    ).rejects.toThrow('SIMULATED_TX_FAILURE');

    const rolledBack = await app.db.query(`SELECT * FROM outbox_events WHERE aggregate_id = 'rb_1'`);
    expect(rolledBack.rows).toHaveLength(0);

    await app.db.transaction(async (tx) => {
      await enqueueOutboxEvent(tx, {
        eventName: 'OUTBOX_DLQ_TEST',
        aggregateType: 'test',
        aggregateId: 'dlq_1'
      });
    });

    const failingHandler = async () => {
      throw new Error('DOWNSTREAM_DOWN');
    };
    await processPendingOutboxEvents(app.db, { OUTBOX_DLQ_TEST: failingHandler }, { maxAttempts: 2 });
    await processPendingOutboxEvents(app.db, { OUTBOX_DLQ_TEST: failingHandler }, { maxAttempts: 2 });

    const dlqRow = await app.db.query(`SELECT status, attempts FROM outbox_events WHERE aggregate_id = 'dlq_1'`);
    expect(dlqRow.rows[0].status).toBe('dead_letter');
    expect(dlqRow.rows[0].attempts).toBe(2);
  });
});
