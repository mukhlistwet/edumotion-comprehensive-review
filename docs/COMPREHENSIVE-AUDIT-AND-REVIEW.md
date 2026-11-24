# EduMotion — Comprehensive Product & Technical Audit
## Review, consistency assessment, decisions, and remediation plan

**Review baseline:** all EduMotion artifacts currently present in this package  
**Status:** consolidated review; suitable as the source of truth for the next planning/implementation phase  
**Important:** this is a document and prototype review, not a security penetration test, load test, curriculum validation, or production code certification.

---

## 1. Executive assessment

EduMotion has a coherent product direction: a structured academic learning platform supported by interactive activities, a reusable question bank, AI-assisted authoring, assessment integrity, mastery tracking, and game-like progression.

The strongest existing decisions are:
- learning mastery is separate from XP and rewards;
- question authoring and student delivery payloads are separated;
- AI-generated questions are drafts and require deterministic validation plus human review;
- formal assessment has server-authoritative timing, autosave, immutable question snapshots, and no hearts;
- progression and rewards must be server-authoritative and idempotent;
- multiple map styles should be renderers over one shared progression model;
- the selected Journey template is fixed for the lifetime of a chapter and can change only at a chapter boundary.

The main issue is not a contradiction in product vision; it is **overlapping domain models and duplicated terminology** across the earlier artifacts. Several documents independently define a “path”, “level”, “chapter”, “node”, “activity”, and “progress” model. If implemented literally, these can produce parallel progression engines, duplicated state, and incompatible APIs.

**Recommendation:** consolidate the product around one canonical hierarchy and shared contracts before production implementation.

### Overall readiness

| Area | Assessment | Action |
|---|---|---|
| Product vision | Strong | Preserve |
| Visual design system | Good foundation | Add token contract and component governance |
| Question types and interactive UI | Broad coverage | Standardize one canonical question schema |
| Manual Question Builder | Good workflow | Align with shared schema and publishing lifecycle |
| AI Question Generator | Strong safety pipeline | Align payload and state enums with Question Builder |
| Achievement / progression | Good pedagogy | Merge with Journey Engine data model |
| Multi-template Journey Engine | Good product decision | Fix prototype interaction gaps; define canonical chapter snapshot |
| Admin Platform / School Admin | Good role concepts | Formalize tenant scope and permission matrix |
| Backend/API | Partially specified | Publish canonical endpoint and event contracts |
| Production readiness | Not ready yet | Requires schema, auth, migrations, tests, observability, and operational controls |

---

## 2. Scope reviewed

The package preserves and reviews these prior artifacts:

1. Product visual design and student frontend reference.
2. Platform Admin and School/Akademi Admin references.
3. Role and permission notes.
4. Quiz UI and assessment specification.
5. Interactive question gallery with 12 interaction patterns.
6. Manual Question Builder prototype and specification.
7. AI Question Generator prototype and specification.
8. Progressive Achievement Path prototype and specification.
9. Adventure Learning Map prototype and specification.
10. Journey Experience Engine multi-template prototype and specification.

The earlier individual ZIP packages are not nested inside this consolidated package because their extracted source files are included under `source-artifacts/`. This avoids redundant nested archives.

---

## 3. Key findings and consistency issues

### Finding F-01 — Multiple progression models overlap
**Severity: High**

The Achievement Path defines `learning_paths`, `learning_path_levels`, `user_level_progress`, and level unlocks. The Adventure Map adds map metadata to path/level records. The Journey Engine separately introduces `learning_journeys`, `journey_chapters`, `journey_nodes`, and `user_node_progress`.

If all three models are implemented literally, the same learner journey can have two or three independent sources of truth.

**Resolution**
- Keep one canonical hierarchy: `Curriculum → Subject → Learning Path → Chapter → Journey Node → Activity → Question`.
- Chapter is the instructional grouping and the unit at which a Journey template is snapshotted.
- Node is a presentational/progression checkpoint linked to one or more activities.
- Activity is the learning or assessment interaction.
- Competency mastery is tracked independently of map node completion.
- Retire the separate `learning_path_levels` progression engine. The earlier Level 0–10 concept may remain as a configurable badge/rank or milestone presentation, but it must not own a second unlock state machine.

### Finding F-02 — Template and progression responsibilities need a strict boundary
**Severity: High**

Some early map descriptions imply that map nodes themselves own unlocks, rewards, and progression. Journey Engine correctly says renderers are presentation-only.

**Resolution**
- Backend Progression Service owns prerequisites, node status, XP, mastery, and completion.
- Journey Template Engine chooses and renders a visual layout only.
- A renderer may display server-provided status but may not calculate or mutate it.
- Layout coordinates, route geometry, scenery, animation, and node skins are presentation configuration.

### Finding F-03 — Question schema has overlapping but not identical type names
**Severity: High**

Quiz, Manual Builder, and AI Generator use slightly different naming:
- `worked_solution` appears in quiz and AI context.
- `essay` / `worked_solution` appears in Manual Builder.
- Other types are largely aligned.

**Resolution**
Use one canonical enum:
`single_choice`, `multiple_select`, `true_false`, `numeric`, `short_text`, `fill_blank`, `matching`, `ordering`, `drag_drop`, `graph_plot`, `formula_input`, `diagram_label`, `simulation`, `worked_solution`.

Treat `essay` as a response mode / legacy alias for `worked_solution`, not a separate top-level question type. Store the alias mapping in migration/adapter code, not in new records.

### Finding F-04 — Question authoring, AI generation, and student delivery need one explicit schema boundary
**Severity: High**

The AI Generator says it reuses the Manual Builder schema, which is correct, but the contract should be formalized so generated payloads, authoring records, and student delivery cannot drift.

**Resolution**
- One versioned canonical Question Authoring Schema.
- AI generation output must validate against that schema.
- Student Delivery DTO is a separately constructed allowlisted projection.
- `answerSpec`, hidden scoring configuration, unreleased explanations, AI prompt/model provenance, reviewer notes, and answer keys must never be sent in student payloads.
- Question versions are immutable once published or included in an exam snapshot.

### Finding F-05 — Assessment mode terminology is not fully centralized
**Severity: Medium**

The quiz specification uses Practice, Challenge, Tryout/UTS/UAS. The Manual Builder has delivery settings. The question type itself should not determine the assessment rules.

**Resolution**
Separate:
- `question.type`: interaction contract;
- `activity.type`: learning activity orchestration;
- `assessment.mode`: practice/challenge/tryout/formal_exam;
- `delivery.policy`: hint, feedback, timer, revisit, autosave, and release policy.

Hearts are prohibited in formal exams. XP must never affect academic grade.

### Finding F-06 — Progress, mastery, level, and XP terminology can be misread
**Severity: High**

The documents correctly distinguish mastery and XP in principle, but the UI labels “Level” and progression path can make XP appear to be academic mastery.

**Resolution**
Use four distinct concepts:
1. **Activity progress:** completion state of activities/nodes.
2. **Competency mastery:** academic estimate, 0–100, with evidence and recency.
3. **Journey progress:** completed/available/locked checkpoints in a chapter/path.
4. **XP / player rank:** gamification rewards only.

Never derive mastery from XP or XP from mastery without an explicit reward policy.

### Finding F-07 — Adaptive template selection is not yet operationally deterministic
**Severity: Medium**

The Journey spec lists relevant factors but lacks a stable scoring and tie-break contract. Adaptive mode should not select unavailable or inaccessible templates.

**Resolution**
- Filter candidates by enabled status, entitlement, education-level compatibility, subject compatibility, accessibility, and chapter renderer compatibility.
- Apply admin-configured weights to context match and learner preference.
- Use deterministic tie-break order (configured priority, then stable template key).
- Persist selected template, version, mode, reason, and config snapshot when chapter starts.
- Random mode uses server-side random selection once at chapter creation and persists the result.

### Finding F-08 — Chapter-only template changes need explicit preference semantics
**Severity: Medium**

The user decision is clear: template changes are allowed only at chapter boundaries. A selected template should not visually switch during an active chapter.

**Resolution**
- Store `pending_template_id` as a preference, not as a chapter mutation.
- Current chapter snapshot is immutable.
- The next chapter creation resolves mode + pending preference + compatibility + unlock.
- Clear or consume the pending preference after successful application.
- If the preference is invalid at next chapter start, explain why and fall back to Adaptive.

### Finding F-09 — Unlock entitlement and academic progression must remain separate
**Severity: High**

Hybrid unlock combines achievement and premium. It must not become a pay-to-progress mechanic.

**Resolution**
- Base templates: Adventure Journey, Board Game, Skill Tree.
- Special templates: World Exploration, Racing Track, Galaxy Mission.
- Special templates unlock through an eligible achievement OR a valid premium entitlement.
- Unlock only changes presentation availability; it does not unlock lessons, improve scores, award XP, change mastery, or grant exam access.
- The backend is authoritative for unlock checks.

### Finding F-10 — Prototype fidelity is not production fidelity
**Severity: Medium**

The HTML prototypes use simulated in-memory state and Tailwind CDN. Some visuals are illustrative and some renderer variants are less complete than the product specification.

**Resolution**
- Label prototypes as demos, not connected product features.
- Production uses locally pinned Tailwind build, shared design tokens, backend persistence, real assessment engine, and server-authoritative progress.
- The Journey prototype was patched in this consolidated package so mode buttons are rebound after template-gallery re-render and the top action advances a chapter according to the selected mode instead of forcing Random.
- Prototype state remains in-memory; refresh resets demo progress. It is not a persistence test.

### Finding F-11 — Admin roles need explicit tenant and resource scope
**Severity: High**

The role list is directionally sound, but role names alone do not define what a user can access across schools, classes, subjects, or content ownership.

**Resolution**
Use RBAC + scoped authorization:
- platform scope;
- organization/school scope;
- class scope;
- subject scope;
- assigned-resource scope.
Backend policy checks must enforce both action permission and resource scope. UI hiding is not authorization.

### Finding F-12 — Event and API contracts are duplicated across modules
**Severity: Medium**

Progression, quiz, AI generation, and admin docs independently list endpoints and events.

**Resolution**
Publish one API/event catalog. Domain modules may own their endpoints, but shared event names, idempotency conventions, correlation IDs, error envelope, pagination, and audit metadata must be standardized.

---

## 4. Canonical product hierarchy

```text
Curriculum + Version
  └── Subject
      └── Learning Path
          └── Chapter
              └── Journey Node
                  └── Activity
                      └── Question Version(s)
```

Cross-cutting records:
- Competencies and curriculum mappings.
- Competency mastery evidence.
- XP ledger, achievements, streaks, and quests.
- Journey template catalog, chapter snapshots, and user preferences.
- Assessment sessions and immutable assessment snapshots.
- AI generation runs, items, attempts, and reviews.
- Organization, class, teacher, parent, and subscription entitlements.

### Entity ownership

| Entity | Owns | Does not own |
|---|---|---|
| Learning Path | Curriculum-aligned learning sequence | Visual template |
| Chapter | A bounded learning segment and template snapshot | Mastery calculation |
| Journey Node | Checkpoint-to-activity mapping and prerequisite reference | Independent XP balance |
| Activity | Activity execution and activity-level policy | Curriculum source of truth |
| Question Version | Immutable question content/version | User progress |
| Mastery Service | Competency evidence and mastery estimate | XP |
| Progression Service | Node/chapter state and unlock policy | Template rendering |
| Journey Template Engine | Selection, compatibility, rendering metadata | Academic unlock decisions |
| Gamification Service | XP ledger, achievements, streaks | Grades/mastery |
| Assessment Service | Sessions, timer, scoring, exam snapshots | Template selection |
| AI Authoring Service | Draft generation and validation provenance | Publishing authority |

---

## 5. Canonical state machines

### Chapter
`planned → available → in_progress → completed → archived`

A chapter snapshot is created at chapter start and is immutable for:
- template ID and version;
- selection mode and reason;
- layout configuration version;
- chapter/node sequence version.

### Journey Node
`locked → available → in_progress → completed`

Optional display annotations:
- `mastered` is a mastery annotation, not a replacement for completion.
- `remedial_recommended` is a recommendation, not a node lifecycle state.
- `boss` is a node kind, not a lifecycle state.

### Question lifecycle
`draft → validation_failed | in_review → approved → published → archived`

A published question version is immutable. Editing a published question creates a new version.

### AI generation item
`queued → generating → validating → needs_review → accepted | rejected | failed`

AI output must not transition directly to `published`.

### Assessment session
`created → started → submitted → grading → graded`
Alternative terminal states: `expired`, `cancelled`, `invalidated` (with audit reason).

---

## 6. Cross-module integration flow

1. Curriculum Admin defines curriculum version, subject, topic, and competency taxonomy.
2. Content Author creates question drafts through Manual Builder or AI Generator.
3. Question validation runs schema, domain, accessibility, duplication, and policy checks.
4. Human reviewer approves; Publisher publishes an immutable Question Version.
5. Learning Designer creates a Learning Path, chapters, nodes, and activity mappings.
6. Journey Template Engine resolves a compatible template when a chapter starts.
7. Student opens an activity. Learning/Assessment service issues a safe delivery payload.
8. Student submits an answer/attempt. Backend grades according to activity policy.
9. Mastery service records competency evidence.
10. Progression service evaluates node/chapter prerequisites.
11. Gamification service awards XP via an idempotent ledger event.
12. Journey map refreshes from the authoritative progress snapshot.

For formal exams, assessment session state and exam snapshots override ordinary practice feedback and reward behaviour.

---

## 7. Design system and frontend consistency

### Keep
- Friendly, energetic, academic visual direction.
- Brand green, navy, blue, purple, orange, yellow, and neutral palette.
- Nunito family for general UI and KaTeX for math.
- 4px spacing rhythm and responsive breakpoints.
- Student navigation: Home, Learn, Practice, Leaderboard, Profile.
- Separate admin and school portal experiences.

### Normalize
- Store design tokens centrally; avoid repeating hex values in each module.
- Use shared button, input, card, badge, modal/drawer, feedback, and navigation components.
- Define status tokens once for locked/available/in-progress/completed/mastered/warning/error.
- Keep the student app and admin console on the same token source but allow distinct density and navigation shells.
- Use consistent Indonesian terminology in UI: “Perjalanan”, “Chapter”, “Checkpoint”, “Misi”, “Penguasaan”, “XP”. Define English developer identifiers separately.
- Tailwind CSS is the production styling system. Do not add ad hoc global/native CSS for ordinary component styling. SVG geometry and narrowly scoped visual effects may require dedicated classes/config.

### Accessibility baseline
Target WCAG 2.2 AA:
- keyboard navigation and focus visibility;
- semantic controls and screen-reader labels;
- contrast-safe status;
- reduced motion;
- touch targets;
- text alternatives for diagrams and simulations;
- accessible alternatives for drag/drop and graph interactions.

---

## 8. Security, privacy, and operational controls

- Authentication and authorization are enforced server-side.
- Tenant scope is part of every institutional query and mutation.
- Students receive allowlisted delivery DTOs only.
- Formal exam answer keys and unreleased explanations are withheld.
- Exam timers are server-authoritative.
- Autosave and submissions are idempotent.
- XP ledger is append-only; corrections use compensating entries.
- Question publication and chapter snapshot changes are audited.
- AI prompts and source material are access-controlled; minimize retention of sensitive data.
- AI-generated content is reviewed for age appropriateness, bias, ambiguity, and correctness.
- Symbolic math execution is isolated, resource-bounded, and never evaluates arbitrary generated code.
- Template config is validated JSON data; never evaluate executable content from the database.
- Apply child privacy/consent requirements appropriate to operating jurisdictions and age groups.
- Use rate limits, file upload scanning, content security controls, secrets management, and dependency scanning.

---

## 9. Recommended implementation order

### Phase 0 — Contract freeze
- Approve this canonical hierarchy.
- Freeze Question Authoring Schema and Student Delivery DTO.
- Freeze chapter/node state machines.
- Freeze shared API response/error/idempotency conventions.
- Define permission scopes.

### Phase 1 — Platform foundation
- Auth, RBAC, tenant isolation, audit, file/media storage.
- Curriculum taxonomy and content versioning.
- PostgreSQL migrations, Redis/BullMQ, transactional outbox.

### Phase 2 — Question Bank
- Manual Builder.
- Validation and review workflow.
- Student delivery projection.
- Versioning and media pipeline.

### Phase 3 — Learning and assessment core
- Activity runtime and question renderers.
- Practice/challenge.
- Formal assessment sessions, autosave, timer, immutable snapshots, scoring.

### Phase 4 — Progression and Journey
- Canonical learning paths, chapters, nodes.
- Mastery evidence and progression evaluator.
- XP ledger and achievement events.
- Journey Template Engine, chapter snapshots, adaptive/personal/random modes, hybrid unlock.

### Phase 5 — AI Question Generator
- Staged orchestrator, validation, deterministic verification, review queue, cost controls.
- Integrate accepted outputs into Question Bank drafts only.

### Phase 6 — Admin, institutional and monetization
- Platform Admin, School Admin, class/teacher scope.
- Entitlements, subscription, billing integration.
- Analytics and reporting.

### Phase 7 — Production hardening
- E2E, load, security, accessibility, backup/restore, observability, incident runbooks.

---

## 10. Release gates

Do not release a module until:
- canonical schema and migration are reviewed;
- authorization tests include cross-tenant negative cases;
- student DTO leakage tests pass;
- state transitions are tested for retries/concurrency;
- idempotency is tested;
- accessibility smoke tests pass;
- analytics events are versioned;
- failure/recovery paths are documented;
- backup/restore and operational ownership are defined.

---

## 11. Final recommendation

Treat this package as the consolidated baseline. Do not continue adding independent progression, question, or assessment schemas to individual features. New modules must extend the canonical contracts in `contracts/` and update the relevant decision record.

The next engineering deliverable should be a technical design and migration plan for **Phase 0 + Phase 1**, not implementation of every feature at once.


## Additional implementation sequencing decision (supersedes prior sequencing)

The implementation is explicitly FE-first: complete all FE features/workflows with JSON mock data and responsive layouts; review and refine FE; derive/finalize API, BE and DB plans from the revised FE; implement BE/DB; integrate. The FE must be backend-agnostic, mobile API-compatible and base-URL configurable. Details and acceptance gates are documented in `IMPLEMENTATION-STRATEGY-FE-FIRST-AND-PORTABLE-API.md`.
