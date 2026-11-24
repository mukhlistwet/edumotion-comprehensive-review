# QA & Acceptance Test Plan — EduMotion Core

## A. Journey Experience Engine

| ID | Scenario | Expected result |
|---|---|---|
| JRN-001 | Start a chapter in Adaptive mode | Server chooses compatible unlocked template and persists one snapshot |
| JRN-002 | Refresh active chapter | Same template ID/version; no reroll |
| JRN-003 | Select another template mid-chapter | Pending preference saved; active renderer unchanged |
| JRN-004 | Start next chapter in Personal mode | Valid pending/preferred template applied and consumed |
| JRN-005 | Pending template becomes locked before next chapter | Explain fallback; Adaptive template selected |
| JRN-006 | Random mode starts new chapter | Server selects from eligible set, excluding prior template when alternatives exist |
| JRN-007 | Refresh Random chapter | Same template remains |
| JRN-008 | Only one eligible Random template | Reuse it; record reason |
| JRN-009 | Attempt locked template via forged request | API returns `TEMPLATE_LOCKED` |
| JRN-010 | Change template after chapter start through API | Reject snapshot mutation |
| JRN-011 | Complete node without prerequisites | Reject; no XP or mastery mutation |
| JRN-012 | Duplicate completion request | Idempotent result; no duplicate XP |
| JRN-013 | Disable template for future chapters | Existing chapter snapshot still renders |
| JRN-014 | User has reduced motion | No essential information depends on animation |
| JRN-015 | Keyboard-only map navigation | Every checkpoint and action is reachable and labelled |

## B. Question Authoring and Publishing

| ID | Scenario | Expected result |
|---|---|---|
| QST-001 | Save valid draft | Stored against canonical schema version |
| QST-002 | Invalid type-specific answer structure | Validation fails with field-level findings |
| QST-003 | Publish with unresolved blocking errors | Rejected |
| QST-004 | Edit published question | New version created; published version immutable |
| QST-005 | Student requests question delivery | Allowlisted DTO only |
| QST-006 | Student attempts to access answerSpec | No answer key or hidden scoring data returned |
| QST-007 | Tenant author accesses another tenant draft | Forbidden/not found according to policy |
| QST-008 | Upload unsupported or unsafe media | Rejected/quarantined |
| QST-009 | `essay` legacy input | Adapter maps to `worked_solution` + rich-text response mode |
| QST-010 | Duplicate publish request | Idempotent; one published version/event |

## C. AI Question Generator

| ID | Scenario | Expected result |
|---|---|---|
| AIQ-001 | Submit generation brief | Run created and queued |
| AIQ-002 | Model returns malformed JSON | Schema validator rejects; bounded retry |
| AIQ-003 | Model returns wrong calculation | Deterministic verifier rejects |
| AIQ-004 | Model invents competency ID | Reject unknown taxonomy reference |
| AIQ-005 | Model returns executable code | Reject; no execution path exists |
| AIQ-006 | Retry limit exceeded | Item enters failed/needs-review; no infinite loop |
| AIQ-007 | Accept generated item | Creates Question draft only |
| AIQ-008 | Cancel run | Pending work stops safely; attempts remain auditable |
| AIQ-009 | Cost cap reached | Further model calls blocked |
| AIQ-010 | Human review required | No direct transition to published |

## D. Assessment integrity

| ID | Scenario | Expected result |
|---|---|---|
| ASM-001 | Start formal exam | Server creates immutable exam snapshot and expiry |
| ASM-002 | Client clock altered | Server timer remains authoritative |
| ASM-003 | Autosave retried | Latest valid response persisted idempotently |
| ASM-004 | Submit retried | One submission/result |
| ASM-005 | Session expires | Server transitions to expired according to policy |
| ASM-006 | Student requests unreleased answer/explanation | Not included |
| ASM-007 | XP reward in formal exam | XP cannot change academic score |
| ASM-008 | Hearts configured on formal exam | Policy validation rejects configuration |

## E. Progression, mastery, and gamification

| ID | Scenario | Expected result |
|---|---|---|
| PRG-001 | Activity completed | Attempt evidence recorded |
| PRG-002 | Mastery recalculated | Based on evidence policy, not XP |
| PRG-003 | Node gate met | Server unlocks next eligible node |
| PRG-004 | XP event consumed twice | One ledger award |
| PRG-005 | XP reversal | Compensating ledger entry; no destructive edit |
| PRG-006 | Same question replayed repeatedly | Mastery policy prevents trivial evidence inflation |
| PRG-007 | Student has low mastery | Remedial route suggested without punitive reset |

## F. RBAC, tenancy, privacy

- Test every role against every resource scope (platform, school, class, subject, assigned content).
- Include negative cross-tenant tests for reads, writes, exports, media, and analytics.
- Ensure parent/guardian access requires a verified relationship and consent policy where applicable.
- Ensure child leaderboard defaults are privacy-protective.
- Audit privileged actions, data exports, entitlement grants, content publication, and exam overrides.

## G. Non-functional tests

- API load tests for activity delivery, autosave, and leaderboard reads.
- Queue backpressure, worker crash, retry, and dead-letter tests.
- Database backup and restore drill.
- Accessibility checks at mobile and desktop breakpoints.
- Browser/device compatibility for MathLive, KaTeX, SVG/Canvas, and simulations.
- Performance budgets for map assets and question media.
- Dependency, secret, container image, and upload security scanning.

## Exit criteria
No P0/P1 security, data-integrity, assessment-integrity, or cross-tenant issue remains open. All critical state transitions and idempotency tests pass. Prototype-only behaviour is not accepted as evidence of backend readiness.
