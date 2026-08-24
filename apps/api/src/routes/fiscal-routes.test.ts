import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { FiscalService } from '@cvg-his-v2/module-fiscal';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleFiscalRoutes } from './fiscal-routes.js';

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

  getHeader(name: string): string | undefined {
    return this.#headers.get(name.toLowerCase());
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
      permissionCodes: ['fiscal.read', 'fiscal.manage'],
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
        if (chunks.length === 0) {
          return { done: true, value: undefined };
        }
        return { done: false, value: chunks.shift()! };
      }
    })
  };
}

test('handleFiscalRoutes serves dashboard summary from the backend fiscal service', async () => {
  const response = new MockResponse();
  let requiredPermission = '';

  const handled = await handleFiscalRoutes(
    '/fiscal/summary',
    { method: 'GET', url: '/fiscal/summary' } as never,
    response as never,
    'corr-fiscal-1',
    {
      fiscal: new FiscalService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(handled, true);
  assert.equal(requiredPermission, 'fiscal.read');
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ cfopCount: number; icmsRules: number }>();
  assert.ok(payload.cfopCount > 0);
  assert.ok(payload.icmsRules > 0);
});

test('handleFiscalRoutes filters CFOP rows using query params', async () => {
  const response = new MockResponse();

  const handled = await handleFiscalRoutes(
    '/fiscal/cfop',
    {
      method: 'GET',
      url: '/fiscal/cfop?search=servi%C3%A7o&documentType=nfse&section=saida'
    } as never,
    response as never,
    'corr-fiscal-2',
    {
      fiscal: new FiscalService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ category: string; code: string }> }>();
  assert.ok(payload.items.length > 0);
  assert.ok(payload.items.every((item) => typeof item.code === 'string'));
  assert.ok(payload.items.some((item) => item.category === 'servico'));
});

test('handleFiscalRoutes creates and updates simple CFOP entries when enabled', async () => {
  const createResponse = new MockResponse();
  const updateResponse = new MockResponse();
  let requiredPermission = '';
  const fiscal = new FiscalService();

  const createdHandled = await handleFiscalRoutes(
    '/fiscal/cfop',
    createMockRequest('POST', '/fiscal/cfop', {
      code: '9.999',
      description: 'Operacao fiscal veterinaria',
      section: 'saida',
      category: 'servico',
      applicableTo: ['nfse']
    }) as never,
    createResponse as never,
    'corr-fiscal-cfop-create',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(createdHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(createResponse.statusCode, 201);
  const createdPayload = createResponse.bodyJson<{ code: string; documentTypesLabel: string }>();
  assert.equal(createdPayload.code, '9.999');
  assert.equal(createdPayload.documentTypesLabel, 'NFSE');

  const updatedHandled = await handleFiscalRoutes(
    `/fiscal/cfop/${encodeURIComponent(createdPayload.code)}`,
    createMockRequest('PATCH', `/fiscal/cfop/${encodeURIComponent(createdPayload.code)}`, {
      description: 'Operacao fiscal veterinaria atualizada',
      applicableTo: ['nfe']
    }) as never,
    updateResponse as never,
    'corr-fiscal-cfop-update',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(updatedHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(updateResponse.statusCode, 200);
  const updatedPayload = updateResponse.bodyJson<{ description: string; documentTypesLabel: string }>();
  assert.equal(updatedPayload.description, 'Operacao fiscal veterinaria atualizada');
  assert.equal(updatedPayload.documentTypesLabel, 'NFE');
});

test('handleFiscalRoutes filters simple ICMS, IPI, PIS, COFINS and NFS-e tables using real query params', async () => {
  const icmsResponse = new MockResponse();
  const ipiResponse = new MockResponse();
  const pisResponse = new MockResponse();
  const cofinsResponse = new MockResponse();
  const nfseResponse = new MockResponse();

  const icmsHandled = await handleFiscalRoutes(
    '/fiscal/icms',
    {
      method: 'GET',
      url: '/fiscal/icms?search=18'
    } as never,
    icmsResponse as never,
    'corr-fiscal-4',
    {
      fiscal: new FiscalService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  const ipiHandled = await handleFiscalRoutes(
    '/fiscal/ipi',
    {
      method: 'GET',
      url: '/fiscal/ipi?search=3%2C25'
    } as never,
    ipiResponse as never,
    'corr-fiscal-ipi-list',
    {
      fiscal: new FiscalService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  const pisHandled = await handleFiscalRoutes(
    '/fiscal/pis',
    {
      method: 'GET',
      url: '/fiscal/pis?search=0%2C65'
    } as never,
    pisResponse as never,
    'corr-fiscal-pis-list',
    {
      fiscal: new FiscalService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  const cofinsHandled = await handleFiscalRoutes(
    '/fiscal/cofins',
    {
      method: 'GET',
      url: '/fiscal/cofins?search=7%2C6'
    } as never,
    cofinsResponse as never,
    'corr-fiscal-cofins-list',
    {
      fiscal: new FiscalService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  const nfseHandled = await handleFiscalRoutes(
    '/fiscal/nfse',
    {
      method: 'GET',
      url: '/fiscal/nfse?search=ISS%20SP&state=SP&active=true'
    } as never,
    nfseResponse as never,
    'corr-fiscal-5',
    {
      fiscal: new FiscalService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(icmsHandled, true);
  assert.equal(ipiHandled, true);
  assert.equal(pisHandled, true);
  assert.equal(cofinsHandled, true);
  assert.equal(nfseHandled, true);

  const icmsPayload = icmsResponse.bodyJson<{
    items: Array<{ code: string; description: string; percent: number }>;
  }>();
  const ipiPayload = ipiResponse.bodyJson<{
    items: Array<{ code: string; description: string; percent: number }>;
  }>();
  const pisPayload = pisResponse.bodyJson<{
    items: Array<{ code: string; description: string; percent: number }>;
  }>();
  const cofinsPayload = cofinsResponse.bodyJson<{
    items: Array<{ code: string; description: string; percent: number }>;
  }>();
  const nfsePayload = nfseResponse.bodyJson<{
    items: Array<{ city: string; provider: string; municipalityCode: string; state: string; active: boolean }>;
  }>();

  assert.ok(icmsPayload.items.length > 0);
  assert.ok(icmsPayload.items.every((item) => `${item.code} ${item.description}`.includes('18')));
  assert.ok(ipiPayload.items.length > 0);
  assert.ok(ipiPayload.items.every((item) => `${item.code} ${item.description}`.includes('3,25')));
  assert.ok(pisPayload.items.length > 0);
  assert.ok(pisPayload.items.every((item) => `${item.code} ${item.description}`.includes('0,65')));
  assert.ok(cofinsPayload.items.length > 0);
  assert.ok(cofinsPayload.items.every((item) => `${item.code} ${item.description}`.includes('7,6')));
  assert.ok(nfsePayload.items.length > 0);
  assert.ok(nfsePayload.items.every((item) => item.state === 'SP'));
  assert.ok(nfsePayload.items.every((item) => item.active));
  assert.ok(nfsePayload.items.every((item) => `${item.city} ${item.provider} ${item.municipalityCode}`.includes('ISS SP')));
});

test('handleFiscalRoutes filters and creates ICMS state matrix entries', async () => {
  const listResponse = new MockResponse();
  const createResponse = new MockResponse();
  let requiredPermission = '';
  const fiscal = new FiscalService();

  const listHandled = await handleFiscalRoutes(
    '/fiscal/icms-matrix',
    {
      method: 'GET',
      url: '/fiscal/icms-matrix?search=RJ&ufOrigin=SP&operationType=interestadual'
    } as never,
    listResponse as never,
    'corr-fiscal-matrix-list',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(listHandled, true);
  assert.equal(requiredPermission, 'fiscal.read');
  assert.equal(listResponse.statusCode, 200);
  const listPayload = listResponse.bodyJson<{
    items: Array<{ id: string; ufOrigin: string; ufDestination: string; operationType: string }>;
  }>();
  assert.ok(listPayload.items.length > 0);
  assert.ok(listPayload.items.every((item) => item.ufOrigin === 'SP'));
  assert.ok(listPayload.items.every((item) => item.operationType === 'interestadual'));
  assert.ok(listPayload.items.every((item) => `${item.id} ${item.ufDestination}`.includes('RJ')));

  const createHandled = await handleFiscalRoutes(
    '/fiscal/icms-matrix',
    createMockRequest('POST', '/fiscal/icms-matrix', {
      ufOrigin: 'SP',
      ufDestination: 'BA',
      operationType: 'interestadual',
      rate: 7
    }) as never,
    createResponse as never,
    'corr-fiscal-matrix-create',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(createHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(createResponse.statusCode, 201);
  const createdPayload = createResponse.bodyJson<{
    ufOrigin: string;
    ufDestination: string;
    rate: number;
    operationType: string;
  }>();
  assert.equal(createdPayload.ufOrigin, 'SP');
  assert.equal(createdPayload.ufDestination, 'BA');
  assert.equal(createdPayload.rate, 7);
  assert.equal(createdPayload.operationType, 'interestadual');
});

test('handleFiscalRoutes creates and updates simple ICMS table entries when enabled', async () => {
  const createResponse = new MockResponse();
  const updateResponse = new MockResponse();
  let requiredPermission = '';
  const fiscal = new FiscalService();

  const createdHandled = await handleFiscalRoutes(
    '/fiscal/icms',
    createMockRequest('POST', '/fiscal/icms', {
      code: '20',
      description: 'ICMS 20%',
      percent: 20
    }) as never,
    createResponse as never,
    'corr-fiscal-icms-create',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(createdHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(createResponse.statusCode, 201);
  const createdPayload = createResponse.bodyJson<{ id: string; code: string; percent: number }>();
  assert.equal(createdPayload.code, '20');
  assert.equal(createdPayload.percent, 20);

  const updatedHandled = await handleFiscalRoutes(
    `/fiscal/icms/${createdPayload.id}`,
    createMockRequest('PATCH', `/fiscal/icms/${createdPayload.id}`, {
      description: 'ICMS interno 20%',
      percent: 20.5
    }) as never,
    updateResponse as never,
    'corr-fiscal-icms-update',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(updatedHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(updateResponse.statusCode, 200);
  const updatedPayload = updateResponse.bodyJson<{ description: string; percent: number }>();
  assert.equal(updatedPayload.description, 'ICMS interno 20%');
  assert.equal(updatedPayload.percent, 20.5);
});

test('handleFiscalRoutes creates and updates simple IPI table entries when enabled', async () => {
  const createResponse = new MockResponse();
  const updateResponse = new MockResponse();
  let requiredPermission = '';
  const fiscal = new FiscalService();

  const createdHandled = await handleFiscalRoutes(
    '/fiscal/ipi',
    createMockRequest('POST', '/fiscal/ipi', {
      code: '9',
      description: 'IPI 9%',
      percent: 9
    }) as never,
    createResponse as never,
    'corr-fiscal-ipi-create',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(createdHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(createResponse.statusCode, 201);
  const createdPayload = createResponse.bodyJson<{ id: string; code: string; percent: number }>();
  assert.equal(createdPayload.code, '9');
  assert.equal(createdPayload.percent, 9);

  const updatedHandled = await handleFiscalRoutes(
    `/fiscal/ipi/${createdPayload.id}`,
    createMockRequest('PATCH', `/fiscal/ipi/${createdPayload.id}`, {
      description: 'IPI interno 9%',
      percent: 9.5
    }) as never,
    updateResponse as never,
    'corr-fiscal-ipi-update',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(updatedHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(updateResponse.statusCode, 200);
  const updatedPayload = updateResponse.bodyJson<{ description: string; percent: number }>();
  assert.equal(updatedPayload.description, 'IPI interno 9%');
  assert.equal(updatedPayload.percent, 9.5);
});

test('handleFiscalRoutes creates and updates simple PIS table entries when enabled', async () => {
  const createResponse = new MockResponse();
  const updateResponse = new MockResponse();
  let requiredPermission = '';
  const fiscal = new FiscalService();

  const createdHandled = await handleFiscalRoutes(
    '/fiscal/pis',
    createMockRequest('POST', '/fiscal/pis', {
      code: '2',
      description: 'PIS 2%',
      percent: 2
    }) as never,
    createResponse as never,
    'corr-fiscal-pis-create',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(createdHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(createResponse.statusCode, 201);
  const createdPayload = createResponse.bodyJson<{ id: string; code: string; percent: number }>();
  assert.equal(createdPayload.code, '2');
  assert.equal(createdPayload.percent, 2);

  const updatedHandled = await handleFiscalRoutes(
    `/fiscal/pis/${createdPayload.id}`,
    createMockRequest('PATCH', `/fiscal/pis/${createdPayload.id}`, {
      description: 'PIS interno 2%',
      percent: 2.1
    }) as never,
    updateResponse as never,
    'corr-fiscal-pis-update',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(updatedHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(updateResponse.statusCode, 200);
  const updatedPayload = updateResponse.bodyJson<{ description: string; percent: number }>();
  assert.equal(updatedPayload.description, 'PIS interno 2%');
  assert.equal(updatedPayload.percent, 2.1);
});

test('handleFiscalRoutes creates and updates simple COFINS table entries when enabled', async () => {
  const createResponse = new MockResponse();
  const updateResponse = new MockResponse();
  let requiredPermission = '';
  const fiscal = new FiscalService();

  const createdHandled = await handleFiscalRoutes(
    '/fiscal/cofins',
    createMockRequest('POST', '/fiscal/cofins', {
      code: '4',
      description: 'COFINS 4%',
      percent: 4
    }) as never,
    createResponse as never,
    'corr-fiscal-cofins-create',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(createdHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(createResponse.statusCode, 201);
  const createdPayload = createResponse.bodyJson<{ id: string; code: string; percent: number }>();
  assert.equal(createdPayload.code, '4');
  assert.equal(createdPayload.percent, 4);

  const updatedHandled = await handleFiscalRoutes(
    `/fiscal/cofins/${createdPayload.id}`,
    createMockRequest('PATCH', `/fiscal/cofins/${createdPayload.id}`, {
      description: 'COFINS interno 4%',
      percent: 4.1
    }) as never,
    updateResponse as never,
    'corr-fiscal-cofins-update',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(updatedHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(updateResponse.statusCode, 200);
  const updatedPayload = updateResponse.bodyJson<{ description: string; percent: number }>();
  assert.equal(updatedPayload.description, 'COFINS interno 4%');
  assert.equal(updatedPayload.percent, 4.1);
});

test('handleFiscalRoutes lists, creates and updates simple IBS/CBS table entries when enabled', async () => {
  const listResponse = new MockResponse();
  const createResponse = new MockResponse();
  const updateResponse = new MockResponse();
  let requiredPermission = '';
  const fiscal = new FiscalService();

  const listHandled = await handleFiscalRoutes(
    '/fiscal/ibs-cbs',
    createMockRequest('GET', '/fiscal/ibs-cbs?search=basica') as never,
    listResponse as never,
    'corr-fiscal-ibs-cbs-list',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(listHandled, true);
  assert.equal(requiredPermission, 'fiscal.read');
  assert.equal(listResponse.statusCode, 200);

  const createdHandled = await handleFiscalRoutes(
    '/fiscal/ibs-cbs',
    createMockRequest('POST', '/fiscal/ibs-cbs', {
      code: 'TRANSICAO',
      description: 'Transicao 2026',
      ibsPercent: 0.1,
      cbsPercent: 0.9
    }) as never,
    createResponse as never,
    'corr-fiscal-ibs-cbs-create',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(createdHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(createResponse.statusCode, 201);
  const createdPayload = createResponse.bodyJson<{ id: string; code: string; ibsPercent: number; cbsPercent: number }>();
  assert.equal(createdPayload.code, 'TRANSICAO');
  assert.equal(createdPayload.ibsPercent, 0.1);
  assert.equal(createdPayload.cbsPercent, 0.9);

  const updatedHandled = await handleFiscalRoutes(
    `/fiscal/ibs-cbs/${createdPayload.id}`,
    createMockRequest('PATCH', `/fiscal/ibs-cbs/${createdPayload.id}`, {
      description: 'Transicao IBS/CBS revisada',
      ibsPercent: 0.2,
      cbsPercent: 0.8
    }) as never,
    updateResponse as never,
    'corr-fiscal-ibs-cbs-update',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(updatedHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(updateResponse.statusCode, 200);
  const updatedPayload = updateResponse.bodyJson<{ description: string; ibsPercent: number; cbsPercent: number }>();
  assert.equal(updatedPayload.description, 'Transicao IBS/CBS revisada');
  assert.equal(updatedPayload.ibsPercent, 0.2);
  assert.equal(updatedPayload.cbsPercent, 0.8);
});

test('handleFiscalRoutes creates and updates NFS-e layouts when fiscal backoffice is enabled', async () => {
  const createResponse = new MockResponse();
  const updateResponse = new MockResponse();
  let requiredPermission = '';
  const fiscal = new FiscalService();

  const createdHandled = await handleFiscalRoutes(
    '/fiscal/nfse',
    createMockRequest('POST', '/fiscal/nfse', {
      city: 'Campinas',
      state: 'SP',
      municipalityCode: '3509502',
      provider: 'ISS Campinas',
      version: 'v1',
      active: false,
      environment: 'homologacao',
      serviceCode: '0407',
      serviceFocus: 'Expansão interior'
    }) as never,
    createResponse as never,
    'corr-fiscal-6',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: (_request, permissionCode) => {
        requiredPermission = permissionCode;
        return createPrincipal();
      },
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(createdHandled, true);
  assert.equal(requiredPermission, 'fiscal.manage');
  assert.equal(createResponse.statusCode, 201);
  const createdPayload = createResponse.bodyJson<{ id: string; city: string; active: boolean }>();
  assert.equal(createdPayload.city, 'Campinas');
  assert.equal(createdPayload.active, false);

  const updatedHandled = await handleFiscalRoutes(
    `/fiscal/nfse/${createdPayload.id}`,
    createMockRequest('PATCH', `/fiscal/nfse/${createdPayload.id}`, {
      active: true,
      environment: 'producao'
    }) as never,
    updateResponse as never,
    'corr-fiscal-7',
    {
      fiscal,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(updatedHandled, true);
  assert.equal(updateResponse.statusCode, 200);
  const updatedPayload = updateResponse.bodyJson<{ active: boolean; environment: string }>();
  assert.equal(updatedPayload.active, true);
  assert.equal(updatedPayload.environment, 'producao');
});

test('handleFiscalRoutes executes complete NFSe document lifecycle', async () => {
  const response = new MockResponse();
  const service = new FiscalService(undefined, undefined, { allowNfseSimulation: true });

  const createHandled = await handleFiscalRoutes(
    '/fiscal/nfse/documents',
    createMockRequest('POST', '/fiscal/nfse/documents', {
      competencia: '2026-04-17',
      serie: '001',
      numero: 1001,
      provider: 'abrasf',
      customer: {
        type: 'cnpj',
        document: '12345678000199',
        name: 'Clinica Teste S/A',
        email: 'finance@fiscal.test',
        phone: '+55 11 99999-0000'
      },
      services: [
        {
          description: 'Servico veterinario completo',
          codigoServico: '0407',
          cnae: '7500-1/00',
          quantity: 1,
          unitValue: 120,
          totalValue: 120,
          issRate: 0.05,
          issValue: 6,
          pisValue: 0,
          cofinsValue: 0,
          csllValue: 0,
          irrfValue: 0,
          inssValue: 0
        }
      ]
    }) as never,
    response as never,
    'corr-fiscal-9',
    {
      fiscal: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(createHandled, true);
  assert.equal(response.statusCode, 201);
  const createdPayload = response.bodyJson<{ id: string; status: string }>();
  assert.equal(createdPayload.status, 'draft');

  const listResponse = new MockResponse();
  const listHandled = await handleFiscalRoutes(
    '/fiscal/nfse/documents',
    {
      method: 'GET',
      url: '/fiscal/nfse/documents?status=draft'
    } as never,
    listResponse as never,
    'corr-fiscal-10',
    {
      fiscal: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(listHandled, true);
  const listPayload = listResponse.bodyJson<{ items: Array<{ id: string; status: string }> }>();
  const listed = listPayload.items.find((item) => item.id === createdPayload.id);
  assert.ok(listed);

  const getResponse = new MockResponse();
  const getHandled = await handleFiscalRoutes(
    `/fiscal/nfse/documents/${createdPayload.id}`,
    {
      method: 'GET',
      url: `/fiscal/nfse/documents/${createdPayload.id}`
    } as never,
    getResponse as never,
    'corr-fiscal-11',
    {
      fiscal: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(getHandled, true);
  const documentPayload = getResponse.bodyJson<{ status: string }>();
  assert.equal(documentPayload.status, 'draft');

  const issuedResponse = new MockResponse();
  const issueHandled = await handleFiscalRoutes(
    `/fiscal/nfse/documents/${createdPayload.id}/issue`,
    {
      method: 'POST',
      url: `/fiscal/nfse/documents/${createdPayload.id}/issue`
    } as never,
    issuedResponse as never,
    'corr-fiscal-12',
    {
      fiscal: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(issueHandled, true);
  assert.equal(issuedResponse.statusCode, 200);
  const issuedPayload = issuedResponse.bodyJson<{ status: string; authorizationCode: string }>();
  assert.equal(issuedPayload.status, 'issued');
  assert.ok(issuedPayload.authorizationCode);

  const cancelResponse = new MockResponse();
  const cancelHandled = await handleFiscalRoutes(
    `/fiscal/nfse/documents/${createdPayload.id}/cancel`,
    createMockRequest('POST', `/fiscal/nfse/documents/${createdPayload.id}/cancel`, {
      reason: 'Cancelamento operacional'
    }) as never,
    cancelResponse as never,
    'corr-fiscal-13',
    {
      fiscal: service,
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(cancelHandled, true);
  assert.equal(cancelResponse.statusCode, 200);
  const cancelledPayload = cancelResponse.bodyJson<{ status: string }>();
  assert.equal(cancelledPayload.status, 'cancelled');
});

test('handleFiscalRoutes returns a safe provider error after persisting an unauthorized NFS-e response', async () => {
  const service = new FiscalService(undefined, undefined, {
    allowNfseSimulation: false,
    nfse: {
      provider: 'abrasf',
      apiUrl: 'https://municipal.example.test/nfse',
      municipalityCode: '3550308',
      apiKey: 'test-only-token'
    }
  });
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: false,
    status: 401,
    text: async () => 'municipal-private-secret',
    headers: new Headers()
  })) as unknown as typeof fetch;

  try {
    const createResponse = new MockResponse();
    await handleFiscalRoutes(
      '/fiscal/nfse/documents',
      createMockRequest('POST', '/fiscal/nfse/documents', {
        numero: 1999,
        provider: 'abrasf',
        customer: {
          type: 'cpf',
          document: '12345678909',
          name: 'Cliente Fiscal'
        },
        services: [{
          description: 'Consulta',
          codigoServico: '0407',
          cnae: '7500-1/00',
          quantity: 1,
          unitValue: 100,
          totalValue: 100,
          issRate: 0.05,
          issValue: 5,
          pisValue: 0,
          cofinsValue: 0,
          csllValue: 0
        }]
      }) as never,
      createResponse as never,
      'corr-fiscal-provider-error-create',
      {
        fiscal: service,
        audit: { write: () => ({}) } as never,
        requirePrincipal: () => createPrincipal(),
        fiscalBackofficeEnabled: true
      }
    );
    const created = createResponse.bodyJson<{ id: string; status: string }>();
    assert.equal(created.status, 'draft');

    const issueResponse = new MockResponse();
    const handled = await handleFiscalRoutes(
      `/fiscal/nfse/documents/${created.id}/issue`,
      createMockRequest('POST', `/fiscal/nfse/documents/${created.id}/issue`) as never,
      issueResponse as never,
      'corr-fiscal-provider-error-issue',
      {
        fiscal: service,
        audit: { write: () => ({}) } as never,
        requirePrincipal: () => createPrincipal(),
        fiscalBackofficeEnabled: true
      }
    );

    assert.equal(handled, true);
    assert.equal(issueResponse.statusCode, 502);
    const payload = issueResponse.bodyJson<{
      code: string;
      message: string;
      document: { status: string; observations?: string };
    }>();
    assert.equal(payload.code, 'NFSE_PROVIDER_ERROR');
    assert.equal(payload.message, 'NFS-e provider did not authorize the document');
    assert.equal(payload.document.status, 'error');
    assert.match(payload.document.observations ?? '', /HTTP 401/);
    assert.doesNotMatch(JSON.stringify(payload), /municipal-private-secret|test-only-token/);

    const getResponse = new MockResponse();
    await handleFiscalRoutes(
      `/fiscal/nfse/documents/${created.id}`,
      createMockRequest('GET', `/fiscal/nfse/documents/${created.id}`) as never,
      getResponse as never,
      'corr-fiscal-provider-error-get',
      {
        fiscal: service,
        audit: { write: () => ({}) } as never,
        requirePrincipal: () => createPrincipal(),
        fiscalBackofficeEnabled: true
      }
    );
    assert.equal(getResponse.bodyJson<{ status: string }>().status, 'error');
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('handleFiscalRoutes blocks write operations when fiscal backoffice flag is disabled', async () => {
  const response = new MockResponse();

  const handled = await handleFiscalRoutes(
    '/fiscal/nfse',
    createMockRequest('POST', '/fiscal/nfse', {
      city: 'Santos',
      state: 'SP',
      provider: 'ISS Santos',
      version: 'v1',
      environment: 'homologacao'
    }) as never,
    response as never,
    'corr-fiscal-8',
    {
      fiscal: new FiscalService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: false
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 403);
  const payload = response.bodyJson<{ code: string }>();
  assert.equal(payload.code, 'FLAG_DISABLED');
});

test('handleFiscalRoutes ignores unrelated paths', async () => {
  const response = new MockResponse();

  const handled = await handleFiscalRoutes(
    '/inventory',
    { method: 'GET', url: '/inventory' } as never,
    response as never,
    'corr-fiscal-3',
    {
      fiscal: new FiscalService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal(),
      fiscalBackofficeEnabled: true
    }
  );

  assert.equal(handled, false);
});
