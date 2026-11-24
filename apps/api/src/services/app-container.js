import { createSqlRepositories } from '../repositories/sql-repositories.js';
import { createLogger } from '../security/logger.js';
import { createAuthService } from './auth-service.js';
import { createJourneyService } from './journey-service.js';
import { createLearningService } from './learning-service.js';
import { createQuestionService } from './question-service.js';
import { createAiService } from './ai-service.js';
import { createAssessmentService } from './assessment-service.js';
import { createGamificationService } from './gamification-service.js';
import { createSchoolAdminService } from './school-admin-service.js';

export function createAppContainer({
  db,
  jwtSecret = process.env.JWT_SECRET || 'edumotion-local-dev-signing-secret-replace-in-prod',
  allowDemoPersonaLogin = process.env.ALLOW_DEMO_PERSONA_LOGIN !== 'false',
  silentLogs = false
}) {
  const logger = createLogger({ silent: silentLogs });
  const repos = createSqlRepositories(db);

  return {
    db,
    repos,
    logger,
    jwtSecret,
    services: {
      auth: createAuthService({ repos, db, jwtSecret, allowDemoPersonaLogin }),
      journey: createJourneyService({ repos, db }),
      learning: createLearningService({ repos, db }),
      question: createQuestionService({ repos, db }),
      aiGenerator: createAiService({ repos, db }),
      assessment: createAssessmentService({ repos, db }),
      gamification: createGamificationService({ db }),
      schoolAdmin: createSchoolAdminService({ repos, db })
    }
  };
}
