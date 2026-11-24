import { normalizeApiError } from './errors.js';

function createCorrelationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `corr_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export function normalizePaginatedResponse(payload) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      pagination: { page: 1, pageSize: payload.length, totalItems: payload.length, totalPages: 1 }
    };
  }
  if (payload && Array.isArray(payload.items)) {
    return {
      items: payload.items,
      pagination: payload.pagination || {
        page: 1,
        pageSize: payload.items.length,
        totalItems: payload.items.length,
        totalPages: 1
      }
    };
  }
  return {
    items: [],
    pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
  };
}

export function createHttpClient({
  getConfig,
  tokenManager,
  fetchImpl = typeof fetch === 'function' ? fetch : null,
  onRefreshToken = null,
  onTelemetry = null
}) {
  async function request(method, path, options = {}) {
    const config = getConfig();
    const baseUrl = String(config.apiBaseUrl || '').replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const query = options.query ? `?${new URLSearchParams(options.query).toString()}` : '';
    const url = `${baseUrl}${cleanPath}${query}`;
    const correlationId = options.correlationId || createCorrelationId();
    const upperMethod = method.toUpperCase();

    // Only retry safe idempotent reads or mutations carrying an explicit Idempotency-Key
    const canRetry =
      upperMethod === 'GET' ||
      Boolean(options.idempotencyKey);
    const maxAttempts = canRetry ? Number(config.maxGetRetries ?? 2) + 1 : 1;

    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const externalSignal = options.signal;
      if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }
      const timeoutId = setTimeout(() => controller.abort(), Number(options.timeoutMs || config.timeoutMs || 8000));

      try {
        if (!fetchImpl) {
          throw new Error('HTTP fetch implementation tidak tersedia pada environment ini.');
        }
        const tokens = tokenManager ? await tokenManager.getTokens() : null;
        const headers = {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
          ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
          ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
          ...(options.headers || {})
        };

        const response = await fetchImpl(url, {
          method: upperMethod,
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (
          response.status === 401 &&
          onRefreshToken &&
          !options._retriedAuth &&
          !cleanPath.startsWith('/auth/login') &&
          !cleanPath.startsWith('/auth/refresh')
        ) {
          const refreshed = await onRefreshToken();
          if (refreshed) {
            return request(method, path, { ...options, _retriedAuth: true });
          }
        }

        const parsedBody = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw normalizeApiError(
            { ...parsedBody, status: response.status },
            correlationId
          );
        }

        if (onTelemetry) {
          // Never log tokens, credentials, answer keys, or PII
          onTelemetry({
            type: 'api_request',
            method: upperMethod,
            path: cleanPath,
            status: response.status,
            correlationId
          });
        }
        return parsedBody;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = normalizeApiError(err, correlationId);
        if (attempt >= maxAttempts || lastError.status < 500) {
          throw lastError;
        }
      }
    }
    throw lastError;
  }

  return {
    get: (path, opts) => request('GET', path, opts),
    post: (path, body, opts) => request('POST', path, { ...opts, body }),
    put: (path, body, opts) => request('PUT', path, { ...opts, body }),
    patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
    delete: (path, opts) => request('DELETE', path, opts)
  };
}
