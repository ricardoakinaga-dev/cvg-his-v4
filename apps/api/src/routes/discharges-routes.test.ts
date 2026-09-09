import assert from 'node:assert/strict';
import test from 'node:test';

import { WorkflowTaskService } from '@cvg-his-v2/module-workflows';

import { handleDischargesRoutes } from './discharges-routes.js';

test('GET /discharges requires its dedicated read permission', async () => {
  let requestedPermission = '';
  let responseBody = '';
  const response = {
    statusCode: 0,
    end(body?: string) {
      responseBody = body ?? '';
    }
  };
  const principal = {
    user: { id: 'user-1', accountId: 'account-1' }
  };

  const handled = await handleDischargesRoutes(
    '/discharges',
    { method: 'GET', url: '/discharges' } as never,
    response as never,
    'corr-discharges-rbac',
    {
      discharges: {
        refreshAccount: async () => undefined,
        list: () => []
      } as never,
      encounters: {} as never,
      inpatient: {} as never,
      audit: { write: () => undefined } as never,
      requirePrincipal: (_request, permissionCode) => {
        requestedPermission = permissionCode;
        return principal as never;
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(requestedPermission, 'discharges.read');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(responseBody), { items: [], total: 0 });
});

test('PATCH /discharges forwards the authenticated account to detail and update', async () => {
  const calls: Array<readonly unknown[]> = [];
  let responseBody = '';
  const current = {
    id: 'discharge-1',
    accountId: 'account-1',
    encounterId: 'encounter-1',
    dischargeType: 'ambulatory',
    dischargedBy: 'user-1',
    dischargedAt: '2026-08-26T12:00:00.000Z',
    version: 1,
    createdAt: '2026-08-26T12:00:00.000Z',
    updatedAt: '2026-08-26T12:00:00.000Z'
  };
  const response = {
    statusCode: 0,
    end(body?: string) {
      responseBody = body ?? '';
    }
  };

  const handled = await handleDischargesRoutes(
    '/discharges/discharge-1',
    {
      method: 'PATCH',
      url: '/discharges/discharge-1',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ outcome: 'Updated' }));
      }
    } as never,
    response as never,
    'corr-discharges-tenant',
    {
      discharges: {
        refreshAccount: async (accountId: string) => {
          calls.push(['refreshAccount', accountId]);
        },
        getById: (accountId: string, dischargeId: string) => {
          calls.push(['getById', accountId, dischargeId]);
          return current;
        },
        update: (
          accountId: string,
          dischargeId: string,
          payload: Record<string, unknown>,
          expectedVersion?: number
        ) => {
          calls.push(['update', accountId, dischargeId, payload, expectedVersion]);
          return { ...current, outcome: 'Updated' };
        },
        waitForPersistence: async () => undefined
      } as never,
      encounters: {} as never,
      inpatient: {} as never,
      audit: { write: () => undefined } as never,
      requirePrincipal: () => ({ user: { id: 'user-1', accountId: 'account-1' } }) as never
    }
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, [
    ['refreshAccount', 'account-1'],
    ['getById', 'account-1', 'discharge-1'],
    ['update', 'account-1', 'discharge-1', { outcome: 'Updated' }, undefined]
  ]);
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(responseBody).outcome, 'Updated');
});

test('POST /discharges creates one durable manual follow-up task with tenant context', async () => {
  const workflowTasks = new WorkflowTaskService({
    now: () => '2026-09-09T12:00:00.000Z'
  });
  let responseBody = '';
  const response = {
    statusCode: 0,
    end(body?: string) {
      responseBody = body ?? '';
    }
  };
  const discharge = {
    id: 'discharge-1',
    accountId: 'account-1',
    encounterId: 'encounter-1',
    dischargeType: 'ambulatory',
    followUpDate: '2026-09-12',
    dischargedBy: 'user-1',
    dischargedAt: '2026-09-09T12:00:00.000Z',
    version: 1,
    createdAt: '2026-09-09T12:00:00.000Z',
    updatedAt: '2026-09-09T12:00:00.000Z'
  };
  const payload = {
    encounterId: 'encounter-1',
    dischargeType: 'ambulatory',
    followUpDate: '2026-09-12'
  };

  const handled = await handleDischargesRoutes(
    '/discharges',
    {
      method: 'POST',
      url: '/discharges',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify(payload));
      }
    } as never,
    response as never,
    'corr-discharge-follow-up',
    {
      discharges: {
        create: () => discharge,
        waitForPersistence: async () => undefined,
        removeFromCache: () => undefined
      } as never,
      encounters: {
        getOrThrow: () => ({
          id: 'encounter-1',
          accountId: 'account-1',
          patientId: 'patient-1'
        })
      } as never,
      inpatient: {
        list: () => [],
        waitForPersistence: async () => undefined
      } as never,
      audit: {
        write: () => ({ eventId: 'audit-1' }),
        waitForPersistence: async () => undefined
      } as never,
      workflowTasks,
      requirePrincipal: () => ({ user: { id: 'user-1', accountId: 'account-1' } }) as never
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  assert.equal(JSON.parse(responseBody).id, 'discharge-1');
  const [task] = await workflowTasks.list('account-1' as never);
  assert.equal(task?.taskType, 'clinical.follow_up');
  assert.equal(task?.executionMode, 'manual');
  assert.equal(task?.dueAt, '2026-09-12T09:00:00.000Z');
  assert.deepEqual(task?.metadata, {
    sourceModule: 'discharges',
    sourceEntityType: 'discharge',
    sourceEntityId: 'discharge-1'
  });
});

test('PATCH /discharges keeps the follow-up task synchronized when edited, cleared and re-added', async () => {
  const workflowTasks = new WorkflowTaskService({
    now: () => '2026-09-09T12:00:00.000Z'
  });
  await workflowTasks.create(
    'account-1' as never,
    'user-1' as never,
    {
      taskType: 'clinical.follow_up',
      title: 'Retorno clínico registrado na alta',
      executionMode: 'manual',
      priority: 'high',
      dueAt: '2026-09-12T09:00:00.000Z',
      idempotencyKey: 'discharge-follow-up:discharge-1',
      correlationId: 'corr-original' as never
    }
  );

  const initial = {
    id: 'discharge-1',
    accountId: 'account-1',
    encounterId: 'encounter-1',
    dischargeType: 'ambulatory',
    followUpDate: '2026-09-12',
    dischargedBy: 'user-1',
    dischargedAt: '2026-09-09T12:00:00.000Z',
    version: 1,
    createdAt: '2026-09-09T12:00:00.000Z',
    updatedAt: '2026-09-09T12:00:00.000Z'
  };
  let current = initial;

  async function patchDischarge(followUpDate: string): Promise<void> {
    const response = {
      statusCode: 0,
      end() {}
    };
    await handleDischargesRoutes(
      '/discharges/discharge-1',
      {
        method: 'PATCH',
        url: '/discharges/discharge-1',
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(JSON.stringify({ followUpDate }));
        }
      } as never,
      response as never,
      `corr-patch-${followUpDate || 'clear'}`,
      {
        discharges: {
          refreshAccount: async () => undefined,
          getById: () => current,
          update: (_accountId: string, _dischargeId: string, payload: Record<string, unknown>) => {
            current = { ...current, ...payload, version: current.version + 1 };
            return current;
          },
          waitForPersistence: async () => undefined
        } as never,
        encounters: {
          getOrThrow: () => ({ id: 'encounter-1', patientId: 'patient-1', accountId: 'account-1' })
        } as never,
        inpatient: {} as never,
        audit: { write: () => undefined } as never,
        workflowTasks,
        requirePrincipal: () => ({ user: { id: 'user-1', accountId: 'account-1' } }) as never
      }
    );
  }

  await patchDischarge('2026-09-14');
  let task = (await workflowTasks.list('account-1' as never))[0]!;
  assert.equal(task.dueAt, '2026-09-14T09:00:00.000Z');
  assert.equal((await workflowTasks.events('account-1' as never, task.id)).at(-1)?.eventType, 'rescheduled');

  await patchDischarge('');
  task = (await workflowTasks.list('account-1' as never))[0]!;
  assert.equal(task.status, 'cancelled');

  await patchDischarge('2026-09-16');
  task = (await workflowTasks.list('account-1' as never))[0]!;
  assert.equal(task.status, 'pending');
  assert.equal(task.dueAt, '2026-09-16T09:00:00.000Z');
});
