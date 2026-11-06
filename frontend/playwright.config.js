import { defineConfig } from '@playwright/test';

// End-to-end tests run against their own API and web servers on separate ports.
// The API uses backend/.env.test (the flowops_test database), so the development
// database is never touched. global-setup.js re-seeds the test database first.
const API_PORT = 4100;
const WEB_PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  workers: 1,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm --prefix ../backend run start:test',
      url: `http://localhost:${API_PORT}/api/health`,
      env: { PORT: String(API_PORT) },
      reuseExistingServer: false,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
    },
  ],
});
