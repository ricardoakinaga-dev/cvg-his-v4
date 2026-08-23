import type { PoolClient } from 'pg';

import { closeDbConnection, pool } from './connection.js';
import {
  API_GLOBAL_TABLE_MUTATIONS,
  API_SENSITIVE_TABLE_PRIVILEGES,
  RUNTIME_SENSITIVE_TABLES,
  WORKER_USER_READ_COLUMNS
} from './runtime-role-policy.js';

export { API_GLOBAL_TABLE_MUTATIONS } from './runtime-role-policy.js';

const SHARED_READ_TABLES = [
  'accounts',
  'tenants',
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'cfop_entries',
  'cofins_tables',
  'ibs_cbs_tables',
  'icms_rules',
  'icms_tables',
  'ipi_tables',
  'ncm_entries',
  'nfse_layouts',
  'pis_cofins_rules',
  'pis_tables'
] as const;

function requireRoleName(value: string, field: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`${field} must be a valid PostgreSQL role name`);
  }
  if (value === 'cvg_installer') {
    throw new Error(`${field} cannot use the reserved cvg_installer role`);
  }
  return value;
}

async function executeGeneratedStatements(
  client: PoolClient,
  query: string,
  values: readonly unknown[] = []
): Promise<void> {
  const result = await client.query<{ statement: string }>(query, [...values]);
  for (const row of result.rows) {
    await client.query(row.statement);
  }
}

async function assertRuntimeRoleExists(client: PoolClient, roleName: string): Promise<void> {
  const result = await client.query<{ exists: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists',
    [roleName]
  );
  if (!result.rows[0]?.exists) {
    throw new Error(`Configured PostgreSQL runtime role does not exist: ${roleName}`);
  }
}

async function grantExistingTable(
  client: PoolClient,
  tableName: string,
  privileges: string,
  roleName: string
): Promise<void> {
  await executeGeneratedStatements(
    client,
    `SELECT format('GRANT %s ON TABLE public.%I TO %I', $2::text, $1::text, $3::text) AS statement
     WHERE to_regclass(format('public.%I', $1::text)) IS NOT NULL`,
    [tableName, privileges, roleName]
  );
}

async function revokeExistingTable(
  client: PoolClient,
  tableName: string,
  roleName: string
): Promise<void> {
  await executeGeneratedStatements(
    client,
    `SELECT format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', $1::text, $2::text) AS statement
     WHERE to_regclass(format('public.%I', $1::text)) IS NOT NULL`,
    [tableName, roleName]
  );
}

export async function reconcileRuntimeRoles(
  client: PoolClient,
  input: { readonly apiRole: string; readonly workerRole: string }
): Promise<void> {
  const apiRole = requireRoleName(input.apiRole, 'POSTGRES_API_USER');
  const workerRole = requireRoleName(input.workerRole, 'POSTGRES_WORKER_USER');
  if (apiRole === workerRole) {
    throw new Error('POSTGRES_API_USER and POSTGRES_WORKER_USER must be different');
  }

  await client.query('BEGIN');
  try {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('cvg-his-v2:runtime-role-reconcile'))"
    );
    await assertRuntimeRoleExists(client, apiRole);
    await assertRuntimeRoleExists(client, workerRole);
    await client.query(`
      DO $installer$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvg_installer') THEN
          CREATE ROLE cvg_installer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
        END IF;
      END
      $installer$;
      ALTER ROLE cvg_installer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    `);
    await client.query(`
      DO $api_key_auth_role$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvg_api_key_auth') THEN
          CREATE ROLE cvg_api_key_auth NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
        END IF;
      END
      $api_key_auth_role$;
      ALTER ROLE cvg_api_key_auth NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
      GRANT USAGE ON SCHEMA public TO cvg_api_key_auth;
      GRANT USAGE ON SCHEMA app TO cvg_api_key_auth;
    `);
    await client.query(`
      DO $pix_dlq_operator_role$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvg_pix_dlq_operator') THEN
          CREATE ROLE cvg_pix_dlq_operator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
        END IF;
      END
      $pix_dlq_operator_role$;
      ALTER ROLE cvg_pix_dlq_operator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
      GRANT USAGE ON SCHEMA public TO cvg_pix_dlq_operator;
      GRANT USAGE ON SCHEMA app TO cvg_pix_dlq_operator;
      GRANT EXECUTE ON FUNCTION app.current_account_id(), app.has_account_context()
        TO cvg_pix_dlq_operator;
    `);
    await executeGeneratedStatements(
      client,
      `SELECT format('REVOKE cvg_pix_dlq_operator FROM %I', member.rolname) AS statement
       FROM pg_auth_members membership
       JOIN pg_roles member ON member.oid = membership.member
       JOIN pg_roles capability ON capability.oid = membership.roleid
       WHERE capability.rolname = 'cvg_pix_dlq_operator'
       UNION ALL
       SELECT format('REVOKE %I FROM cvg_pix_dlq_operator', inherited.rolname) AS statement
       FROM pg_auth_members membership
       JOIN pg_roles member ON member.oid = membership.member
       JOIN pg_roles inherited ON inherited.oid = membership.roleid
       WHERE member.rolname = 'cvg_pix_dlq_operator'`
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('REVOKE cvg_api_key_auth FROM %I', role_name) AS statement
       FROM unnest($1::text[]) AS role_name`,
      [[apiRole, workerRole]]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('REVOKE cvg_api_key_auth FROM %I', member.rolname) AS statement
       FROM pg_auth_members membership
       JOIN pg_roles member ON member.oid = membership.member
       JOIN pg_roles capability ON capability.oid = membership.roleid
       WHERE capability.rolname = 'cvg_api_key_auth'
       UNION ALL
       SELECT format('REVOKE %I FROM cvg_api_key_auth', inherited.rolname) AS statement
       FROM pg_auth_members membership
       JOIN pg_roles member ON member.oid = membership.member
       JOIN pg_roles inherited ON inherited.oid = membership.roleid
       WHERE member.rolname = 'cvg_api_key_auth'`
    );

    await executeGeneratedStatements(
      client,
      `SELECT format(
         'ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
         role_name
       ) AS statement
       FROM unnest($1::text[]) AS role_name`,
      [[apiRole, workerRole]]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('REVOKE %I FROM %I', inherited.rolname, member.rolname) AS statement
       FROM pg_auth_members membership
       JOIN pg_roles member ON member.oid = membership.member
       JOIN pg_roles inherited ON inherited.oid = membership.roleid
       WHERE member.rolname = ANY($1::text[])`,
      [[apiRole, workerRole]]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('GRANT cvg_installer TO %I', $1::text) AS statement`,
      [apiRole]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), role_name) AS statement
       FROM unnest($1::text[]) AS role_name`,
      [[apiRole, workerRole]]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('GRANT USAGE ON SCHEMA public TO %I', role_name) AS statement
       FROM unnest($1::text[]) AS role_name
       UNION ALL
       SELECT format('GRANT USAGE ON SCHEMA app TO %I', role_name)
       FROM unnest($1::text[]) AS role_name
       WHERE EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'app')`,
      [[apiRole, workerRole]]
    );
    await client
      .query(
        "SELECT 'GRANT USAGE ON SCHEMA app TO cvg_installer' AS statement WHERE EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'app')"
      )
      .then(async (result: { rows: { statement: string }[] }) => {
        for (const row of result.rows) await client.query(row.statement);
      });

    await executeGeneratedStatements(
      client,
      `SELECT format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I', role_name) AS statement
       FROM unnest($1::text[]) AS role_name
       UNION ALL
       SELECT format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name)
       FROM unnest($1::text[]) AS role_name`,
      [[apiRole, workerRole]]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA app FROM %I', role_name) AS statement
       FROM unnest($1::text[]) AS role_name
       WHERE EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'app')
       UNION ALL
       SELECT 'REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC'
       WHERE EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'app')`,
      [[apiRole, workerRole]]
    );

    await executeGeneratedStatements(
      client,
      `SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO %I', class.relname, role_name) AS statement
       FROM pg_class class
       JOIN pg_namespace namespace ON namespace.oid = class.relnamespace
       CROSS JOIN unnest($1::text[]) AS role_name
       WHERE namespace.nspname = 'public'
         AND class.relkind IN ('r', 'p')
         AND class.relrowsecurity`,
      [[apiRole, workerRole]]
    );
    for (const tableName of SHARED_READ_TABLES) {
      await grantExistingTable(client, tableName, 'SELECT', apiRole);
      await grantExistingTable(client, tableName, 'SELECT', workerRole);
    }
    for (const mutation of API_GLOBAL_TABLE_MUTATIONS) {
      await grantExistingTable(client, mutation.tableName, mutation.privileges, apiRole);
    }

    // Broad tenant-table CRUD is needed by the general runtime, but auth and
    // service-principal tables have an explicit service ownership boundary.
    // Always close it after the broad grant so reconciliation remains idempotent.
    for (const tableName of RUNTIME_SENSITIVE_TABLES) {
      await revokeExistingTable(client, tableName, apiRole);
      await revokeExistingTable(client, tableName, workerRole);
    }
    for (const grant of API_SENSITIVE_TABLE_PRIVILEGES) {
      await grantExistingTable(client, grant.tableName, grant.privileges, apiRole);
    }
    await grantExistingTable(
      client,
      'api_keys',
      'SELECT (id, account_id, name, key_prefix, key_hash, permissions, rate_limit, rate_limit_window, expires_at, last_used_at, is_active, created_by, created_at, updated_at)',
      'cvg_api_key_auth'
    );
    await grantExistingTable(
      client,
      'pix_transactions',
      'SELECT (transaction_id, account_id)',
      'cvg_api_key_auth'
    );
    await grantExistingTable(client, 'account_service_principals', 'SELECT', workerRole);
    await grantExistingTable(
      client,
      'users',
      `SELECT (${WORKER_USER_READ_COLUMNS.join(', ')})`,
      workerRole
    );

    await executeGeneratedStatements(
      client,
      `SELECT format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO %I', class.relname, role_name) AS statement
       FROM pg_class class
       JOIN pg_namespace namespace ON namespace.oid = class.relnamespace
       CROSS JOIN unnest($1::text[]) AS role_name
       WHERE namespace.nspname = 'public' AND class.relkind = 'S'`,
      [[apiRole, workerRole]]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('GRANT EXECUTE ON FUNCTION %s TO %I', procedure.oid::regprocedure, role_name) AS statement
       FROM pg_proc procedure
       JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
       CROSS JOIN unnest($1::text[]) AS role_name
       WHERE namespace.nspname = 'app'
         AND procedure.proname IN ('current_account_id', 'has_account_context')`,
      [[apiRole, workerRole]]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('GRANT EXECUTE ON FUNCTION %s TO %I', procedure.oid::regprocedure, $1::text) AS statement
       FROM pg_proc procedure
       JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
       WHERE namespace.nspname = 'app'
         AND (
           (procedure.proname = 'resolve_active_api_key'
             AND pg_catalog.oidvectortypes(procedure.proargtypes) = 'text, text')
           OR (procedure.proname = 'is_pix_transaction_owned_by'
             AND pg_catalog.oidvectortypes(procedure.proargtypes) = 'text, uuid')
           OR (procedure.proname = 'redrive_pix_provider_event_delivery'
             AND pg_catalog.oidvectortypes(procedure.proargtypes) = 'uuid, uuid, uuid, text, text')
         )`,
      [apiRole]
    );
    await grantExistingTable(
      client,
      'pix_provider_event_deliveries',
      'SELECT, UPDATE',
      'cvg_pix_dlq_operator'
    );
    await grantExistingTable(
      client,
      'users',
      'SELECT (id, account_id, is_active)',
      'cvg_pix_dlq_operator'
    );
    await grantExistingTable(client, 'audit_events', 'INSERT', 'cvg_pix_dlq_operator');
    await executeGeneratedStatements(
      client,
      `SELECT format('REVOKE ALL ON FUNCTION %s FROM %I', procedure.oid::regprocedure, role_name) AS statement
       FROM pg_proc procedure
       JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
       CROSS JOIN unnest($1::text[]) AS role_name
       WHERE namespace.nspname = 'app'
         AND procedure.proname = 'redrive_pix_provider_event_delivery'
         AND pg_catalog.oidvectortypes(procedure.proargtypes) = 'uuid, uuid, uuid, text, text'`,
      [[apiRole, workerRole]]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('GRANT EXECUTE ON FUNCTION %s TO %I', procedure.oid::regprocedure, $1::text) AS statement
       FROM pg_proc procedure
       JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
       WHERE namespace.nspname = 'app'
         AND procedure.proname = 'redrive_pix_provider_event_delivery'
         AND pg_catalog.oidvectortypes(procedure.proargtypes) = 'uuid, uuid, uuid, text, text'`,
      [apiRole]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('GRANT EXECUTE ON FUNCTION %s TO cvg_installer', procedure.oid::regprocedure) AS statement
       FROM pg_proc procedure
       JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
       WHERE namespace.nspname = 'app'
         AND procedure.proname IN ('is_initial_setup_required', 'provision_initial_installation')`
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.audit_events FROM %I', role_name) AS statement
       FROM unnest($1::text[]) AS role_name
       WHERE to_regclass('public.audit_events') IS NOT NULL`,
      [[apiRole, workerRole]]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_events FROM %I', $1::text) AS statement
       WHERE to_regclass('public.pix_provider_events') IS NOT NULL
       UNION ALL
       SELECT format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_events FROM %I', $2::text)
       WHERE to_regclass('public.pix_provider_events') IS NOT NULL
       UNION ALL
       SELECT format('REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.pix_provider_event_deliveries FROM %I', $1::text)
       WHERE to_regclass('public.pix_provider_event_deliveries') IS NOT NULL
       UNION ALL
       SELECT format('REVOKE INSERT, DELETE, TRUNCATE ON TABLE public.pix_provider_event_deliveries FROM %I', $2::text)
       WHERE to_regclass('public.pix_provider_event_deliveries') IS NOT NULL
       UNION ALL
       SELECT format('GRANT SELECT, INSERT ON TABLE public.pix_provider_events TO %I', $1::text)
       WHERE to_regclass('public.pix_provider_events') IS NOT NULL
       UNION ALL
       SELECT format('GRANT SELECT ON TABLE public.pix_provider_events TO %I', $2::text)
       WHERE to_regclass('public.pix_provider_events') IS NOT NULL
       UNION ALL
       SELECT format('GRANT SELECT, INSERT ON TABLE public.pix_provider_event_deliveries TO %I', $1::text)
       WHERE to_regclass('public.pix_provider_event_deliveries') IS NOT NULL
       UNION ALL
       SELECT format('GRANT SELECT, UPDATE ON TABLE public.pix_provider_event_deliveries TO %I', $2::text)
       WHERE to_regclass('public.pix_provider_event_deliveries') IS NOT NULL`,
      [apiRole, workerRole]
    );
    await executeGeneratedStatements(
      client,
      `SELECT format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', role_name) AS statement
       FROM unnest($1::text[]) AS role_name
       UNION ALL
       SELECT format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', role_name)
       FROM unnest($1::text[]) AS role_name`,
      [[apiRole, workerRole]]
    );
    await client.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function runRuntimeRoleReconciliation(): Promise<void> {
  const client = await pool.connect();
  try {
    await reconcileRuntimeRoles(client, {
      apiRole: process.env.POSTGRES_API_USER ?? 'cvg_api',
      workerRole: process.env.POSTGRES_WORKER_USER ?? 'cvg_worker'
    });
    console.info('Runtime PostgreSQL roles reconciled successfully.');
  } finally {
    client.release();
    await closeDbConnection();
  }
}

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  void runRuntimeRoleReconciliation().catch((error) => {
    console.error('Failed to reconcile runtime PostgreSQL roles.', error);
    process.exitCode = 1;
  });
}
