import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  assertDatabaseRuntimeRoleIsRestricted,
  getActiveDatabaseContext,
  inspectDatabaseRuntimeRole,
  runWithDatabaseClient
} from './client.js';

interface RuntimeRoleRow {
  readonly role_name: string;
  readonly rolsuper: boolean;
  readonly rolbypassrls: boolean;
  readonly rolcreatedb: boolean;
  readonly rolcreaterole: boolean;
  readonly rolcanlogin: boolean;
  readonly rolreplication: boolean;
  readonly owned_tenant_tables: string | number;
  readonly role_memberships: string | number;
}

function createQueryable(row?: Partial<RuntimeRoleRow>) {
  const queries: string[] = [];
  const defaultRow: RuntimeRoleRow = {
    role_name: 'cvg_runtime',
    rolsuper: false,
    rolbypassrls: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolcanlogin: true,
    rolreplication: false,
    owned_tenant_tables: '0',
    role_memberships: '0'
  };

  return {
    queries,
    query: async (sql: string) => {
      queries.push(sql);
      return { rows: row === undefined ? [{ ...defaultRow }] : [{ ...defaultRow, ...row }] };
    }
  };
}

test('inspectDatabaseRuntimeRole maps the active PostgreSQL role without leaking credentials', async () => {
  const queryable = createQueryable();

  const inspection = await inspectDatabaseRuntimeRole(queryable);

  assert.deepEqual(inspection, {
    roleName: 'cvg_runtime',
    canLogin: true,
    isSuperuser: false,
    bypassesRls: false,
    canCreateDatabase: false,
    canCreateRole: false,
    canReplicate: false,
    ownedTenantTables: 0,
    roleMemberships: 0
  });
  assert.equal(queryable.queries.length, 1);
  assert.match(queryable.queries[0] ?? '', /current_user/i);
  assert.match(queryable.queries[0] ?? '', /account_id/i);
});

test('assertDatabaseRuntimeRoleIsRestricted accepts a least-privilege login role', async () => {
  const inspection = await assertDatabaseRuntimeRoleIsRestricted(createQueryable());

  assert.equal(inspection.roleName, 'cvg_runtime');
});

for (const scenario of [
  { label: 'superuser', row: { rolsuper: true }, expected: /SUPERUSER/ },
  { label: 'RLS bypass', row: { rolbypassrls: true }, expected: /BYPASSRLS/ },
  { label: 'database creation', row: { rolcreatedb: true }, expected: /CREATEDB/ },
  { label: 'role creation', row: { rolcreaterole: true }, expected: /CREATEROLE/ },
  { label: 'replication', row: { rolreplication: true }, expected: /REPLICATION/ },
  { label: 'tenant table ownership', row: { owned_tenant_tables: 2 }, expected: /owns 2 tenant table/ },
  { label: 'role membership', row: { role_memberships: 1 }, expected: /assume 1 role/ },
  { label: 'disabled login', row: { rolcanlogin: false }, expected: /LOGIN/ }
] as const) {
  test(`assertDatabaseRuntimeRoleIsRestricted rejects ${scenario.label}`, async () => {
    await assert.rejects(
      () => assertDatabaseRuntimeRoleIsRestricted(createQueryable(scenario.row)),
      scenario.expected
    );
  });
}

test('inspectDatabaseRuntimeRole fails closed when PostgreSQL returns no active role', async () => {
  const queryable = {
    query: async () => ({ rows: [] })
  };

  await assert.rejects(() => inspectDatabaseRuntimeRole(queryable), /active PostgreSQL role/i);
});

test('runWithDatabaseClient isolates request-bound clients across concurrent async work', async () => {
  const clientA = { query: async () => ({ rows: [] }) };
  const clientB = { query: async () => ({ rows: [] }) };

  const [contextA, contextB] = await Promise.all([
    runWithDatabaseClient(clientA as never, { accountId: 'account-a' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return getActiveDatabaseContext();
    }),
    runWithDatabaseClient(clientB as never, { accountId: 'account-b' }, async () => {
      await Promise.resolve();
      return getActiveDatabaseContext();
    })
  ]);

  assert.equal(contextA?.client, clientA);
  assert.equal(contextA?.accountId, 'account-a');
  assert.equal(contextB?.client, clientB);
  assert.equal(contextB?.accountId, 'account-b');
  assert.equal(getActiveDatabaseContext(), undefined);
});
