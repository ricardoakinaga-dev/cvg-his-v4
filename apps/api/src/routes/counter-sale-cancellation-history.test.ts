import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { CounterSaleSummary, CounterSalesService } from '@cvg-his-v2/module-counter-sales';
import { CounterSalesService as CounterSalesServiceImplementation } from '@cvg-his-v2/module-counter-sales';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleCounterSalesRoutes } from './counter-sales-routes.js';

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

const sale = {
  id: 'sale-1',
  accountId: 'account-1',
  number: 'CS-000001',
  ownerId: null,
  patientId: null,
  encounterId: null,
  queueEntryId: null,
  billingRecordId: null,
  status: 'open',
  subtotal: 0,
  discountAmount: 0,
  total: 0,
  paidAmount: 0,
  balanceDue: 0,
  notes: null,
  openedByUserId: 'user-1',
  closedByUserId: null,
  closedAt: null,
  createdAt: '2026-08-29T12:00:00.000Z',
  updatedAt: '2026-08-29T12:00:00.000Z'
} as unknown as CounterSaleSummary;

function principal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'account-1' as never,
      username: 'operator',
      email: 'operator@example.test',
      displayName: 'Operator',
      status: 'active',
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'account-1' as never,
      createdAt: sale.createdAt,
      expiresAt: '2026-08-29T13:00:00.000Z',
      authTime: sale.createdAt,
      refreshExpiresAt: '2026-08-29T14:00:00.000Z',
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['counter_sale.read', 'counter_sale.write'],
      capabilities: []
    }
  };
}

function body(value: unknown): object {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(value));
    }
  };
}

function handlers(cancel: (id: string, input?: unknown) => Promise<CounterSaleSummary>) {
  const counterSales = {
    getOrThrow: () => sale,
    getItems: () => [],
    getPayments: () => [],
    getReceipt: () => undefined,
    cancel,
    listCancellationHistory: async () => [
      {
        eventId: 'event-1',
        accountId: sale.accountId,
        counterSaleId: sale.id,
        cancelledByUserId: 'user-1',
        cancelledAt: '2026-08-29T12:01:00.000Z',
        reason: 'Cliente desistiu',
        correlationId: 'corr-cancel'
      }
    ]
  } as unknown as CounterSalesService;
  return {
    counterSales,
    audit: { write: () => {} } as never,
    requirePrincipal: () => principal()
  };
}

test('counter-sale cancel route rejects a missing or blank reason before mutating state', async () => {
  let calls = 0;
  const cancel = async () => {
    calls += 1;
    return sale;
  };

  await assert.rejects(
    () =>
      handleCounterSalesRoutes(
        `/counter-sales/${sale.id}/cancel`,
        body({}) as never,
        new MockResponse() as never,
        'corr-cancel-missing',
        handlers(cancel)
      ),
    ValidationError
  );
  await assert.rejects(
    () =>
      handleCounterSalesRoutes(
        `/counter-sales/${sale.id}/cancel`,
        body({ reason: '   ' }) as never,
        new MockResponse() as never,
        'corr-cancel-blank',
        handlers(cancel)
      ),
    ValidationError
  );
  assert.equal(calls, 0);
});

test('counter-sale cancel route rejects control characters before mutating state', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      handleCounterSalesRoutes(
        `/counter-sales/${sale.id}/cancel`,
        body({ reason: 'Cliente\n desistiu' }) as never,
        new MockResponse() as never,
        'corr-cancel-control',
        handlers(async () => {
          calls += 1;
          return sale;
        })
      ),
    ValidationError
  );
  await assert.rejects(
    () =>
      handleCounterSalesRoutes(
        `/counter-sales/${sale.id}/cancel`,
        body({ reason: 'Cliente desistiu\n' }) as never,
        new MockResponse() as never,
        'corr-cancel-trailing-control',
        handlers(async () => {
          calls += 1;
          return sale;
        })
      ),
    ValidationError
  );
  assert.equal(calls, 0);
});

test('counter-sale cancel route passes the principal, reason and correlation to the command', async () => {
  let receivedInput: unknown;
  const response = new MockResponse();
  const handled = await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}/cancel`,
    body({ reason: ' Cliente desistiu ' }) as never,
    response as never,
    'corr-cancel',
    handlers(async (_id, input) => {
      receivedInput = input;
      return { ...sale, status: 'cancelled' } as CounterSaleSummary;
    })
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedInput, {
    accountId: 'account-1',
    cancelledByUserId: 'user-1',
    reason: 'Cliente desistiu',
    correlationId: 'corr-cancel'
  });
});

test('counter-sale detail route exposes tenant-scoped cancellation history', async () => {
  const response = new MockResponse();
  await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}`,
    { method: 'GET', url: `/counter-sales/${sale.id}` } as never,
    response as never,
    'corr-detail',
    handlers(async () => sale)
  );

  const detail = response.bodyJson<{ cancellationHistory: Array<{ reason: string }> }>();
  assert.deepEqual(detail.cancellationHistory, [
    {
      eventId: 'event-1',
      accountId: 'account-1',
      counterSaleId: 'sale-1',
      cancelledByUserId: 'user-1',
      cancelledAt: '2026-08-29T12:01:00.000Z',
      reason: 'Cliente desistiu',
      correlationId: 'corr-cancel'
    }
  ]);
});

test('counter-sale detail route can load a cold database projection through the account scope', async () => {
  let lookup: { accountId: string; saleId: string } | undefined;
  const routeHandlers = handlers(async () => sale);
  const counterSales = routeHandlers.counterSales as unknown as {
    getByIdForAccount: (accountId: string, saleId: string) => Promise<CounterSaleSummary>;
  };
  counterSales.getByIdForAccount = async (accountId, saleId) => {
    lookup = { accountId, saleId };
    return sale;
  };

  const response = new MockResponse();
  await handleCounterSalesRoutes(
    `/counter-sales/${sale.id}`,
    { method: 'GET', url: `/counter-sales/${sale.id}` } as never,
    response as never,
    'corr-cold-detail',
    routeHandlers
  );

  assert.deepEqual(lookup, { accountId: 'account-1', saleId: sale.id });
  assert.equal(response.statusCode, 200);
});

test('counter-sale cancel and detail routes compose with the in-memory service', async () => {
  const counterSales = new CounterSalesServiceImplementation();
  const opened = await counterSales.open('account-1' as never, 'user-1' as never);
  const audit = { write: () => {} } as never;

  const cancelResponse = new MockResponse();
  await handleCounterSalesRoutes(
    `/counter-sales/${opened.id}/cancel`,
    body({ reason: 'Cancelamento operacional' }) as never,
    cancelResponse as never,
    'corr-composed-cancel',
    {
      counterSales,
      audit,
      requirePrincipal: () => principal()
    }
  );

  assert.equal(cancelResponse.statusCode, 200);
  assert.equal(cancelResponse.bodyJson<{ status: string }>().status, 'cancelled');

  const detailResponse = new MockResponse();
  await handleCounterSalesRoutes(
    `/counter-sales/${opened.id}`,
    { method: 'GET', url: `/counter-sales/${opened.id}` } as never,
    detailResponse as never,
    'corr-composed-detail',
    {
      counterSales,
      audit,
      requirePrincipal: () => principal()
    }
  );

  const detail = detailResponse.bodyJson<{
    cancellationHistory: Array<{
      eventId: string;
      counterSaleId: string;
      cancelledByUserId: string;
      reason: string;
      correlationId: string;
    }>;
  }>();
  assert.equal(detail.cancellationHistory.length, 1);
  assert.equal(detail.cancellationHistory[0]?.counterSaleId, opened.id);
  assert.equal(detail.cancellationHistory[0]?.cancelledByUserId, 'user-1');
  assert.equal(detail.cancellationHistory[0]?.reason, 'Cancelamento operacional');
  assert.equal(detail.cancellationHistory[0]?.correlationId, 'corr-composed-cancel');
  assert.ok(detail.cancellationHistory[0]?.eventId);
});
