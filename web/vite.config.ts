import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin /api in dev, mirroring nginx in Docker. The browser never talks to Fake Store.
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3001' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    globals: true,
    restoreMocks: true,
    css: false,
  },
});
