import {
  evaluateMathExpression,
  validateQuestionAuthoring
} from './question-engine.js';

export const AI_PIPELINE_STAGES = Object.freeze([
  { id: 'brief', label: 'Brief Konfigurasi' },
  { id: 'planner', label: 'Blueprint Planner' },
  { id: 'generator', label: 'Structured JSON Generator' },
  { id: 'schema_validator', label: 'Schema Validator' },
  { id: 'domain_verifier', label: 'Deterministic Domain Verifier' },
  { id: 'quality_reviewer', label: 'Quality Reviewer' },
  { id: 'repair_retry', label: 'Bounded Repair / Retry' },
  { id: 'human_review', label: 'Human Review Gate' },
  { id: 'accept_draft', label: 'Simpan sebagai Draft' }
]);

export function validateGenerationBrief(brief) {
  const fieldErrors = {};
  if (!brief?.curriculumId) fieldErrors.curriculumId = 'Pilih kurikulum terikat terlebih dahulu.';
  if (!brief?.gradeLevelId) fieldErrors.gradeLevelId = 'Pilih jenjang / kelas.';
  if (!brief?.subjectId) fieldErrors.subjectId = 'Pilih mata pelajaran.';
  if (!brief?.topicId) fieldErrors.topicId = 'Pilih topik materi.';
  if (!Array.isArray(brief?.competencyIds) || brief.competencyIds.length === 0) {
    fieldErrors.competencyIds = 'Minimal 1 kompetensi harus dipilih.';
  }
  const qty = Number(brief?.quantity || 0);
  if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
    fieldErrors.quantity = 'Jumlah soal harus antara 1 sampai 50.';
  }
  const dist = brief?.difficultyDistribution || { easy: 30, medium: 50, hard: 20 };
  const sum = Number(dist.easy || 0) + Number(dist.medium || 0) + Number(dist.hard || 0);
  if (sum !== 100) {
    fieldErrors.difficultyDistribution = `Distribusi tingkat kesulitan harus tepat 100% (saat ini ${sum}%).`;
  }
  const budgetCapUsd = Number(brief?.budgetCapUsd ?? 1.0);
  if (budgetCapUsd <= 0) {
    fieldErrors.budgetCapUsd = 'Batas anggaran biaya harus lebih dari 0.';
  }
  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors
  };
}

export function detectExecutableCodeInPayload(payload) {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  const patterns = [
    /<script\b/i,
    /\beval\s*\(/i,
    /new\s+Function\s*\(/i,
    /\bjavascript:/i,
    /\bprocess\.exit\b/i,
    /\bchild_process\b/i
  ];
  return patterns.some((re) => re.test(serialized));
}

export function verifyGeneratedItemDeterministic({
  rawPayload,
  validCompetencyIds = [],
  deterministicCheck = null
}) {
  const findings = [];

  if (typeof rawPayload === 'string') {
    try {
      JSON.parse(rawPayload);
    } catch {
      findings.push({
        stage: 'schema_validator',
        code: 'MALFORMED_JSON',
        severity: 'blocking',
        message: 'Output model bukan JSON yang valid (malformed JSON).'
      });
      return { passed: false, findings, qualityScore: 0 };
    }
  }

  const question = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;

  if (detectExecutableCodeInPayload(question)) {
    findings.push({
      stage: 'domain_verifier',
      code: 'EXECUTABLE_CODE_FORBIDDEN',
      severity: 'blocking',
      message: 'Terdeteksi pola kode eksekusi berbahaya (<script>/eval/Function). Ditolak tanpa dieksekusi.'
    });
    return { passed: false, findings, qualityScore: 0 };
  }

  // Check taxonomy grounding
  const compIds = question?.metadata?.competencyIds || [];
  if (validCompetencyIds.length > 0 && compIds.some((id) => !validCompetencyIds.includes(id))) {
    findings.push({
      stage: 'schema_validator',
      code: 'UNKNOWN_TAXONOMY_REFERENCE',
      severity: 'blocking',
      message: 'Kompetensi yang direferensikan tidak terdaftar pada kurikulum aktif.'
    });
  }

  // Schema & Authoring validator
  const authoringValidation = validateQuestionAuthoring(question);
  for (const err of authoringValidation.blockingErrors) {
    findings.push({
      stage: 'schema_validator',
      code: err.code,
      severity: 'blocking',
      message: err.message
    });
  }
  for (const warn of authoringValidation.warnings) {
    findings.push({
      stage: 'quality_reviewer',
      code: warn.code,
      severity: 'warning',
      message: warn.message
    });
  }

  // Deterministic math/physics calculation check if provided
  if (deterministicCheck && deterministicCheck.expression) {
    const computed = evaluateMathExpression(
      deterministicCheck.expression,
      deterministicCheck.variables || {}
    );
    const expected = Number(deterministicCheck.claimedAnswer);
    if (!Number.isFinite(computed) || Math.abs(computed - expected) > 1e-4) {
      findings.push({
        stage: 'domain_verifier',
        code: 'DETERMINISTIC_CALCULATION_MISMATCH',
        severity: 'blocking',
        message: `Verifikasi kalkulasi gagal: hasil deterministik=${computed}, klaim model=${expected}.`
      });
    }
  }

  const blockers = findings.filter((f) => f.severity === 'blocking');
  const warnings = findings.filter((f) => f.severity === 'warning');
  const qualityScore = blockers.length > 0 ? Math.max(20, 60 - blockers.length * 20) : Math.max(70, 96 - warnings.length * 6);

  return {
    passed: blockers.length === 0,
    findings,
    qualityScore
  };
}

export function canAcceptGeneratedItem(item) {
  if (!item || !item.question) return { allowed: false, reason: 'Payload soal belum tersedia.' };
  if (item.status !== 'needs_review') {
    return { allowed: false, reason: `Item berstatus '${item.status}' tidak dapat langsung diterima.` };
  }
  const hasBlockers = (item.validationReport?.findings || []).some((f) => f.severity === 'blocking');
  if (hasBlockers || item.validationReport?.passed === false) {
    return { allowed: false, reason: 'Item masih memiliki error pemblokir dan tidak boleh dipromosikan ke Question Bank.' };
  }
  return { allowed: true, reason: 'Memenuhi syarat untuk dibuat menjadi Question draft.' };
}

export function promoteGeneratedItemToDraft(item, actorUserId) {
  const check = canAcceptGeneratedItem(item);
  if (!check.allowed) {
    const err = new Error(check.reason);
    err.code = 'AI_ACCEPT_BLOCKED';
    throw err;
  }
  const draft = structuredClone(item.question);
  draft.governance = {
    ...(draft.governance || {}),
    status: 'draft',
    createdBy: actorUserId || draft.governance?.createdBy || 'ai-author'
  };
  draft.provenance = {
    ...(draft.provenance || {}),
    source: 'ai_question_generator',
    runId: item.runId,
    itemId: item.id,
    modelId: item.generation?.modelId || 'edu-qgen-v1',
    acceptedBy: actorUserId,
    acceptedAt: new Date().toISOString()
  };
  return draft;
}
