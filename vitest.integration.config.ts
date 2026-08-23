import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'node',
      // Database integration suites create disposable databases and cluster roles.
      // Run files serially so one suite cannot hold the global test-db lock while
      // another suite is tearing down its own resources.
      fileParallelism: false,
      hookTimeout: 120_000,
      teardownTimeout: 120_000,
      include: ['tests/integration/**/*.test.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**']
    }
  })
);
