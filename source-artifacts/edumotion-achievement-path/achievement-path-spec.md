# EduMotion Progressive Achievement Path
## Product & Engineering Specification

## 1. Purpose
Progressive Achievement Path adalah sistem progression berbasis mastery yang memvisualisasikan perjalanan siswa dari Level 0 hingga level tertinggi pada satu learning path/competency cluster. Level bukan sekadar XP ladder: kenaikan level harus menunjukkan kemampuan akademik yang benar-benar dikuasai.

Prototype HTML memuat 11 node (Level 0–10), node completed/current/locked, detail target, syarat unlock, reward, quick practice modal, dan simulasi penyelesaian aktivitas. State hanya in-memory; production perlu persistence backend.

## 2. Core design principles
- **Mastery before unlock:** level berikutnya dibuka berdasarkan syarat kompetensi, bukan hanya mengumpulkan XP.
- **Visible progression:** siswa selalu melihat posisi, target berikutnya, dan alasan level masih terkunci.
- **Small wins:** setiap level berisi beberapa aktivitas singkat dan milestone.
- **Fair progression:** remedial/retry tersedia; satu kesalahan tidak mengunci siswa selamanya.
- **Separate academic mastery and gamification:** XP/badge adalah reward; nilai mastery akademik tetap metrik terpisah.
- **Adaptive path:** remedial node dapat direkomendasikan jika evidence menunjukkan competency gap.
- **Accessible interaction:** node memiliki label/status tekstual, bukan warna saja; dapat diakses keyboard dan layar kecil.

## 3. Hierarchy
Recommended hierarchy:
`Subject → Learning Path → Unit/Competency Cluster → Level → Activity Set → Activity`

Examples:
- Mathematics → Algebra → Linear equations → Level 0–10
- Physics → Mechanics → Newton's laws → Level 0–10

A student can be Level 6 in Algebra but Level 2 in Geometry. Never use one global level to imply mastery across all subjects.

## 4. Level definition
Each level record:
- `levelNumber`
- `title`, `description`, `icon`
- `competencyIds`
- `learningObjectives`
- `prerequisiteLevelIds`
- `activitySetId`
- `requiredActivityCount`
- `requiredAccuracy`
- `requiredMasteryScore`
- `requiredChallengeIds`
- `allowHints`, `maxAttempts` (policy-based)
- `estimatedMinutes`
- `xpReward`, `badgeId`
- `unlockPolicy`
- `sortOrder`, `isCapstone`

Suggested progression:
| Level | Name | Focus | Example gate |
|---|---|---|---|
| 0 | Getting Started | Orientation and prerequisite check | Complete onboarding |
| 1 | Foundation | Core prerequisite skills | 2 activities, 70% |
| 2 | Explorer | Basic concept understanding | 3 activities, 75% |
| 3 | Problem Solver | Apply core method | 3 activities, 80% |
| 4 | Builder | Translate and construct models | 4 activities + challenge |
| 5 | Master | Multi-step concept application | 85% mastery |
| 6 | Application Hero | Contextual problem solving | Context challenge |
| 7 | Strategic Thinker | Analyze and compare methods | Analysis set |
| 8 | Expert | Advanced transfer and fluency | 90% mastery |
| 9 | Champion | High-difficulty challenge | 85% without hints |
| 10 | Legend | Capstone mastery | Final assessment 90% |

These are illustrative gates; actual thresholds must be configurable by subject, grade, and pedagogy.

## 5. Unlock engine
Use an explicit policy evaluator. Example:
- Required activities completed.
- Accuracy threshold over a minimum evidence window.
- Competency mastery score threshold.
- Required challenge/capstone passed.
- Prerequisites satisfied.
- No stale/invalid assessment attempt.

Do not use only raw lifetime accuracy. Consider recent evidence, question difficulty, sample size, and spaced-repetition retention. Avoid allowing repeated identical attempts to inflate mastery.

Suggested states:
`locked → available → in_progress → completed → mastered`
Optional states: `needs_review`, `remedial_recommended`, `expired` (for time-bound challenge).

A level can be `completed` while the competency remains below mastery threshold; show that distinction clearly.

## 6. Activity set composition
Typical level contains:
1. Learn/review card
2. Worked example
3. Guided practice
4. Independent practice
5. Challenge / mastery check
6. Optional remedial activity

Activity types reuse the EduMotion Question Schema:
- single choice, multiple select, numeric, true/false, fill blank
- matching, ordering, formula input
- graph plot, diagram label, simulation
- worked solution / essay

Question selection should be competency-tagged and difficulty-calibrated. Avoid repeating same question version in a way that rewards memorization instead of learning.

## 7. Progress and mastery metrics
Keep separate:
- `xpBalance` / XP ledger: gamification reward
- `levelProgress`: activity completion progress
- `competencyMastery`: academic mastery estimate 0–100
- `retention`: later recall evidence
- `streak`: consistency metric

Recommended mastery evidence inputs:
- correctness
- item difficulty
- recency
- independent vs hinted response
- number of distinct questions
- retention checks
- confidence (optional, carefully calibrated)

Suggested mastery bands: 0–39 weak, 40–59 developing, 60–79 proficient, 80–100 mastered. Level unlock thresholds can require 75–90 depending on stage.

## 8. UX requirements
### Path map
- Vertical winding path on mobile; responsive centered/curved or alternating nodes on desktop.
- Distinct completed/current/locked states.
- Current node highlighted with accessible text “Your current level”.
- Connectors show earned progress.
- Node click opens detail panel, not immediate navigation if locked.
- Level detail includes skill targets, prerequisites, activities, time, XP, badge, and CTA.
- Show “why locked” and explicit next action.

### Practice completion
- Show feedback, XP earned, activity progress.
- If gate met, celebrate unlock with a short, accessible animation.
- Do not use animation as sole signal; provide text and reduced-motion support.
- For failure, show targeted hint/remedial activity, not punitive reset.

### Max level
At maximum level:
- show capstone completion, mastery badge and subject-specific certificate/reward
- offer mastery maintenance, advanced extension path, new unit path
- do not create an endless meaningless level loop; if prestige/replay exists, label it separately from academic level.

## 9. Suggested database entities
- `learning_paths`: id, subject_id, curriculum_version_id, grade_level_id, title, description, status
- `learning_path_levels`: id, learning_path_id, level_number, title, description, config_json, unlock_policy_json, xp_reward, badge_id
- `learning_path_level_competencies`: level_id, competency_id, target_mastery
- `learning_path_activities`: id, level_id, activity_id, sequence, required, weight
- `user_learning_path_progress`: user_id, learning_path_id, current_level_id, status, started_at, updated_at
- `user_level_progress`: user_id, level_id, status, activities_completed, accuracy_snapshot, mastery_snapshot, unlocked_at, completed_at
- `user_competency_mastery`: user_id, competency_id, mastery_score, evidence_count, last_evidence_at
- `xp_ledger`: immutable entries for award/reversal, source event, idempotency key
- `user_achievements`: user_id, achievement_id, earned_at
- `level_unlock_events`: user_id, level_id, rule_snapshot, evidence_snapshot, created_at

Use UUIDs, FK constraints, unique constraints (user+level, path+level_number), and indexes for user/path/status. Keep policy/config JSONB but core relationships relational.

## 10. Backend / event flow
1. Student submits activity attempt.
2. Assessment/practice service validates answer and records attempt.
3. Emit `ACTIVITY_COMPLETED` / `PRACTICE_ATTEMPT_RECORDED`.
4. Mastery service updates competency evidence.
5. Progression evaluator checks unlock policy.
6. In one reliable workflow, persist progress and emit `LEVEL_COMPLETED`, `LEVEL_UNLOCKED`, `XP_AWARDED`, `ACHIEVEMENT_EARNED` through transactional outbox.
7. Notify client with updated path state.

Idempotency required for XP awards and level unlocks. Client must never decide final mastery or unlock state.

Suggested LoopBack endpoints:
- `GET /learning-paths/:id/map`
- `GET /users/me/learning-paths`
- `GET /users/me/learning-paths/:id/progress`
- `GET /learning-path-levels/:id`
- `POST /learning-path-levels/:id/start`
- `GET /learning-path-levels/:id/activities`
- `POST /activities/:id/attempts`
- `POST /learning-path-levels/:id/mastery-check`
- `GET /users/me/achievements`
- `GET /users/me/progression-events`

## 11. Admin / authoring requirements
Admin should be able to:
- create path and level sequence
- map each level to curriculum competencies
- assign activity/question sets
- configure gates and reward policy
- preview student progression
- run policy simulation with sample evidence
- publish new path version
- inspect completion/drop-off/mastery analytics

Changing a published path must be versioned. Existing student progress must map safely to the new version; never silently reorder or remove levels in an active path.

## 12. Analytics
Track:
- start/completion rate per level
- median time to complete
- retry count and abandonment
- accuracy/mastery before and after level
- remedial recommendation acceptance
- unlock conversion rate
- item exposure and question leakage
- achievement/reward distribution

Use analytics to identify levels that are too hard/easy, not to punish students.

## 13. Acceptance criteria
- Student sees correct current/completed/locked levels.
- Selecting locked level explains prerequisites.
- Unlock is computed server-side from evidence and policy.
- XP is separate from mastery score.
- Progress survives reload and multiple devices.
- Duplicate submissions do not double-award XP.
- Remedial route is available after repeated difficulty.
- Level path is responsive and keyboard accessible.
- Admin can configure thresholds and preview path.
- Max level has meaningful capstone and next learning recommendation.
