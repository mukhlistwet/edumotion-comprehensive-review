const SENSITIVE_KEYS = new Set([
  'password',
  'newPassword',
  'passwordHash',
  'password_hash',
  'accessToken',
  'refreshToken',
  'authorization',
  'Authorization',
  'answerSpec',
  'correctOptionIds',
  'acceptedValues',
  'acceptedExpressions',
  'tokenHash'
]);

export function redactSensitive(value, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, depth + 1));
  if (typeof value !== 'object') return value;

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redactSensitive(v, depth + 1);
    }
  }
  return out;
}

export function createLogger({ silent = false } = {}) {
  const entries = [];
  const metrics = {
    startedAt: new Date().toISOString(),
    totalRequests: 0,
    totalErrors: 0,
    statusCounts: {}
  };

  function log(level, event, data = {}) {
    const entry = redactSensitive({
      ts: new Date().toISOString(),
      level,
      event,
      ...data
    });
    entries.push(entry);
    if (entries.length > 500) entries.shift();
    if (!silent && process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify(entry));
    }
    return entry;
  }

  function recordRequestMetric(status) {
    metrics.totalRequests += 1;
    if (status >= 400) metrics.totalErrors += 1;
    metrics.statusCounts[status] = (metrics.statusCounts[status] || 0) + 1;
  }

  return {
    info: (event, data) => log('info', event, data),
    warn: (event, data) => log('warn', event, data),
    error: (event, data) => log('error', event, data),
    recordRequestMetric,
    getMetrics: () => ({ ...metrics, statusCounts: { ...metrics.statusCounts } }),
    getRecentLogs: () => [...entries]
  };
}
