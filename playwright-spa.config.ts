import { defineConfig, devices } from '@playwright/test';

const E2E_API_URL = 'http://127.0.0.1:3111';
const E2E_SPA_URL = 'http://127.0.0.1:3112';

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
        'env -u DATABASE_URL -u DATABASE_URL_TEST DATABASE_URL="postgres://postgres:postgres@localhost:5433/cvg_his_v2_test" DATABASE_URL_TEST="postgres://postgres:postgres@localhost:5433/cvg_his_v2_test" PORT=3111 HOST=127.0.0.1 node apps/api/dist/index.js',
      url: `${process.env.API_URL || E2E_API_URL}/health`,
      reuseExistingServer: true,
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command:
        `SPA_E2E_HOST=127.0.0.1 SPA_E2E_PORT=3112 SPA_E2E_API_TARGET=${process.env.API_URL || E2E_API_URL} node infra/scripts/serve-spa-e2e.mjs`,
      url: process.env.SPA_URL || E2E_SPA_URL,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ]
});
