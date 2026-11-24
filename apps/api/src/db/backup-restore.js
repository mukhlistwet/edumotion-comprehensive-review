import crypto from 'node:crypto';

export const TABLES_IN_FK_ORDER = [
  'tenants',
  'users',
  'auth_refresh_tokens',
  'parent_student_links',
  'school_classes',
  'school_custom_roles',
  'curricula',
  'curriculum_versions',
  'subjects',
  'grade_levels',
  'topics',
  'competencies',
  'curriculum_competency_mappings',
  'learning_paths',
  'learning_path_competencies',
  'journey_chapters',
  'activities',
  'journey_nodes',
  'node_activity_mappings',
  'questions',
  'question_versions',
  'activity_question_mappings',
  'question_reviews',
  'question_media',
  'journey_template_catalog',
  'user_journey_preferences',
  'journey_chapter_snapshots',
  'journey_template_unlocks',
  'user_node_progress',
  'user_chapter_progress',
  'activity_attempts',
  'competency_mastery_evidence',
  'competency_mastery_current',
  'spaced_repetition_schedules',
  'xp_ledger',
  'user_gamification_meta',
  'achievements',
  'user_achievements',
  'quests',
  'user_quest_claims',
  'activity_history',
  'ai_generation_runs',
  'ai_generation_items',
  'assessments',
  'assessment_sessions',
  'assessment_responses',
  'assessment_results',
  'school_students',
  'school_calendar_events',
  'worked_solution_submissions',
  'counseling_signals',
  'counseling_notes',
  'subscription_plans',
  'notifications',
  'audit_logs',
  'idempotency_records',
  'outbox_events',
  'processed_events'
];

export async function exportDatabaseBackup(db) {
  const tables = {};
  const rowCounts = {};
  for (const table of TABLES_IN_FK_ORDER) {
    const res = await db.query(`SELECT * FROM ${table}`);
    tables[table] = res.rows;
    rowCounts[table] = res.rows.length;
  }
  const payload = {
    backupVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    rowCounts,
    tables
  };
  const checksumSha256 = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload.tables))
    .digest('hex');
  return { ...payload, checksumSha256 };
}

export async function restoreDatabaseBackup(targetDb, backupPayload) {
  const expectedChecksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(backupPayload.tables))
    .digest('hex');
  if (expectedChecksum !== backupPayload.checksumSha256) {
    throw new Error('BACKUP_CHECKSUM_MISMATCH');
  }

  await targetDb.transaction(async (tx) => {
    for (const table of TABLES_IN_FK_ORDER) {
      const rows = backupPayload.tables[table] || [];
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
        const vals = cols.map((c) => {
          const v = row[c];
          if (v instanceof Date) return v.toISOString();
          if (v !== null && typeof v === 'object') return JSON.stringify(v);
          return v;
        });
        await tx.query(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          vals
        );
      }
    }
  });

  const verification = {};
  for (const table of TABLES_IN_FK_ORDER) {
    const res = await targetDb.query(`SELECT COUNT(*)::int AS cnt FROM ${table}`);
    verification[table] = res.rows[0].cnt;
  }
  return { verified: true, rowCounts: verification };
}
