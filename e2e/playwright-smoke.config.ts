import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const rootDir = path.resolve(__dirname, '..');

export default defineConfig({
  testDir: './tests',
  testMatch: '**/smoke.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:4000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: [
    {
      command: 'npx tsx src/index.ts',
      cwd: path.join(rootDir, 'apps', 'api'),
      url: 'http://localhost:4001/health',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        PORT: '4001',
        HOST: '127.0.0.1'
      }
    },
    {
      command: 'npx tsx src/index.ts',
      cwd: path.join(rootDir, 'apps', 'web'),
      url: 'http://localhost:4000',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        PORT: '4000',
        HOST: '127.0.0.1',
        API_BASE_URL: 'http://localhost:4001'
      }
    }
  ]
});
