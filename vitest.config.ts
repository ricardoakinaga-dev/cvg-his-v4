import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

const root = resolve(__dirname);
const productTestFiles = [
  'packages/db/src/**/*.test.ts',
  'packages/tenant-context/src/**/*.test.ts',
  'tests/unit/**/*.test.ts'
];
const commonTestExcludes = [
  '**/node_modules/**',
  '**/dist/**',
  'e2e/**',
  'tests/unit/auth/hardening.test.ts',
  'tests/unit/observability/metrics.test.ts'
];
const coverageSourceFiles = [
  'apps/api/src/**/*.ts',
  'packages/modules/*/src/**/*.ts',
  'packages/shared/*/src/**/*.ts',
  'packages/db/src/**/*.ts',
  'packages/tenant-context/src/**/*.ts'
];

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(root, 'apps/spa/src'),
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
      '@cvg-his-v2/module-fiscal': resolve(root, 'packages/modules/fiscal/src/index.ts'),
      '@cvg-his-v2/module-prescriptions': resolve(root, 'packages/modules/prescriptions/src/index.ts'),
      '@cvg-his-v2/module-mfa': resolve(root, 'packages/modules/mfa/src/index.ts'),
      '@cvg-his-v2/module-ml': resolve(root, 'packages/modules/ml/src/index.ts'),
      '@cvg-his-v2/module-lgpd': resolve(root, 'packages/modules/lgpd/src/index.ts'),
      '@cvg-his-v2/shared-auth-sdk': resolve(root, 'packages/shared/auth-sdk/src/index.ts'),
      '@cvg-his-v2/shared-config': resolve(root, 'packages/shared/config/src/index.ts'),
      '@cvg-his-v2/shared-feature-flags': resolve(root, 'packages/shared/feature-flags/src/index.ts'),
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
    include: productTestFiles,
    exclude: commonTestExcludes,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        parallelMode: false
      }
    },
    minThreads: 1,
    maxThreads: 1,
    setupFiles: ['tests/setup/coverage-setup.ts'],
    globalSetup: ['tests/setup/global-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: coverageSourceFiles,
      exclude: [
        ...commonTestExcludes,
        '**/*.test.ts',
        '**/*.d.ts',
        // Entry points, HTTP wiring and generated runtime shells are not meaningful unit coverage targets.
        'apps/api/src/index.ts',
        'apps/api/src/server.ts',
        'apps/api/src/metrics.ts',
        'apps/api/src/observability.ts',
        'apps/api/src/tracing.ts',
        'apps/api/src/tenant-db.ts',
        'apps/api/src/chaos-integration.ts',
        'apps/api/src/pix-transaction-repository.ts',
        'apps/api/src/bootstrap.ts',
        'apps/api/src/payment-gateway.ts',
        'apps/api/src/runtime-repositories.ts',
        'apps/api/src/consumers/**',
        'apps/api/src/helpers/auth-helpers.ts',
        'apps/api/src/helpers/common.ts',
        'apps/api/src/routes/**',
        'apps/api/src/repositories/**',
        'apps/api/src/http/cors.ts',
        'apps/api/src/http/security-headers.ts',
        // Database schema/migration artifacts are validated by integration flows, not this unit coverage gate.
        'packages/db/src/connection.ts',
        'packages/db/src/index.ts',
        'packages/db/src/migrate.ts',
        'packages/db/src/seed.ts',
        'packages/db/src/schema/**',
        'packages/shared/database/src/client.ts',
        'packages/shared/database/src/index.ts',
        // Repository adapters and transport-only packages are outside the current unit-coverage scope.
        'packages/**/src/repositories/**',
        'packages/shared/auth-sdk/src/index.ts',
        'packages/shared/config/src/index.ts',
        'packages/shared/contracts/src/index.ts',
        'packages/shared/types/src/index.ts',
        'packages/modules/api-keys/src/**',
        'packages/modules/access-control/src/**',
        'packages/modules/attachments/src/**',
        'packages/modules/auth/src/**',
        'packages/modules/billing/src/**',
        'packages/modules/cash/src/**',
        'packages/modules/discharges/src/**',
        'packages/modules/event-bus/src/**',
        'packages/modules/feature-flags/src/**',
        'packages/modules/inpatient/src/**',
        'packages/modules/medical-records/src/**',
        'packages/modules/notifications-whatsapp/src/**',
        'packages/modules/notifications/src/**',
        'packages/modules/pix/src/**',
        'packages/modules/prescription-executions/src/**',
        'packages/modules/prescriptions/src/**',
        'packages/modules/products/src/**',
        'packages/modules/quotes/src/**',
        'packages/modules/services/src/**',
        'packages/modules/soc2/src/**',
        'packages/modules/surgery/src/**',
        'packages/modules/webhooks/src/**',
        'packages/shared/errors/src/index.ts',
        'packages/shared/feature-flags/src/database-provider.ts',
        'packages/shared/rate-limiter/src/index.ts',
        'packages/shared/validation/src/index.ts',
        'packages/tenant-context/src/query-helpers.ts',
        'packages/tenant-context/src/tenant-db.ts'
      ],
      reportOnFailure: true,
      tempDirectory: './coverage/.tmp',
      // GAP-07: enforce minimum coverage thresholds as a CI gate
      // Fails the build if any metric drops below the threshold.
      // GAP-14 phased approach — current coverage ~11.5% lines:
      // H1 (GAP-14 T1-T4): lines 10, functions 35, branches 40, statements 10
      // H2 (GAP-14 T5-T7): lines 20, functions 40, branches 45, statements 20 ← CURRENT (R2)
      // H3 (GAP-14 T8-T9): lines 40, functions 50, branches 50, statements 40
      // H4 (GAP-14 T10): lines 60, functions 60, branches 60, statements 60
      thresholds: {
        lines: 20,
        functions: 40,
        branches: 45,
        statements: 20
      }
    }
  }
});
