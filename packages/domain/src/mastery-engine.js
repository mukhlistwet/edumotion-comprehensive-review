export const SPACED_REPETITION_BASE_INTERVALS_DAYS = Object.freeze([1, 3, 7, 14, 30]);

export const MASTERY_BANDS = Object.freeze([
  { id: 'weak', label: 'Perlu Penguatan', min: 0, max: 39, remedialRecommended: true },
  { id: 'developing', label: 'Berkembang', min: 40, max: 59, remedialRecommended: true },
  { id: 'proficient', label: 'Cakap', min: 60, max: 79, remedialRecommended: false },
  { id: 'mastered', label: 'Dikuasai', min: 80, max: 100, remedialRecommended: false }
]);

const DIFFICULTY_WEIGHT = Object.freeze({
  very_easy: 0.75,
  easy: 0.85,
  medium: 1.0,
  hard: 1.15,
  very_hard: 1.25
});

export function getMasteryBand(score) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(score || 0))));
  return (
    MASTERY_BANDS.find((b) => clamped >= b.min && clamped <= b.max) ||
    MASTERY_BANDS[0]
  );
}

/**
 * Computes competency mastery (0-100) purely from learning evidence — never from XP.
 * Prevents trivial evidence inflation when repeating identical question versions.
 */
export function computeCompetencyMasteryFromEvidence(evidenceList = []) {
  if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
    return {
      score: 0,
      confidence: 0,
      evidenceCount: 0,
      distinctQuestionCount: 0,
      band: getMasteryBand(0),
      remedialRecommended: false
    };
  }

  const seenQuestionVersions = new Map();
  let weightedCorrect = 0;
  let totalWeight = 0;

  // Sort chronological oldest -> newest so recency weight increases toward recent attempts
  const sorted = [...evidenceList].sort(
    (a, b) => new Date(a.occurredAt || 0).getTime() - new Date(b.occurredAt || 0).getTime()
  );

  sorted.forEach((ev, index) => {
    const qKey = `${ev.questionId || ev.attemptId}:${ev.questionVersion || 1}`;
    const repeatCount = seenQuestionVersions.get(qKey) || 0;
    seenQuestionVersions.set(qKey, repeatCount + 1);

    // Anti-farming decay: repeated attempts on identical question version carry sharply reduced weight
    const repeatDecay = repeatCount === 0 ? 1 : Math.pow(0.25, repeatCount);
    const diffWeight = DIFFICULTY_WEIGHT[ev.difficulty] || 1.0;
    const hintPenalty = ev.hintUsed ? 0.82 : 1.0;
    const recencyWeight = 0.7 + (0.6 * (index + 1)) / sorted.length;

    const effectiveWeight = repeatDecay * diffWeight * recencyWeight;
    const correctness = typeof ev.correctness === 'number' ? ev.correctness : ev.correct ? 1 : 0;

    weightedCorrect += correctness * hintPenalty * effectiveWeight;
    totalWeight += effectiveWeight;
  });

  const rawScore = totalWeight > 0 ? (weightedCorrect / totalWeight) * 100 : 0;
  const distinctQuestionCount = seenQuestionVersions.size;
  const confidence = Math.min(1, Number((distinctQuestionCount / 5).toFixed(2)));
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const band = getMasteryBand(score);

  return {
    score,
    confidence,
    evidenceCount: evidenceList.length,
    distinctQuestionCount,
    band,
    remedialRecommended: evidenceList.length >= 2 && score < 60
  };
}

export function computeNextSpacedRepetitionSchedule({
  currentStageIndex = 0,
  masteryScore = 60,
  wasCorrect = true,
  reviewedAt = new Date().toISOString()
}) {
  let nextStage = Number(currentStageIndex || 0);
  if (!wasCorrect || masteryScore < 50) {
    nextStage = 0;
  } else if (masteryScore >= 85 && wasCorrect) {
    nextStage = Math.min(SPACED_REPETITION_BASE_INTERVALS_DAYS.length - 1, nextStage + 1);
  } else {
    nextStage = Math.min(SPACED_REPETITION_BASE_INTERVALS_DAYS.length - 1, nextStage + 1);
  }

  const intervalDays = SPACED_REPETITION_BASE_INTERVALS_DAYS[nextStage];
  const nextDue = new Date(new Date(reviewedAt).getTime() + intervalDays * 86400 * 1000).toISOString();

  return {
    stageIndex: nextStage,
    intervalDays,
    nextReviewAt: nextDue,
    baseIntervals: [...SPACED_REPETITION_BASE_INTERVALS_DAYS]
  };
}
