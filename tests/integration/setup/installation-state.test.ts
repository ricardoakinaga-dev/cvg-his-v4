import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { TEST_DB_URL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const MIGRATION_PATH = resolve(ROOT, 'packages/db/migrations/0103_installation_state.sql');
const INSTALLER_ROLE = 'cvg_installer';
const scratchDatabase = `cvg_setup_${process.pid}_${Date.now()}`;
const runtimeRole = `cvg_setup_runtime_${process.pid}`;

const roleCatalog = [
  { name: 'admin', description: 'Full administrative access.' },
  { name: 'veterinarian', description: 'Veterinary care.' },
  { name: 'nurse', description: 'Nursing care.' },
  { name: 'reception', description: 'Reception workflows.' },
  { name: 'finance', description: 'Financial workflows.' },
  { name: 'inventory', description: 'Inventory workflows.' },
  { name: 'auditor', description: 'Read-only audit workflows.' }
] as const;

const permissionCatalog = [
  { key: 'auth.session.read', description: 'Read own session.' },
  { key: 'audit.read', description: 'Read audit events.' },
  { key: 'audit.write', description: 'Write audit events.' }
] as const;

const rolePermissionMap = {
  admin: permissionCatalog.map((permission) => permission.key),
  veterinarian: ['auth.session.read', 'audit.read', 'audit.write'],
  nurse: ['auth.session.read', 'audit.read'],
  reception: ['auth.session.read'],
  finance: ['auth.session.read', 'audit.read'],
  inventory: ['auth.session.read'],
  auditor: ['auth.session.read', 'audit.read']
} as const;

interface ProvisionedInstallation {
  readonly account_id: string;
  readonly user_id: string;
  readonly clinic_slug: string;
}

function databaseUrl(databaseName: string): string {
  const url = new URL(TEST_DB_URL);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function ensureClusterRoles(admin: Pool): Promise<void> {
  await admin.query(`
    DO $roles$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${INSTALLER_ROLE}') THEN
        CREATE ROLE ${INSTALLER_ROLE} NOLOGIN
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${runtimeRole}') THEN
        CREATE ROLE ${runtimeRole} NOLOGIN
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
      END IF;
    END
    $roles$;
    GRANT ${INSTALLER_ROLE} TO ${runtimeRole};
  `);
}

async function resetFreshInstallation(pool: Pool): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE audit_events, user_roles, role_permissions, users, units,
      accounts, roles, permissions RESTART IDENTITY CASCADE;
    DELETE FROM tenants
    WHERE id <> '00000000-0000-0000-0000-000000000001'::uuid;
    UPDATE tenants
    SET slug = 'default', name = 'Default Tenant', updated_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
    INSERT INTO installation_state (
      singleton_id, status, account_id, admin_user_id, provisioned_at
    )
    VALUES (1, 'ready', NULL, NULL, NULL)
    ON CONFLICT (singleton_id) DO UPDATE
    SET status = 'ready', account_id = NULL, admin_user_id = NULL,
        provisioned_at = NULL, updated_at = now();
  `);
}

async function setRuntimeRole(client: PoolClient): Promise<void> {
  await client.query(`SET LOCAL ROLE ${runtimeRole}`);
}

async function callProvision(
  client: PoolClient,
  overrides: {
    readonly roleCatalog?: unknown;
    readonly permissionCatalog?: unknown;
    readonly rolePermissionMap?: unknown;
    readonly correlationId?: string;
  } = {}
): Promise<ProvisionedInstallation> {
  const result = await client.query<ProvisionedInstallation>(
    `SELECT * FROM app.provision_initial_installation(
       $1::text, $2::text, $3::text, $4::text, $5::text,
       $6::text, $7::text, $8::text, $9::text,
       $10::jsonb, $11::jsonb, $12::jsonb, $13::text
     )`,
    [
      'Clinica Teste',
      'clinica-teste',
      'Clinica Teste',
      'hq',
      'Unidade Central',
      'root.admin',
      'root@example.test',
      `${'a'.repeat(32)}:${'b'.repeat(128)}`,
      'Administrador Inicial',
      JSON.stringify(overrides.roleCatalog ?? roleCatalog),
      JSON.stringify(overrides.permissionCatalog ?? permissionCatalog),
      JSON.stringify(overrides.rolePermissionMap ?? rolePermissionMap),
      overrides.correlationId ?? randomUUID()
    ]
  );

  const provisioned = result.rows[0];
  if (!provisioned) throw new Error('Provisioning returned no row');
  return provisioned;
}

describe('durable one-time installation state', () => {
  const adminUrl = databaseUrl('postgres');
  const scratchUrl = databaseUrl(scratchDatabase);
  const clusterAdmin = new Pool({ connectionString: adminUrl, max: 1 });
  let pool: Pool;

  beforeAll(async () => {
    await ensureClusterRoles(clusterAdmin);
    await clusterAdmin.query(`CREATE DATABASE ${quoteIdentifier(scratchDatabase)}`);

    execFileSync('pnpm', ['exec', 'tsx', 'packages/db/src/migrate.ts'], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: scratchUrl },
      stdio: 'pipe'
    });

    pool = new Pool({ connectionString: scratchUrl, max: 6 });
    await pool.query(
      `GRANT CONNECT ON DATABASE ${quoteIdentifier(scratchDatabase)} TO ${runtimeRole}`
    );
    await pool.query(`GRANT USAGE ON SCHEMA app TO ${runtimeRole}`);
  }, 120_000);

  beforeEach(async () => {
    await resetFreshInstallation(pool);
  });

  afterAll(async () => {
    await pool?.end();
    await clusterAdmin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
      [scratchDatabase]
    );
    await clusterAdmin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(scratchDatabase)}`);
    await clusterAdmin.query(`REVOKE ${INSTALLER_ROLE} FROM ${runtimeRole}`);
    await clusterAdmin.query(`DROP ROLE IF EXISTS ${runtimeRole}`);
    await clusterAdmin.end();
  }, 120_000);

  it('allows a NOBYPASSRLS API capability to read status without exposing the sentinel table', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setRuntimeRole(client);

      const identity = await client.query<{ current_user: string; bypassrls: boolean }>(
        `SELECT current_user, rolbypassrls AS bypassrls
         FROM pg_roles WHERE rolname = current_user`
      );
      const required = await client.query<{ required: boolean }>(
        'SELECT app.is_initial_setup_required() AS required'
      );

      expect(identity.rows).toEqual([{ current_user: runtimeRole, bypassrls: false }]);
      expect(required.rows).toEqual([{ required: true }]);

      await client.query('SAVEPOINT hidden_state');
      await expect(client.query('SELECT * FROM installation_state')).rejects.toMatchObject({
        code: '42501'
      });
      await client.query('ROLLBACK TO SAVEPOINT hidden_state');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('atomically persists the canonical graph, singleton and exactly one high-risk audit event', async () => {
    const correlationId = randomUUID();
    const client = await pool.connect();
    let provisioned: ProvisionedInstallation;
    try {
      await client.query('BEGIN');
      await setRuntimeRole(client);
      provisioned = await callProvision(client, { correlationId });
      await client.query('COMMIT');
    } finally {
      client.release();
    }

    const persisted = await pool.query<{
      status: string;
      account_id: string;
      admin_user_id: string;
    }>('SELECT status, account_id, admin_user_id FROM installation_state WHERE singleton_id = 1');
    expect(persisted.rows).toEqual([
      {
        status: 'provisioned',
        account_id: provisioned!.account_id,
        admin_user_id: provisioned!.user_id
      }
    ]);

    const graph = await pool.query<{
      roles: string;
      permissions: string;
      admin_permissions: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM roles) AS roles,
         (SELECT count(*)::text FROM permissions) AS permissions,
         (SELECT count(*)::text
          FROM role_permissions rp
          JOIN roles r ON r.id = rp.role_id
          WHERE r.name = 'admin') AS admin_permissions`
    );
    expect(graph.rows).toEqual([
      {
        roles: String(roleCatalog.length),
        permissions: String(permissionCatalog.length),
        admin_permissions: String(permissionCatalog.length)
      }
    ]);

    const audit = await pool.query<{
      account_id: string;
      actor_user_id: string;
      correlation_id: string;
      risk_level: string;
    }>(
      `SELECT account_id, actor_user_id, correlation_id,
              metadata ->> 'riskLevel' AS risk_level
       FROM audit_events
       WHERE action = 'installation_provisioned'`
    );
    expect(audit.rows).toEqual([
      {
        account_id: provisioned!.account_id,
        actor_user_id: provisioned!.user_id,
        correlation_id: correlationId,
        risk_level: 'high'
      }
    ]);

    await pool.query('DELETE FROM users WHERE id = $1', [provisioned!.user_id]);
    const afterUserDeletion = await pool.query<{ required: boolean }>(
      'SELECT app.is_initial_setup_required() AS required'
    );
    expect(afterUserDeletion.rows).toEqual([{ required: false }]);
  });

  it('rejects a second attempt with a stable SQLSTATE after serializing on the advisory lock', async () => {
    const firstClient = await pool.connect();
    const secondClient = await pool.connect();
    try {
      await firstClient.query('BEGIN');
      await setRuntimeRole(firstClient);
      await callProvision(firstClient);

      await secondClient.query('BEGIN');
      await setRuntimeRole(secondClient);
      const secondAttempt = callProvision(secondClient);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await firstClient.query('COMMIT');

      await expect(secondAttempt).rejects.toMatchObject({
        code: 'CVG01',
        message: 'installation already provisioned'
      });
      await secondClient.query('ROLLBACK');
    } finally {
      firstClient.release();
      secondClient.release();
    }
  });

  it('rolls back every installation write when the same-transaction audit cannot persist', async () => {
    await pool.query(`
      ALTER TABLE audit_events
      ADD CONSTRAINT setup_audit_failure_injection
      CHECK (action <> 'installation_provisioned')
    `);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setRuntimeRole(client);
      await expect(callProvision(client)).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK');
    } finally {
      client.release();
      await pool.query('ALTER TABLE audit_events DROP CONSTRAINT setup_audit_failure_injection');
    }

    const state = await pool.query<{
      status: string;
      accounts: string;
      users: string;
      audits: string;
    }>(
      `SELECT status,
              (SELECT count(*)::text FROM accounts) AS accounts,
              (SELECT count(*)::text FROM users) AS users,
              (SELECT count(*)::text FROM audit_events) AS audits
       FROM installation_state WHERE singleton_id = 1`
    );
    expect(state.rows).toEqual([{ status: 'ready', accounts: '0', users: '0', audits: '0' }]);
  });

  it('rejects malformed or incomplete caller catalogs before writing global state', async () => {
    const incompleteMap = { ...rolePermissionMap, admin: ['auth.session.read'] };
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setRuntimeRole(client);
      await expect(
        callProvision(client, { rolePermissionMap: incompleteMap })
      ).rejects.toMatchObject({ code: '22023' });
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    const counts = await pool.query<{ accounts: string; users: string }>(
      `SELECT (SELECT count(*)::text FROM accounts) AS accounts,
              (SELECT count(*)::text FROM users) AS users`
    );
    expect(counts.rows).toEqual([{ accounts: '0', users: '0' }]);
  });

  it('fails closed on partial global state instead of auto-repairing it', async () => {
    await pool.query(
      `INSERT INTO accounts (tenant_id, slug, name)
       VALUES ('00000000-0000-0000-0000-000000000001', 'orphan-account', 'Orphan Account')`
    );

    const state = await pool.query<{ status: string; required: boolean }>(
      `SELECT status, app.is_initial_setup_required() AS required
       FROM installation_state WHERE singleton_id = 1`
    );
    expect(state.rows).toEqual([{ status: 'provisioned', required: false }]);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setRuntimeRole(client);
      await expect(callProvision(client)).rejects.toMatchObject({ code: 'CVG01' });
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    expect((await pool.query('SELECT count(*)::int AS count FROM accounts')).rows[0]).toEqual({
      count: 1
    });
  });

  it('idempotently backfills an installation that predates the singleton migration', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DROP TRIGGER IF EXISTS installation_claimed_by_account ON accounts');
      await client.query('DROP TRIGGER IF EXISTS installation_claimed_by_user ON users');
      await client.query('DROP FUNCTION app.is_initial_setup_required()');
      await client.query(
        `DROP FUNCTION app.provision_initial_installation(
          text, text, text, text, text, text, text, text, text,
          jsonb, jsonb, jsonb, text
        )`
      );
      await client.query('DROP FUNCTION app.mark_installation_provisioned()');
      await client.query('DROP TABLE installation_state');
      await client.query(
        `INSERT INTO accounts (tenant_id, slug, name)
         VALUES ('00000000-0000-0000-0000-000000000001', 'legacy', 'Legacy Clinic')`
      );

      await client.query(readFileSync(MIGRATION_PATH, 'utf8'));
      await client.query(readFileSync(MIGRATION_PATH, 'utf8'));

      const backfill = await client.query<{
        status: string;
        account_id: string;
        required: boolean;
      }>(
        `SELECT status, account_id, app.is_initial_setup_required() AS required
         FROM installation_state WHERE singleton_id = 1`
      );
      expect(backfill.rows).toHaveLength(1);
      expect(backfill.rows[0]).toMatchObject({ status: 'provisioned', required: false });
      expect(backfill.rows[0]?.account_id).toBeTruthy();
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('pins SECURITY DEFINER search paths and grants installer membership only to API runtimes', async () => {
    const functions = await pool.query<{
      name: string;
      security_definer: boolean;
      config: string[] | null;
      public_execute: boolean;
    }>(
      `SELECT p.proname AS name,
              p.prosecdef AS security_definer,
              p.proconfig AS config,
              has_function_privilege('public', p.oid, 'EXECUTE') AS public_execute
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'app'
         AND p.proname IN ('is_initial_setup_required', 'provision_initial_installation')
       ORDER BY p.proname`
    );
    expect(functions.rows).toEqual([
      {
        name: 'is_initial_setup_required',
        security_definer: true,
        config: ['search_path=pg_catalog, public'],
        public_execute: false
      },
      {
        name: 'provision_initial_installation',
        security_definer: true,
        config: ['search_path=pg_catalog, public'],
        public_execute: false
      }
    ]);

    const composeScript = readFileSync(
      resolve(ROOT, 'infra/postgres/init-runtime-role.sh'),
      'utf8'
    );
    const helmScript = readFileSync(
      resolve(ROOT, 'infra/helm/cvg-his-v2/templates/postgres-runtime-role-configmap.yaml'),
      'utf8'
    );

    for (const script of [composeScript, helmScript]) {
      expect(script).toContain('cvg_installer');
      expect(script).toMatch(/GRANT[^\n]*cvg_installer[^\n]*(API|api)_user/i);
      expect(script).toMatch(/REVOKE[^\n]*cvg_installer[^\n]*(WORKER|worker)_user/i);
      expect(script).not.toMatch(
        /ALTER DEFAULT PRIVILEGES[^\n]*GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES/
      );
    }
  });
});
