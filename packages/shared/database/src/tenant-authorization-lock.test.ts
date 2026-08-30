import assert from 'node:assert/strict';
import test from 'node:test';

import type { Pool, PoolClient } from 'pg';

import {
  acquireTenantAuthorizationLock,
  runWithDatabaseTransactionScope,
  type DatabaseTransactionScope
} from './transaction-scope.js';

const accountId = '00000000-0000-0000-0000-000000000001';
const otherAccountId = '00000000-0000-0000-0000-000000000002';

function createHarness() {
  const queries: Array<{ readonly text: string; readonly params?: readonly unknown[] }> = [];
  const client = {
    query: async (text: string, params?: readonly unknown[]) => {
      queries.push({ text, params });
      return { rows: [], rowCount: 0 };
    }
  } as unknown as PoolClient;
  const pool = {} as Pool;
  const scope: DatabaseTransactionScope = {
    accountId,
    pool,
    client,
    isActive: () => true
  };
  return { queries, scope };
}

test('acquireTenantAuthorizationLock fails closed outside an active transaction', async () => {
  await assert.rejects(
    acquireTenantAuthorizationLock(accountId),
    /requires an active database transaction/
  );
});

test('acquireTenantAuthorizationLock rejects an account mismatch', async () => {
  const harness = createHarness();

  await assert.rejects(
    runWithDatabaseTransactionScope(harness.scope, () =>
      acquireTenantAuthorizationLock(otherAccountId)
    ),
    /account mismatch/
  );
  assert.equal(harness.queries.length, 0);
});

test('acquireTenantAuthorizationLock rejects an inactive transaction scope', async () => {
  const harness = createHarness();
  const inactiveScope: DatabaseTransactionScope = {
    ...harness.scope,
    isActive: () => false
  };

  await assert.rejects(
    runWithDatabaseTransactionScope(inactiveScope, () =>
      acquireTenantAuthorizationLock(accountId)
    ),
    /requires an active database transaction/
  );
  assert.equal(harness.queries.length, 0);
});

test('acquireTenantAuthorizationLock uses the active transaction client', async () => {
  const harness = createHarness();

  await runWithDatabaseTransactionScope(harness.scope, () =>
    acquireTenantAuthorizationLock(accountId)
  );

  assert.deepEqual(harness.queries, [
    {
      text: 'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      params: [accountId]
    }
  ]);
});
