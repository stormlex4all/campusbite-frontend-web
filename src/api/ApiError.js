/**
 * ApiError + ApiErrorFactory (Factory pattern)
 * --------------------------------------------
 * Every failure (HTTP error envelope, network down, unreadable response) becomes one ApiError
 * so screens handle a single shape: `code`, a user-friendly `message`, and field-level `details`.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN_ERROR', details = [] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isValidation() {
    return this.code === 'VALIDATION_ERROR';
  }

  get isAuth() {
    return this.status === 401;
  }

  /** { fieldName: 'message' } for the first message of each field. */
  get fieldErrors() {
    const out = {};
    for (const d of this.details) if (d?.field && !(d.field in out)) out[d.field] = d.message;
    return out;
  }
}

export const ApiErrorFactory = {
  /** From a parsed `{success:false,error:{...}}` body. */
  fromResponse(status, body) {
    const e = body?.error;
    if (e && typeof e.message === 'string') {
      return new ApiError(e.message, { status, code: e.code, details: Array.isArray(e.details) ? e.details : [] });
    }
    return new ApiError('Something went wrong. Please try again.', { status, code: 'BAD_RESPONSE' });
  },

  network() {
    return new ApiError('We could not reach the server. Check your connection and try again.', { code: 'NETWORK_ERROR' });
  },

  timeout() {
    return new ApiError('The server took too long to respond. Please try again.', { code: 'TIMEOUT' });
  },

  /** From any axios error: an HTTP error response, a timeout, or no response at all. */
  fromAxios(error) {
    if (error instanceof ApiError) return error;
    if (error?.response) return ApiErrorFactory.fromResponse(error.response.status, error.response.data);
    if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return ApiErrorFactory.timeout();
    return ApiErrorFactory.network();
  },
};
