import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { CashService } from '@cvg-his-v2/module-cash';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleCashRoutes } from './cash-routes.js';

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

  setHeader(): this {
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(): AuthenticatedPrincipal {
  const now = new Date().toISOString();
  return {
    user: {
      id: 'user-finance' as never,
      accountId: 'acc-1' as never,
      username: 'finance',
      email: 'finance@example.com',
      displayName: 'Financeiro',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    session: {
      sessionId: 'session-finance' as never,
      userId: 'user-finance' as never,
      accountId: 'acc-1' as never,
      createdAt: now,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: now,
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['finance'],
      permissionCodes: ['billing.read', 'billing.manage'],
      capabilities: []
    }
  };
}

function createAudit() {
  return {
    write: () => {}
  };
}

test('handleCashRoutes exposes Vetus-like drawer dashboard and controlled write flow', async () => {
  const cash = new CashService();
  const handlers = {
    cash,
    audit: createAudit() as never,
    requirePrincipal: () => createPrincipal()
  };

  const openResponse = new MockResponse();
  const opened = await handleCashRoutes(
    '/cash-register/open',
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ openingAmount: 120, notes: 'Abertura do dia' }));
      }
    } as never,
    openResponse as never,
    'corr-cash-open',
    handlers
  );

  assert.equal(opened, true);
  assert.equal(openResponse.statusCode, 201);

  const movementResponse = new MockResponse();
  const movementHandled = await handleCashRoutes(
    '/cash-register/movements',
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            movementType: 'supply',
            amount: 80,
            reference: 'reforco',
            notes: 'Entrada de gaveta em dinheiro'
          })
        );
      }
    } as never,
    movementResponse as never,
    'corr-cash-movement',
    handlers
  );

  assert.equal(movementHandled, true);
  assert.equal(movementResponse.statusCode, 201);

  const dashboardResponse = new MockResponse();
  const dashboardHandled = await handleCashRoutes(
    '/cash-register/dashboard',
    {
      method: 'GET',
      url: '/cash-register/dashboard'
    } as never,
    dashboardResponse as never,
    'corr-cash-dashboard',
    handlers
  );

  assert.equal(dashboardHandled, true);
  assert.equal(dashboardResponse.statusCode, 200);

  const payload = dashboardResponse.bodyJson<{
    totals: { totalEntradas: number; totalSaidas: number; totalEmGaveta: number };
    openRegister: { id: string; openingAmount: number } | null;
    movements: Array<{ movementType: string; amount: number }>;
    byPaymentMethod: Array<{ method: string; amount: number }>;
  }>();
  assert.equal(payload.openRegister?.openingAmount, 120);
  assert.equal(payload.totals.totalEntradas, 200);
  assert.equal(payload.totals.totalSaidas, 0);
  assert.equal(payload.totals.totalEmGaveta, 200);
  assert.equal(payload.movements.length, 2);
  assert.equal(payload.byPaymentMethod[0]?.method, 'Dinheiro');
});
