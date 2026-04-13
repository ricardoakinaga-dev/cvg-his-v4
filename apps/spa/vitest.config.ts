import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@cvg-his-v2/design-system/vue': resolve(
        __dirname,
        '../../packages/design-system/src/vue'
      ),
      '@cvg-his-v2/design-system/src/vue': resolve(
        __dirname,
        '../../packages/design-system/src/vue'
      )
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [resolve(__dirname, 'src/test/setup.ts')],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    slowTestThreshold: 10_000
  }
});
