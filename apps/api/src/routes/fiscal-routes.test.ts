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

test('handleFiscalRoutes filters ICMS and NFS-e tables using real query params', async () => {
  const icmsResponse = new MockResponse();
  const nfseResponse = new MockResponse();

  const icmsHandled = await handleFiscalRoutes(
    '/fiscal/icms',
    {
      method: 'GET',
      url: '/fiscal/icms?ufDestination=RJ&operationType=interestadual'
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

  const nfseHandled = await handleFiscalRoutes(
    '/fiscal/nfse',
    {
      method: 'GET',
      url: '/fiscal/nfse?state=SP&active=true'
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
  assert.equal(nfseHandled, true);

  const icmsPayload = icmsResponse.bodyJson<{
    items: Array<{ ufDestination: string; operationType: string }>;
  }>();
  const nfsePayload = nfseResponse.bodyJson<{
    items: Array<{ state: string; active: boolean }>;
  }>();

  assert.ok(icmsPayload.items.length > 0);
  assert.ok(icmsPayload.items.every((item) => item.ufDestination === 'RJ'));
  assert.ok(icmsPayload.items.every((item) => item.operationType === 'interestadual'));
  assert.ok(nfsePayload.items.length > 0);
  assert.ok(nfsePayload.items.every((item) => item.state === 'SP'));
  assert.ok(nfsePayload.items.every((item) => item.active));
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
  const service = new FiscalService();

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
