# EduMotion Journey Experience Engine
## Final Product & Technical Specification — v1.0

**Status:** Approved product decisions  
**Prototype:** `journey-experience-engine.html`  
**Scope:** Multi-template learning journey presentation over one canonical progression model.

---

## 1. Confirmed product decisions

| Area | Decision |
|---|---|
| Random rotation | Changes on each new chapter |
| User template change | Chapter-only; no mid-chapter replacement |
| Unlock model | Hybrid: base templates available, special templates unlocked by achievement or premium |
| Progress continuity | Shared progression; changing a renderer never resets learning state |
| Default mode | Adaptive |
| Manual preference | Personal mode |
| Random mode | Select a compatible unlocked template at chapter start |

### Behavioural contract
1. The active template is snapshotted when a chapter starts.
2. A template selection made mid-chapter is stored as `pending_template_id`.
3. The pending selection applies only when the next chapter is created.
4. Random selection runs once at chapter creation, not on every page load or session.
5. Reloading/reopening a chapter must preserve its selected template.
6. Random selection must be deterministic for the chapter once persisted.
7. A template becoming unavailable after chapter start must not break an existing chapter. Existing chapter snapshots remain renderable.
8. Previewing a template does not activate it and cannot mutate progression.

---

## 2. Template catalogue

| Template | Key | Default audience | Unlock |
|---|---|---|---|
| Adventure Journey | `adventure` | SD–SMP | Base |
| Board Game | `board` | SD–SMP | Base |
| World Exploration | `explore` | All levels | Achievement or premium |
| Skill Tree | `skill` | SMP–University | Base |
| Racing Track | `racing` | All levels | Achievement or premium |
| Galaxy Mission | `galaxy` | SMP–University | Achievement or premium |

Audience is a recommendation signal, not a hard restriction. Admin configuration may override compatibility. Users can only select templates that are unlocked and compatible with the chapter context.

### Template renderer contract
Each renderer receives the same canonical view model:
- journey metadata and chapter snapshot
- ordered nodes/checkpoints
- node state: `locked`, `available`, `in_progress`, `completed`
- prerequisites and optional branch metadata
- rewards and achievement presentation
- current learner position
- accessibility preferences

A renderer must not:
- calculate mastery or XP
- decide whether a lesson is unlocked
- submit or grade answers
- mutate canonical progression
- create its own copy of lesson completion state

---

## 3. Modes and selection policy

### Adaptive
At chapter creation, the recommendation service scores compatible unlocked templates using:
- education level / grade band
- subject and topic
- chapter activity mix (practice, simulation, reading, assessment)
- age-appropriate visual complexity
- accessibility and motion preferences
- optional user preference signals

Example initial rules:
- SD Mathematics: Adventure / Board Game
- SMP Mathematics: Adventure / Board Game / Racing
- SMA Mathematics: Skill Tree / World Exploration
- SMP/SMA Physics: Galaxy Mission / World Exploration
- University: Skill Tree / World Exploration

Adaptive selection must have a stable fallback (`adventure`) and must never return a locked template.

### Personal
The learner chooses a preferred template. The choice is stored as a preference and applied at the next chapter boundary. If unavailable or incompatible, show the reason and use adaptive fallback; do not silently reset progress.

### Random
At chapter creation:
1. Build the compatible + unlocked candidate set.
2. Exclude the previous chapter template where at least one alternative exists.
3. Select one candidate using a server-side random choice.
4. Persist the selected template and selection reason in the chapter snapshot.
5. Never reroll on refresh, app restart, or device change.

If only one candidate exists, reuse it and explain that no alternative is currently available.

---

## 4. Hybrid unlock model

### Base templates
Available to all learners at launch:
- Adventure Journey
- Board Game
- Skill Tree

### Special templates
- World Exploration: achievement or premium entitlement
- Racing Track: achievement or premium entitlement
- Galaxy Mission: achievement or premium entitlement

Unlock is an entitlement, not a progression state. Premium unlock does not grant lesson completion, XP, mastery, exam access, or academic advantage.

Recommended unlock sources:
- Achievement: complete a configured milestone, e.g. first chapter completion or 4 chapter missions.
- Premium: feature entitlement such as `journey.template.racing`.
- Admin grant: time-bounded or permanent grant for campaigns/support.

The server must enforce unlock and entitlement checks. UI lock icons are informative only.

---

## 5. User experience

### Learning Path screen
- Current chapter and subject context
- Active template badge
- Progress count and progress bar
- Interactive map rendered by active template
- Checkpoint detail / mission launch
- Change Journey Style entry point
- Template gallery with preview, active, available, and locked states
- Mode selector: Adaptive / Personal / Random

### Chapter-only change flow
1. Learner selects a different template.
2. UI shows: “Pilihan disimpan untuk chapter berikutnya.”
3. Current chapter remains visually unchanged.
4. At next chapter creation, the selected mode is evaluated and template snapshot is created.
5. UI confirms the new active template.

### Preview
- Preview must be read-only.
- Preview must use sample or current canonical view model in a sandboxed presentation state.
- No unlock, XP, mastery, or completion mutation may occur.

### Accessibility
- Keyboard-operable checkpoint navigation
- Visible focus states
- Screen-reader labels for nodes and status
- Reduced-motion mode
- Contrast-safe status indicators; never rely on color alone
- Touch targets ideally 44×44 CSS px or larger

---

## 6. Canonical progression model

Progress belongs to the Learning Progression Engine, not a template.

Canonical entities:
- `learning_journeys`
- `journey_chapters`
- `journey_nodes`
- `user_journey_progress`
- `user_node_progress`
- `journey_template_catalog`
- `journey_template_unlocks`
- `user_journey_preferences`
- `journey_chapter_snapshots`
- `journey_selection_events`

Suggested key fields:

### `journey_chapters`
- `id`
- `journey_id`
- `sequence`
- `subject_id`
- `topic_id`
- `education_level`
- `status`
- `started_at`
- `completed_at`

### `journey_chapter_snapshots`
- `id`
- `chapter_id` (unique)
- `template_id`
- `template_version`
- `selection_mode` (`adaptive|personal|random|admin`)
- `selection_reason` JSONB
- `layout_config` JSONB
- `created_at`

### `user_journey_preferences`
- `user_id`
- `selection_mode`
- `preferred_template_id`
- `pending_template_id`
- `allow_random_repeat` boolean
- `updated_at`

### `journey_template_unlocks`
- `id`
- `user_id`
- `template_id`
- `source` (`base|achievement|premium|admin`)
- `source_reference_id`
- `starts_at`
- `expires_at`
- `created_at`

### `user_node_progress`
- `user_id`
- `node_id`
- `status`
- `attempt_count`
- `completed_at`
- `best_score`
- unique `(user_id,node_id)`

Use UUID primary keys, foreign keys, unique constraints, and indexes on `(user_id, status)`, `(chapter_id, sequence)`, and `(user_id, template_id)`. Use a transaction when completing a node, awarding XP, updating mastery, and emitting outbox events. XP ledger writes and event handlers must be idempotent.

---

## 7. API contract (LoopBack 4)

### Read
- `GET /me/journey/preferences`
- `GET /journeys/:journeyId/chapters/:chapterId`
- `GET /journeys/:journeyId/chapters/:chapterId/map`
- `GET /journey-templates`
- `GET /me/journey/template-unlocks`

### Update preference
- `PUT /me/journey/preferences`
```json
{
  "selectionMode": "personal",
  "preferredTemplateId": "adventure"
}
```

### Request next-chapter template
- `PUT /me/journey/preferences/pending-template`
```json
{ "templateId": "galaxy" }
```
This endpoint validates entitlement/compatibility and stores a pending choice. It does not mutate the current chapter snapshot.

### Create next chapter
- `POST /journeys/:journeyId/chapters/next`
Server transaction:
1. Verify prerequisite chapter completion.
2. Resolve current selection mode.
3. Choose compatible unlocked template.
4. Create chapter and immutable template snapshot.
5. Return the new chapter view model.

### Complete node
- `POST /journeys/:journeyId/nodes/:nodeId/complete`
Must validate prerequisites, assessment result, idempotency key, XP award policy, and mastery update server-side.

Errors:
- `TEMPLATE_LOCKED`
- `TEMPLATE_INCOMPATIBLE`
- `CHAPTER_TEMPLATE_IMMUTABLE`
- `CHAPTER_PREREQUISITE_NOT_MET`
- `NODE_ALREADY_COMPLETED`

---

## 8. Renderer architecture

Suggested frontend structure (React + Vite, JavaScript/JSX, Tailwind only):

```text
src/
  features/journey/
    components/
      JourneyExperience.jsx
      JourneyHeader.jsx
      JourneyProgress.jsx
      TemplateGallery.jsx
      TemplatePreview.jsx
      CheckpointDetail.jsx
    renderers/
      AdventureRenderer.jsx
      BoardGameRenderer.jsx
      WorldExplorationRenderer.jsx
      SkillTreeRenderer.jsx
      RacingTrackRenderer.jsx
      GalaxyMissionRenderer.jsx
    engine/
      journey-view-model.js
      template-selector.js
      compatibility.js
      progression-state.js
    services/
      journey-api.js
      journey-preferences-api.js
    schemas/
      journey-view.schema.json
      template-config.schema.json
```

`JourneyExperience` resolves the persisted chapter snapshot and mounts the matching renderer. Renderers are presentation-only. Shared controls (checkpoint detail, mission launch, accessibility) should remain consistent.

Do not put lesson progression logic inside renderers. Avoid a separate progress table per template.

---

## 9. Admin configuration

Admin can:
- enable/disable a template for new chapters
- set supported education levels and subjects
- configure default/adaptive priority weights
- configure unlock source and entitlement key
- configure template version and migration compatibility
- preview a template against sample chapter data
- schedule seasonal themes

Admin cannot change a template snapshot for a chapter already started. New template versions apply to new chapters unless an explicit safe migration is designed.

---

## 10. Analytics and observability

Track:
- `journey_template_impression`
- `journey_template_previewed`
- `journey_template_selected`
- `journey_template_selection_deferred`
- `journey_chapter_started`
- `journey_node_opened`
- `journey_node_completed`
- `journey_chapter_completed`
- `journey_template_unlocked`

Useful metrics:
- chapter completion by template
- node abandonment by template
- template switching preference
- learning outcomes by template (avoid assuming correlation implies causation)
- random mode opt-in and repeat rate
- accessibility preference adoption

Do not use template choice as a proxy for ability or academic performance.

---

## 11. Security and integrity

- Backend is authoritative for template entitlement, chapter creation, node prerequisites, XP, mastery, and assessment.
- Do not trust client-submitted template unlock status or completion state.
- Never send formal assessment answer keys in a student map payload.
- Enforce tenant/organization scope for institutional users.
- Keep audit records for admin changes and entitlement grants.
- Treat template configuration as data; never execute arbitrary HTML/JS from the database.
- Validate JSONB configuration against versioned schemas.
- Use idempotency keys for progression and reward commands.

---

## 12. Prototype scope and limitations

The included HTML is a frontend-only prototype:
- Six selectable visual templates; map renderer examples for Adventure, Board Game, and Skill Tree, with shared checkpoint data.
- Adaptive / Personal / Random mode controls.
- Chapter-boundary template change behaviour.
- Achievement-style unlock simulation and XP reward demonstration.
- Mission interaction and checkpoint progression.

Not implemented:
- real backend persistence
- real user authentication or subscription verification
- real random selection service
- production-grade map renderer for all six themes
- actual lesson/assessment engine
- cross-device synchronization
- payment processing

The prototype uses Tailwind CDN and small custom CSS for SVG map geometry and visual effects. Production should use a pinned local Tailwind build and design tokens; custom CSS should be limited to geometry/effects that cannot reasonably be expressed as utilities.

---

## 13. Acceptance criteria

1. A learner can preview templates without changing active chapter template.
2. A learner can choose a different unlocked template during a chapter, but it is only pending.
3. Current chapter renderer does not change after the pending choice.
4. Next chapter uses the pending choice in Personal mode.
5. Random mode selects once per new chapter and persists the result.
6. Refresh/reopen does not reroll or reset the chapter template.
7. Locked templates cannot be activated by manipulating the UI.
8. Achievement/premium unlock grants access without granting academic progress.
9. All templates consume the same canonical node and progress data.
10. Changing templates never resets XP, mastery, completion, or assessment history.
11. The server rejects node completion when prerequisites are unmet.
12. Existing chapter snapshots remain renderable after a template is disabled for future chapters.

---

## 14. Recommended implementation sequence

**Sprint 1 — Core contract**
- JSON schema for canonical journey view model and template config
- template catalogue and compatibility service
- chapter snapshot + user preferences persistence

**Sprint 2 — Renderers**
- Adventure and Board Game
- Skill Tree
- shared checkpoint interactions and accessibility

**Sprint 3 — Selection and unlock**
- Adaptive / Personal / Random selection
- chapter-boundary pending selection
- achievement and premium entitlement integration

**Sprint 4 — Remaining themes**
- World Exploration, Racing Track, Galaxy Mission
- responsive layouts, motion/accessibility, visual QA

**Sprint 5 — Analytics and hardening**
- event instrumentation
- idempotency, concurrency, tenant authorization
- end-to-end tests for chapter boundaries and progress continuity
