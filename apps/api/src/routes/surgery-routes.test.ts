import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';

import { handleSurgeryRoutes } from './surgery-routes.js';

test('POST /surgeries forwards the authenticated account to the service boundary', async () => {
  const calls: Array<readonly unknown[]> = [];
  let responseBody = '';
  const payload = {
    encounterId: 'encounter-1',
    patientId: 'patient-1',
    procedureName: 'Ovariohisterectomia'
  };
  const surgeryCase = {
    id: 'surgery-1',
    accountId: 'account-1',
    encounterId: 'encounter-1',
    patientId: 'patient-1',
    procedureName: payload.procedureName,
    status: 'requested'
  };
  const response = {
    statusCode: 0,
    end(body?: string) {
      responseBody = body ?? '';
    }
  };
  const request = Object.assign(Readable.from([JSON.stringify(payload)]), {
    method: 'POST',
    url: '/surgeries'
  });

  const handled = await handleSurgeryRoutes(
    '/surgeries',
    request as never,
    response as never,
    'corr-surgery-tenant-boundary',
    {
      surgery: {
        requestCase: (...args: unknown[]) => {
          calls.push(args);
          return surgeryCase;
        },
        waitForPersistence: async () => undefined
      } as never,
      encounters: {
        getOrThrow: () => ({
          id: 'encounter-1',
          accountId: 'account-1',
          patientId: 'patient-1'
        })
      } as never,
      audit: { write: () => undefined } as never,
      requirePrincipal: () =>
        ({
          user: { id: 'user-1', accountId: 'account-1' }
        }) as never
    }
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, [['account-1', payload]]);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(JSON.parse(responseBody), surgeryCase);
});
