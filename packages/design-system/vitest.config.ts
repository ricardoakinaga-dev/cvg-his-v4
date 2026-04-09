import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

const root = resolve(__dirname);

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@cvg-his-v2/shared-utils': resolve(root, 'packages/shared/utils/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'src/vue/__tests__/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    testTimeout: 30_000,
    hookTimeout: 60_000
  }
});
