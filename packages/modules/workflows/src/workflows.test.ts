import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ConflictError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { WorkflowTaskService } from './index.js';

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111' as AccountId;
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222' as AccountId;
const USER = '33333333-3333-4333-8333-333333333333' as UserId;

function createService() {
  let now = '2026-09-09T10:00:00.000Z';
  const service = new WorkflowTaskService({ now: () => now });
  return {
    service,
    setNow(value: string) {
      now = value;
    }
  };
}

function input(idempotencyKey: string, dueAt = '2026-09-09T09:00:00.000Z') {
  return {
    taskType: 'clinical.follow_up',
    title: 'Revisar retorno clínico',
    dueAt,
    idempotencyKey,
    executionMode: 'worker',
    patientId: '44444444-4444-4444-8444-444444444444' as never,
    metadata: { source: 'test', tags: ['clinical'] },
    maxAttempts: 2
  } as const;
}

test('creates an account-scoped task idempotently and rejects payload drift', async () => {
  const { service } = createService();
  const created = await service.create(ACCOUNT_A, USER, input('follow-up-1'));
  const replay = await service.create(ACCOUNT_A, USER, input('follow-up-1'));

  assert.equal(replay.id, created.id);
  assert.equal((await service.events(ACCOUNT_A, created.id)).length, 1);
  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('follow-up-1'), title: 'Outro payload' }),
    ConflictError
  );

  const otherAccountTask = await service.create(ACCOUNT_B, USER, input('follow-up-1'));
  assert.notEqual(otherAccountTask.id, created.id);
  assert.equal((await service.list(ACCOUNT_A)).length, 1);
  assert.equal((await service.list(ACCOUNT_B)).length, 1);
});

test('serializes concurrent in-memory creates for one idempotency key', async () => {
  const { service } = createService();
  const results = await Promise.all(
    Array.from({ length: 8 }, () => service.create(ACCOUNT_A, USER, input('concurrent-1')))
  );

  assert.equal(new Set(results.map((task) => task.id)).size, 1);
  assert.equal((await service.events(ACCOUNT_A, results[0]!.id)).length, 1);
});

test('acknowledges and completes a task while preserving lifecycle events', async () => {
  const { service } = createService();
  const created = await service.create(ACCOUNT_A, USER, {
    ...input('lifecycle-1'),
    dueAt: '2026-09-09T11:00:00.000Z'
  });

  const acknowledged = await service.acknowledge(ACCOUNT_A, USER, created.id, 'Assumido pelo plantão');
  assert.equal(acknowledged.status, 'acknowledged');
  const completed = await service.complete(ACCOUNT_A, USER, created.id);
  assert.equal(completed.status, 'completed');
  assert.deepEqual(
    (await service.events(ACCOUNT_A, created.id)).map((event) => event.eventType),
    ['created', 'acknowledged', 'completed']
  );
  assert.equal((await service.events(ACCOUNT_A, created.id, 1)).length, 1);
  await assert.rejects(() => service.cancel(ACCOUNT_A, USER, created.id, 'late'), ConflictError);
});

test('fences expired worker leases so a stale worker cannot complete a newer claim', async () => {
  const { service, setNow } = createService();
  const task = await service.create(ACCOUNT_A, USER, input('lease-1'));
  const firstClaims = await service.claimDue({
    accountId: ACCOUNT_A,
    workerId: 'worker-a',
    correlationId: 'corr-a' as never,
    now: '2026-09-09T10:00:00.000Z',
    limit: 1,
    leaseMs: 1_000
  });
  assert.equal(firstClaims.length, 1);

  const first = firstClaims[0]!;
  setNow('2026-09-09T10:00:02.000Z');
  const secondClaims = await service.claimDue({
    accountId: ACCOUNT_A,
    workerId: 'worker-b',
    correlationId: 'corr-b' as never,
    now: '2026-09-09T10:00:02.000Z',
    limit: 1,
    leaseMs: 1_000
  });
  assert.equal(secondClaims.length, 1);
  assert.notEqual(secondClaims[0]!.leaseToken, first.leaseToken);

  assert.equal(await service.completeClaim(first, USER), false);
  assert.equal(await service.completeClaim(secondClaims[0]!, USER), true);
  assert.equal((await service.getOrThrow(ACCOUNT_A, task.id)).status, 'completed');
});

test('does not accept a completion after the lease expires when no worker reclaimed it', async () => {
  const { service, setNow } = createService();
  const task = await service.create(ACCOUNT_A, USER, input('lease-expired-no-reclaim'));
  const claim = (await service.claimDue({
    accountId: ACCOUNT_A,
    workerId: 'worker-slow',
    correlationId: 'corr-slow' as never,
    now: '2026-09-09T10:00:00.000Z',
    limit: 1,
    leaseMs: 1_000
  }))[0]!;
  // Reclaiming is deliberately omitted: a stale handler must be fenced even
  // when another worker has not yet observed the expired row.
  setNow('2026-09-09T10:00:02.000Z');
  assert.equal(
    await service.completeClaim(claim, USER),
    false,
    'an expired lease cannot be completed by a stale handler'
  );
  assert.equal((await service.getOrThrow(ACCOUNT_A, task.id)).status, 'processing');
});

test('moves an abandoned final attempt to DLQ instead of leaving clinical work stuck', async () => {
  const { service } = createService();
  const task = await service.create(ACCOUNT_A, USER, { ...input('expired-final-1'), maxAttempts: 1 });
  const claims = await service.claimDue({
    accountId: ACCOUNT_A,
    workerId: 'worker-crashed',
    correlationId: 'corr-crashed' as never,
    now: '2026-09-09T10:00:00.000Z',
    limit: 1,
    leaseMs: 1_000
  });
  assert.equal(claims.length, 1);

  const recovered = await service.claimDue({
    accountId: ACCOUNT_A,
    workerId: 'worker-recovery',
    correlationId: 'corr-recovery' as never,
    now: '2026-09-09T10:00:02.000Z',
    limit: 1,
    leaseMs: 1_000
  });
  assert.equal(recovered.length, 0);
  assert.equal((await service.getOrThrow(ACCOUNT_A, task.id)).status, 'dlq');
  assert.equal((await service.events(ACCOUNT_A, task.id)).at(-1)?.eventType, 'dead_lettered');
});

test('retries with bounded backoff, dead-letters after the attempt budget, and replays', async () => {
  const { service, setNow } = createService();
  const task = await service.create(ACCOUNT_A, USER, input('retry-1'));

  const first = (await service.claimDue({
    accountId: ACCOUNT_A,
    workerId: 'worker-retry',
    correlationId: 'corr-retry-1' as never,
    now: '2026-09-09T10:00:00.000Z',
    limit: 1,
    leaseMs: 60_000
  }))[0]!;
  assert.equal(await service.failClaim(first, 'provider timeout'), true);
  assert.equal((await service.getOrThrow(ACCOUNT_A, task.id)).status, 'retrying');

  setNow('2026-09-09T10:01:02.000Z');
  const second = (await service.claimDue({
    accountId: ACCOUNT_A,
    workerId: 'worker-retry',
    correlationId: 'corr-retry-2' as never,
    now: '2026-09-09T10:01:02.000Z',
    limit: 1,
    leaseMs: 60_000
  }))[0]!;
  assert.equal(await service.failClaim(second, 'provider still unavailable'), true);
  assert.equal((await service.getOrThrow(ACCOUNT_A, task.id)).status, 'dlq');

  const replayed = await service.replay(ACCOUNT_A, USER, task.id);
  assert.equal(replayed.status, 'pending');
  assert.equal(replayed.attempts, 0);
  assert.equal((await service.events(ACCOUNT_A, task.id)).at(-1)?.eventType, 'replayed');
});

test('escalates overdue work and validates durable task inputs', async () => {
  const { service, setNow } = createService();
  const overdue = await service.create(ACCOUNT_A, USER, input('escalate-1'));
  const escalated = await service.escalateOverdue(ACCOUNT_A, USER);
  assert.equal(escalated[0]?.id, overdue.id);
  assert.equal(escalated[0]?.escalationLevel, 1);
  assert.equal((await service.escalateOverdue(ACCOUNT_A, USER)).length, 0);
  setNow('2026-09-09T11:00:01.000Z');
  assert.equal((await service.escalateOverdue(ACCOUNT_A, USER))[0]?.escalationLevel, 2);

  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('invalid-1'), dueAt: 'not-a-date' }),
    ValidationError
  );
  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('invalid-timezone-1'), dueAt: '2026-09-09T10:00:00' }),
    ValidationError
  );
  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('invalid-2'), maxAttempts: 0 }),
    ValidationError
  );
});
