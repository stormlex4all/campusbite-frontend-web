import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the Vite server proxies /api to the Node backend, so the browser sees one origin
// (no CORS setup needed). Override the target with VITE_PROXY_TARGET if the API runs elsewhere.
const target = process.env.VITE_PROXY_TARGET || 'http://localhost:4000';
// /uploads serves vendors' menu photos from the backend
const proxy = { '/api': { target, changeOrigin: true }, '/uploads': { target, changeOrigin: true } };

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    port: 4173,
    proxy,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
}));
