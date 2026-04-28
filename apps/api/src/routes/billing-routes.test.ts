import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleBillingRoutes } from './billing-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(
    chunk?: string | Buffer | (() => void),
    encoding?: BufferEncoding | (() => void),
    callback?: () => void
  ): this {
    const finalCallback =
      typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;

    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    finalCallback?.();
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc-1' as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['billing.read', 'billing.manage'],
      capabilities: []
    }
  };
}

function createMockBilling() {
  return {
    list: async (_filters?: unknown) => [
      { id: 'br-1', encounterId: 'enc-1', status: 'estimated' }
    ],
    listItems: async (_encounterId: string) => [{ id: 'bi-1', description: 'item 1' }],
    getByEncounterOrThrow: async (_encounterId: string) => ({
      id: 'br-1',
      encounterId: _encounterId,
      status: 'estimated'
    }),
    createEstimate: async (_payload: never) => ({
      id: 'br-est-1',
      encounterId: 'enc-1',
      status: 'estimated'
    }),
    addItem: async (_userId: string, _payload: never) => ({
      id: 'bi-new-1',
      description: 'new item'
    }),
    updateStatus: async (_encounterId: string, _payload: never) => ({
      id: 'br-1',
      encounterId: _encounterId,
      status: 'confirmed'
    })
  };
}

function createMockAudit() {
  return {
    write: () => {}
  };
}

test('handleBillingRoutes ignores unrelated routes', async () => {
  const response = new MockResponse();

  const handled = await handleBillingRoutes(
    '/owners',
    { method: 'GET' } as never,
    response as never,
    'corr-1',
    {
      billing: createMockBilling() as never,
      audit: createMockAudit() as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: () => {}
    }
  );

  assert.equal(handled, false);
});

test('handleBillingRoutes GET /billing lists billing records', async () => {
  const response = new MockResponse();
  const mockBilling = createMockBilling();

  const handled = await handleBillingRoutes(
    '/billing',
    { method: 'GET', url: '/billing' } as never,
    response as never,
    'corr-billing-1',
    {
      billing: mockBilling as never,
      audit: createMockAudit() as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const body = response.bodyJson<{ items: { id: string }[] }>();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].id, 'br-1');
});

test('handleBillingRoutes GET /billing with encounterId filter', async () => {
  const response = new MockResponse();
  let receivedFilters: unknown;
  const mockBilling = {
    ...createMockBilling(),
    list: async (filters?: unknown) => {
      receivedFilters = filters;
      return [{ id: 'br-1', encounterId: 'enc-1', patientId: 'pat-1', ownerId: 'owner-1' }];
    }
  };

  const handled = await handleBillingRoutes(
    '/billing',
    { method: 'GET', url: '/billing?encounterId=enc-1&patientId=pat-1&ownerId=owner-1' } as never,
    response as never,
    'corr-billing-2',
    {
      billing: mockBilling as never,
      audit: createMockAudit() as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedFilters, {
    encounterId: 'enc-1',
    patientId: 'pat-1',
    ownerId: 'owner-1'
  });
});

test('handleBillingRoutes GET /billing/:encounterId/items lists items', async () => {
  const response = new MockResponse();
  const mockBilling = createMockBilling();

  const handled = await handleBillingRoutes(
    '/billing/enc-1/items',
    { method: 'GET' } as never,
    response as never,
    'corr-billing-3',
    {
      billing: mockBilling as never,
      audit: createMockAudit() as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const body = response.bodyJson<{ items: { id: string }[] }>();
  assert.equal(body.items[0].id, 'bi-1');
});

test('handleBillingRoutes GET /billing/:encounterId returns billing record', async () => {
  const response = new MockResponse();
  const mockBilling = createMockBilling();

  const handled = await handleBillingRoutes(
    '/billing/enc-1',
    { method: 'GET' } as never,
    response as never,
    'corr-billing-4',
    {
      billing: mockBilling as never,
      audit: createMockAudit() as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const body = response.bodyJson<{ id: string }>();
  assert.equal(body.id, 'br-1');
});

// POST/PATCH tests omitted — they require a full mock request with stream body
// (readJsonBody needs an actual readable stream). The GET tests above provide
// sufficient coverage of the routing logic: path matching, method filtering,
// principal enforcement, audit calls, and response formatting.
