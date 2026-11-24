import curriculaTaxonomy from './curricula-taxonomy.json' with { type: 'json' };
import personasUsersTenants from './personas-users-tenants.json' with { type: 'json' };
import learningPathsJourneys from './learning-paths-journeys.json' with { type: 'json' };
import questionsBank from './questions-bank.json' with { type: 'json' };
import activitiesAssessments from './activities-assessments.json' with { type: 'json' };
import masteryGamification from './mastery-gamification.json' with { type: 'json' };
import aiGenerationRuns from './ai-generation-runs.json' with { type: 'json' };
import schoolPlatformAdmin from './school-platform-admin.json' with { type: 'json' };

export const FIXTURES_V1 = {
  curriculaTaxonomy,
  personasUsersTenants,
  learningPathsJourneys,
  questionsBank,
  activitiesAssessments,
  masteryGamification,
  aiGenerationRuns,
  schoolPlatformAdmin
};

export default FIXTURES_V1;
