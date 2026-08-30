import { resolve } from 'node:path';

/**
 * Single source of truth for workspace package aliases used by every Vitest
 * config in this repo.
 *
 * Keeping this in one place prevents configs from drifting apart — a partial
 * alias map makes test files fail to resolve their imports and silently stop
 * exercising the code they are meant to cover.
 */
export function createWorkspaceAliases(root: string): Record<string, string> {
  const from = (relativePath: string): string => resolve(root, relativePath);

  return {
    '@': from('apps/spa/src'),
    '@cvg-his-v2/module-access-control': from('packages/modules/access-control/src/index.ts'),
    '@cvg-his-v2/module-attachments': from('packages/modules/attachments/src/index.ts'),
    '@cvg-his-v2/module-audit': from('packages/modules/audit/src/index.ts'),
    '@cvg-his-v2/module-auth': from('packages/modules/auth/src/index.ts'),
    '@cvg-his-v2/module-billing': from('packages/modules/billing/src/index.ts'),
    '@cvg-his-v2/module-diagnostics': from('packages/modules/diagnostics/src/index.ts'),
    '@cvg-his-v2/module-discharges': from('packages/modules/discharges/src/index.ts'),
    '@cvg-his-v2/module-encounters': from('packages/modules/encounters/src/index.ts'),
    '@cvg-his-v2/module-event-bus': from('packages/modules/event-bus/src/index.ts'),
    '@cvg-his-v2/module-event-consumers': from('packages/modules/event-consumers/src/index.ts'),
    '@cvg-his-v2/module-feature-flags': from('packages/modules/feature-flags/src/index.ts'),
    '@cvg-his-v2/module-financial': from('packages/modules/financial/src/index.ts'),
    '@cvg-his-v2/module-inpatient': from('packages/modules/inpatient/src/index.ts'),
    '@cvg-his-v2/module-inventory': from('packages/modules/inventory/src/index.ts'),
    '@cvg-his-v2/module-medical-records': from('packages/modules/medical-records/src/index.ts'),
    '@cvg-his-v2/module-notifications': from('packages/modules/notifications/src/index.ts'),
    '@cvg-his-v2/module-owners': from('packages/modules/owners/src/index.ts'),
    '@cvg-his-v2/module-patients': from('packages/modules/patients/src/index.ts'),
    '@cvg-his-v2/module-payments': from('packages/modules/payments/src/index.ts'),
    '@cvg-his-v2/module-prescription-executions': from(
      'packages/modules/prescription-executions/src/index.ts'
    ),
    '@cvg-his-v2/module-scheduling': from('packages/modules/scheduling/src/index.ts'),
    '@cvg-his-v2/module-staff': from('packages/modules/staff/src/index.ts'),
    '@cvg-his-v2/module-surgery': from('packages/modules/surgery/src/index.ts'),
    '@cvg-his-v2/module-triage': from('packages/modules/triage/src/index.ts'),
    '@cvg-his-v2/module-users': from('packages/modules/users/src/index.ts'),
    '@cvg-his-v2/module-webhooks': from('packages/modules/webhooks/src/index.ts'),
    '@cvg-his-v2/module-fiscal': from('packages/modules/fiscal/src/index.ts'),
    '@cvg-his-v2/module-prescriptions': from('packages/modules/prescriptions/src/index.ts'),
    '@cvg-his-v2/module-mfa': from('packages/modules/mfa/src/index.ts'),
    '@cvg-his-v2/module-ml': from('packages/modules/ml/src/index.ts'),
    '@cvg-his-v2/module-pix': from('packages/modules/pix/src/index.ts'),
    '@cvg-his-v2/module-lgpd': from('packages/modules/lgpd/src/index.ts'),
    '@cvg-his-v2/module-counter-sales': from('packages/modules/counter-sales/src/index.ts'),
    '@cvg-his-v2/shared-auth-sdk': from('packages/shared/auth-sdk/src/index.ts'),
    '@cvg-his-v2/shared-config': from('packages/shared/config/src/index.ts'),
    '@cvg-his-v2/shared-feature-flags': from('packages/shared/feature-flags/src/index.ts'),
    '@cvg-his-v2/shared-contracts': from('packages/shared/contracts/src/index.ts'),
    '@cvg-his-v2/shared-database': from('packages/shared/database/src/index.ts'),
    '@cvg-his-v2/shared-errors': from('packages/shared/errors/src/index.ts'),
    '@cvg-his-v2/shared-logging': from('packages/shared/logging/src/index.ts'),
    '@cvg-his-v2/shared-rate-limiter': from('packages/shared/rate-limiter/src/index.ts'),
    '@cvg-his-v2/shared-types': from('packages/shared/types/src/index.ts'),
    '@cvg-his-v2/shared-utils': from('packages/shared/utils/src/index.ts'),
    '@cvg-his-v2/shared-validation': from('packages/shared/validation/src/index.ts'),
    '@cvg-his/db': from('packages/db/src/index.ts'),
    '@cvg-his/rbac': from('packages/rbac/src/index.ts'),
    '@cvg-his/rbac/access-control-catalog': from(
      'packages/rbac/src/access-control-catalog.ts'
    ),
    '@cvg-his-v2/tenant-context': from('packages/tenant-context/src/index.ts'),
    '@cvg-his-v2/chaos': from('packages/chaos/src/index.ts'),
    '@cvg-his-v2/secrets': from('packages/secrets/src/index.ts')
  };
}
