import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import type {
  AdvancePaymentSummary,
  CreateAdvancePaymentAllocationInput,
  CreateAdvancePaymentInput,
  AdvancePaymentsRepository
} from '../repositories/advance-payments-report-source.js';
import { handleAdvancePaymentsRoutes } from './advance-payments-routes.js';

const accountId = '00000000-0000-0000-0000-000000000001';
const actorUserId = '00000000-0000-0000-0000-000000000002';
const ownerId = '00000000-0000-0000-0000-000000000003';
const paymentId = '00000000-0000-0000-0000-000000000004';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly headers = new Map<string, string>();
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: () => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(chunk?: string | Buffer | (() => void)): this {
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (typeof chunk === 'function') chunk();
    return this;
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function principal(): AuthenticatedPrincipal {
  const now = new Date().toISOString();
  return {
    user: {
      id: actorUserId as never,
      accountId: accountId as never,
      username: 'finance',
      email: 'finance@example.com',
      displayName: 'Financeiro',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    session: {
      sessionId: 'session-finance' as never,
      userId: actorUserId as never,
      accountId: accountId as never,
      createdAt: now,
      expiresAt: now,
      authTime: now,
      refreshExpiresAt: now,
      active: true
    },
    access: {
      roleCodes: ['finance'],
      permissionCodes: ['billing.read', 'billing.manage'],
      capabilities: []
    }
  };
}

function request(
  method: string,
  body: unknown,
  idempotencyKey = 'advance-payment-request-1'
): never {
  return {
    method,
    headers: idempotencyKey === '' ? {} : { 'idempotency-key': idempotencyKey },
    url: 'http://localhost/finance/advance-payments',
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

const summary: AdvancePaymentSummary = {
  id: paymentId,
  accountId,
  ownerId,
  ownerName: 'João Silva',
  documentId: '123.456.789-00',
  issuedAt: '2026-08-26T12:00:00.000Z',
  amountCents: 18000,
  compensatedAmountCents: 0,
  balanceCents: 18000,
  currency: 'BRL',
  sourceType: 'manual',
  sourceId: 'receipt-001',
  reference: 'Caixa 1',
  notes: 'Crédito para consulta futura',
  status: 'available',
  createdByUserId: actorUserId,
  createdAt: '2026-08-26T12:00:00.000Z'
};

function repository(overrides: Partial<AdvancePaymentsRepository> = {}): AdvancePaymentsRepository {
  return {
    async list() {
      return [];
    },
    async listSummaries() {
      return [];
    },
    async create(_input: CreateAdvancePaymentInput) {
      return summary;
    },
    async allocate(_input: CreateAdvancePaymentAllocationInput) {
      return { ...summary, compensatedAmountCents: 5000, balanceCents: 13000, status: 'partially_compensated' as const };
    },
    ...overrides
  };
}

test('manual issuance is authenticated, exact-cents and delegated through the tenant command', async () => {
  const calls: unknown[] = [];
  const response = new MockResponse();
  const handled = await handleAdvancePaymentsRoutes(
    '/finance/advance-payments',
    request('POST', {
      ownerId,
      amountCents: 18000,
      sourceId: 'receipt-001',
      reference: 'Caixa 1',
      notes: 'Crédito para consulta futura'
    }),
    response as never,
    {
      advancePayments: repository({
        async create(input) {
          calls.push(input);
          return summary;
        }
      }),
      audit: { write: () => undefined } as never,
      requirePrincipal: (_request, permission) => {
        calls.push(permission);
        return principal();
      },
      runCommand: async (input) => {
        calls.push({ operation: input.operation, payload: input.payload, idempotencyKey: input.idempotencyKey });
        return input.command();
      },
      correlationId: 'corr-advance-issue'
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.bodyJson(), summary);
  assert.deepEqual(calls[0], 'billing.manage');
  assert.deepEqual(calls[1], {
    operation: 'finance.advance-payment.issue',
    idempotencyKey: 'advance-payment-request-1',
    payload: {
      ownerId,
      amountCents: 18000,
      sourceType: 'manual',
      sourceId: 'receipt-001',
      reference: 'Caixa 1',
      notes: 'Crédito para consulta futura'
    }
  });
  assert.deepEqual(calls[2], {
    accountId,
    actorUserId,
    ownerId,
    amountCents: 18000,
    sourceType: 'manual',
    sourceId: 'receipt-001',
    reference: 'Caixa 1',
    notes: 'Crédito para consulta futura',
    idempotencyKey: 'advance-payment-request-1'
  });
});

test('compensation requires an idempotency key and never accepts an amount with decimals', async () => {
  let called = false;
  await assert.rejects(
    () => handleAdvancePaymentsRoutes(
      `/finance/advance-payments/${paymentId}/allocations`,
      request('POST', { amountCents: 12.5, reference: 'billing-001' }),
      new MockResponse() as never,
      {
        advancePayments: repository({
          async allocate() {
            called = true;
            return summary;
          }
        }),
        audit: { write: () => undefined } as never,
        requirePrincipal: () => principal(),
        correlationId: 'corr-advance-compensate'
      }
    ),
    ValidationError
  );
  assert.equal(called, false);

  await assert.rejects(
    () => handleAdvancePaymentsRoutes(
      `/finance/advance-payments/${paymentId}/allocations`,
      request('POST', { amountCents: 5000, reference: 'billing-001' }, ''),
      new MockResponse() as never,
      {
        advancePayments: repository(),
        audit: { write: () => undefined } as never,
        requirePrincipal: () => principal(),
        correlationId: 'corr-advance-compensate'
      }
    ),
    ValidationError
  );
});

test('compensation rejects malformed encoded UUID paths as validation errors', async () => {
  await assert.rejects(
    () => handleAdvancePaymentsRoutes(
      '/finance/advance-payments/%E0%A4%A/allocations',
      request('POST', { amountCents: 5000, reference: 'billing-001' }),
      new MockResponse() as never,
      {
        advancePayments: repository(),
        audit: { write: () => undefined } as never,
        requirePrincipal: () => principal(),
        correlationId: 'corr-advance-malformed-path'
      }
    ),
    ValidationError
  );
});

test('GET list uses the canonical persisted source and records a read audit', async () => {
  const calls: unknown[] = [];
  const response = new MockResponse();
  const handled = await handleAdvancePaymentsRoutes(
    '/finance/advance-payments',
    {
      method: 'GET',
      url: 'http://localhost/finance/advance-payments?search=Jo%C3%A3o&status=available&dateFrom=2026-08-01&dateTo=2026-08-31',
      headers: {}
    } as never,
    response as never,
    {
      advancePayments: repository({
        async listSummaries(account, filters) {
          calls.push([account, filters]);
          return [summary];
        }
      }),
      audit: { write: (event: unknown) => calls.push(event) } as never,
      requirePrincipal: (_request, permission) => {
        calls.push(permission);
        return principal();
      },
      correlationId: 'corr-advance-list'
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), { items: [summary] });
  assert.deepEqual(calls[0], 'billing.read');
  assert.deepEqual(calls[1], [accountId, {
    search: 'João',
    status: 'available',
    dateFrom: '2026-08-01',
    dateTo: '2026-08-31'
  }]);
});

test('writes fail closed when the database-backed advance-payment repository is unavailable', async () => {
  await assert.rejects(
    () => handleAdvancePaymentsRoutes(
      '/finance/advance-payments',
      request('POST', { ownerId, amountCents: 1000, sourceId: 'receipt-002' }),
      new MockResponse() as never,
      {
        audit: { write: () => undefined } as never,
        requirePrincipal: () => principal(),
        correlationId: 'corr-advance-unavailable'
      }
    ),
    (error: unknown) => error instanceof AppError && error.statusCode === 503
  );
});
