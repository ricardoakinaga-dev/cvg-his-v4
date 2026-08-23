import assert from 'node:assert/strict';
import test from 'node:test';

import type { Pool, PoolClient, QueryResult } from 'pg';

import {
  getTenantTransactionContext,
  runInTenantTransactionContext,
  type TenantTransactionContext
} from './tenant-unit-of-work.js';

const accountId = '00000000-0000-0000-0000-000000000001';
const actorUserId = '00000000-0000-0000-0000-000000000002';

function createPoolHarness() {
  let queries: readonly string[] = [];
  let released = 0;
  let connections = 0;
  const client = {
    query: async (text: string) => {
      queries = [...queries, text];
      if (text.includes("current_setting('app.current_account_id'")) {
        return { rows: [{ matches: true }], rowCount: 1 } as unknown as QueryResult;
      }
      if (text.includes('INSERT INTO inbox_events')) {
        return { rows: [{ id: 'inbox-1' }], rowCount: 1 } as unknown as QueryResult;
      }
      return { rows: [], rowCount: null } as unknown as QueryResult;
    },
    release: () => {
      released += 1;
    }
  } as unknown as PoolClient;
  const pool = {
    connect: async () => {
      connections += 1;
      return client;
    }
  } as unknown as Pool;
  return { pool, queries: () => queries, released: () => released, connections: () => connections };
}

test('runInTenantTransactionContext installs the canonical context without idempotency storage', async () => {
  const harness = createPoolHarness();
  let captured: TenantTransactionContext | undefined;
  const result = await runInTenantTransactionContext(
    harness.pool,
    { accountId, actorUserId, correlationId: 'corr-pix-1' },
    async (transaction) => {
      captured = transaction;
      assert.equal(getTenantTransactionContext(), transaction);
      assert.equal(await transaction.inbox.claim('consumer', 'event-1'), true);
      return 'applied';
    }
  );

  assert.equal(result, 'applied');
  assert.ok(captured);
  assert.equal(getTenantTransactionContext(), undefined);
  assert.equal(harness.released(), 1);
  assert.ok(harness.queries().some((query) => query === 'COMMIT'));
  assert.ok(harness.queries().every((query) => !query.includes('idempotency_requests')));
  assert.throws(() => captured!.client.query('SELECT 1'), /scope is no longer active/);
});

test('runInTenantTransactionContext rolls back callback failures', async () => {
  const harness = createPoolHarness();

  await assert.rejects(
    runInTenantTransactionContext(
      harness.pool,
      { accountId, actorUserId, correlationId: 'corr-pix-rollback' },
      async () => {
        throw new Error('injected failure');
      }
    ),
    /injected failure/
  );

  assert.ok(harness.queries().some((query) => query === 'ROLLBACK'));
  assert.ok(harness.queries().every((query) => query !== 'COMMIT'));
  assert.equal(harness.released(), 1);
});

test('runInTenantTransactionContext reuses an already active transaction and context', async () => {
  const harness = createPoolHarness();
  const outer = await runInTenantTransactionContext(
    harness.pool,
    { accountId, actorUserId, correlationId: 'corr-pix-nested-outer' },
    async (outerTransaction) => {
      return runInTenantTransactionContext(
        harness.pool,
        { accountId, actorUserId, correlationId: 'corr-pix-nested-inner' },
        async (innerTransaction) => {
          assert.equal(innerTransaction.client, outerTransaction.client);
          assert.equal(getTenantTransactionContext(), innerTransaction);
          assert.equal(innerTransaction.accountId, accountId);
          assert.equal(innerTransaction.actorUserId, actorUserId);
          assert.equal(innerTransaction.correlationId, 'corr-pix-nested-inner');
          return 'nested';
        }
      );
    }
  );

  assert.equal(outer, 'nested');
  assert.equal(harness.connections(), 1);
  assert.equal(harness.released(), 1);
  assert.equal(harness.queries().filter((query) => query === 'BEGIN').length, 1);
  assert.equal(harness.queries().filter((query) => query === 'COMMIT').length, 1);
  assert.equal(harness.queries().filter((query) => query === 'ROLLBACK').length, 0);
});

test('runInTenantTransactionContext validates actor and correlation before connecting', async () => {
  const harness = createPoolHarness();

  await assert.rejects(
    runInTenantTransactionContext(
      harness.pool,
      { accountId, actorUserId: '', correlationId: 'corr-pix-invalid' },
      async () => undefined
    ),
    /actor user id/
  );
  await assert.rejects(
    runInTenantTransactionContext(
      harness.pool,
      { accountId, actorUserId, correlationId: '' },
      async () => undefined
    ),
    /correlation id/
  );
  assert.equal(harness.queries().length, 0);
});
