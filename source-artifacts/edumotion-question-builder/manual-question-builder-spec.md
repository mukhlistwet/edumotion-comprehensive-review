# EduMotion — Manual Question Builder
## Product & Engineering Specification

## 1. Purpose
Manual Question Builder adalah authoring workspace untuk admin platform, akademi/sekolah, guru, dan reviewer dalam membuat, memvalidasi, mengelola versi, serta menerbitkan soal ke Question Bank EduMotion.

Template HTML adalah **interactive UI prototype**. Tombol dan beberapa editor masih simulasi; belum terhubung ke API, upload storage, autosave backend, atau engine penilaian.

## 2. Roles and permission boundaries
- **Platform Question Admin**: membuat, mengubah, mengarsipkan soal global; mengelola taxonomy dan review policy.
- **Institution Content Admin**: membuat dan mengelola soal dalam tenant organisasinya.
- **Teacher / Author**: membuat draft, mengedit draft milik sendiri atau sesuai assignment.
- **Reviewer / Subject Matter Expert**: memberi komentar, meminta revisi, approve/reject.
- **Publisher**: menerbitkan versi approved sesuai scope.
- **Student**: hanya menerima delivery payload yang sudah disanitasi; tidak pernah menerima answer key, scoring rules rahasia, atau solusi sebelum waktunya.

Backend wajib menegakkan RBAC + tenant scope. Jangan mengandalkan hide/show tombol di frontend.

## 3. Authoring workflow
1. Create draft → generate UUID dan `question_code`.
2. Select curriculum, grade, subject, topic, competencies, difficulty, cognitive level.
3. Select question type.
4. Compose stem, instructions, media, formula, diagram, and accessibility text.
5. Configure answer schema and accepted answers.
6. Configure scoring, partial credit, tolerance, units, rubric.
7. Write explanation, feedback, misconceptions, remediation references.
8. Configure delivery rules, allowed assessment modes, visibility, language.
9. Validate schema, answer consistency, media, accessibility, and curriculum mapping.
10. Preview as student on desktop/mobile.
11. Submit for review → reviewer comments → revision cycle.
12. Approve → publish immutable version.
13. When editing published question, create a new version; never mutate a version already referenced by an assessment snapshot.

## 4. Required UI sections
### A. Metadata
- Internal title and unique code
- Subject, curriculum, curriculum version, grade/level
- Topic/subtopic and one or more competency IDs
- Difficulty, cognitive level (Bloom), estimated solve time
- Language, tags, author, organization/tenant
- Source/reference and copyright/license metadata

### B. Question content
- Question type selector
- Stem and instruction rich-text editor
- Formula editor (KaTeX display + MathLive input)
- Media manager: image, SVG, audio, video, attachment
- Diagram/graph/simulation configuration
- Alt text, transcript, caption, source/license
- Mobile preview and accessibility preview

### C. Answer configuration
- Answer type-specific editor
- Correct answer(s), accepted variants, distractors
- Case sensitivity, normalization, whitespace handling
- Numeric tolerance, precision, decimal separator, units
- Matching pairs, ordering sequence, coordinate target, formula equivalence
- Hidden answer key separation from student delivery

### D. Scoring
- Maximum points and scoring method
- Exact, partial, weighted rubric, manual grading
- Negative marking and penalty
- Per-step scoring and criteria
- Numeric tolerance and unit validation
- AI-assisted grading must be advisory; final grading policy is explicit and auditable

### E. Explanation & feedback
- Worked solution with ordered steps
- Correct/incorrect/partial feedback
- Hint ladder (hint 1, hint 2, final clue)
- Common misconceptions
- Remediation lesson/competency references
- Release policy: immediate, after question set, after exam closes, never

### F. Delivery and governance
- Allowed contexts: lesson, practice, daily challenge, tryout, UTS, UAS
- Time limit, attempts, hint availability, shuffle behavior
- Visibility: private, institution, global bank
- Workflow status: draft, in_review, changes_requested, approved, published, archived
- Version, change notes, reviewer history, audit trail

## 5. Supported question types
| Type | Answer editor | Validation / scoring notes |
|---|---|---|
| `single_choice` | options + one correct | exact option ID |
| `multiple_select` | options + correct set | exact set or partial-credit policy |
| `true_false` | true/false | boolean |
| `numeric` | value, unit, tolerance | decimal-safe comparison; explicit unit conversion |
| `short_text` | accepted strings | normalization + case policy |
| `fill_blank` | tokenized blanks | each blank has accepted values and weight |
| `matching` | left/right pairs | pair IDs; partial credit per pair |
| `ordering` | ordered item IDs | exact order or per-position partial credit |
| `drag_drop` | draggable items + targets | target constraints; keyboard alternative |
| `formula_input` | MathLive expression | symbolic equivalence service, bounded and isolated |
| `graph_plot` | coordinate/curve task | axes bounds, snap, target geometry, tolerance |
| `diagram_label` | hotspot/label mapping | region IDs and accepted labels |
| `simulation` | parameter interaction | deterministic simulation config + measurable target |
| `essay` / `worked_solution` | rich text / steps | rubric/manual grading; AI assist is non-authoritative |

## 6. Canonical question schema (illustrative)
```json
{
  "id": "uuid",
  "code": "MAT-SMP-ALG-001",
  "version": 1,
  "status": "draft",
  "metadata": {
    "title": "Latihan Persamaan Linear",
    "subjectId": "math",
    "curriculumId": "kurikulum-merdeka",
    "curriculumVersionId": "2026",
    "gradeLevelId": "grade-7",
    "topicId": "linear-equation",
    "competencyIds": ["solve-linear-equation"],
    "difficulty": "medium",
    "cognitiveLevel": "C3",
    "estimatedSeconds": 90,
    "language": "id-ID",
    "tags": ["algebra"]
  },
  "content": {
    "type": "single_choice",
    "stem": [{"type":"text","value":"Tentukan nilai x dari "},{"type":"math","value":"3x+5=20"}],
    "instruction": "Pilih satu jawaban yang benar.",
    "media": []
  },
  "answerSpec": {
    "options": [
      {"id":"a","content":"3"},
      {"id":"b","content":"5"},
      {"id":"c","content":"7"},
      {"id":"d","content":"10"}
    ],
    "correctOptionIds": ["b"]
  },
  "scoring": {"method":"exact_match","maxPoints":10,"negativeMarking":0},
  "explanation": {
    "steps": ["3x + 5 = 20","3x = 15","x = 5"],
    "correctFeedback": "Tepat!",
    "incorrectFeedback": "Periksa operasi invers."
  },
  "delivery": {
    "allowedModes": ["lesson","practice"],
    "feedbackPolicy": "immediate",
    "shuffleOptions": true
  },
  "accessibility": {"altText": null, "transcript": null},
  "governance": {"tenantId": null, "createdBy": "uuid"}
}
```
Canonical storage may use JSONB for flexible `content`, `answerSpec`, and `explanation`, but metadata, ownership, status, version, and relations should remain queryable relational columns. Keep answer key in a protected authoring domain or separate protected column/table. Never include it in student delivery DTO.

## 7. Suggested backend resources (LoopBack 4)
- `POST /questions` — create draft
- `GET /questions/:id` — authoring detail (permission-checked)
- `PATCH /questions/:id` — update draft only
- `POST /questions/:id/validate` — validation report
- `POST /questions/:id/preview` — sanitized preview payload
- `POST /questions/:id/submit-review`
- `POST /questions/:id/reviews`
- `POST /questions/:id/approve`
- `POST /questions/:id/publish`
- `POST /questions/:id/new-version`
- `POST /questions/:id/archive`
- `POST /question-media/presign` — secure upload flow
- `GET /question-taxonomies` — curriculum/subject/topic/competency options

Use optimistic concurrency (`revision` or `updatedAt`), idempotency for publish/submit operations, audit logs for sensitive transitions, and tenant scope on every query.

## 8. Validation pipeline
**Blocking errors**
- Missing stem/type/required metadata
- No valid correct answer or invalid answer reference
- Scoring total inconsistent with rubric
- Invalid JSON schema
- Broken media references
- Unsupported formula/interaction payload
- Missing required competency mapping
- Assessment-incompatible delivery setting

**Warnings**
- Ambiguous stem or multiple plausible answers
- Distractors are duplicates or obviously implausible
- Excessive reading complexity for grade
- Missing alt text/transcript
- Missing explanation or remediation mapping
- Estimated time outside expected range

Validation should be deterministic and rule-based first. AI may suggest ambiguity/readability improvements but cannot silently rewrite or approve the question.

## 9. Security and exam integrity
- Authoring DTO and student delivery DTO must be different types.
- Student endpoint returns only stem, assets, interaction config, and permitted hints.
- Never return `correctOptionIds`, accepted answers, scoring secret, or unreleased explanation.
- Formal exams use immutable question-version snapshots.
- Server owns exam clock, attempt state, autosave ordering, and submission.
- Avoid arbitrary HTML/JS in question content. Use a typed content AST and allowlisted media.
- Sanitize rich text; validate SVG and uploaded files; virus scan where appropriate.
- Formula equivalence and symbolic evaluation run in isolated, resource-limited service.
- Record author, reviewer, approver, publisher, timestamps, and change reason.

## 10. Frontend component map
- `QuestionBuilderPage`
- `QuestionMetadataForm`
- `QuestionTypePicker`
- `QuestionContentEditor`
- `RichTextMathEditor`
- `QuestionMediaManager`
- `QuestionTypeEditorRegistry`
  - `SingleChoiceEditor`, `MultipleSelectEditor`, `NumericEditor`, `MatchingEditor`, `OrderingEditor`, `GraphPlotEditor`, `DiagramLabelEditor`, `SimulationEditor`, etc.
- `AnswerKeyEditor`
- `ScoringRuleEditor`
- `RubricEditor`
- `ExplanationEditor`
- `DeliveryPolicyEditor`
- `QuestionPreview`
- `ValidationPanel`
- `ReviewWorkflowPanel`
- `VersionHistoryPanel`

Keep business logic outside React components. Use JavaScript + JSX and JSDoc for shared contracts, Tailwind CSS for all production styling (no native CSS). Share JSON Schema as canonical validation contract across web/mobile/backend where practical.

## 11. Production implementation acceptance criteria
- Author can create and resume draft.
- Autosave shows pending/saved/error and handles network retry without overwriting newer revision.
- Each question type has dedicated editor and preview renderer.
- Answer key is never exposed to student API.
- Validation shows field-level errors and warnings.
- Reviewer can request changes, approve, and leave audit trail.
- Published version is immutable; edits create a new version.
- Media upload supports progress, retry, file limits, and access control.
- Keyboard navigation and mobile authoring usability are tested.
- Unit tests cover answer validators and scoring edge cases.
- Integration tests cover workflow permissions and tenant isolation.
- Exam integration creates immutable snapshots and uses server-authoritative timing.
