import { vi } from 'vitest';
import { AxiosError } from 'axios';
import axios from 'axios';
import api from '../api/axios';

/**
 * Network double for tests. Installs a custom adapter on axios and on the shared `api` instance, so the app's real calls, interceptors,
 * auth headers, refresh logic and error mapping all run. Routes are matched by "METHOD /path".
 * A handler returns plain data (sent as `{success:true,data}`) or a Response made with json()/failure().
 * `fn` is a vi.fn(url, init) so tests can inspect calls or queue one-off results/failures.
 */
export function mockFetch(routes) {
  const calls = [];
  const fn = vi.fn(async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const path = new URL(url, 'http://localhost').pathname.replace(/^\/api/, '');
    calls.push({ method, path, url, headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined });
    const handler = routes[`${method} ${path}`];
    if (!handler) return json(404, { success: false, error: { code: 'NOT_FOUND', message: `No mock for ${method} ${path}` } });
    const result = typeof handler === 'function' ? handler(calls[calls.length - 1], calls) : handler;
    return result instanceof Response ? result : json(200, { success: true, data: result });
  });

  const adapter = async (config) => {
    const url = axios.getUri(config);
    let res;
    try {
      res = await fn(url, { method: config.method, headers: config.headers.toJSON(), body: typeof config.data === 'string' ? config.data : undefined });
    } catch {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config); // no response, like a real outage
    }
    const text = await res.text();
    const response = { data: text ? JSON.parse(text) : '', status: res.status, statusText: String(res.status), headers: {}, config, request: {} };
    if (res.status >= 200 && res.status < 300) return response;
    throw new AxiosError(`Request failed with status code ${res.status}`, 'ERR_BAD_REQUEST', config, response.request, response);
  };
  axios.defaults.adapter = adapter; // bare axios (used for the refresh call)
  api.defaults.adapter = adapter; // the shared instance copied its defaults when it was created
  return { fn, calls };
}

export const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
export const failure = (status, code, message, details) => json(status, { success: false, error: { code, message, ...(details && { details }) } });
export const tokens = (n = 1) => ({ accessToken: `access-${n}`, refreshToken: `refresh-token-value-${n}-abcdefghijkl` });
export const student = { id: 's1', name: 'Sam Student', email: 'sam@rdpolytech.ca', role: 'student', status: 'active' };
export const admin = { id: 'a1', name: 'Ada Admin', email: 'ada@campusbite.test', role: 'admin', status: 'active' };
export const vendorUser = { id: 'v1', name: 'Val Vendor', email: 'val@campusbite.test', role: 'vendor', status: 'active' };
export const vendorStore = { id: 'st1', storeName: 'Campus Cafe', building: 'Main Building', counterLocation: '', description: '', pickupInstructions: '', openingHours: [] };
