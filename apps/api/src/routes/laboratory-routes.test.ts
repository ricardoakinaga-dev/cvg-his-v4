import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import {
  DiagnosticsService,
  InMemoryLaboratoryCatalogRepository,
  LaboratoryService
} from '@cvg-his-v2/module-diagnostics';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleLaboratoryRoutes } from './laboratory-routes.js';

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

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc-1' as never,
      username: 'lab',
      email: 'lab@example.com',
      displayName: 'Laboratorio',
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
      roleCodes: ['laboratory'],
      permissionCodes: ['diagnostics.read', 'diagnostics.manage'],
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

async function createLaboratoryService(): Promise<LaboratoryService> {
  const diagnostics = new DiagnosticsService(
    {
      getOrThrow() {
        return {
          id: 'enc-1',
          accountId: 'acc-1',
          patientId: 'pat-1'
        };
      }
    } as never
  );

  const requestedOrder = await diagnostics.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Hemograma',
    examCatalogId: 'cat_001',
    reason: 'Check-up'
  });

  await diagnostics.recordResult(requestedOrder.id, {
    status: 'collected',
    collectedByUserId: 'lab-user'
  });
  await diagnostics.recordResult(requestedOrder.id, {
    status: 'resulted',
    resultSummary: 'Hemograma dentro da normalidade',
    releasedByUserId: 'user-1'
  });

  await diagnostics.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Bioquimico',
    examCatalogId: 'cat_002',
    reason: 'Seguimento'
  });

  return new LaboratoryService(diagnostics, {
    catalogRepository: new InMemoryLaboratoryCatalogRepository()
  });
}

test('handleLaboratoryRoutes serves persisted laboratory catalogs', async () => {
  const response = new MockResponse();

  const handled = await handleLaboratoryRoutes(
    '/laboratory/report-types',
    { method: 'GET', url: '/laboratory/report-types' } as never,
    response as never,
    'corr-lab-1',
    {
      laboratory: await createLaboratoryService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ code: string }> }>();
  assert.ok(payload.items.length >= 6);
  assert.ok(payload.items.some((item) => item.code === 'HEM'));
});

test('handleLaboratoryRoutes keeps /diagnostics/orders as a coherent bridge', async () => {
  const response = new MockResponse();

  const handled = await handleLaboratoryRoutes(
    '/diagnostics/orders',
    { method: 'GET', url: '/diagnostics/orders?encounterId=enc-1' } as never,
    response as never,
    'corr-lab-2',
    {
      laboratory: await createLaboratoryService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ encounterId: string }> }>();
  assert.equal(payload.items.length, 2);
  assert.equal(payload.items.every((item) => item.encounterId === 'enc-1'), true);
});

test('handleLaboratoryRoutes accepts Vetus-like laboratory exams aliases and filters', async () => {
  const response = new MockResponse();

  const handled = await handleLaboratoryRoutes(
    '/laboratorio/atendimentos/exames',
    { method: 'GET', url: '/laboratorio/atendimentos/exames?animal=pat-1&data=2026-' } as never,
    response as never,
    'corr-lab-vetus-exames',
    {
      laboratory: await createLaboratoryService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ patientId: string }> }>();
  assert.equal(payload.items.length, 0);

  const datedResponse = new MockResponse();
  const datedHandled = await handleLaboratoryRoutes(
    '/laboratory/exams',
    { method: 'GET', url: '/laboratory/exams?animal=pat-1' } as never,
    datedResponse as never,
    'corr-lab-vetus-exames-2',
    {
      laboratory: await createLaboratoryService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(datedHandled, true);
  assert.equal(datedResponse.statusCode, 200);
  const datedPayload = datedResponse.bodyJson<{ items: Array<{ patientId: string }> }>();
  assert.equal(datedPayload.items.length, 2);
  assert.equal(datedPayload.items.every((item) => item.patientId === 'pat-1'), true);
});

test('handleLaboratoryRoutes exposes diagnostics catalog and order detail', async () => {
  const laboratory = await createLaboratoryService();
  const orders = await laboratory.listOrders('acc-1' as never, 'enc-1');

  const catalogResponse = new MockResponse();
  const detailResponse = new MockResponse();

  const catalogHandled = await handleLaboratoryRoutes(
    '/diagnostics/catalog',
    { method: 'GET', url: '/diagnostics/catalog' } as never,
    catalogResponse as never,
    'corr-lab-3',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  const detailHandled = await handleLaboratoryRoutes(
    `/laboratory/orders/${orders[0].id}`,
    { method: 'GET', url: `/laboratory/orders/${orders[0].id}` } as never,
    detailResponse as never,
    'corr-lab-4',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(catalogHandled, true);
  assert.equal(detailHandled, true);
  assert.equal(catalogResponse.statusCode, 200);
  assert.equal(detailResponse.statusCode, 200);

  const catalogPayload = catalogResponse.bodyJson<{ items: Array<{ id: string; code: string }> }>();
  const detailPayload = detailResponse.bodyJson<{ id: string; status: string }>();

  assert.ok(catalogPayload.items.some((item) => item.id === 'cat_001' && item.code === 'HEM'));
  assert.equal(detailPayload.id, orders[0].id);
});

test('handleLaboratoryRoutes lists resulted orders through the diagnostics bridge', async () => {
  const response = new MockResponse();

  const handled = await handleLaboratoryRoutes(
    '/diagnostics/results',
    { method: 'GET', url: '/diagnostics/results?examType=HEM' } as never,
    response as never,
    'corr-lab-5',
    {
      laboratory: await createLaboratoryService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ status: string; examCatalogId?: string }> }>();
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].status, 'resulted');
  assert.equal(payload.items[0].examCatalogId, 'cat_001');
});

test('handleLaboratoryRoutes releases result with authenticated user and technical signature', async () => {
  const laboratory = await createLaboratoryService();
  const openOrder = (await laboratory.listOrders('acc-1' as never, 'enc-1')).find(
    (order) => order.status === 'requested'
  );
  assert.ok(openOrder);

  const collectResponse = new MockResponse();
  await handleLaboratoryRoutes(
    `/laboratory/orders/${openOrder.id}/result`,
    createMockRequest('POST', `/laboratory/orders/${openOrder.id}/result`, {
      status: 'collected',
      collectedByUserId: 'lab-user'
    }) as never,
    collectResponse as never,
    'corr-lab-release-1',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  const releaseResponse = new MockResponse();
  const handled = await handleLaboratoryRoutes(
    `/laboratory/orders/${openOrder.id}/result`,
    createMockRequest('POST', `/laboratory/orders/${openOrder.id}/result`, {
      status: 'resulted',
      resultSummary: 'Bioquimico liberado',
      signedByUserId: 'rt-laboratorio'
    }) as never,
    releaseResponse as never,
    'corr-lab-release-2',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(releaseResponse.statusCode, 200);
  const payload = releaseResponse.bodyJson<{
    status: string;
    resultedAt?: string;
    releasedByUserId?: string;
    signedByUserId?: string;
    signatureHash?: string;
  }>();
  assert.equal(payload.status, 'resulted');
  assert.equal(payload.releasedByUserId, 'user-1');
  assert.equal(payload.signedByUserId, 'rt-laboratorio');
  assert.ok(payload.resultedAt);
  assert.ok(payload.signatureHash);
});

test('handleLaboratoryRoutes generates printable signed laboratory report html', async () => {
  const laboratory = await createLaboratoryService();
  const order = (await laboratory.listResults('acc-1' as never, 'HEM'))[0];
  assert.ok(order);

  const response = new MockResponse();
  const handled = await handleLaboratoryRoutes(
    `/laboratory/reports/${order.id}/print`,
    { method: 'GET', url: `/laboratory/reports/${order.id}/print` } as never,
    response as never,
    'corr-lab-print-1',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ html: string }>();
  assert.match(payload.html, /Laudo Laboratorial/);
  assert.match(payload.html, /Hemograma dentro da normalidade/);
  assert.match(payload.html, /user-1/);
  assert.match(payload.html, /Hash da assinatura/);
});

test('handleLaboratoryRoutes accepts Vetus-like laboratory report aliases and filters', async () => {
  const laboratory = await createLaboratoryService();
  const response = new MockResponse();

  const handled = await handleLaboratoryRoutes(
    '/laboratorio/atendimentos/laudos',
    { method: 'GET', url: '/laboratorio/atendimentos/laudos?corpo=normalidade' } as never,
    response as never,
    'corr-lab-laudos',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ status: string; resultSummary?: string }> }>();
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].status, 'resulted');
  assert.match(payload.items[0].resultSummary ?? '', /normalidade/i);

  const code = payload.items[0] as { id?: string };
  const codeResponse = new MockResponse();
  const codeHandled = await handleLaboratoryRoutes(
    '/laboratory/reports',
    { method: 'GET', url: `/laboratory/reports?codigo=${code.id ?? 'missing'}` } as never,
    codeResponse as never,
    'corr-lab-laudos-code',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(codeHandled, true);
  assert.equal(codeResponse.statusCode, 200);
  const codePayload = codeResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.equal(codePayload.items.length, 1);
});

test('handleLaboratoryRoutes exposes Vetus-like hemograms aliases filtered to HEM results', async () => {
  const laboratory = await createLaboratoryService();
  const response = new MockResponse();

  const handled = await handleLaboratoryRoutes(
    '/laboratorio/atendimentos/hemogramas',
    { method: 'GET', url: '/laboratorio/atendimentos/hemogramas?corpo=normalidade' } as never,
    response as never,
    'corr-lab-hemogramas',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ examCatalogId?: string; resultSummary?: string }> }>();
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].examCatalogId, 'cat_001');
  assert.match(payload.items[0].resultSummary ?? '', /normalidade/i);

  const shortAliasResponse = new MockResponse();
  const shortAliasHandled = await handleLaboratoryRoutes(
    '/laboratory/hemograms',
    { method: 'GET', url: '/laboratory/hemograms?animal=pat-1' } as never,
    shortAliasResponse as never,
    'corr-lab-hemogramas-short',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(shortAliasHandled, true);
  assert.equal(shortAliasResponse.statusCode, 200);
  const shortPayload = shortAliasResponse.bodyJson<{ items: Array<{ examType: string }> }>();
  assert.equal(shortPayload.items.length, 1);
  assert.match(shortPayload.items[0].examType, /hemograma/i);
});

test('handleLaboratoryRoutes exposes Vetus-like urinalysis aliases filtered to URIN results', async () => {
  const laboratory = await createLaboratoryService();
  const urinalysisOrder = await laboratory.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Urina',
    examCatalogId: 'cat_003',
    reason: 'Suspeita urinaria'
  });
  await laboratory.recordResult(urinalysisOrder.id, {
    status: 'collected',
    collectedByUserId: 'lab-user'
  });
  await laboratory.recordResult(urinalysisOrder.id, {
    status: 'resulted',
    resultSummary: 'Densidade urinaria dentro da referencia',
    releasedByUserId: 'user-1'
  });

  const response = new MockResponse();
  const handled = await handleLaboratoryRoutes(
    '/laboratorio/atendimentos/urina',
    { method: 'GET', url: '/laboratorio/atendimentos/urina?corpo=densidade' } as never,
    response as never,
    'corr-lab-urina',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ examCatalogId?: string; resultSummary?: string }> }>();
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].examCatalogId, 'cat_003');
  assert.match(payload.items[0].resultSummary ?? '', /densidade/i);

  const shortAliasResponse = new MockResponse();
  const shortAliasHandled = await handleLaboratoryRoutes(
    '/laboratory/urinalysis',
    { method: 'GET', url: '/laboratory/urinalysis?animal=pat-1' } as never,
    shortAliasResponse as never,
    'corr-lab-urina-short',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(shortAliasHandled, true);
  assert.equal(shortAliasResponse.statusCode, 200);
  const shortPayload = shortAliasResponse.bodyJson<{ items: Array<{ examType: string }> }>();
  assert.equal(shortPayload.items.length, 1);
  assert.match(shortPayload.items[0].examType, /urina/i);
});

test('handleLaboratoryRoutes exposes Vetus-like biochemistry aliases filtered to BIO results', async () => {
  const laboratory = await createLaboratoryService();
  const biochemistryOrder = await laboratory.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Bioquimico',
    examCatalogId: 'cat_002',
    reason: 'Perfil bioquimico'
  });
  await laboratory.recordResult(biochemistryOrder.id, {
    status: 'collected',
    collectedByUserId: 'lab-user'
  });
  await laboratory.recordResult(biochemistryOrder.id, {
    status: 'resulted',
    resultSummary: 'ALT dentro da referencia',
    releasedByUserId: 'user-1'
  });

  const response = new MockResponse();
  const handled = await handleLaboratoryRoutes(
    '/laboratorio/atendimentos/bioquimico',
    { method: 'GET', url: '/laboratorio/atendimentos/bioquimico?corpo=alt' } as never,
    response as never,
    'corr-lab-bioquimico',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ examCatalogId?: string; resultSummary?: string }> }>();
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].examCatalogId, 'cat_002');
  assert.match(payload.items[0].resultSummary ?? '', /alt/i);

  const shortAliasResponse = new MockResponse();
  const shortAliasHandled = await handleLaboratoryRoutes(
    '/laboratory/biochemistry',
    { method: 'GET', url: '/laboratory/biochemistry?animal=pat-1' } as never,
    shortAliasResponse as never,
    'corr-lab-bioquimico-short',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(shortAliasHandled, true);
  assert.equal(shortAliasResponse.statusCode, 200);
  const shortPayload = shortAliasResponse.bodyJson<{ items: Array<{ examType: string }> }>();
  assert.equal(shortPayload.items.length, 1);
  assert.match(shortPayload.items[0].examType, /bioquim/i);
});

test('handleLaboratoryRoutes exposes Vetus-like laboratory equipment catalog with filters and write flow', async () => {
  const laboratory = await createLaboratoryService();
  const createResponse = new MockResponse();

  const createHandled = await handleLaboratoryRoutes(
    '/laboratorio/cadastros/equipamentos',
    createMockRequest('POST', '/laboratorio/cadastros/equipamentos', {
      name: 'Analisador Bioquimico Teste',
      type: 'Bioquimica',
      serialNumber: 'BIO-TEST-001',
      status: 'active',
      lastCalibrationAt: '2026-04-25T00:00:00.000Z'
    }) as never,
    createResponse as never,
    'corr-lab-equip-create',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(createHandled, true);
  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.bodyJson<{ id: string; name: string; serialNumber: string }>();
  assert.equal(created.name, 'Analisador Bioquimico Teste');
  assert.equal(created.serialNumber, 'BIO-TEST-001');

  const listResponse = new MockResponse();
  const listHandled = await handleLaboratoryRoutes(
    '/laboratorio/equipamentos',
    { method: 'GET', url: '/laboratorio/equipamentos?descricao=bioquimico&tipo=bioquimica' } as never,
    listResponse as never,
    'corr-lab-equip-list',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(listHandled, true);
  assert.equal(listResponse.statusCode, 200);
  const listPayload = listResponse.bodyJson<{ items: Array<{ id: string; name: string }> }>();
  assert.ok(listPayload.items.some((item) => item.id === created.id));

  const updateResponse = new MockResponse();
  const updateHandled = await handleLaboratoryRoutes(
    `/laboratory/equipment/${created.id}`,
    createMockRequest('PATCH', `/laboratory/equipment/${created.id}`, {
      status: 'maintenance'
    }) as never,
    updateResponse as never,
    'corr-lab-equip-update',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(updateHandled, true);
  assert.equal(updateResponse.statusCode, 200);
  const updated = updateResponse.bodyJson<{ id: string; status: string }>();
  assert.equal(updated.id, created.id);
  assert.equal(updated.status, 'maintenance');
});

test('handleLaboratoryRoutes exposes Vetus-like laboratory report type catalog with filters and write flow', async () => {
  const laboratory = await createLaboratoryService();
  const createResponse = new MockResponse();

  const createHandled = await handleLaboratoryRoutes(
    '/laboratorio/cadastros/tipos-de-laudo',
    createMockRequest('POST', '/laboratorio/cadastros/tipos-de-laudo', {
      name: 'Citologia',
      code: 'cito',
      category: 'Laboratorial',
      description: 'Modelo de laudo citologico',
      active: true
    }) as never,
    createResponse as never,
    'corr-lab-report-type-create',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(createHandled, true);
  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.bodyJson<{ id: string; name: string; code: string }>();
  assert.equal(created.name, 'Citologia');
  assert.equal(created.code, 'CITO');

  const listResponse = new MockResponse();
  const listHandled = await handleLaboratoryRoutes(
    '/laboratorio/tipos-de-laudo',
    { method: 'GET', url: '/laboratorio/tipos-de-laudo?descricao=citologico&categoria=laboratorial' } as never,
    listResponse as never,
    'corr-lab-report-type-list',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(listHandled, true);
  assert.equal(listResponse.statusCode, 200);
  const listPayload = listResponse.bodyJson<{ items: Array<{ id: string; name: string }> }>();
  assert.ok(listPayload.items.some((item) => item.id === created.id));

  const updateResponse = new MockResponse();
  const updateHandled = await handleLaboratoryRoutes(
    `/laboratory/report-types/${created.id}`,
    createMockRequest('PATCH', `/laboratory/report-types/${created.id}`, {
      active: false
    }) as never,
    updateResponse as never,
    'corr-lab-report-type-update',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(updateHandled, true);
  assert.equal(updateResponse.statusCode, 200);
  const updated = updateResponse.bodyJson<{ id: string; active: boolean }>();
  assert.equal(updated.id, created.id);
  assert.equal(updated.active, false);
});

test('handleLaboratoryRoutes exposes Vetus-like hemogram reference value catalog with filters and write flow', async () => {
  const laboratory = await createLaboratoryService();
  const createResponse = new MockResponse();

  const createHandled = await handleLaboratoryRoutes(
    '/laboratorio/cadastros/vlr-ref-hemograma',
    createMockRequest('POST', '/laboratorio/cadastros/vlr-ref-hemograma', {
      parameter: 'Plaquetas',
      minValue: 200,
      maxValue: 500,
      unit: 'mil/uL'
    }) as never,
    createResponse as never,
    'corr-lab-hem-ref-create',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(createHandled, true);
  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.bodyJson<{ id: string; parameter: string; examType: string }>();
  assert.equal(created.parameter, 'Plaquetas');
  assert.equal(created.examType, 'HEM');

  const listResponse = new MockResponse();
  const listHandled = await handleLaboratoryRoutes(
    '/laboratorio/vlr-ref-hemograma',
    { method: 'GET', url: '/laboratorio/vlr-ref-hemograma?parametro=plaquetas&unidade=mil' } as never,
    listResponse as never,
    'corr-lab-hem-ref-list',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(listHandled, true);
  assert.equal(listResponse.statusCode, 200);
  const listPayload = listResponse.bodyJson<{ items: Array<{ id: string; examType: string }> }>();
  assert.ok(listPayload.items.some((item) => item.id === created.id));
  assert.equal(listPayload.items.every((item) => item.examType === 'HEM'), true);

  const updateResponse = new MockResponse();
  const updateHandled = await handleLaboratoryRoutes(
    `/laboratory/hemogram-reference-values/${created.id}`,
    createMockRequest('PATCH', `/laboratory/hemogram-reference-values/${created.id}`, {
      maxValue: 550
    }) as never,
    updateResponse as never,
    'corr-lab-hem-ref-update',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(updateHandled, true);
  assert.equal(updateResponse.statusCode, 200);
  const updated = updateResponse.bodyJson<{ id: string; maxValue: number }>();
  assert.equal(updated.id, created.id);
  assert.equal(updated.maxValue, 550);
});

test('handleLaboratoryRoutes exposes Vetus-like biochemistry reference value catalog with filters and write flow', async () => {
  const laboratory = await createLaboratoryService();
  const createResponse = new MockResponse();

  const createHandled = await handleLaboratoryRoutes(
    '/laboratorio/cadastros/vlr-ref-bioquimico',
    createMockRequest('POST', '/laboratorio/cadastros/vlr-ref-bioquimico', {
      parameter: 'Ureia',
      minValue: 15,
      maxValue: 65,
      unit: 'mg/dL'
    }) as never,
    createResponse as never,
    'corr-lab-bio-ref-create',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(createHandled, true);
  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.bodyJson<{ id: string; parameter: string; examType: string }>();
  assert.equal(created.parameter, 'Ureia');
  assert.equal(created.examType, 'BIO');

  const listResponse = new MockResponse();
  const listHandled = await handleLaboratoryRoutes(
    '/laboratorio/vlr-ref-bioquimico',
    { method: 'GET', url: '/laboratorio/vlr-ref-bioquimico?parametro=ureia&unidade=mg' } as never,
    listResponse as never,
    'corr-lab-bio-ref-list',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(listHandled, true);
  assert.equal(listResponse.statusCode, 200);
  const listPayload = listResponse.bodyJson<{ items: Array<{ id: string; examType: string }> }>();
  assert.ok(listPayload.items.some((item) => item.id === created.id));
  assert.equal(listPayload.items.every((item) => item.examType === 'BIO'), true);

  const updateResponse = new MockResponse();
  const updateHandled = await handleLaboratoryRoutes(
    `/laboratory/biochemistry-reference-values/${created.id}`,
    createMockRequest('PATCH', `/laboratory/biochemistry-reference-values/${created.id}`, {
      maxValue: 75
    }) as never,
    updateResponse as never,
    'corr-lab-bio-ref-update',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(updateHandled, true);
  assert.equal(updateResponse.statusCode, 200);
  const updated = updateResponse.bodyJson<{ id: string; maxValue: number }>();
  assert.equal(updated.id, created.id);
  assert.equal(updated.maxValue, 75);
});

test('handleLaboratoryRoutes covers the enterprise exam-order and exam-result lifecycle', async () => {
  const laboratory = await createLaboratoryService();
  const orderCreated: string[] = [];
  const statusChanged: string[] = [];
  const handlers = {
    laboratory,
    audit: { write: () => ({}) } as never,
    requirePrincipal: () => createPrincipal(),
    onOrderCreated: (order: { examType: string }) => orderCreated.push(order.examType),
    onOrderStatusChanged: (_order: unknown, payload: { status: string }) =>
      statusChanged.push(payload.status)
  };
  const invoke = async (pathname: string, method = 'GET', body?: object, url = pathname) => {
    const response = new MockResponse();
    const handled = await handleLaboratoryRoutes(
      pathname,
      createMockRequest(method, url, body) as never,
      response as never,
      `corr-${method}-${pathname}`,
      handlers as never
    );
    return { handled, response };
  };

  assert.equal((await invoke('/diagnostics/summary')).response.statusCode, 200);
  const catalog = await invoke('/diagnostics/catalog');
  assert.ok(catalog.response.bodyJson<{ items: unknown[] }>().items.length > 0);

  const collectedOrder = await laboratory.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Urinalise',
    reason: 'Enterprise collected result'
  });
  await laboratory.recordResult(collectedOrder.id, {
    status: 'collected',
    collectedByUserId: 'user-1'
  });
  const cancelledOrder = await laboratory.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Cultura',
    reason: 'Enterprise cancelled result'
  });
  await laboratory.recordResult(cancelledOrder.id, { status: 'cancelled' });

  const mappedOrders = await invoke('/exam-orders', 'GET', undefined, '/exam-orders?encounterId=enc-1');
  const mappedOrderItems = mappedOrders.response.bodyJson<{
    items: Array<{ id: string; status: string }>;
  }>().items;
  assert.ok(mappedOrderItems.some((item) => item.status === 'requested'));
  assert.ok(mappedOrderItems.some((item) => item.status === 'collected'));
  assert.ok(mappedOrderItems.some((item) => item.status === 'completed'));
  assert.ok(mappedOrderItems.some((item) => item.status === 'cancelled'));
  assert.equal((await invoke(`/exam-orders/${collectedOrder.id}`)).response.statusCode, 200);

  const createdFromEncounter = await invoke('/encounters/enc-1/exam-orders', 'POST', {
    patientId: 'pat-1',
    examName: 'Enterprise Path Order'
  });
  assert.equal(createdFromEncounter.response.statusCode, 201);
  const createdPathOrder = createdFromEncounter.response.bodyJson<{ id: string; notes: string }>();
  assert.equal(createdPathOrder.notes, 'Pedido criado via surface enterprise');
  const createdFromCollection = await invoke('/exam-orders', 'POST', {
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Enterprise Payload Order',
    examCode: 'cat_001',
    reason: 'Enterprise payload reason'
  });
  assert.equal(createdFromCollection.response.statusCode, 201);
  assert.deepEqual(orderCreated, ['Enterprise Path Order', 'Enterprise Payload Order']);

  const collectedPatch = await invoke(`/exam-results/${createdPathOrder.id}`, 'PATCH', {
    status: 'draft',
    findings: 'Enterprise preliminary findings',
    resultAttachmentId: 'attachment-enterprise'
  });
  assert.equal(collectedPatch.response.bodyJson<{ status: string }>().status, 'draft');
  const releaseOrder = createdFromCollection.response.bodyJson<{ id: string }>();
  await invoke(`/exam-results/${releaseOrder.id}`, 'PATCH', {
    status: 'draft',
    interpretation: 'Enterprise preliminary interpretation'
  });
  const releasedPatch = await invoke(`/exam-results/${releaseOrder.id}`, 'PATCH', {
    status: 'released',
    interpretation: 'Enterprise released interpretation'
  });
  assert.equal(releasedPatch.response.bodyJson<{ status: string }>().status, 'released');
  const cancelCandidate = await laboratory.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Enterprise Cancel Candidate',
    reason: 'Cancellation branch'
  });
  const cancelledPatch = await invoke(`/exam-results/${cancelCandidate.id}`, 'PATCH', {
    status: 'cancelled'
  });
  assert.equal(cancelledPatch.response.bodyJson<{ status: string }>().status, 'cancelled');
  assert.deepEqual(statusChanged, ['collected', 'collected', 'resulted', 'cancelled']);

  const results = await invoke('/exam-results', 'GET', undefined, '/exam-results?category=Enterprise');
  assert.equal(results.response.statusCode, 200);
  assert.equal((await invoke(`/exam-results/${releaseOrder.id}`)).response.statusCode, 200);
  assert.equal(
    (await invoke(`/exam-results/${releaseOrder.id}/print`)).response.statusCode,
    200
  );
  await assert.rejects(
    () => invoke(`/exam-results/${collectedOrder.id}/print`),
    /Only released laboratory reports can be printed/
  );

  for (const query of [
    '?id=missing-order',
    '?patientId=missing-patient',
    '?date=1999-01-01'
  ]) {
    const filtered = await invoke('/laboratory/orders', 'GET', undefined, `/laboratory/orders${query}`);
    assert.deepEqual(filtered.response.bodyJson<{ items: unknown[] }>().items, []);
  }
  for (const query of [
    '?code=missing-result',
    '?patientId=missing-patient',
    '?body=missing-body',
    '?finalizedAt=1999-01-01',
    '?enteredAt=1999-01-01',
    '?closed=false'
  ]) {
    const filtered = await invoke('/laboratory/results', 'GET', undefined, `/laboratory/results${query}`);
    assert.deepEqual(filtered.response.bodyJson<{ items: unknown[] }>().items, []);
  }
});

test('handleLaboratoryRoutes validates catalog payload edges and serves detail routes', async () => {
  const laboratory = await createLaboratoryService();
  const handlers = {
    laboratory,
    audit: { write: () => ({}) } as never,
    requirePrincipal: () => createPrincipal()
  };
  const invoke = async (pathname: string, method = 'GET', body?: object, url = pathname) => {
    const response = new MockResponse();
    const handled = await handleLaboratoryRoutes(
      pathname,
      createMockRequest(method, url, body) as never,
      response as never,
      `corr-edge-${method}-${pathname}`,
      handlers
    );
    return { handled, response };
  };

  assert.equal((await invoke('/owners')).handled, false);
  assert.equal((await invoke('/laboratory/unmapped')).handled, false);
  await assert.rejects(
    () => invoke('/laboratory/equipment', 'POST'),
    /Field name must be a non-empty string/
  );
  await assert.rejects(
    () =>
      invoke('/laboratory/equipment', 'POST', {
        name: 'Invalid Analyzer',
        type: 'hematology',
        serialNumber: 'INVALID-DATE',
        lastCalibrationAt: 'not-a-date'
      }),
    /lastCalibrationAt must be a valid date/
  );
  const equipment = await invoke('/laboratory/equipment', 'POST', {
    name: 'Enterprise Edge Analyzer',
    type: 'hematology',
    serialNumber: 'EDGE-ANALYZER',
    status: 'unexpected-status',
    lastCalibrationAt: '2026-08-01T00:00:00.000Z'
  });
  const equipmentItem = equipment.response.bodyJson<{ id: string; status: string }>();
  assert.equal(equipmentItem.status, 'active');
  assert.equal((await invoke(`/laboratory/equipment/${equipmentItem.id}`)).response.statusCode, 200);
  const equipmentUpdate = await invoke(`/laboratory/equipment/${equipmentItem.id}`, 'PATCH', {
    name: 'Enterprise Edge Analyzer Updated',
    type: 'biochemistry',
    serialNumber: 'EDGE-ANALYZER-UPDATED',
    status: 'maintenance',
    lastCalibrationAt: '2026-08-02T00:00:00.000Z'
  });
  assert.equal(equipmentUpdate.response.bodyJson<{ status: string }>().status, 'maintenance');

  for (const query of [
    '?id=missing-equipment',
    '?description=missing-description',
    '?type=missing-type',
    '?status=missing-status'
  ]) {
    const filtered = await invoke('/diagnostics/equipment', 'GET', undefined, `/diagnostics/equipment${query}`);
    assert.deepEqual(filtered.response.bodyJson<{ items: unknown[] }>().items, []);
  }

  await assert.rejects(
    () => invoke('/laboratory/report-types', 'POST', {}),
    /Field name must be a non-empty string/
  );
  const reportType = await invoke('/laboratory/report-types', 'POST', {
    name: 'Enterprise Edge Report',
    code: ' edge-report ',
    category: 'laboratory',
    description: 'Enterprise edge report type',
    active: 'inactive'
  });
  const reportTypeItem = reportType.response.bodyJson<{ id: string; code: string; active: boolean }>();
  assert.equal(reportTypeItem.code, 'EDGE-REPORT');
  assert.equal(reportTypeItem.active, false);
  assert.equal((await invoke(`/laboratory/report-types/${reportTypeItem.id}`)).response.statusCode, 200);
  const reportTypeUpdate = await invoke(`/laboratory/report-types/${reportTypeItem.id}`, 'PATCH', {
    name: 'Enterprise Edge Report Updated',
    code: ' edge-report-v2 ',
    category: 'diagnostics',
    description: 'Enterprise edge report type updated',
    active: true
  });
  assert.equal(reportTypeUpdate.response.bodyJson<{ active: boolean }>().active, true);
  for (const query of [
    '?code=missing-code',
    '?description=missing-description',
    '?category=missing-category',
    '?status=inactive'
  ]) {
    const filtered = await invoke('/diagnostics/report-types', 'GET', undefined, `/diagnostics/report-types${query}`);
    assert.deepEqual(filtered.response.bodyJson<{ items: unknown[] }>().items, []);
  }

  await assert.rejects(
    () =>
      invoke('/laboratorio/cadastros/vlr-ref-hemograma', 'POST', {
        parameter: 'Invalid number',
        minValue: 'not-a-number',
        maxValue: 10,
        unit: 'x'
      }),
    /minValue must be a valid number/
  );
  await assert.rejects(
    () =>
      invoke('/laboratorio/cadastros/vlr-ref-hemograma', 'POST', {
        parameter: 'Invalid range',
        minValue: 20,
        maxValue: 10,
        unit: 'x'
      }),
    /minValue must be less than or equal to maxValue/
  );
  const reference = await invoke('/laboratorio/cadastros/vlr-ref-hemograma', 'POST', {
    parameter: 'Enterprise Edge Parameter',
    examType: ' custom ',
    minValue: 1,
    maxValue: 10,
    unit: 'mg/dL'
  });
  const referenceItem = reference.response.bodyJson<{ id: string }>();
  assert.equal(
    (await invoke(`/laboratory/reference-values/${referenceItem.id}`)).response.statusCode,
    200
  );
  await assert.rejects(
    () =>
      invoke(`/laboratory/reference-values/${referenceItem.id}`, 'PATCH', {
        minValue: 30,
        maxValue: 20
      }),
    /minValue must be less than or equal to maxValue/
  );
  const referenceUpdate = await invoke(`/laboratory/reference-values/${referenceItem.id}`, 'PATCH', {
    parameter: 'Enterprise Edge Parameter Updated',
    examType: ' custom ',
    minValue: 2,
    maxValue: 9,
    unit: 'g/dL'
  });
  assert.equal(referenceUpdate.response.bodyJson<{ maxValue: number }>().maxValue, 9);
  for (const query of [
    '?id=missing-reference',
    '?parameter=missing-parameter',
    '?unit=missing-unit'
  ]) {
    const filtered = await invoke(
      '/laboratory/reference-values',
      'GET',
      undefined,
      `/laboratory/reference-values${query}`
    );
    assert.deepEqual(filtered.response.bodyJson<{ items: unknown[] }>().items, []);
  }
});

test('handleLaboratoryRoutes propagates create persistence failure before publishing success', async () => {
  const diagnostics = new DiagnosticsService(
    {
      getOrThrow() {
        return {
          id: 'enc-1',
          accountId: 'acc-1',
          patientId: 'pat-1'
        };
      }
    } as never,
    {
      diagnosticOrderRepository: {
        async create() {
          throw new Error('route create persistence failed');
        },
        async update() {},
        async findById() {
          return null;
        },
        async findAll() {
          return [];
        },
        async findByEncounterId() {
          return [];
        }
      }
    }
  );
  const laboratory = new LaboratoryService(diagnostics);
  const response = new MockResponse();
  let createdEvents = 0;
  let auditWrites = 0;

  await assert.rejects(
    () =>
      handleLaboratoryRoutes(
        '/laboratory/orders',
        createMockRequest('POST', '/laboratory/orders', {
          encounterId: 'enc-1',
          patientId: 'pat-1',
          examType: 'Hemograma',
          reason: 'Falha duravel na rota'
        }) as never,
        response as never,
        'corr-route-create-failure',
        {
          laboratory,
          audit: { write: () => { auditWrites += 1; } } as never,
          requirePrincipal: () => createPrincipal(),
          onOrderCreated: () => { createdEvents += 1; }
        }
      ),
    /route create persistence failed/
  );

  assert.equal(response.statusCode, 200);
  assert.equal(createdEvents, 0);
  assert.equal(auditWrites, 0);
  assert.equal((await laboratory.listOrders('acc-1' as never)).length, 0);
});

test('handleLaboratoryRoutes propagates result persistence failure and keeps prior state', async () => {
  const diagnostics = new DiagnosticsService(
    {
      getOrThrow() {
        return {
          id: 'enc-1',
          accountId: 'acc-1',
          patientId: 'pat-1'
        };
      }
    } as never,
    {
      diagnosticOrderRepository: {
        async create() {},
        async update() {
          throw new Error('route result persistence failed');
        },
        async findById() {
          return null;
        },
        async findAll() {
          return [];
        },
        async findByEncounterId() {
          return [];
        }
      }
    }
  );
  const laboratory = new LaboratoryService(diagnostics);
  const order = await laboratory.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Hemograma',
    reason: 'Falha duravel no resultado'
  });
  const response = new MockResponse();
  let statusEvents = 0;
  let auditWrites = 0;

  await assert.rejects(
    () =>
      handleLaboratoryRoutes(
        `/laboratory/orders/${order.id}/result`,
        createMockRequest('POST', `/laboratory/orders/${order.id}/result`, {
          status: 'collected',
          collectedByUserId: 'lab-user'
        }) as never,
        response as never,
        'corr-route-update-failure',
        {
          laboratory,
          audit: { write: () => { auditWrites += 1; } } as never,
          requirePrincipal: () => createPrincipal(),
          onOrderStatusChanged: () => { statusEvents += 1; }
        }
      ),
    /route result persistence failed/
  );

  assert.equal(response.statusCode, 200);
  assert.equal(statusEvents, 0);
  assert.equal(auditWrites, 0);
  assert.equal(laboratory.getOrder('acc-1' as never, order.id).status, 'requested');
});
