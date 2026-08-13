import { defineConfig, devices } from '@playwright/test';

const E2E_API_URL = 'http://127.0.0.1:3111';
const E2E_SPA_URL = 'http://127.0.0.1:3112';
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  'postgres://postgres:postgres@127.0.0.1:5433/cvg_his_v2_test';
const E2E_REDIS_URL =
  process.env.E2E_REDIS_URL || process.env.REDIS_URL || 'redis://127.0.0.1:6381';
const E2E_DISABLE_INCOMPATIBLE_DB_REPOS = process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS ?? '0';
const E2E_REUSE_EXISTING_SERVER = process.env.E2E_REUSE_EXISTING_SERVER === 'true';
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@cvg-his.local';
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'seed_admin';

process.env.API_URL = process.env.API_URL || E2E_API_URL;
process.env.SPA_URL = process.env.SPA_URL || E2E_SPA_URL;

/**
 * Playwright config for SPA E2E tests.
 *
 * Tests the Vue SPA (apps/spa) on dedicated E2E ports.
 * Auto-starts the SPA dev server and API in an isolated local runtime.
 *
 * Usage:
 *   npx playwright test --config playwright-spa.config.ts
 *   npx playwright test --config playwright-spa.config.ts --headed
 *   npx playwright test --config playwright-spa.config.ts -g "Visual"
 *   npx playwright test --config playwright-spa.config.ts -g "Visual" --update-snapshots
 *   E2E_REUSE_EXISTING_SERVER=true npx playwright test --config playwright-spa.config.ts
 */
export default defineConfig({
  testDir: './e2e/spa',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  outputDir: `/tmp/playwright-results-${Date.now()}`,
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: process.env.SPA_URL || E2E_SPA_URL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: 'light'
  },
  snapshotPathTemplate: '{testDir}/snapshots/{testFilePath}/{arg}{ext}',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: [
            '--font-render-hinting=none',
            '--disable-skia-runtime-opts',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        }
      }
    }
  ],
  globalSetup: './e2e/fixtures/spa-global-setup.ts',
  webServer: [
    {
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
        PORT: '3111',
        HOST: '127.0.0.1'
      },
      url: `${process.env.API_URL || E2E_API_URL}/ready`,
      reuseExistingServer: E2E_REUSE_EXISTING_SERVER,
      timeout: 600_000,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command:
        'pnpm --filter @cvg-his-v2/spa build && node infra/scripts/serve-spa-e2e.mjs',
      env: {
        SPA_E2E_HOST: '127.0.0.1',
        SPA_E2E_PORT: '3112',
        SPA_E2E_API_TARGET: process.env.API_URL || E2E_API_URL
      },
      url: process.env.SPA_URL || E2E_SPA_URL,
      reuseExistingServer: E2E_REUSE_EXISTING_SERVER,
      timeout: 600_000,
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ]
});
