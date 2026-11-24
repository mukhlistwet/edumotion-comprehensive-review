import { assertTransition } from './state-machines.js';
import { gradeQuestionResponse, toStudentDeliveryDto } from './question-engine.js';

export function validateAssessmentConfig(config) {
  const errors = [];
  if (config?.mode === 'formal_exam' || config?.mode === 'tryout') {
    if (config?.heartsEnabled === true) {
      errors.push({
        field: 'heartsEnabled',
        code: 'HEARTS_PROHIBITED_IN_FORMAL_EXAM',
        message: 'Hearts dilarang pada tryout, UTS, UAS, dan ujian formal.'
      });
    }
    if (config?.xpAffectsGrade === true) {
      errors.push({
        field: 'xpAffectsGrade',
        code: 'XP_CANNOT_AFFECT_GRADE',
        message: 'XP tidak boleh memengaruhi nilai akademik ujian.'
      });
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Computes remaining seconds using server-authoritative clock (ignores client clock skew).
 */
export function computeRemainingExamSeconds({ expiresAt, serverNowMs }) {
  const expMs = new Date(expiresAt).getTime();
  const nowMs = Number.isFinite(serverNowMs) ? serverNowMs : Date.now();
  return Math.max(0, Math.floor((expMs - nowMs) / 1000));
}

export function isSessionExpired({ expiresAt, serverNowMs }) {
  return computeRemainingExamSeconds({ expiresAt, serverNowMs }) <= 0;
}

export function buildImmutableExamSnapshots(questionRecords = [], assessmentMode = 'formal_exam') {
  return questionRecords.map((q, idx) => ({
    snapshotId: `snap_${q.id}_v${q.version || 1}_${idx + 1}`,
    sequence: idx + 1,
    questionId: q.id,
    questionVersion: q.version || 1,
    points: Number(q.scoring?.maxPoints || 10),
    deliveryDto: toStudentDeliveryDto(q, {
      mode: assessmentMode,
      examFeedbackTiming: 'after_release'
    }),
    authoringSnapshot: structuredClone(q)
  }));
}

export function gradeAssessmentSession({ session, snapshots = [], responses = {}, releaseAt = null, serverNowMs }) {
  const nowMs = Number.isFinite(serverNowMs) ? serverNowMs : Date.now();
  const isReleased = !releaseAt || nowMs >= new Date(releaseAt).getTime();

  let totalScore = 0;
  let maxScore = 0;
  let pendingManualCount = 0;

  const itemResults = snapshots.map((snap) => {
    const resp = responses[snap.snapshotId]?.response;
    const maxPts = Number(snap.points || snap.authoringSnapshot?.scoring?.maxPoints || 10);
    maxScore += maxPts;

    const graded = gradeQuestionResponse(
      {
        ...snap.authoringSnapshot,
        scoring: { ...(snap.authoringSnapshot?.scoring || {}), maxPoints: maxPts }
      },
      resp
    );

    totalScore += graded.earnedPoints;
    if (graded.pendingManualReview) pendingManualCount += 1;

    return {
      snapshotId: snap.snapshotId,
      questionId: snap.questionId,
      sequence: snap.sequence,
      earnedPoints: graded.earnedPoints,
      maxPoints: maxPts,
      correct: graded.correct,
      pendingManualReview: graded.pendingManualReview,
      // Strict release policy: withhold explanations and answer feedback until releaseAt
      explanation: isReleased ? snap.authoringSnapshot?.explanation || null : null
    };
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    sessionId: session.id,
    assessmentId: session.assessmentId,
    status: pendingManualCount > 0 ? 'grading' : 'graded',
    academicScore: Number(totalScore.toFixed(2)),
    maxScore,
    percentage,
    xpAwardedForParticipation: 0,
    xpAffectsAcademicScore: false,
    resultsReleased: isReleased,
    releaseAt,
    pendingManualCount,
    items: isReleased ? itemResults : itemResults.map(({ explanation: _e, correct: _c, ...rest }) => rest)
  };
}

export function transitionAssessmentSession(session, toStatus) {
  assertTransition('assessmentSession', session.status, toStatus);
  return {
    ...session,
    status: toStatus
  };
}
