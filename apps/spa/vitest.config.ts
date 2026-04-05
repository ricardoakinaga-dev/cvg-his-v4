import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

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
    setupFiles: ['./src/test/setup.ts']
  }
});
