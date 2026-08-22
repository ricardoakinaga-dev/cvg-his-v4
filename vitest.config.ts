import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

import { createWorkspaceAliases } from './vitest.alias.js';

const root = resolve(__dirname);
const productTestFiles = [
  'packages/db/src/**/*.test.ts',
  'packages/modules/*/src/**/*.test.ts',
  'packages/tenant-context/src/**/*.test.ts',
  'tests/unit/**/*.test.ts'
];
const commonTestExcludes = ['**/node_modules/**', '**/dist/**', 'e2e/**'];
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
    alias: createWorkspaceAliases(root)
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: productTestFiles,
    exclude: commonTestExcludes,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
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
        'apps/api/src/bootstrap.ts',
        'apps/api/src/payment-gateway.ts',
        'apps/api/src/runtime-repositories.ts',
        'apps/api/src/pix-transaction-repository.ts',
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
        'packages/modules/fiscal/src/database-fiscal.repository.ts',
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
      // Enterprise coverage gate: business modules and shared runtime code must stay
      // above the 80% global target for statements, lines and functions.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
