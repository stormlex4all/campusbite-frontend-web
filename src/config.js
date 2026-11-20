/** Build-time settings, read once. */
const assetBase = (import.meta.env.VITE_ASSET_URL || '').replace(/\/$/, '');

const config = Object.freeze({
  apiUrl: (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, ''),
  refreshTokenKey: 'campusbite.refreshToken',
  /** Photos come back as "/uploads/<file>"; set VITE_ASSET_URL when the API is on another origin. */
  assetUrl: (path) => (path ? `${assetBase}${path}` : ''),
});

export default config;
