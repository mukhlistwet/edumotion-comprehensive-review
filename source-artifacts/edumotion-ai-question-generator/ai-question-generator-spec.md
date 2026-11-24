# EduMotion AI Question Generator
## Product, Agent Workflow & Engineering Specification

## 1. Product intent
AI Question Generator adalah authoring assistant untuk menghasilkan draft soal berdasarkan learning objective, curriculum mapping, assessment blueprint, dan question schema EduMotion. Output harus kompatibel dengan Manual Question Builder dan Question Bank.

**Non-negotiable:** AI tidak boleh auto-publish. Semua output berstatus `draft` dan wajib melewati deterministic validation, independent verification, serta human approval.

Prototype HTML mensimulasikan alur UI dan contoh hasil; tidak melakukan panggilan LLM sungguhan.

## 2. User journey
1. Author memilih curriculum/version, grade, subject, topic, competency.
2. Author mengatur jumlah soal, distribusi difficulty, Bloom level, question types, language, context, dan special instructions.
3. Planner menyusun generation blueprint: kompetensi × indikator × difficulty × item type.
4. Generator menghasilkan structured JSON per item/batch.
5. Schema validator memeriksa bentuk dan required fields.
6. Deterministic verifier memeriksa jawaban, kalkulasi, satuan, toleransi, dan konsistensi solusi.
7. Similarity service memeriksa duplikasi dengan Question Bank.
8. Quality reviewer menilai kejelasan, level kognitif, distractor, bahasa, dan potensi bias.
9. Invalid items masuk retry/reject; warnings tetap terlihat.
10. Author meninjau, mengedit manual, regenerate, atau meminta reviewer.
11. Approved items disimpan sebagai question draft/approved version; publication tetap melalui workflow Question Bank.

## 3. Generation brief
Required:
- curriculumId + curriculumVersionId
- gradeLevelId
- subjectId
- topicId and competencyIds
- quantity (bounded, e.g. 1–50 per run)
- difficulty distribution
- allowed question types
- cognitive/Bloom distribution
- locale/language

Optional:
- source material or teacher-provided reference
- context style (daily life, academic, HOTS, olympiad, lab)
- inclusion/exclusion constraints
- desired answer/explanation/hint detail
- media/diagram requirement
- assessment use case and time target
- author notes

Do not let model infer unknown curriculum standards. Fetch taxonomy/competencies from database and pass grounded identifiers and descriptions.

## 4. Multi-agent / staged workflow
Prefer a staged orchestrator over a free-form autonomous agent loop.

### Stage A — Blueprint planner
Input: generation brief + curriculum taxonomy.
Output: blueprint items with objective, item intent, cognitive demand, difficulty, type, and variation strategy.
Checks: target distribution sums to 100%; competency coverage; no impossible combinations.

### Stage B — Question generator
Input: one blueprint item or small bounded batch + canonical schema.
Output: strict JSON object(s), no markdown.
Requirements:
- Original, unambiguous, grade-appropriate stem.
- Defensible answer key and plausible distractors.
- Explanation steps that prove the answer.
- Hint ladder and misconception mapping.
- No fabricated sources or unsupported curriculum claims.
- Never include executable JS/HTML or arbitrary code.

### Stage C — Schema validator
Use JSON Schema + AJV (or backend equivalent). Reject malformed output, missing fields, unknown enum values, invalid references, excessive lengths, unsafe markup, invalid media payloads.

### Stage D — Deterministic domain verifier
- Math: calculate independently with math.js or isolated SymPy service; compare expected values and solution steps.
- Numeric: decimal-safe comparisons, precision, tolerance, accepted forms.
- Physics: dimensional analysis, unit conversion, sign conventions, formula consistency, boundary conditions.
- MCQ: exactly one correct option unless multi-select; detect duplicate options and answer-key mismatch.
- Matching/ordering: all referenced item IDs exist and answer structure is complete.
- Formula: parse and compare expression equivalence in isolated symbolic service.
- Graph/geometry: validate axes, bounds, coordinates, geometric constraints, tolerance.
- Simulation: deterministic config, bounded parameter ranges, fixed timestep, no arbitrary code.
A second LLM can critique reasoning, but it is not a substitute for deterministic verification.

### Stage E — Quality reviewer
Evaluate:
- alignment to competency and cognitive level
- clarity and ambiguity
- age/reading-level appropriateness
- distractor plausibility and misconception relevance
- originality / similarity
- explanation quality
- accessibility and inclusive language
Output structured findings with severity and evidence. A numeric quality score is advisory, never proof of correctness.

### Stage F — Repair / retry
Pass only explicit validator errors and reviewer feedback to generator. Bounded retries (default 1–2). Keep each attempt and model metadata. If still invalid, mark `rejected` or `needs_human_review`; do not loop indefinitely.

### Stage G — Human review
Author can accept, edit, regenerate, reject, or submit for subject-matter review. Reviewer decisions are auditable. Approval is scoped by tenant and subject permissions.

## 5. Question schema compatibility
Reuse the canonical EduMotion Question Schema from Manual Question Builder:
- `metadata`
- `content`
- `answerSpec` (authoring-only)
- `scoring`
- `explanation`
- `delivery`
- `accessibility`
- `governance`

Do not create a second incompatible AI-only question format. Store schema version and generator provenance.

### AI generation envelope
```json
{
  "runId": "uuid",
  "schemaVersion": "edumotion-question-v1",
  "items": [
    {
      "clientItemId": "item-001",
      "question": {
        "metadata": {},
        "content": {},
        "answerSpec": {},
        "scoring": {},
        "explanation": {},
        "delivery": {},
        "accessibility": {}
      },
      "generation": {
        "blueprintId": "uuid",
        "modelProvider": "provider-id",
        "modelId": "model-id",
        "promptVersion": "qgen-v1",
        "attempt": 1
      }
    }
  ]
}
```
The envelope is for internal authoring pipeline only. Student delivery DTO must be separately constructed and must omit `answerSpec`, hidden scoring data, unreleased explanation, prompt and provider metadata.

## 6. Agent prompt contract
System/developer instructions should enforce:
- Follow supplied schema exactly.
- Use only supplied curriculum metadata and source content.
- Do not fabricate references.
- Do not claim verification or approval.
- Return one valid JSON object per item.
- Keep answer key and explanations in authoring-only fields.
- If the request is underspecified or conflicts with taxonomy, return structured `generation_blockers` rather than guessing.
- Include reasoning evidence in concise, inspectable solution steps, not hidden chain-of-thought.
- Never execute code or call arbitrary tools.

## 7. Data model additions
Suggested entities:
- `ai_generation_runs`: id, tenant_id, requested_by, status, brief_json, schema_version, prompt_version, provider/model, created_at, completed_at
- `ai_generation_items`: id, run_id, blueprint_item_id, question_id nullable, status, generated_payload, validation_report, quality_report, attempt_count
- `ai_generation_attempts`: item_id, attempt_no, provider, model, prompt_hash, input_tokens, output_tokens, latency_ms, cost, response_payload, error
- `ai_generation_reviews`: item_id, reviewer_id, decision, comments, findings, created_at
- `ai_prompt_templates`: key, version, system_prompt, task_template, schema_version, enabled
- `ai_model_policies`: task, provider/model routing policy, budget caps, allowed tools
Persist prompt hash/version and relevant configuration; avoid retaining unnecessary sensitive source data.

## 8. LoopBack 4 API outline
- `POST /ai/question-generation-runs` — create run and enqueue job
- `GET /ai/question-generation-runs/:id` — status/progress/summary
- `POST /ai/question-generation-runs/:id/cancel`
- `GET /ai/question-generation-runs/:id/items`
- `GET /ai/question-generation-items/:id` — authoring detail
- `POST /ai/question-generation-items/:id/retry`
- `POST /ai/question-generation-items/:id/accept` — create Question draft from payload
- `POST /ai/question-generation-items/:id/reject`
- `POST /ai/question-generation-items/:id/submit-review`
- `POST /ai/question-generation-items/:id/reviews`
- `GET /ai/question-generation-runs/:id/export`
- `GET /ai/question-generation-templates`

Queue: Redis + BullMQ. Use idempotency keys, cancellation, bounded retries, dead-letter handling, concurrency limits, and transactional outbox where needed. Run status must survive browser refresh.

## 9. UI architecture
- `AIQuestionGeneratorPage`
- `GenerationBriefForm`
- `CurriculumCompetencyPicker`
- `DifficultyDistributionEditor`
- `QuestionTypeDistributionEditor`
- `InstructionEditor`
- `QualityPolicyEditor`
- `AgentPolicyPanel`
- `PromptPreview`
- `GenerationRunMonitor`
- `GeneratedQuestionList`
- `GeneratedQuestionReviewCard`
- `ValidationFindingsPanel`
- `QuestionDiffViewer`
- `RegenerateDialog`
- `BulkApprovalToolbar`
- `GenerationCostPanel`
- `AuditTrail`

Question review card should expose:
- stem, type, difficulty, competency
- answer choices / answer key in authoring-only view
- solution and distractor rationale
- schema / domain validation findings
- quality warnings
- source/provenance and model version
- accept/edit/retry/reject actions

## 10. Quality gates and states
Run states:
`queued → planning → generating → validating → reviewing → completed | completed_with_errors | failed | cancelled`

Item states:
`generated → schema_valid | schema_invalid → verified | verification_failed → needs_review → accepted | changes_requested | rejected`

Only accepted/approved items may be promoted into Question Bank. `accepted` is not the same as `published`.

Blockers: invalid schema, missing answer key, unverified math/physics answer, ambiguous answer, unsupported media, unsafe content, wrong competency mapping.
Warnings: style, weak distractor, missing optional hint, reading complexity, possible similarity.

## 11. Cost, latency, and reliability
- Estimate token/cost before enqueue.
- Enforce per-run and per-tenant hard budgets server-side.
- Generate in bounded batches; stream progress events.
- Route simple generation to fast structured-output models; complex math/physics to stronger reasoning + deterministic verifier.
- Keep provider fallback policy explicit; do not silently switch to a model with incompatible structured-output capability.
- Log provider/model, prompt version/hash, token counts, latency, retries, cost, and errors.
- Cache taxonomy and schema versions, not user-specific generated answer keys.
- Do not expose provider API keys to browser.

## 12. Security, privacy, and governance
- AI provider calls happen server-side.
- Tenant isolation and RBAC on every run/item endpoint.
- Validate and sanitize teacher-provided source material; treat it as untrusted input.
- Prevent prompt injection in uploaded/reference content; content cannot override system policy or tools.
- Tool allowlist only: curriculum lookup, schema validation, calculator/math verifier, unit checker, similarity search, approved media library.
- No arbitrary shell, network, SQL, or code execution.
- Do not train on student data by default; minimize and retain source material only as policy requires.
- Log human decisions and maintain version history.
- Follow child privacy and applicable Indonesian PDP / child-protection requirements.

## 13. Acceptance criteria
- User can configure generation and resume run after page refresh.
- Generated items validate against the same schema as manual questions.
- Every generated item has provenance and validation report.
- Math/physics correctness is independently checked.
- Invalid items are retried only within configured limit.
- Human approval is mandatory before promotion/publish.
- Bulk accept only applies to items that pass blocking gates.
- Answer keys never leak to student delivery endpoints.
- Cost caps, cancellation, and tenant isolation are tested.
- Unit/integration tests cover validators, retries, duplicate detection, permissions, and failure recovery.

## 14. Implementation notes for EduMotion
Use React + Vite + JavaScript/JSX, Tailwind CSS only (no native CSS), LoopBack 4, PostgreSQL, Redis/BullMQ, and existing provider router. Reuse Manual Question Builder editors for editing generated questions. Reuse one Question Bank and one versioning/review workflow. AI Generator creates drafts; it is not a parallel content repository.
