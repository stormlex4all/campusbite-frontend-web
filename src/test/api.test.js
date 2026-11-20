import { describe, expect, test } from 'vitest';
import { authApi, metaApi, storesApi } from '../api/endpoints';
import { ApiError } from '../api/ApiError';
import api from '../api/axios';
import { refreshSession } from '../api/session';
import TokenStore from '../auth/tokenStore';
import { failure, mockFetch, tokens } from './mockApi';

/** A readable (unsigned) JWT, so the client can see its expiry. */
const jwt = (expiresInSeconds) => {
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'none' })}.${b64({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds })}.sig`;
};
const signedIn = (accessToken) => TokenStore.getInstance().set({ accessToken, refreshToken: tokens(1).refreshToken });

describe('shared api instance + interceptors', () => {
  test('sends the bearer token, drops empty query values, and returns data + meta', async () => {
    signedIn('access-1');
    const { fn } = mockFetch({});
    fn.mockImplementationOnce(async () => new Response(JSON.stringify({ success: true, data: [1, 2], meta: { total: 2 } }), { status: 200 }));
    const res = await storesApi.list({ q: 'cafe', page: '' });
    expect(res).toEqual({ data: [1, 2], meta: { total: 2 } });
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe('/api/vendors?q=cafe');
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  test('public calls send no token', async () => {
    signedIn('access-1');
    const { fn } = mockFetch({ 'GET /meta/options': { roles: ['student'] } });
    expect(await metaApi.options()).toEqual({ roles: ['student'] });
    expect(fn.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  test('an error envelope becomes an ApiError with field details', async () => {
    mockFetch({ 'POST /auth/login': () => failure(400, 'VALIDATION_ERROR', 'Please check the form', [{ field: 'email', message: 'Enter a valid email address' }]) });
    const err = await authApi.login({}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.isValidation).toBe(true);
    expect(err.fieldErrors).toEqual({ email: 'Enter a valid email address' });
  });

  test('wrong credentials (401) do not end an existing session', async () => {
    signedIn('access-1');
    mockFetch({ 'POST /auth/login': () => failure(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.') });
    const err = await authApi.login({ email: 'a@b.ca', password: 'x' }).catch((e) => e);
    expect(err.code).toBe('INVALID_CREDENTIALS');
    expect(TokenStore.getInstance().refreshToken).not.toBeNull();
  });

  test('network failure becomes a friendly ApiError', async () => {
    const { fn } = mockFetch({});
    fn.mockRejectedValueOnce(new TypeError('network down'));
    const err = await metaApi.options().catch((e) => e);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.message).toMatch(/could not reach the server/i);
  });
});

describe('expired access tokens are renewed before the request', () => {
  test('concurrent calls share ONE refresh, then use the new token', async () => {
    signedIn(jwt(-60)); // already expired
    let refreshes = 0;
    const { calls } = mockFetch({
      'POST /auth/refresh': () => {
        refreshes += 1;
        return { user: {}, tokens: { accessToken: 'fresh-access', refreshToken: tokens(2).refreshToken } };
      },
      'GET /auth/me': { user: { id: 'u1' } },
      'GET /vendors': [],
    });
    await Promise.all([authApi.me(), storesApi.list({})]);
    expect(refreshes).toBe(1);
    expect(TokenStore.getInstance().refreshToken).toBe(tokens(2).refreshToken);
    const authed = calls.filter((c) => c.path !== '/auth/refresh');
    expect(authed).toHaveLength(2);
    authed.forEach((c) => expect(c.headers.Authorization).toBe('Bearer fresh-access'));
  });

  test('a token that is still valid is used as it is (no refresh call)', async () => {
    signedIn(jwt(600));
    const { calls } = mockFetch({ 'GET /auth/me': { user: {} } });
    await authApi.me();
    expect(calls.map((c) => c.path)).toEqual(['/auth/me']);
  });

  test('a rejected refresh ends the session once and tells subscribers', async () => {
    signedIn(jwt(-60));
    const events = [];
    TokenStore.getInstance().subscribe((e) => events.push(e.type));
    mockFetch({
      'POST /auth/refresh': () => failure(401, 'INVALID_REFRESH_TOKEN', 'Please sign in again'),
      'GET /auth/me': () => failure(401, 'UNAUTHORIZED', 'Authentication required.'),
    });
    const err = await authApi.me().catch((e) => e);
    expect(err.status).toBe(401);
    expect(events).toEqual(['session-expired']);
    expect(TokenStore.getInstance().accessToken).toBeNull();
    expect(TokenStore.getInstance().refreshToken).toBeNull();
  });

  test.each([429, 503])('a %i during refresh keeps the session so the user can retry', async (status) => {
    signedIn(jwt(-60));
    mockFetch({ 'POST /auth/refresh': () => failure(status, 'TEMPORARY', 'Try again soon') });
    expect(await refreshSession()).toBe(false);
    expect(TokenStore.getInstance().refreshToken).toBe(tokens(1).refreshToken);
  });

  test('a network error during refresh keeps the stored refresh token', async () => {
    signedIn(jwt(-60));
    const { fn } = mockFetch({});
    fn.mockRejectedValueOnce(new TypeError('offline'));
    expect(await refreshSession()).toBe(false);
    expect(TokenStore.getInstance().refreshToken).toBe(tokens(1).refreshToken);
  });
});

describe('a revoked session', () => {
  test('a 401 on a signed-in call signs the user out', async () => {
    signedIn(jwt(600)); // looks valid, but the server revoked it (e.g. password changed on another device)
    const events = [];
    TokenStore.getInstance().subscribe((e) => events.push(e.type));
    mockFetch({ 'GET /auth/me': () => failure(401, 'INVALID_TOKEN', 'Invalid authentication token.') });
    await authApi.me().catch(() => {});
    expect(events).toEqual(['session-expired']);
  });
});

describe('TokenStore', () => {
  test('is a Singleton and reads the token expiry', () => {
    expect(TokenStore.getInstance()).toBe(TokenStore.getInstance());
    const store = TokenStore.getInstance();
    store.set({ accessToken: jwt(600), refreshToken: 'r' });
    expect(store.isAccessTokenStale()).toBe(false);
    store.set({ accessToken: jwt(10), refreshToken: 'r' });
    expect(store.isAccessTokenStale()).toBe(true); // within the 30 s safety margin
  });
});

describe('interceptors', () => {
  test('a 401 on a signed-in call renews the session and retries once with the new token', async () => {
    signedIn(jwt(600)); // looks valid but the server has expired it
    let attempts = 0;
    const { calls } = mockFetch({
      'POST /auth/refresh': () => ({ user: {}, tokens: { accessToken: 'fresh-access', refreshToken: tokens(2).refreshToken } }),
      'GET /auth/me': () => {
        attempts += 1;
        return attempts === 1 ? failure(401, 'TOKEN_EXPIRED', 'Token expired') : { user: { id: 'u1' } };
      },
    });
    expect(await authApi.me()).toEqual({ user: { id: 'u1' } });
    expect(calls.map((c) => c.path)).toEqual(['/auth/me', '/auth/refresh', '/auth/me']);
    expect(calls[2].headers.Authorization).toBe('Bearer fresh-access');
  });

  test('a call is retried at most once', async () => {
    signedIn(jwt(600));
    const { calls } = mockFetch({
      'POST /auth/refresh': () => ({ user: {}, tokens: { accessToken: 'fresh-access', refreshToken: tokens(2).refreshToken } }),
      'GET /auth/me': () => failure(401, 'INVALID_TOKEN', 'Nope'),
    });
    const err = await authApi.me().catch((e) => e);
    expect(err.status).toBe(401);
    expect(calls.filter((c) => c.path === '/auth/me')).toHaveLength(2);
    expect(TokenStore.getInstance().refreshToken).toBeNull(); // still rejected after renewing: session over
  });

  test('works for any method called on the shared instance, and unwraps data + meta', async () => {
    signedIn(jwt(600));
    mockFetch({ 'PATCH /things/1': () => ({ ok: true }) });
    expect(await api.patch('/things/1', { a: 1 })).toEqual({ data: { ok: true }, meta: undefined });
  });
});
