import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { Readable, Writable } from 'node:stream';
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
    findByEncounter: async (_encounterId: string) => ({
      id: 'br-1',
      encounterId: _encounterId,
      status: 'estimated'
    }),
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

function createJsonRequest(method: string, url: string, body: unknown): IncomingMessage {
  const request = Readable.from([JSON.stringify(body)]) as IncomingMessage;
  request.method = method;
  request.url = url;
  return request;
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
    accountId: 'acc-1',
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

test('handleBillingRoutes GET /billing/:encounterId does not create missing records', async () => {
  const response = new MockResponse();
  let created = false;
  const mockBilling = {
    ...createMockBilling(),
    findByEncounter: async () => null,
    createEstimate: async () => {
      created = true;
      return { id: 'br-created' };
    }
  };

  const handled = await handleBillingRoutes(
    '/billing/enc-missing',
    { method: 'GET' } as never,
    response as never,
    'corr-billing-5',
    {
      billing: mockBilling as never,
      audit: createMockAudit() as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 404);
  assert.equal(created, false);
  const body = response.bodyJson<{ code: string }>();
  assert.equal(body.code, 'BILLING_RECORD_NOT_FOUND');
});

test('handleBillingRoutes POST /billing/estimate creates estimate explicitly', async () => {
  const response = new MockResponse();
  let receivedPayload: unknown;
  const mockBilling = {
    ...createMockBilling(),
    createEstimate: async (payload: never) => {
      receivedPayload = payload;
      return { id: 'br-est-1', encounterId: 'enc-1', status: 'estimated' };
    }
  };

  const handled = await handleBillingRoutes(
    '/billing/estimate',
    createJsonRequest('POST', '/billing/estimate', {
      encounterId: 'enc-1',
      administrativeNotes: 'Estimativa'
    }) as never,
    response as never,
    'corr-billing-6',
    {
      billing: mockBilling as never,
      audit: createMockAudit() as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedPayload, {
    encounterId: 'enc-1',
    administrativeNotes: 'Estimativa'
  });
});

test('handleBillingRoutes POST /billing/items creates item explicitly', async () => {
  const response = new MockResponse();
  let receivedPayload: unknown;
  const mockBilling = {
    ...createMockBilling(),
    addItem: async (userId: string, payload: never) => {
      assert.equal(userId, 'user-1');
      receivedPayload = payload;
      return { id: 'bi-new-1', totalAmount: 120 };
    }
  };

  const handled = await handleBillingRoutes(
    '/billing/items',
    createJsonRequest('POST', '/billing/items', {
      encounterId: 'enc-1',
      itemType: 'service',
      description: 'Consulta',
      quantity: 1,
      unitPriceAmount: 120
    }) as never,
    response as never,
    'corr-billing-7',
    {
      billing: mockBilling as never,
      audit: createMockAudit() as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(receivedPayload, {
    encounterId: 'enc-1',
    itemType: 'service',
    description: 'Consulta',
    quantity: 1,
    unitPriceAmount: 120
  });
});

test('handleBillingRoutes PATCH /billing/:encounterId/status updates status explicitly', async () => {
  const response = new MockResponse();
  let receivedPayload: unknown;
  const mockBilling = {
    ...createMockBilling(),
    updateStatus: async (encounterId: string, payload: never) => {
      assert.equal(encounterId, 'enc-1');
      receivedPayload = payload;
      return { id: 'br-1', encounterId, status: 'open' };
    }
  };

  const handled = await handleBillingRoutes(
    '/billing/enc-1/status',
    createJsonRequest('PATCH', '/billing/enc-1/status', {
      status: 'open',
      administrativeNotes: 'Aberto para cobrança'
    }) as never,
    response as never,
    'corr-billing-8',
    {
      billing: mockBilling as never,
      audit: createMockAudit() as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedPayload, {
    status: 'open',
    administrativeNotes: 'Aberto para cobrança'
  });
});

test('handleBillingRoutes PATCH /billing/:encounterId/status does not create missing records', async () => {
  const response = new MockResponse();
  let updated = false;
  const mockBilling = {
    ...createMockBilling(),
    findByEncounter: async () => null,
    updateStatus: async () => {
      updated = true;
      return { id: 'br-created', status: 'open' };
    }
  };

  const handled = await handleBillingRoutes(
    '/billing/enc-missing/status',
    createJsonRequest('PATCH', '/billing/enc-missing/status', {
      status: 'open',
      administrativeNotes: 'Nao deve criar'
    }) as never,
    response as never,
    'corr-billing-9',
    {
      billing: mockBilling as never,
      audit: createMockAudit() as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 404);
  assert.equal(updated, false);
  const body = response.bodyJson<{ code: string }>();
  assert.equal(body.code, 'BILLING_RECORD_NOT_FOUND');
});
