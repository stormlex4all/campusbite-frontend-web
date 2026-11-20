import config from '../config';

/**
 * TokenStore (Singleton + Observer)
 * ---------------------------------
 * Holds the session tokens for the whole app.
 *  - The short-lived access token lives only in memory.
 *  - The refresh token is kept in localStorage so a reload can restore the session.
 * Interested parties (the auth context) `subscribe` and are told when the session changes or ends.
 */
class TokenStore {
  static #instance = null;
  #accessToken = null;
  #listeners = new Set();

  static getInstance() {
    if (!TokenStore.#instance) TokenStore.#instance = new TokenStore();
    return TokenStore.#instance;
  }

  get accessToken() {
    return this.#accessToken;
  }

  get refreshToken() {
    try {
      return localStorage.getItem(config.refreshTokenKey);
    } catch {
      return null;
    }
  }

  /** True when there is no access token, or it is expired / about to expire (reads the JWT `exp` claim). */
  isAccessTokenStale(skewSeconds = 30) {
    if (!this.#accessToken) return true;
    try {
      const payload = this.#accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const { exp } = JSON.parse(atob(payload));
      return typeof exp === 'number' ? exp * 1000 - Date.now() < skewSeconds * 1000 : false;
    } catch {
      return false; // not a readable JWT: let the server decide
    }
  }

  set({ accessToken, refreshToken }) {
    this.#accessToken = accessToken;
    try {
      localStorage.setItem(config.refreshTokenKey, refreshToken);
    } catch {
      /* storage blocked: the session just will not survive a reload */
    }
  }

  clear(reason = 'signed-out') {
    this.#accessToken = null;
    try {
      localStorage.removeItem(config.refreshTokenKey);
    } catch {
      /* ignore */
    }
    this.#emit({ type: reason });
  }

  /** @returns {() => void} unsubscribe */
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit(event) {
    this.#listeners.forEach((l) => l(event));
  }

  /** Tests only. */
  static reset() {
    TokenStore.#instance = null;
  }
}

export default TokenStore;
