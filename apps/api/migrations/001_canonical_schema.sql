-- EduMotion Canonical PostgreSQL Schema (Migration 001)
-- Single progression model, versioned questions, immutable snapshots, append-only XP & audit, transactional outbox.

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  city TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'pending_verification', 'suspended')),
  user_count INTEGER NOT NULL DEFAULT 0,
  ai_monthly_budget_usd NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  ai_spent_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  academic_year TEXT NOT NULL DEFAULT '2026/2027',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  role TEXT NOT NULL,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  education_level TEXT,
  curriculum_id TEXT DEFAULT 'cur_merdeka',
  grade_level_id TEXT,
  class_id TEXT,
  entitlement TEXT NOT NULL DEFAULT 'freemium',
  is_minor BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_opt_in_public_name BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_class_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_subject_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_role_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parent_student_links (
  parent_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'parent',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (parent_user_id, student_user_id)
);

CREATE TABLE IF NOT EXISTS school_classes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  homeroom_teacher TEXT,
  student_count INTEGER NOT NULL DEFAULT 0,
  active_count INTEGER NOT NULL DEFAULT 0,
  avg_mastery NUMERIC(5, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS school_custom_roles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Curriculum & Canonical Hierarchy
CREATE TABLE IF NOT EXISTS curricula (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS curriculum_versions (
  id TEXT PRIMARY KEY,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  effective_from DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE (curriculum_id, version)
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS grade_levels (
  id TEXT PRIMARY KEY,
  education_level TEXT NOT NULL CHECK (education_level IN ('SD', 'SMP', 'SMA', 'UNIVERSITY')),
  grade_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS competencies (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_competency_mappings (
  id TEXT PRIMARY KEY,
  curriculum_version_id TEXT NOT NULL REFERENCES curriculum_versions(id) ON DELETE CASCADE,
  competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  grade_level_id TEXT NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  reference_code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY,
  journey_id TEXT NOT NULL UNIQUE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  curriculum_version_id TEXT NOT NULL REFERENCES curriculum_versions(id) ON DELETE CASCADE,
  grade_level_id TEXT NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  education_level TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS learning_path_competencies (
  path_id TEXT NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (path_id, competency_id)
);

CREATE TABLE IF NOT EXISTS journey_chapters (
  id TEXT PRIMARY KEY,
  journey_id TEXT NOT NULL,
  path_id TEXT NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  title TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  education_level TEXT NOT NULL,
  dominant_activity_kind TEXT NOT NULL DEFAULT 'practice',
  status TEXT NOT NULL CHECK (status IN ('planned', 'available', 'in_progress', 'completed', 'archived')),
  published_version INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (path_id, sequence)
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'challenge', 'tryout', 'formal_exam')),
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  xp_reward INTEGER NOT NULL DEFAULT 30,
  hearts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'published',
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS journey_nodes (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES journey_chapters(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  prerequisite_node_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  activity_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  reward_preview_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  level_milestone_badge INTEGER NOT NULL DEFAULT 0,
  UNIQUE (chapter_id, sequence)
);

CREATE TABLE IF NOT EXISTS node_activity_mappings (
  node_id TEXT NOT NULL REFERENCES journey_nodes(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (node_id, activity_id)
);

-- Versioned Questions & Media
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('draft', 'validation_failed', 'in_review', 'approved', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_versions (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  schema_version TEXT NOT NULL DEFAULT 'edumotion-question-v1',
  type TEXT NOT NULL,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  governance_status TEXT NOT NULL CHECK (governance_status IN ('draft', 'validation_failed', 'in_review', 'approved', 'published', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'tenant',
  payload_json JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (question_id, version)
);

CREATE TABLE IF NOT EXISTS activity_question_mappings (
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_version INTEGER NOT NULL DEFAULT 1,
  sequence INTEGER NOT NULL,
  weight NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (activity_id, question_id, question_version)
);

CREATE TABLE IF NOT EXISTS question_reviews (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_version INTEGER NOT NULL DEFAULT 1,
  reviewer_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'request_changes')),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_media (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL DEFAULT '',
  checksum_sha256 TEXT NOT NULL,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Template Catalog, Immutable Chapter Snapshots & User Progress
CREATE TABLE IF NOT EXISTS journey_template_catalog (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  name TEXT NOT NULL,
  base BOOLEAN NOT NULL DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  priority_weight INTEGER NOT NULL DEFAULT 0,
  config_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS user_journey_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  selection_mode TEXT NOT NULL CHECK (selection_mode IN ('adaptive', 'personal', 'random', 'admin')),
  preferred_template_id TEXT REFERENCES journey_template_catalog(id),
  pending_template_id TEXT REFERENCES journey_template_catalog(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journey_chapter_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES journey_chapters(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES journey_template_catalog(id),
  template_version TEXT NOT NULL,
  selection_mode TEXT NOT NULL,
  selection_reason_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  layout_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  fallback_notice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, chapter_id)
);

CREATE TABLE IF NOT EXISTS journey_template_unlocks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES journey_template_catalog(id),
  source TEXT NOT NULL,
  source_reference_id TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, template_id)
);

CREATE TABLE IF NOT EXISTS user_node_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL REFERENCES journey_nodes(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  best_score INTEGER DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, node_id)
);

CREATE TABLE IF NOT EXISTS user_chapter_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES journey_chapters(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, chapter_id)
);

-- Learner Evidence, Mastery, Spaced Repetition & Gamification
CREATE TABLE IF NOT EXISTS activity_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id),
  question_version INTEGER NOT NULL DEFAULT 1,
  correct BOOLEAN NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 10,
  hint_used BOOLEAN NOT NULL DEFAULT FALSE,
  response_json JSONB,
  idempotency_key TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competency_mastery_evidence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_version INTEGER NOT NULL DEFAULT 1,
  correct BOOLEAN NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  hint_used BOOLEAN NOT NULL DEFAULT FALSE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competency_mastery_current (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  confidence NUMERIC(4, 2) NOT NULL DEFAULT 0,
  distinct_question_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, competency_id)
);

CREATE TABLE IF NOT EXISTS spaced_repetition_schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency_id TEXT NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  stage_index INTEGER NOT NULL DEFAULT 0,
  interval_days INTEGER NOT NULL DEFAULT 1,
  next_review_at TIMESTAMPTZ NOT NULL,
  recommended_activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS xp_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit_compensation')),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS user_gamification_meta (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  streak_days INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  hearts INTEGER NOT NULL DEFAULT 5,
  max_hearts INTEGER NOT NULL DEFAULT 5,
  gems INTEGER NOT NULL DEFAULT 0,
  daily_xp_target INTEGER NOT NULL DEFAULT 30,
  daily_xp_earned INTEGER NOT NULL DEFAULT 0,
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  league TEXT NOT NULL DEFAULT 'Liga Safir',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  unlocks_template_id TEXT REFERENCES journey_template_catalog(id)
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  cadence TEXT NOT NULL,
  title TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  progress_count INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 25,
  reward_gems INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS user_quest_claims (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, quest_id)
);

CREATE TABLE IF NOT EXISTS activity_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mode TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Generation Runs & Items
CREATE TABLE IF NOT EXISTS ai_generation_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  progress_pct INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
  actual_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
  budget_cap_usd NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
  max_retries INTEGER NOT NULL DEFAULT 2,
  brief_json JSONB NOT NULL,
  audit_trail_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_generation_items (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES ai_generation_runs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'generating', 'validating', 'needs_review', 'accepted', 'rejected', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  generation_json JSONB NOT NULL,
  validation_report_json JSONB NOT NULL,
  question_json JSONB,
  accepted_question_id TEXT
);

-- Assessments & Formal Exam Snapshots
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'challenge', 'tryout', 'formal_exam')),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  hearts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  xp_affects_grade BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_label TEXT,
  release_policy TEXT NOT NULL DEFAULT 'immediate_after_submit',
  release_at TIMESTAMPTZ,
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS assessment_sessions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'started', 'submitted', 'grading', 'graded', 'expired', 'cancelled', 'invalidated')),
  started_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  release_at TIMESTAMPTZ,
  snapshots_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_json JSONB
);

CREATE TABLE IF NOT EXISTS assessment_responses (
  session_id TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_snapshot_id TEXT NOT NULL,
  response_json JSONB,
  bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, question_snapshot_id)
);

CREATE TABLE IF NOT EXISTS assessment_results (
  session_id TEXT PRIMARY KEY REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  academic_score NUMERIC(6, 2) NOT NULL,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  release_at TIMESTAMPTZ,
  result_json JSONB NOT NULL
);

-- School, Parent, Notifications, Billing & Governance Operations
CREATE TABLE IF NOT EXISTS school_students (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nis TEXT NOT NULL,
  avg_mastery INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Aktif'
);

CREATE TABLE IF NOT EXISTS school_calendar_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_date TEXT NOT NULL,
  event_time TEXT NOT NULL,
  title TEXT NOT NULL,
  scope_label TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'blue'
);

CREATE TABLE IF NOT EXISTS worked_solution_submissions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  assessment_title TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_stem TEXT NOT NULL,
  student_answer TEXT NOT NULL,
  rubric_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  awarded_scores_json JSONB,
  reviewer_note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS counseling_signals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  signal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS counseling_notes (
  id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES counseling_signals(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  audience TEXT NOT NULL,
  price_idr INTEGER NOT NULL,
  features_json JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  tenant_id TEXT,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  correlation_id TEXT
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  scope_key TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope_key, idempotency_key)
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_version INTEGER NOT NULL DEFAULT 1,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT,
  user_id TEXT,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  correlation_id TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retry_scheduled', 'processed', 'dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS processed_events (
  consumer_name TEXT NOT NULL,
  event_id TEXT NOT NULL REFERENCES outbox_events(id) ON DELETE CASCADE,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (consumer_name, event_id)
);
