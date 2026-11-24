# Rencana Implementasi Database EduMotion (PostgreSQL)

**Target Lokasi Migrasi (Phase 3):** `apps/api/migrations/` (`001_canonical_schema.sql`, `002_indexes_and_guards.sql`)  
**Model Acuan:** [CANONICAL-DATA-MODEL.md](file:///d:/Experimen/edumotion-comprehensive-review/docs/CANONICAL-DATA-MODEL.md)

---

## 1. Pengelompokan Entitas & Kunci Integritas

1. **Identitas, Tenant & Kontrol Akses:**
   - `tenants(id PK, name, status CHECK active|pending_verification|suspended, tier, academic_year, audit_notes, created_at)`
   - `users(id PK, email UNIQUE, password_hash, display_name, initials, role, tenant_id FK, education_level, curriculum_id, grade_level_id, entitlement, is_minor, privacy_opt_in_public_name, assigned_class_ids JSONB, permissions JSONB, custom_role_ids JSONB, title, description, created_at)`
   - `auth_refresh_tokens(id PK, user_id FK, token_hash UNIQUE, expires_at, revoked_at, replaced_by_id, created_at)`
   - `parent_student_links(parent_user_id FK, student_user_id FK, relationship, verified_at, PRIMARY KEY (parent_user_id, student_user_id))`
   - `school_classes`, `school_custom_roles`, `school_students`, `school_calendar_events`
2. **Taksonomi Kurikulum & Hierarki Pembelajaran Tunggal:**
   - `curricula` → `curriculum_versions` → `subjects`, `grade_levels`, `topics`, `competencies`, `curriculum_competency_mappings`
   - `learning_paths` → `learning_path_competencies`
   - `journey_chapters` (`UNIQUE (path_id, sequence)`) → `journey_nodes` (`UNIQUE (chapter_id, sequence)`) → `node_activity_mappings` → `activities`
3. **Bank Soal Berversi, Review SME, Media & AI Authoring:**
   - `questions` → `question_versions` (`UNIQUE (question_id, version)`, `payload_json JSONB`, `governance_status`, `tenant_id`, `published_at`)
   - `activity_question_mappings(activity_id, question_version_id, sequence, weight)`
   - `question_reviews`, `question_media(id, storage_key UNIQUE, mime_type, size_bytes, alt_text, width, height, uploaded_by, created_at)`
   - `ai_generation_runs`, `ai_generation_items(id, run_id FK, status, attempt_count, generation_json, validation_report_json, payload_json, accepted_question_id)`
4. **Progres Learner, Mastery, Gamifikasi & Journey Snapshot:**
   - `journey_template_catalog`, `journey_chapter_snapshots(id, user_id FK, chapter_id FK, template_id FK, template_version, selection_mode, selection_reason_json, layout_snapshot_json, fallback_notice, created_at, UNIQUE (user_id, chapter_id))`
   - `user_journey_preferences(user_id PK, selection_mode, preferred_template_id, pending_template_id, updated_at)`
   - `journey_template_unlocks`, `user_node_progress(PRIMARY KEY (user_id, node_id))`, `user_chapter_progress(PRIMARY KEY (user_id, chapter_id))`, `progression_unlock_events`
   - `activity_attempts`, `competency_mastery_current(PRIMARY KEY (user_id, competency_id))`, `competency_mastery_evidence`, `spaced_repetition_schedules`
   - `xp_ledger(id PK, user_id FK, amount INT, direction CHECK credit|debit_compensation, source_type, source_id, reason, idempotency_key, created_at, UNIQUE (user_id, idempotency_key))` — **dilindungi trigger append-only PostgreSQL**
   - `achievements`, `user_achievements(PRIMARY KEY (user_id, achievement_id))`, `quests`, `user_quest_claims(PRIMARY KEY (user_id, quest_id))`, `user_streaks`
5. **Ujian Formal, Sekolah/BK, Notifikasi, Audit & Transactional Outbox:**
   - `assessment_blueprints`, `assessments`, `assessment_question_snapshots`, `assessment_sessions`, `assessment_responses(PRIMARY KEY (session_id, snapshot_id))`, `assessment_results(session_id PK)`
   - `worked_solution_submissions`, `counseling_signals`, `counseling_notes`, `subscription_plans`, `notifications`
   - `audit_logs(id PK, actor_user_id, actor_role, action, target_id, tenant_id, reason, correlation_id, created_at)` — **dilindungi trigger append-only PostgreSQL**
   - `idempotency_records(scope_key, idempotency_key, status_code, response_json, created_at, PRIMARY KEY (scope_key, idempotency_key))`
   - `outbox_events(id PK, event_name, event_version, aggregate_type, aggregate_id, tenant_id, user_id, correlation_id, payload_json, status, attempts, last_error, created_at, processed_at)`
   - `processed_events(consumer_name, event_id, processed_at, PRIMARY KEY (consumer_name, event_id))`

## 2. Boundary Transaksi, Isolasi & Retensi
- **Transaksi ACID:** Pembukaan chapter baru + penulisan snapshot, penyelesaian node + pengakuan XP ledger + outbox, submit ujian + kalkulasi nilai + penulisan `assessment_results`, dan accept AI draft dikerjakan dalam `BEGIN ... COMMIT` dengan `ROLLBACK` otomatis bila langkah mana pun gagal.
- **Immutability Enforced by Trigger DB (`002_indexes_and_guards.sql`):** Trigger `BEFORE UPDATE OR DELETE` pada `xp_ledger` dan `audit_logs` mengangkat exception PostgreSQL sehingga manipulasi atau penghapusan ledger/audit langsung dari SQL ditolak keras.
- **Migrasi Aditif & Rollback/Forward-Fix:** Setiap skrip migrasi dicatat di tabel `schema_migrations(filename PK, checksum, applied_at)`. Skrip `001` dan `002` bersifat aditif aman; perbaikan ke depan memakai migrasi tambahan bernomor urut (`003_...`) dan prosedur pemulihan penuh memakai `backup-restore.js`.
- **Minimasi Privasi:** `audit_logs` dan `outbox_events` tidak menyimpan kata sandi, token, maupun answer key soal.
