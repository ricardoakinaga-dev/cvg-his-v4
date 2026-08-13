import { defineConfig, devices } from '@playwright/test';

const E2E_API_URL = process.env.API_URL || process.env.BASE_URL || 'http://127.0.0.1:3001';
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  'postgres://postgres:postgres@127.0.0.1:5434/cvg_his_e2e';
const E2E_REDIS_URL =
  process.env.E2E_REDIS_URL || process.env.REDIS_URL || 'redis://127.0.0.1:6381';
const E2E_DISABLE_INCOMPATIBLE_DB_REPOS = process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS ?? '0';
const E2E_REUSE_EXISTING_SERVER = process.env.E2E_REUSE_EXISTING_SERVER === 'true';
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@cvg-his.local';
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'seed_admin';

process.env.API_URL = E2E_API_URL;
process.env.BASE_URL = E2E_API_URL;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'e2e/report', open: 'never' }], ['list']],
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: E2E_API_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command:
      'pnpm --filter @cvg-his-v2/api^... build && node infra/scripts/prepare-test-db.mjs && node packages/db/dist/seed.js && pnpm --filter @cvg-his-v2/api build && node apps/api/dist/index.js',
    env: {
      API_DISABLE_INCOMPATIBLE_DB_REPOS: E2E_DISABLE_INCOMPATIBLE_DB_REPOS,
      NODE_ENV: 'test',
      PIX_MOCK_MODE: 'true',
      EMAIL_MOCK_MODE: 'true',
      SMS_MOCK_MODE: 'true',
      GOOGLE_CALENDAR_MOCK_MODE: 'true',
      AUTH_SECRET: 'e2e-test-secret-key-do-not-use-in-production-12345678',
      AUTH_RATE_LIMIT_MAX_REQUESTS: process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '200',
      DATABASE_URL: E2E_DATABASE_URL,
      DATABASE_URL_TEST: E2E_DATABASE_URL,
      REDIS_URL: E2E_REDIS_URL,
      ADMIN_EMAIL: E2E_ADMIN_EMAIL,
      ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
      E2E_ADMIN_PASSWORD,
      PORT: '3001',
      HOST: '127.0.0.1'
    },
    url: `${E2E_API_URL}/ready`,
    reuseExistingServer: E2E_REUSE_EXISTING_SERVER,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 600_000
  },
  globalSetup: './e2e/fixtures/global-setup.ts'
});
