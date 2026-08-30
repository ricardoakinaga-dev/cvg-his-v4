import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';
import {
  IdempotencyConflictError,
  IdempotencyInProgressError,
  type JsonValue
} from '@cvg-his-v2/shared-database';

import { createTenantCommandRunner } from '../helpers/tenant-command.js';

function request(headers: Record<string, string> = {}): never {
  return { headers } as never;
}

test('tenant command runner executes idempotent commands through the unit of work', async () => {
  const calls: unknown[] = [];
  const runner = createTenantCommandRunner({
    environment: 'production',
    unitOfWork: {
      async execute(context, payload, command) {
        calls.push(context, payload);
        return { value: await command({} as never), replayed: false };
      }
    }
  });

  const result = await runner({
    request: request({ 'idempotency-key': 'request-1' }),
    accountId: '00000000-0000-0000-0000-000000000001',
    actorUserId: '00000000-0000-0000-0000-000000000002',
    correlationId: 'corr-1',
    operation: 'inventory.purchase.approve',
    payload: { purchaseId: 'purchase-1' } satisfies JsonValue,
    command: async () => ({ id: 'purchase-1', status: 'approved' })
  });

  assert.deepEqual(result, { id: 'purchase-1', status: 'approved' });
  assert.equal(calls.length, 2);
  assert.equal((calls[0] as { idempotencyKey: string }).idempotencyKey, 'request-1');
  assert.deepEqual(calls[1], { purchaseId: 'purchase-1' });
});

test('tenant command runner requires idempotency keys in production-like environments', async () => {
  const runner = createTenantCommandRunner({
    environment: 'staging',
    unitOfWork: { execute: async () => ({ value: {}, replayed: false }) } as never
  });

  await assert.rejects(
    () =>
      runner({
        request: request(),
        accountId: '00000000-0000-0000-0000-000000000001',
        actorUserId: '00000000-0000-0000-0000-000000000002',
        correlationId: 'corr-2',
        operation: 'inventory.purchase.approve',
        payload: {},
        command: async () => 'never'
      }),
    (error: unknown) => error instanceof ValidationError
  );
});

test('tenant command runner uses the tenant transaction fallback without an idempotency key or UoW', async () => {
  const calls: string[] = [];
  const runner = createTenantCommandRunner({
    environment: 'test',
    transaction: async (accountId, command) => {
      calls.push(accountId);
      return command();
    }
  });

  const result = await runner({
    request: request(),
    accountId: '00000000-0000-0000-0000-000000000001',
    actorUserId: '00000000-0000-0000-0000-000000000002',
    correlationId: 'corr-transaction-fallback',
    operation: 'discharges.create',
    payload: {},
    command: async () => 'transactional'
  });

  assert.equal(result, 'transactional');
  assert.deepEqual(calls, ['00000000-0000-0000-0000-000000000001']);
});

test('tenant command runner forwards actor and correlation metadata to transaction fallback', async () => {
  let receivedMetadata:
    | { readonly actorUserId: string; readonly correlationId: string }
    | undefined;
  const runner = createTenantCommandRunner({
    environment: 'test',
    transaction: async (_accountId, command, metadata) => {
      receivedMetadata = metadata;
      return command();
    }
  });

  await runner({
    request: request(),
    accountId: '00000000-0000-0000-0000-000000000001',
    actorUserId: '00000000-0000-0000-0000-000000000002',
    correlationId: 'corr-transaction-context',
    operation: 'inventory.consumptions.create',
    payload: {},
    command: async () => 'transactional'
  });

  assert.deepEqual(receivedMetadata, {
    actorUserId: '00000000-0000-0000-0000-000000000002',
    correlationId: 'corr-transaction-context'
  });
});

test('tenant command runner rejects oversized idempotency keys before database execution', async () => {
  let executed = false;
  const runner = createTenantCommandRunner({
    environment: 'production',
    unitOfWork: {
      async execute() {
        executed = true;
        return { value: {}, replayed: false };
      }
    } as never
  });

  await assert.rejects(
    () =>
      runner({
        request: request({ 'idempotency-key': 'x'.repeat(256) }),
        accountId: '00000000-0000-0000-0000-000000000001',
        actorUserId: '00000000-0000-0000-0000-000000000002',
        correlationId: 'corr-oversized-idempotency',
        operation: 'encounter.cash-receipt.create',
        payload: {},
        command: async () => 'never'
      }),
    (error: unknown) => error instanceof ValidationError
  );
  assert.equal(executed, false);
});

test('tenant command runner maps idempotency races to stable 409 application errors', async () => {
  for (const [failure, expectedCode] of [
    [new IdempotencyConflictError(), 'IDEMPOTENCY_CONFLICT'],
    [new IdempotencyInProgressError(), 'IDEMPOTENCY_IN_PROGRESS']
  ] as const) {
    const runner = createTenantCommandRunner({
      environment: 'production',
      unitOfWork: {
        execute: async () => {
          throw failure;
        }
      } as never
    });

    await assert.rejects(
      () =>
        runner({
          request: request({ 'idempotency-key': `request-${expectedCode}` }),
          accountId: '00000000-0000-0000-0000-000000000001',
          actorUserId: '00000000-0000-0000-0000-000000000002',
          correlationId: 'corr-idempotency',
          operation: 'encounter.cash-receipt.create',
          payload: {},
          command: async () => 'never'
        }),
      (error: unknown) =>
        error instanceof AppError && error.statusCode === 409 && error.code === expectedCode
    );
  }
});

test('tenant command runner invokes rollback recovery after the unit of work has rolled back', async () => {
  const phases: string[] = [];
  const runner = createTenantCommandRunner({
    environment: 'production',
    unitOfWork: {
      async execute(_context, _payload, command) {
        try {
          await command({} as never);
        } catch (error) {
          phases.push('rollback-complete');
          throw error;
        }
        throw new Error('command unexpectedly succeeded');
      }
    }
  });

  await assert.rejects(() =>
    runner({
      request: request({ 'idempotency-key': 'request-recovery' }),
      accountId: '00000000-0000-0000-0000-000000000001',
      actorUserId: '00000000-0000-0000-0000-000000000002',
      correlationId: 'corr-recovery',
      operation: 'access-control.permission-assignment',
      payload: {},
      command: async () => {
        phases.push('command-failed');
        throw new Error('audit-store-down');
      },
      onRollback: async () => {
        phases.push('cache-rehydrated');
      }
    })
  );

  assert.deepEqual(phases, ['command-failed', 'rollback-complete', 'cache-rehydrated']);
});

test('tenant command runner invokes commit recovery only after the unit of work commits', async () => {
  const phases: string[] = [];
  const runner = createTenantCommandRunner({
    environment: 'production',
    unitOfWork: {
      async execute(_context, _payload, command) {
        const value = await command({} as never);
        phases.push('transaction-committed');
        return { value, replayed: false };
      }
    }
  });

  await runner({
    request: request({ 'idempotency-key': 'request-commit-recovery' }),
    accountId: '00000000-0000-0000-0000-000000000001',
    actorUserId: '00000000-0000-0000-0000-000000000002',
    correlationId: 'corr-commit-recovery',
    operation: 'access-control.permission-assignment',
    payload: {},
    command: async () => {
      phases.push('command-succeeded');
      return 'committed';
    },
    onCommit: async () => {
      phases.push('cache-rehydrated');
    }
  });

  assert.deepEqual(phases, ['command-succeeded', 'transaction-committed', 'cache-rehydrated']);
});
