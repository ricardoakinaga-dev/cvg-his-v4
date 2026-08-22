import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

import { createWorkspaceAliases } from './vitest.alias.js';

const root = resolve(__dirname);

export default defineConfig({
  resolve: {
    alias: createWorkspaceAliases(root)
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
    testTimeout: 10_000
  }
});
