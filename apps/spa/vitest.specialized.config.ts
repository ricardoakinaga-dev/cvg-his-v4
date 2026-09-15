import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

import { createWorkspaceAliases } from '../../vitest.alias';

const root = resolve(__dirname, '../..');

/**
 * Isolated runner for the Vue evidence producer.
 *
 * The evidence setup is opt-in through CVG_VUE_SPECIALIZED_VITEST_OUTPUT. It
 * is kept out of the normal SPA test command so ordinary tests never emit or
 * consume certification artifacts.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    dedupe: ['vue', 'vue-router'],
    alias: {
      ...createWorkspaceAliases(root),
      '@cvg-his-v2/design-system/vue': resolve(
        root,
        'packages/design-system/src/vue'
      ),
      '@cvg-his-v2/design-system/src/vue': resolve(
        root,
        'packages/design-system/src/vue'
      )
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [
      resolve(__dirname, 'src/test/setup.ts'),
      resolve(__dirname, 'src/test-support/vue-specialized-vitest-setup.ts')
    ],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'threads',
    maxWorkers: 1
  }
});
