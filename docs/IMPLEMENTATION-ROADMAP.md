# Implementation Roadmap — Frontend First

> Mandatory sequence: FE complete with JSON mock data → FE review/refinement and API/BE/DB plan alignment → Backend & Database → FE/BE integration. See `IMPLEMENTATION-STRATEGY-FE-FIRST-AND-PORTABLE-API.md` for requirements and phase gates.



### Phase 1 — Complete Frontend using JSON mock data (FE ONLY)
- Implement the complete application frontend: all identified modules, features, functions, states, workflows, navigation, forms, validation, dialogs, empty/loading/error states and responsive layouts.
- Use realistic, versioned JSON mock data and a mock service layer. Do not require live backend, database, credentials or backend deployment to complete this phase.
- Mock service behavior must simulate latency, success, failures, pagination, filtering, permissions, retry, and mutations where applicable. Persist demo state only using an explicitly chosen mock persistence mechanism; avoid coupling to browser storage as a production dependency.
- Every user-facing flow must be navigable and testable. Use seeded personas and data for student, teacher/content author, administrator and institution roles where applicable.
- Keep business rules out of UI components; use shared domain/service modules and mock adapters.
- FE uses JavaScript/JSX (no TypeScript requirement), React + Vite, Tailwind CSS + shadcn/ui. Do not use native CSS for ordinary styling; use Tailwind or agreed UI framework.
- Responsive is mandatory: mobile-first, tablet, desktop and wide-screen. Include touch-friendly interaction, keyboard access, safe-area handling, overflow management and usable layouts at common breakpoints.
- FE phase completion gate: feature/workflow inventory signed off, responsive checks passed, mock data contracts documented, UX review/bug list closed or accepted, and automated tests for critical workflows.

### Phase 2 — FE review/refinement and contract/architecture alignment
- Review the complete FE against product requirements, consistency, accessibility, responsive behavior, workflow completeness, edge cases and realistic data.
- Refine FE and workflows before freezing contracts. Changes may be made based on this review.
- Once the FE flows are stable, derive and finalize API Contract Plan, Backend Plan and Database Plan from the reviewed FE/domain needs.
- Define endpoint behaviors, payloads, error envelope, pagination/filter/sort, authentication, authorization, idempotency, versioning, uploads, events, mobile use, and API compatibility.
- Document DB entities, relations, constraints, indexes, migrations, transaction boundaries and data lifecycle. Do not allow a database-first design to dictate or distort reviewed user workflows.
- FE must consume API through a provider-neutral client/service layer; mocks and real API adapters implement the same contract.
- Phase gate: approved FE revision, API contract, backend implementation plan, database plan, acceptance criteria and traceability matrix.

### Phase 3 — Backend and Database implementation
- Implement backend and database against approved contracts and plans.
- Validate contracts with tests and contract fixtures. Backend is not allowed to silently drift payloads or semantics.
- Implement security, tenancy/RBAC, auditing, rate limiting, validation, idempotency, observability, data migrations, transactions and background jobs.
- Keep API portable: backend framework is an implementation choice and must not leak into client contracts.

### Phase 4 — FE/BE integration
- Replace mock adapter with real API adapter via configuration, not component rewrites.
- Run integration, end-to-end, contract, regression, accessibility, responsive, security and performance tests.
- Validate all workflows against backend behaviors and update FE only where justified by approved changes; keep change traceability.
- Verify mobile-client-compatible APIs and cross-platform behavior.

