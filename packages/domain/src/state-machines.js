const CHAPTER_TRANSITIONS = Object.freeze({
  planned: ['available', 'archived'],
  available: ['in_progress', 'archived'],
  in_progress: ['completed', 'archived'],
  completed: ['archived'],
  archived: []
});

const JOURNEY_NODE_TRANSITIONS = Object.freeze({
  locked: ['available'],
  available: ['in_progress', 'completed'],
  in_progress: ['completed'],
  completed: []
});

const QUESTION_TRANSITIONS = Object.freeze({
  draft: ['validation_failed', 'in_review', 'archived'],
  validation_failed: ['draft', 'in_review', 'archived'],
  in_review: ['draft', 'validation_failed', 'approved', 'archived'],
  approved: ['published', 'draft', 'archived'],
  published: ['archived'],
  archived: []
});

const AI_ITEM_TRANSITIONS = Object.freeze({
  queued: ['generating', 'failed', 'rejected'],
  generating: ['validating', 'failed', 'rejected'],
  validating: ['needs_review', 'failed', 'rejected'],
  needs_review: ['accepted', 'rejected', 'queued'],
  accepted: [],
  rejected: ['queued'],
  failed: ['queued', 'rejected']
});

const ASSESSMENT_SESSION_TRANSITIONS = Object.freeze({
  created: ['started', 'cancelled', 'expired'],
  started: ['submitted', 'expired', 'cancelled', 'invalidated'],
  submitted: ['grading', 'graded', 'invalidated'],
  grading: ['graded', 'invalidated'],
  graded: ['invalidated'],
  expired: [],
  cancelled: [],
  invalidated: []
});

const TRANSITION_TABLES = Object.freeze({
  chapter: CHAPTER_TRANSITIONS,
  journeyNode: JOURNEY_NODE_TRANSITIONS,
  question: QUESTION_TRANSITIONS,
  aiGenerationItem: AI_ITEM_TRANSITIONS,
  assessmentSession: ASSESSMENT_SESSION_TRANSITIONS
});

export function canTransition(machineName, fromState, toState) {
  const table = TRANSITION_TABLES[machineName];
  if (!table) return false;
  const allowed = table[fromState];
  if (!allowed) return false;
  return allowed.includes(toState);
}

export function assertTransition(machineName, fromState, toState) {
  if (!canTransition(machineName, fromState, toState)) {
    const error = new Error(
      `Transisi status tidak valid pada ${machineName}: '${fromState}' -> '${toState}'.`
    );
    error.code = 'INVALID_STATE_TRANSITION';
    error.details = { machineName, fromState, toState };
    throw error;
  }
  return toState;
}

export function getAllowedTransitions(machineName, fromState) {
  const table = TRANSITION_TABLES[machineName];
  if (!table || !table[fromState]) return [];
  return [...table[fromState]];
}
