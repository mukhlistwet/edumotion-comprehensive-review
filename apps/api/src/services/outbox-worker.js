import crypto from 'node:crypto';

export async function enqueueOutboxEvent(
  tx,
  {
    eventName,
    aggregateType,
    aggregateId,
    userId = null,
    tenantId = null,
    correlationId = null,
    payload = {}
  }
) {
  const id = `evt_${crypto.randomUUID().slice(0, 12)}`;
  await tx.query(
    `INSERT INTO outbox_events (id, event_name, event_version, tenant_id, user_id, aggregate_type, aggregate_id, correlation_id, payload_json, status)
     VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8::jsonb,'pending')`,
    [id, eventName, tenantId, userId, aggregateType, aggregateId, correlationId, JSON.stringify(payload)]
  );
  return id;
}

export async function processPendingOutboxEvents(
  db,
  handlers = {},
  { consumerName = 'default_consumer', maxAttempts = 3 } = {}
) {
  const pendingRes = await db.query(
    `SELECT * FROM outbox_events WHERE status IN ('pending', 'retry_scheduled') ORDER BY occurred_at ASC LIMIT 100`
  );
  const summary = { processed: 0, deduplicated: 0, retried: 0, deadLettered: 0 };

  for (const evt of pendingRes.rows) {
    const alreadyRes = await db.query(
      `SELECT 1 FROM processed_events WHERE consumer_name = $1 AND event_id = $2`,
      [consumerName, evt.id]
    );
    if (alreadyRes.rows.length > 0) {
      await db.query(
        `UPDATE outbox_events SET status = 'processed', processed_at = NOW() WHERE id = $1`,
        [evt.id]
      );
      summary.deduplicated += 1;
      continue;
    }

    const handler = handlers[evt.event_name] || (async () => {});
    try {
      await handler(evt);
      await db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO processed_events (consumer_name, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [consumerName, evt.id]
        );
        await tx.query(
          `UPDATE outbox_events SET status = 'processed', processed_at = NOW() WHERE id = $1`,
          [evt.id]
        );
      });
      summary.processed += 1;
    } catch (err) {
      const nextAttempts = Number(evt.attempts || 0) + 1;
      const nextStatus = nextAttempts >= maxAttempts ? 'dead_letter' : 'retry_scheduled';
      await db.query(
        `UPDATE outbox_events SET status = $2, attempts = $3, last_error = $4 WHERE id = $1`,
        [evt.id, nextStatus, nextAttempts, err?.message || 'Unknown consumer error']
      );
      if (nextStatus === 'dead_letter') summary.deadLettered += 1;
      else summary.retried += 1;
    }
  }
  return summary;
}
