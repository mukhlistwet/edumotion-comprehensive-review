# Architecture Decision Records (ADR) — EduMotion Baseline

## ADR-001 — One canonical learning progression model
**Status:** Accepted

Use `Learning Path → Chapter → Journey Node → Activity`. Do not implement separate progression engines for Achievement Path, Adventure Map, and Journey Experience. Existing Level 0–10 becomes optional rank/milestone presentation only, not an independent academic unlock system.

**Reason:** Prevent duplicated progress, unlock, and reward state.

## ADR-002 — Journey templates are presentation adapters
**Status:** Accepted

Adventure, Board Game, World Exploration, Skill Tree, Racing Track, and Galaxy Mission are renderers over the same canonical journey view model.

**Reason:** Template count must not multiply backend progression complexity.

## ADR-003 — Chapter template snapshot is immutable
**Status:** Accepted

Template ID, template version, selection mode, selection reason, and layout config are snapshotted at chapter start. Mid-chapter changes are pending preferences for the next chapter.

**Reason:** Predictable learner experience, reproducible analytics, stable cross-device rendering.

## ADR-004 — Random selection occurs only at chapter creation
**Status:** Accepted

Random selection is server-side, compatibility-filtered, and persisted. Exclude the previous template when alternatives exist. Refresh must never reroll.

**Reason:** Random should be a chapter-level experience choice, not a session-level surprise.

## ADR-005 — Hybrid template unlock is not pay-to-win
**Status:** Accepted

Base templates are available by default. Special templates unlock via achievement or premium entitlement. Premium affects appearance/experience options only, not academic access, mastery, grades, XP fairness, or exam eligibility.

## ADR-006 — One canonical Question Authoring Schema
**Status:** Accepted

Manual Builder and AI Generator both create the same versioned authoring payload. `essay` is a legacy alias for `worked_solution` with rich-text response mode.

**Reason:** Avoid parallel question-bank formats.

## ADR-007 — Student delivery DTO is an allowlisted projection
**Status:** Accepted

Student-facing payloads are built separately and never expose answer keys, hidden scoring, unreleased explanations, reviewer notes, AI provenance, or prompts.

## ADR-008 — Mastery, journey progress, XP, and player rank are separate
**Status:** Accepted

Mastery is competency evidence; journey progress is chapter/node state; XP is a ledger; player rank is gamification. None is a substitute for another.

## ADR-009 — Server is authoritative for all consequential state
**Status:** Accepted

Backend validates assessment, mastery, unlock, XP, entitlement, chapter creation, and node completion. Client is a presentation and input surface.

## ADR-010 — Production frontend styling uses Tailwind
**Status:** Accepted

React + Vite + JavaScript/JSX for web. Tailwind is the styling framework. Use shared tokens and components; custom CSS is limited to nontrivial SVG geometry/effects where utilities are not suitable.


## Frontend-first and backend-agnostic architecture (mandatory)

- Phase order is FE-only with JSON mocks; FE refinement; contract/BE/DB plan freeze; backend/database; then integration.
- FE communicates through centralized domain services/API adapters. Components must not depend on a specific BE framework, ORM, database schema or server technology.
- API base URL is configuration-driven. Contract is versioned REST/JSON with OpenAPI and standardized auth/error/pagination/idempotency semantics.
- APIs must be shared by web and mobile (Android/iOS), avoiding browser-only assumptions.
- Responsive and accessibility requirements apply to every feature, not just the dashboard.
- See `IMPLEMENTATION-STRATEGY-FE-FIRST-AND-PORTABLE-API.md` for detailed standards and gates.
