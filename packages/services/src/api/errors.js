export class ApiError extends Error {
  constructor({
    code = 'UNKNOWN_ERROR',
    message = 'Terjadi kesalahan pada layanan.',
    status = 500,
    details = {},
    fieldErrors = {},
    correlationId = null
  }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.fieldErrors = fieldErrors;
    this.correlationId = correlationId;
  }
}

export function normalizeApiError(err, fallbackCorrelationId = null) {
  if (err instanceof ApiError) return err;
  if (err && err.error && typeof err.error === 'object') {
    return new ApiError({
      code: err.error.code || 'API_ERROR',
      message: err.error.message || 'Permintaan tidak dapat diproses.',
      status: err.status || 400,
      details: err.error.details || {},
      fieldErrors: err.error.details?.fieldErrors || {},
      correlationId: err.error.correlationId || fallbackCorrelationId
    });
  }
  if (err?.name === 'AbortError') {
    return new ApiError({
      code: 'REQUEST_TIMEOUT',
      message: 'Permintaan melewati batas waktu atau dibatalkan.',
      status: 408,
      correlationId: fallbackCorrelationId
    });
  }
  return new ApiError({
    code: err?.code || 'INTERNAL_ERROR',
    message: err?.message || 'Terjadi gangguan jaringan atau server.',
    status: err?.status || 500,
    details: err?.details || {},
    fieldErrors: err?.fieldErrors || {},
    correlationId: err?.correlationId || fallbackCorrelationId
  });
}
