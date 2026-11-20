import axios from 'axios';
import config from '../config';
import TokenStore from '../auth/tokenStore';
import { ApiError, ApiErrorFactory } from './ApiError';
import { refreshSession } from './session';

/**
 * The ONE shared axios instance. Every backend call goes through it, e.g. `api.get('/vendors', { params })`,
 * and the three interceptors below apply to all of them, so no endpoint repeats auth or error handling.
 *
 * Per-request options (set in the call's config):
 *   skipAuth: true   public call (sign in, register, ...): no token is sent, and a 401 is just "wrong credentials"
 *
 * What a call resolves to: `{ data, meta }` taken from the `{success, data, meta}` envelope.
 * What it rejects with: always an ApiError (see ApiError.js).
 */
const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 20000,
});

// 1. REQUEST: attach the Bearer token, first renewing it if it has expired.
api.interceptors.request.use(async (request) => {
  if (request.skipAuth) return request;
  const tokens = TokenStore.getInstance();
  if (tokens.refreshToken && tokens.isAccessTokenStale()) await refreshSession();
  if (tokens.accessToken) request.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return request;
});

// 2. RESPONSE (success): unwrap the envelope.
//    Resolve with the envelope's own `{ data, meta }`. A 204, or an envelope with success:false, is handled here too.
api.interceptors.response.use((response) => {
  const body = response.data;
  if (response.status === 204 || body === '' || body == null) return { data: null };
  if (body.success === false) throw ApiErrorFactory.fromResponse(response.status, body);
  return { data: body.data, meta: body.meta };
});

// 3. RESPONSE (error): on a 401 for a signed-in call, renew the session and retry ONCE;
//    otherwise turn whatever went wrong into an ApiError.
api.interceptors.response.use(undefined, async (error) => {
  if (error instanceof ApiError) throw error;
  const apiError = ApiErrorFactory.fromAxios(error);
  const request = error.config;
  if (apiError.status !== 401 || !request || request.skipAuth) throw apiError;

  const tokens = TokenStore.getInstance();
  if (!request._retried && tokens.refreshToken && (await refreshSession())) {
    request._retried = true;
    return api.request(request); // goes through the interceptors again, now with the new token
  }
  // Still unauthorised: the session was revoked (e.g. password changed on another device).
  if (tokens.accessToken || tokens.refreshToken) tokens.clear('session-expired');
  throw apiError;
});

/** Drops empty query values so `?q=&page=` is never sent. */
export const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export default api;
