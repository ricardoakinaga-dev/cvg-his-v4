import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { CommercialService } from '@cvg-his-v2/module-commercial';
import { PackagesService } from '@cvg-his-v2/module-packages';
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

function createAudit(events?: Array<{ action: string; entityId: string; payloadSummary: string }>) {
  return {
    write: (event: { action: string; entityId: string; payloadSummary: string }) => {
      events?.push(event);
    }
  };
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

function handlers(commercial: CommercialService, audit = createAudit() as never, packages = new PackagesService()) {
  return {
    commercial,
    packages,
    audit,
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

test('handleCommercialRoutes exposes package lifecycle, consumption and renewal', async () => {
  const commercial = new CommercialService();
  const packages = new PackagesService();
  const events: Array<{ action: string; entityId: string; payloadSummary: string }> = [];
  const routeHandlers = handlers(commercial, createAudit(events) as never, packages);

  const createResponse = new MockResponse();
  await handleCommercialRoutes(
    '/packages',
    request('POST', {
      ownerId: 'owner-1',
      patientId: 'patient-1',
      startsAt: '2026-06-01',
      expiresAt: '2026-07-31',
      notes: 'Pacote preventivo'
    }),
    createResponse as never,
    'corr-pkg-1',
    routeHandlers
  );
  const pkg = createResponse.bodyJson<{ id: string; number: string; status: string }>();
  assert.equal(createResponse.statusCode, 201);
  assert.equal(pkg.number, 'PKG-000001');
  assert.equal(pkg.status, 'draft');

  const itemResponse = new MockResponse();
  await handleCommercialRoutes(
    `/packages/${pkg.id}/items`,
    request('POST', {
      itemKind: 'service',
      catalogItemId: 'svc-1',
      nameSnapshot: 'Vacina V10',
      quantityPurchased: 2,
      unitPrice: 90
    }),
    itemResponse as never,
    'corr-pkg-2',
    routeHandlers
  );
  const item = itemResponse.bodyJson<{ id: string; quantityPurchased: number }>();
  assert.equal(itemResponse.statusCode, 201);
  assert.equal(item.quantityPurchased, 2);

  const activateResponse = new MockResponse();
  await handleCommercialRoutes(
    `/packages/${pkg.id}/activate`,
    request('POST'),
    activateResponse as never,
    'corr-pkg-3',
    routeHandlers
  );
  assert.equal(activateResponse.bodyJson<{ status: string }>().status, 'active');

  const consumeResponse = new MockResponse();
  await handleCommercialRoutes(
    `/package-items/${item.id}/consume`,
    request('POST', {
      quantity: 1,
      consumedAt: '2026-06-15',
      sourceType: 'appointment',
      sourceId: 'appt-1'
    }),
    consumeResponse as never,
    'corr-pkg-4',
    routeHandlers
  );
  const consumed = consumeResponse.bodyJson<{ balance: Array<{ quantityAvailable: number }>; consumptions: unknown[] }>();
  assert.equal(consumed.balance[0]?.quantityAvailable, 1);
  assert.equal(consumed.consumptions.length, 1);

  const renewResponse = new MockResponse();
  await handleCommercialRoutes(
    `/packages/${pkg.id}/renew`,
    request('POST', { startsAt: '2026-08-01', expiresAt: '2026-08-31' }),
    renewResponse as never,
    'corr-pkg-5',
    routeHandlers
  );
  const renewed = renewResponse.bodyJson<{ status: string; renewedFromPackageId: string | null; balance: Array<{ quantityAvailable: number }> }>();
  assert.equal(renewResponse.statusCode, 201);
  assert.equal(renewed.status, 'active');
  assert.equal(renewed.renewedFromPackageId, pkg.id);
  assert.equal(renewed.balance[0]?.quantityAvailable, 2);

  const listResponse = new MockResponse();
  await handleCommercialRoutes('/pacotes', request('GET'), listResponse as never, 'corr-pkg-6', routeHandlers);
  assert.equal(listResponse.bodyJson<{ items: Array<{ id: string }> }>().items.length, 2);
  assert.deepEqual(events.map((event) => event.action), [
    'create_package',
    'add_package_item',
    'activate_package',
    'consume_package_item',
    'renew_package'
  ]);
});

test('handleCommercialRoutes creates, updates, archives price tables and items', async () => {
  const commercial = new CommercialService();
  const createResponse = new MockResponse();
  await handleCommercialRoutes(
    '/tabelas-de-preco',
    request('POST', { legacyId: '1', description: 'Tabela final de semana' }),
    createResponse as never,
    'corr-price-1',
    handlers(commercial)
  );
  const table = createResponse.bodyJson<{ id: string; description: string }>();
  assert.equal(createResponse.statusCode, 201);
  assert.equal(table.description, 'Tabela final de semana');

  const updateResponse = new MockResponse();
  await handleCommercialRoutes(
    `/tabelas-de-preco/${table.id}`,
    request('PATCH', {
      legacyId: '2',
      description: 'Tabela final de semana premium',
      context: 'Feriados',
      isActive: true
    }),
    updateResponse as never,
    'corr-price-1b',
    handlers(commercial)
  );
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.bodyJson<{ description: string; context: string }>().context, 'Feriados');

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

  const deleteResponse = new MockResponse();
  await handleCommercialRoutes(
    `/price-tables/${table.id}`,
    request('DELETE'),
    deleteResponse as never,
    'corr-price-4',
    handlers(commercial)
  );
  assert.equal(deleteResponse.statusCode, 204);
});

test('handleCommercialRoutes runs POS sync jobs and writes audit events', async () => {
  const commercial = new CommercialService();
  const events: Array<{ action: string; entityId: string; payloadSummary: string }> = [];
  const routeHandlers = handlers(commercial, createAudit(events) as never);
  const table = await commercial.createPriceTable(createPrincipal().user.accountId, {
    legacyId: '1',
    description: 'Tabela PDV'
  });
  await commercial.addPriceTableItem(createPrincipal().user.accountId, table.id, {
    itemKind: 'product',
    itemId: 'prod-1',
    price: 15
  });

  const createResponse = new MockResponse();
  await handleCommercialRoutes(
    '/pos-sync/jobs',
    request('POST', { syncKind: 'stock', metadata: { origin: 'pdv' } }),
    createResponse as never,
    'corr-pos-1',
    routeHandlers
  );
  const job = createResponse.bodyJson<{ id: string; status: string; processedCount: number; startedAt: string; finishedAt: string }>();
  assert.equal(createResponse.statusCode, 201);
  assert.equal(job.status, 'completed');
  assert.equal(job.processedCount, 2);
  assert.ok(job.startedAt);
  assert.ok(job.finishedAt);
  assert.deepEqual(events.map((event) => event.action), ['start_pos_sync_job', 'complete_pos_sync_job']);

  const listResponse = new MockResponse();
  await handleCommercialRoutes(
    '/pos-sync/jobs',
    request('GET', undefined, '/pos-sync/jobs?syncKind=stock&status=completed'),
    listResponse as never,
    'corr-pos-2',
    routeHandlers
  );
  assert.equal(listResponse.bodyJson<{ items: Array<{ id: string }> }>().items[0]?.id, job.id);

  const updateResponse = new MockResponse();
  await handleCommercialRoutes(
    `/pos-sync/jobs/${job.id}`,
    request('PATCH', { status: 'completed', processedCount: 15 }),
    updateResponse as never,
    'corr-pos-3',
    routeHandlers
  );
  const updated = updateResponse.bodyJson<{ status: string; processedCount: number }>();
  assert.equal(updated.status, 'completed');
  assert.equal(updated.processedCount, 15);
});
