import assert from 'node:assert/strict';
import test from 'node:test';

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
