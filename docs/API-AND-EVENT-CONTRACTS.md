# API & Event Contract Baseline

All endpoints are versioned under `/api/v1`. Use JSON, authenticated identity from token/session, consistent error envelopes, pagination, correlation IDs, and tenant scope.

## Standard error
```json
{
  "error": {
    "code": "TEMPLATE_LOCKED",
    "message": "Template ini belum terbuka.",
    "details": {},
    "correlationId": "uuid"
  }
}
```

## Journey Experience
- `GET /me/journey/preferences`
- `PUT /me/journey/preferences`
- `PUT /me/journey/preferences/pending-template`
- `GET /journeys/{journeyId}/chapters/{chapterId}`
- `GET /journeys/{journeyId}/chapters/{chapterId}/map`
- `GET /journey-templates`
- `GET /me/journey/template-unlocks`
- `POST /journeys/{journeyId}/chapters/next`
- `POST /journeys/{journeyId}/nodes/{nodeId}/start`
- `POST /journeys/{journeyId}/nodes/{nodeId}/complete`

### Preference payload
```json
{
  "selectionMode": "personal",
  "preferredTemplateId": "adventure"
}
```

### Pending selection payload
```json
{ "templateId": "galaxy" }
```
The request validates template ID, compatibility, and current entitlement, then stores a pending preference. It must not mutate the active chapter snapshot.

### Next chapter command
Requires `Idempotency-Key`. Server verifies previous chapter completion and creates the chapter + immutable template snapshot in one transaction. Repeating the same key returns the original result.

## Question Bank / Manual Builder
- `POST /questions`
- `GET /questions/{questionId}`
- `PATCH /questions/{questionId}` (draft only)
- `POST /questions/{questionId}/validate`
- `POST /questions/{questionId}/preview`
- `POST /questions/{questionId}/submit-review`
- `POST /questions/{questionId}/reviews`
- `POST /questions/{questionId}/approve`
- `POST /questions/{questionId}/publish`
- `POST /questions/{questionId}/new-version`
- `POST /questions/{questionId}/archive`
- `POST /question-media/presign`
- `GET /question-taxonomies`

## AI Question Generator
- `POST /ai/question-generation-runs`
- `GET /ai/question-generation-runs/{runId}`
- `POST /ai/question-generation-runs/{runId}/cancel`
- `GET /ai/question-generation-runs/{runId}/items`
- `GET /ai/question-generation-items/{itemId}`
- `POST /ai/question-generation-items/{itemId}/retry`
- `POST /ai/question-generation-items/{itemId}/accept`
- `POST /ai/question-generation-items/{itemId}/reject`
- `POST /ai/question-generation-items/{itemId}/submit-review`
- `POST /ai/question-generation-items/{itemId}/reviews`

Accepting an AI item creates a Question draft. It does not publish the question.

## Learning / Activity
- `GET /learning-paths`
- `GET /learning-paths/{pathId}`
- `GET /learning-paths/{pathId}/chapters`
- `GET /activities/{activityId}/delivery`
- `POST /activities/{activityId}/attempts`
- `GET /activities/{activityId}/attempts/{attemptId}`

## Assessment
- `POST /assessments/{assessmentId}/sessions`
- `GET /assessment-sessions/{sessionId}`
- `PUT /assessment-sessions/{sessionId}/responses/{questionSnapshotId}`
- `POST /assessment-sessions/{sessionId}/submit`
- `GET /assessment-sessions/{sessionId}/result`

Server owns timer, expiry, snapshot, scoring, and result release policy.

## Events (transactional outbox)

Canonical event names:
- `QUESTION_VERSION_PUBLISHED`
- `AI_GENERATION_RUN_COMPLETED`
- `ACTIVITY_ATTEMPT_RECORDED`
- `ACTIVITY_COMPLETED`
- `COMPETENCY_MASTERY_UPDATED`
- `JOURNEY_NODE_COMPLETED`
- `JOURNEY_CHAPTER_COMPLETED`
- `JOURNEY_TEMPLATE_UNLOCKED`
- `JOURNEY_CHAPTER_STARTED`
- `XP_AWARDED`
- `ACHIEVEMENT_EARNED`
- `ASSESSMENT_SUBMITTED`
- `ASSESSMENT_GRADED`
- `SUBSCRIPTION_ENTITLEMENT_CHANGED`

Event envelope:
```json
{
  "eventId": "uuid",
  "eventName": "JOURNEY_NODE_COMPLETED",
  "eventVersion": 1,
  "occurredAt": "2026-11-18T00:00:00Z",
  "tenantId": null,
  "userId": "uuid",
  "aggregateType": "journey_node_progress",
  "aggregateId": "uuid",
  "correlationId": "uuid",
  "payload": {}
}
```

Consumers must be idempotent. Use outbox + retry + dead-letter handling. Event payloads must not include answer keys, secrets, or unnecessary personal data.
