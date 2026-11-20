import axios from 'axios';
import config from '../config';
import TokenStore from '../auth/tokenStore';
import { ApiErrorFactory } from './ApiError';

let refreshing = null; // shared by concurrent callers so the token is renewed only once

/**
 * Renew the token pair with the stored refresh token. Resolves true on success.
 * Uses bare axios (not the shared `api` instance) so the interceptors cannot call themselves.
 * Only a definite rejection (400/401/403) ends the session; rate limits (429), server errors (5xx)
 * and network failures are temporary, so the stored token is kept.
 */
export function refreshSession() {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function doRefresh() {
  const tokens = TokenStore.getInstance();
  const refreshToken = tokens.refreshToken;
  if (!refreshToken) return false;
  try {
    const response = await axios.post(`${config.apiUrl}/auth/refresh`, { refreshToken }, { timeout: 20000 });
    if (!response.data?.success) return false;
    tokens.set(response.data.data.tokens);
    return true;
  } catch (err) {
    const apiError = ApiErrorFactory.fromAxios(err);
    if ([400, 401, 403].includes(apiError.status)) tokens.clear('session-expired');
    return false;
  }
}
