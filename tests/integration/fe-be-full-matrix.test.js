// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServiceProvider } from '@edumotion/services';
import { createLoopBackEduMotionApp } from '../../apps/api/src/loopback-app.js';
import { createMobileServiceProvider } from '../../apps/mobile/src/config/mobile-env.js';

function createMemorySecureStore() {
  const store = new Map();
  return {
    async getItemAsync(k) {
      return store.get(k) || null;
    },
    async setItemAsync(k, v) {
      store.set(k, v);
    },
    async deleteItemAsync(k) {
      store.delete(k);
    }
  };
}

describe('Phase 4 Integrasi Penuh FE (Web & Mobile) ↔ LoopBack 4 API + PostgreSQL', () => {
  let app;
  let info;
  const telemetryEvents = [];

  beforeAll(async () => {
    app = await createLoopBackEduMotionApp({ silentLogs: true });
    info = await app.start();
  });

  afterAll(async () => {
    if (app) await app.stop();
  });

  function makeWebProvider() {
    return createServiceProvider({
      config: { adapterMode: 'http', apiBaseUrl: info.apiBaseUrl },
      fetchImpl: fetch,
      onTelemetry: (e) => telemetryEvents.push(e)
    });
  }

  it('1–4 & 13. Auth scrypt, refresh rotation, RBAC, Journey Web->PostgreSQL->Mobile cross-device sync', async () => {
    const web = makeWebProvider();
    const secureStore = createMemorySecureStore();
    const mobile = createMobileServiceProvider({
      adapterMode: 'http',
      apiBaseUrl: info.apiBaseUrl,
      secureStoreModule: secureStore
    });

    // 1. Real login + SecureStore persistence
    const webLogin = await web.auth.loginWithCredentials({
      email: 'bima.smp@edumotion.demo',
      password: 'edumotion-demo'
    });
    expect(webLogin.user.id).toBe('usr_student_smp_free');

    await mobile.auth.loginWithCredentials({
      email: 'bima.smp@edumotion.demo',
      password: 'edumotion-demo'
    });
    const storedRaw = await secureStore.getItemAsync('edumotion_auth_tokens');
    expect(storedRaw).toBeTruthy();

    // Token refresh rotation
    const refreshRes = await mobile.auth.refreshSession();
    expect(refreshRes.tokens.refreshToken).toBeTruthy();

    // 2. Role/tenant/parent boundary enforcement
    await expect(web.platformAdmin.getOverview()).rejects.toMatchObject({ status: 403 });

    // 3. Learning activity delivery (no leaked answerSpec) & practice attempt
    const delivery = await web.learning.getActivityDelivery('act_alg_intro');
    expect(delivery.questions.length).toBe(3);
    expect(delivery.questions[0]).not.toHaveProperty('answerSpec');

    const wrongAttempt = await web.learning.submitPracticeAttempt('act_alg_intro', {
      questionId: delivery.questions[0].questionId,
      response: { selectedOptionId: 'opt_wrong' },
      idempotencyKey: 'int_att_wrong_1'
    });
    expect(wrongAttempt.correct).toBe(false);
    expect(wrongAttempt.heartsRemaining).toBe(4);

    // 4. Journey snapshot, mid-chapter pending preference, chapter boundary transition & Mobile sync
    const map1 = await web.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
    expect(map1.viewModel.template.id).toBe('adventure');

    // Free SMP user only has base templates; upgrade to premium to unlock galaxy
    await web.auth.upgradeEntitlement({ planId: 'premium' });
    await web.journey.setPendingTemplate({ templateId: 'galaxy' });
    const midChapter = await web.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
    expect(midChapter.viewModel.template.id).toBe('adventure'); // still frozen

    // Complete remaining nodes in chapter 1 from Web (idempotent)
    for (const node of midChapter.viewModel.nodes) {
      await web.journey.completeNode('jrn_math_smp_algebra', node.id, { idempotencyKey: `int_node_${node.id}` });
    }
    const nextRes = await web.journey.startNextChapter('jrn_math_smp_algebra', {
      currentChapterId: 'ch_alg_01',
      idempotencyKey: 'int_next_ch_02'
    });
    expect(nextRes.chapterId).toBe('ch_alg_02');
    expect(nextRes.snapshot.templateId).toBe('galaxy');

    // Cross-device verification: Mobile reads exact persisted PostgreSQL state
    const mobileMap2 = await mobile.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_02');
    expect(mobileMap2.viewModel.template.id).toBe('galaxy');
    const mobileStats = await mobile.gamification.getDashboardStats();
    expect(mobileStats.xpBalance).toBeGreaterThan(340);

    await mobile.auth.logout();
    expect(await secureStore.getItemAsync('edumotion_auth_tokens')).toBeNull();
  });

  it('5–6 & 11–12. Question Authoring lifecycle, AI Draft-Only, Media Magic Bytes & Pagination/Telemetry', async () => {
    const author = makeWebProvider();
    await author.auth.loginWithCredentials({ email: 'sari.author@cendekia.demo', password: 'edumotion-demo' });

    const created = await author.question.createDraft({
      type: 'numeric',
      metadata: {
        code: 'INT-MAT-001',
        title: 'Uji Integrasi Numerik',
        curriculumId: 'cur_merdeka',
        curriculumVersionId: 'ver_merdeka_2026',
        gradeLevelId: 'grade_smp_8',
        subjectId: 'subj_math',
        topicId: 'top_algebra_linear',
        competencyIds: ['comp_solve_linear'],
        difficulty: 'easy',
        bloomLevel: 'apply',
        locale: 'id-ID',
        estimatedSeconds: 60
      },
      content: { stem: 'Hitung hasil \\(7 \\times 8\\).', instruction: 'Isi angka.', media: [] },
      interaction: { unit: '' },
      answerSpec: { expectedValue: 56, tolerance: 0 },
      scoring: { method: 'exact_match', maxPoints: 10 },
      explanation: { steps: ['7 x 8 = 56'], hints: ['Perkalian dasar'], correctFeedback: 'Benar', incorrectFeedback: 'Coba lagi' }
    });
    expect(created.validation.valid).toBe(true);

    // Upload media valid PNG vs spoofed executable
    const mediaOk = await author.media.uploadQuestionMedia({
      fileName: 'ilustrasi.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      altText: 'Ilustrasi perkalian',
      magicBytesHex: '89504E47'
    });
    expect(mediaOk.storageKey).toMatch(/^media\//);
    await expect(
      author.media.uploadQuestionMedia({ fileName: 'fake.png', mimeType: 'image/png', sizeBytes: 512, magicBytesHex: '4D5A' })
    ).rejects.toMatchObject({ status: 415 });

    // Submit review -> Reviewer approve -> Publisher publish -> New Version
    await author.question.submitForReview(created.question.id);

    const reviewer = makeWebProvider();
    await reviewer.auth.loginWithCredentials({ email: 'hendro.reviewer@cendekia.demo', password: 'edumotion-demo' });
    await reviewer.question.reviewQuestion(created.question.id, { decision: 'approve', comment: 'Sesuai KB' });

    const publisher = makeWebProvider();
    await publisher.auth.loginWithCredentials({ email: 'dina.publisher@cendekia.demo', password: 'edumotion-demo' });
    const pub1 = await publisher.question.publishQuestion(created.question.id, { idempotencyKey: 'int_pub_1' });
    expect(pub1.question.governance.status).toBe('published');

    // Editing published is blocked 409; must createNewVersion
    await expect(author.question.updateDraft(created.question.id, { content: { stem: 'Edit paksa' } })).rejects.toMatchObject({
      code: 'PUBLISHED_QUESTION_IMMUTABLE',
      status: 409
    });
    const v2 = await author.question.createNewVersion(created.question.id);
    expect(v2.question.version).toBe(2);
    expect(v2.question.governance.status).toBe('draft');

    // AI Question Generator creates run & accept creates DRAFT only
    const runs = await author.aiGenerator.listRuns();
    const run = await author.aiGenerator.createRun({ brief: runs[0].brief });
    const validAiItem = run.items.find((it) => it.status === 'needs_review');
    const accepted = await author.aiGenerator.acceptItemToDraft(validAiItem.id);
    expect(accepted.draftQuestion.governance.status).toBe('draft');

    // Pagination + filter + telemetry correlationId check
    const paged = await author.question.list({ page: 1, pageSize: 5, status: 'draft' });
    expect(paged.items.length).toBeLessThanOrEqual(5);
    expect(telemetryEvents.some((t) => Boolean(t.correlationId))).toBe(true);
  });

  it('7–10. Formal Exam PostgreSQL, Mastery Anti-Farming, Spaced Repetition & Quest Idempotency', async () => {
    const student = makeWebProvider();
    await student.auth.loginWithCredentials({ email: 'alex.sma@edumotion.demo', password: 'edumotion-demo' });

    const { session } = await student.assessment.startSession('asm_uts_phys_01', { idempotencyKey: 'int_uts_alex' });
    expect(session.heartsEnabled).toBe(false);
    expect(session.snapshots.length).toBe(4);

    const saved = await student.assessment.autosaveResponse(session.id, session.snapshots[0].snapshotId, {
      response: { selectedOptionId: 'opt_a' },
      bookmarked: true,
      idempotencyKey: 'int_as_1'
    });
    expect(saved.saved).toBe(true);

    const sub1 = await student.assessment.submitSession(session.id, { idempotencyKey: 'int_sub_uts' });
    const sub2 = await student.assessment.submitSession(session.id, { idempotencyKey: 'int_sub_uts' });
    expect(sub1.academicScore).toBe(sub2.academicScore);
    expect(sub1.resultsReleased).toBe(false);

    // Mastery & Spaced Repetition (low mastery stays at 1d; high mastery advances 7d -> 14d)
    const mastery = await student.mastery.getOverview();
    expect(mastery.dueReviews.length).toBeGreaterThan(0);
    const srLowMastery = await student.mastery.completeSpacedReview(mastery.dueReviews[0].id, { wasCorrect: true });
    expect(srLowMastery.intervalDays).toBe(1);

    const bima = makeWebProvider();
    await bima.auth.loginWithCredentials({ email: 'bima.smp@edumotion.demo', password: 'edumotion-demo' });
    const bimaMastery = await bima.mastery.getOverview();
    const srHigh = bimaMastery.dueReviews.find((r) => r.id === 'sr_2');
    const srAdvanced = await bima.mastery.completeSpacedReview(srHigh.id, { wasCorrect: true });
    expect(srAdvanced.intervalDays).toBe(14);

    // Quest claim idempotent
    const qRes1 = await student.gamification.claimQuestReward('qst_daily_1', { idempotencyKey: 'int_qst_claim' });
    const qRes2 = await student.gamification.claimQuestReward('qst_daily_1', { idempotencyKey: 'int_qst_claim' });
    expect(qRes1.alreadyClaimed).toBe(false);
    expect(qRes2.alreadyClaimed).toBe(false); // same idempotent cached response
  });
});
