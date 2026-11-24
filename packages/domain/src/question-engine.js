import {
  ASSESSMENT_MODES,
  BLOOM_LEVELS,
  DIFFICULTY_LEVELS,
  QUESTION_GOVERNANCE_STATUSES,
  QUESTION_TYPES
} from './enums.js';
import { assertTransition } from './state-machines.js';

/**
 * Recursive-descent safe mathematical expression evaluator (NO eval/new Function).
 * Supports numbers, variables, +, -, *, /, ^, parentheses, implicit multiplication,
 * and basic functions (sqrt, abs, sin, cos, tan, ln, log).
 */
export function evaluateMathExpression(exprText, variables = {}) {
  if (typeof exprText !== 'string' || !exprText.trim()) return NaN;
  const cleaned = exprText
    .replace(/\s+/g, '')
    .replace(/−/g, '-')
    .replace(/×/g, '*')
    .replace(/·/g, '*')
    .replace(/÷/g, '/')
    .replace(/\*\*/g, '^')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')');

  const tokens = [];
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (/\d|\./.test(ch)) {
      let numStr = '';
      while (i < cleaned.length && /[\d.]/.test(cleaned[i])) {
        numStr += cleaned[i];
        i += 1;
      }
      const val = Number(numStr);
      if (Number.isNaN(val)) return NaN;
      tokens.push({ type: 'num', value: val });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < cleaned.length && /[a-zA-Z0-9_]/.test(cleaned[i])) {
        ident += cleaned[i];
        i += 1;
      }
      if (['sqrt', 'abs', 'sin', 'cos', 'tan', 'ln', 'log'].includes(ident)) {
        tokens.push({ type: 'fn', value: ident });
      } else if (ident === 'pi' || ident === 'e') {
        tokens.push({ type: 'num', value: ident === 'pi' ? Math.PI : Math.E });
      } else if (ident.length > 1 && cleaned[i] !== '(') {
        for (const letter of ident) {
          tokens.push({ type: 'var', value: letter });
        }
      } else {
        tokens.push({ type: 'var', value: ident });
      }
      continue;
    }
    if ('+-*/^(),'.includes(ch)) {
      tokens.push({ type: ch === '(' ? 'lp' : ch === ')' ? 'rp' : 'op', value: ch });
      i += 1;
      continue;
    }
    return NaN;
  }

  // Insert implicit multiplication tokens
  const expanded = [];
  for (let k = 0; k < tokens.length; k += 1) {
    const prev = expanded[expanded.length - 1];
    const curr = tokens[k];
    if (prev) {
      const prevVal = prev.type === 'num' || prev.type === 'var' || prev.type === 'rp';
      const currVal = curr.type === 'num' || curr.type === 'var' || curr.type === 'fn' || curr.type === 'lp';
      if (prevVal && currVal) {
        expanded.push({ type: 'op', value: '*' });
      }
    }
    expanded.push(curr);
  }

  let pos = 0;
  function peek() {
    return expanded[pos];
  }
  function consume() {
    const t = expanded[pos];
    pos += 1;
    return t;
  }

  function parseExpression() {
    let left = parseTerm();
    while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parsePower();
    while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = consume().value;
      const right = parsePower();
      if (op === '/' && Math.abs(right) < 1e-12) return NaN;
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  function parsePower() {
    const base = parseUnary();
    if (peek() && peek().type === 'op' && peek().value === '^') {
      consume();
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary() {
    if (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const val = parseUnary();
      return op === '-' ? -val : val;
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = peek();
    if (!t) return NaN;
    if (t.type === 'num') {
      consume();
      return t.value;
    }
    if (t.type === 'var') {
      consume();
      return Object.prototype.hasOwnProperty.call(variables, t.value) ? Number(variables[t.value]) : 0;
    }
    if (t.type === 'fn') {
      const fn = consume().value;
      if (!peek() || peek().type !== 'lp') return NaN;
      consume();
      const arg = parseExpression();
      if (!peek() || peek().type !== 'rp') return NaN;
      consume();
      if (fn === 'sqrt') return arg < 0 ? NaN : Math.sqrt(arg);
      if (fn === 'abs') return Math.abs(arg);
      if (fn === 'sin') return Math.sin(arg);
      if (fn === 'cos') return Math.cos(arg);
      if (fn === 'tan') return Math.tan(arg);
      if (fn === 'ln') return arg <= 0 ? NaN : Math.log(arg);
      if (fn === 'log') return arg <= 0 ? NaN : Math.log10(arg);
      return NaN;
    }
    if (t.type === 'lp') {
      consume();
      const val = parseExpression();
      if (!peek() || peek().type !== 'rp') return NaN;
      consume();
      return val;
    }
    return NaN;
  }

  const result = parseExpression();
  if (pos !== expanded.length) return NaN;
  return result;
}

export function areMathExpressionsEquivalent(actualExpr, expectedExpr, variableNames = ['x', 'y', 't', 'a']) {
  const sampleVectors = [
    { x: 1.7, y: 2.3, t: 1.1, a: 3.1 },
    { x: 3.4, y: -1.5, t: 2.7, a: 1.9 },
    { x: -2.2, y: 4.1, t: 0.8, a: -1.3 },
    { x: 5.5, y: 0.9, t: 3.3, a: 2.6 }
  ];

  // If expressions are equations like "x=5" or "y=2x+1", compare RHS/normalized equation
  const normalizeEq = (s) => String(s || '').trim().replace(/\s+/g, '');
  const aStr = normalizeEq(actualExpr);
  const eStr = normalizeEq(expectedExpr);
  if (!aStr || !eStr) return false;
  if (aStr.toLowerCase() === eStr.toLowerCase()) return true;

  const splitEq = (s) => {
    const parts = s.split('=');
    return parts.length === 2 ? `(${parts[0]})-(${parts[1]})` : s;
  };
  const exprA = splitEq(aStr);
  const exprE = splitEq(eStr);

  // If equation form with =, equivalence allows sign flip (e.g. x=5 vs 5=x)
  const isEquation = aStr.includes('=') && eStr.includes('=');

  let validSamples = 0;
  let sameCount = 0;
  let negatedCount = 0;

  for (const vec of sampleVectors) {
    const scopedVars = {};
    for (const v of variableNames) scopedVars[v] = vec[v] ?? 2.1;
    const valA = evaluateMathExpression(exprA, scopedVars);
    const valE = evaluateMathExpression(exprE, scopedVars);
    if (Number.isFinite(valA) && Number.isFinite(valE)) {
      validSamples += 1;
      if (Math.abs(valA - valE) < 1e-4) sameCount += 1;
      if (isEquation && Math.abs(valA + valE) < 1e-4) negatedCount += 1;
    }
  }

  if (validSamples === 0) return false;
  return sameCount === validSamples || (isEquation && negatedCount === validSamples);
}

export function normalizeLegacyQuestionInput(rawQuestion) {
  if (!rawQuestion || typeof rawQuestion !== 'object') return rawQuestion;
  const copy = structuredClone(rawQuestion);
  if (copy.type === 'essay') {
    copy.type = 'worked_solution';
    copy.interaction = {
      ...(copy.interaction || {}),
      responseMode: 'rich_text',
      legacyAliasFrom: 'essay'
    };
  }
  return copy;
}

export function validateQuestionAuthoring(rawInput) {
  const question = normalizeLegacyQuestionInput(rawInput);
  const blockingErrors = [];
  const warnings = [];
  const fieldErrors = {};

  const addError = (field, code, message) => {
    blockingErrors.push({ field, code, message, severity: 'blocking' });
    if (!fieldErrors[field]) fieldErrors[field] = message;
  };
  const addWarning = (field, code, message) => {
    warnings.push({ field, code, message, severity: 'warning' });
  };

  if (!question || typeof question !== 'object') {
    addError('root', 'INVALID_PAYLOAD', 'Payload soal tidak valid.');
    return { valid: false, blockingErrors, warnings, fieldErrors };
  }

  if (question.schemaVersion !== 'edumotion-question-v1') {
    addError('schemaVersion', 'INVALID_SCHEMA_VERSION', 'schemaVersion harus bernilai "edumotion-question-v1".');
  }

  if (!question.id || typeof question.id !== 'string') {
    addError('id', 'MISSING_ID', 'ID soal wajib diisi.');
  }

  if (!Number.isInteger(question.version) || question.version < 1) {
    addError('version', 'INVALID_VERSION', 'Versi soal harus bilangan bulat minimal 1.');
  }

  if (!QUESTION_TYPES.includes(question.type)) {
    addError('type', 'UNSUPPORTED_QUESTION_TYPE', `Tipe soal '${question.type}' tidak didukung.`);
  }

  // Metadata checks
  const meta = question.metadata || {};
  const requiredMeta = ['curriculumId', 'curriculumVersionId', 'gradeLevelId', 'subjectId', 'topicId'];
  for (const key of requiredMeta) {
    if (!meta[key] || typeof meta[key] !== 'string' || !meta[key].trim()) {
      addError(`metadata.${key}`, 'MISSING_METADATA', `Field metadata.${key} wajib dipilih.`);
    }
  }
  if (!Array.isArray(meta.competencyIds) || meta.competencyIds.length === 0) {
    addError('metadata.competencyIds', 'MISSING_COMPETENCY', 'Minimal 1 kompetensi wajib dipetakan.');
  }
  if (!DIFFICULTY_LEVELS.includes(meta.difficulty)) {
    addError('metadata.difficulty', 'INVALID_DIFFICULTY', 'Tingkat kesulitan tidak valid.');
  }
  if (meta.bloomLevel && !BLOOM_LEVELS.includes(meta.bloomLevel)) {
    addError('metadata.bloomLevel', 'INVALID_BLOOM_LEVEL', 'Level kognitif Bloom tidak valid.');
  }

  // Content checks
  const content = question.content || {};
  if (!content.stem || typeof content.stem !== 'string' || !content.stem.trim()) {
    addError('content.stem', 'MISSING_STEM', 'Pertanyaan (stem) tidak boleh kosong.');
  }
  if (typeof content.stem === 'string' && /<script|javascript:|onerror=|onload=/i.test(content.stem)) {
    addError('content.stem', 'UNSAFE_MARKUP', 'Konten soal mengandung markup/skrip berbahaya yang dilarang.');
  }
  if (Array.isArray(content.media) && content.media.length > 0) {
    for (let idx = 0; idx < content.media.length; idx += 1) {
      const m = content.media[idx];
      if (!m?.url && !m?.storageKey) {
        addError(`content.media.${idx}`, 'BROKEN_MEDIA', 'Referensi media rusak atau kosong.');
      }
      if (!m?.altText && !question.accessibility?.altText) {
        addWarning('accessibility.altText', 'MISSING_ALT_TEXT', 'Media sebaiknya dilengkapi teks alternatif (alt text) untuk aksesibilitas.');
      }
    }
  }

  // Type-specific interaction & answerSpec validation
  const interaction = question.interaction || {};
  const answerSpec = question.answerSpec || {};

  if (question.type === 'single_choice' || question.type === 'multiple_select') {
    const opts = interaction.options || [];
    if (!Array.isArray(opts) || opts.length < 2) {
      addError('interaction.options', 'TOO_FEW_OPTIONS', 'Pilihan ganda memerlukan minimal 2 opsi jawaban.');
    } else {
      const optIds = opts.map((o) => o.id);
      const texts = opts.map((o) => String(o.label ?? o.content ?? '').trim().toLowerCase());
      if (texts.some((t) => !t)) {
        addError('interaction.options', 'EMPTY_OPTION', 'Setiap opsi pilihan ganda harus memiliki teks.');
      }
      if (new Set(texts).size !== texts.length) {
        addWarning('interaction.options', 'DUPLICATE_OPTIONS', 'Terdapat opsi pilihan ganda yang duplikat.');
      }
      const correctIds = answerSpec.correctOptionIds || [];
      if (!Array.isArray(correctIds) || correctIds.length === 0) {
        addError('answerSpec.correctOptionIds', 'MISSING_ANSWER_KEY', 'Pilih minimal 1 jawaban benar.');
      } else {
        if (question.type === 'single_choice' && correctIds.length !== 1) {
          addError('answerSpec.correctOptionIds', 'INVALID_SINGLE_CHOICE_KEY', 'Pilihan tunggal harus memiliki tepat 1 jawaban benar.');
        }
        if (correctIds.some((id) => !optIds.includes(id))) {
          addError('answerSpec.correctOptionIds', 'UNKNOWN_OPTION_REFERENCE', 'Kunci jawaban merujuk pada ID opsi yang tidak ada.');
        }
      }
    }
  } else if (question.type === 'true_false') {
    if (typeof answerSpec.correctAnswer !== 'boolean') {
      addError('answerSpec.correctAnswer', 'INVALID_TRUE_FALSE_KEY', 'Kunci jawaban Benar/Salah harus bertipe boolean.');
    }
  } else if (question.type === 'numeric') {
    if (typeof answerSpec.expectedValue !== 'number' || Number.isNaN(answerSpec.expectedValue)) {
      addError('answerSpec.expectedValue', 'INVALID_NUMERIC_KEY', 'Jawaban angka target harus berupa bilangan valid.');
    }
    if (answerSpec.tolerance !== undefined && Number(answerSpec.tolerance) < 0) {
      addError('answerSpec.tolerance', 'NEGATIVE_TOLERANCE', 'Toleransi numerik tidak boleh bernilai negatif.');
    }
  } else if (question.type === 'short_text') {
    if (!Array.isArray(answerSpec.acceptedAnswers) || answerSpec.acceptedAnswers.filter((s) => String(s).trim()).length === 0) {
      addError('answerSpec.acceptedAnswers', 'MISSING_ACCEPTED_TEXT', 'Masukkan minimal 1 jawaban teks yang diterima.');
    }
  } else if (question.type === 'fill_blank') {
    const blanks = interaction.blanks || [];
    const expectedBlanks = answerSpec.blanks || {};
    if (!Array.isArray(blanks) || blanks.length === 0) {
      addError('interaction.blanks', 'MISSING_BLANKS', 'Soal isian rumpang memerlukan minimal 1 slot kosong.');
    } else {
      for (const b of blanks) {
        const vals = expectedBlanks[b.id];
        if (!Array.isArray(vals) || vals.filter((x) => String(x).trim()).length === 0) {
          addError(`answerSpec.blanks.${b.id}`, 'MISSING_BLANK_KEY', `Slot '${b.id}' belum memiliki kunci jawaban.`);
        }
      }
    }
  } else if (question.type === 'matching') {
    const leftItems = interaction.leftItems || [];
    const rightItems = interaction.rightItems || [];
    const correctPairs = answerSpec.correctPairs || {};
    if (leftItems.length < 2 || rightItems.length < 2) {
      addError('interaction.leftItems', 'TOO_FEW_MATCH_PAIRS', 'Soal menjodohkan minimal memiliki 2 pasangan.');
    }
    const rightIds = rightItems.map((r) => r.id);
    for (const left of leftItems) {
      if (!correctPairs[left.id] || !rightIds.includes(correctPairs[left.id])) {
        addError('answerSpec.correctPairs', 'INCOMPLETE_MATCH_KEY', `Item '${left.label || left.id}' belum dipasangkan dengan target valid.`);
      }
    }
  } else if (question.type === 'ordering') {
    const items = interaction.items || [];
    const correctOrder = answerSpec.correctOrder || [];
    if (items.length < 2) {
      addError('interaction.items', 'TOO_FEW_ORDER_ITEMS', 'Urutkan langkah memerlukan minimal 2 item.');
    } else if (
      correctOrder.length !== items.length ||
      !items.every((it) => correctOrder.includes(it.id))
    ) {
      addError('answerSpec.correctOrder', 'INVALID_ORDER_KEY', 'Urutan kunci jawaban harus memuat seluruh ID item tepat satu kali.');
    }
  } else if (question.type === 'drag_drop') {
    const items = interaction.draggableItems || [];
    const zones = interaction.dropZones || [];
    const map = answerSpec.correctPlacements || {};
    if (items.length < 1 || zones.length < 1) {
      addError('interaction.dropZones', 'MISSING_DRAG_DROP_ZONES', 'Drag & drop memerlukan item dan zona target.');
    }
    const zoneIds = zones.map((z) => z.id);
    for (const it of items) {
      if (!map[it.id] || !zoneIds.includes(map[it.id])) {
        addError('answerSpec.correctPlacements', 'INVALID_DRAG_DROP_KEY', `Item '${it.label || it.id}' harus dipetakan ke zona target valid.`);
      }
    }
  } else if (question.type === 'graph_plot') {
    const targets = answerSpec.targetPoints || [];
    if (!Array.isArray(targets) || targets.length === 0) {
      addError('answerSpec.targetPoints', 'MISSING_GRAPH_TARGET', 'Plot grafik memerlukan minimal 1 titik koordinat target.');
    }
  } else if (question.type === 'formula_input') {
    if (!Array.isArray(answerSpec.acceptedExpressions) || answerSpec.acceptedExpressions.filter((e) => String(e).trim()).length === 0) {
      addError('answerSpec.acceptedExpressions', 'MISSING_FORMULA_KEY', 'Masukkan minimal 1 ekspresi matematika kunci.');
    }
  } else if (question.type === 'diagram_label') {
    const regions = interaction.regions || [];
    const labels = interaction.labelBank || [];
    const correctLabels = answerSpec.correctLabels || {};
    if (regions.length === 0 || labels.length === 0) {
      addError('interaction.regions', 'MISSING_DIAGRAM_REGIONS', 'Diagram label memerlukan region hotspot dan daftar label.');
    }
    const labelIds = labels.map((l) => l.id);
    for (const r of regions) {
      if (!correctLabels[r.id] || !labelIds.includes(correctLabels[r.id])) {
        addError('answerSpec.correctLabels', 'INVALID_DIAGRAM_KEY', `Region '${r.code || r.id}' harus dipetakan ke label valid.`);
      }
    }
  } else if (question.type === 'simulation') {
    if (!interaction.simulationModel || !Array.isArray(interaction.parameters) || interaction.parameters.length === 0) {
      addError('interaction.parameters', 'MISSING_SIMULATION_PARAMS', 'Simulasi fisika wajib mendefinisikan model dan parameter.');
    }
    if (answerSpec.expectedValue === undefined && !answerSpec.correctOptionIds) {
      addError('answerSpec', 'MISSING_SIMULATION_KEY', 'Simulasi wajib memiliki kunci jawaban observasi.');
    }
  } else if (question.type === 'worked_solution') {
    const rubric = question.scoring?.rubric || answerSpec.rubric || [];
    if (!Array.isArray(rubric) || rubric.length === 0) {
      addError('scoring.rubric', 'MISSING_RUBRIC', 'Soal uraian (worked_solution) wajib memiliki minimal 1 kriteria rubrik.');
    }
  }

  // Scoring checks
  const scoring = question.scoring || {};
  if (!scoring.maxPoints || Number(scoring.maxPoints) <= 0) {
    addError('scoring.maxPoints', 'INVALID_MAX_POINTS', 'Poin maksimum harus lebih besar dari 0.');
  }
  if (question.type === 'worked_solution' && Array.isArray(scoring.rubric) && scoring.rubric.length > 0) {
    const rubricSum = scoring.rubric.reduce((acc, r) => acc + Number(r.maxPoints || 0), 0);
    if (Math.abs(rubricSum - Number(scoring.maxPoints || 0)) > 0.001) {
      addError('scoring.rubric', 'RUBRIC_POINTS_MISMATCH', `Total bobot rubrik (${rubricSum}) tidak sama dengan maxPoints (${scoring.maxPoints}).`);
    }
  }

  // Delivery checks
  const delivery = question.delivery || {};
  const allowedModes = delivery.allowedModes || [];
  for (const mode of allowedModes) {
    if (!ASSESSMENT_MODES.includes(mode)) {
      addError('delivery.allowedModes', 'INVALID_DELIVERY_MODE', `Mode '${mode}' tidak dikenal.`);
    }
  }
  if (allowedModes.includes('formal_exam') && delivery.heartsEnabled === true) {
    addError('delivery.heartsEnabled', 'HEARTS_FORBIDDEN_IN_EXAM', 'Hearts dilarang diaktifkan untuk mode formal_exam.');
  }

  // Governance check
  if (question.governance?.status && !QUESTION_GOVERNANCE_STATUSES.includes(question.governance.status)) {
    addError('governance.status', 'INVALID_GOVERNANCE_STATUS', 'Status governance soal tidak valid.');
  }

  // Non-blocking warnings
  const explanation = question.explanation || {};
  if (!Array.isArray(explanation.steps) || explanation.steps.length === 0) {
    addWarning('explanation.steps', 'MISSING_EXPLANATION', 'Sertakan langkah pembahasan untuk membantu pemahaman siswa.');
  }
  if (!Array.isArray(explanation.hints) || explanation.hints.length === 0) {
    addWarning('explanation.hints', 'MISSING_HINTS', 'Tambahkan minimal 1 petunjuk bertingkat untuk mode latihan.');
  }
  if (!meta.estimatedSeconds) {
    addWarning('metadata.estimatedSeconds', 'MISSING_DURATION', 'Estimasi waktu pengerjaan sebaiknya diisi.');
  }

  return {
    valid: blockingErrors.length === 0,
    blockingErrors,
    warnings,
    fieldErrors
  };
}

/**
 * Strictly allowlisted projection matching contracts/question-student-delivery-v1.schema.json.
 * Never returns answerSpec, scoring, provenance, governance, reviewer notes, or unreleased explanations.
 */
export function toStudentDeliveryDto(rawQuestion, deliveryContext = {}) {
  const q = normalizeLegacyQuestionInput(rawQuestion);
  const mode = deliveryContext.mode || 'practice';
  const isExam = mode === 'formal_exam' || mode === 'tryout';

  // Build student-safe interaction without leaking answers
  const rawInteraction = q.interaction || {};
  const safeInteraction = {};
  if (Array.isArray(rawInteraction.options)) {
    safeInteraction.options = rawInteraction.options.map((opt) => ({
      id: opt.id,
      label: opt.label ?? opt.content ?? ''
    }));
  }
  if (rawInteraction.unit !== undefined) safeInteraction.unit = rawInteraction.unit;
  if (rawInteraction.decimalRule !== undefined) safeInteraction.decimalRule = rawInteraction.decimalRule;
  if (rawInteraction.placeholder !== undefined) safeInteraction.placeholder = rawInteraction.placeholder;
  if (rawInteraction.templateText !== undefined) safeInteraction.templateText = rawInteraction.templateText;
  if (Array.isArray(rawInteraction.blanks)) safeInteraction.blanks = rawInteraction.blanks.map((b) => ({ id: b.id, label: b.label }));
  if (Array.isArray(rawInteraction.leftItems)) safeInteraction.leftItems = rawInteraction.leftItems.map((x) => ({ id: x.id, label: x.label }));
  if (Array.isArray(rawInteraction.rightItems)) safeInteraction.rightItems = rawInteraction.rightItems.map((x) => ({ id: x.id, label: x.label }));
  if (Array.isArray(rawInteraction.items)) safeInteraction.items = rawInteraction.items.map((x) => ({ id: x.id, label: x.label }));
  if (Array.isArray(rawInteraction.draggableItems)) safeInteraction.draggableItems = rawInteraction.draggableItems.map((x) => ({ id: x.id, label: x.label }));
  if (Array.isArray(rawInteraction.dropZones)) safeInteraction.dropZones = rawInteraction.dropZones.map((x) => ({ id: x.id, label: x.label }));
  if (rawInteraction.bounds) safeInteraction.bounds = rawInteraction.bounds;
  if (rawInteraction.variables) safeInteraction.variables = rawInteraction.variables;
  if (rawInteraction.expressionDisplay) safeInteraction.expressionDisplay = rawInteraction.expressionDisplay;
  if (rawInteraction.diagramSvgKind) safeInteraction.diagramSvgKind = rawInteraction.diagramSvgKind;
  if (Array.isArray(rawInteraction.regions)) safeInteraction.regions = rawInteraction.regions.map((r) => ({ id: r.id, code: r.code, x: r.x, y: r.y }));
  if (Array.isArray(rawInteraction.labelBank)) safeInteraction.labelBank = rawInteraction.labelBank.map((l) => ({ id: l.id, label: l.label }));
  if (rawInteraction.simulationModel) safeInteraction.simulationModel = rawInteraction.simulationModel;
  if (Array.isArray(rawInteraction.parameters)) safeInteraction.parameters = rawInteraction.parameters;
  if (rawInteraction.formulaLatex) safeInteraction.formulaLatex = rawInteraction.formulaLatex;
  if (rawInteraction.responseMode) safeInteraction.responseMode = rawInteraction.responseMode;
  if (rawInteraction.minWords !== undefined) safeInteraction.minWords = rawInteraction.minWords;
  if (rawInteraction.legacyAliasFrom) safeInteraction.legacyAliasFrom = rawInteraction.legacyAliasFrom;

  const safeMedia = Array.isArray(q.content?.media)
    ? q.content.media.map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url || m.previewUrl || '',
        altText: m.altText || '',
        caption: m.caption || ''
      }))
    : [];

  const hintsCount = Array.isArray(q.explanation?.hints) ? q.explanation.hints.length : 0;
  const feedbackTiming = isExam
    ? deliveryContext.examFeedbackTiming || 'after_release'
    : q.delivery?.feedbackPolicy === 'after_submission'
      ? 'after_submission'
      : 'immediate';

  return {
    questionId: q.id,
    version: q.version || 1,
    type: q.type,
    content: {
      stem: q.content?.stem || '',
      instruction: q.content?.instruction || '',
      media: safeMedia
    },
    interaction: safeInteraction,
    delivery: {
      hintAvailable: !isExam && hintsCount > 0 && q.delivery?.hintPolicy !== 'disabled',
      feedbackTiming,
      responsePolicy: {
        mode,
        estimatedSeconds: q.metadata?.estimatedSeconds || 60,
        subjectId: q.metadata?.subjectId || null,
        topicId: q.metadata?.topicId || null,
        difficulty: q.metadata?.difficulty || 'medium',
        maxPoints: q.scoring?.maxPoints || 10,
        altText: q.accessibility?.altText || null,
        hintsCount: !isExam ? hintsCount : 0
      }
    }
  };
}

export function createNextQuestionVersion(publishedQuestion, authorId) {
  if (publishedQuestion?.governance?.status !== 'published') {
    const err = new Error('Hanya soal berstatus published yang dapat dibuatkan versi baru.');
    err.code = 'QUESTION_NOT_PUBLISHED';
    throw err;
  }
  const cloned = structuredClone(publishedQuestion);
  cloned.version = Number(publishedQuestion.version || 1) + 1;
  cloned.governance = {
    ...(cloned.governance || {}),
    status: 'draft',
    createdBy: authorId || cloned.governance?.createdBy,
    previousPublishedVersion: publishedQuestion.version,
    reviewedBy: undefined,
    publishedBy: undefined,
    publishedAt: undefined
  };
  return cloned;
}

export function transitionQuestionStatus(question, toStatus, actor = {}) {
  const fromStatus = question?.governance?.status || 'draft';
  if (toStatus === 'published') {
    const validation = validateQuestionAuthoring(question);
    if (!validation.valid) {
      const err = new Error('Soal tidak dapat dipublikasikan karena masih memiliki error validasi pemblokir.');
      err.code = 'VALIDATION_BLOCKING_ERRORS';
      err.details = validation;
      throw err;
    }
  }
  assertTransition('question', fromStatus, toStatus);
  const updated = structuredClone(question);
  updated.governance = {
    ...(updated.governance || {}),
    status: toStatus,
    updatedAt: new Date().toISOString()
  };
  if (toStatus === 'approved' || toStatus === 'validation_failed') {
    updated.governance.reviewedBy = actor.userId || updated.governance.reviewedBy;
  }
  if (toStatus === 'published') {
    updated.governance.publishedBy = actor.userId || updated.governance.publishedBy;
    updated.governance.publishedAt = updated.governance.publishedAt || new Date().toISOString();
  }
  return updated;
}

export function gradeQuestionResponse(rawQuestion, response) {
  const q = normalizeLegacyQuestionInput(rawQuestion);
  const spec = q.answerSpec || {};
  const maxPoints = Number(q.scoring?.maxPoints || 10);
  const method = q.scoring?.method || 'exact_match';
  let correct = false;
  let scoreRatio = 0;
  let pendingManualReview = false;

  if (q.type === 'single_choice') {
    correct = response === (spec.correctOptionIds || [])[0];
    scoreRatio = correct ? 1 : 0;
  } else if (q.type === 'multiple_select') {
    const expected = new Set(spec.correctOptionIds || []);
    const actual = new Set(Array.isArray(response) ? response : []);
    if (expected.size > 0) {
      const hits = [...actual].filter((id) => expected.has(id)).length;
      const wrong = [...actual].filter((id) => !expected.has(id)).length;
      correct = hits === expected.size && wrong === 0;
      if (correct) {
        scoreRatio = 1;
      } else if (method === 'partial_credit') {
        scoreRatio = Math.max(0, (hits - wrong) / expected.size);
      }
    }
  } else if (q.type === 'true_false') {
    correct = response === spec.correctAnswer;
    scoreRatio = correct ? 1 : 0;
  } else if (q.type === 'numeric') {
    const rawNum =
      typeof response === 'object' && response !== null ? response.value : response;
    const rawUnit =
      typeof response === 'object' && response !== null ? response.unit : undefined;
    const parsed = Number(String(rawNum ?? '').trim().replace(',', '.'));
    const tol = Number(spec.tolerance ?? 0.01);
    const valueOk = Number.isFinite(parsed) && Math.abs(parsed - Number(spec.expectedValue)) <= tol;
    const unitOk =
      !spec.unitRequired ||
      !spec.unit ||
      String(rawUnit ?? q.interaction?.unit ?? '').trim().toLowerCase() === String(spec.unit).trim().toLowerCase();
    correct = valueOk && unitOk;
    scoreRatio = correct ? 1 : 0;
  } else if (q.type === 'short_text') {
    const norm = String(response ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
    const accepted = (spec.acceptedAnswers || []).map((a) =>
      String(a).trim().replace(/\s+/g, ' ').toLowerCase()
    );
    correct = Boolean(norm) && accepted.includes(norm);
    scoreRatio = correct ? 1 : 0;
  } else if (q.type === 'fill_blank') {
    const blankDefs = q.interaction?.blanks || [];
    const expectedMap = spec.blanks || {};
    const actualMap = typeof response === 'object' && response !== null ? response : {};
    let hits = 0;
    for (const b of blankDefs) {
      const val = String(actualMap[b.id] ?? '').trim().replace(',', '.').toLowerCase();
      const allowed = (expectedMap[b.id] || []).map((x) =>
        String(x).trim().replace(',', '.').toLowerCase()
      );
      if (val && allowed.includes(val)) hits += 1;
    }
    correct = blankDefs.length > 0 && hits === blankDefs.length;
    scoreRatio = blankDefs.length > 0 ? (method === 'partial_credit' ? hits / blankDefs.length : correct ? 1 : 0) : 0;
  } else if (q.type === 'matching') {
    const expected = spec.correctPairs || {};
    const keys = Object.keys(expected);
    const actual = typeof response === 'object' && response !== null ? response : {};
    const hits = keys.filter((k) => actual[k] === expected[k]).length;
    correct = keys.length > 0 && hits === keys.length;
    scoreRatio = keys.length > 0 ? (method === 'partial_credit' ? hits / keys.length : correct ? 1 : 0) : 0;
  } else if (q.type === 'ordering') {
    const expected = spec.correctOrder || [];
    const actual = Array.isArray(response) ? response : [];
    const hits = expected.filter((id, idx) => actual[idx] === id).length;
    correct = expected.length > 0 && hits === expected.length;
    scoreRatio = expected.length > 0 ? (method === 'partial_credit' ? hits / expected.length : correct ? 1 : 0) : 0;
  } else if (q.type === 'drag_drop') {
    const expected = spec.correctPlacements || {};
    const keys = Object.keys(expected);
    const actual = typeof response === 'object' && response !== null ? response : {};
    const hits = keys.filter((k) => actual[k] === expected[k]).length;
    correct = keys.length > 0 && hits === keys.length;
    scoreRatio = keys.length > 0 ? (method === 'partial_credit' ? hits / keys.length : correct ? 1 : 0) : 0;
  } else if (q.type === 'graph_plot') {
    const targets = spec.targetPoints || [];
    const tol = Number(spec.tolerance ?? 0.5);
    const actualPoints = Array.isArray(response)
      ? response
      : response && typeof response.x === 'number' && typeof response.y === 'number'
        ? [response]
        : [];
    const allMatched =
      targets.length > 0 &&
      actualPoints.length >= targets.length &&
      targets.every((t) =>
        actualPoints.some((p) => Math.hypot(Number(p.x) - Number(t.x), Number(p.y) - Number(t.y)) <= tol)
      );
    correct = allMatched;
    scoreRatio = correct ? 1 : 0;
  } else if (q.type === 'formula_input') {
    const accepted = spec.acceptedExpressions || [];
    const vars = q.interaction?.variables || ['x', 'y', 't', 'a'];
    correct = accepted.some((exp) => areMathExpressionsEquivalent(String(response ?? ''), exp, vars));
    scoreRatio = correct ? 1 : 0;
  } else if (q.type === 'diagram_label') {
    const expected = spec.correctLabels || {};
    const keys = Object.keys(expected);
    const actual = typeof response === 'object' && response !== null ? response : {};
    const hits = keys.filter((k) => actual[k] === expected[k]).length;
    correct = keys.length > 0 && hits === keys.length;
    scoreRatio = keys.length > 0 ? (method === 'partial_credit' ? hits / keys.length : correct ? 1 : 0) : 0;
  } else if (q.type === 'simulation') {
    const val = typeof response === 'object' && response !== null ? response.observation : response;
    if (typeof spec.expectedValue === 'number') {
      const parsed = Number(String(val ?? '').trim().replace(',', '.'));
      const tol = Number(spec.tolerance ?? 0.1);
      correct = Number.isFinite(parsed) && Math.abs(parsed - spec.expectedValue) <= tol;
    } else if (Array.isArray(spec.correctOptionIds)) {
      correct = val === spec.correctOptionIds[0];
    }
    scoreRatio = correct ? 1 : 0;
  } else if (q.type === 'worked_solution') {
    const text = String(typeof response === 'object' && response !== null ? response.text : response ?? '').trim();
    const minWords = Number(q.interaction?.minWords ?? 4);
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const keywords = spec.requiredKeywords || [];
    const kwHits = keywords.filter((kw) => text.toLowerCase().includes(String(kw).toLowerCase())).length;
    const keywordOk = keywords.length === 0 || kwHits >= Math.ceil(keywords.length / 2);
    pendingManualReview = method === 'manual_grading' || method === 'weighted_rubric';
    correct = wordCount >= minWords && keywordOk;
    scoreRatio = pendingManualReview ? (correct ? 0.8 : 0.4) : correct ? 1 : 0;
  }

  return {
    correct,
    scoreRatio: Number(scoreRatio.toFixed(4)),
    earnedPoints: Number((maxPoints * scoreRatio).toFixed(2)),
    maxPoints,
    pendingManualReview
  };
}
