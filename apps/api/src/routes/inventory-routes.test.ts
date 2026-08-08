import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuditService } from '@cvg-his-v2/module-audit';
import { InventoryService, ProcurementService } from '@cvg-his-v2/module-inventory';
import type { AccountId, AuthenticatedPrincipal, UserId } from '@cvg-his-v2/shared-types';

import { handleInventoryRoutes } from './inventory-routes.js';

const ACCOUNT = 'acc_cvg_demo' as AccountId;
const USER = 'user_inventory_route' as UserId;

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(chunk?: string | Buffer | (() => void), encoding?: BufferEncoding | (() => void), callback?: () => void): this {
    const finalCallback = typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;
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

function request(method: string, body?: unknown, url?: string): never {
  return {
    method,
    url: url ?? '/inventory/adjustments',
    [Symbol.asyncIterator]: async function* () {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function principal(): AuthenticatedPrincipal {
  return {
    user: {
      id: USER,
      accountId: ACCOUNT,
      username: 'inventory-user',
      email: 'inventory@example.com',
      displayName: 'Inventory User',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-inventory' as never,
      userId: USER,
      accountId: ACCOUNT,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['inventory.read', 'inventory.manage'],
      capabilities: []
    }
  };
}

function handlers(inventory = new InventoryService({ getOrThrow() { throw new Error('not used'); } } as never)) {
  return {
    inventory,
    procurement: new ProcurementService(inventory),
    audit: { write() {} } as unknown as AuditService,
    requirePrincipal: () => principal(),
    enforceAbac() {}
  };
}

test('handleInventoryRoutes creates stock adjustments and lists stock movements', async () => {
  const routeHandlers = handlers();

  const adjustmentResponse = new MockResponse();
  await handleInventoryRoutes(
    '/inventory/adjustments',
    request('POST', {
      inventoryItemId: 'inv_dipyrone',
      quantityDelta: 4,
      reason: 'Inventario rotativo',
      reference: 'INV-2026-001'
    }),
    adjustmentResponse as never,
    'corr-inventory-adjustment',
    routeHandlers
  );

  assert.equal(adjustmentResponse.statusCode, 201);
  const movement = adjustmentResponse.bodyJson<{ id: string; quantityDelta: number; balanceAfter: number }>();
  assert.equal(movement.quantityDelta, 4);
  assert.equal(movement.balanceAfter, 28);

  const movementsResponse = new MockResponse();
  await handleInventoryRoutes(
    '/inventory/movements',
    request('GET', undefined, '/inventory/movements?inventoryItemId=inv_dipyrone'),
    movementsResponse as never,
    'corr-inventory-movements',
    routeHandlers
  );

  assert.equal(movementsResponse.statusCode, 200);
  assert.equal(movementsResponse.bodyJson<{ items: unknown[] }>().items.length, 1);
});

test('handleInventoryRoutes exposes reservation, consumption, return and release lifecycle', async () => {
  const routeHandlers = handlers();

  const reserveResponse = new MockResponse();
  await handleInventoryRoutes(
    '/inventory/reservations',
    request('POST', {
      inventoryItemId: 'inv_dipyrone',
      quantity: 2,
      sourceEntityType: 'encounter',
      sourceEntityId: 'encounter_route_1',
      reference: 'RES-ROUTE-01'
    }),
    reserveResponse as never,
    'corr-inventory-reserve',
    routeHandlers
  );
  assert.equal(reserveResponse.statusCode, 201);
  const reserved = reserveResponse.bodyJson<{ items: Array<{ id: string; status: string }> }>().items;
  assert.equal(reserved.length, 1);
  assert.equal(reserved[0].status, 'reserved');

  const consumeResponse = new MockResponse();
  await handleInventoryRoutes(
    `/inventory/reservations/${reserved[0].id}/consume`,
    request('POST'),
    consumeResponse as never,
    'corr-inventory-consume-reservation',
    routeHandlers
  );
  assert.equal(consumeResponse.statusCode, 200);
  assert.equal(consumeResponse.bodyJson<{ status: string }>().status, 'consumed');

  const returnResponse = new MockResponse();
  await handleInventoryRoutes(
    `/inventory/reservations/${reserved[0].id}/return`,
    request('POST'),
    returnResponse as never,
    'corr-inventory-return-reservation',
    routeHandlers
  );
  assert.equal(returnResponse.statusCode, 200);
  assert.equal(returnResponse.bodyJson<{ status: string }>().status, 'returned');

  const secondReserveResponse = new MockResponse();
  await handleInventoryRoutes(
    '/inventory/reservations',
    request('POST', {
      inventoryItemId: 'inv_dipyrone',
      quantity: 1,
      sourceEntityType: 'other'
    }),
    secondReserveResponse as never,
    'corr-inventory-reserve-release',
    routeHandlers
  );
  const second = secondReserveResponse.bodyJson<{ items: Array<{ id: string }> }>().items[0];
  const releaseResponse = new MockResponse();
  await handleInventoryRoutes(
    `/inventory/reservations/${second.id}/release`,
    request('POST'),
    releaseResponse as never,
    'corr-inventory-release-reservation',
    routeHandlers
  );
  assert.equal(releaseResponse.statusCode, 200);
  assert.equal(releaseResponse.bodyJson<{ status: string }>().status, 'released');
});

test('handleInventoryRoutes closes the purchase and transfer workflow', async () => {
  const routeHandlers = handlers();

  const purchaseResponse = new MockResponse();
  await handleInventoryRoutes(
    '/inventory/purchases',
    request('POST', {
      supplierName: 'Fornecedor Vet Farma',
      invoiceNumber: 'NF-2026-0099',
      lines: [
        {
          inventoryItemId: 'inv_dipyrone',
          quantity: 5,
          unitCostAmount: 3.5,
          lotNumber: 'LOTE-ROTA-01',
          expiryDate: '2027-12-31T00:00:00.000Z',
          location: 'central'
        }
      ]
    }),
    purchaseResponse as never,
    'corr-purchase-create',
    routeHandlers
  );
  assert.equal(purchaseResponse.statusCode, 201);
  const purchase = purchaseResponse.bodyJson<{ id: string; lines: readonly [{ id: string }] }>();

  const approveResponse = new MockResponse();
  await handleInventoryRoutes(
    `/inventory/purchases/${purchase.id}/approve`,
    request('POST'),
    approveResponse as never,
    'corr-purchase-approve',
    routeHandlers
  );
  assert.equal(approveResponse.statusCode, 200);

  const receiveResponse = new MockResponse();
  await handleInventoryRoutes(
    `/inventory/purchases/${purchase.id}/receive`,
    request('POST', { lines: [{ lineId: purchase.lines[0].id, quantity: 5 }] }),
    receiveResponse as never,
    'corr-purchase-receive',
    routeHandlers
  );
  assert.equal(receiveResponse.statusCode, 200);
  assert.equal(receiveResponse.bodyJson<{ status: string; receivedAmount: number }>().status, 'received');

  const transferResponse = new MockResponse();
  await handleInventoryRoutes(
    '/inventory/transfers',
    request('POST', {
      inventoryItemId: 'inv_dipyrone',
      quantity: 2,
      fromLocation: 'central',
      toLocation: 'ward-a',
      reference: 'TR-2026-0001'
    }),
    transferResponse as never,
    'corr-inventory-transfer',
    routeHandlers
  );
  assert.equal(transferResponse.statusCode, 201);
  assert.equal(transferResponse.bodyJson<{ status: string }>().status, 'completed');
});
