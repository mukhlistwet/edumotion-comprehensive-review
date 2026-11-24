import { JOURNEY_SELECTION_MODES, JOURNEY_TEMPLATE_IDS } from './enums.js';

export const DEFAULT_TEMPLATE_CATALOG = Object.freeze([
  {
    id: 'adventure',
    version: '1.0.0',
    name: 'Adventure Journey',
    base: true,
    enabled: true,
    unlock: ['base'],
    recommendedLevels: ['SD', 'SMP'],
    subjects: ['mathematics', 'physics'],
    preferredActivityMix: ['lesson', 'practice', 'challenge'],
    motionIntensity: 'moderate',
    priorityWeight: 50,
    renderer: 'AdventureRenderer',
    worldTitle: 'Number Forest',
    eyebrow: 'Alam Hijau Pengetahuan',
    description: 'Ikuti jalan setapak, selesaikan misi di tiap pos, dan taklukkan puncak chapter.'
  },
  {
    id: 'board',
    version: '1.0.0',
    name: 'Board Game',
    base: true,
    enabled: true,
    unlock: ['base'],
    recommendedLevels: ['SD', 'SMP'],
    subjects: ['mathematics', 'physics'],
    preferredActivityMix: ['practice', 'challenge'],
    motionIntensity: 'low',
    priorityWeight: 45,
    renderer: 'BoardGameRenderer',
    worldTitle: 'Math Quest Board',
    eyebrow: 'Petak Tantangan',
    description: 'Lompati petak misi secara berurutan dengan langkah jelas dan ramah aksesibilitas.'
  },
  {
    id: 'explore',
    version: '1.0.0',
    name: 'World Exploration',
    base: false,
    enabled: true,
    unlock: ['achievement', 'premium'],
    achievementId: 'ach_chapter_explorer',
    entitlementKey: 'journey.template.explore',
    recommendedLevels: ['SD', 'SMP', 'SMA', 'UNIVERSITY'],
    subjects: ['mathematics', 'physics'],
    preferredActivityMix: ['lesson', 'simulation', 'practice'],
    motionIntensity: 'moderate',
    priorityWeight: 40,
    renderer: 'WorldExplorationRenderer',
    worldTitle: 'The Lost Islands',
    eyebrow: 'Ekspedisi Kepulauan',
    description: 'Jelajahi pulau-pulau konsep dan ungkap rahasia di setiap pos pemeriksaan.'
  },
  {
    id: 'skill',
    version: '1.0.0',
    name: 'Skill Tree',
    base: true,
    enabled: true,
    unlock: ['base'],
    recommendedLevels: ['SMP', 'SMA', 'UNIVERSITY'],
    subjects: ['mathematics', 'physics'],
    preferredActivityMix: ['lesson', 'practice', 'assessment'],
    motionIntensity: 'low',
    priorityWeight: 48,
    renderer: 'SkillTreeRenderer',
    worldTitle: 'Mastery Constellation',
    eyebrow: 'Pohon Keahlian',
    description: 'Bangun fondasi kompetensi secara terstruktur menuju penguasaan penuh.'
  },
  {
    id: 'racing',
    version: '1.0.0',
    name: 'Racing Track',
    base: false,
    enabled: true,
    unlock: ['achievement', 'premium'],
    achievementId: 'ach_speed_streak',
    entitlementKey: 'journey.template.racing',
    recommendedLevels: ['SD', 'SMP', 'SMA', 'UNIVERSITY'],
    subjects: ['mathematics', 'physics'],
    preferredActivityMix: ['challenge', 'practice'],
    motionIntensity: 'high',
    priorityWeight: 38,
    renderer: 'RacingTrackRenderer',
    worldTitle: 'Formula Circuit',
    eyebrow: 'Sirkuit Belajar',
    description: 'Lewati setiap sektor lintasan dan capai bendera finis di tantangan puncak.'
  },
  {
    id: 'galaxy',
    version: '1.0.0',
    name: 'Galaxy Mission',
    base: false,
    enabled: true,
    unlock: ['achievement', 'premium'],
    achievementId: 'ach_physics_voyager',
    entitlementKey: 'journey.template.galaxy',
    recommendedLevels: ['SMP', 'SMA', 'UNIVERSITY'],
    subjects: ['physics', 'mathematics'],
    preferredActivityMix: ['simulation', 'challenge', 'assessment'],
    motionIntensity: 'moderate',
    priorityWeight: 44,
    renderer: 'GalaxyMissionRenderer',
    worldTitle: 'Equation Galaxy',
    eyebrow: 'Misi Antariksa',
    description: 'Navigasi lintasan orbit antarplanet dan selesaikan eksperimen luar angkasa.'
  }
]);

function hashSeed(input) {
  let hash = 2166136261;
  const text = String(input ?? 'edumotion');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function isTemplateUnlocked(template, unlockContext = {}) {
  if (!template) return false;
  if (template.base) return true;
  const unlockedIds = unlockContext.unlockedTemplateIds || [];
  if (unlockedIds.includes(template.id)) return true;
  const grants = unlockContext.grants || [];
  const now = unlockContext.now ? new Date(unlockContext.now).getTime() : Date.now();
  return grants.some((grant) => {
    if (grant.templateId !== template.id) return false;
    if (grant.expiresAt && new Date(grant.expiresAt).getTime() < now) return false;
    return true;
  });
}

export function isTemplateCompatible(template, chapterContext = {}) {
  if (!template || template.enabled === false) return false;
  const subject = chapterContext.subjectCode || chapterContext.subject || 'mathematics';
  if (Array.isArray(template.subjects) && template.subjects.length > 0 && !template.subjects.includes(subject)) {
    return false;
  }
  if (Array.isArray(template.excludedLevels) && chapterContext.educationLevel) {
    if (template.excludedLevels.includes(chapterContext.educationLevel)) return false;
  }
  if (chapterContext.accessibility?.reducedMotion && template.motionRequired === true) {
    return false;
  }
  return true;
}

export function evaluateTemplateEligibility({
  template,
  chapterContext = {},
  unlockContext = {}
}) {
  if (!template || !JOURNEY_TEMPLATE_IDS.includes(template.id)) {
    return { eligible: false, reasonCode: 'TEMPLATE_NOT_FOUND', message: 'Template tidak ditemukan.' };
  }
  if (template.enabled === false) {
    return { eligible: false, reasonCode: 'TEMPLATE_DISABLED', message: 'Template sedang dinonaktifkan untuk chapter baru.' };
  }
  if (!isTemplateUnlocked(template, unlockContext)) {
    return { eligible: false, reasonCode: 'TEMPLATE_LOCKED', message: 'Template ini belum terbuka. Selesaikan achievement atau aktifkan paket Premium.' };
  }
  if (!isTemplateCompatible(template, chapterContext)) {
    return { eligible: false, reasonCode: 'TEMPLATE_INCOMPATIBLE', message: 'Template tidak kompatibel dengan konteks chapter ini.' };
  }
  return { eligible: true, reasonCode: 'ELIGIBLE', message: 'Template tersedia untuk dipilih.' };
}

export function scoreAdaptiveTemplate(template, chapterContext = {}, preferences = {}) {
  let score = Number(template.priorityWeight || 0);
  const level = chapterContext.educationLevel || 'SMP';
  const subject = chapterContext.subjectCode || 'mathematics';
  const dominantMix = chapterContext.dominantActivityKind || 'practice';

  if (Array.isArray(template.recommendedLevels) && template.recommendedLevels.includes(level)) {
    score += 40;
  }
  if (Array.isArray(template.subjects) && template.subjects[0] === subject) {
    score += 20;
  } else if (Array.isArray(template.subjects) && template.subjects.includes(subject)) {
    score += 10;
  }
  if (Array.isArray(template.preferredActivityMix) && template.preferredActivityMix.includes(dominantMix)) {
    score += 15;
  }
  if (chapterContext.accessibility?.reducedMotion && template.motionIntensity === 'low') {
    score += 18;
  } else if (chapterContext.accessibility?.reducedMotion && template.motionIntensity === 'high') {
    score -= 20;
  }
  if (preferences.preferredTemplateId && preferences.preferredTemplateId === template.id) {
    score += 12;
  }
  if (chapterContext.previousTemplateId && chapterContext.previousTemplateId === template.id) {
    score -= 6;
  }
  return score;
}

export function resolveChapterTemplate({
  catalog = DEFAULT_TEMPLATE_CATALOG,
  chapterContext = {},
  unlockContext = {},
  preferences = {},
  seedInput = null
}) {
  const mode = JOURNEY_SELECTION_MODES.includes(preferences.selectionMode)
    ? preferences.selectionMode
    : 'adaptive';

  const eligible = catalog.filter((tpl) =>
    evaluateTemplateEligibility({ template: tpl, chapterContext, unlockContext }).eligible
  );

  const fallbackTemplate =
    eligible.find((t) => t.id === 'adventure') ||
    eligible[0] ||
    catalog.find((t) => t.id === 'adventure') ||
    catalog[0];

  const pickAdaptive = (reasonPrefix = 'ADAPTIVE_SCORE') => {
    const pool = eligible.length > 0 ? eligible : [fallbackTemplate];
    const scored = pool.map((tpl) => ({
      template: tpl,
      score: scoreAdaptiveTemplate(tpl, chapterContext, preferences)
    }));
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const pwDiff = Number(b.template.priorityWeight || 0) - Number(a.template.priorityWeight || 0);
      if (pwDiff !== 0) return pwDiff;
      return String(a.template.id).localeCompare(String(b.template.id));
    });
    const chosen = scored[0].template;
    return {
      template: chosen,
      selectionMode: 'adaptive',
      selectionReason: {
        policy: reasonPrefix,
        score: scored[0].score,
        level: chapterContext.educationLevel || 'SMP',
        subject: chapterContext.subjectCode || 'mathematics'
      },
      consumedPending: false,
      fallbackNotice: null
    };
  };

  if (mode === 'personal') {
    const requestedId = preferences.pendingTemplateId || preferences.preferredTemplateId;
    const requestedTpl = catalog.find((t) => t.id === requestedId);
    const check = evaluateTemplateEligibility({
      template: requestedTpl,
      chapterContext,
      unlockContext
    });
    if (check.eligible) {
      return {
        template: requestedTpl,
        selectionMode: 'personal',
        selectionReason: {
          policy: preferences.pendingTemplateId ? 'PENDING_PREFERENCE_APPLIED' : 'PERSONAL_PREFERENCE_APPLIED',
          requestedTemplateId: requestedId
        },
        consumedPending: Boolean(preferences.pendingTemplateId),
        fallbackNotice: null
      };
    }
    const adaptiveFallback = pickAdaptive('ADAPTIVE_FALLBACK_FROM_PERSONAL');
    return {
      ...adaptiveFallback,
      selectionReason: {
        ...adaptiveFallback.selectionReason,
        fallbackFrom: requestedId || null,
        fallbackReasonCode: check.reasonCode
      },
      consumedPending: Boolean(preferences.pendingTemplateId),
      fallbackNotice: `Template pilihan (${requestedId || '-'}) tidak tersedia (${check.message}). Sistem menerapkan mode Adaptive.`
    };
  }

  if (mode === 'random') {
    const pool = eligible.length > 0 ? eligible : [fallbackTemplate];
    const withoutPrevious =
      pool.length > 1 && chapterContext.previousTemplateId
        ? pool.filter((t) => t.id !== chapterContext.previousTemplateId)
        : pool;

    const sortedPool = [...withoutPrevious].sort((a, b) => a.id.localeCompare(b.id));
    const seed = seedInput || `${chapterContext.userId || 'anon'}:${chapterContext.chapterId || 'ch1'}:${chapterContext.sequence || 1}`;
    const index = hashSeed(seed) % sortedPool.length;
    const chosen = sortedPool[index];

    return {
      template: chosen,
      selectionMode: 'random',
      selectionReason: {
        policy: pool.length === 1 ? 'ONLY_ONE_ELIGIBLE_CANDIDATE' : 'DETERMINISTIC_CHAPTER_RANDOM',
        excludedPreviousTemplateId: pool.length > 1 ? chapterContext.previousTemplateId || null : null,
        candidateCount: sortedPool.length
      },
      consumedPending: false,
      fallbackNotice:
        pool.length === 1
          ? 'Hanya ada 1 template kompatibel yang terbuka saat ini, sehingga template tersebut digunakan kembali.'
          : null
    };
  }

  return pickAdaptive('ADAPTIVE_SCORE');
}

export function buildCanonicalJourneyViewModel({
  journeyId,
  pathId,
  chapter,
  snapshot,
  nodes = [],
  accessibility = {}
}) {
  const completedNodes = nodes.filter((n) => n.status === 'completed').length;
  const totalNodes = nodes.length;
  const currentNode =
    nodes.find((n) => n.status === 'in_progress') ||
    nodes.find((n) => n.status === 'available') ||
    null;

  return {
    journeyId,
    pathId,
    chapter: {
      id: chapter.id,
      sequence: chapter.sequence,
      title: chapter.title,
      status: chapter.status === 'planned' ? 'available' : chapter.status,
      startedAt: chapter.startedAt || null
    },
    template: {
      id: snapshot.templateId,
      version: snapshot.templateVersion || '1.0.0',
      selectionMode: snapshot.selectionMode || 'adaptive',
      layoutConfig: snapshot.layoutConfig || {},
      selectionReason: snapshot.selectionReason || {}
    },
    nodes: nodes.map((node) => ({
      id: node.id,
      sequence: node.sequence,
      kind: node.kind,
      status: node.status,
      title: node.title,
      activityIds: node.activityIds || [],
      prerequisiteNodeIds: node.prerequisiteNodeIds || [],
      rewardPreview: node.rewardPreview || { xp: 50 },
      description: node.description || '',
      masteryAnnotation: node.masteryAnnotation || null,
      remedialRecommended: Boolean(node.remedialRecommended),
      levelMilestoneBadge: node.levelMilestoneBadge ?? null
    })),
    progress: {
      completedNodes,
      totalNodes,
      completionRatio: totalNodes > 0 ? Number((completedNodes / totalNodes).toFixed(4)) : 0,
      currentNodeId: currentNode ? currentNode.id : null
    },
    accessibility: {
      reducedMotion: Boolean(accessibility.reducedMotion),
      highContrast: Boolean(accessibility.highContrast),
      textScale: Number(accessibility.textScale || 1)
    }
  };
}

export function validateNodePrerequisites(node, allNodes = []) {
  const prereqs = node.prerequisiteNodeIds || [];
  const unmet = prereqs.filter((pid) => {
    const found = allNodes.find((n) => n.id === pid);
    return !found || found.status !== 'completed';
  });
  return {
    met: unmet.length === 0,
    unmetNodeIds: unmet
  };
}
