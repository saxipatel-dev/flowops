import { defineConfig } from '@playwright/test';

// End-to-end tests run against the local dev servers and reset the
// development database with seed data before starting.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'npm --prefix ../backend run start', url: 'http://localhost:4000/api/health', reuseExistingServer: true },
    { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true },
  ],
});
