import { randomUUID } from 'node:crypto';

import { expect, describe, beforeAll, afterAll, afterEach, it } from 'vitest';

import {
  DatabaseWorkflowTaskRepository,
  WorkflowTaskService,
  checkWorkflowTaskSchemaReadiness,
  type WorkflowTaskSummary
} from '@cvg-his-v2/module-workflows';
import type { AccountId, CorrelationId, UserId } from '@cvg-his-v2/shared-types';

import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';
import { getTestPool } from '../../db/db-admin.js';
import { createDatabaseClient } from '@cvg-his-v2/shared-database';

const nowAt = '2026-09-09T10:00:00.000Z';
const laterAt = '2026-09-09T10:00:02.000Z';

type WorkflowFixture = {
  readonly tenantId: string;
  readonly accountA: AccountId;
  readonly accountB: AccountId;
  readonly userA: UserId;
  readonly userB: UserId;
};

let fixture: WorkflowFixture;
const pool = getTestPool();

function input(
  idempotencyKey: string,
  overrides: Partial<{
    readonly title: string;
    readonly executionMode: 'manual' | 'worker';
    readonly maxAttempts: number;
    readonly dueAt: string;
  }> = {}
) {
  return {
    taskType: 'clinical.follow_up',
    title: overrides.title ?? 'Revisar retorno clínico',
    dueAt: overrides.dueAt ?? '2026-09-09T09:00:00.000Z',
    idempotencyKey,
    executionMode: overrides.executionMode ?? 'worker',
    maxAttempts: overrides.maxAttempts ?? 2,
    metadata: { source: 'postgres-assurance', safe: true }
  } as const;
}

function correlation(label: string): CorrelationId {
  return `${label}-${randomUUID()}` as CorrelationId;
}

function serviceWithClock(repository: DatabaseWorkflowTaskRepository) {
  let now = nowAt;
  let tick = 0;
  return {
    service: new WorkflowTaskService({
      repository,
      now: () => new Date(Date.parse(now) + tick++).toISOString()
    }),
    setNow(value: string) {
      now = value;
      tick = 0;
    }
  };
}

async function createTask(
  service: WorkflowTaskService,
  accountId: AccountId,
  userId: UserId,
  key: string,
  overrides: Parameters<typeof input>[1] = {}
): Promise<WorkflowTaskSummary> {
  return service.create(accountId, userId, input(key, overrides));
}

describe('clinical workflow control plane — PostgreSQL assurance', () => {
  beforeAll(async () => {
    createDatabaseClient(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL!);
    const tenantId = randomUUID();
    const accountA = randomUUID() as AccountId;
    const accountB = randomUUID() as AccountId;
    const userA = randomUUID() as UserId;
    const userB = randomUUID() as UserId;

    await pool.query(
      `INSERT INTO tenants (id, slug, name, status)
       VALUES ($1, $2, 'Workflow assurance tenant', 'active')`,
      [tenantId, `workflow-${tenantId}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $3, $4, 'Workflow assurance A'),
              ($2, $3, $5, 'Workflow assurance B')`,
      [accountA, accountB, tenantId, `workflow-a-${accountA}`, `workflow-b-${accountB}`]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $3, $4, $5, 'assurance-hash', 'Workflow assurance A'),
              ($2, $3, $6, $7, 'assurance-hash', 'Workflow assurance B')`,
      [
        userA,
        userB,
        accountA,
        `workflow-user-a-${userA}`,
        `${userA}@workflow.test`,
        `workflow-user-b-${userB}`,
        `${userB}@workflow.test`
      ]
    );
    fixture = { tenantId, accountA, accountB, userA, userB };
  });

  afterAll(async () => {
    await pool.query('DELETE FROM tenants WHERE id = $1', [fixture.tenantId]);
  });

  afterEach(async () => {
    if (!fixture) return;

    // The event table is intentionally append-only for application roles. The
    // privileged test pool may remove only this fixture's rows between cases,
    // restoring the trigger immediately so the next assertion still exercises
    // the production immutability contract.
    await pool.query(
      'ALTER TABLE clinical_workflow_task_events DISABLE TRIGGER clinical_workflow_task_events_immutability_trigger'
    );
    try {
      await pool.query('DELETE FROM clinical_workflow_tasks WHERE account_id = ANY($1::uuid[])', [
        [fixture.accountA, fixture.accountB]
      ]);
    } finally {
      await pool.query(
        'ALTER TABLE clinical_workflow_task_events ENABLE TRIGGER clinical_workflow_task_events_immutability_trigger'
      );
    }
  });

  it('proves the schema readiness contract before serving workflow tasks', async () => {
    expect(await checkWorkflowTaskSchemaReadiness()).toBe(true);
    const result = await pool.query<{
      readonly tasks_rls: boolean;
      readonly events_rls: boolean;
      readonly tasks_force_rls: boolean;
      readonly events_force_rls: boolean;
    }>(
      `SELECT
         (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.clinical_workflow_tasks'::regclass) AS tasks_rls,
         (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.clinical_workflow_task_events'::regclass) AS events_rls,
         (SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.clinical_workflow_tasks'::regclass) AS tasks_force_rls,
         (SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.clinical_workflow_task_events'::regclass) AS events_force_rls`
    );
    expect(result.rows[0]).toEqual({
      tasks_rls: true,
      events_rls: true,
      tasks_force_rls: true,
      events_force_rls: true
    });
  });

  it('linearizes concurrent creation and rejects idempotency payload drift', async () => {
    const repository = new DatabaseWorkflowTaskRepository(pool);
    const { service } = serviceWithClock(repository);
    const tasks = await Promise.all(
      Array.from({ length: 12 }, () =>
        createTask(service, fixture.accountA, fixture.userA, 'postgres-concurrent-create')
      )
    );

    expect(new Set(tasks.map((task) => task.id)).size).toBe(1);
    expect((await service.events(fixture.accountA, tasks[0]!.id)).length).toBe(1);
    await expect(
      createTask(service, fixture.accountA, fixture.userA, 'postgres-concurrent-create', {
        title: 'Payload drift must be rejected'
      })
    ).rejects.toThrow(/idempotency/i);
  });

  it('enforces account isolation for reads, writes and known foreign UUIDs through RLS', async () => {
    const repository = new DatabaseWorkflowTaskRepository(pool);
    const { service } = serviceWithClock(repository);
    const taskA = await createTask(service, fixture.accountA, fixture.userA, 'rls-account-a');
    const taskB = await createTask(service, fixture.accountB, fixture.userB, 'rls-account-b');

    expect(await service.list(fixture.accountA)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: taskA.id })])
    );
    await expect(service.getOrThrow(fixture.accountA, taskB.id)).rejects.toThrow(/not found/i);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, fixture.accountA);
      const visible = await client.query<{ readonly id: string; readonly account_id: string }>(
        `SELECT id::text, account_id::text
           FROM clinical_workflow_tasks
          WHERE id = ANY($1::uuid[])
          ORDER BY id`,
        [[taskA.id, taskB.id]]
      );
      expect(visible.rows).toEqual([{ id: taskA.id, account_id: fixture.accountA }]);

      const updateForeign = await client.query(
        `UPDATE clinical_workflow_tasks SET title = 'must not cross tenant' WHERE id = $1`,
        [taskB.id]
      );
      const deleteForeign = await client.query(
        `DELETE FROM clinical_workflow_tasks WHERE id = $1`,
        [taskB.id]
      );
      expect(updateForeign.rowCount).toBe(0);
      expect(deleteForeign.rowCount).toBe(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('allows only one worker to claim a due task under PostgreSQL concurrency', async () => {
    const repository = new DatabaseWorkflowTaskRepository(pool);
    const { service } = serviceWithClock(repository);
    const task = await createTask(
      service,
      fixture.accountA,
      fixture.userA,
      'postgres-concurrent-claim'
    );
    const claims = await Promise.all([
      repository.claimDue({
        accountId: fixture.accountA,
        workerId: 'postgres-worker-a',
        correlationId: correlation('claim-a'),
        now: laterAt,
        limit: 1,
        leaseMs: 10_000
      }),
      repository.claimDue({
        accountId: fixture.accountA,
        workerId: 'postgres-worker-b',
        correlationId: correlation('claim-b'),
        now: laterAt,
        limit: 1,
        leaseMs: 10_000
      })
    ]);

    const claimed = claims.flat();
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.task.id).toBe(task.id);
    expect(
      (await service.events(fixture.accountA, task.id)).map((event) => event.eventType)
    ).toEqual(['created', 'claimed']);
  });

  it('fences a stale lease after takeover and permits only the current worker to complete', async () => {
    const repository = new DatabaseWorkflowTaskRepository(pool);
    const { service } = serviceWithClock(repository);
    const task = await createTask(service, fixture.accountA, fixture.userA, 'postgres-fencing');
    const first = (
      await repository.claimDue({
        accountId: fixture.accountA,
        workerId: 'postgres-stale-worker',
        correlationId: correlation('stale'),
        now: nowAt,
        limit: 1,
        leaseMs: 1_000
      })
    )[0]!;
    const second = (
      await repository.claimDue({
        accountId: fixture.accountA,
        workerId: 'postgres-current-worker',
        correlationId: correlation('current'),
        now: laterAt,
        limit: 1,
        leaseMs: 1_000
      })
    )[0]!;

    expect(second.leaseToken).not.toBe(first.leaseToken);
    expect(
      await repository.completeClaim(first, {
        eventType: 'completed',
        schemaVersion: 1,
        source: 'clinical-workflow',
        actorUserId: fixture.userA,
        correlationId: correlation('stale-complete'),
        occurredAt: laterAt
      })
    ).toBe(false);
    expect(
      await repository.completeClaim(second, {
        eventType: 'completed',
        schemaVersion: 1,
        source: 'clinical-workflow',
        actorUserId: fixture.userA,
        correlationId: correlation('current-complete'),
        occurredAt: laterAt
      })
    ).toBe(true);
    expect((await service.getOrThrow(fixture.accountA, task.id)).status).toBe('completed');
  });

  it('moves an abandoned final attempt to DLQ and records restart recovery evidence', async () => {
    const repository = new DatabaseWorkflowTaskRepository(pool);
    const { service } = serviceWithClock(repository);
    const task = await createTask(
      service,
      fixture.accountA,
      fixture.userA,
      'postgres-crash-recovery',
      {
        maxAttempts: 1
      }
    );
    expect(
      await repository.claimDue({
        accountId: fixture.accountA,
        workerId: 'postgres-crashed-worker',
        correlationId: correlation('crashed'),
        now: nowAt,
        limit: 1,
        leaseMs: 1_000
      })
    ).toHaveLength(1);

    expect(
      await repository.claimDue({
        accountId: fixture.accountA,
        workerId: 'postgres-restarted-worker',
        correlationId: correlation('restarted'),
        now: laterAt,
        limit: 1,
        leaseMs: 1_000
      })
    ).toHaveLength(0);
    expect((await service.getOrThrow(fixture.accountA, task.id)).status).toBe('dlq');
    expect((await service.events(fixture.accountA, task.id)).at(-1)?.eventType).toBe(
      'dead_lettered'
    );
  });

  it('executes bounded retry, DLQ and authorized replay without duplicating the event trail', async () => {
    const repository = new DatabaseWorkflowTaskRepository(pool);
    const { service, setNow } = serviceWithClock(repository);
    const task = await createTask(
      service,
      fixture.accountA,
      fixture.userA,
      'postgres-retry-replay'
    );
    const first = (
      await repository.claimDue({
        accountId: fixture.accountA,
        workerId: 'postgres-retry-worker',
        correlationId: correlation('retry-1'),
        now: laterAt,
        limit: 1,
        leaseMs: 10_000
      })
    )[0]!;
    setNow('2026-09-09T10:00:03.000Z');
    expect(await service.failClaim(first, 'provider timeout')).toBe(true);

    setNow('2026-09-09T10:01:02.000Z');
    const second = (
      await repository.claimDue({
        accountId: fixture.accountA,
        workerId: 'postgres-retry-worker',
        correlationId: correlation('retry-2'),
        now: '2026-09-09T10:01:02.000Z',
        limit: 1,
        leaseMs: 10_000
      })
    )[0]!;
    setNow('2026-09-09T10:01:03.000Z');
    expect(await service.failClaim(second, 'provider still unavailable')).toBe(true);
    expect((await service.getOrThrow(fixture.accountA, task.id)).status).toBe('dlq');

    const replayed = await service.replay(fixture.accountA, fixture.userA, task.id);
    expect(replayed.status).toBe('pending');
    expect(replayed.idempotencyKey).toBe('postgres-retry-replay');
    expect(
      (await service.events(fixture.accountA, task.id)).map((event) => event.eventType)
    ).toEqual(['created', 'claimed', 'retry_scheduled', 'claimed', 'dead_lettered', 'replayed']);
  });

  it('serializes competing acknowledgements/completions and keeps lifecycle events append-only', async () => {
    const repository = new DatabaseWorkflowTaskRepository(pool);
    const { service, setNow } = serviceWithClock(repository);
    const task = await createTask(
      service,
      fixture.accountA,
      fixture.userA,
      'postgres-lifecycle-race',
      {
        executionMode: 'manual'
      }
    );
    setNow(laterAt);
    const acknowledgements = await Promise.allSettled([
      service.acknowledge(fixture.accountA, fixture.userA, task.id),
      service.acknowledge(fixture.accountA, fixture.userA, task.id)
    ]);
    expect(acknowledgements.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(acknowledgements.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const completions = await Promise.allSettled([
      service.complete(fixture.accountA, fixture.userA, task.id),
      service.complete(fixture.accountA, fixture.userA, task.id)
    ]);
    expect(completions.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(completions.filter((result) => result.status === 'rejected')).toHaveLength(1);

    const events = await service.events(fixture.accountA, task.id);
    expect(events.map((event) => event.eventType)).toEqual([
      'created',
      'acknowledged',
      'completed'
    ]);
    await expect(
      pool.query('UPDATE clinical_workflow_task_events SET payload = $1 WHERE task_id = $2', [
        JSON.stringify({ tampered: true }),
        task.id
      ])
    ).rejects.toThrow(/append-only/i);
    await expect(
      pool.query('DELETE FROM clinical_workflow_task_events WHERE task_id = $1', [task.id])
    ).rejects.toThrow(/append-only/i);
  });

  it('does not allow a completed task to be replayed or a cancelled task to complete', async () => {
    const repository = new DatabaseWorkflowTaskRepository(pool);
    const { service } = serviceWithClock(repository);
    const completed = await createTask(
      service,
      fixture.accountA,
      fixture.userA,
      'postgres-completed-guard',
      {
        executionMode: 'manual'
      }
    );
    await service.complete(fixture.accountA, fixture.userA, completed.id);
    await expect(service.replay(fixture.accountA, fixture.userA, completed.id)).rejects.toThrow(
      /dead-lettered/i
    );

    const cancelled = await createTask(
      service,
      fixture.accountA,
      fixture.userA,
      'postgres-cancelled-guard',
      {
        executionMode: 'manual'
      }
    );
    await service.cancel(fixture.accountA, fixture.userA, cancelled.id, 'clinical path closed');
    await expect(service.complete(fixture.accountA, fixture.userA, cancelled.id)).rejects.toThrow(
      /cancelled/i
    );
  });
});
