import { describe, expect, it } from 'vitest';
import {
  computeCompetencyMasteryFromEvidence,
  computeNextSpacedRepetitionSchedule,
  normalizeLegacyQuestionInput,
  reverseXpLedgerEntry,
  validateAssessmentConfig,
  validateQuestionAuthoring,
  verifyGeneratedItemDeterministic
} from '@edumotion/domain';
import { FIXTURES_V1, createServiceProvider } from '@edumotion/services';

describe('QA Acceptance Plan — Domain & Service Rules', () => {
  describe('A. Journey Experience Engine (JRN-001 s.d. JRN-015)', () => {
    it('JRN-001 & JRN-002: Adaptive mode membuat snapshot deterministik dan refresh tidak mereroll', async () => {
      const provider = createServiceProvider();
      const first = await provider.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
      const second = await provider.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
      expect(first.viewModel.template.id).toBe('adventure');
      expect(second.viewModel.template.id).toBe(first.viewModel.template.id);
    });

    it('JRN-003 & JRN-004: Pilih template di tengah chapter hanya menyimpan pending dan diterapkan pada chapter berikutnya', async () => {
      const provider = createServiceProvider({ config: { initialUserId: 'usr_student_sma_prem' } });
      const before = await provider.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
      const activeTemplateBefore = before.viewModel.template.id;

      await provider.journey.setPendingTemplate({ templateId: 'galaxy' });
      const midChapter = await provider.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
      expect(midChapter.viewModel.template.id).toBe(activeTemplateBefore);

      // Selesaikan semua node agar chapter berikutnya bisa dimulai
      for (const node of midChapter.viewModel.nodes) {
        await provider.journey.completeNode('jrn_math_smp_algebra', node.id);
      }
      const nextRes = await provider.journey.startNextChapter('jrn_math_smp_algebra', {
        currentChapterId: 'ch_alg_01',
        idempotencyKey: 'jrn_004_next'
      });
      expect(nextRes.snapshot.templateId).toBe('galaxy');
      expect(nextRes.snapshot.selectionMode).toBe('personal');
    });

    it('JRN-005: Pending template yang terkunci/nonaktif jatuh kembali ke Adaptive dengan penjelasan', async () => {
      const provider = createServiceProvider({ config: { initialUserId: 'usr_student_sma_prem' } });
      // Snapshot ch_alg_01 dibuat saat chapter dibuka
      const ch = await provider.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
      await provider.journey.setPendingTemplate({ templateId: 'racing' });

      // Admin menonaktifkan racing sebelum chapter berikutnya dimulai
      await provider.auth.loginAsPersona('usr_platform_curriculum');
      await provider.platformAdmin.updateJourneyTemplateConfig('racing', { enabled: false });

      await provider.auth.loginAsPersona('usr_student_sma_prem');
      for (const node of ch.viewModel.nodes) {
        await provider.journey.completeNode('jrn_math_smp_algebra', node.id);
      }
      const nextRes = await provider.journey.startNextChapter('jrn_math_smp_algebra', {
        currentChapterId: 'ch_alg_01',
        idempotencyKey: 'jrn_005_next'
      });
      expect(nextRes.snapshot.selectionMode).toBe('adaptive');
      expect(nextRes.snapshot.fallbackNotice).toContain('Adaptive');
    });

    it('JRN-006, JRN-007 & JRN-008: Random memilih 1x saat chapter baru, hindari template sebelumnya, dan bertahan saat refresh', async () => {
      const provider = createServiceProvider({ config: { initialUserId: 'usr_student_smp_free' } });
      await provider.journey.updatePreferences({ selectionMode: 'random' });
      const ch1 = await provider.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
      for (const node of ch1.viewModel.nodes) {
        await provider.journey.completeNode('jrn_math_smp_algebra', node.id);
      }
      const next = await provider.journey.startNextChapter('jrn_math_smp_algebra', {
        currentChapterId: 'ch_alg_01',
        idempotencyKey: 'jrn_006_next'
      });
      expect(next.snapshot.selectionMode).toBe('random');
      expect(next.snapshot.templateId).not.toBe(ch1.viewModel.template.id);

      const refreshed = await provider.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_02');
      expect(refreshed.viewModel.template.id).toBe(next.snapshot.templateId);
    });

    it('JRN-009 & JRN-010: Template terkunci mengembalikan TEMPLATE_LOCKED dan mutasi snapshot ditolak', async () => {
      const provider = createServiceProvider({ config: { initialUserId: 'usr_student_smp_free' } });
      await expect(provider.journey.setPendingTemplate({ templateId: 'racing' })).rejects.toMatchObject({
        code: 'TEMPLATE_LOCKED'
      });
      await expect(provider.journey.rejectSnapshotMutation('ch_alg_01')).rejects.toMatchObject({
        code: 'CHAPTER_TEMPLATE_IMMUTABLE'
      });
    });

    it('JRN-011 & JRN-012: Node tanpa prasyarat ditolak & duplicate completion idempotent (no double XP)', async () => {
      const provider = createServiceProvider({ config: { initialUserId: 'usr_student_smp_free' } });
      await expect(provider.journey.completeNode('jrn_math_smp_algebra', 'node_alg_01_8')).rejects.toMatchObject({
        code: 'NODE_PREREQUISITE_NOT_MET'
      });

      const first = await provider.journey.completeNode('jrn_math_smp_algebra', 'node_alg_01_3', {
        idempotencyKey: 'same_key'
      });
      const second = await provider.journey.completeNode('jrn_math_smp_algebra', 'node_alg_01_3', {
        idempotencyKey: 'same_key_2'
      });
      expect(first.xpAwarded).toBeGreaterThan(0);
      expect(second.alreadyCompleted).toBe(true);
      expect(second.xpAwarded).toBe(0);
    });

    it('JRN-013: Menonaktifkan template untuk chapter mendatang tidak merusak snapshot chapter aktif', async () => {
      const provider = createServiceProvider({ config: { initialUserId: 'usr_platform_curriculum' } });
      await provider.platformAdmin.updateJourneyTemplateConfig('adventure', { enabled: false });
      await provider.auth.loginAsPersona('usr_student_smp_free');
      const ch = await provider.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
      expect(ch.viewModel.template.id).toBe('adventure');
    });
  });

  describe('B. Question Authoring & Publishing (QST-001 s.d. QST-010)', () => {
    it('QST-002, QST-003, QST-004 & QST-010: Validasi gagal, tolak publish invalid, published immutable, publish idempotent', async () => {
      const provider = createServiceProvider({ config: { initialUserId: 'usr_author_a' } });
      const invalidDraft = structuredClone(FIXTURES_V1.questionsBank.questions[19]);
      const val = validateQuestionAuthoring(invalidDraft);
      expect(val.valid).toBe(false);
      expect(val.blockingErrors.length).toBeGreaterThan(0);

      await provider.auth.loginAsPersona('usr_publisher_a');
      await expect(provider.question.publishQuestion(invalidDraft.id)).rejects.toMatchObject({
        code: 'VALIDATION_BLOCKING_ERRORS'
      });

      const pubId = FIXTURES_V1.questionsBank.questions[0].id;
      const dupPub = await provider.question.publishQuestion(pubId, { idempotencyKey: 'pub_dup' });
      expect(dupPub.idempotentReplay).toBe(true);

      await provider.auth.loginAsPersona('usr_author_a');
      await expect(provider.question.updateDraft(pubId, { content: { stem: 'Ubah paksa' } })).rejects.toMatchObject({
        code: 'PUBLISHED_QUESTION_IMMUTABLE'
      });

      const nextVer = await provider.question.createNewVersion(pubId);
      expect(nextVer.question.version).toBe(2);
      expect(nextVer.question.governance.status).toBe('draft');
    });

    it('QST-008 & QST-009: Tolak file upload berbahaya & map legacy essay ke worked_solution', async () => {
      const provider = createServiceProvider({ config: { initialUserId: 'usr_author_a' } });
      await expect(
        provider.media.mockUploadFile({ fileName: 'trojan.exe', mimeType: 'application/x-msdownload', sizeBytes: 100 })
      ).rejects.toMatchObject({ code: 'UNSAFE_OR_UNSUPPORTED_MEDIA' });

      const mapped = normalizeLegacyQuestionInput({ type: 'essay', content: { stem: 'Jelaskan hukum Newton' } });
      expect(mapped.type).toBe('worked_solution');
      expect(mapped.interaction.responseMode).toBe('rich_text');
    });
  });

  describe('C. AI Question Generator (AIQ-001 s.d. AIQ-010)', () => {
    it('AIQ-002..005: Tolak JSON rusak, salah hitung, taksonomi fiktif, dan kode berbahaya', () => {
      const badJson = verifyGeneratedItemDeterministic({ rawPayload: '{broken', validCompetencyIds: ['comp_solve_linear'] });
      expect(badJson.passed).toBe(false);
      expect(badJson.findings[0].code).toBe('MALFORMED_JSON');

      const wrongCalc = verifyGeneratedItemDeterministic({
        rawPayload: FIXTURES_V1.questionsBank.questions[0],
        validCompetencyIds: ['comp_solve_linear'],
        deterministicCheck: { expression: '3*5+5', claimedAnswer: 99 }
      });
      expect(wrongCalc.passed).toBe(false);
      expect(wrongCalc.findings.some((f) => f.code === 'DETERMINISTIC_CALCULATION_MISMATCH')).toBe(true);

      const badTax = structuredClone(FIXTURES_V1.questionsBank.questions[0]);
      badTax.metadata.competencyIds = ['comp_unknown'];
      const taxRes = verifyGeneratedItemDeterministic({ rawPayload: badTax, validCompetencyIds: ['comp_solve_linear'] });
      expect(taxRes.findings.some((f) => f.code === 'UNKNOWN_TAXONOMY_REFERENCE')).toBe(true);

      const xssQ = structuredClone(FIXTURES_V1.questionsBank.questions[0]);
      xssQ.content.stem = 'Hitung <script>eval("alert(1)")</script>';
      const codeRes = verifyGeneratedItemDeterministic({ rawPayload: xssQ, validCompetencyIds: ['comp_solve_linear'] });
      expect(codeRes.findings.some((f) => f.code === 'EXECUTABLE_CODE_FORBIDDEN')).toBe(true);
    });

    it('AIQ-006..010: Cost cap memblokir run, retry dibatasi, accept hanya membuat draft (tidak pernah published)', async () => {
      const provider = createServiceProvider({ config: { initialUserId: 'usr_author_a' } });
      const baseBrief = FIXTURES_V1.aiGenerationRuns.runs[0].brief;

      await expect(
        provider.aiGenerator.createRun({ brief: { ...baseBrief, budgetCapUsd: 0.01 }, simulateFailureMode: 'cost_cap' })
      ).rejects.toMatchObject({ code: 'AI_COST_CAP_EXCEEDED' });

      await expect(provider.aiGenerator.retryItem('ai_item_002')).rejects.toMatchObject({
        code: 'MAX_RETRIES_EXCEEDED'
      });

      const accepted = await provider.aiGenerator.acceptItemToDraft('ai_item_001');
      expect(accepted.draftQuestion.governance.status).toBe('draft');
    });
  });

  describe('D. Assessment Integrity (ASM-001 s.d. ASM-008)', () => {
    it('ASM-001..008: Timer kebal manipulasi jam client, idempotent autosave/submit, release policy menahan kunci, hearts ditolak pada exam', async () => {
      const badConfig = validateAssessmentConfig({ mode: 'formal_exam', heartsEnabled: true });
      expect(badConfig.valid).toBe(false);

      const provider = createServiceProvider({ config: { initialUserId: 'usr_student_sma_prem' } });
      const { session } = await provider.assessment.startSession('asm_uts_phys_01');
      const baselineRemaining = session.remainingSeconds;

      // Simulasikan jam perangkat dimajukan +30 menit
      provider.mockControl.setScenarioOptions({ clientClockOffsetMs: 30 * 60 * 1000 });
      const afterSkew = await provider.assessment.getSession(session.id);
      expect(Math.abs(afterSkew.remainingSeconds - baselineRemaining)).toBeLessThanOrEqual(2);
      expect(afterSkew.heartsEnabled).toBe(false);

      const snap0 = session.snapshots[0].snapshotId;
      await provider.assessment.autosaveResponse(session.id, snap0, { response: true, idempotencyKey: 'as_1' });
      const sub1 = await provider.assessment.submitSession(session.id, { idempotencyKey: 'sub_1' });
      const sub2 = await provider.assessment.submitSession(session.id, { idempotencyKey: 'sub_1' });
      expect(sub1.academicScore).toBe(sub2.academicScore);
      expect(sub1.xpAffectsAcademicScore).toBe(false);
      // UTS Fisika memiliki releaseAt 2030 -> jawaban & pembahasan ditahan
      expect(sub1.resultsReleased).toBe(false);
      expect(sub1.items[0].explanation).toBeUndefined();
    });
  });

  describe('E. Mastery, Spaced Repetition & XP Ledger (PRG-001 s.d. PRG-007)', () => {
    it('PRG-002..007: Mastery terpisah dari XP, anti-farming replay, compensating XP reversal, dan interval 1/3/7/14/30d', () => {
      const singleEv = computeCompetencyMasteryFromEvidence([
        { questionId: 'q1', questionVersion: 1, correct: true, difficulty: 'medium', hintUsed: false, occurredAt: '2026-11-20T00:00:00Z' }
      ]);
      const farmedEv = computeCompetencyMasteryFromEvidence([
        { questionId: 'q1', questionVersion: 1, correct: true, difficulty: 'medium', hintUsed: false, occurredAt: '2026-11-20T00:00:00Z' },
        { questionId: 'q1', questionVersion: 1, correct: true, difficulty: 'medium', hintUsed: false, occurredAt: '2026-11-20T01:00:00Z' },
        { questionId: 'q1', questionVersion: 1, correct: true, difficulty: 'medium', hintUsed: false, occurredAt: '2026-11-20T02:00:00Z' }
      ]);
      expect(farmedEv.distinctQuestionCount).toBe(1);
      expect(farmedEv.confidence).toBe(singleEv.confidence);

      const rev = reverseXpLedgerEntry(FIXTURES_V1.masteryGamification.xpLedger, 'xp_seed_1', 'Koreksi uji');
      expect(rev.entry.direction).toBe('debit_compensation');

      const srNext = computeNextSpacedRepetitionSchedule({ currentStageIndex: 0, masteryScore: 80, wasCorrect: true });
      expect(srNext.intervalDays).toBe(3);
      const srReset = computeNextSpacedRepetitionSchedule({ currentStageIndex: 3, masteryScore: 45, wasCorrect: false });
      expect(srReset.intervalDays).toBe(1);
    });
  });
});
