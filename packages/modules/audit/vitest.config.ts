import { defineConfig } from 'vitest/config';
import rootConfig from '../../../vitest.config.ts';

export default defineConfig({
  resolve: rootConfig.resolve,
  test: {
    globals: true,
    environment: 'node',
    include: ['src/audit.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    testTimeout: 30_000,
    hookTimeout: 60_000
  }
});
