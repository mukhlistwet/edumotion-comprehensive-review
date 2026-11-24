import express from 'express';
import { asyncRoute, createApiMiddlewares } from './middlewares.js';

export function createApiV1Router(container, middlewareOptions = {}) {
  const { services, db, logger, repos, jwtSecret } = container;
  const router = express.Router();
  const mw = createApiMiddlewares({
    repos,
    jwtSecret,
    logger,
    ...middlewareOptions
  });

  router.use(mw.correlationAndHeaders);
  router.use(mw.strictCors);
  router.use(mw.rateLimiter);
  router.use(mw.jsonParser);
  router.use(mw.authParser);

  // Ops & Health
  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: '@edumotion/api', timestamp: new Date().toISOString() });
  });
  router.get(
    '/ready',
    asyncRoute(async (_req, res) => {
      await db.query('SELECT 1');
      const outboxRes = await db.query(`SELECT COUNT(*)::int AS cnt FROM outbox_events WHERE status IN ('pending', 'retry_scheduled')`);
      res.json({ ready: true, dialect: db.dialect, pendingOutbox: outboxRes.rows[0].cnt });
    })
  );
  router.get('/metrics', (_req, res) => {
    res.json(logger.getMetrics());
  });

  // Auth & Profile
  router.get('/auth/demo-personas', asyncRoute(async (_req, res) => res.json(await services.auth.listPersonas())));
  router.get('/auth/session', asyncRoute(async (req, res) => res.json(await services.auth.getSession(req.ctx))));
  router.post('/auth/login', asyncRoute(async (req, res) => res.json(await services.auth.loginWithCredentials(req.body || {}))));
  router.post('/auth/demo-login', asyncRoute(async (req, res) => res.json(await services.auth.loginAsPersona(req.body || {}))));
  router.post('/auth/refresh', asyncRoute(async (req, res) => res.json(await services.auth.refreshTokens(req.body || {}))));
  router.post('/auth/register', asyncRoute(async (req, res) => res.status(201).json(await services.auth.register(req.body || {}))));
  router.post('/auth/forgot-password', asyncRoute(async (req, res) => res.json(await services.auth.requestPasswordReset(req.body || {}))));
  router.post('/auth/reset-password', asyncRoute(async (req, res) => res.json(await services.auth.resetPassword(req.body || {}))));
  router.post('/auth/logout', asyncRoute(async (req, res) => res.json(await services.auth.logout(req.ctx, req.body || {}))));
  router.post('/me/entitlements/upgrade', asyncRoute(async (req, res) => res.json(await services.auth.upgradeEntitlement(req.ctx, req.body || {}))));
  router.patch('/me/profile', asyncRoute(async (req, res) => res.json(await services.auth.updateProfile(req.ctx, req.body || {}))));

  // Journey Experience
  router.get('/journey-templates', asyncRoute(async (req, res) => res.json(await services.journey.listTemplates(req.ctx))));
  router.get('/me/journey/preferences', asyncRoute(async (req, res) => res.json(await services.journey.getPreferences(req.ctx))));
  router.put('/me/journey/preferences', asyncRoute(async (req, res) => res.json(await services.journey.updatePreferences(req.ctx, req.body || {}))));
  router.put('/me/journey/preferences/pending-template', asyncRoute(async (req, res) => res.json(await services.journey.setPendingTemplate(req.ctx, req.body || {}))));
  router.get('/me/journey/template-unlocks', asyncRoute(async (req, res) => res.json(await services.journey.getUnlocks(req.ctx))));
  router.get(
    '/journeys/:journeyId/chapters/:chapterId',
    asyncRoute(async (req, res) => res.json(await services.journey.getChapterMap(req.ctx, req.params.journeyId, req.params.chapterId, req.query)))
  );
  router.get(
    '/journeys/:journeyId/chapters/:chapterId/map',
    asyncRoute(async (req, res) => res.json(await services.journey.getChapterMap(req.ctx, req.params.journeyId, req.params.chapterId, req.query)))
  );
  router.post(
    '/journeys/:journeyId/nodes/:nodeId/start',
    asyncRoute(async (req, res) => res.json(await services.journey.startNode(req.ctx, req.params.journeyId, req.params.nodeId)))
  );
  router.post(
    '/journeys/:journeyId/nodes/:nodeId/complete',
    asyncRoute(async (req, res) =>
      res.json(
        await services.journey.completeNode(req.ctx, req.params.journeyId, req.params.nodeId, {
          idempotencyKey: req.get('Idempotency-Key') || req.body?.idempotencyKey
        })
      )
    )
  );
  router.post(
    '/journeys/:journeyId/chapters/next',
    asyncRoute(async (req, res) =>
      res.json(
        await services.journey.startNextChapter(req.ctx, req.params.journeyId, {
          ...(req.body || {}),
          idempotencyKey: req.get('Idempotency-Key') || req.body?.idempotencyKey
        })
      )
    )
  );
  router.put(
    '/journeys/chapters/:chapterId/snapshot',
    asyncRoute(async (req, res) => res.json(await services.journey.rejectSnapshotMutation(req.ctx, req.params.chapterId)))
  );

  // Learning & Interactive Questions
  router.get('/question-taxonomies', asyncRoute(async (_req, res) => res.json(await services.learning.getTaxonomy())));
  router.get('/learning-paths', asyncRoute(async (req, res) => res.json(await services.learning.listPaths(req.query))));
  router.get('/learning-paths/:pathId', asyncRoute(async (req, res) => res.json(await services.learning.getLearningPathById(req.params.pathId))));
  router.get(
    '/learning-paths/:pathId/chapters',
    asyncRoute(async (req, res) => {
      const lp = await services.learning.getLearningPathById(req.params.pathId);
      res.json(lp.chapters);
    })
  );
  router.get('/activities', asyncRoute(async (_req, res) => res.json(await services.learning.listActivities())));
  router.get('/activities/gallery', asyncRoute(async (_req, res) => res.json(await services.learning.listInteractiveGallery())));
  router.post('/activities/gallery/:questionId/grade', asyncRoute(async (req, res) => res.json(await services.learning.gradeGalleryPreview(req.params.questionId, req.body || {}))));
  router.get('/activities/:activityId/delivery', asyncRoute(async (req, res) => res.json(await services.learning.getActivityDelivery(req.ctx, req.params.activityId))));
  router.post(
    '/activities/:activityId/attempts',
    asyncRoute(async (req, res) =>
      res.json(
        await services.learning.submitPracticeAttempt(req.ctx, req.params.activityId, {
          ...(req.body || {}),
          idempotencyKey: req.get('Idempotency-Key') || req.body?.idempotencyKey
        })
      )
    )
  );
  router.get('/questions/:questionId/hints', asyncRoute(async (req, res) => res.json(await services.learning.getQuestionHint(req.ctx, req.params.questionId, req.query.index))));

  // Question Bank & Authoring
  router.get('/questions', asyncRoute(async (req, res) => res.json(await services.question.list(req.ctx, req.query))));
  router.post('/questions', asyncRoute(async (req, res) => res.status(201).json(await services.question.createDraft(req.ctx, req.body || {}))));
  router.post('/questions/validate', asyncRoute(async (req, res) => res.json(await services.question.validateQuestion(req.ctx, req.body || {}))));
  router.post('/questions/preview', asyncRoute(async (req, res) => res.json(await services.question.previewAsStudent(req.ctx, req.body?.question || req.body, req.body?.mode || 'practice'))));
  router.get('/questions/:questionId', asyncRoute(async (req, res) => res.json(await services.question.getById(req.ctx, req.params.questionId, req.query.version))));
  router.patch('/questions/:questionId', asyncRoute(async (req, res) => res.json(await services.question.updateDraft(req.ctx, req.params.questionId, req.body || {}))));
  router.post('/questions/:questionId/validate', asyncRoute(async (req, res) => {
    const detail = await services.question.getById(req.ctx, req.params.questionId);
    res.json(detail.validation);
  }));
  router.post('/questions/:questionId/preview', asyncRoute(async (req, res) => {
    const detail = await services.question.getById(req.ctx, req.params.questionId);
    res.json(await services.question.previewAsStudent(req.ctx, detail.question, req.body?.mode || 'practice'));
  }));
  router.post('/questions/:questionId/submit-review', asyncRoute(async (req, res) => res.json(await services.question.submitForReview(req.ctx, req.params.questionId))));
  router.post('/questions/:questionId/reviews', asyncRoute(async (req, res) => res.json(await services.question.reviewQuestion(req.ctx, req.params.questionId, req.body || {}))));
  router.post('/questions/:questionId/approve', asyncRoute(async (req, res) => res.json(await services.question.reviewQuestion(req.ctx, req.params.questionId, { decision: 'approve', comment: req.body?.comment || '' }))));
  router.post(
    '/questions/:questionId/publish',
    asyncRoute(async (req, res) =>
      res.json(await services.question.publishQuestion(req.ctx, req.params.questionId, { idempotencyKey: req.get('Idempotency-Key') || req.body?.idempotencyKey }))
    )
  );
  router.post('/questions/:questionId/new-version', asyncRoute(async (req, res) => res.status(201).json(await services.question.createNewVersion(req.ctx, req.params.questionId))));
  router.post('/questions/:questionId/archive', asyncRoute(async (req, res) => res.json(await services.question.archiveQuestion(req.ctx, req.params.questionId))));
  router.post('/question-media/presign', asyncRoute(async (req, res) => res.status(201).json(await services.question.uploadQuestionMedia(req.ctx, req.body || {}))));

  // AI Question Generator
  router.get('/ai/question-generation-stages', (_req, res) => res.json(services.aiGenerator.getStages()));
  router.get('/ai/question-generation-runs', asyncRoute(async (req, res) => res.json(await services.aiGenerator.listRuns(req.ctx))));
  router.post('/ai/question-generation-runs', asyncRoute(async (req, res) => res.status(201).json(await services.aiGenerator.createRun(req.ctx, req.body || {}))));
  router.get('/ai/question-generation-runs/:runId', asyncRoute(async (req, res) => res.json(await services.aiGenerator.getRun(req.ctx, req.params.runId))));
  router.post('/ai/question-generation-runs/:runId/cancel', asyncRoute(async (req, res) => res.json(await services.aiGenerator.cancelRun(req.ctx, req.params.runId))));
  router.get('/ai/question-generation-runs/:runId/items', asyncRoute(async (req, res) => res.json(await services.aiGenerator.listRunItems(req.ctx, req.params.runId))));
  router.get('/ai/question-generation-items/:itemId', asyncRoute(async (req, res) => res.json(await services.aiGenerator.getItem(req.ctx, req.params.itemId))));
  router.post('/ai/question-generation-items/:itemId/accept', asyncRoute(async (req, res) => res.json(await services.aiGenerator.acceptItemToDraft(req.ctx, req.params.itemId))));
  router.post('/ai/question-generation-items/:itemId/reject', asyncRoute(async (req, res) => res.json(await services.aiGenerator.rejectItem(req.ctx, req.params.itemId, req.body?.reason))));
  router.post('/ai/question-generation-items/:itemId/retry', asyncRoute(async (req, res) => res.json(await services.aiGenerator.retryItem(req.ctx, req.params.itemId))));

  // Assessment & Formal Exam
  router.get('/assessments', asyncRoute(async (req, res) => res.json(await services.assessment.listAssessments(req.ctx))));
  router.post(
    '/assessments/:assessmentId/sessions',
    asyncRoute(async (req, res) =>
      res.json(await services.assessment.startSession(req.ctx, req.params.assessmentId, { idempotencyKey: req.get('Idempotency-Key') || req.body?.idempotencyKey }))
    )
  );
  router.get('/assessment-sessions/:sessionId', asyncRoute(async (req, res) => res.json(await services.assessment.getSession(req.ctx, req.params.sessionId))));
  router.put(
    '/assessment-sessions/:sessionId/responses/:questionSnapshotId',
    asyncRoute(async (req, res) =>
      res.json(
        await services.assessment.autosaveResponse(req.ctx, req.params.sessionId, req.params.questionSnapshotId, {
          ...(req.body || {}),
          idempotencyKey: req.get('Idempotency-Key') || req.body?.idempotencyKey
        })
      )
    )
  );
  router.post(
    '/assessment-sessions/:sessionId/submit',
    asyncRoute(async (req, res) =>
      res.json(await services.assessment.submitSession(req.ctx, req.params.sessionId, { idempotencyKey: req.get('Idempotency-Key') || req.body?.idempotencyKey }))
    )
  );
  router.get('/assessment-sessions/:sessionId/result', asyncRoute(async (req, res) => res.json(await services.assessment.getResult(req.ctx, req.params.sessionId))));

  // Mastery, History, Gamification & Notifications
  router.get('/me/mastery', asyncRoute(async (req, res) => res.json(await services.learning.getMasteryOverview(req.ctx))));
  router.post('/me/spaced-repetition/:srId/complete', asyncRoute(async (req, res) => res.json(await services.learning.completeSpacedReview(req.ctx, req.params.srId, req.body || {}))));
  router.get('/me/activity-history', asyncRoute(async (req, res) => res.json(await services.learning.getHistory(req.ctx))));
  router.get('/me/gamification', asyncRoute(async (req, res) => res.json(await services.gamification.getDashboardStats(req.ctx))));
  router.get('/leaderboard', asyncRoute(async (req, res) => res.json(await services.gamification.getLeaderboard(req.ctx))));
  router.get('/me/quests-achievements', asyncRoute(async (req, res) => res.json(await services.gamification.getQuestsAndAchievements(req.ctx))));
  router.post(
    '/me/quests/:questId/claim',
    asyncRoute(async (req, res) =>
      res.json(await services.gamification.claimQuestReward(req.ctx, req.params.questId, { idempotencyKey: req.get('Idempotency-Key') || req.body?.idempotencyKey }))
    )
  );
  router.get('/me/notifications', asyncRoute(async (req, res) => res.json(await services.gamification.listNotifications(req.ctx))));
  router.post('/me/notifications/:notificationId/read', asyncRoute(async (req, res) => res.json(await services.gamification.markNotificationRead(req.ctx, req.params.notificationId))));

  // School & Parent Portal
  router.get('/school/dashboard', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.getSchoolDashboard(req.ctx))));
  router.get('/school/students', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.listStudents(req.ctx))));
  router.post('/school/students', asyncRoute(async (req, res) => res.status(201).json(await services.schoolAdmin.addStudent(req.ctx, req.body || {}))));
  router.get('/school/worked-submissions', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.listWorkedSubmissions(req.ctx))));
  router.post('/school/worked-submissions/:submissionId/grade', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.gradeWorkedSubmission(req.ctx, req.params.submissionId, req.body || {}))));
  router.get('/school/counseling-signals', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.listCounselingSignals(req.ctx))));
  router.post('/school/counseling-signals/:signalId/notes', asyncRoute(async (req, res) => res.status(201).json(await services.schoolAdmin.addCounselingNote(req.ctx, req.params.signalId, req.body || {}))));
  router.get('/parent/children', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.getParentLinkedChildren(req.ctx, req.query.studentId || null))));
  router.get('/school/roles', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.listCustomRoles(req.ctx))));
  router.post('/school/roles', asyncRoute(async (req, res) => res.status(201).json(await services.schoolAdmin.createCustomRole(req.ctx, req.body || {}))));

  // Platform Admin
  router.get('/admin/overview', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.getPlatformOverview(req.ctx))));
  router.patch('/admin/institutions/:tenantId/status', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.updateInstitutionStatus(req.ctx, req.params.tenantId, req.body || {}))));
  router.get('/admin/journey-templates', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.listJourneyTemplatesAdmin(req.ctx))));
  router.patch('/admin/journey-templates/:templateId', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.updateJourneyTemplateConfig(req.ctx, req.params.templateId, req.body || {}))));
  router.get('/plans', asyncRoute(async (_req, res) => res.json(await services.schoolAdmin.listPlans())));
  router.get('/admin/audit-logs', asyncRoute(async (req, res) => res.json(await services.schoolAdmin.listAuditLogs(req.ctx))));

  router.use(mw.notFoundHandler);
  router.use(mw.errorHandler);

  return router;
}
