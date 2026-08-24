import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  API_GLOBAL_TABLE_MUTATIONS,
  API_SENSITIVE_TABLE_PRIVILEGES,
  RUNTIME_INSTALLER_MUTATIONS,
  RUNTIME_SENSITIVE_TABLES,
  RUNTIME_SETTLEMENT_FUNCTIONS,
  WORKER_USER_READ_COLUMNS
} from '../../../packages/db/src/runtime-role-policy';

const root = resolve(import.meta.dirname, '../../..');
const roleScripts = [
  'infra/postgres/init-runtime-role.sh',
  'infra/helm/cvg-his-v2/templates/postgres-runtime-role-configmap.yaml'
].map((path) => ({ path, content: readFileSync(resolve(root, path), 'utf8') }));
const runtimeReconciler = readFileSync(
  resolve(root, 'packages/db/src/reconcile-runtime-roles.ts'),
  'utf8'
);
const cutoverScript = readFileSync(resolve(root, 'infra/scripts/cutover-v2.sh'), 'utf8');
const composeStack = readFileSync(resolve(root, 'docker-compose.v2.yml'), 'utf8');
const ingressMigration = readFileSync(
  resolve(root, 'packages/db/migrations/0111_pix_provider_event_ingress.sql'),
  'utf8'
);
const settlementDlqMigration = readFileSync(
  resolve(root, 'packages/db/migrations/0114_pix_settlement_dlq_operator.sql'),
  'utf8'
);
const settlementSearchPathMigration = readFileSync(
  resolve(root, 'packages/db/migrations/0120_cash_receipt_consistency_search_path.sql'),
  'utf8'
);
const pixSettlementSearchPathMigration = readFileSync(
  resolve(root, 'packages/db/migrations/0124_pix_non_cash_receipt_consistency_search_path.sql'),
  'utf8'
);

describe('runtime PostgreSQL role grants', () => {
  it('preserves the exact API mutations used by global repositories', () => {
    const requiredGrants = [
      "('roles', 'INSERT')",
      "('permissions', 'INSERT')",
      "('role_permissions', 'INSERT, DELETE')",
      "('user_roles', 'INSERT, DELETE')",
      "('cfop_entries', 'INSERT, UPDATE')",
      "('icms_tables', 'INSERT, UPDATE')",
      "('ipi_tables', 'INSERT, UPDATE')",
      "('pis_tables', 'INSERT, UPDATE')",
      "('cofins_tables', 'INSERT, UPDATE')",
      "('ibs_cbs_tables', 'INSERT, UPDATE')",
      "('icms_rules', 'INSERT')",
      "('nfse_layouts', 'INSERT, UPDATE')"
    ];

    expect(
      API_GLOBAL_TABLE_MUTATIONS.map((grant) => `('${grant.tableName}', '${grant.privileges}')`)
    ).toEqual(requiredGrants);

    for (const script of roleScripts) {
      for (const grant of requiredGrants) {
        expect(script.content, `${script.path} must include ${grant}`).toContain(grant);
      }
    }
  });

  it('does not grant global mutation privileges to the worker role', () => {
    for (const script of roleScripts) {
      expect(script.content).not.toMatch(/GRANT (?:INSERT|UPDATE|DELETE)[^\n]*worker_user/i);
    }
  });

  it('revokes installer/governance mutations from the worker after broad RLS grants', () => {
    expect(RUNTIME_INSTALLER_MUTATIONS).toEqual(API_GLOBAL_TABLE_MUTATIONS);
    for (const script of roleScripts) {
      const broadGrant = script.content.indexOf(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I'
      );
      expect(broadGrant, `${script.path} must retain the broad RLS grant`).toBeGreaterThan(-1);
      const workerRevoke = script.content.indexOf(
        'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.%I FROM %I',
        broadGrant
      );
      expect(
        workerRevoke,
        `${script.path} must revoke installer mutations after broad grant`
      ).toBeGreaterThan(broadGrant);
      for (const mutation of RUNTIME_INSTALLER_MUTATIONS) {
        expect(
          script.content.slice(workerRevoke),
          `${script.path} must protect ${mutation.tableName}`
        ).toContain(`('${mutation.tableName}', '${mutation.privileges}')`);
      }
    }

    const reconcilerBroadGrant = runtimeReconciler.indexOf(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I'
    );
    const reconcilerWorkerRevoke = runtimeReconciler.indexOf(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.%I FROM %I',
      reconcilerBroadGrant
    );
    expect(reconcilerWorkerRevoke).toBeGreaterThan(reconcilerBroadGrant);
    expect(runtimeReconciler).toContain('RUNTIME_INSTALLER_MUTATIONS');
  });

  it('preserves the least-privilege PIX receipt/delivery matrix after broad RLS grants', () => {
    const requiredFragments = [
      'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_events',
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_events',
      'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_event_deliveries',
      'REVOKE INSERT, DELETE, TRUNCATE ON TABLE public.pix_provider_event_deliveries',
      'GRANT SELECT, INSERT ON TABLE public.pix_provider_events',
      'GRANT SELECT ON TABLE public.pix_provider_events',
      'GRANT SELECT, INSERT ON TABLE public.pix_provider_event_deliveries',
      'GRANT SELECT, UPDATE ON TABLE public.pix_provider_event_deliveries'
    ];

    for (const script of roleScripts) {
      for (const fragment of requiredFragments) {
        expect(script.content, `${script.path} must include ${fragment}`).toContain(fragment);
      }
      const broadGrant = script.content.indexOf(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I'
      );
      const receiptRevoke = script.content.indexOf(
        'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_events'
      );
      expect(receiptRevoke, `${script.path} must revoke after broad RLS grants`).toBeGreaterThan(
        broadGrant
      );
    }

    expect(runtimeReconciler).toContain(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_events'
    );
    expect(runtimeReconciler).toContain('GRANT SELECT, INSERT ON TABLE public.pix_provider_events');
    expect(runtimeReconciler).toContain(
      'GRANT SELECT, UPDATE ON TABLE public.pix_provider_event_deliveries'
    );
    expect(ingressMigration).toContain("current_setting('app.runtime_api_role', true)");
    expect(ingressMigration).toContain("current_setting('app.runtime_worker_role', true)");
    for (const fragment of requiredFragments) {
      expect(ingressMigration, `0111 must include ${fragment}`).toContain(fragment);
    }
  });

  it('defines the API auth/user contract without allowing service-principal mapping mutation', () => {
    expect(API_SENSITIVE_TABLE_PRIVILEGES).toEqual([
      { tableName: 'users', privileges: 'SELECT, INSERT, UPDATE' },
      { tableName: 'sessions', privileges: 'SELECT, INSERT, UPDATE, DELETE' },
      { tableName: 'mfa_credentials', privileges: 'SELECT, INSERT, UPDATE, DELETE' },
      { tableName: 'auth_mfa_login_challenges', privileges: 'SELECT, INSERT, UPDATE' },
      { tableName: 'api_keys', privileges: 'SELECT, INSERT, UPDATE, DELETE' },
      { tableName: 'api_key_usage', privileges: 'SELECT, INSERT' },
      { tableName: 'api_key_rate_limits', privileges: 'SELECT, INSERT, UPDATE' }
    ]);
    expect(API_SENSITIVE_TABLE_PRIVILEGES).not.toContainEqual(
      expect.objectContaining({ tableName: 'account_service_principals' })
    );
  });

  it('reapplies sensitive-table least privilege after every broad RLS grant', () => {
    const protectedTables = [
      'users',
      'account_service_principals',
      'sessions',
      'mfa_credentials',
      'auth_mfa_login_challenges',
      'api_keys',
      'api_key_usage',
      'api_key_rate_limits'
    ];
    expect(RUNTIME_SENSITIVE_TABLES).toEqual(protectedTables);

    for (const script of roleScripts) {
      const broadGrant = script.content.indexOf(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I'
      );
      expect(broadGrant, `${script.path} must retain the broad tenant-table grant`).toBeGreaterThan(
        -1
      );
      for (const tableName of protectedTables) {
        expect(
          script.content.slice(broadGrant),
          `${script.path} must protect ${tableName}`
        ).toContain(`('${tableName}')`);
      }
      expect(
        script.content.indexOf('REVOKE ALL PRIVILEGES ON TABLE public.%I', broadGrant)
      ).toBeGreaterThan(broadGrant);
      expect(script.content).toContain(
        'GRANT SELECT (id, account_id, is_active, principal_kind, interactive_login_enabled) ON TABLE public.users'
      );
      expect(script.content).toContain('GRANT SELECT ON TABLE public.account_service_principals');
    }

    const reconcilerBroadGrant = runtimeReconciler.indexOf(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I'
    );
    expect(
      runtimeReconciler.indexOf(
        'for (const tableName of RUNTIME_SENSITIVE_TABLES)',
        reconcilerBroadGrant
      )
    ).toBeGreaterThan(reconcilerBroadGrant);
    expect(runtimeReconciler).toContain(
      "await grantExistingTable(client, 'account_service_principals', 'SELECT', workerRole)"
    );
  });

  it('limits the worker to mapping reads and non-secret user identity columns', () => {
    expect(WORKER_USER_READ_COLUMNS).toEqual([
      'id',
      'account_id',
      'is_active',
      'principal_kind',
      'interactive_login_enabled'
    ]);

    const forbiddenWorkerDml = [
      'users',
      'account_service_principals',
      'sessions',
      'mfa_credentials',
      'auth_mfa_login_challenges'
    ];
    for (const script of roleScripts) {
      for (const tableName of forbiddenWorkerDml) {
        expect(script.content).not.toMatch(
          new RegExp(
            `GRANT (?:[^\\n]*(?:INSERT|UPDATE|DELETE)[^\\n]*) ON TABLE public\\.${tableName} TO [^\\n]*worker_user`,
            'i'
          )
        );
      }
    }
  });

  it('prevents inherited roles from bypassing the reconciled ACL', () => {
    for (const script of [
      ...roleScripts,
      { path: 'runtime reconciler', content: runtimeReconciler }
    ]) {
      expect(script.content, `${script.path} must enforce NOINHERIT`).toContain('NOINHERIT');
      expect(script.content, `${script.path} must remove role memberships`).toContain(
        'FROM pg_auth_members'
      );
    }
  });

  it('reconciles API function grants after migration in cutover and Compose', () => {
    expect(cutoverScript).toContain('npx tsx packages/db/src/migrate.ts');
    expect(cutoverScript).toContain('npx tsx packages/db/src/reconcile-runtime-roles.ts');
    expect(cutoverScript.indexOf('reconcile-runtime-roles.ts')).toBeGreaterThan(
      cutoverScript.indexOf('migrate.ts')
    );
    expect(composeStack).toContain('database-migrate:');
    expect(composeStack).toContain(
      'node packages/db/dist/migrate.js && node packages/db/dist/reconcile-runtime-roles.js'
    );
    expect(composeStack).toContain('condition: service_completed_successfully');
  });

  it('keeps the cash-settlement trigger helper in the runtime function allowlist', () => {
    expect(RUNTIME_SETTLEMENT_FUNCTIONS).toEqual([
      {
        functionName: 'assert_encounter_cash_receipt_consistent',
        argumentTypes: 'uuid, boolean'
      },
      {
        functionName: 'assert_encounter_non_cash_receipt_consistent',
        argumentTypes: 'uuid'
      }
    ]);
    expect(runtimeReconciler).toContain('RUNTIME_SETTLEMENT_FUNCTIONS');

    for (const script of roleScripts) {
      expect(script.content, `${script.path} must grant the cash consistency helper`).toContain(
        'assert_encounter_cash_receipt_consistent'
      );
      expect(script.content).toMatch(
        /pg_catalog\.oidvectortypes\((?:p|procedure)\.proargtypes\) = 'uuid, boolean'/
      );
    }
    expect(settlementSearchPathMigration).toContain(
      'ALTER FUNCTION app.assert_encounter_cash_receipt_consistent(uuid, boolean)'
    );
    expect(settlementSearchPathMigration).toContain(
      'SET search_path = pg_catalog, public, app, pg_temp'
    );
    expect(pixSettlementSearchPathMigration).toContain(
      'ALTER FUNCTION app.assert_encounter_non_cash_receipt_consistent(uuid)'
    );
    expect(pixSettlementSearchPathMigration).toContain(
      'SET search_path = pg_catalog, public, app, pg_temp'
    );
  });

  it('keeps PIX settlement redrive behind a non-login capability function', () => {
    expect(settlementDlqMigration).toContain('CREATE ROLE cvg_pix_dlq_operator');
    expect(settlementDlqMigration).toContain('SECURITY DEFINER');
    expect(settlementDlqMigration).toContain('SET search_path = pg_catalog, public, app');
    expect(settlementDlqMigration).toContain("state = 'reconciliation_required'");
    expect(settlementDlqMigration).toContain("'pix_settlement_redrive'");
    expect(settlementDlqMigration).toContain(
      'GRANT SELECT ON TABLE public.pix_provider_event_deliveries TO cvg_pix_dlq_operator'
    );
    expect(settlementDlqMigration).toContain(
      'GRANT UPDATE ON TABLE public.pix_provider_event_deliveries TO cvg_pix_dlq_operator'
    );
    expect(settlementDlqMigration).toContain(
      'REVOKE ALL ON FUNCTION app.redrive_pix_provider_event_delivery'
    );
    expect(runtimeReconciler).toContain('redrive_pix_provider_event_delivery');
    expect(runtimeReconciler).toContain("'SELECT, UPDATE'");
    for (const script of roleScripts) {
      expect(script.content).toContain('cvg_pix_dlq_operator');
      expect(script.content).toContain('redrive_pix_provider_event_delivery');
      expect(script.content).toContain(
        'GRANT SELECT, UPDATE ON TABLE public.pix_provider_event_deliveries TO cvg_pix_dlq_operator'
      );
    }
  });
});
