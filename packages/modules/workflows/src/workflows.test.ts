import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import {
  createDatabaseWorkflowTaskService,
  DatabaseWorkflowTaskRepository,
  WorkflowTaskService
} from './index.js';
import type { WorkflowTaskTransitionEvent } from './types.js';

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

test('covers task filtering, account lookups, and immutable in-memory repository boundaries', async () => {
  const { service } = createService();
  const first = await service.create(ACCOUNT_A, USER, {
    ...input('filter-1', '2026-09-09T08:00:00.000Z'),
    taskType: 'clinical.follow_up',
    patientId: '44444444-4444-4444-8444-444444444444' as never,
    encounterId: '55555555-5555-4555-8555-555555555555' as never
  });
  const second = await service.create(ACCOUNT_A, USER, {
    ...input('filter-2', '2026-09-09T09:00:00.000Z'),
    taskType: 'billing.follow_up',
    patientId: '66666666-6666-4666-8666-666666666666' as never,
    encounterId: '77777777-7777-4777-8777-777777777777' as never
  });
  await service.acknowledge(ACCOUNT_A, USER, second.id);

  assert.equal((await service.findByIdempotencyKey(ACCOUNT_A, 'filter-1'))?.id, first.id);
  assert.equal(await service.findByIdempotencyKey(ACCOUNT_B, 'filter-1'), null);
  assert.equal((await service.list(ACCOUNT_A, { status: 'acknowledged' })).length, 1);
  assert.equal((await service.list(ACCOUNT_A, { taskType: 'billing.follow_up' })).length, 1);
  assert.equal((await service.list(ACCOUNT_A, { patientId: first.patientId })).length, 1);
  assert.equal((await service.list(ACCOUNT_A, { encounterId: first.encounterId })).length, 1);
  assert.equal((await service.list(ACCOUNT_A, { dueBefore: '2026-09-09T08:30:00.000Z' })).length, 1);
  assert.equal((await service.list(ACCOUNT_A, { limit: 1 })).length, 1);
  assert.deepEqual(await service.events(ACCOUNT_A, '88888888-8888-4888-8888-888888888888' as never), []);

  const event: WorkflowTaskTransitionEvent = {
    eventType: 'rescheduled',
    schemaVersion: 1,
    source: 'clinical-workflow',
    actorUserId: USER,
    correlationId: first.correlationId,
    occurredAt: '2026-09-09T10:00:00.000Z',
    payload: {}
  };
  await assert.rejects(
    () => service.repository.save({ ...first, accountId: ACCOUNT_B, revision: first.revision + 1 }, event),
    NotFoundError
  );
  await assert.rejects(
    () => service.repository.save({ ...first, revision: first.revision + 2 }, event),
    ConflictError
  );
});

test('renews leases and fences invalid worker claims', async () => {
  const { service } = createService();
  const task = await service.create(ACCOUNT_A, USER, input('renew-1'));
  const claim = (await service.claimDue({
    accountId: ACCOUNT_A,
    workerId: 'worker-renew',
    correlationId: 'corr-renew' as never,
    now: '2026-09-09T10:00:00.000Z',
    limit: 1,
    leaseMs: 1_000
  }))[0]!;

  const renewed = await service.renewClaim(claim, '2026-09-09T10:00:00.500Z', 10_000);
  assert.equal(renewed?.leaseOwner, 'worker-renew');
  assert.equal(renewed?.task.revision, claim.task.revision + 1);
  assert.equal(await service.renewClaim(claim, '2026-09-09T10:00:11.000Z', 10_000), null);
  assert.equal(
    await service.completeClaim({ ...claim, leaseOwner: 'other-worker' }, USER),
    false
  );
  assert.equal((await service.getOrThrow(ACCOUNT_A, task.id)).status, 'processing');
});

test('supports cancellation and reopening through rescheduling', async () => {
  const { service } = createService();
  const task = await service.create(ACCOUNT_A, USER, input('cancel-reschedule-1'));
  const cancelled = await service.cancel(ACCOUNT_A, USER, task.id, '  aguardando informação  ');
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.cancellationReason, 'aguardando informação');
  assert.equal((await service.cancel(ACCOUNT_A, USER, task.id, 'ignored')).id, task.id);

  const reopened = await service.reschedule(
    ACCOUNT_A,
    USER,
    task.id,
    '2026-09-09T12:00:00-03:00',
    'retorno reagendado'
  );
  assert.equal(reopened.status, 'pending');
  assert.equal(reopened.dueAt, '2026-09-09T15:00:00.000Z');
  assert.equal(reopened.cancellationReason, undefined);

  const rescheduled = await service.reschedule(
    ACCOUNT_A,
    USER,
    task.id,
    '2026-09-09T13:00:00.000Z'
  );
  assert.equal(rescheduled.status, 'pending');
  assert.equal(rescheduled.nextAttemptAt, '2026-09-09T13:00:00.000Z');

  const completed = await service.complete(ACCOUNT_A, USER, task.id);
  assert.equal((await service.complete(ACCOUNT_A, USER, task.id)).id, completed.id);
  await assert.rejects(
    () => service.reschedule(ACCOUNT_A, USER, task.id, '2026-09-09T14:00:00.000Z'),
    ConflictError
  );
  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('invalid-priority'), priority: 'urgent' as never }),
    ValidationError
  );
  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('invalid-mode'), executionMode: 'remote' as never }),
    ValidationError
  );
  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('invalid-description'), description: 'x'.repeat(4001) }),
    ValidationError
  );
  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('invalid-owner'), ownerType: 'ward' as never }),
    ValidationError
  );
  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('invalid-owner-id'), ownerId: 'x'.repeat(161) }),
    ValidationError
  );
  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('invalid-metadata'), metadata: [] as never }),
    ValidationError
  );
  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('invalid-metadata-size'), metadata: { blob: 'x'.repeat(65 * 1024) } }),
    ValidationError
  );
  await assert.rejects(
    () => service.create(ACCOUNT_A, USER, { ...input('invalid-attempts'), maxAttempts: 51 }),
    ValidationError
  );
});

test('skips terminal and recently escalated tasks while preserving replay guards', async () => {
  const { service, setNow } = createService();
  const completed = await service.create(ACCOUNT_A, USER, input('escalate-completed'));
  await service.complete(ACCOUNT_A, USER, completed.id);
  const cancelled = await service.create(ACCOUNT_A, USER, input('escalate-cancelled'));
  await service.cancel(ACCOUNT_A, USER, cancelled.id, 'cancelled');
  const dlq = await service.create(ACCOUNT_A, USER, { ...input('escalate-dlq'), maxAttempts: 1 });
  const claim = (await service.claimDue({
    accountId: ACCOUNT_A,
    workerId: 'worker-dlq',
    correlationId: 'corr-dlq' as never,
    now: '2026-09-09T10:00:00.000Z',
    limit: 1,
    leaseMs: 1_000
  }))[0]!;
  await service.failClaim(claim, 'permanent failure');

  assert.deepEqual(await service.escalateOverdue(ACCOUNT_A, USER, 0), []);
  await assert.rejects(() => service.replay(ACCOUNT_A, USER, completed.id), ConflictError);
  await assert.rejects(() => service.replay(ACCOUNT_B, USER, dlq.id), NotFoundError);
  setNow('2026-09-09T12:00:01.000Z');
  assert.equal((await service.replay(ACCOUNT_A, USER, dlq.id)).status, 'pending');
  assert.equal((await service.escalateOverdue(ACCOUNT_A, USER)).some((item) => item.id === completed.id), false);

  const databaseService = createDatabaseWorkflowTaskService({ now: () => '2026-09-09T10:00:00.000Z' });
  assert.equal(typeof databaseService.repository.createOrGet, 'function');
});

test('keeps database workflow reads tenant-scoped and fail-closed on absent rows', async () => {
  const queries: string[] = [];
  let releases = 0;
  const client = {
    query: async (sql: string) => {
      queries.push(sql);
      return { rows: [] as Record<string, unknown>[] };
    },
    release: () => {
      releases += 1;
    }
  };
  const pool = { connect: async () => client } as never;
  const repository = new DatabaseWorkflowTaskRepository(pool);

  assert.equal(await repository.findById(ACCOUNT_A, '99999999-9999-4999-8999-999999999999' as never), null);
  assert.equal(await repository.findByIdempotencyKey(ACCOUNT_A, 'missing'), null);
  assert.deepEqual(queries.slice(0, 2), ['BEGIN', "SELECT set_config('app.current_account_id', $1, true)"]);
  assert.equal(queries.filter((query) => query === 'COMMIT').length, 2);
  assert.equal(releases, 2);
});
