import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false, // Run tests sequentially for E2E flows
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for sequential execution
  reporter: [
    ['html', { outputFolder: 'e2e/report' }],
    ['list']
  ],
  timeout: 60_000, // 60s per test
  expect: {
    timeout: 10_000 // 10s for assertions
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: {
      // Will be set dynamically in auth fixture
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  // Global setup for auth
  globalSetup: './e2e/fixtures/global-setup.ts'
});
