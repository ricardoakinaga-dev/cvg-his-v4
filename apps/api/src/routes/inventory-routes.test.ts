import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuditService } from '@cvg-his-v2/module-audit';
import { InventoryService } from '@cvg-his-v2/module-inventory';
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
