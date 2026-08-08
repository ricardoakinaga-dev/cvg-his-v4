import { defineConfig, devices } from '@playwright/test';

const E2E_DATABASE_MODE = process.env.E2E_DATABASE_MODE === '1';
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@127.0.0.1:5433/cvg_his_v2_test';
const E2E_REDIS_URL =
  process.env.E2E_REDIS_URL || process.env.REDIS_URL || 'redis://127.0.0.1:6381';
const E2E_API_URL =
  process.env.API_URL ||
  process.env.BASE_URL ||
  (E2E_DATABASE_MODE ? 'http://127.0.0.1:3113' : 'http://localhost:3001');
const E2E_API_PORT = new URL(E2E_API_URL).port || (E2E_DATABASE_MODE ? '3113' : '3001');

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false, // Run tests sequentially for E2E flows
  forbidOnly: true,
  retries: 0,
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
    baseURL: E2E_API_URL,
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
  webServer: {
    command: E2E_DATABASE_MODE
      ? `bash -lc 'fuser -k ${E2E_API_PORT}/tcp 2>/dev/null || true; env NODE_ENV=test API_DISABLE_INCOMPATIBLE_DB_REPOS="0" AUTH_SECRET="e2e-test-secret-key-do-not-use-in-production-12345678" AUTH_RATE_LIMIT_MAX_REQUESTS="${process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '200'}" CORS_ALLOWED_ORIGINS="${E2E_API_URL}" DATABASE_URL="${E2E_DATABASE_URL}" DATABASE_URL_TEST="${E2E_DATABASE_URL}" REDIS_URL="${E2E_REDIS_URL}" PORT=${E2E_API_PORT} HOST=127.0.0.1 node apps/api/dist/index.js'`
      : "bash -lc 'fuser -k 3001/tcp 2>/dev/null || true; pnpm dev:api'",
    url: `${E2E_API_URL}/health`,
    reuseExistingServer: E2E_DATABASE_MODE,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000
  },
  // Global setup for auth
  globalSetup: './e2e/fixtures/global-setup.ts'
});
