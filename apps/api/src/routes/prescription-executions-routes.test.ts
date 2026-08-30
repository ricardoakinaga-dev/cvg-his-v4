import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';

import { ValidationError } from '@cvg-his-v2/shared-errors';

import { handlePrescriptionExecutionsRoutes } from './prescription-executions-routes.js';

function requestWithJsonBody(
  body: unknown,
  url = '/prescription-executions/pe_1/execute'
): unknown {
  return Object.assign(Readable.from([JSON.stringify(body)]), {
    method: 'POST',
    url
  });
}

test('GET /prescription-executions requires its dedicated read permission', async () => {
  let requestedPermission = '';
  let responseBody = '';
  const response = {
    statusCode: 0,
    end(body?: string) {
      responseBody = body ?? '';
    }
  };
  const principal = {
    user: { id: 'user-1', accountId: 'account-1' },
    access: { roleCodes: ['reception'], permissionCodes: [], capabilities: [] }
  };

  const handled = await handlePrescriptionExecutionsRoutes(
    '/prescription-executions',
    { method: 'GET', url: '/prescription-executions' } as never,
    response as never,
    'corr-prescription-executions-rbac',
    {
      prescriptionExecutions: {
        list: () => [],
        listByEncounter: () => [],
        listByPatient: () => []
      } as never,
      audit: { write: () => undefined } as never,
      requirePrincipal: (_request, permissionCode) => {
        requestedPermission = permissionCode;
        return principal as never;
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(requestedPermission, 'prescription-executions.read');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(responseBody), { items: [], total: 0 });
});

test('GET /prescription-executions rejects an empty filtered query', async () => {
  let listCalled = false;
  const response = {
    statusCode: 0,
    end() {
      listCalled = true;
    }
  };
  const principal = {
    user: { id: 'user-1', accountId: 'account-1' },
    access: { roleCodes: ['reception'], permissionCodes: [], capabilities: [] }
  };

  await assert.rejects(
    handlePrescriptionExecutionsRoutes(
      '/prescription-executions',
      { method: 'GET', url: '/prescription-executions?encounterId=' } as never,
      response as never,
      'corr-prescription-executions-empty-encounter',
      {
        prescriptionExecutions: {
          list: () => {
            listCalled = true;
            return [];
          },
          listByEncounter: () => [],
          listByPatient: () => []
        } as never,
        audit: { write: () => undefined } as never,
        requirePrincipal: () => principal as never
      }
    ),
    ValidationError
  );

  assert.equal(listCalled, false);
});

test('POST /prescription-executions/:id/execute validates status and forwards expectedVersion', async () => {
  let receivedAccountId: unknown;
  let receivedExecutionId: unknown;
  let receivedActorId: unknown;
  let receivedPayload: unknown;
  const response = {
    statusCode: 0,
    end() {}
  };
  const principal = {
    user: { id: 'user-1', accountId: 'account-1' },
    access: { roleCodes: ['doctor'], permissionCodes: [], capabilities: [] }
  };
  const execution = { id: 'pe_1', status: 'administered' };

  const handled = await handlePrescriptionExecutionsRoutes(
    '/prescription-executions/pe_1/execute',
    requestWithJsonBody({ status: 'administered', expectedVersion: 7 }) as never,
    response as never,
    'corr-prescription-executions-cas',
    {
      prescriptionExecutions: {
        getByIdForAccount: () => execution,
        execute: (accountId: unknown, executionId: unknown, actorId: unknown, payload: unknown) => {
          receivedAccountId = accountId;
          receivedExecutionId = executionId;
          receivedActorId = actorId;
          receivedPayload = payload;
          return execution;
        },
        waitForPersistence: async () => undefined
      } as never,
      audit: { write: () => undefined } as never,
      requirePrincipal: () => principal as never
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(receivedAccountId, 'account-1');
  assert.equal(receivedExecutionId, 'pe_1');
  assert.equal(receivedActorId, 'user-1');
  assert.deepEqual(receivedPayload, { status: 'administered', expectedVersion: 7 });

  await assert.rejects(
    handlePrescriptionExecutionsRoutes(
      '/prescription-executions/pe_1/execute',
      requestWithJsonBody({ status: 'given', expectedVersion: 7 }) as never,
      response as never,
      'corr-prescription-executions-invalid-status',
      {
        prescriptionExecutions: {
          getByIdForAccount: () => execution,
          execute: () => {
            throw new Error('execute must not receive an invalid status');
          }
        } as never,
        audit: { write: () => undefined } as never,
        requirePrincipal: () => principal as never
      }
    ),
    ValidationError
  );
});

test('GET /prescription-executions/:id forwards principal account to the event boundary', async () => {
  let receivedAccountId: unknown;
  let receivedExecutionId: unknown;
  let responseBody = '';
  const response = {
    statusCode: 0,
    end(body?: string) {
      responseBody = body ?? '';
    }
  };
  const principal = {
    user: { id: 'user-1', accountId: 'account-1' },
    access: { roleCodes: ['doctor'], permissionCodes: [], capabilities: [] }
  };
  const execution = { id: 'pe_1', accountId: 'account-1', status: 'pending' };
  const events = [{ id: 'ae_1', executionId: 'pe_1', eventType: 'created' }];

  const handled = await handlePrescriptionExecutionsRoutes(
    '/prescription-executions/pe_1',
    { method: 'GET', url: '/prescription-executions/pe_1' } as never,
    response as never,
    'corr-prescription-executions-detail-scope',
    {
      prescriptionExecutions: {
        getByIdForAccount: (accountId: unknown, executionId: unknown) => {
          assert.equal(accountId, 'account-1');
          assert.equal(executionId, 'pe_1');
          return execution;
        },
        getEvents: (accountId: unknown, executionId: unknown) => {
          receivedAccountId = accountId;
          receivedExecutionId = executionId;
          return events;
        }
      } as never,
      audit: { write: () => undefined } as never,
      requirePrincipal: () => principal as never
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(receivedAccountId, 'account-1');
  assert.equal(receivedExecutionId, 'pe_1');
  assert.deepEqual(JSON.parse(responseBody), { ...execution, events });
});

test('POST suspend, resume and log routes forward principal account to service boundaries', async () => {
  const calls: Array<readonly unknown[]> = [];
  const response = { statusCode: 0, end() {} };
  const principal = {
    user: { id: 'user-1', accountId: 'account-1' },
    access: { roleCodes: ['doctor'], permissionCodes: [], capabilities: [] }
  };
  const execution = { id: 'pe_1', accountId: 'account-1', status: 'pending' };
  const event = { id: 'ae_1', executionId: 'pe_1', eventType: 'vitals_check' };
  const handlers = {
    prescriptionExecutions: {
      getByIdForAccount: () => execution,
      suspend: (...args: unknown[]) => {
        calls.push(['suspend', ...args]);
        return execution;
      },
      resume: (...args: unknown[]) => {
        calls.push(['resume', ...args]);
        return execution;
      },
      logEvent: (...args: unknown[]) => {
        calls.push(['logEvent', ...args]);
        return event;
      },
      waitForPersistence: async () => undefined
    } as never,
    audit: { write: () => undefined } as never,
    requirePrincipal: () => principal as never
  };

  await handlePrescriptionExecutionsRoutes(
    '/prescription-executions/pe_1/suspend',
    requestWithJsonBody(
      { reason: 'Hold for observation' },
      '/prescription-executions/pe_1/suspend'
    ) as never,
    response as never,
    'corr-prescription-executions-suspend-scope',
    handlers
  );
  await handlePrescriptionExecutionsRoutes(
    '/prescription-executions/pe_1/resume',
    requestWithJsonBody({}, '/prescription-executions/pe_1/resume') as never,
    response as never,
    'corr-prescription-executions-resume-scope',
    handlers
  );
  await handlePrescriptionExecutionsRoutes(
    '/prescription-executions/pe_1/log',
    requestWithJsonBody(
      { eventType: 'vitals_check' },
      '/prescription-executions/pe_1/log'
    ) as never,
    response as never,
    'corr-prescription-executions-log-scope',
    handlers
  );

  assert.deepEqual(calls, [
    ['suspend', 'account-1', 'pe_1', 'user-1', { reason: 'Hold for observation' }],
    ['resume', 'account-1', 'pe_1', 'user-1', undefined],
    ['logEvent', 'account-1', 'pe_1', 'user-1', { eventType: 'vitals_check' }]
  ]);
});

test('POST /prescription-executions/:id/log validates the event boundary', async () => {
  const response = { statusCode: 0, end() {} };
  const principal = {
    user: { id: 'user-1', accountId: 'account-1' },
    access: { roleCodes: ['doctor'], permissionCodes: [], capabilities: [] }
  };

  await assert.rejects(
    handlePrescriptionExecutionsRoutes(
      '/prescription-executions/pe_1/log',
      requestWithJsonBody([], '/prescription-executions/pe-1/log') as never,
      response as never,
      'corr-prescription-executions-log-validation',
      {
        prescriptionExecutions: {
          getByIdForAccount: () => ({ id: 'pe_1' }),
          logEvent: () => {
            throw new Error('logEvent must not receive a non-object body');
          }
        } as never,
        audit: { write: () => undefined } as never,
        requirePrincipal: () => principal as never
      }
    ),
    ValidationError
  );
});

test('does not route action paths with extra segments', async () => {
  let principalCalled = false;
  const handled = await handlePrescriptionExecutionsRoutes(
    '/prescription-executions/pe_1/extra/execute',
    requestWithJsonBody(
      { status: 'administered' },
      '/prescription-executions/pe_1/extra/execute'
    ) as never,
    { statusCode: 0, end() {} } as never,
    'corr-prescription-executions-extra-segment',
    {
      prescriptionExecutions: {} as never,
      audit: { write: () => undefined } as never,
      requirePrincipal: () => {
        principalCalled = true;
        throw new Error('malformed action path must not authorize or dispatch');
      }
    }
  );

  assert.equal(handled, false);
  assert.equal(principalCalled, false);
});
