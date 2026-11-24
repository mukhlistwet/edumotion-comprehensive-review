import { DEFAULT_TEMPLATE_CATALOG } from '@edumotion/domain';
import { FIXTURES_V1 } from '../../fixtures/v1/index.js';
import { ApiError } from '../../api/errors.js';

export function createMockStore(initialConfig = {}) {
  let state = null;
  let scenarioOptions = {
    latencyMs: Number(initialConfig.latencyMs ?? 30),
    forceScenario: initialConfig.forceScenario || 'normal',
    clientClockOffsetMs: Number(initialConfig.clientClockOffsetMs ?? 0)
  };
  let idempotencyResults = new Map();
  let currentUserId = initialConfig.initialUserId || 'usr_student_smp_free';

  function initSeed() {
    const f = structuredClone(FIXTURES_V1);
    state = {
      curricula: f.curriculaTaxonomy.curricula,
      gradeLevels: f.curriculaTaxonomy.gradeLevels,
      subjects: f.curriculaTaxonomy.subjects,
      topics: f.curriculaTaxonomy.topics,
      competencies: f.curriculaTaxonomy.competencies,
      tenants: f.personasUsersTenants.tenants,
      personas: f.personasUsersTenants.personas,
      learningPaths: f.learningPathsJourneys.learningPaths,
      chapters: f.learningPathsJourneys.chapters,
      userProgressSeeds: f.learningPathsJourneys.userProgressSeeds,
      templateCatalog: structuredClone(DEFAULT_TEMPLATE_CATALOG),
      questions: f.questionsBank.questions,
      activities: f.activitiesAssessments.activities,
      assessments: f.activitiesAssessments.assessments,
      assessmentSessions: [],
      xpLedger: f.masteryGamification.xpLedger,
      userGamificationMeta: f.masteryGamification.userGamificationMeta,
      competencyEvidence: f.masteryGamification.competencyEvidence,
      spacedRepetitionItems: f.masteryGamification.spacedRepetitionItems,
      achievements: f.masteryGamification.achievements,
      userAchievements: {
        usr_student_smp_free: ['ach_first_step'],
        usr_student_sma_prem: ['ach_first_step', 'ach_chapter_explorer', 'ach_speed_streak', 'ach_physics_voyager'],
        usr_student_sd_family: ['ach_first_step'],
        usr_student_univ: ['ach_first_step', 'ach_chapter_explorer']
      },
      quests: f.masteryGamification.quests,
      leaderboardPool: f.masteryGamification.leaderboardPool,
      activityHistory: f.masteryGamification.activityHistory,
      notifications: f.masteryGamification.notifications,
      aiRuns: f.aiGenerationRuns.runs,
      aiModelPolicies: f.aiGenerationRuns.modelPolicies,
      school: f.schoolPlatformAdmin.school,
      platform: f.schoolPlatformAdmin.platform,
      mediaUploads: [],
      outboxEvents: []
    };
    idempotencyResults = new Map();
  }

  initSeed();

  function getServerNowMs() {
    return Date.now();
  }

  function getClientObservedNowMs() {
    return Date.now() + Number(scenarioOptions.clientClockOffsetMs || 0);
  }

  async function simulateNetwork(options = {}) {
    const delay = options.skipDelay ? 0 : Number(scenarioOptions.latencyMs || 0);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const mode = options.ignoreForcedScenario ? 'normal' : scenarioOptions.forceScenario;
    if (mode === 'server_error') {
      throw new ApiError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Simulasi gangguan server (500). Silakan coba lagi.',
        status: 500,
        correlationId: `sim_${Date.now()}`
      });
    }
    if (mode === 'offline') {
      throw new ApiError({
        code: 'NETWORK_OFFLINE',
        message: 'Perangkat sedang offline. Perubahan akan disimpan ulang saat koneksi kembali.',
        status: 0,
        correlationId: `sim_${Date.now()}`
      });
    }
    if (mode === 'timeout') {
      throw new ApiError({
        code: 'REQUEST_TIMEOUT',
        message: 'Permintaan melewati batas waktu (timeout).',
        status: 408,
        correlationId: `sim_${Date.now()}`
      });
    }
    if (mode === 'unauthorized') {
      throw new ApiError({
        code: 'SESSION_EXPIRED',
        message: 'Sesi autentikasi telah berakhir. Silakan masuk kembali.',
        status: 401,
        correlationId: `sim_${Date.now()}`
      });
    }
    if (mode === 'forbidden') {
      throw new ApiError({
        code: 'FORBIDDEN_ACCESS',
        message: 'Anda tidak memiliki izin untuk mengakses resource ini.',
        status: 403,
        correlationId: `sim_${Date.now()}`
      });
    }
  }

  function getCurrentUser() {
    return state.personas.find((p) => p.id === currentUserId) || null;
  }

  function setCurrentUser(userId) {
    if (userId === null) {
      currentUserId = null;
      return null;
    }
    const found = state.personas.find((p) => p.id === userId);
    if (!found) {
      throw new ApiError({ code: 'USER_NOT_FOUND', message: 'Persona pengguna tidak ditemukan.', status: 404 });
    }
    currentUserId = found.id;
    return structuredClone(found);
  }

  function recordAudit({ actor, action, targetId, tenantId = null, reason = '' }) {
    state.platform.auditLogs.unshift({
      id: `aud_${state.platform.auditLogs.length + 1}`,
      occurredAt: new Date(getServerNowMs()).toISOString(),
      actorId: actor?.id || 'system',
      actorName: actor?.displayName || 'System',
      tenantId,
      action,
      targetId,
      reason
    });
  }

  function emitOutboxEvent(eventName, aggregateType, aggregateId, userId, tenantId, payload = {}) {
    state.outboxEvents.push({
      eventId: `evt_${state.outboxEvents.length + 1}`,
      eventName,
      eventVersion: 1,
      occurredAt: new Date(getServerNowMs()).toISOString(),
      tenantId,
      userId,
      aggregateType,
      aggregateId,
      correlationId: `corr_${Date.now()}`,
      payload
    });
  }

  function withIdempotency(scope, key, fn) {
    if (!key) return fn();
    const composite = `${currentUserId || 'anon'}:${scope}:${key}`;
    if (idempotencyResults.has(composite)) {
      return structuredClone(idempotencyResults.get(composite));
    }
    const result = fn();
    idempotencyResults.set(composite, structuredClone(result));
    return result;
  }

  function ensureUserSeed(userId) {
    if (!state.userProgressSeeds[userId]) {
      const user = state.personas.find((p) => p.id === userId);
      const isPremium = user?.entitlement === 'premium' || user?.entitlement === 'family';
      const unlocks = [
        { templateId: 'adventure', source: 'base', startsAt: '2026-01-01T00:00:00Z', expiresAt: null },
        { templateId: 'board', source: 'base', startsAt: '2026-01-01T00:00:00Z', expiresAt: null },
        { templateId: 'skill', source: 'base', startsAt: '2026-01-01T00:00:00Z', expiresAt: null }
      ];
      if (isPremium) {
        unlocks.push(
          { templateId: 'explore', source: 'premium', startsAt: '2026-01-01T00:00:00Z', expiresAt: null },
          { templateId: 'racing', source: 'premium', startsAt: '2026-01-01T00:00:00Z', expiresAt: null },
          { templateId: 'galaxy', source: 'premium', startsAt: '2026-01-01T00:00:00Z', expiresAt: null }
        );
      }
      state.userProgressSeeds[userId] = {
        preferences: { selectionMode: 'adaptive', preferredTemplateId: 'adventure', pendingTemplateId: null },
        unlocks,
        chapterSnapshots: {},
        completedNodeIds: [],
        inProgressNodeIds: []
      };
    }
    return state.userProgressSeeds[userId];
  }

  return {
    get state() {
      return state;
    },
    getScenarioOptions: () => ({ ...scenarioOptions }),
    setScenarioOptions: (patch) => {
      scenarioOptions = { ...scenarioOptions, ...patch };
      return { ...scenarioOptions };
    },
    reset: () => {
      initSeed();
      scenarioOptions = { latencyMs: 30, forceScenario: 'normal', clientClockOffsetMs: 0 };
      currentUserId = initialConfig.initialUserId || 'usr_student_smp_free';
    },
    getServerNowMs,
    getClientObservedNowMs,
    simulateNetwork,
    getCurrentUser,
    setCurrentUser,
    recordAudit,
    emitOutboxEvent,
    withIdempotency,
    ensureUserSeed
  };
}
