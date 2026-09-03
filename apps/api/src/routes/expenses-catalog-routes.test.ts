import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { setAppState } from '../app-state.js';
import { handleExpensesCatalogRoutes } from './expenses-catalog-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];
  readonly #headers = new Map<string, string>();

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

  setHeader(name: string, value: string): this {
    this.#headers.set(name.toLowerCase(), value);
    return this;
  }

  bodyJson<T>() {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc-1' as never,
      username: 'finance',
      email: 'finance@example.com',
      displayName: 'Financeiro',
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
      roleCodes: ['finance'],
      permissionCodes: ['billing.read', 'billing.manage'],
      capabilities: []
    }
  };
}

function createMockRequest(method: string, url: string, body?: object): object {
  const bodyStr = body ? JSON.stringify(body) : '';
  const chunks: Buffer[] = bodyStr ? [Buffer.from(bodyStr)] : [];
  return {
    method,
    url,
    [Symbol.asyncIterator]: () => ({
      next: async () => {
        if (chunks.length === 0) return { done: true, value: undefined };
        return { done: false, value: chunks.shift()! };
      }
    })
  };
}

function createAuditCollector() {
  const events: Array<{ action: string; payloadSummary: string }> = [];
  return {
    audit: {
      write: (event: { action: string; payloadSummary: string }) => {
        events.push({ action: event.action, payloadSummary: event.payloadSummary });
      }
    },
    events
  };
}

test('expenses catalog routes fail fast on default runtime when database mode is not available', async () => {
  const { audit } = createAuditCollector();
  setAppState({
    initialized: true,
    databaseConfigured: true,
    databaseHealthy: false,
    persistenceMode: 'in-memory',
    databaseDetail: 'Database runtime unavailable for finance catalog'
  });

  try {
    const response = new MockResponse();
    const handled = await handleExpensesCatalogRoutes(
      '/expenses-catalog',
      { method: 'GET', url: '/expenses-catalog?page=1&pageSize=10' } as never,
      response as never,
      'corr-exp-runtime-1',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal()
      }
    );

    assert.equal(handled, true);
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.bodyJson(), {
      code: 'FINANCE_CATALOG_DB_REQUIRED',
      message:
        'Finance catalog runtime requires database-backed persistence in the default API runtime',
      correlationId: 'corr-exp-runtime-1'
    });
  } finally {
    setAppState({
      initialized: false,
      databaseConfigured: false,
      databaseHealthy: false,
      persistenceMode: 'not-initialized',
      databaseDetail: 'Not initialized'
    });
  }
});

test('expenses catalog routes use the composed database store in configured runtime', async () => {
  const { audit } = createAuditCollector();
  let calls = 0;
  setAppState({
    initialized: true,
    databaseConfigured: true,
    databaseHealthy: true,
    persistenceMode: 'database',
    databaseDetail: 'Database runtime ready'
  });

  try {
    const response = new MockResponse();
    const handled = await handleExpensesCatalogRoutes(
      '/expenses-catalog',
      { method: 'GET', url: '/expenses-catalog?page=1&pageSize=10' } as never,
      response as never,
      'corr-exp-runtime-composed',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        store: {
          async list(accountId: string) {
            calls += 1;
            assert.equal(accountId, 'acc-1');
            return {
              items: [
                {
                  id: 'DES-composed',
                  accountId,
                  name: 'Despesa persistida',
                  kind: 'Fixo',
                  category: 'Tecnologia',
                  costCenterCode: 'CC-ADM',
                  costCenterName: 'Administrativo Central',
                  description: 'Fonte do repositório composto',
                  createdBy: 'user-1',
                  createdAt: '2026-05-01T00:00:00.000Z',
                  updatedAt: '2026-05-01T00:00:00.000Z'
                }
              ],
              categories: ['Tecnologia'],
              costCenters: [],
              page: 1,
              pageSize: 10,
              totalItems: 1,
              totalPages: 1,
              sort: 'name',
              order: 'asc'
            };
          }
        } as never
      }
    );

    assert.equal(handled, true);
    assert.equal(response.statusCode, 200);
    assert.equal(calls, 1);
    assert.equal(
      response.bodyJson<{ items: Array<{ id: string }> }>().items[0]?.id,
      'DES-composed'
    );
  } finally {
    setAppState({
      initialized: false,
      databaseConfigured: false,
      databaseHealthy: false,
      persistenceMode: 'not-initialized',
      databaseDetail: 'Not initialized'
    });
  }
});

test('expenses catalog routes list paginated items with server-side filters and cost center catalog endpoint', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'expenses-catalog-routes-'));
  const storagePath = join(tempDir, 'expenses-catalog.json');
  const { audit, events } = createAuditCollector();

  try {
    for (const item of [
      {
        name: 'Hospedagem Cloud',
        kind: 'Variável',
        category: 'Tecnologia',
        costCenterCode: 'CLI-ATD',
        description: 'Infraestrutura de produção'
      },
      {
        name: 'Monitoramento',
        kind: 'Fixo',
        category: 'Tecnologia',
        costCenterCode: 'LAB-OP',
        description: 'Observabilidade do laboratório'
      }
    ]) {
      const seedResponse = new MockResponse();
      await handleExpensesCatalogRoutes(
        '/expenses-catalog',
        createMockRequest('POST', '/expenses-catalog', item) as never,
        seedResponse as never,
        'corr-exp-seed',
        {
          audit: audit as never,
          requirePrincipal: () => createPrincipal(),
          storagePath
        }
      );
      assert.equal(seedResponse.statusCode, 201);
    }

    const response = new MockResponse();
    const handled = await handleExpensesCatalogRoutes(
      '/expenses-catalog',
      {
        method: 'GET',
        url: '/expenses-catalog?search=o&category=Tecnologia&sort=name&order=asc&page=2&pageSize=2'
      } as never,
      response as never,
      'corr-exp-1',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        storagePath
      }
    );

    assert.equal(handled, true);
    assert.equal(response.statusCode, 200);
    const body = response.bodyJson<{
      items: Array<{
        id: string;
        name: string;
        category: string;
        costCenterCode?: string;
        costCenterName?: string;
      }>;
      categories: string[];
      costCenters: Array<{ code: string; name: string }>;
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      sort: string;
      order: string;
    }>();
    assert.equal(body.items.length, 1);
    assert.equal(body.page, 2);
    assert.equal(body.pageSize, 2);
    assert.equal(body.totalItems, 3);
    assert.equal(body.totalPages, 2);
    assert.equal(body.sort, 'name');
    assert.equal(body.order, 'asc');
    assert.deepEqual(
      body.items.map((item) => item.name),
      ['Monitoramento']
    );
    assert.ok(body.categories.includes('Tecnologia'));
    assert.ok(body.costCenters.some((center) => center.code === 'CLI-ATD'));
    assert.ok(events.some((event) => event.action === 'list_expenses_catalog'));

    const costCentersResponse = new MockResponse();
    const centersHandled = await handleExpensesCatalogRoutes(
      '/cost-centers-catalog',
      {
        method: 'GET',
        url: '/cost-centers-catalog?search=o&page=1&pageSize=1&sort=name&order=asc'
      } as never,
      costCentersResponse as never,
      'corr-exp-1b',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        storagePath
      }
    );
    assert.equal(centersHandled, true);
    assert.equal(costCentersResponse.statusCode, 200);
    const centersBody = costCentersResponse.bodyJson<{
      items: Array<{ code: string; name: string; kind: string }>;
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      sort: string;
      order: string;
    }>();
    assert.equal(centersBody.page, 1);
    assert.equal(centersBody.pageSize, 1);
    assert.equal(centersBody.totalItems, 3);
    assert.equal(centersBody.totalPages, 3);
    assert.deepEqual(
      centersBody.items.map((item) => item.code),
      ['CLI-ATD']
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('operational finance catalog routes provide validated, versioned and audited CRUD', async () => {
  const { audit, events } = createAuditCollector();
  const permissions: string[] = [];
  const id = '11111111-1111-4111-8111-111111111111';
  let item = {
    id,
    accountId: 'acc-1',
    type: 'banks' as const,
    code: 'BANK_001',
    name: 'Banco Operacional',
    status: 'active' as const,
    configuration: {
      bankCode: '001',
      agency: '0001',
      accountNumber: '12345-6',
      accountType: 'checking',
      usageKey: 'settlement',
      usageDescription: 'Liquidação operacional',
      reconciliationMode: 'manual'
    },
    version: 1,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-02T12:00:00.000Z'
  };
  const store = {
    async createOperationalCatalog(
      accountId: string,
      actorId: string,
      type: string,
      payload: typeof item
    ) {
      assert.equal(accountId, 'acc-1');
      assert.equal(actorId, 'user-1');
      assert.equal(type, 'banks');
      item = { ...item, ...payload, id, accountId, type: 'banks', version: 1 };
      return item;
    },
    async updateOperationalCatalog(
      accountId: string,
      actorId: string,
      type: string,
      itemId: string,
      expectedVersion: number,
      payload: typeof item
    ) {
      assert.equal(accountId, 'acc-1');
      assert.equal(actorId, 'user-1');
      assert.equal(type, 'banks');
      assert.equal(itemId, id);
      if (expectedVersion !== item.version) throw new Error('VERSION_CONFLICT');
      item = {
        ...item,
        ...payload,
        type: 'banks',
        version: item.version + 1,
        updatedAt: '2026-09-02T12:01:00.000Z'
      };
      return { item, diffSummary: 'changed=name,configuration' };
    },
    async listOperationalCatalog(accountId: string, type: string) {
      assert.equal(accountId, 'acc-1');
      assert.equal(type, 'banks');
      return {
        items: [item],
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1
      };
    },
    async removeOperationalCatalog(accountId: string, type: string, itemId: string) {
      assert.equal(accountId, 'acc-1');
      assert.equal(type, 'banks');
      assert.equal(itemId, id);
      return item;
    }
  };
  const handlers = {
    audit: audit as never,
    requirePrincipal: (_request: unknown, permission: string) => {
      permissions.push(permission);
      return createPrincipal();
    },
    store: store as never
  };

  const createResponse = new MockResponse();
  await handleExpensesCatalogRoutes(
    '/finance/catalogs/banks',
    createMockRequest('POST', '/finance/catalogs/banks', {
      code: 'bank_001',
      name: 'Banco Operacional',
      status: 'active',
      configuration: item.configuration
    }) as never,
    createResponse as never,
    'corr-bank-create',
    handlers
  );
  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.bodyJson<{ code: string }>().code, 'BANK_001');

  const updateResponse = new MockResponse();
  await handleExpensesCatalogRoutes(
    `/finance/catalogs/banks/${id}`,
    createMockRequest('PATCH', `/finance/catalogs/banks/${id}`, {
      code: 'BANK_001',
      name: 'Banco Operacional Principal',
      status: 'active',
      configuration: { ...item.configuration, reconciliationMode: 'automatic' },
      version: 1
    }) as never,
    updateResponse as never,
    'corr-bank-update',
    handlers
  );
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.bodyJson<{ version: number }>().version, 2);

  const staleResponse = new MockResponse();
  await handleExpensesCatalogRoutes(
    `/finance/catalogs/banks/${id}`,
    createMockRequest('PATCH', `/finance/catalogs/banks/${id}`, {
      code: 'BANK_001',
      name: 'Edição obsoleta',
      status: 'active',
      configuration: item.configuration,
      version: 1
    }) as never,
    staleResponse as never,
    'corr-bank-stale',
    handlers
  );
  assert.equal(staleResponse.statusCode, 409);
  assert.equal(staleResponse.bodyJson<{ code: string }>().code, 'VERSION_CONFLICT');

  const forbiddenResponse = new MockResponse();
  await handleExpensesCatalogRoutes(
    '/finance/catalogs/banks',
    createMockRequest('POST', '/finance/catalogs/banks', {
      code: 'BANK_002',
      name: 'Banco com segredo',
      status: 'active',
      configuration: { ...item.configuration, apiToken: 'must-not-be-stored' }
    }) as never,
    forbiddenResponse as never,
    'corr-bank-forbidden',
    handlers
  );
  assert.equal(forbiddenResponse.statusCode, 400);
  assert.match(forbiddenResponse.bodyJson<{ message: string }>().message, /apiToken is forbidden/);

  const listResponse = new MockResponse();
  await handleExpensesCatalogRoutes(
    '/finance/catalogs/banks',
    { method: 'GET', url: '/finance/catalogs/banks?status=active&page=1' } as never,
    listResponse as never,
    'corr-bank-list',
    handlers
  );
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.bodyJson<{ totalItems: number }>().totalItems, 1);

  const deleteResponse = new MockResponse();
  await handleExpensesCatalogRoutes(
    `/finance/catalogs/banks/${id}`,
    { method: 'DELETE', url: `/finance/catalogs/banks/${id}` } as never,
    deleteResponse as never,
    'corr-bank-delete',
    handlers
  );
  assert.equal(deleteResponse.statusCode, 200);
  assert.deepEqual(deleteResponse.bodyJson(), { ok: true });

  assert.deepEqual(permissions, [
    'billing.manage',
    'billing.manage',
    'billing.manage',
    'billing.manage',
    'billing.read',
    'billing.manage'
  ]);
  assert.ok(events.some((event) => event.action === 'create_finance_operational_catalog_item'));
  assert.ok(events.some((event) => event.action === 'update_finance_operational_catalog_item'));
  assert.ok(events.some((event) => event.action === 'list_finance_operational_catalog'));
  assert.ok(events.some((event) => event.action === 'remove_finance_operational_catalog_item'));
  assert.ok(events.every((event) => !event.payloadSummary.includes('must-not-be-stored')));
});

test('expenses catalog routes persist to disk across runtime restart, support cost center CRUD and write audit diffs', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'expenses-catalog-routes-'));
  const storagePath = join(tempDir, 'expenses-catalog.json');
  const { audit, events } = createAuditCollector();

  try {
    const createCenterResponse = new MockResponse();
    await handleExpensesCatalogRoutes(
      '/cost-centers-catalog',
      createMockRequest('POST', '/cost-centers-catalog', {
        code: 'ADM-FIN',
        name: 'Administrativo Financeiro',
        kind: 'Administrativo',
        owner: 'Gerência Financeira',
        description: 'Rateio administrativo do financeiro'
      }) as never,
      createCenterResponse as never,
      'corr-cc-1',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        storagePath
      }
    );
    assert.equal(createCenterResponse.statusCode, 201);
    const createdCenter = createCenterResponse.bodyJson<{
      code: string;
      name: string;
      owner: string;
    }>();
    assert.equal(createdCenter.code, 'ADM-FIN');
    assert.equal(createdCenter.name, 'Administrativo Financeiro');

    const updateCenterResponse = new MockResponse();
    await handleExpensesCatalogRoutes(
      '/cost-centers-catalog/ADM-FIN',
      createMockRequest('PATCH', '/cost-centers-catalog/ADM-FIN', {
        code: 'ADM-FIN',
        name: 'Administrativo Financeiro Corporativo',
        kind: 'Administrativo',
        owner: 'Diretoria Financeira',
        description: 'Rateio administrativo consolidado'
      }) as never,
      updateCenterResponse as never,
      'corr-cc-2',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        storagePath
      }
    );
    assert.equal(updateCenterResponse.statusCode, 200);
    const updatedCenter = updateCenterResponse.bodyJson<{ name: string; owner: string }>();
    assert.equal(updatedCenter.name, 'Administrativo Financeiro Corporativo');
    assert.equal(updatedCenter.owner, 'Diretoria Financeira');

    const createResponse = new MockResponse();
    await handleExpensesCatalogRoutes(
      '/expenses-catalog',
      createMockRequest('POST', '/expenses-catalog', {
        name: 'Hospedagem Cloud',
        kind: 'Variável',
        category: 'Tecnologia',
        costCenterCode: 'ADM-FIN',
        description: 'Infraestrutura de produção'
      }) as never,
      createResponse as never,
      'corr-exp-2',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        storagePath
      }
    );
    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.bodyJson<{
      id: string;
      name: string;
      category: string;
      costCenterCode: string;
      costCenterName: string;
    }>();
    assert.equal(created.name, 'Hospedagem Cloud');
    assert.equal(created.category, 'Tecnologia');
    assert.equal(created.costCenterCode, 'ADM-FIN');
    assert.equal(created.costCenterName, 'Administrativo Financeiro Corporativo');

    const persistedAfterCreate = JSON.parse(await readFile(storagePath, 'utf8')) as {
      accounts: Record<string, { items: unknown[] }>;
      costCenters: Array<{ code: string }>;
    };
    assert.ok(persistedAfterCreate.accounts['acc-1']);
    assert.ok(persistedAfterCreate.accounts['acc-1'].items.length >= 1);
    assert.ok(persistedAfterCreate.costCenters.some((center) => center.code === 'ADM-FIN'));

    const deleteBlockedResponse = new MockResponse();
    await handleExpensesCatalogRoutes(
      '/cost-centers-catalog/ADM-FIN',
      { method: 'DELETE', url: '/cost-centers-catalog/ADM-FIN' } as never,
      deleteBlockedResponse as never,
      'corr-cc-3',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        storagePath
      }
    );
    assert.equal(deleteBlockedResponse.statusCode, 409);
    assert.deepEqual(deleteBlockedResponse.bodyJson(), {
      code: 'COST_CENTER_IN_USE',
      message: 'Cost center is in use by expense catalog items',
      correlationId: 'corr-cc-3'
    });

    const updateResponse = new MockResponse();
    await handleExpensesCatalogRoutes(
      `/expenses-catalog/${created.id}`,
      createMockRequest('PATCH', `/expenses-catalog/${created.id}`, {
        name: 'Hospedagem Cloud Premium',
        kind: 'Variável',
        category: 'Tecnologia',
        costCenterCode: 'LAB-OP',
        description: 'Infraestrutura revisada'
      }) as never,
      updateResponse as never,
      'corr-exp-3',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        storagePath
      }
    );
    assert.equal(updateResponse.statusCode, 200);
    const updated = updateResponse.bodyJson<{
      name: string;
      costCenterCode: string;
      costCenterName: string;
    }>();
    assert.equal(updated.name, 'Hospedagem Cloud Premium');
    assert.equal(updated.costCenterCode, 'LAB-OP');
    assert.equal(updated.costCenterName, 'Laboratório');

    const deleteCenterResponse = new MockResponse();
    await handleExpensesCatalogRoutes(
      '/cost-centers-catalog/ADM-FIN',
      { method: 'DELETE', url: '/cost-centers-catalog/ADM-FIN' } as never,
      deleteCenterResponse as never,
      'corr-cc-4',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        storagePath
      }
    );
    assert.equal(deleteCenterResponse.statusCode, 200);
    assert.deepEqual(deleteCenterResponse.bodyJson(), { ok: true });

    const invalidResponse = new MockResponse();
    await handleExpensesCatalogRoutes(
      '/expenses-catalog',
      createMockRequest('POST', '/expenses-catalog', {
        name: 'Serviço Inválido',
        kind: 'Variável',
        category: 'Tecnologia',
        costCenterCode: 'INVALIDO',
        description: 'Teste'
      }) as never,
      invalidResponse as never,
      'corr-exp-4',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        storagePath
      }
    );
    assert.equal(invalidResponse.statusCode, 400);
    assert.deepEqual(invalidResponse.bodyJson(), {
      code: 'VALIDATION_ERROR',
      message: 'costCenterCode is invalid',
      correlationId: 'corr-exp-4'
    });

    const listAfterRestartResponse = new MockResponse();
    await handleExpensesCatalogRoutes(
      '/expenses-catalog',
      { method: 'GET', url: `/expenses-catalog?search=${created.id}` } as never,
      listAfterRestartResponse as never,
      'corr-exp-4b',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        storagePath
      }
    );
    const listedAfterRestart = listAfterRestartResponse.bodyJson<{
      items: Array<{ id: string; name: string; costCenterCode: string }>;
    }>();
    assert.equal(listedAfterRestart.items.length, 1);
    assert.equal(listedAfterRestart.items[0].name, 'Hospedagem Cloud Premium');
    assert.equal(listedAfterRestart.items[0].costCenterCode, 'LAB-OP');

    const deleteResponse = new MockResponse();
    await handleExpensesCatalogRoutes(
      `/expenses-catalog/${created.id}`,
      { method: 'DELETE', url: `/expenses-catalog/${created.id}` } as never,
      deleteResponse as never,
      'corr-exp-5',
      {
        audit: audit as never,
        requirePrincipal: () => createPrincipal(),
        storagePath
      }
    );
    assert.equal(deleteResponse.statusCode, 200);
    assert.deepEqual(deleteResponse.bodyJson(), { ok: true });

    assert.ok(events.some((event) => event.action === 'create_cost_center_catalog_item'));
    assert.ok(
      events.some(
        (event) =>
          event.action === 'create_cost_center_catalog_item' &&
          event.payloadSummary.includes('code=ADM-FIN') &&
          event.payloadSummary.includes('kind=Administrativo') &&
          event.payloadSummary.includes('owner=Gerência Financeira')
      )
    );
    assert.ok(
      events.some(
        (event) =>
          event.action === 'update_cost_center_catalog_item' &&
          event.payloadSummary.includes('owner: Gerência Financeira → Diretoria Financeira') &&
          event.payloadSummary.includes(
            'description: Rateio administrativo do financeiro → Rateio administrativo consolidado'
          )
      )
    );
    assert.ok(
      events.some(
        (event) =>
          event.action === 'create_expense_catalog_item' &&
          event.payloadSummary.includes(`id=${created.id}`) &&
          event.payloadSummary.includes('name=Hospedagem Cloud') &&
          event.payloadSummary.includes('category=Tecnologia') &&
          event.payloadSummary.includes('costCenter=ADM-FIN')
      )
    );
    assert.ok(
      events.some(
        (event) =>
          event.action === 'update_expense_catalog_item' &&
          event.payloadSummary.includes('name: Hospedagem Cloud → Hospedagem Cloud Premium') &&
          event.payloadSummary.includes('costCenterCode: ADM-FIN → LAB-OP') &&
          event.payloadSummary.includes(
            'description: Infraestrutura de produção → Infraestrutura revisada'
          )
      )
    );
    assert.ok(events.some((event) => event.action === 'remove_cost_center_catalog_item'));
    assert.ok(
      events.some(
        (event) =>
          event.action === 'remove_cost_center_catalog_item' &&
          event.payloadSummary.includes('code=ADM-FIN') &&
          event.payloadSummary.includes('name=Administrativo Financeiro Corporativo')
      )
    );
    assert.ok(
      events.some(
        (event) =>
          event.action === 'remove_expense_catalog_item' &&
          event.payloadSummary.includes(`id=${created.id}`) &&
          event.payloadSummary.includes('name=Hospedagem Cloud Premium') &&
          event.payloadSummary.includes('category=Tecnologia') &&
          event.payloadSummary.includes('costCenter=LAB-OP')
      )
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
