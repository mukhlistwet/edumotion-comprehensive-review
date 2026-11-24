import { normalizePaginatedResponse } from '../../api/http-client.js';

export function createHttpServices(httpClient, tokenManager) {
  return {
    auth: {
      listPersonas: () => httpClient.get('/auth/demo-personas'),
      getSession: () => httpClient.get('/auth/session'),
      loginWithCredentials: async (creds) => {
        const res = await httpClient.post('/auth/login', creds);
        if (res?.tokens && tokenManager) await tokenManager.setTokens(res.tokens);
        return res;
      },
      loginAsPersona: async (userId) => {
        const res = await httpClient.post('/auth/demo-login', { userId });
        if (res?.tokens && tokenManager) await tokenManager.setTokens(res.tokens);
        return res;
      },
      refreshSession: async () => {
        const current = tokenManager ? await tokenManager.getTokens() : null;
        if (!current?.refreshToken) return null;
        const res = await httpClient.post(
          '/auth/refresh',
          { refreshToken: current.refreshToken },
          { _retriedAuth: true }
        );
        if (res?.tokens && tokenManager) await tokenManager.setTokens(res.tokens);
        return res;
      },
      register: async (payload) => {
        const res = await httpClient.post('/auth/register', payload);
        if (res?.tokens && tokenManager) await tokenManager.setTokens(res.tokens);
        return res;
      },
      requestPasswordReset: (payload) => httpClient.post('/auth/forgot-password', payload),
      resetPassword: (payload) => httpClient.post('/auth/reset-password', payload),
      logout: async () => {
        const current = tokenManager ? await tokenManager.getTokens() : null;
        try {
          return await httpClient.post('/auth/logout', {
            refreshToken: current?.refreshToken || null
          });
        } finally {
          if (tokenManager) await tokenManager.clearTokens();
        }
      },
      upgradeEntitlement: (payload) => httpClient.post('/me/entitlements/upgrade', payload),
      updateProfile: (patch) => httpClient.patch('/me/profile', patch)
    },
    journey: {
      listTemplates: () => httpClient.get('/journey-templates'),
      getPreferences: () => httpClient.get('/me/journey/preferences'),
      updatePreferences: (payload) => httpClient.put('/me/journey/preferences', payload),
      setPendingTemplate: (payload) => httpClient.put('/me/journey/preferences/pending-template', payload),
      getChapterMap: (journeyId, chapterId, accessibility) =>
        httpClient.get(`/journeys/${journeyId}/chapters/${chapterId}/map`, {
          query: accessibility
        }),
      startNode: (journeyId, nodeId) => httpClient.post(`/journeys/${journeyId}/nodes/${nodeId}/start`),
      completeNode: (journeyId, nodeId, { idempotencyKey } = {}) =>
        httpClient.post(`/journeys/${journeyId}/nodes/${nodeId}/complete`, {}, { idempotencyKey }),
      startNextChapter: (journeyId, { currentChapterId, idempotencyKey } = {}) =>
        httpClient.post(`/journeys/${journeyId}/chapters/next`, { currentChapterId }, { idempotencyKey }),
      rejectSnapshotMutation: (chapterId) =>
        httpClient.put(`/journeys/chapters/${chapterId}/snapshot`, {})
    },
    learning: {
      getTaxonomy: () => httpClient.get('/question-taxonomies'),
      listPaths: (filters) => httpClient.get('/learning-paths', { query: filters }),
      listActivities: () => httpClient.get('/activities'),
      getActivityDelivery: (activityId) => httpClient.get(`/activities/${activityId}/delivery`),
      getQuestionHint: (questionId, hintIndex) =>
        httpClient.get(`/questions/${questionId}/hints`, { query: { index: hintIndex } }),
      submitPracticeAttempt: (activityId, payload) =>
        httpClient.post(`/activities/${activityId}/attempts`, payload, {
          idempotencyKey: payload?.idempotencyKey
        }),
      listInteractiveGallery: () => httpClient.get('/activities/gallery'),
      gradeGalleryPreview: (questionId, response) =>
        httpClient.post(`/activities/gallery/${questionId}/grade`, { response })
    },
    question: {
      list: async (filters) => normalizePaginatedResponse(await httpClient.get('/questions', { query: filters })),
      getById: (questionId, version) =>
        httpClient.get(`/questions/${questionId}`, { query: version ? { version } : undefined }),
      createDraft: (payload) => httpClient.post('/questions', payload),
      updateDraft: (questionId, patch) => httpClient.patch(`/questions/${questionId}`, patch),
      validateQuestion: (payload) => httpClient.post('/questions/validate', payload),
      previewAsStudent: (payload, mode) => httpClient.post('/questions/preview', { question: payload, mode }),
      submitForReview: (questionId) => httpClient.post(`/questions/${questionId}/submit-review`),
      reviewQuestion: (questionId, payload) => httpClient.post(`/questions/${questionId}/reviews`, payload),
      publishQuestion: (questionId, { idempotencyKey } = {}) =>
        httpClient.post(`/questions/${questionId}/publish`, {}, { idempotencyKey }),
      createNewVersion: (questionId) => httpClient.post(`/questions/${questionId}/new-version`),
      archiveQuestion: (questionId) => httpClient.post(`/questions/${questionId}/archive`)
    },
    aiGenerator: {
      listRuns: () => httpClient.get('/ai/question-generation-runs'),
      getRun: (runId) => httpClient.get(`/ai/question-generation-runs/${runId}`),
      getStages: () => httpClient.get('/ai/question-generation-stages'),
      createRun: (payload) => httpClient.post('/ai/question-generation-runs', payload),
      cancelRun: (runId) => httpClient.post(`/ai/question-generation-runs/${runId}/cancel`),
      acceptItemToDraft: (itemId) => httpClient.post(`/ai/question-generation-items/${itemId}/accept`),
      rejectItem: (itemId, reason) => httpClient.post(`/ai/question-generation-items/${itemId}/reject`, { reason }),
      retryItem: (itemId) => httpClient.post(`/ai/question-generation-items/${itemId}/retry`)
    },
    assessment: {
      listAssessments: () => httpClient.get('/assessments'),
      startSession: (assessmentId, { idempotencyKey } = {}) =>
        httpClient.post(`/assessments/${assessmentId}/sessions`, {}, { idempotencyKey }),
      getSession: (sessionId) => httpClient.get(`/assessment-sessions/${sessionId}`),
      autosaveResponse: (sessionId, questionSnapshotId, payload) =>
        httpClient.put(`/assessment-sessions/${sessionId}/responses/${questionSnapshotId}`, payload, {
          idempotencyKey: payload?.idempotencyKey
        }),
      submitSession: (sessionId, { idempotencyKey } = {}) =>
        httpClient.post(`/assessment-sessions/${sessionId}/submit`, {}, { idempotencyKey }),
      getResult: (sessionId) => httpClient.get(`/assessment-sessions/${sessionId}/result`)
    },
    mastery: {
      getOverview: () => httpClient.get('/me/mastery'),
      completeSpacedReview: (srId, payload) => httpClient.post(`/me/spaced-repetition/${srId}/complete`, payload),
      getHistory: () => httpClient.get('/me/activity-history')
    },
    gamification: {
      getDashboardStats: () => httpClient.get('/me/gamification'),
      getLeaderboard: () => httpClient.get('/leaderboard'),
      getQuestsAndAchievements: () => httpClient.get('/me/quests-achievements'),
      claimQuestReward: (questId, { idempotencyKey } = {}) =>
        httpClient.post(`/me/quests/${questId}/claim`, {}, { idempotencyKey })
    },
    school: {
      getDashboard: () => httpClient.get('/school/dashboard'),
      listStudents: () => httpClient.get('/school/students'),
      addStudent: (payload) => httpClient.post('/school/students', payload),
      listWorkedSubmissions: () => httpClient.get('/school/worked-submissions'),
      gradeWorkedSubmission: (submissionId, payload) =>
        httpClient.post(`/school/worked-submissions/${submissionId}/grade`, payload),
      listCounselingSignals: () => httpClient.get('/school/counseling-signals'),
      addCounselingNote: (signalId, payload) =>
        httpClient.post(`/school/counseling-signals/${signalId}/notes`, payload),
      getParentLinkedChildren: (targetStudentId) =>
        httpClient.get('/parent/children', { query: targetStudentId ? { studentId: targetStudentId } : undefined }),
      listCustomRoles: () => httpClient.get('/school/roles'),
      createCustomRole: (payload) => httpClient.post('/school/roles', payload)
    },
    platformAdmin: {
      getOverview: () => httpClient.get('/admin/overview'),
      updateInstitutionStatus: (tenantId, payload) =>
        httpClient.patch(`/admin/institutions/${tenantId}/status`, payload),
      listJourneyTemplatesAdmin: () => httpClient.get('/admin/journey-templates'),
      updateJourneyTemplateConfig: (templateId, patch) =>
        httpClient.patch(`/admin/journey-templates/${templateId}`, patch),
      listPlans: () => httpClient.get('/plans'),
      listAuditLogs: () => httpClient.get('/admin/audit-logs')
    },
    media: {
      mockUploadFile: (payload) => httpClient.post('/question-media/presign', payload),
      uploadQuestionMedia: (payload) => httpClient.post('/question-media/presign', payload)
    },
    notification: {
      list: () => httpClient.get('/me/notifications'),
      markAsRead: (notificationId) => httpClient.post(`/me/notifications/${notificationId}/read`)
    }
  };
}
