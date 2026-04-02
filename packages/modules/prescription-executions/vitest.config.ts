import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**']
  },
  resolve: {
    alias: {
      '@cvg-his-v2/shared-contracts': resolve(__dirname, '../../shared/contracts/src/index.ts'),
      '@cvg-his-v2/shared-errors': resolve(__dirname, '../../shared/errors/src/index.ts'),
      '@cvg-his-v2/shared-types': resolve(__dirname, '../../shared/types/src/index.ts'),
      '@cvg-his-v2/shared-utils': resolve(__dirname, '../../shared/utils/src/index.ts'),
      '@cvg-his-v2/shared-validation': resolve(__dirname, '../../shared/validation/src/index.ts'),
      '@cvg-his-v2/shared-database': resolve(__dirname, '../../shared/database/src/index.ts')
    }
  }
});
