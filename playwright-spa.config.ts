import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for SPA E2E tests.
 *
 * Tests the Vue SPA (apps/spa) on port 3002.
 * Auto-starts the SPA dev server and expects the API on port 3001.
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
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [['html', { outputFolder: 'e2e/spa-report' }], ['list']],
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: process.env.SPA_URL || 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
          args: ['--font-render-hinting=none', '--disable-skia-runtime-opts']
        }
      }
    }
  ],
  globalSetup: './e2e/fixtures/spa-global-setup.ts',
  webServer: {
    command: 'pnpm --filter @cvg-his-v2/spa run dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
