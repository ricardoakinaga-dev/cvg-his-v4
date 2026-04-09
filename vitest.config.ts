import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

const root = resolve(__dirname);

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@cvg-his-v2/module-access-control': resolve(
        root,
        'packages/modules/access-control/src/index.ts'
      ),
      '@cvg-his-v2/module-attachments': resolve(root, 'packages/modules/attachments/src/index.ts'),
      '@cvg-his-v2/module-audit': resolve(root, 'packages/modules/audit/src/index.ts'),
      '@cvg-his-v2/module-auth': resolve(root, 'packages/modules/auth/src/index.ts'),
      '@cvg-his-v2/module-billing': resolve(root, 'packages/modules/billing/src/index.ts'),
      '@cvg-his-v2/module-diagnostics': resolve(root, 'packages/modules/diagnostics/src/index.ts'),
      '@cvg-his-v2/module-discharges': resolve(root, 'packages/modules/discharges/src/index.ts'),
      '@cvg-his-v2/module-encounters': resolve(root, 'packages/modules/encounters/src/index.ts'),
      '@cvg-his-v2/module-inpatient': resolve(root, 'packages/modules/inpatient/src/index.ts'),
      '@cvg-his-v2/module-inventory': resolve(root, 'packages/modules/inventory/src/index.ts'),
      '@cvg-his-v2/module-medical-records': resolve(
        root,
        'packages/modules/medical-records/src/index.ts'
      ),
      '@cvg-his-v2/module-notifications': resolve(
        root,
        'packages/modules/notifications/src/index.ts'
      ),
      '@cvg-his-v2/module-owners': resolve(root, 'packages/modules/owners/src/index.ts'),
      '@cvg-his-v2/module-patients': resolve(root, 'packages/modules/patients/src/index.ts'),
      '@cvg-his-v2/module-prescription-executions': resolve(
        root,
        'packages/modules/prescription-executions/src/index.ts'
      ),
      '@cvg-his-v2/module-scheduling': resolve(root, 'packages/modules/scheduling/src/index.ts'),
      '@cvg-his-v2/module-staff': resolve(root, 'packages/modules/staff/src/index.ts'),
      '@cvg-his-v2/module-surgery': resolve(root, 'packages/modules/surgery/src/index.ts'),
      '@cvg-his-v2/module-triage': resolve(root, 'packages/modules/triage/src/index.ts'),
      '@cvg-his-v2/module-users': resolve(root, 'packages/modules/users/src/index.ts'),
      '@cvg-his-v2/module-webhooks': resolve(root, 'packages/modules/webhooks/src/index.ts'),
      '@cvg-his-v2/module-mfa': resolve(root, 'packages/modules/mfa/src/index.ts'),
      '@cvg-his-v2/module-lgpd': resolve(root, 'packages/modules/lgpd/src/index.ts'),
      '@cvg-his-v2/shared-auth-sdk': resolve(root, 'packages/shared/auth-sdk/src/index.ts'),
      '@cvg-his-v2/shared-config': resolve(root, 'packages/shared/config/src/index.ts'),
      '@cvg-his-v2/shared-contracts': resolve(root, 'packages/shared/contracts/src/index.ts'),
      '@cvg-his-v2/shared-database': resolve(root, 'packages/shared/database/src/index.ts'),
      '@cvg-his-v2/shared-errors': resolve(root, 'packages/shared/errors/src/index.ts'),
      '@cvg-his-v2/shared-logging': resolve(root, 'packages/shared/logging/src/index.ts'),
      '@cvg-his-v2/shared-rate-limiter': resolve(root, 'packages/shared/rate-limiter/src/index.ts'),
      '@cvg-his-v2/shared-types': resolve(root, 'packages/shared/types/src/index.ts'),
      '@cvg-his-v2/shared-utils': resolve(root, 'packages/shared/utils/src/index.ts'),
      '@cvg-his-v2/shared-validation': resolve(root, 'packages/shared/validation/src/index.ts'),
      '@cvg-his/db': resolve(root, 'packages/db/src/index.ts'),
      '@cvg-his/rbac': resolve(root, 'packages/rbac/src/index.ts'),
      '@cvg-his-v2/tenant-context': resolve(root, 'packages/tenant-context/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**',
      'tests/unit/auth/hardening.test.ts',
      'tests/unit/observability/metrics.test.ts'
    ],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globalSetup: ['tests/setup/global-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['apps/api/src/**/*.ts', 'packages/modules/**/*.ts', 'packages/shared/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/dist/**', '**/node_modules/**'],
      thresholds: {
        lines: 5,
        functions: 15,
        branches: 10,
        statements: 5
      },
      reportOnFailure: true
    }
  }
});
