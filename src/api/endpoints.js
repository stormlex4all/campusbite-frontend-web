import api, { clean } from './axios';

/**
 * Every backend call, made with the shared `api` instance (see axios.js, which adds auth, refresh, retry,
 * envelope unwrapping and error mapping). One small object per backend area; screens never build URLs.
 * Single-item calls resolve to the data; list calls resolve to { data, meta } (meta holds paging).
 */
const data = (request) => request.then((r) => r.data);
const PUBLIC = { skipAuth: true };

export const metaApi = {
  options: () => data(api.get('/meta/options', PUBLIC)),
};

export const authApi = {
  register: (body) => data(api.post('/auth/register', body, PUBLIC)),
  login: (body) => data(api.post('/auth/login', body, PUBLIC)),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }, PUBLIC),
  me: () => data(api.get('/auth/me')),
  updateName: (name) => data(api.patch('/auth/me', { name })),
  changePassword: (body) => data(api.post('/auth/change-password', body)),
};

export const storesApi = {
  list: (params) => api.get('/vendors', { params: clean(params) }),
  get: (id) => data(api.get(`/vendors/${id}`)),
  listings: (id, params) => api.get(`/vendors/${id}/listings`, { params: clean(params) }),
};

export const vendorProfileApi = {
  get: () => data(api.get('/vendor/profile')),
  update: (body) => data(api.patch('/vendor/profile', body)),
};

/** The vendor's saved, recurring menu items (name, usual price, photos). */
export const menuApi = {
  list: (params) => api.get('/vendor/menu-items', { params: clean(params) }),
  get: (id) => data(api.get(`/vendor/menu-items/${id}`)),
  create: (body) => data(api.post('/vendor/menu-items', body)),
  update: (id, body) => data(api.patch(`/vendor/menu-items/${id}`, body)),
  archive: (id) => data(api.post(`/vendor/menu-items/${id}/archive`)),
  restore: (id) => data(api.post(`/vendor/menu-items/${id}/restore`)),
  addImage: (id, file, alt) => {
    const form = new FormData();
    form.append('alt', alt || '');
    form.append('image', file); // the file goes last so the server reads the text fields first
    return data(api.post(`/vendor/menu-items/${id}/images`, form, { timeout: 60000 }));
  },
  removeImage: (id, imageId) => data(api.delete(`/vendor/menu-items/${id}/images/${imageId}`)),
};

/** The vendor's listings: from a saved menu item, or one-off ("as it comes"). */
export const listingsApi = {
  list: (params) => api.get('/vendor/listings', { params: clean(params) }),
  create: (body) => data(api.post('/vendor/listings', body)),
  close: (id) => data(api.post(`/vendor/listings/${id}/close`)),
  reopen: (id) => data(api.post(`/vendor/listings/${id}/reopen`)),
};

export const adminApi = {
  users: (params) => api.get('/admin/users', { params: clean(params) }),
  user: (id) => data(api.get(`/admin/users/${id}`)),
  provisionVendor: (body) => data(api.post('/admin/vendors', body)),
  approve: (id) => data(api.post(`/admin/users/${id}/approve`, {})),
  suspend: (id, reason) => data(api.post(`/admin/users/${id}/suspend`, { reason })),
  reactivate: (id) => data(api.post(`/admin/users/${id}/reactivate`, {})),
  auditLogs: (params) => api.get('/admin/audit-logs', { params: clean(params) }),
};
