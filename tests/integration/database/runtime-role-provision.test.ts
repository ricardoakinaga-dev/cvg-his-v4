import { afterAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { createHash, randomUUID } from 'node:crypto';

import { TEST_DB_URL } from '../../setup/env.js';

const runtimeRole = `cvg_runtime_test_${process.pid}`;
const runtimePassword = `runtime-test-${process.pid}-Aa1!`;
const runtimeUrl = (() => {
  const url = new URL(TEST_DB_URL);
  url.username = runtimeRole;
  url.password = runtimePassword;
  return url.toString();
})();

describe('PostgreSQL runtime role provisioning', () => {
  afterAll(async () => {
    const admin = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      const roleIdentifier = `"${runtimeRole.replaceAll('"', '""')}"`;
      await admin.query(`DROP OWNED BY ${roleIdentifier}`);
      await admin.query(`DROP ROLE IF EXISTS ${roleIdentifier}`);
    } finally {
      await admin.end();
    }
  });

  it('creates a login role that can access data but has no bypass, ownership or memberships', async () => {
    const provisioning = (await import('../../../scripts/provision-database-runtime-role.mjs')) as {
      parseRuntimeRoleProvisioningConfig(environment: Record<string, string>): unknown;
      provisionRuntimeRole(config: unknown, options: { log(): void }): Promise<{
        roleName: string;
        ownedTenantTables: number;
        roleMemberships: number;
      }>;
    };
    const config = provisioning.parseRuntimeRoleProvisioningConfig({
      DATABASE_ADMIN_URL: TEST_DB_URL,
      DATABASE_URL: runtimeUrl
    });
    const inspection = await provisioning.provisionRuntimeRole(config, { log: () => undefined });

    expect(inspection).toEqual({
      roleName: runtimeRole,
      ownedTenantTables: 0,
      roleMemberships: 0
    });

    const runtime = new Pool({ connectionString: runtimeUrl, max: 1 });
    try {
      const tables = await runtime.query(
        "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'"
      );
      expect(tables.rows[0]?.count).toBeGreaterThan(100);
      await expect(runtime.query('SELECT id FROM accounts LIMIT 1')).rejects.toThrow(
        /permission denied/i
      );
      await expect(runtime.query('SELECT id FROM tenants LIMIT 1')).rejects.toThrow(
        /permission denied/i
      );
      const resolved = await runtime.query(
        `SELECT app.resolve_active_account_id('default') AS account_id`
      );
      expect(resolved.rows[0]?.account_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    } finally {
      await runtime.end();
    }
  });

  it('makes production API and worker fail closed for admin credentials and start with runtime credentials', async () => {
    const apiBootstrap = await import('../../../apps/api/src/bootstrap.js');
    const workerBootstrap = await import('../../../apps/worker/src/bootstrap.js');

    await expect(
      apiBootstrap.bootstrapServices({
        databaseUrl: TEST_DB_URL,
        environment: 'production',
        maxRetries: 1,
        retryDelayMs: 1
      })
    ).rejects.toThrow(/SUPERUSER/);
    await apiBootstrap.shutdownServices();

    const api = await apiBootstrap.bootstrapServices({
      databaseUrl: runtimeUrl,
      environment: 'production',
      maxRetries: 1,
      retryDelayMs: 1
    });
    expect(api.databaseHealthy).toBe(true);
    expect(api.repositoriesUseDatabase).toBe(true);
    await apiBootstrap.shutdownServices();

    const worker = await workerBootstrap.bootstrapWorkerServices({
      databaseUrl: runtimeUrl,
      environment: 'production'
    });
    expect(worker.databaseHealthy).toBe(true);
    expect(worker.notificationRepository).toBeDefined();
    await workerBootstrap.shutdownWorkerServices();
  });

  it('routes Drizzle repository queries through the active tenant transaction', async () => {
    const accountA = randomUUID();
    const accountB = randomUUID();
    const ownerA = randomUUID();
    const ownerB = randomUUID();
    const tenantId = randomUUID();
    const admin = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      await admin.query(
        `INSERT INTO tenants (id, slug, name, status)
         VALUES ($1, 'repository-routing', 'Repository Routing', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [tenantId]
      );
      await admin.query(
        `INSERT INTO accounts (id, tenant_id, slug, name)
         VALUES ($1, $3, 'repository-a', 'Repository A'),
                ($2, $3, 'repository-b', 'Repository B')
         ON CONFLICT (id) DO NOTHING`,
        [accountA, accountB, tenantId]
      );
      await admin.query(
        `INSERT INTO owners (id, account_id, full_name)
         VALUES ($1, $3, 'Repository Owner A'), ($2, $4, 'Repository Owner B')
         ON CONFLICT (id) DO NOTHING`,
        [ownerA, ownerB, accountA, accountB]
      );
    } finally {
      await admin.end();
    }

    const database = await import('@cvg-his-v2/shared-database');
    const tenantContext = await import('@cvg-his-v2/tenant-context');
    const { DatabaseOwnerRepository } = await import('@cvg-his-v2/module-owners');
    const db = database.createDatabaseClient(runtimeUrl);
    const repository = new DatabaseOwnerRepository(db);

    const visibleA = await tenantContext.runWithTenantContext(
      { tenantId, accountId: accountA },
      () =>
        tenantContext.withTenantQuery(database.getPool(), () =>
          repository.findByAccountId(accountA as never)
        )
    );
    const visibleB = await tenantContext.runWithTenantContext(
      { tenantId, accountId: accountB },
      () =>
        tenantContext.withTenantQuery(database.getPool(), () =>
          repository.findByAccountId(accountB as never)
        )
    );

    expect(visibleA.map((owner) => owner.id)).toEqual([ownerA]);
    expect(visibleB.map((owner) => owner.id)).toEqual([ownerB]);
    await database.closeDatabaseClient();
  });

  it('authenticates a database user by account slug and persists the session under RLS', async () => {
    const accountId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const userId = '95555555-5555-4555-8555-555555555555';
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const password = 'PremiumEnterprise123!';
    const admin = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      await admin.query(
        `INSERT INTO tenants (id, slug, name, status)
         VALUES ($1, 'auth-runtime-tenant', 'Auth Runtime Tenant', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [tenantId]
      );
      await admin.query(
        `INSERT INTO accounts (id, tenant_id, slug, name)
         VALUES ($1, $2, 'premium-clinic', 'Premium Clinic')
         ON CONFLICT (id) DO NOTHING`,
        [accountId, tenantId]
      );
      await admin.query(
        `INSERT INTO users (id, account_id, email, password_hash, full_name, is_active)
         VALUES ($1, $2, 'admin@premium-clinic.test', $3, 'Premium Admin', true)
         ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [userId, accountId, createHash('sha256').update(password).digest('hex')]
      );
      await admin.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, id FROM roles WHERE name = 'admin'
         ON CONFLICT DO NOTHING`,
        [userId]
      );
    } finally {
      await admin.end();
    }

    const { bootstrapServices, shutdownServices } = await import('../../../apps/api/src/bootstrap.js');
    const { createApiRuntime } = await import('../../../apps/api/src/runtime.js');
    const bootstrap = await bootstrapServices({
      databaseUrl: runtimeUrl,
      environment: 'production',
      maxRetries: 1,
      retryDelayMs: 1
    });
    const runtime = createApiRuntime({
      authSecret: 'integration-runtime-auth-secret-with-at-least-32-characters',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories
    });
    await runtime.initialize();

    const login = await runtime.auth.login(
      { accountSlug: 'premium-clinic', username: 'admin', password },
      'corr-runtime-login'
    );
    expect('accessToken' in login).toBe(true);
    if (!('accessToken' in login)) throw new Error('Expected completed login');
    expect(login.principal.user.accountId).toBe(accountId);

    await new Promise((resolve) => setTimeout(resolve, 20));
    const verification = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    try {
      const persisted = await verification.query(
        'SELECT account_id, user_id FROM sessions WHERE id = $1',
        [login.principal.session.sessionId]
      );
      expect(persisted.rows).toEqual([{ account_id: accountId, user_id: userId }]);
    } finally {
      await verification.end();
      await shutdownServices();
    }
  });
});
