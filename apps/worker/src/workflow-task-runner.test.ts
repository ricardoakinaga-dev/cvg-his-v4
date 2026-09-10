import assert from 'node:assert/strict';
import test from 'node:test';

import { WorkflowTaskService } from '@cvg-his-v2/module-workflows';
import type { AccountId, CorrelationId, UserId } from '@cvg-his-v2/shared-types';

import { getWorkerMetricsText } from './worker-metrics.js';
import { runWorkflowTaskTick } from './workflow-task-runner.js';

const ACCOUNT = '11111111-1111-4111-8111-111111111111' as AccountId;
const USER = '22222222-2222-4222-8222-222222222222' as UserId;
const CORRELATION = 'worker-correlation' as CorrelationId;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function createTask(service: WorkflowTaskService, key: string, taskType = 'clinical.follow_up') {
  return service.create(ACCOUNT, USER, {
    taskType,
    title: 'Processar tarefa',
    dueAt: '2026-09-09T09:00:00.000Z',
    idempotencyKey: key,
    executionMode: 'worker',
    maxAttempts: 1
  });
}

test('worker runner claims and completes registered clinical task handlers', async () => {
  const service = new WorkflowTaskService({ now: () => '2026-09-09T10:00:00.000Z' });
  await createTask(service, 'runner-1');
  let handled = 0;
  const result = await runWorkflowTaskTick({
    service,
    accountId: ACCOUNT,
    workerId: 'worker-a',
    correlationId: CORRELATION,
    now: () => '2026-09-09T10:00:00.000Z',
    handlers: new Map([
      ['clinical.follow_up', async () => {
        handled += 1;
      }]
    ])
  });

  assert.deepEqual(result, {
    claimed: 1,
    completed: 1,
    retried: 0,
    deadLettered: 0,
    leaseLost: 0,
    handlerMissing: 0
  });
  assert.equal(handled, 1);
  assert.equal((await service.list(ACCOUNT))[0]?.status, 'completed');
});

test('worker runner fails closed for an unregistered task type and honors DLQ policy', async () => {
  const service = new WorkflowTaskService({ now: () => '2026-09-09T10:00:00.000Z' });
  await createTask(service, 'runner-unknown', 'clinical.unknown');
  const result = await runWorkflowTaskTick({
    service,
    accountId: ACCOUNT,
    workerId: 'worker-a',
    correlationId: CORRELATION,
    now: () => '2026-09-09T10:00:00.000Z'
  });

  assert.equal(result.handlerMissing, 1);
  assert.equal(result.deadLettered, 1);
  assert.equal((await service.list(ACCOUNT))[0]?.status, 'dlq');
  assert.match(await getWorkerMetricsText(), /^cvg_job_dead_letter_total [1-9]\d*$/m);
});

test('worker runner validates bounded lease and batch controls', async () => {
  const service = new WorkflowTaskService();
  await assert.rejects(
    () => runWorkflowTaskTick({
      service,
      accountId: ACCOUNT,
      workerId: 'worker-a',
      correlationId: CORRELATION,
      limit: 101
    }),
    /batch limit/
  );
  await assert.rejects(
    () => runWorkflowTaskTick({
      service,
      accountId: ACCOUNT,
      workerId: 'worker-a',
      correlationId: CORRELATION,
      leaseMs: 999
    }),
    /lease/
  );
});

test('worker runner renews a long-running lease before publishing completion', async () => {
  const service = new WorkflowTaskService({ now: () => '2026-09-09T10:00:00.000Z' });
  await createTask(service, 'runner-heartbeat');
  let heartbeatCount = 0;
  const originalRenewClaim = service.renewClaim.bind(service);
  service.renewClaim = async (claim, now, leaseMs) => {
    heartbeatCount += 1;
    return originalRenewClaim(claim, now, leaseMs);
  };

  const result = await runWorkflowTaskTick({
    service,
    accountId: ACCOUNT,
    workerId: 'worker-a',
    correlationId: CORRELATION,
    now: () => '2026-09-09T10:00:00.000Z',
    leaseMs: 1_000,
    handlers: new Map([
      ['clinical.follow_up', async () => {
        await sleep(400);
      }]
    ])
  });

  assert.equal(result.completed, 1);
  assert.equal(result.leaseLost, 0);
  assert.ok(heartbeatCount >= 1);
});
