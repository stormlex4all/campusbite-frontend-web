import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import TokenStore from './tokenStore';
import { refreshSession } from '../api/session';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

/**
 * Session state for the whole app.
 *   status: 'loading'  (checking a stored session on first load)
 *           'authenticated' | 'anonymous'
 * Subscribes to TokenStore (Observer) so an expired session anywhere sends the user back to sign-in.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, vendor: null, notice: null });

  const apply = useCallback((profile) => {
    setState({ status: 'authenticated', user: profile.user, vendor: profile.vendor ?? null, notice: null });
  }, []);

  // Restore a session after a page reload
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tokens = TokenStore.getInstance();
      if (!tokens.refreshToken) return setState({ status: 'anonymous', user: null, vendor: null, notice: null });
      const ok = await refreshSession();
      if (!ok) return !cancelled && setState({ status: 'anonymous', user: null, vendor: null, notice: null });
      try {
        const profile = await authApi.me();
        if (!cancelled) apply(profile);
      } catch {
        if (!cancelled) setState({ status: 'anonymous', user: null, vendor: null, notice: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  // React when the session ends somewhere else (refresh rejected, suspended, ...)
  useEffect(
    () =>
      TokenStore.getInstance().subscribe((event) => {
        if (event.type === 'session-expired') {
          setState({ status: 'anonymous', user: null, vendor: null, notice: 'Your session has ended. Please sign in again.' });
        }
      }),
    [],
  );

  const startSession = useCallback(
    async ({ user, tokens }) => {
      TokenStore.getInstance().set(tokens);
      // Vendors also need their store profile
      const profile = user.role === 'vendor' ? await authApi.me() : { user };
      apply(profile);
      return profile.user;
    },
    [apply],
  );

  const login = useCallback(async (credentials) => startSession(await authApi.login(credentials)), [startSession]);
  const register = useCallback(async (details) => startSession(await authApi.register(details)), [startSession]);

  const logout = useCallback(async () => {
    const tokens = TokenStore.getInstance();
    const refreshToken = tokens.refreshToken;
    tokens.clear('signed-out');
    setState({ status: 'anonymous', user: null, vendor: null, notice: null });
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
  }, []);

  const refreshProfile = useCallback(async () => apply(await authApi.me()), [apply]);

  /** After the password changes the server issues a fresh token pair. */
  const adoptTokens = useCallback((tokens) => TokenStore.getInstance().set(tokens), []);

  const value = useMemo(
    () => ({ ...state, login, register, logout, refreshProfile, adoptTokens, setState }),
    [state, login, register, logout, refreshProfile, adoptTokens],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export const homePathFor = (role) => ({ student: '/stores', vendor: '/my-store', admin: '/admin/users' })[role] || '/';
