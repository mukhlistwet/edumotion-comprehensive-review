# Implementation Strategy: Frontend-First, Contract-Driven, Backend-Agnostic

This strategy supersedes any roadmap wording that implies backend/database implementation before the complete frontend is built and reviewed.

## Mandatory implementation order

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

## Responsive design requirements
- Mobile-first and usable on phones, tablets, laptops, desktop and large screens.
- Explicit design/test breakpoints and layout adaptation, not merely scaling.
- Navigation adapts (desktop navigation/sidebar, tablet layout, mobile drawer/bottom navigation where suitable).
- Tables, editors, maps, graph tools, simulations, dialogs and question interactions must have mobile-specific interaction patterns or horizontal scrolling only when justified.
- Minimum touch target guidance, keyboard navigation, visible focus, screen-reader labels, contrast, reduced-motion consideration and zoom support.
- Test at representative viewport widths and real-device/browser combinations.

## Backend portability / API independence
- FE architecture must be backend-agnostic. The backend may be LoopBackJS, Express.js, Django, FastAPI, Go or another implementation without FE component/business-flow rewrites.
- Use a single configurable API base URL (environment/runtime configuration), e.g. `VITE_API_BASE_URL`; changing the host/base URL must be sufficient for deployment against a compatible backend. Avoid framework-specific client SDKs and server-rendered assumptions in FE.
- FE uses a centralized API client and domain service modules; components never call fetch/axios directly. Normalize headers, auth, errors, retries, timeout, request cancellation, serialization and pagination centrally.
- Use REST/HTTP and JSON contracts, standards-based auth (e.g. OAuth2/OIDC-compatible flows or documented token/session strategy), consistent error envelope, versioning (`/api/v1`) and OpenAPI as the contract source.
- Define compatibility and capability behavior for mobile: APIs must not assume browser cookies, browser-only storage, window, DOM or web-specific client behavior. Mobile uses the same domain APIs and DTOs; auth may use platform-appropriate token storage and flow.
- Keep FE-specific view models/DTO mapping in adapters; avoid leaking backend database schema or ORM entities to clients.
- No backend-specific URL, payload convention, exception format or generated SDK should be embedded in UI components.
- Contract compatibility tests and OpenAPI validation are required. Backend replacement means implement the same contract and change configuration, not rewrite FE.

## FE structure recommendation
- `src/app`: routes, shell and composition only
- `src/features/<feature>`: screens, components, feature hooks, validation, domain logic
- `src/domain`: canonical types/schema definitions in JS-friendly form and domain rules
- `src/services`: domain service interfaces/facades
- `src/api`: centralized client, config, transport, DTO mappers, error normalization
- `src/adapters/mock`: mock services, JSON fixtures, simulated network and state mutation
- `src/adapters/http`: real API implementations
- `src/shared`: design system, accessibility helpers, utilities
- `tests`: unit, workflow, responsive and contract tests

## Mock-first implementation principles
- Mock JSON is fixture data, not the permanent truth for domain logic.
- Use the same service facade and DTO shapes for mock and real adapters.
- Include mock scenarios for empty, loading, normal, error, unauthorized, locked, partial, validation-failed and retry states.
- Make mock behavior deterministic and seedable for test/review.
- Maintain a mock-to-contract traceability mapping.

## Phase gates
1. Phase 1 FE feature-complete and reviewable with mock data, responsive QA, critical workflow tests.
2. Phase 2 FE refinement complete; contract, BE plan, DB plan and acceptance matrix approved.
3. Phase 3 backend/database contract conformance and security checks complete.
4. Phase 4 integrated regression and release readiness complete.

## Explicit non-goals / safeguards
- Do not implement BE/DB in parallel in a way that locks the FE into premature schema/API assumptions during Phase 1.
- Do not couple FE to a backend framework, ORM, database structure or host-specific path.
- Do not bypass security/authorization in mock mode without clearly labeled demo behavior.
- Do not treat mock-based success as proof of production security or backend correctness.
