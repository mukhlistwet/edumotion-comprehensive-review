export class HttpApiError extends Error {
  constructor({
    code = 'INTERNAL_ERROR',
    message = 'Terjadi kesalahan pada server.',
    status = 500,
    details = {},
    fieldErrors = {}
  }) {
    super(message);
    this.name = 'HttpApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}
