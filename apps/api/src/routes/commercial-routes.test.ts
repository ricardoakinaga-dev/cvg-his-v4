import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { CommercialService } from '@cvg-his-v2/module-commercial';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleCommercialRoutes } from './commercial-routes.js';

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

  setHeader(): this {
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-commercial-1' as never,
      accountId: 'acc-commercial-1' as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-commercial-1' as never,
      userId: 'user-commercial-1' as never,
      accountId: 'acc-commercial-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['counter_sale.read', 'counter_sale.write', 'inventory.read', 'inventory.manage'],
      capabilities: []
    }
  };
}

function createAudit() {
  return { write: () => {} };
}

function request(method: string, body?: unknown, url?: string): never {
  return {
    method,
    url,
    [Symbol.asyncIterator]: async function* () {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function handlers(commercial: CommercialService) {
  return {
    commercial,
    audit: createAudit() as never,
    requirePrincipal: () => createPrincipal()
  };
}

test('handleCommercialRoutes ignores unrelated paths', async () => {
  const response = new MockResponse();
  const handled = await handleCommercialRoutes('/owners', request('GET'), response as never, 'corr', handlers(new CommercialService()));
  assert.equal(handled, false);
});

test('handleCommercialRoutes exposes loyalty points balance and redemptions', async () => {
  const commercial = new CommercialService();

  const awardResponse = new MockResponse();
  await handleCommercialRoutes(
    '/loyalty/points',
    request('POST', { ownerId: 'owner-1', points: 120, sourceType: 'purchase' }),
    awardResponse as never,
    'corr-loy-1',
    handlers(commercial)
  );
  assert.equal(awardResponse.statusCode, 201);

  const redeemResponse = new MockResponse();
  await handleCommercialRoutes(
    '/loyalty/redemptions',
    request('POST', { ownerId: 'owner-1', pointsUsed: 40, rewardDescription: 'Banho', serviceQuantity: 1 }),
    redeemResponse as never,
    'corr-loy-2',
    handlers(commercial)
  );
  assert.equal(redeemResponse.statusCode, 201);

  const summaryResponse = new MockResponse();
  await handleCommercialRoutes(
    '/loyalty/summary',
    request('GET', undefined, '/loyalty/summary?ownerId=owner-1'),
    summaryResponse as never,
    'corr-loy-3',
    handlers(commercial)
  );
  const summary = summaryResponse.bodyJson<{ availablePoints: number; redeemedPoints: number }>();
  assert.equal(summary.availablePoints, 80);
  assert.equal(summary.redeemedPoints, 40);
});

test('handleCommercialRoutes creates price tables and items', async () => {
  const commercial = new CommercialService();
  const createResponse = new MockResponse();
  await handleCommercialRoutes(
    '/price-tables',
    request('POST', { legacyId: '1', description: 'Tabela final de semana' }),
    createResponse as never,
    'corr-price-1',
    handlers(commercial)
  );
  const table = createResponse.bodyJson<{ id: string; description: string }>();
  assert.equal(createResponse.statusCode, 201);
  assert.equal(table.description, 'Tabela final de semana');

  const itemResponse = new MockResponse();
  await handleCommercialRoutes(
    `/price-tables/${table.id}/items`,
    request('POST', { itemKind: 'service', itemId: 'svc-1', price: 90 }),
    itemResponse as never,
    'corr-price-2',
    handlers(commercial)
  );
  assert.equal(itemResponse.statusCode, 201);

  const detailResponse = new MockResponse();
  await handleCommercialRoutes(
    `/price-tables/${table.id}`,
    request('GET'),
    detailResponse as never,
    'corr-price-3',
    handlers(commercial)
  );
  const detail = detailResponse.bodyJson<{ items: Array<{ itemId: string; price: number }> }>();
  assert.equal(detail.items[0]?.itemId, 'svc-1');
  assert.equal(detail.items[0]?.price, 90);
});

test('handleCommercialRoutes creates and updates POS sync jobs', async () => {
  const commercial = new CommercialService();
  const createResponse = new MockResponse();
  await handleCommercialRoutes(
    '/pos-sync/jobs',
    request('POST', { syncKind: 'stock', metadata: { origin: 'pdv' } }),
    createResponse as never,
    'corr-pos-1',
    handlers(commercial)
  );
  const job = createResponse.bodyJson<{ id: string; status: string }>();
  assert.equal(job.status, 'queued');

  const updateResponse = new MockResponse();
  await handleCommercialRoutes(
    `/pos-sync/jobs/${job.id}`,
    request('PATCH', { status: 'completed', processedCount: 15 }),
    updateResponse as never,
    'corr-pos-2',
    handlers(commercial)
  );
  const updated = updateResponse.bodyJson<{ status: string; processedCount: number }>();
  assert.equal(updated.status, 'completed');
  assert.equal(updated.processedCount, 15);
});
