import assert from 'node:assert/strict';
import test from 'node:test';

import { getTenantContext, requireAccountId } from '@cvg-his-v2/tenant-context';

import {
  assertWorkerAccountsAreActive,
  createPostgresTenantTransactionRunner,
  runWorkerAccounts,
  type WorkerAccountOperationName
} from './account-runner.js';

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';

test('assertWorkerAccountsAreActive rejects unknown or inactive configured accounts', async () => {
  const database = {
    query: async (_sql: string, params: readonly unknown[]) => ({
      rows: [{ active: params[0] === ACCOUNT_A }]
    })
  };

  await assert.doesNotReject(() => assertWorkerAccountsAreActive(database as never, [ACCOUNT_A]));
  await assert.rejects(
    () => assertWorkerAccountsAreActive(database as never, [ACCOUNT_A, ACCOUNT_B]),
    new RegExp(`unknown or inactive account.*${ACCOUNT_B}`)
  );
});

function createFakePool(queryLog: Array<{ readonly sql: string; readonly params?: readonly unknown[] }>) {
  return {
    connect: async () => ({
      query: async (sql: string, params?: readonly unknown[]) => {
        queryLog.push({ sql, params });
        return { rows: [], rowCount: 0 };
      },
      release: () => {}
    })
  };
}

test('runWorkerAccounts processes every account in isolated PostgreSQL tenant transactions', async () => {
  const queryLog: Array<{ readonly sql: string; readonly params?: readonly unknown[] }> = [];
  const operationLog: Array<{
    readonly operation: WorkerAccountOperationName;
    readonly accountId: string;
    readonly correlationId: string;
  }> = [];

  const record = async (operation: WorkerAccountOperationName, correlationId: string) => {
    operationLog.push({ operation, accountId: requireAccountId(), correlationId });
  };

  const result = await runWorkerAccounts({
    accountIds: [ACCOUNT_A, ACCOUNT_B],
    baseContext: {
      service: 'test-worker',
      environment: 'test',
      persistenceMode: 'database',
      databaseHealthy: true,
      databaseDetail: 'connected'
    },
    createCorrelationId: (accountId) => `corr-${accountId.slice(0, 8)}`,
    resolveRunAsUserId: (accountId) => accountId,
    transaction: createPostgresTenantTransactionRunner(createFakePool(queryLog) as never),
    operations: {
      notifications: (context) => record('notifications', context.correlationId),
      eventBus: (context) => record('eventBus', context.correlationId),
      scheduledReports: (context) => record('scheduledReports', context.correlationId)
    }
  });

  assert.deepEqual(
    operationLog.map(({ operation, accountId }) => `${accountId}:${operation}`),
    [
      `${ACCOUNT_A}:notifications`,
      `${ACCOUNT_A}:eventBus`,
      `${ACCOUNT_A}:scheduledReports`,
      `${ACCOUNT_B}:notifications`,
      `${ACCOUNT_B}:eventBus`,
      `${ACCOUNT_B}:scheduledReports`
    ]
  );
  assert.deepEqual(result.map(({ accountId }) => accountId), [ACCOUNT_A, ACCOUNT_B]);
  assert.equal(queryLog.filter(({ sql }) => sql === 'BEGIN').length, 6);
  assert.equal(queryLog.filter(({ sql }) => sql === 'COMMIT').length, 6);
  assert.deepEqual(
    queryLog
      .filter(({ sql }) => sql.includes("set_config('app.current_account_id'"))
      .map(({ params }) => params?.[0]),
    [ACCOUNT_A, ACCOUNT_A, ACCOUNT_A, ACCOUNT_B, ACCOUNT_B, ACCOUNT_B]
  );
  assert.equal(getTenantContext(), undefined);
});

test('runWorkerAccounts continues other operations and tenants, then reports every failure', async () => {
  const operationLog: string[] = [];
  const queryLog: Array<{ readonly sql: string; readonly params?: readonly unknown[] }> = [];

  await assert.rejects(
    () =>
      runWorkerAccounts({
        accountIds: [ACCOUNT_A, ACCOUNT_B],
        baseContext: {
          service: 'test-worker',
          environment: 'test',
          persistenceMode: 'database',
          databaseHealthy: true,
          databaseDetail: 'connected'
        },
        createCorrelationId: (accountId) => `corr-${accountId.slice(0, 8)}`,
        resolveRunAsUserId: (accountId) => accountId,
        transaction: createPostgresTenantTransactionRunner(createFakePool(queryLog) as never),
        operations: {
          notifications: async () => {
            const accountId = requireAccountId();
            operationLog.push(`${accountId}:notifications`);
            if (accountId === ACCOUNT_A) throw new Error('notification failure');
          },
          eventBus: async () => {
            operationLog.push(`${requireAccountId()}:eventBus`);
          },
          scheduledReports: async () => {
            operationLog.push(`${requireAccountId()}:scheduledReports`);
          }
        }
      }),
    (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.match(error.message, /Worker account batch failed/);
      assert.equal(error.errors.length, 1);
      assert.match(String(error.errors[0]), new RegExp(ACCOUNT_A));
      return true;
    }
  );

  assert.deepEqual(operationLog, [
    `${ACCOUNT_A}:notifications`,
    `${ACCOUNT_A}:eventBus`,
    `${ACCOUNT_A}:scheduledReports`,
    `${ACCOUNT_B}:notifications`,
    `${ACCOUNT_B}:eventBus`,
    `${ACCOUNT_B}:scheduledReports`
  ]);
  assert.equal(queryLog.filter(({ sql }) => sql === 'ROLLBACK').length, 1);
  assert.equal(queryLog.filter(({ sql }) => sql === 'COMMIT').length, 5);
  assert.equal(getTenantContext(), undefined);
});

test('runWorkerAccounts is a no-op for an empty non-production account list', async () => {
  const result = await runWorkerAccounts({
    accountIds: [],
    baseContext: {
      service: 'test-worker',
      environment: 'test',
      persistenceMode: 'in-memory',
      databaseHealthy: false,
      databaseDetail: 'not configured'
    },
    createCorrelationId: () => 'unused',
    resolveRunAsUserId: (accountId) => accountId,
    transaction: async (operation) => operation(),
    operations: {
      notifications: async () => assert.fail('must not run'),
      eventBus: async () => assert.fail('must not run'),
      scheduledReports: async () => assert.fail('must not run')
    }
  });

  assert.deepEqual(result, []);
});

test('runWorkerAccounts rejects invalid IDs even when called without the env loader', async () => {
  await assert.rejects(
    () =>
      runWorkerAccounts({
        accountIds: ['not-a-uuid'],
        baseContext: {
          service: 'test-worker',
          environment: 'test',
          persistenceMode: 'database',
          databaseHealthy: true,
          databaseDetail: 'connected'
        },
        createCorrelationId: () => 'unused',
        resolveRunAsUserId: (accountId) => accountId,
        transaction: async (operation) => operation(),
        operations: {
          notifications: async () => assert.fail('must not run'),
          eventBus: async () => assert.fail('must not run'),
          scheduledReports: async () => assert.fail('must not run')
        }
      }),
    /valid UUID/
  );
});
