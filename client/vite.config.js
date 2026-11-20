import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Optional extra hostname (e.g. a cloud preview domain) allowed to reach the dev server.
const extraHosts = (process.env.PREVIEW_ALLOWED_HOSTS || '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: extraHosts.length ? extraHosts : undefined,
    // In development the browser talks to Vite, which proxies /api to Express.
    // This keeps a single origin for the app and avoids CORS in the browser.
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
    restoreMocks: true,
  },
});
