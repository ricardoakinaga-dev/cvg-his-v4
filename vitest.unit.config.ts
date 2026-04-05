import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const root = resolve(__dirname);

export default defineConfig({
  resolve: {
    alias: {
      '@cvg-his-v2/tenant-context': resolve(root, 'packages/tenant-context/src/index.ts'),
      '@cvg-his-v2/module-mfa': resolve(root, 'packages/modules/mfa/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
    testTimeout: 10_000
  }
});
