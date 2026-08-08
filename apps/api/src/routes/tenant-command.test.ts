import assert from 'node:assert/strict';
import test from 'node:test';

import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { JsonValue } from '@cvg-his-v2/shared-database';

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
    () => runner({
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
