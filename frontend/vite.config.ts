import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The API runs on loopback port 8000. The dev server forwards /api to it.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
      // Line coverage gate for `npm test`. Vitest exits non-zero below this.
      thresholds: { lines: 80 },
    },
  },
});
