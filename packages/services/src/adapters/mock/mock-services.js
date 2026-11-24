import {
  AI_PIPELINE_STAGES,
  PERMISSIONS,
  ROLES,
  appendXpLedgerEntry,
  buildCanonicalJourneyViewModel,
  buildImmutableExamSnapshots,
  canAccessClassResource,
  canAccessLinkedStudent,
  canAccessTenantResource,
  computeCompetencyMasteryFromEvidence,
  computeNextSpacedRepetitionSchedule,
  computeRemainingExamSeconds,
  computeXpBalance,
  createNextQuestionVersion,
  evaluateTemplateEligibility,
  getPlayerRankFromXp,
  gradeAssessmentSession,
  gradeQuestionResponse,
  hasPermission,
  isSessionExpired,
  normalizeLegacyQuestionInput,
  projectLeaderboardEntry,
  promoteGeneratedItemToDraft,
  resolveChapterTemplate,
  shouldUseHearts,
  toStudentDeliveryDto,
  transitionAssessmentSession,
  transitionQuestionStatus,
  validateGenerationBrief,
  validateNodePrerequisites,
  validateQuestionAuthoring,
  verifyGeneratedItemDeterministic
} from '@edumotion/domain';
import { ApiError } from '../../api/errors.js';

function paginate(items, { page = 1, pageSize = 20 } = {}) {
  const safePage = Math.max(1, Number(page));
  const safeSize = Math.max(1, Number(pageSize));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    pagination: {
      page: safePage,
      pageSize: safeSize,
      totalItems,
      totalPages
    }
  };
}

export function createMockServices(store, tokenManager) {
  function requireAuth() {
    const user = store.getCurrentUser();
    if (!user) {
      throw new ApiError({
        code: 'UNAUTHORIZED',
        message: 'Silakan masuk terlebih dahulu untuk melanjutkan.',
        status: 401
      });
    }
    return user;
  }

  function requirePerm(perm) {
    const user = requireAuth();
    if (!hasPermission(user, perm, store.state.school.customRoles)) {
      throw new ApiError({
        code: 'FORBIDDEN',
        message: `Peran '${user.role}' tidak memiliki izin '${perm}'.`,
        status: 403
      });
    }
    return user;
  }

  function buildStudentJourneySnapshot(user, chapter) {
    const seed = store.ensureUserSeed(user.id);
    if (seed.chapterSnapshots[chapter.id]) {
      return seed.chapterSnapshots[chapter.id];
    }
    const resolved = resolveChapterTemplate({
      catalog: store.state.templateCatalog,
      chapterContext: {
        userId: user.id,
        chapterId: chapter.id,
        sequence: chapter.sequence,
        subjectCode: chapter.subjectCode,
        educationLevel: chapter.educationLevel,
        dominantActivityKind: chapter.dominantActivityKind
      },
      unlockContext: {
        grants: seed.unlocks,
        now: new Date(store.getServerNowMs()).toISOString()
      },
      preferences: seed.preferences
    });
    const snapshot = {
      templateId: resolved.template.id,
      templateVersion: resolved.template.version,
      selectionMode: resolved.selectionMode,
      selectionReason: resolved.selectionReason,
      layoutConfig: { theme: resolved.template.id }
    };
    seed.chapterSnapshots[chapter.id] = snapshot;
    if (resolved.consumedPending) {
      seed.preferences.pendingTemplateId = null;
    }
    return snapshot;
  }

  function computeNodeStatesForUser(userId, chapter) {
    const seed = store.ensureUserSeed(userId);
    const completedSet = new Set(seed.completedNodeIds);
    const inProgressSet = new Set(seed.inProgressNodeIds);
    const ordered = [...chapter.nodes].sort((a, b) => a.sequence - b.sequence);
    const rawNodes = ordered.map((n) => ({ ...n, status: 'locked' }));

    for (const node of rawNodes) {
      if (completedSet.has(node.id)) {
        node.status = 'completed';
      } else {
        const prereq = validateNodePrerequisites(node, rawNodes);
        if (prereq.met) {
          node.status = inProgressSet.has(node.id) ? 'in_progress' : 'available';
        } else {
          node.status = 'locked';
        }
      }
    }
    return rawNodes;
  }

  const auth = {
    async listPersonas() {
      await store.simulateNetwork({ skipDelay: true, ignoreForcedScenario: true });
      return structuredClone(store.state.personas);
    },
    async getSession() {
      await store.simulateNetwork();
      const user = store.getCurrentUser();
      if (!user) return { authenticated: false, user: null };
      return { authenticated: true, user: structuredClone(user) };
    },
    async loginWithCredentials({ email, password }) {
      await store.simulateNetwork();
      const fieldErrors = {};
      if (!email || !String(email).includes('@')) {
        fieldErrors.email = 'Masukkan alamat email yang valid.';
      }
      if (!password || String(password).length < 6) {
        fieldErrors.password = 'Kata sandi minimal 6 karakter.';
      }
      if (Object.keys(fieldErrors).length > 0) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: 'Periksa kembali kolom masuk.',
          status: 422,
          fieldErrors
        });
      }
      const found = store.state.personas.find(
        (p) => p.email.toLowerCase() === String(email).trim().toLowerCase()
      );
      if (!found) {
        throw new ApiError({
          code: 'INVALID_CREDENTIALS',
          message: 'Email tidak ditemukan pada akun demo terdaftar.',
          status: 401
        });
      }
      store.setCurrentUser(found.id);
      const tokens = {
        accessToken: `mock-access-${found.id}`,
        refreshToken: `mock-refresh-${found.id}`,
        expiresAt: new Date(store.getServerNowMs() + 3600000).toISOString()
      };
      if (tokenManager) {
        await tokenManager.setTokens(tokens);
      }
      return { user: structuredClone(found), tokens };
    },
    async loginAsPersona(userId) {
      await store.simulateNetwork({ skipDelay: true });
      const user = store.setCurrentUser(userId);
      const tokens = {
        accessToken: `mock-access-${user.id}`,
        refreshToken: `mock-refresh-${user.id}`,
        expiresAt: new Date(store.getServerNowMs() + 3600000).toISOString()
      };
      if (tokenManager) {
        await tokenManager.setTokens(tokens);
      }
      return { user, tokens };
    },
    async refreshSession() {
      await store.simulateNetwork({ skipDelay: true });
      const user = requireAuth();
      const tokens = {
        accessToken: `mock-access-${user.id}`,
        refreshToken: `mock-refresh-${user.id}`,
        expiresAt: new Date(store.getServerNowMs() + 3600000).toISOString()
      };
      if (tokenManager) {
        await tokenManager.setTokens(tokens);
      }
      return { user: structuredClone(user), tokens };
    },
    async register({ displayName, email, password, role = 'student', educationLevel = 'SMP', curriculumId = 'cur_merdeka' }) {
      await store.simulateNetwork();
      const fieldErrors = {};
      if (!displayName || String(displayName).trim().length < 2) {
        fieldErrors.displayName = 'Nama lengkap minimal 2 karakter.';
      }
      if (!email || !String(email).includes('@')) {
        fieldErrors.email = 'Format email tidak valid.';
      }
      if (!password || String(password).length < 6) {
        fieldErrors.password = 'Kata sandi minimal 6 karakter.';
      }
      if (store.state.personas.some((p) => p.email.toLowerCase() === String(email).trim().toLowerCase())) {
        fieldErrors.email = 'Email sudah terdaftar.';
      }
      if (Object.keys(fieldErrors).length > 0) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: 'Data pendaftaran belum valid.',
          status: 422,
          fieldErrors
        });
      }
      const newUser = {
        id: `usr_reg_${store.state.personas.length + 1}`,
        email: String(email).trim(),
        displayName: String(displayName).trim(),
        initials: String(displayName).trim().slice(0, 2).toUpperCase(),
        role,
        tenantId: null,
        educationLevel,
        curriculumId,
        gradeLevelId: educationLevel === 'SMA' ? 'grade_sma_10' : educationLevel === 'SD' ? 'grade_sd_5' : 'grade_smp_8',
        entitlement: 'freemium',
        isMinor: educationLevel !== 'UNIVERSITY' && role === 'student',
        privacyOptInPublicName: false,
        title: `${displayName} · Baru`
      };
      store.state.personas.push(newUser);
      store.state.userGamificationMeta[newUser.id] = {
        streakDays: 1,
        bestStreak: 1,
        hearts: 5,
        maxHearts: 5,
        gems: 50,
        dailyXpTarget: 30,
        dailyXpEarned: 0
      };
      store.setCurrentUser(newUser.id);
      const tokens = {
        accessToken: `mock-access-${newUser.id}`,
        refreshToken: `mock-refresh-${newUser.id}`,
        expiresAt: new Date(store.getServerNowMs() + 3600000).toISOString()
      };
      if (tokenManager) await tokenManager.setTokens(tokens);
      return { user: structuredClone(newUser), tokens };
    },
    async requestPasswordReset({ email }) {
      await store.simulateNetwork();
      if (!email || !String(email).includes('@')) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: 'Masukkan alamat email yang valid.',
          status: 422,
          fieldErrors: { email: 'Format email tidak valid.' }
        });
      }
      return { sent: true, message: 'Tautan reset kata sandi (simulasi) telah dikirim ke email Anda.' };
    },
    async resetPassword({ token, newPassword }) {
      await store.simulateNetwork();
      const fieldErrors = {};
      if (!token) fieldErrors.token = 'Token reset wajib diisi.';
      if (!newPassword || newPassword.length < 6) fieldErrors.newPassword = 'Kata sandi baru minimal 6 karakter.';
      if (Object.keys(fieldErrors).length > 0) {
        throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Input reset tidak valid.', status: 422, fieldErrors });
      }
      return { reset: true };
    },
    async logout() {
      await store.simulateNetwork({ skipDelay: true, ignoreForcedScenario: true });
      store.setCurrentUser(null);
      if (tokenManager) await tokenManager.clearTokens();
      return { ok: true };
    },
    async upgradeEntitlement({ planId }) {
      await store.simulateNetwork();
      const user = requireAuth();
      user.entitlement = planId;
      if (planId === 'premium' || planId === 'family' || planId === 'institution_pro') {
        const seed = store.ensureUserSeed(user.id);
        for (const tplId of ['explore', 'racing', 'galaxy']) {
          if (!seed.unlocks.some((u) => u.templateId === tplId)) {
            seed.unlocks.push({
              templateId: tplId,
              source: 'premium',
              startsAt: new Date(store.getServerNowMs()).toISOString(),
              expiresAt: null
            });
          }
        }
      }
      store.emitOutboxEvent('SUBSCRIPTION_ENTITLEMENT_CHANGED', 'user', user.id, user.id, user.tenantId, { planId });
      return { user: structuredClone(user), planId };
    },
    async updateProfile(patch) {
      await store.simulateNetwork();
      const user = requireAuth();
      if (patch.displayName !== undefined) {
        if (!String(patch.displayName).trim()) {
          throw new ApiError({
            code: 'VALIDATION_ERROR',
            message: 'Nama tampilan tidak boleh kosong.',
            status: 422,
            fieldErrors: { displayName: 'Nama wajib diisi.' }
          });
        }
        user.displayName = String(patch.displayName).trim();
      }
      if (patch.privacyOptInPublicName !== undefined) {
        user.privacyOptInPublicName = Boolean(patch.privacyOptInPublicName);
      }
      return { user: structuredClone(user) };
    }
  };

  const journey = {
    async listTemplates() {
      await store.simulateNetwork();
      const user = requireAuth();
      const seed = store.ensureUserSeed(user.id);
      const unlockContext = {
        grants: seed.unlocks,
        now: new Date(store.getServerNowMs()).toISOString()
      };
      return store.state.templateCatalog.map((tpl) => {
        const check = evaluateTemplateEligibility({
          template: tpl,
          chapterContext: { educationLevel: user.educationLevel || 'SMP', subjectCode: 'mathematics' },
          unlockContext
        });
        return {
          ...structuredClone(tpl),
          unlocked: check.reasonCode !== 'TEMPLATE_LOCKED' && check.reasonCode !== 'TEMPLATE_DISABLED',
          eligible: check.eligible,
          reasonCode: check.reasonCode,
          reasonMessage: check.message
        };
      });
    },
    async getPreferences() {
      await store.simulateNetwork();
      const user = requireAuth();
      const seed = store.ensureUserSeed(user.id);
      return {
        ...structuredClone(seed.preferences),
        unlocks: structuredClone(seed.unlocks)
      };
    },
    async updatePreferences({ selectionMode, preferredTemplateId }) {
      await store.simulateNetwork();
      const user = requireAuth();
      const seed = store.ensureUserSeed(user.id);
      seed.preferences.selectionMode = selectionMode;
      if (preferredTemplateId) seed.preferences.preferredTemplateId = preferredTemplateId;
      if (selectionMode !== 'personal') seed.preferences.pendingTemplateId = null;
      return structuredClone(seed.preferences);
    },
    async setPendingTemplate({ templateId }) {
      await store.simulateNetwork();
      const user = requireAuth();
      const seed = store.ensureUserSeed(user.id);
      const tpl = store.state.templateCatalog.find((t) => t.id === templateId);
      const check = evaluateTemplateEligibility({
        template: tpl,
        chapterContext: { educationLevel: user.educationLevel || 'SMP', subjectCode: 'mathematics' },
        unlockContext: { grants: seed.unlocks, now: new Date(store.getServerNowMs()).toISOString() }
      });
      if (!check.eligible) {
        throw new ApiError({
          code: check.reasonCode,
          message: check.message,
          status: 403
        });
      }
      seed.preferences.pendingTemplateId = templateId;
      seed.preferences.selectionMode = 'personal';
      return {
        preferences: structuredClone(seed.preferences),
        message: 'Pilihan disimpan untuk chapter berikutnya. Snapshot chapter aktif tetap dipertahankan.'
      };
    },
    async getChapterMap(journeyId, chapterId, accessibility = {}) {
      await store.simulateNetwork();
      const user = requireAuth();
      if (store.getScenarioOptions().forceScenario === 'empty') {
        return { empty: true, viewModel: null };
      }
      const chapter = store.state.chapters.find((c) => c.id === chapterId && c.journeyId === journeyId);
      if (!chapter) {
        throw new ApiError({ code: 'CHAPTER_NOT_FOUND', message: 'Chapter tidak ditemukan.', status: 404 });
      }
      const snapshot = buildStudentJourneySnapshot(user, chapter);
      const nodes = computeNodeStatesForUser(user.id, chapter);
      const viewModel = buildCanonicalJourneyViewModel({
        journeyId,
        pathId: chapter.pathId,
        chapter,
        snapshot,
        nodes,
        accessibility
      });
      return { empty: false, viewModel };
    },
    async startNode(journeyId, nodeId) {
      await store.simulateNetwork();
      const user = requireAuth();
      const chapter = store.state.chapters.find(
        (c) => c.journeyId === journeyId && c.nodes.some((n) => n.id === nodeId)
      );
      if (!chapter) {
        throw new ApiError({ code: 'NODE_NOT_FOUND', message: 'Checkpoint tidak ditemukan.', status: 404 });
      }
      const nodes = computeNodeStatesForUser(user.id, chapter);
      const target = nodes.find((n) => n.id === nodeId);
      if (target.status === 'locked') {
        throw new ApiError({
          code: 'NODE_PREREQUISITE_NOT_MET',
          message: 'Selesaikan checkpoint prasyarat terlebih dahulu.',
          status: 409
        });
      }
      const seed = store.ensureUserSeed(user.id);
      if (!seed.inProgressNodeIds.includes(nodeId) && !seed.completedNodeIds.includes(nodeId)) {
        seed.inProgressNodeIds.push(nodeId);
      }
      return { nodeId, status: target.status === 'completed' ? 'completed' : 'in_progress' };
    },
    async completeNode(journeyId, nodeId, { idempotencyKey } = {}) {
      await store.simulateNetwork();
      const user = requireAuth();
      return store.withIdempotency(`completeNode:${nodeId}`, idempotencyKey || `${journeyId}:${nodeId}`, () => {
        const chapter = store.state.chapters.find(
          (c) => c.journeyId === journeyId && c.nodes.some((n) => n.id === nodeId)
        );
        if (!chapter) {
          throw new ApiError({ code: 'NODE_NOT_FOUND', message: 'Checkpoint tidak ditemukan.', status: 404 });
        }
        const nodes = computeNodeStatesForUser(user.id, chapter);
        const target = nodes.find((n) => n.id === nodeId);
        if (target.status === 'locked') {
          throw new ApiError({
            code: 'NODE_PREREQUISITE_NOT_MET',
            message: 'Tidak dapat menyelesaikan checkpoint sebelum prasyarat terpenuhi.',
            status: 409
          });
        }
        const seed = store.ensureUserSeed(user.id);
        const alreadyCompleted = seed.completedNodeIds.includes(nodeId);
        let xpResult = { duplicate: true, balance: computeXpBalance(store.state.xpLedger.filter((e) => e.userId === user.id)) };

        if (!alreadyCompleted) {
          seed.completedNodeIds.push(nodeId);
          seed.inProgressNodeIds = seed.inProgressNodeIds.filter((id) => id !== nodeId);
          const xpAmount = Number(target.rewardPreview?.xp || 50);
          xpResult = appendXpLedgerEntry(store.state.xpLedger, {
            userId: user.id,
            amount: xpAmount,
            sourceType: 'journey_node_completed',
            sourceId: nodeId,
            reason: `Menyelesaikan checkpoint ${target.title}`,
            idempotencyKey: `node_complete:${nodeId}`
          });
          store.state.xpLedger = xpResult.entries;
          store.emitOutboxEvent('JOURNEY_NODE_COMPLETED', 'journey_node_progress', nodeId, user.id, user.tenantId, {
            xpAmount
          });
          if (target.rewardPreview?.achievementId) {
            const ach = store.state.achievements.find((a) => a.id === target.rewardPreview.achievementId);
            const userAchs = store.state.userAchievements[user.id] || [];
            if (ach && !userAchs.includes(ach.id)) {
              userAchs.push(ach.id);
              store.state.userAchievements[user.id] = userAchs;
              if (ach.unlocksTemplateId && !seed.unlocks.some((u) => u.templateId === ach.unlocksTemplateId)) {
                seed.unlocks.push({
                  templateId: ach.unlocksTemplateId,
                  source: 'achievement',
                  sourceReferenceId: ach.id,
                  startsAt: new Date(store.getServerNowMs()).toISOString(),
                  expiresAt: null
                });
              }
            }
          }
        }
        return {
          completed: true,
          alreadyCompleted,
          xpAwarded: alreadyCompleted ? 0 : Number(target.rewardPreview?.xp || 50),
          xpBalance: xpResult.balance
        };
      });
    },
    async startNextChapter(journeyId, { currentChapterId, idempotencyKey, forceAllowDemo = false } = {}) {
      await store.simulateNetwork();
      const user = requireAuth();
      return store.withIdempotency(`nextChapter:${journeyId}:${currentChapterId}`, idempotencyKey, () => {
        const current = store.state.chapters.find((c) => c.id === currentChapterId && c.journeyId === journeyId);
        if (!current) {
          throw new ApiError({ code: 'CHAPTER_NOT_FOUND', message: 'Chapter saat ini tidak ditemukan.', status: 404 });
        }
        const nodes = computeNodeStatesForUser(user.id, current);
        const allDone = nodes.every((n) => n.status === 'completed');
        if (!allDone && !forceAllowDemo) {
          throw new ApiError({
            code: 'CHAPTER_PREREQUISITE_NOT_MET',
            message: 'Selesaikan seluruh checkpoint chapter saat ini terlebih dahulu.',
            status: 409
          });
        }
        const nextChapter = store.state.chapters.find(
          (c) => c.journeyId === journeyId && c.sequence === current.sequence + 1
        );
        if (!nextChapter) {
          throw new ApiError({
            code: 'NO_NEXT_CHAPTER',
            message: 'Ini adalah chapter terakhir pada jalur belajar ini.',
            status: 404
          });
        }
        const seed = store.ensureUserSeed(user.id);
        const previousSnapshot = seed.chapterSnapshots[current.id];
        if (!seed.chapterSnapshots[nextChapter.id]) {
          const resolved = resolveChapterTemplate({
            catalog: store.state.templateCatalog,
            chapterContext: {
              userId: user.id,
              chapterId: nextChapter.id,
              sequence: nextChapter.sequence,
              subjectCode: nextChapter.subjectCode,
              educationLevel: nextChapter.educationLevel,
              dominantActivityKind: nextChapter.dominantActivityKind,
              previousTemplateId: previousSnapshot?.templateId || null
            },
            unlockContext: {
              grants: seed.unlocks,
              now: new Date(store.getServerNowMs()).toISOString()
            },
            preferences: seed.preferences
          });
          seed.chapterSnapshots[nextChapter.id] = {
            templateId: resolved.template.id,
            templateVersion: resolved.template.version,
            selectionMode: resolved.selectionMode,
            selectionReason: resolved.selectionReason,
            layoutConfig: { theme: resolved.template.id },
            fallbackNotice: resolved.fallbackNotice
          };
          if (resolved.consumedPending) {
            seed.preferences.pendingTemplateId = null;
          }
        }
        nextChapter.status = 'in_progress';
        nextChapter.startedAt = nextChapter.startedAt || new Date(store.getServerNowMs()).toISOString();
        return {
          chapterId: nextChapter.id,
          snapshot: structuredClone(seed.chapterSnapshots[nextChapter.id])
        };
      });
    },
    async rejectSnapshotMutation(chapterId) {
      await store.simulateNetwork({ skipDelay: true });
      requireAuth();
      throw new ApiError({
        code: 'CHAPTER_TEMPLATE_IMMUTABLE',
        message: `Snapshot chapter '${chapterId}' bersifat immutable setelah dimulai.`,
        status: 409
      });
    }
  };

  const learning = {
    async getTaxonomy() {
      await store.simulateNetwork({ skipDelay: true });
      return {
        curricula: structuredClone(store.state.curricula),
        gradeLevels: structuredClone(store.state.gradeLevels),
        subjects: structuredClone(store.state.subjects),
        topics: structuredClone(store.state.topics),
        competencies: structuredClone(store.state.competencies)
      };
    },
    async listPaths(filters = {}) {
      await store.simulateNetwork();
      if (store.getScenarioOptions().forceScenario === 'empty') {
        return { items: [], chapters: [] };
      }
      let paths = store.state.learningPaths;
      if (filters.subjectId) paths = paths.filter((p) => p.subjectId === filters.subjectId);
      if (filters.educationLevel) paths = paths.filter((p) => p.educationLevel === filters.educationLevel);
      return {
        items: structuredClone(paths),
        chapters: structuredClone(store.state.chapters)
      };
    },
    async listActivities() {
      await store.simulateNetwork();
      if (store.getScenarioOptions().forceScenario === 'empty') return [];
      return structuredClone(store.state.activities);
    },
    async getActivityDelivery(activityId) {
      await store.simulateNetwork();
      const user = requireAuth();
      const activity = store.state.activities.find((a) => a.id === activityId);
      if (!activity) {
        throw new ApiError({ code: 'ACTIVITY_NOT_FOUND', message: 'Aktivitas tidak ditemukan.', status: 404 });
      }
      const questions = activity.questionIds
        .map((qid) => store.state.questions.find((q) => q.id === qid && q.governance?.status === 'published') || store.state.questions.find((q) => q.id === qid))
        .filter(Boolean)
        .map((q) => toStudentDeliveryDto(q, { mode: activity.mode }));

      const meta = store.state.userGamificationMeta[user.id] || { hearts: 5, maxHearts: 5 };
      return {
        activity: {
          id: activity.id,
          type: activity.type,
          title: activity.title,
          mode: activity.mode,
          xpReward: activity.xpReward,
          heartsEnabled: shouldUseHearts(activity.mode),
          hearts: shouldUseHearts(activity.mode) ? meta.hearts : null
        },
        questions
      };
    },
    async getQuestionHint(questionId, hintIndex = 0) {
      await store.simulateNetwork({ skipDelay: true });
      requireAuth();
      const q = store.state.questions.find((item) => item.id === questionId);
      if (!q) throw new ApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const hints = q.explanation?.hints || [];
      return {
        hint: hints[hintIndex] || hints[0] || 'Periksa kembali konsep dasar pada materi ini.',
        totalHints: hints.length
      };
    },
    async submitPracticeAttempt(activityId, { questionId, response, hintUsed = false, idempotencyKey } = {}) {
      await store.simulateNetwork();
      const user = requireAuth();
      return store.withIdempotency(`attempt:${activityId}:${questionId}`, idempotencyKey, () => {
        const activity = store.state.activities.find((a) => a.id === activityId);
        const question = store.state.questions.find((q) => q.id === questionId);
        if (!activity || !question) {
          throw new ApiError({ code: 'NOT_FOUND', message: 'Aktivitas atau soal tidak ditemukan.', status: 404 });
        }
        const graded = gradeQuestionResponse(question, response);
        const meta = store.state.userGamificationMeta[user.id] || {
          streakDays: 1,
          bestStreak: 1,
          hearts: 5,
          maxHearts: 5,
          gems: 0,
          dailyXpTarget: 30,
          dailyXpEarned: 0
        };
        store.state.userGamificationMeta[user.id] = meta;

        if (!graded.correct && shouldUseHearts(activity.mode) && meta.hearts > 0) {
          meta.hearts -= 1;
        }

        // Record competency evidence
        for (const compId of question.metadata?.competencyIds || []) {
          store.state.competencyEvidence.push({
            id: `ev_${store.state.competencyEvidence.length + 1}`,
            userId: user.id,
            competencyId: compId,
            questionId: question.id,
            questionVersion: question.version,
            correct: graded.correct,
            difficulty: question.metadata?.difficulty || 'medium',
            hintUsed: Boolean(hintUsed),
            occurredAt: new Date(store.getServerNowMs()).toISOString()
          });
        }

        let xpAwarded = 0;
        if (graded.correct) {
          xpAwarded = 15;
          const xpRes = appendXpLedgerEntry(store.state.xpLedger, {
            userId: user.id,
            amount: xpAwarded,
            sourceType: 'practice_question',
            sourceId: `${activityId}:${questionId}`,
            reason: `Menjawab tepat soal ${question.metadata?.code || question.id}`,
            idempotencyKey: idempotencyKey || `q_${activityId}_${questionId}_${store.state.competencyEvidence.length}`
          });
          store.state.xpLedger = xpRes.entries;
          if (!xpRes.duplicate) meta.dailyXpEarned = Number(meta.dailyXpEarned || 0) + xpAwarded;
        }

        return {
          ...graded,
          xpAwarded,
          heartsRemaining: shouldUseHearts(activity.mode) ? meta.hearts : null,
          feedback: {
            message: graded.correct
              ? question.explanation?.correctFeedback || 'Jawaban tepat!'
              : question.explanation?.incorrectFeedback || 'Belum tepat, pelajari pembahasannya.',
            steps: question.explanation?.steps || [],
            remediationCompetencyId: question.explanation?.remediationCompetencyId || null
          }
        };
      });
    },
    async listInteractiveGallery() {
      await store.simulateNetwork();
      // Return one representative published question per canonical type (all 14)
      const byType = new Map();
      for (const q of store.state.questions) {
        if (!byType.has(q.type) && q.governance?.status === 'published') {
          byType.set(q.type, q);
        }
      }
      return [...byType.values()].map((q) => ({
        question: toStudentDeliveryDto(q, { mode: 'practice' }),
        competencyId: q.metadata?.competencyIds?.[0] || null
      }));
    },
    async gradeGalleryPreview(questionId, response) {
      await store.simulateNetwork({ skipDelay: true });
      const q = store.state.questions.find((item) => item.id === questionId);
      if (!q) throw new ApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const graded = gradeQuestionResponse(q, response);
      return {
        ...graded,
        feedback: {
          message: graded.correct ? q.explanation?.correctFeedback || 'Tepat!' : q.explanation?.incorrectFeedback || 'Belum tepat.',
          steps: q.explanation?.steps || []
        }
      };
    }
  };

  const question = {
    async list(filters = {}) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.QUESTION_READ);
      if (store.getScenarioOptions().forceScenario === 'empty') {
        return paginate([], filters);
      }
      let list = store.state.questions.filter((q) => {
        const tenantId = q.governance?.tenantId || null;
        const isGlobalPublished = q.delivery?.visibility === 'global' && q.governance?.status === 'published';
        if (user.role === ROLES.PLATFORM_SUPER_ADMIN || user.role === ROLES.PLATFORM_CURRICULUM_ADMIN) {
          return true;
        }
        return canAccessTenantResource(user, tenantId) || isGlobalPublished;
      });
      if (filters.search) {
        const s = String(filters.search).toLowerCase();
        list = list.filter(
          (q) =>
            String(q.content?.stem || '').toLowerCase().includes(s) ||
            String(q.metadata?.title || '').toLowerCase().includes(s) ||
            String(q.metadata?.code || '').toLowerCase().includes(s)
        );
      }
      if (filters.type && filters.type !== 'all') list = list.filter((q) => q.type === filters.type);
      if (filters.status && filters.status !== 'all') list = list.filter((q) => q.governance?.status === filters.status);
      if (filters.subjectId && filters.subjectId !== 'all') list = list.filter((q) => q.metadata?.subjectId === filters.subjectId);
      if (filters.sort === 'version_desc') list = [...list].sort((a, b) => b.version - a.version);
      return paginate(structuredClone(list), filters);
    },
    async getById(questionId, version = null) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.QUESTION_READ);
      const found = store.state.questions.find(
        (q) => q.id === questionId && (version ? q.version === Number(version) : true)
      );
      if (!found) {
        throw new ApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      }
      if (!canAccessTenantResource(user, found.governance?.tenantId, {
        allowPlatformCrossTenant: true,
        allowGlobalRead: found.delivery?.visibility === 'global' && found.governance?.status === 'published'
      })) {
        throw new ApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses lintas tenant ditolak.', status: 403 });
      }
      const versions = store.state.questions.filter((q) => q.id === questionId || q.metadata?.code === found.metadata?.code);
      return {
        question: structuredClone(found),
        versions: versions.map((v) => ({ id: v.id, version: v.version, status: v.governance?.status })),
        validation: validateQuestionAuthoring(found)
      };
    },
    async createDraft(rawInput) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.QUESTION_CREATE_DRAFT);
      const normalized = normalizeLegacyQuestionInput(rawInput);
      const newId =
        normalized.id ||
        `33333333-3333-4333-8333-${String(store.state.questions.length + 1).padStart(12, '0')}`;
      const record = {
        ...normalized,
        schemaVersion: 'edumotion-question-v1',
        id: newId,
        version: 1,
        governance: {
          ...(normalized.governance || {}),
          status: 'draft',
          tenantId: user.tenantId || normalized.governance?.tenantId || 'tenant_cendekia',
          createdBy: user.id
        }
      };
      const validation = validateQuestionAuthoring(record);
      store.state.questions.unshift(record);
      return { question: structuredClone(record), validation };
    },
    async updateDraft(questionId, patch) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.QUESTION_EDIT_DRAFT);
      const idx = store.state.questions.findIndex((q) => q.id === questionId);
      if (idx === -1) throw new ApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const existing = store.state.questions[idx];
      if (!canAccessTenantResource(user, existing.governance?.tenantId, { allowPlatformCrossTenant: true })) {
        throw new ApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses edit lintas tenant ditolak.', status: 403 });
      }
      if (existing.governance?.status === 'published') {
        throw new ApiError({
          code: 'PUBLISHED_QUESTION_IMMUTABLE',
          message: 'Versi published bersifat immutable. Gunakan Buat Versi Baru untuk mengedit.',
          status: 409
        });
      }
      const updated = normalizeLegacyQuestionInput({
        ...existing,
        ...patch,
        id: existing.id,
        version: existing.version,
        governance: { ...existing.governance, ...(patch.governance || {}), status: 'draft' }
      });
      store.state.questions[idx] = updated;
      return { question: structuredClone(updated), validation: validateQuestionAuthoring(updated) };
    },
    async validateQuestion(rawInput) {
      await store.simulateNetwork({ skipDelay: true });
      requirePerm(PERMISSIONS.QUESTION_READ);
      return validateQuestionAuthoring(rawInput);
    },
    async previewAsStudent(rawInput, mode = 'practice') {
      await store.simulateNetwork({ skipDelay: true });
      requirePerm(PERMISSIONS.QUESTION_READ);
      return toStudentDeliveryDto(rawInput, { mode });
    },
    async submitForReview(questionId) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.QUESTION_EDIT_DRAFT);
      const idx = store.state.questions.findIndex((q) => q.id === questionId);
      if (idx === -1) throw new ApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const q = store.state.questions[idx];
      if (!canAccessTenantResource(user, q.governance?.tenantId, { allowPlatformCrossTenant: true })) {
        throw new ApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses lintas tenant ditolak.', status: 403 });
      }
      const val = validateQuestionAuthoring(q);
      if (!val.valid) {
        const failed = transitionQuestionStatus(q, 'validation_failed', { userId: user.id });
        store.state.questions[idx] = failed;
        throw new ApiError({
          code: 'VALIDATION_BLOCKING_ERRORS',
          message: 'Soal masih memiliki error validasi pemblokir sebelum dapat diajukan ke review.',
          status: 422,
          details: val,
          fieldErrors: val.fieldErrors
        });
      }
      const updated = transitionQuestionStatus(q, 'in_review', { userId: user.id });
      store.state.questions[idx] = updated;
      return { question: structuredClone(updated) };
    },
    async reviewQuestion(questionId, { decision, comment = '' }) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.QUESTION_REVIEW);
      const idx = store.state.questions.findIndex((q) => q.id === questionId);
      if (idx === -1) throw new ApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const q = store.state.questions[idx];
      if (!canAccessTenantResource(user, q.governance?.tenantId, { allowPlatformCrossTenant: true })) {
        throw new ApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses lintas tenant ditolak.', status: 403 });
      }
      const nextStatus = decision === 'approve' ? 'approved' : 'draft';
      const updated = transitionQuestionStatus(q, nextStatus, { userId: user.id });
      updated.governance.reviewComment = comment;
      store.state.questions[idx] = updated;
      store.recordAudit({
        actor: user,
        action: decision === 'approve' ? 'QUESTION_APPROVED' : 'QUESTION_CHANGES_REQUESTED',
        targetId: questionId,
        tenantId: q.governance?.tenantId,
        reason: comment || 'Review SME'
      });
      return { question: structuredClone(updated) };
    },
    async publishQuestion(questionId, { idempotencyKey } = {}) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.QUESTION_PUBLISH);
      return store.withIdempotency(`publish:${questionId}`, idempotencyKey, () => {
        const idx = store.state.questions.findIndex((q) => q.id === questionId);
        if (idx === -1) throw new ApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
        const q = store.state.questions[idx];
        if (!canAccessTenantResource(user, q.governance?.tenantId, { allowPlatformCrossTenant: true })) {
          throw new ApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses lintas tenant ditolak.', status: 403 });
        }
        if (q.governance?.status === 'published') {
          return { question: structuredClone(q), idempotentReplay: true };
        }
        const updated = transitionQuestionStatus(q, 'published', { userId: user.id });
        store.state.questions[idx] = updated;
        store.recordAudit({
          actor: user,
          action: 'QUESTION_PUBLISHED',
          targetId: questionId,
          tenantId: q.governance?.tenantId,
          reason: 'Publikasi versi soal ke Question Bank'
        });
        store.emitOutboxEvent('QUESTION_VERSION_PUBLISHED', 'question', questionId, user.id, q.governance?.tenantId, {
          version: updated.version
        });
        return { question: structuredClone(updated), idempotentReplay: false };
      });
    },
    async createNewVersion(questionId) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.QUESTION_CREATE_DRAFT);
      const q = store.state.questions.find((item) => item.id === questionId);
      if (!q) throw new ApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const nextVer = createNextQuestionVersion(q, user.id);
      nextVer.id = `33333333-3333-4333-8333-${String(store.state.questions.length + 1).padStart(12, '0')}`;
      store.state.questions.unshift(nextVer);
      return { question: structuredClone(nextVer) };
    },
    async archiveQuestion(questionId) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.QUESTION_ARCHIVE);
      const idx = store.state.questions.findIndex((q) => q.id === questionId);
      if (idx === -1) throw new ApiError({ code: 'QUESTION_NOT_FOUND', message: 'Soal tidak ditemukan.', status: 404 });
      const updated = transitionQuestionStatus(store.state.questions[idx], 'archived', { userId: user.id });
      store.state.questions[idx] = updated;
      return { question: structuredClone(updated) };
    }
  };

  const aiGenerator = {
    async listRuns() {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.AI_GENERATE);
      const runs = store.state.aiRuns.filter(
        (r) => user.role === ROLES.PLATFORM_SUPER_ADMIN || r.tenantId === user.tenantId || !r.tenantId
      );
      return structuredClone(runs);
    },
    async getRun(runId) {
      await store.simulateNetwork();
      requirePerm(PERMISSIONS.AI_GENERATE);
      const found = store.state.aiRuns.find((r) => r.id === runId);
      if (!found) throw new ApiError({ code: 'RUN_NOT_FOUND', message: 'Generation run tidak ditemukan.', status: 404 });
      return structuredClone(found);
    },
    async getStages() {
      return structuredClone(AI_PIPELINE_STAGES);
    },
    async createRun({ brief, simulateFailureMode = 'normal' }) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.AI_GENERATE);
      const check = validateGenerationBrief(brief);
      if (!check.valid) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: 'Konfigurasi generation brief belum lengkap atau distribusi ≠ 100%.',
          status: 422,
          fieldErrors: check.fieldErrors
        });
      }
      const estimatedCost = Number((Number(brief.quantity || 1) * 0.06).toFixed(2));
      if (estimatedCost > Number(brief.budgetCapUsd || 1.0) || simulateFailureMode === 'cost_cap') {
        throw new ApiError({
          code: 'AI_COST_CAP_EXCEEDED',
          message: `Estimasi biaya ($${estimatedCost}) melebihi batas anggaran run ($${brief.budgetCapUsd}). Proses diblokir.`,
          status: 402
        });
      }

      const validCompIds = store.state.competencies.map((c) => c.id);
      const runId = `run_${Date.now()}`;
      const qty = Math.min(Number(brief.quantity || 2), 4);
      const items = [];
      const qType = (brief.questionTypes && brief.questionTypes[0]) || 'single_choice';

      for (let i = 0; i < qty; i += 1) {
        const itemId = `ai_itm_${Date.now()}_${i + 1}`;
        let rawPayload = {
          schemaVersion: 'edumotion-question-v1',
          id: `44444444-4444-4444-8444-${String(Date.now() + i).slice(-12)}`,
          version: 1,
          type: qType === 'mixed' ? 'single_choice' : qType,
          metadata: {
            code: `AI-GEN-${i + 1}`,
            title: `Soal AI #${i + 1} · ${brief.topicId}`,
            curriculumId: brief.curriculumId,
            curriculumVersionId: brief.curriculumVersionId || 'ver_merdeka_2026',
            gradeLevelId: brief.gradeLevelId,
            subjectId: brief.subjectId,
            topicId: brief.topicId,
            competencyIds: brief.competencyIds,
            difficulty: i === 0 ? 'easy' : 'medium',
            bloomLevel: brief.bloomLevel || 'apply',
            locale: brief.locale || 'id-ID',
            estimatedSeconds: 60
          },
          content: {
            stem: `Draf AI #${i + 1}: Jika \\(${2 + i}x + 4 = ${10 + i * 3}\\), tentukan nilai \\(x\\).`,
            instruction: 'Pilih satu jawaban yang tepat.',
            media: []
          },
          interaction: {
            options: [
              { id: 'opt_a', label: '2' },
              { id: 'opt_b', label: '3' },
              { id: 'opt_c', label: '4' },
              { id: 'opt_d', label: '5' }
            ]
          },
          answerSpec: { correctOptionIds: ['opt_b'] },
          scoring: { method: 'exact_match', maxPoints: 10 },
          explanation: {
            steps: [`Kurangi kedua ruas dengan 4, lalu bagi dengan ${2 + i}.`],
            hints: ['Gunakan operasi invers secara bertahap.'],
            correctFeedback: 'Tepat!',
            incorrectFeedback: 'Cek ulang langkah eliminasi konstanta.'
          },
          delivery: { allowedModes: ['practice', 'challenge'], hintPolicy: 'progressive', feedbackPolicy: 'immediate' },
          accessibility: {},
          governance: { status: 'draft', tenantId: user.tenantId || 'tenant_cendekia', createdBy: user.id }
        };

        let detCheck = { expression: `(10 + ${i}*3 - 4) / (2 + ${i})`, claimedAnswer: 3 };
        if (i === 0 && simulateFailureMode === 'malformed_json') {
          rawPayload = '{ "stem": "JSON terpotong tanpa penutup';
        } else if (i === 0 && simulateFailureMode === 'wrong_calculation') {
          detCheck = { expression: '120 / 10', claimedAnswer: 18 };
        } else if (i === 0 && simulateFailureMode === 'unknown_taxonomy') {
          rawPayload.metadata.competencyIds = ['comp_fiktif_999'];
        } else if (i === 0 && simulateFailureMode === 'executable_code') {
          rawPayload.content.stem = 'Hitung nilai x <script>alert(1)</script>';
        }

        const report = verifyGeneratedItemDeterministic({
          rawPayload,
          validCompetencyIds: validCompIds,
          deterministicCheck: typeof rawPayload === 'object' ? detCheck : null
        });

        const maxRetries = Number(brief.maxRetries ?? 2);
        const failedAllRetries = !report.passed && (simulateFailureMode !== 'normal' || i > 0);
        items.push({
          id: itemId,
          runId,
          status: report.passed ? 'needs_review' : failedAllRetries ? 'failed' : 'needs_review',
          attemptCount: report.passed ? 1 : maxRetries,
          generation: {
            modelId: brief.modelPolicyId || 'edu-math-reasoner-v1',
            promptVersion: 'qgen-v1.2',
            tokensUsed: 640,
            costUsd: 0.06
          },
          validationReport: report,
          question: typeof rawPayload === 'object' ? rawPayload : null
        });
      }

      const run = {
        id: runId,
        tenantId: user.tenantId || 'tenant_cendekia',
        requestedBy: user.id,
        status: items.some((x) => x.status === 'failed') ? 'completed_with_errors' : 'completed',
        progressPct: 100,
        estimatedCostUsd: estimatedCost,
        actualCostUsd: Number((items.length * 0.06).toFixed(2)),
        budgetCapUsd: Number(brief.budgetCapUsd || 1.0),
        maxRetries: Number(brief.maxRetries ?? 2),
        createdAt: new Date(store.getServerNowMs()).toISOString(),
        completedAt: new Date(store.getServerNowMs()).toISOString(),
        brief: structuredClone(brief),
        items,
        auditTrail: [
          { timestamp: new Date(store.getServerNowMs()).toISOString(), actor: user.displayName, action: 'RUN_STARTED', detail: `Membuat ${qty} item soal (${simulateFailureMode}).` }
        ]
      };
      store.state.aiRuns.unshift(run);
      store.emitOutboxEvent('AI_GENERATION_RUN_COMPLETED', 'ai_generation_run', runId, user.id, run.tenantId, {
        itemCount: items.length
      });
      return structuredClone(run);
    },
    async cancelRun(runId) {
      await store.simulateNetwork();
      requirePerm(PERMISSIONS.AI_GENERATE);
      const run = store.state.aiRuns.find((r) => r.id === runId);
      if (!run) throw new ApiError({ code: 'RUN_NOT_FOUND', message: 'Run tidak ditemukan.', status: 404 });
      run.status = 'cancelled';
      run.auditTrail.push({
        timestamp: new Date(store.getServerNowMs()).toISOString(),
        actor: store.getCurrentUser()?.displayName || 'Author',
        action: 'RUN_CANCELLED',
        detail: 'Pengguna membatalkan sisa antrean run.'
      });
      return structuredClone(run);
    },
    async acceptItemToDraft(itemId) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.AI_GENERATE);
      for (const run of store.state.aiRuns) {
        const item = run.items.find((it) => it.id === itemId);
        if (item) {
          const draft = promoteGeneratedItemToDraft(item, user.id);
          item.status = 'accepted';
          store.state.questions.unshift(draft);
          run.auditTrail.push({
            timestamp: new Date(store.getServerNowMs()).toISOString(),
            actor: user.displayName,
            action: 'ITEM_ACCEPTED_AS_DRAFT',
            detail: `Item ${itemId} disimpan ke Question Bank sebagai draft (belum published).`
          });
          return { item: structuredClone(item), draftQuestion: structuredClone(draft) };
        }
      }
      throw new ApiError({ code: 'ITEM_NOT_FOUND', message: 'Item AI tidak ditemukan.', status: 404 });
    },
    async rejectItem(itemId, reason = 'Ditolak reviewer') {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.AI_GENERATE);
      for (const run of store.state.aiRuns) {
        const item = run.items.find((it) => it.id === itemId);
        if (item) {
          item.status = 'rejected';
          run.auditTrail.push({
            timestamp: new Date(store.getServerNowMs()).toISOString(),
            actor: user.displayName,
            action: 'ITEM_REJECTED',
            detail: reason
          });
          return structuredClone(item);
        }
      }
      throw new ApiError({ code: 'ITEM_NOT_FOUND', message: 'Item AI tidak ditemukan.', status: 404 });
    },
    async retryItem(itemId) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.AI_GENERATE);
      for (const run of store.state.aiRuns) {
        const item = run.items.find((it) => it.id === itemId);
        if (item) {
          if (item.attemptCount >= run.maxRetries && item.status === 'failed') {
            throw new ApiError({
              code: 'MAX_RETRIES_EXCEEDED',
              message: `Batas percobaan ulang (${run.maxRetries}) telah tercapai untuk item ini.`,
              status: 409
            });
          }
          item.attemptCount += 1;
          item.status = 'needs_review';
          if (item.question) {
            item.validationReport = { passed: true, qualityScore: 90, findings: [] };
          }
          run.auditTrail.push({
            timestamp: new Date(store.getServerNowMs()).toISOString(),
            actor: user.displayName,
            action: 'ITEM_RETRIED',
            detail: `Percobaan ke-${item.attemptCount}.`
          });
          return structuredClone(item);
        }
      }
      throw new ApiError({ code: 'ITEM_NOT_FOUND', message: 'Item AI tidak ditemukan.', status: 404 });
    }
  };

  const assessment = {
    async listAssessments() {
      await store.simulateNetwork();
      const user = requireAuth();
      if (store.getScenarioOptions().forceScenario === 'empty') return [];
      return structuredClone(
        store.state.assessments.filter((a) => !a.tenantId || !user.tenantId || a.tenantId === user.tenantId)
      );
    },
    async startSession(assessmentId, { idempotencyKey } = {}) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.STUDENT_ASSESSMENT);
      return store.withIdempotency(`startAssessment:${assessmentId}`, idempotencyKey || `${user.id}:${assessmentId}`, () => {
        const existing = store.state.assessmentSessions.find(
          (s) => s.assessmentId === assessmentId && s.userId === user.id && ['created', 'started'].includes(s.status)
        );
        if (existing) {
          return {
            session: structuredClone({
              id: existing.id,
              assessmentId: existing.assessmentId,
              title: existing.title,
              mode: existing.mode,
              status: existing.status,
              startedAt: existing.startedAt,
              expiresAt: existing.expiresAt,
              heartsEnabled: false,
              xpAffectsGrade: false,
              remainingSeconds: computeRemainingExamSeconds({
                expiresAt: existing.expiresAt,
                serverNowMs: store.getServerNowMs()
              }),
              serverNowMs: store.getServerNowMs(),
              clientObservedNowMs: store.getClientObservedNowMs(),
              snapshots: existing.snapshots.map(({ authoringSnapshot: _a, ...pub }) => pub),
              responses: existing.responses
            })
          };
        }

        const asm = store.state.assessments.find((a) => a.id === assessmentId);
        if (!asm) throw new ApiError({ code: 'ASSESSMENT_NOT_FOUND', message: 'Ujian tidak ditemukan.', status: 404 });
        const questions = asm.questionIds
          .map((id) => store.state.questions.find((q) => q.id === id))
          .filter(Boolean);
        const snapshots = buildImmutableExamSnapshots(questions, asm.mode);
        const serverNow = store.getServerNowMs();
        const expiresAt = new Date(serverNow + asm.durationMinutes * 60 * 1000).toISOString();

        const session = {
          id: `sess_${store.state.assessmentSessions.length + 1}`,
          assessmentId: asm.id,
          userId: user.id,
          title: asm.title,
          mode: asm.mode,
          status: 'started',
          startedAt: new Date(serverNow).toISOString(),
          expiresAt,
          submittedAt: null,
          releaseAt: asm.releaseAt,
          snapshots,
          responses: {},
          result: null
        };
        store.state.assessmentSessions.push(session);
        return {
          session: structuredClone({
            id: session.id,
            assessmentId: session.assessmentId,
            title: session.title,
            mode: session.mode,
            status: session.status,
            startedAt: session.startedAt,
            expiresAt: session.expiresAt,
            heartsEnabled: false,
            xpAffectsGrade: false,
            remainingSeconds: computeRemainingExamSeconds({ expiresAt, serverNowMs: serverNow }),
            serverNowMs: serverNow,
            clientObservedNowMs: store.getClientObservedNowMs(),
            snapshots: snapshots.map(({ authoringSnapshot: _a, ...pub }) => pub),
            responses: {}
          })
        };
      });
    },
    async getSession(sessionId) {
      await store.simulateNetwork();
      const user = requireAuth();
      const session = store.state.assessmentSessions.find((s) => s.id === sessionId && s.userId === user.id);
      if (!session) throw new ApiError({ code: 'SESSION_NOT_FOUND', message: 'Sesi ujian tidak ditemukan.', status: 404 });
      const serverNow = store.getServerNowMs();
      if (session.status === 'started' && isSessionExpired({ expiresAt: session.expiresAt, serverNowMs: serverNow })) {
        session.status = transitionAssessmentSession(session, 'expired').status;
      }
      return structuredClone({
        id: session.id,
        assessmentId: session.assessmentId,
        title: session.title,
        mode: session.mode,
        status: session.status,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        heartsEnabled: false,
        xpAffectsGrade: false,
        remainingSeconds: computeRemainingExamSeconds({ expiresAt: session.expiresAt, serverNowMs: serverNow }),
        serverNowMs: serverNow,
        clientObservedNowMs: store.getClientObservedNowMs(),
        snapshots: session.snapshots.map(({ authoringSnapshot: _a, ...pub }) => pub),
        responses: session.responses
      });
    },
    async autosaveResponse(sessionId, questionSnapshotId, { response, bookmarked = false, idempotencyKey } = {}) {
      await store.simulateNetwork({ skipDelay: true });
      const user = requireAuth();
      const session = store.state.assessmentSessions.find((s) => s.id === sessionId && s.userId === user.id);
      if (!session) throw new ApiError({ code: 'SESSION_NOT_FOUND', message: 'Sesi ujian tidak ditemukan.', status: 404 });
      if (session.status !== 'started') {
        throw new ApiError({ code: 'SESSION_LOCKED', message: 'Sesi ujian sudah dikunci.', status: 409 });
      }
      if (isSessionExpired({ expiresAt: session.expiresAt, serverNowMs: store.getServerNowMs() })) {
        session.status = 'expired';
        throw new ApiError({ code: 'SESSION_EXPIRED', message: 'Waktu ujian telah habis menurut server.', status: 409 });
      }
      return store.withIdempotency(`autosave:${sessionId}:${questionSnapshotId}`, idempotencyKey, () => {
        session.responses[questionSnapshotId] = {
          response,
          bookmarked: Boolean(bookmarked),
          savedAt: new Date(store.getServerNowMs()).toISOString()
        };
        return {
          saved: true,
          questionSnapshotId,
          savedAt: session.responses[questionSnapshotId].savedAt
        };
      });
    },
    async submitSession(sessionId, { idempotencyKey } = {}) {
      await store.simulateNetwork();
      const user = requireAuth();
      return store.withIdempotency(`submitAssessment:${sessionId}`, idempotencyKey || sessionId, () => {
        const session = store.state.assessmentSessions.find((s) => s.id === sessionId && s.userId === user.id);
        if (!session) throw new ApiError({ code: 'SESSION_NOT_FOUND', message: 'Sesi ujian tidak ditemukan.', status: 404 });
        if (session.result) return structuredClone(session.result);
        session.status = 'submitted';
        session.submittedAt = new Date(store.getServerNowMs()).toISOString();
        const result = gradeAssessmentSession({
          session,
          snapshots: session.snapshots,
          responses: session.responses,
          releaseAt: session.releaseAt,
          serverNowMs: store.getServerNowMs()
        });
        session.status = result.status;
        session.result = result;
        store.emitOutboxEvent('ASSESSMENT_SUBMITTED', 'assessment_session', session.id, user.id, user.tenantId, {
          academicScore: result.academicScore
        });
        return structuredClone(result);
      });
    },
    async getResult(sessionId) {
      await store.simulateNetwork();
      const user = requireAuth();
      const session = store.state.assessmentSessions.find((s) => s.id === sessionId && s.userId === user.id);
      if (!session || !session.result) {
        throw new ApiError({ code: 'RESULT_NOT_FOUND', message: 'Hasil ujian belum tersedia.', status: 404 });
      }
      return structuredClone(session.result);
    }
  };

  const mastery = {
    async getOverview() {
      await store.simulateNetwork();
      const user = requireAuth();
      const evidence = store.state.competencyEvidence.filter((e) => e.userId === user.id);
      const srItems = store.state.spacedRepetitionItems.filter((sr) => sr.userId === user.id);
      const competencies = store.state.competencies.map((comp) => {
        const compEv = evidence.filter((e) => e.competencyId === comp.id);
        const computed = computeCompetencyMasteryFromEvidence(compEv);
        const sr = srItems.find((s) => s.competencyId === comp.id) || null;
        return {
          ...comp,
          ...computed,
          spacedRepetition: sr
        };
      });
      return {
        competencies,
        remedialRecommendations: competencies.filter((c) => c.remedialRecommended),
        dueReviews: srItems
      };
    },
    async completeSpacedReview(srId, { wasCorrect = true }) {
      await store.simulateNetwork();
      const user = requireAuth();
      const item = store.state.spacedRepetitionItems.find((s) => s.id === srId && s.userId === user.id);
      if (!item) throw new ApiError({ code: 'REVIEW_NOT_FOUND', message: 'Jadwal review tidak ditemukan.', status: 404 });
      const ev = store.state.competencyEvidence.filter((e) => e.userId === user.id && e.competencyId === item.competencyId);
      const currentMastery = computeCompetencyMasteryFromEvidence(ev).score;
      const next = computeNextSpacedRepetitionSchedule({
        currentStageIndex: item.stageIndex,
        masteryScore: currentMastery,
        wasCorrect,
        reviewedAt: new Date(store.getServerNowMs()).toISOString()
      });
      item.stageIndex = next.stageIndex;
      item.intervalDays = next.intervalDays;
      item.nextReviewAt = next.nextReviewAt;
      return structuredClone(item);
    },
    async getHistory() {
      await store.simulateNetwork();
      const user = requireAuth();
      if (store.getScenarioOptions().forceScenario === 'empty') return [];
      return structuredClone(store.state.activityHistory.filter((h) => h.userId === user.id));
    }
  };

  const gamification = {
    async getDashboardStats() {
      await store.simulateNetwork();
      const user = requireAuth();
      const entries = store.state.xpLedger.filter((e) => e.userId === user.id);
      const xpBalance = computeXpBalance(entries);
      const rank = getPlayerRankFromXp(xpBalance);
      const meta = store.state.userGamificationMeta[user.id] || {
        streakDays: 0,
        bestStreak: 0,
        hearts: 5,
        maxHearts: 5,
        gems: 0,
        dailyXpTarget: 30,
        dailyXpEarned: 0
      };
      return {
        xpBalance,
        rank,
        ...meta,
        ledgerEntries: structuredClone(entries).reverse()
      };
    },
    async getLeaderboard() {
      await store.simulateNetwork();
      const user = requireAuth();
      if (store.getScenarioOptions().forceScenario === 'empty') return [];
      return store.state.leaderboardPool.map((row) => projectLeaderboardEntry(row, user.id));
    },
    async getQuestsAndAchievements() {
      await store.simulateNetwork();
      const user = requireAuth();
      const earnedIds = store.state.userAchievements[user.id] || [];
      return {
        quests: structuredClone(store.state.quests),
        achievements: store.state.achievements.map((a) => ({
          ...a,
          earned: earnedIds.includes(a.id)
        }))
      };
    },
    async claimQuestReward(questId, { idempotencyKey } = {}) {
      await store.simulateNetwork();
      const user = requireAuth();
      return store.withIdempotency(`quest:${questId}`, idempotencyKey || questId, () => {
        const quest = store.state.quests.find((q) => q.id === questId);
        if (!quest) throw new ApiError({ code: 'QUEST_NOT_FOUND', message: 'Misi tidak ditemukan.', status: 404 });
        if (quest.claimed) return { quest: structuredClone(quest), alreadyClaimed: true };
        quest.claimed = true;
        const xpRes = appendXpLedgerEntry(store.state.xpLedger, {
          userId: user.id,
          amount: quest.rewardXp,
          sourceType: 'quest_reward',
          sourceId: quest.id,
          reason: `Klaim misi: ${quest.title}`,
          idempotencyKey: `quest_claim:${quest.id}`
        });
        store.state.xpLedger = xpRes.entries;
        return { quest: structuredClone(quest), alreadyClaimed: false, xpBalance: xpRes.balance };
      });
    }
  };

  const school = {
    async getDashboard() {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.SCHOOL_VIEW_DASHBOARD);
      const classes = store.state.school.classes.filter(
        (c) => c.tenantId === user.tenantId && canAccessClassResource(user, c.id)
      );
      const students = store.state.school.students.filter(
        (s) => s.tenantId === user.tenantId && canAccessClassResource(user, s.classId)
      );
      const calendar = store.state.school.calendarEvents.filter((e) => e.tenantId === user.tenantId);
      const pendingWork = store.state.school.workedSubmissions.filter(
        (w) => w.tenantId === user.tenantId && w.status === 'pending_review'
      );
      return {
        tenant: store.state.tenants.find((t) => t.id === user.tenantId) || null,
        classes: structuredClone(classes),
        students: structuredClone(students),
        calendar: structuredClone(calendar),
        pendingWorkedCount: pendingWork.length
      };
    },
    async listStudents() {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.SCHOOL_VIEW_DASHBOARD);
      if (store.getScenarioOptions().forceScenario === 'empty') return [];
      return structuredClone(
        store.state.school.students.filter(
          (s) => s.tenantId === user.tenantId && canAccessClassResource(user, s.classId)
        )
      );
    },
    async addStudent(payload) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.SCHOOL_MANAGE_STUDENTS);
      const fieldErrors = {};
      if (!payload?.name || !String(payload.name).trim()) fieldErrors.name = 'Nama siswa wajib diisi.';
      if (!payload?.nis || !String(payload.nis).trim()) fieldErrors.nis = 'NIS wajib diisi.';
      if (!payload?.classId) fieldErrors.classId = 'Pilih rombongan belajar.';
      if (Object.keys(fieldErrors).length > 0) {
        throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Data siswa tidak valid.', status: 422, fieldErrors });
      }
      const student = {
        id: `stu_${Date.now()}`,
        tenantId: user.tenantId,
        classId: payload.classId,
        name: String(payload.name).trim(),
        nis: String(payload.nis).trim(),
        avgMastery: 0,
        xp: 0,
        status: 'Aktif'
      };
      store.state.school.students.push(student);
      return structuredClone(student);
    },
    async listWorkedSubmissions() {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.SCHOOL_GRADE_ASSESSMENT);
      return structuredClone(
        store.state.school.workedSubmissions.filter(
          (w) => w.tenantId === user.tenantId && canAccessClassResource(user, w.classId)
        )
      );
    },
    async gradeWorkedSubmission(submissionId, { rubricScores, reviewerNote }) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.SCHOOL_GRADE_ASSESSMENT);
      const sub = store.state.school.workedSubmissions.find((w) => w.id === submissionId);
      if (!sub) throw new ApiError({ code: 'SUBMISSION_NOT_FOUND', message: 'Jawaban tidak ditemukan.', status: 404 });
      if (!canAccessTenantResource(user, sub.tenantId)) {
        throw new ApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses penilaian lintas sekolah ditolak.', status: 403 });
      }
      sub.awardedScores = rubricScores;
      sub.reviewerNote = reviewerNote || '';
      sub.status = 'graded';
      store.recordAudit({
        actor: user,
        action: 'WORKED_SOLUTION_GRADED',
        targetId: submissionId,
        tenantId: sub.tenantId,
        reason: reviewerNote || 'Penilaian rubrik manual guru'
      });
      return structuredClone(sub);
    },
    async listCounselingSignals() {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.SCHOOL_COUNSELING_ACCESS);
      store.recordAudit({
        actor: user,
        action: 'COUNSELING_SIGNALS_ACCESSED',
        targetId: user.tenantId,
        tenantId: user.tenantId,
        reason: 'Pemantauan risiko belajar siswa oleh BK/Wali Kelas'
      });
      return structuredClone(
        store.state.school.counselingSignals.filter(
          (c) => c.tenantId === user.tenantId && canAccessClassResource(user, c.classId)
        )
      );
    },
    async addCounselingNote(signalId, { note }) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.SCHOOL_COUNSELING_ACCESS);
      if (!note || !String(note).trim()) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: 'Catatan tindak lanjut wajib diisi.',
          status: 422,
          fieldErrors: { note: 'Isi ringkasan tindak lanjut konseling.' }
        });
      }
      const sig = store.state.school.counselingSignals.find((c) => c.id === signalId);
      if (!sig) throw new ApiError({ code: 'SIGNAL_NOT_FOUND', message: 'Sinyal tidak ditemukan.', status: 404 });
      if (!canAccessTenantResource(user, sig.tenantId)) {
        throw new ApiError({ code: 'FORBIDDEN_TENANT_ACCESS', message: 'Akses lintas sekolah ditolak.', status: 403 });
      }
      sig.notes.push({
        id: `cn_${Date.now()}`,
        author: user.displayName,
        note: String(note).trim(),
        createdAt: new Date(store.getServerNowMs()).toISOString()
      });
      sig.status = 'followed_up';
      store.recordAudit({
        actor: user,
        action: 'COUNSELING_NOTE_RECORDED',
        targetId: signalId,
        tenantId: sig.tenantId,
        reason: 'Pencatatan tindak lanjut BK'
      });
      return structuredClone(sig);
    },
    async getParentLinkedChildren(targetStudentId = null) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.PARENT_VIEW_LINKED);
      const linkedIds = user.linkedStudentIds || [];
      if (targetStudentId && !canAccessLinkedStudent(user, targetStudentId)) {
        throw new ApiError({
          code: 'FORBIDDEN_STUDENT_LINK',
          message: 'Anda hanya dapat mengakses data anak yang tertaut resmi dengan akun Orang Tua Anda.',
          status: 403
        });
      }
      const children = linkedIds.map((sid) => {
        const persona = store.state.personas.find((p) => p.id === sid);
        const xp = computeXpBalance(store.state.xpLedger.filter((e) => e.userId === sid));
        const meta = store.state.userGamificationMeta[sid] || { streakDays: 0, dailyXpEarned: 0, dailyXpTarget: 20 };
        const history = store.state.activityHistory.filter((h) => h.userId === sid);
        return {
          studentId: sid,
          displayName: persona?.displayName || sid,
          educationLevel: persona?.educationLevel || 'SD',
          xpBalance: xp,
          streakDays: meta.streakDays,
          dailyXpEarned: meta.dailyXpEarned,
          dailyXpTarget: meta.dailyXpTarget,
          recentHistory: history
        };
      });
      return structuredClone(children);
    },
    async listCustomRoles() {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.SCHOOL_VIEW_DASHBOARD);
      return structuredClone(store.state.school.customRoles.filter((r) => r.tenantId === user.tenantId));
    },
    async createCustomRole({ name, permissions }) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.SCHOOL_MANAGE_ROLES);
      if (!name || !Array.isArray(permissions) || permissions.length === 0) {
        throw new ApiError({
          code: 'VALIDATION_ERROR',
          message: 'Nama peran dan minimal 1 izin wajib diisi.',
          status: 422,
          fieldErrors: { name: !name ? 'Nama peran wajib diisi.' : undefined }
        });
      }
      const role = { id: `crole_${Date.now()}`, tenantId: user.tenantId, name, permissions };
      store.state.school.customRoles.push(role);
      return structuredClone(role);
    }
  };

  const platformAdmin = {
    async getOverview() {
      await store.simulateNetwork();
      requirePerm(PERMISSIONS.PLATFORM_VIEW_OVERVIEW);
      return {
        totalUsers: 48290,
        activeInstitutions: store.state.tenants.filter((t) => t.status === 'active').length,
        monthlyActiveUsers: 31640,
        monthlyRevenueIdr: 284000000,
        dailyActiveTrend: structuredClone(store.state.platform.dailyActiveTrend),
        systemHealth: structuredClone(store.state.platform.systemHealth),
        institutions: structuredClone(store.state.tenants)
      };
    },
    async updateInstitutionStatus(tenantId, { status, auditReason }) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.PLATFORM_MANAGE_INSTITUTIONS);
      if (!auditReason || String(auditReason).trim().length < 5) {
        throw new ApiError({
          code: 'AUDIT_REASON_REQUIRED',
          message: 'Tindakan lintas tenant wajib menyertakan alasan audit minimal 5 karakter.',
          status: 422,
          fieldErrors: { auditReason: 'Masukkan alasan audit yang jelas.' }
        });
      }
      const tenant = store.state.tenants.find((t) => t.id === tenantId);
      if (!tenant) throw new ApiError({ code: 'TENANT_NOT_FOUND', message: 'Institusi tidak ditemukan.', status: 404 });
      tenant.status = status;
      store.recordAudit({
        actor: user,
        action: `INSTITUTION_STATUS_${String(status).toUpperCase()}`,
        targetId: tenantId,
        tenantId,
        reason: String(auditReason).trim()
      });
      return structuredClone(tenant);
    },
    async listJourneyTemplatesAdmin() {
      await store.simulateNetwork();
      requirePerm(PERMISSIONS.PLATFORM_MANAGE_JOURNEY_TEMPLATES);
      return structuredClone(store.state.templateCatalog);
    },
    async updateJourneyTemplateConfig(templateId, patch) {
      await store.simulateNetwork();
      const user = requirePerm(PERMISSIONS.PLATFORM_MANAGE_JOURNEY_TEMPLATES);
      const tpl = store.state.templateCatalog.find((t) => t.id === templateId);
      if (!tpl) throw new ApiError({ code: 'TEMPLATE_NOT_FOUND', message: 'Template tidak ditemukan.', status: 404 });
      if (patch.enabled !== undefined) tpl.enabled = Boolean(patch.enabled);
      if (patch.priorityWeight !== undefined) tpl.priorityWeight = Number(patch.priorityWeight);
      store.recordAudit({
        actor: user,
        action: 'JOURNEY_TEMPLATE_UPDATED',
        targetId: templateId,
        reason: `Perubahan konfigurasi template untuk chapter baru (enabled=${tpl.enabled}, weight=${tpl.priorityWeight}).`
      });
      return structuredClone(tpl);
    },
    async listPlans() {
      await store.simulateNetwork({ skipDelay: true });
      return structuredClone(store.state.platform.plans);
    },
    async listAuditLogs() {
      await store.simulateNetwork();
      requirePerm(PERMISSIONS.PLATFORM_VIEW_AUDIT_LOGS);
      return structuredClone(store.state.platform.auditLogs);
    }
  };

  const media = {
    async mockUploadFile({ fileName, sizeBytes, mimeType, altText, magicBytesHex }) {
      await store.simulateNetwork();
      requireAuth();
      const forbiddenExt = /\.(exe|bat|sh|js|html|php|svgz)$/i;
      const allowedMime = ['image/png', 'image/jpeg', 'image/svg+xml', 'audio/mpeg', 'video/mp4'];
      const upperMagic = String(magicBytesHex || '').toUpperCase();
      if (forbiddenExt.test(fileName || '') || !allowedMime.includes(mimeType) || upperMagic.startsWith('4D5A')) {
        throw new ApiError({
          code: 'UNSAFE_OR_UNSUPPORTED_MEDIA',
          message: `File '${fileName}' ditolak karena tipe tidak diizinkan atau berpotensi tidak aman.`,
          status: 415
        });
      }
      if (Number(sizeBytes || 0) > 10 * 1024 * 1024) {
        throw new ApiError({
          code: 'FILE_TOO_LARGE',
          message: 'Ukuran file melebihi batas maksimal 10 MB.',
          status: 413
        });
      }
      const asset = {
        id: `med_${Date.now()}`,
        fileName,
        mimeType,
        sizeBytes,
        storageKey: `mock-media/${Date.now()}-${fileName}`,
        url: `mock://media/${fileName}`,
        altText: altText || '',
        uploadedAt: new Date(store.getServerNowMs()).toISOString()
      };
      store.state.mediaUploads.push(asset);
      return asset;
    },
    uploadQuestionMedia(payload) {
      return media.mockUploadFile(payload);
    }
  };

  const notification = {
    async list() {
      await store.simulateNetwork();
      const user = requireAuth();
      if (store.getScenarioOptions().forceScenario === 'empty') return [];
      return structuredClone(store.state.notifications.filter((n) => n.userId === user.id));
    },
    async markAsRead(notificationId) {
      await store.simulateNetwork({ skipDelay: true });
      const user = requireAuth();
      const n = store.state.notifications.find((item) => item.id === notificationId && item.userId === user.id);
      if (n) n.read = true;
      return { ok: true };
    }
  };

  return {
    auth,
    journey,
    learning,
    question,
    aiGenerator,
    assessment,
    mastery,
    gamification,
    school,
    platformAdmin,
    media,
    notification,
    __mockControl: {
      getScenarioOptions: store.getScenarioOptions,
      setScenarioOptions: store.setScenarioOptions,
      reset: store.reset,
      getServerNowMs: store.getServerNowMs,
      getClientObservedNowMs: store.getClientObservedNowMs,
      getOutboxEvents: () => structuredClone(store.state.outboxEvents)
    }
  };
}
