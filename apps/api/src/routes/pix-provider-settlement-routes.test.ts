import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import {
  handlePixProviderSettlementRoutes,
  type PixProviderSettlementDlqDelivery,
  type PixProviderSettlementDlqRepository
} from './pix-provider-settlement-routes.js';

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

  setHeader(): this {
    return this;
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

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const EVENT_ID = '33333333-3333-4333-8333-333333333333';
const DELIVERY_ID = '44444444-4444-4444-8444-444444444444';

function createPrincipal(): AuthenticatedPrincipal {
  const now = new Date().toISOString();
  return {
    user: {
      id: USER_ID as never,
      accountId: ACCOUNT_ID as never,
      username: 'operator',
      email: 'operator@example.com',
      displayName: 'Operator',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    session: {
      sessionId: '55555555-5555-4555-8555-555555555555' as never,
      userId: USER_ID as never,
      accountId: ACCOUNT_ID as never,
      createdAt: now,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: now,
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['finance'],
      permissionCodes: ['audit.read', 'audit.write'],
      capabilities: []
    }
  };
}

function delivery(overrides: Partial<PixProviderSettlementDlqDelivery> = {}) {
  return {
    id: DELIVERY_ID,
    eventId: EVENT_ID,
    state: 'reconciliation_required' as const,
    attempts: 8,
    maxAttempts: 8,
    nextAttemptAt: null,
    lastErrorCode: 'SETTLEMENT_APPLY_FAILED',
    createdAt: '2026-08-23T10:00:00.000Z',
    updatedAt: '2026-08-23T10:01:00.000Z',
    rawBody: 'must never cross the operator boundary',
    providerTransactionId: 'provider-secret',
    ...overrides
  };
}

function handlers(repository?: PixProviderSettlementDlqRepository) {
  const permissions: string[] = [];
  const principal = createPrincipal();
  return {
    repository,
    permissions,
    requirePrincipal: (_request: IncomingMessage, permission: string) => {
      permissions.push(permission);
      return principal;
    }
  };
}

test('GET settlement DLQ is tenant-scoped, bounded, and sanitized', async () => {
  let listInput: unknown;
  const repository: PixProviderSettlementDlqRepository = {
    list: async (input) => {
      listInput = input;
      return [delivery()];
    },
    redrive: async () => true
  };
  const response = new MockResponse();

  const handled = await handlePixProviderSettlementRoutes(
    '/internal/pix-settlement/deliveries',
    {
      method: 'GET',
      url: '/internal/pix-settlement/deliveries?state=reconciliation_required&limit=25'
    } as never,
    response as never,
    'corr-dlq-list',
    handlers(repository)
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(listInput, {
    accountId: ACCOUNT_ID,
    state: 'reconciliation_required',
    limit: 25
  });
  assert.deepEqual(response.bodyJson(), {
    items: [
      {
        id: DELIVERY_ID,
        eventId: EVENT_ID,
        state: 'reconciliation_required',
        attempts: 8,
        maxAttempts: 8,
        nextAttemptAt: null,
        lastErrorCode: 'SETTLEMENT_APPLY_FAILED',
        createdAt: '2026-08-23T10:00:00.000Z',
        updatedAt: '2026-08-23T10:01:00.000Z'
      }
    ],
    count: 1
  });
});

test('GET settlement DLQ rejects an unbounded or non-terminal state filter', async () => {
  const repository: PixProviderSettlementDlqRepository = {
    list: async () => [],
    redrive: async () => true
  };

  await assert.rejects(
    () =>
      handlePixProviderSettlementRoutes(
        '/internal/pix-settlement/deliveries',
        {
          method: 'GET',
          url: '/internal/pix-settlement/deliveries?state=pending&limit=201'
        } as never,
        new MockResponse() as never,
        'corr-dlq-invalid-filter',
        handlers(repository)
      ),
    /state must be reconciliation_required|limit/i
  );
});

test('POST settlement DLQ redrive is audited by the repository and returns an opaque 404 when absent', async () => {
  let redriveInput: unknown;
  const repository: PixProviderSettlementDlqRepository = {
    list: async () => [],
    redrive: async (input) => {
      redriveInput = input;
      return true;
    }
  };
  const routeHandlers = handlers(repository);
  const response = new MockResponse();

  const handled = await handlePixProviderSettlementRoutes(
    `/internal/pix-settlement/deliveries/${DELIVERY_ID}/redrive`,
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ eventId: EVENT_ID, reason: 'manual reconciliation review' }));
      }
    } as never,
    response as never,
    'corr-dlq-redrive',
    routeHandlers
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 202);
  assert.deepEqual(redriveInput, {
    accountId: ACCOUNT_ID,
    deliveryId: DELIVERY_ID,
    eventId: EVENT_ID,
    actorUserId: USER_ID,
    correlationId: 'corr-dlq-redrive',
    reason: 'manual reconciliation review'
  });
  assert.deepEqual(response.bodyJson(), {
    id: DELIVERY_ID,
    eventId: EVENT_ID,
    status: 'redrive_scheduled'
  });

  const absentRepository: PixProviderSettlementDlqRepository = {
    list: async () => [],
    redrive: async () => false
  };
  const absentResponse = new MockResponse();
  await handlePixProviderSettlementRoutes(
    `/internal/pix-settlement/deliveries/${DELIVERY_ID}/redrive`,
    {
      method: 'POST',
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ eventId: EVENT_ID, reason: 'retry' }));
      }
    } as never,
    absentResponse as never,
    'corr-dlq-redrive-absent',
    handlers(absentRepository)
  );
  assert.equal(absentResponse.statusCode, 404);
  assert.deepEqual(absentResponse.bodyJson(), {
    code: 'NOT_FOUND',
    message: 'Settlement delivery not found',
    correlationId: 'corr-dlq-redrive-absent'
  });
});

test('settlement DLQ routes fail closed when database repository is unavailable', async () => {
  const response = new MockResponse();
  const handled = await handlePixProviderSettlementRoutes(
    '/internal/pix-settlement/deliveries',
    { method: 'GET', url: '/internal/pix-settlement/deliveries' } as never,
    response as never,
    'corr-dlq-unavailable',
    handlers()
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.bodyJson(), {
    code: 'PIX_SETTLEMENT_DLQ_UNAVAILABLE',
    message: 'PIX settlement operations are unavailable',
    correlationId: 'corr-dlq-unavailable'
  });
});
