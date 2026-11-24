# Canonical Data Model & Migration Notes

## Domain hierarchy

`curricula → subjects → learning_paths → journey_chapters → journey_nodes → activities → question_versions`

Competency mastery is cross-cutting and keyed by learner + competency. Gamification is cross-cutting and uses an immutable XP ledger. Journey template selection is chapter-scoped.

## Core tables

### Curriculum/content
- `curricula(id, code, name, status)`
- `curriculum_versions(id, curriculum_id, version, effective_from, status)`
- `subjects(id, code, name)`
- `grade_levels(id, education_level, grade_code, display_name)`
- `topics(id, subject_id, parent_id, code, name)`
- `competencies(id, topic_id, code, description)`
- `curriculum_competency_mappings(id, curriculum_version_id, competency_id, grade_level_id, reference_code)`

### Learning path
- `learning_paths(id, subject_id, curriculum_version_id, grade_level_id, title, version, status)`
- `learning_path_competencies(path_id, competency_id, sequence, required)`
- `journey_chapters(id, path_id, sequence, title, status, published_version, started_at, completed_at)`
- `journey_nodes(id, chapter_id, sequence, kind, title, prerequisite_policy_json, layout_key, status)`
- `node_activity_mappings(node_id, activity_id, sequence, required)`

### Activities and questions
- `activities(id, type, title, policy_json, status, version)`
- `activity_question_mappings(activity_id, question_version_id, sequence, weight)`
- `questions(id, tenant_id, owner_id, current_version, status)`
- `question_versions(id, question_id, version, schema_version, payload_json, published_at, created_by)`
- `question_media(id, question_version_id, storage_key, media_type, alt_text, checksum)`

### Learner evidence and progression
- `activity_attempts(id, user_id, activity_id, activity_version, status, score, submitted_at, idempotency_key)`
- `competency_mastery_current(user_id, competency_id, score, confidence, evidence_count, updated_at)`
- `competency_mastery_evidence(id, user_id, competency_id, attempt_id, evidence_weight, correctness, difficulty, hint_used, occurred_at)`
- `user_node_progress(user_id, node_id, status, started_at, completed_at, best_score, attempt_count)`
- `user_chapter_progress(user_id, chapter_id, status, started_at, completed_at)`
- `progression_unlock_events(id, user_id, entity_type, entity_id, policy_version, evidence_snapshot, created_at)`

### Journey experience
- `journey_template_catalog(id, version, name, enabled, config_schema_version, compatibility_json, unlock_policy_json, priority_weight)`
- `journey_chapter_snapshots(id, user_id, chapter_id, template_id, template_version, selection_mode, selection_reason_json, layout_snapshot_json, created_at)`; unique `(user_id, chapter_id)`
- `user_journey_preferences(user_id, selection_mode, preferred_template_id, pending_template_id, updated_at)`
- `journey_template_unlocks(id, user_id, template_id, source, source_reference_id, starts_at, expires_at, created_at)`

### Gamification
- `xp_ledger(id, user_id, amount, direction, source_type, source_id, idempotency_key, created_at)`; unique `(user_id, idempotency_key)`
- `achievements(id, code, criteria_json, reward_json, version)`
- `user_achievements(user_id, achievement_id, earned_at, source_event_id)`
- `user_streaks(user_id, current_streak, best_streak, last_activity_date)`

### AI authoring
Use the existing AI Generator entities, but standardize all generated `question` payloads to `question-authoring-v1.schema.json`. Keep run/item/attempt/review tables tenant-scoped and auditable.

### Assessment
- `assessment_blueprints(id, tenant_id, title, policy_json, status)`
- `assessments(id, blueprint_id, version, status, published_at)`
- `assessment_question_snapshots(id, assessment_id, question_version_id, sequence, points, snapshot_json)`
- `assessment_sessions(id, assessment_id, user_id, started_at, expires_at, submitted_at, status, idempotency_key)`
- `assessment_responses(id, session_id, question_snapshot_id, response_json, saved_at, version)`
- `assessment_results(id, session_id, score, graded_at, release_at, result_json)`

## Important constraints and indexes

- UUID primary keys and FK constraints.
- Unique `(path_id, sequence)` for chapters; unique `(chapter_id, sequence)` for nodes.
- Unique `(user_id, node_id)` and `(user_id, chapter_id)` progress rows.
- Unique `(user_id, chapter_id)` template snapshot.
- Unique `(user_id, idempotency_key)` for XP and command deduplication.
- Index `(user_id, status)` for progress; `(chapter_id, sequence)` for nodes; `(tenant_id, status)` for content.
- Use `tenant_id` on tenant-owned authoring/assessment records and enforce scope in repositories/services.
- JSONB is for versioned flexible policies/configuration, not relational ownership or critical status fields.

## Migration strategy

1. Create canonical tables additively.
2. Backfill existing `learning_paths` and path levels into `learning_paths`, `journey_chapters`, and `journey_nodes` using a deterministic mapping.
3. Preserve old IDs in a migration cross-reference table.
4. Reconcile duplicate XP/progress rows before adding unique constraints.
5. Create template catalog and base unlock grants.
6. Create one chapter snapshot per active chapter, defaulting to `adventure` where no historical template exists.
7. Dual-read only during a bounded migration window; do not dual-write two independent progression engines indefinitely.
8. Verify counts, foreign keys, orphan rows, duplicate rewards, and learner progress samples.
9. Switch reads/writes to canonical services.
10. Retire old level/map-specific progression tables only after reconciliation and rollback window.

Do not run destructive migrations until data reconciliation and backup/restore tests pass.
