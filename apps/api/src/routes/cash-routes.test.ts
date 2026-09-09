import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { CashService } from '@cvg-his-v2/module-cash';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleCashRoutes } from './cash-routes.js';
import type { TenantCommandInput } from '../helpers/tenant-command.js';

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

function jsonRequest(body: unknown, idempotencyKey?: string): never {
  return {
    method: 'POST',
    headers: idempotencyKey === undefined ? {} : { 'idempotency-key': idempotencyKey },
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(body));
    }
  } as never;
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

test('handleCashRoutes records deposit and exposes reconciliation', async () => {
  const cash = new CashService();
  const handlers = {
    cash,
    audit: createAudit() as never,
    requirePrincipal: () => createPrincipal()
  };
  await handleCashRoutes(
    '/cash-register/open',
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ openingAmount: 100 }));
      }
    } as never,
    new MockResponse() as never,
    'corr-cash-deposit-open',
    handlers
  );
  const depositResponse = new MockResponse();
  await handleCashRoutes(
    '/cash-register/movements',
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ movementType: 'deposit', amount: 25, reference: 'DEP-01' }));
      }
    } as never,
    depositResponse as never,
    'corr-cash-deposit',
    handlers
  );
  assert.equal(depositResponse.statusCode, 201);
  assert.equal(depositResponse.bodyJson<{ movementType: string; runningBalance: number }>().movementType, 'deposit');
  assert.equal(depositResponse.bodyJson<{ runningBalance: number }>().runningBalance, 75);

  const reconciliationResponse = new MockResponse();
  await handleCashRoutes(
    '/cash-register/reconciliation',
    { method: 'GET', url: '/cash-register/reconciliation' } as never,
    reconciliationResponse as never,
    'corr-cash-reconciliation',
    handlers
  );
  const reconciliation = reconciliationResponse.bodyJson<{ expectedAmount: number; totalOut: number }>();
  assert.equal(reconciliation.expectedAmount, 75);
  assert.equal(reconciliation.totalOut, 25);
});

test('cash mutations forward stable idempotency and tenant-command envelopes', async () => {
  const cash = new CashService();
  const runnerCalls: Array<{
    operation: string;
    idempotencyKey: string | undefined;
    payload: unknown;
  }> = [];
  const handlers = {
    cash,
    audit: createAudit() as never,
    requirePrincipal: () => createPrincipal(),
    runCommand: async <T>(input: TenantCommandInput<T>): Promise<T> => {
      runnerCalls.push({
        operation: input.operation,
        idempotencyKey: input.idempotencyKey,
        payload: input.payload
      });
      return input.command();
    }
  };

  const openResponse = new MockResponse();
  await handleCashRoutes(
    '/cash-register/open',
    jsonRequest({ openingAmount: 100, notes: 'Abertura' }, '  cash-open-1  '),
    openResponse as never,
    'corr-cash-command-open',
    handlers
  );

  const movementResponse = new MockResponse();
  await handleCashRoutes(
    '/cash-register/movements',
    jsonRequest({ movementType: 'supply', amount: 20, reference: 'REF-1' }, 'cash-movement-1'),
    movementResponse as never,
    'corr-cash-command-movement',
    handlers
  );

  const closeResponse = new MockResponse();
  await handleCashRoutes(
    '/cash-register/close',
    jsonRequest({ closingAmount: 120, notes: 'Conferido' }, 'cash-close-1'),
    closeResponse as never,
    'corr-cash-command-close',
    handlers
  );

  assert.deepEqual(runnerCalls[0], {
    operation: 'cash.register.open',
    idempotencyKey: 'cash-open-1',
    payload: { openingAmount: 100, notes: 'Abertura' }
  });
  assert.deepEqual(runnerCalls[1], {
    operation: 'cash.movement.create',
    idempotencyKey: 'cash-movement-1',
    payload: {
      movementType: 'supply',
      amount: 20,
      reference: 'REF-1'
    }
  });
  assert.deepEqual(runnerCalls[2], {
    operation: 'cash.register.close',
    idempotencyKey: 'cash-close-1',
    payload: {
      closingAmount: 120,
      notes: 'Conferido'
    }
  });
  assert.equal(runnerCalls.length, 3);
  assert.equal(openResponse.statusCode, 201);
  assert.equal(movementResponse.statusCode, 201);
  assert.equal(closeResponse.statusCode, 200);
});

test('cash route keeps direct test compatibility when no tenant runner is injected', async () => {
  const cash = new CashService();
  const handlers = {
    cash,
    audit: createAudit() as never,
    requirePrincipal: () => createPrincipal()
  };

  const response = new MockResponse();
  await handleCashRoutes(
    '/cash-register/open',
    jsonRequest({ openingAmount: 50 }),
    response as never,
    'corr-cash-direct-compatible',
    handlers
  );

  assert.equal(response.statusCode, 201);
});

test('cash close can replay after the first command has already closed the register', async () => {
  const cash = new CashService();
  const commandResults = new Map<string, unknown>();
  const handlers = {
    cash,
    audit: createAudit() as never,
    requirePrincipal: () => createPrincipal(),
    runCommand: async <T>(input: TenantCommandInput<T>): Promise<T> => {
      const cacheKey = `${input.operation}:${input.idempotencyKey}`;
      if (commandResults.has(cacheKey)) return commandResults.get(cacheKey) as T;
      const result = await input.command();
      commandResults.set(cacheKey, result);
      return result;
    }
  };

  await handleCashRoutes(
    '/cash-register/open',
    jsonRequest({ openingAmount: 100 }, 'cash-replay-open'),
    new MockResponse() as never,
    'corr-cash-replay-open',
    handlers
  );

  const firstClose = new MockResponse();
  await handleCashRoutes(
    '/cash-register/close',
    jsonRequest({ closingAmount: 100 }, 'cash-replay-close'),
    firstClose as never,
    'corr-cash-replay-close-first',
    handlers
  );
  const secondClose = new MockResponse();
  await handleCashRoutes(
    '/cash-register/close',
    jsonRequest({ closingAmount: 100 }, 'cash-replay-close'),
    secondClose as never,
    'corr-cash-replay-close-second',
    handlers
  );

  assert.equal(firstClose.statusCode, 200);
  assert.equal(secondClose.statusCode, 200);
  assert.deepEqual(secondClose.bodyJson(), firstClose.bodyJson());
});
