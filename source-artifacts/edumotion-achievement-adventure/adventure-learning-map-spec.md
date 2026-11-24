# EduMotion Adventure Learning Map — Interaction Specification

## Design direction
Replace a rigid vertical progress list with a game-like journey map. The student travels through a themed world, following a continuous road/path and reaching checkpoints. The prototype includes two visual modes:
- **Adventure road:** winding road through a landscape, checkpoints, scenery, explorer avatar.
- **Board game:** same progression rendered as tile-like checkpoint nodes along a route.

This is a visual and interaction prototype. Progression state, question correctness, rewards, and movement are simulated in browser memory; production must use server-authoritative progress.

## Interaction model
1. The student sees a world map with a continuous route from start camp to final summit.
2. Each checkpoint is a level or milestone. Nodes are completed, current, locked, or boss challenge.
3. Selecting a node opens its mission card with objective list, reward, state, and CTA.
4. Locked nodes explain the prerequisite and cannot start.
5. Current node opens a short practice challenge.
6. Correct answer enables claim reward.
7. Claiming reward animates/moves explorer avatar to next checkpoint, updates XP and journey progress, and unlocks next node.
8. Completed nodes can be replayed; replay reward policy should be separately configured to prevent XP farming.
9. Final node is a capstone/boss challenge, not just another ordinary question.

## Map layout and rendering
- Prefer responsive SVG path with HTML interactive nodes layered above it.
- Route should have a clear start, direction, destination, and landmark progression.
- Desktop: large landscape map with side mission panel.
- Mobile: vertical or diagonal winding route with touch-friendly nodes; mission details in bottom sheet.
- Map must remain navigable without relying on hover.
- Provide reduced-motion support and accessible labels for all nodes.
- Use semantic buttons and visible keyboard focus.
- Avoid excessive visual clutter; use chapter segments/landmarks for longer paths.

## Node states
- `locked`: prerequisite not met; show lock and reason.
- `available`: unlocked but not started.
- `in_progress`: currently active.
- `completed`: gate passed.
- `mastered`: mastery threshold and retention check passed.
- `boss`: capstone/assessment node; distinct visual treatment.
- Optional `remedial`: recommended detour to close a competency gap.

## Production data model
Reuse the achievement-path entities from the earlier specification, adding:
- `map_theme_id`, `map_layout_json`, `landmark_asset_id` to path/chapter configuration.
- `map_position_x`, `map_position_y`, `node_variant`, `connector_sequence` to level/map node configuration.
- `chapter_id` and `chapter_order` for segmented journeys.
- `avatar_state` only if avatar cosmetics are a product feature; never use client position as authoritative progress.

Keep map coordinates as presentation metadata. Unlock state and reward ledger remain server-owned.

## Suggested frontend components
- `AdventureMapPage`
- `WorldMapCanvas` (SVG path + decorative layer)
- `PathConnector`
- `CheckpointNode`
- `ExplorerAvatar`
- `ChapterLandmark`
- `MissionDetailPanel`
- `PracticeChallengeModal` / mobile bottom sheet
- `RewardReveal`
- `MapStyleSwitcher`
- `JourneyProgressSummary`

Use React + Vite + JavaScript/JSX and Tailwind CSS. SVG path geometry can be data-driven; node positions are configuration, not hardcoded per component. For complex maps, use SVG viewBox coordinates and transform node positions responsively. Keep all game state and progression logic outside presentational components.

## Backend rules
- Practice submission is graded by backend.
- Backend updates mastery and evaluates unlock policy.
- XP is written to immutable ledger with idempotency key.
- Client receives authoritative next unlocked node and progress snapshot.
- A repeated/replayed completed node must follow a replay reward policy; do not blindly award full XP repeatedly.
- Formal assessments do not use hearts or punitive loss of progression.
- Persist progress across devices and sessions.

## Suggested API
- `GET /learning-paths/:id/map` — node layout + student state
- `GET /learning-paths/:id/progress`
- `GET /learning-path-levels/:id/mission`
- `POST /activities/:id/attempts`
- `POST /learning-path-levels/:id/claim-reward` (idempotent; preferably reward emitted from successful server-side completion event)
- `GET /users/me/progression-events`

## Important UX improvements for next iteration
- Add chapter map themes (forest, city, space, ocean, ancient ruins).
- Add branching optional routes for enrichment/remedial activities, while keeping required path clear.
- Add visible gates/bridges/portals that open when prerequisites are met.
- Add treasure chests and badge reveal for milestone levels.
- Add a capstone boss challenge with multiple competencies.
- Add map zoom/pan for large curricula; keep mobile navigation simple.
- Add touch drag/scroll and focus management.
- Provide an admin map editor to arrange nodes and configure gates.
