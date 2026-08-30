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
    staff: {
      id: 'staff-1' as never,
      accountId: 'acc-1' as never,
      userId: 'user-1' as never,
      employeeCode: 'LAB-001',
      fullName: 'Profissional do Laboratório',
      department: 'Laboratório',
      jobTitle: 'Técnico de Laboratório',
      professionId: 'profession-lab' as never,
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

let requestSequence = 0;

function createMockRequest(
  method: string,
  url: string,
  body?: object,
  idempotencyKey = `laboratory-test-${++requestSequence}`
): object {
  const bodyStr = body ? JSON.stringify(body) : '';
  const chunks: Buffer[] = bodyStr ? [Buffer.from(bodyStr)] : [];
  return {
    method,
    url,
    headers: { 'idempotency-key': idempotencyKey },
    [Symbol.asyncIterator]: () => ({
      next: async () => {
        if (chunks.length === 0) return { done: true, value: undefined };
        return { done: false, value: chunks.shift()! };
      }
    })
  };
}

function createLaboratoryService(): LaboratoryService {
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
      laboratorySignerAuthority: {
        async isEnabledLaboratorySigner(_accountId: string, userId: string) {
          return userId === 'user-1';
        }
      }
    } as never
  );

  const requestedOrder = diagnostics.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Hemograma',
    examCatalogId: 'cat_001',
    reason: 'Check-up'
  });

  diagnostics.recordResult(requestedOrder.id, {
    status: 'collected',
    collectedByUserId: 'lab-user'
  });
  diagnostics.recordResult(requestedOrder.id, {
    status: 'resulted',
    resultSummary: 'Hemograma dentro da normalidade',
    releasedByUserId: 'user-1'
  });

  diagnostics.createOrder({
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
      laboratory: createLaboratoryService(),
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
      laboratory: createLaboratoryService(),
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

test('handleLaboratoryRoutes keeps legacy resulted status beside canonical reported status', async () => {
  const laboratory = createLaboratoryService();
  const legacyOrder = (await laboratory.listOrders('acc-1' as never, 'enc-1')).find(
    (order) => order.status === 'resulted'
  );
  assert.ok(legacyOrder);

  const legacyResponse = new MockResponse();
  await handleLaboratoryRoutes(
    '/diagnostics/orders',
    { method: 'GET', url: '/diagnostics/orders?encounterId=enc-1' } as never,
    legacyResponse as never,
    'corr-lab-legacy-status',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  const canonicalResponse = new MockResponse();
  await handleLaboratoryRoutes(
    '/laboratory/orders',
    { method: 'GET', url: '/laboratory/orders?encounterId=enc-1' } as never,
    canonicalResponse as never,
    'corr-lab-canonical-status',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  const legacy = legacyResponse.bodyJson<{ items: Array<{ id: string; status: string }> }>().items
    .find((item) => item.id === legacyOrder.id);
  const canonical = canonicalResponse.bodyJson<{
    items: Array<{ id: string; status: string; legacyStatus?: string; workflowVersion?: number }>;
  }>().items.find((item) => item.id === legacyOrder.id);

  assert.equal(legacy?.status, 'resulted');
  assert.equal(canonical?.status, 'reported');
  assert.equal(canonical?.legacyStatus, 'resulted');
  assert.equal(canonical?.workflowVersion, 2);
});

test('handleLaboratoryRoutes accepts Vetus-like laboratory exams aliases and filters', async () => {
  const response = new MockResponse();

  const handled = await handleLaboratoryRoutes(
    '/laboratorio/atendimentos/exames',
    { method: 'GET', url: '/laboratorio/atendimentos/exames?animal=pat-1&data=2026-' } as never,
    response as never,
    'corr-lab-vetus-exames',
    {
      laboratory: createLaboratoryService(),
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
      laboratory: createLaboratoryService(),
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

test('handleLaboratoryRoutes searches structured-only laboratory values', async () => {
  const diagnostics = new DiagnosticsService(
    {
      getOrThrow() {
        return { id: 'enc-1', accountId: 'acc-1', patientId: 'pat-1' };
      }
    } as never,
    {
      laboratorySignerAuthority: {
        async isEnabledLaboratorySigner(_accountId: string, userId: string) {
          return userId === 'user-1';
        }
      }
    } as never
  );
  const requested = diagnostics.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Bioquimico',
    examCatalogId: 'cat_002',
    reason: 'Busca estruturada'
  });
  diagnostics.recordResult(requested.id, {
    status: 'collected',
    collectedByUserId: 'lab-user'
  });
  diagnostics.recordResult(requested.id, {
    status: 'resulted',
    resultValues: [
      { parameter: 'ALT', value: '92', unit: 'U/L' },
      { parameter: 'pH urinário', value: '6.0' }
    ],
    releasedByUserId: 'user-1'
  });

  const response = new MockResponse();
  await handleLaboratoryRoutes(
    '/laboratory/biochemistry',
    { method: 'GET', url: '/laboratory/biochemistry?corpo=ALT' } as never,
    response as never,
    'corr-lab-structured-search',
    {
      laboratory: new LaboratoryService(diagnostics),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.bodyJson<{ items: Array<{ id: string }> }>().items.length, 1);

  const accentInsensitiveResponse = new MockResponse();
  await handleLaboratoryRoutes(
    '/laboratory/biochemistry',
    { method: 'GET', url: '/laboratory/biochemistry?corpo=urinario' } as never,
    accentInsensitiveResponse as never,
    'corr-lab-structured-search-accent-insensitive',
    {
      laboratory: new LaboratoryService(diagnostics),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(accentInsensitiveResponse.statusCode, 200);
  assert.equal(accentInsensitiveResponse.bodyJson<{ items: Array<{ id: string }> }>().items.length, 1);
});

test('handleLaboratoryRoutes exposes diagnostics catalog and order detail', async () => {
  const laboratory = createLaboratoryService();
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
      laboratory: createLaboratoryService(),
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
  const laboratory = createLaboratoryService();
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
      resultValues: [
        {
          parameter: 'ALT',
          value: '92',
          unit: 'U/L',
          reference: '10-125 U/L',
          outOfRange: false
        }
      ]
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
    resultValues?: Array<{ parameter: string; value: string; outOfRange?: boolean }>;
  }>();
  assert.equal(payload.status, 'resulted');
  assert.equal(payload.releasedByUserId, 'user-1');
  assert.equal(payload.signedByUserId, 'user-1');
  assert.ok(payload.resultedAt);
  assert.ok(payload.signatureHash);
  assert.deepEqual(payload.resultValues, [
    {
      parameter: 'ALT',
      value: '92',
      unit: 'U/L',
      reference: '10-125 U/L',
      outOfRange: false
    }
  ]);

  const printResponse = new MockResponse();
  await handleLaboratoryRoutes(
    `/laboratory/reports/${openOrder.id}/print`,
    { method: 'GET', url: `/laboratory/reports/${openOrder.id}/print` } as never,
    printResponse as never,
    'corr-lab-release-print',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );
  assert.match(printResponse.bodyJson<{ html: string }>().html, /ALT/);
  assert.match(printResponse.bodyJson<{ html: string }>().html, /10-125 U\/L/);
});

test('handleLaboratoryRoutes exposes the canonical analysis, report, recollection and delivery workflow', async () => {
  const laboratory = createLaboratoryService();
  const openOrder = (await laboratory.listOrders('acc-1' as never, 'enc-1')).find(
    (order) => order.status === 'requested'
  );
  assert.ok(openOrder);

  const request = (status: string, body: object) =>
    handleLaboratoryRoutes(
      `/laboratory/orders/${openOrder.id}/result`,
      createMockRequest('POST', `/laboratory/orders/${openOrder.id}/result`, { status, ...body }) as never,
      new MockResponse() as never,
      `corr-lab-workflow-${status}`,
      {
        laboratory,
        audit: { write: () => ({}) } as never,
        requirePrincipal: () => createPrincipal()
      }
    );

  await request('collected', { collectedByUserId: 'collector-1' });
  await request('in_analysis', {});

  const forgedSignatureResponse = new MockResponse();
  await assert.rejects(
    () => handleLaboratoryRoutes(
      `/laboratory/orders/${openOrder.id}/result`,
      createMockRequest('POST', `/laboratory/orders/${openOrder.id}/result`, {
        status: 'reported',
        resultSummary: 'Resultado forjado',
        signedByUserId: 'attacker',
        signatureHash: 'hash-forjado'
      }, 'lab-forged-signature') as never,
      forgedSignatureResponse as never,
      'corr-lab-workflow-forged',
      {
        laboratory,
        audit: { write: () => ({}) } as never,
        requirePrincipal: () => createPrincipal()
      }
    ),
    /server|principal|assinatura|signature/i
  );

  const reportedResponse = new MockResponse();
  const reportedHandled = await handleLaboratoryRoutes(
    `/laboratory/orders/${openOrder.id}/result`,
    createMockRequest('POST', `/laboratory/orders/${openOrder.id}/result`, {
      status: 'reported',
      resultSummary: 'Resultado assinado'
    }) as never,
    reportedResponse as never,
    'corr-lab-workflow-reported',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );
  assert.equal(reportedHandled, true);
  assert.equal(reportedResponse.statusCode, 200);
  assert.equal(reportedResponse.bodyJson<{ status: string; reportedByUserId?: string }>().status, 'reported');
  assert.equal(reportedResponse.bodyJson<{ reportedByUserId?: string }>().reportedByUserId, 'user-1');

  const recollectResponse = new MockResponse();
  const recollectHandled = await handleLaboratoryRoutes(
    `/laboratory/orders/${openOrder.id}/recollect`,
    createMockRequest('POST', `/laboratory/orders/${openOrder.id}/recollect`, {
      reason: 'Material insuficiente'
    }) as never,
    recollectResponse as never,
    'corr-lab-workflow-recollect',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );
  assert.equal(recollectHandled, true);
  assert.equal(recollectResponse.bodyJson<{ status: string; collectionAttempt: number }>().status, 'collected');
  assert.equal(recollectResponse.bodyJson<{ collectionAttempt: number }>().collectionAttempt, 2);

  await request('in_analysis', {});
  await request('reported', { resultSummary: 'Resultado final' });

  const deliveryResponse = new MockResponse();
  const deliveryHandled = await handleLaboratoryRoutes(
    `/laboratory/orders/${openOrder.id}/deliver`,
    createMockRequest('POST', `/laboratory/orders/${openOrder.id}/deliver`, {
      channel: 'portal'
    }) as never,
    deliveryResponse as never,
    'corr-lab-workflow-deliver',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );
  assert.equal(deliveryHandled, true);
  const deliveryPayload = deliveryResponse.bodyJson<{
    status: string;
    deliveredAt?: string;
    deliveredByUserId?: string;
    deliveryChannel?: string;
  }>();
  assert.equal(deliveryPayload.status, 'delivered');
  assert.ok(deliveryPayload.deliveredAt);
  assert.equal(deliveryPayload.deliveredByUserId, 'user-1');
  assert.equal(deliveryPayload.deliveryChannel, 'portal');

  const listResponse = new MockResponse();
  await handleLaboratoryRoutes(
    '/laboratory/orders',
    { method: 'GET', url: '/laboratory/orders' } as never,
    listResponse as never,
    'corr-lab-workflow-list',
    {
      laboratory,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );
  assert.equal(listResponse.bodyJson<{ items: Array<{ id: string; status: string }> }>().items.find(
    (item) => item.id === openOrder.id
  )?.status, 'delivered');
});

test('handleLaboratoryRoutes requires an enabled staff principal for laboratory signatures', async () => {
  const laboratory = createLaboratoryService();
  const order = (await laboratory.listOrders('acc-1' as never, 'enc-1')).find(
    (item) => item.status === 'requested'
  );
  assert.ok(order);
  await laboratory.transitionOrderAndPersistForAccount('acc-1' as never, order.id, {
    status: 'collected',
    collectedByUserId: 'user-1'
  });
  await laboratory.transitionOrderAndPersistForAccount('acc-1' as never, order.id, {
    status: 'in_analysis',
    actorUserId: 'user-1'
  });
  const inactivePrincipal: AuthenticatedPrincipal = {
    ...createPrincipal(),
    staff: {
      ...createPrincipal().staff!,
      status: 'inactive'
    }
  };

  await assert.rejects(
    () => handleLaboratoryRoutes(
      `/laboratory/orders/${order.id}/result`,
      createMockRequest('POST', `/laboratory/orders/${order.id}/result`, {
        status: 'reported',
        resultSummary: 'Sem staff habilitado',
        signedByUserId: 'attacker'
      }) as never,
      new MockResponse() as never,
      'corr-lab-disabled-staff',
      {
        laboratory,
        audit: { write: () => ({}) } as never,
        requirePrincipal: () => inactivePrincipal
      }
    ),
    /staff|professional|habilitado|active/i
  );
});

test('handleLaboratoryRoutes generates printable signed laboratory report html', async () => {
  const laboratory = createLaboratoryService();
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
  const laboratory = createLaboratoryService();
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
  const laboratory = createLaboratoryService();
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
  const laboratory = createLaboratoryService();
  const urinalysisOrder = laboratory.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Urina',
    examCatalogId: 'cat_003',
    reason: 'Suspeita urinaria'
  });
  laboratory.recordResult(urinalysisOrder.id, {
    status: 'collected',
    collectedByUserId: 'lab-user'
  });
  laboratory.recordResult(urinalysisOrder.id, {
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
  const laboratory = createLaboratoryService();
  const biochemistryOrder = laboratory.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Bioquimico',
    examCatalogId: 'cat_002',
    reason: 'Perfil bioquimico'
  });
  laboratory.recordResult(biochemistryOrder.id, {
    status: 'collected',
    collectedByUserId: 'lab-user'
  });
  laboratory.recordResult(biochemistryOrder.id, {
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
  const laboratory = createLaboratoryService();
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
  const laboratory = createLaboratoryService();
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
  const laboratory = createLaboratoryService();
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
  const laboratory = createLaboratoryService();
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
