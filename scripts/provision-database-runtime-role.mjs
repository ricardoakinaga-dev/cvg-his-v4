import { pathToFileURL } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

function requireUrl(environment, name) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL`);
  }
}

function normalizedPort(url) {
  return url.port || '5432';
}

function databaseName(url) {
  const name = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!name) {
    throw new Error('PostgreSQL URL must include a target database');
  }
  return name;
}

export function quotePostgresIdentifier(identifier) {
  if (typeof identifier !== 'string' || identifier.length === 0 || identifier.includes('\0')) {
    throw new Error('PostgreSQL identifier must be a non-empty string without null bytes');
  }
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function parseRuntimeRoleProvisioningConfig(environment) {
  const admin = requireUrl(environment, 'DATABASE_ADMIN_URL');
  const runtime = requireUrl(environment, 'DATABASE_URL');
  const adminRole = decodeURIComponent(admin.username);
  const runtimeRole = decodeURIComponent(runtime.username);
  const runtimePassword = decodeURIComponent(runtime.password);
  const adminDatabase = databaseName(admin);
  const runtimeDatabase = databaseName(runtime);

  if (!adminRole || !runtimeRole || !runtimePassword) {
    throw new Error('PostgreSQL admin/runtime URLs must include username and password');
  }
  if (adminRole === runtimeRole) {
    throw new Error('DATABASE_ADMIN_URL and DATABASE_URL must use different PostgreSQL roles');
  }
  if (admin.hostname !== runtime.hostname || normalizedPort(admin) !== normalizedPort(runtime)) {
    throw new Error('DATABASE_ADMIN_URL and DATABASE_URL must use the same PostgreSQL host and port');
  }
  if (adminDatabase !== runtimeDatabase) {
    throw new Error('DATABASE_ADMIN_URL and DATABASE_URL must use the same target database');
  }

  return Object.freeze({
    adminUrl: admin.toString(),
    runtimeUrl: runtime.toString(),
    runtimeRole,
    runtimePassword,
    databaseName: runtimeDatabase
  });
}

export async function inspectRuntimeRole(runtimeUrl, PoolImplementation = Pool) {
  const runtimePool = new PoolImplementation({ connectionString: runtimeUrl, max: 1 });
  try {
    const roleResult = await runtimePool.query(`
      SELECT
        current_user AS role_name,
        role.rolcanlogin,
        role.rolsuper,
        role.rolbypassrls,
        role.rolcreatedb,
        role.rolcreaterole,
        role.rolreplication,
        (
          SELECT COUNT(*)::int
          FROM pg_class tenant_table
          JOIN pg_namespace namespace ON namespace.oid = tenant_table.relnamespace
          JOIN information_schema.columns tenant_column
            ON tenant_column.table_schema = namespace.nspname
           AND tenant_column.table_name = tenant_table.relname
           AND tenant_column.column_name = 'account_id'
          WHERE namespace.nspname = 'public'
            AND tenant_table.relkind IN ('r', 'p')
            AND tenant_table.relowner = role.oid
        ) AS owned_tenant_tables,
        (
          SELECT COUNT(*)::int
          FROM pg_auth_members membership
          WHERE membership.member = role.oid
        ) AS role_memberships
      FROM pg_roles role
      WHERE role.rolname = current_user
    `);
    const row = roleResult.rows[0];
    if (!row) {
      throw new Error('Unable to inspect the active PostgreSQL runtime role');
    }

    const violations = [
      row.rolcanlogin ? null : 'LOGIN is disabled',
      row.rolsuper ? 'SUPERUSER' : null,
      row.rolbypassrls ? 'BYPASSRLS' : null,
      row.rolcreatedb ? 'CREATEDB' : null,
      row.rolcreaterole ? 'CREATEROLE' : null,
      row.rolreplication ? 'REPLICATION' : null,
      Number(row.owned_tenant_tables) > 0
        ? `owns ${Number(row.owned_tenant_tables)} tenant table(s)`
        : null,
      Number(row.role_memberships) > 0
        ? `inherits or can assume ${Number(row.role_memberships)} role(s)`
        : null
    ].filter(Boolean);

    if (violations.length > 0) {
      throw new Error(
        `PostgreSQL runtime role "${row.role_name}" violates least privilege: ${violations.join(', ')}`
      );
    }

    return Object.freeze({
      roleName: row.role_name,
      ownedTenantTables: Number(row.owned_tenant_tables),
      roleMemberships: Number(row.role_memberships)
    });
  } finally {
    await runtimePool.end();
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function validateRuntimeRoleWithRetry(runtimeUrl, options = {}) {
  const attempts = options.attempts ?? 1;
  const intervalMs = options.intervalMs ?? 1000;
  const inspect = options.inspect ?? inspectRuntimeRole;
  const waitForRetry = options.wait ?? wait;

  if (!Number.isInteger(attempts) || attempts <= 0) {
    throw new Error('Retry attempts must be a positive integer');
  }
  if (!Number.isInteger(intervalMs) || intervalMs < 0) {
    throw new Error('Retry interval must be a non-negative integer');
  }

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await inspect(runtimeUrl);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await waitForRetry(intervalMs);
      }
    }
  }

  throw lastError ?? new Error('PostgreSQL runtime role validation failed');
}

export async function provisionRuntimeRole(config, options = {}) {
  const PoolImplementation = options.PoolImplementation ?? Pool;
  const log = options.log ?? console.log;
  const adminPool = new PoolImplementation({ connectionString: config.adminUrl, max: 1 });
  const roleIdentifier = quotePostgresIdentifier(config.runtimeRole);
  const databaseIdentifier = quotePostgresIdentifier(config.databaseName);

  try {
    await adminPool.query('BEGIN');
    await adminPool.query(
      `SELECT
         set_config('cvg.provision_runtime_role', $1, true),
         set_config('cvg.provision_runtime_password', $2, true)`,
      [config.runtimeRole, config.runtimePassword]
    );
    await adminPool.query(`
      DO $provision$
      DECLARE
        requested_role text := current_setting('cvg.provision_runtime_role');
        requested_password text := current_setting('cvg.provision_runtime_password');
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = requested_role) THEN
          EXECUTE format(
            'ALTER ROLE %I WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',
            requested_role,
            requested_password
          );
        ELSE
          EXECUTE format(
            'CREATE ROLE %I WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L',
            requested_role,
            requested_password
          );
        END IF;
      END
      $provision$;
    `);
    await adminPool.query(`GRANT CONNECT ON DATABASE ${databaseIdentifier} TO ${roleIdentifier}`);
    await adminPool.query(`GRANT USAGE ON SCHEMA public, app TO ${roleIdentifier}`);
    await adminPool.query(`REVOKE CREATE ON SCHEMA public FROM ${roleIdentifier}`);
    await adminPool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roleIdentifier}`
    );
    await adminPool.query(
      `REVOKE ALL PRIVILEGES ON TABLE accounts, tenants, drizzle_migrations FROM ${roleIdentifier}`
    );
    await adminPool.query(
      `REVOKE INSERT, UPDATE, DELETE ON TABLE
         cfop_entries,
         cofins_tables,
         ibs_cbs_tables,
         icms_rules,
         icms_tables,
         ipi_tables,
         ncm_entries,
         nfse_layouts,
         permissions,
         pis_cofins_rules,
         pis_tables,
         role_permissions,
         roles
       FROM ${roleIdentifier}`
    );
    await adminPool.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${roleIdentifier}`
    );
    await adminPool.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO ${roleIdentifier}`);
    await adminPool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${roleIdentifier}`
    );
    await adminPool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${roleIdentifier}`
    );
    await adminPool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO ${roleIdentifier}`
    );
    await adminPool.query('COMMIT');
  } catch (error) {
    try {
      await adminPool.query('ROLLBACK');
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        'Runtime role provisioning failed and the admin transaction could not be rolled back'
      );
    }
    throw error;
  } finally {
    await adminPool.end();
  }

  const inspection = await inspectRuntimeRole(
    config.runtimeUrl,
    options.PoolImplementation ?? Pool
  );
  log(
    `PostgreSQL runtime role ${inspection.roleName} provisioned and validated for database ${config.databaseName}`
  );
  return inspection;
}

async function main() {
  if (process.argv.includes('--validate-only')) {
    const runtimeUrl = requireUrl(process.env, 'DATABASE_URL').toString();
    const attemptsIndex = process.argv.indexOf('--retry-attempts');
    const intervalIndex = process.argv.indexOf('--retry-interval-ms');
    const attempts = attemptsIndex >= 0 ? Number(process.argv[attemptsIndex + 1]) : 1;
    const intervalMs = intervalIndex >= 0 ? Number(process.argv[intervalIndex + 1]) : 1000;
    const inspection = await validateRuntimeRoleWithRetry(runtimeUrl, { attempts, intervalMs });
    console.log(
      `PostgreSQL runtime role ${inspection.roleName} passed least-privilege validation`
    );
    return;
  }

  const config = parseRuntimeRoleProvisioningConfig(process.env);
  await provisionRuntimeRole(config);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
