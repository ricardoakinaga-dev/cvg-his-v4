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
      permissionCodes: ['fiscal.read'],
      capabilities: []
    }
  };
}

test('handleFiscalRoutes serves dashboard summary from the backend fiscal service', () => {
  const response = new MockResponse();
  let requiredPermission = '';

  const handled = handleFiscalRoutes(
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
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(requiredPermission, 'fiscal.read');
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ cfopCount: number; icmsRules: number }>();
  assert.ok(payload.cfopCount > 0);
  assert.ok(payload.icmsRules > 0);
});

test('handleFiscalRoutes filters CFOP rows using query params', () => {
  const response = new MockResponse();

  const handled = handleFiscalRoutes(
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
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ category: string; code: string }> }>();
  assert.ok(payload.items.length > 0);
  assert.ok(payload.items.every((item) => typeof item.code === 'string'));
  assert.ok(payload.items.some((item) => item.category === 'servico'));
});

test('handleFiscalRoutes filters ICMS and NFS-e tables using real query params', () => {
  const icmsResponse = new MockResponse();
  const nfseResponse = new MockResponse();

  const icmsHandled = handleFiscalRoutes(
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
      requirePrincipal: () => createPrincipal()
    }
  );

  const nfseHandled = handleFiscalRoutes(
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
      requirePrincipal: () => createPrincipal()
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

test('handleFiscalRoutes ignores unrelated paths', () => {
  const response = new MockResponse();

  const handled = handleFiscalRoutes(
    '/inventory',
    { method: 'GET', url: '/inventory' } as never,
    response as never,
    'corr-fiscal-3',
    {
      fiscal: new FiscalService(),
      audit: { write: () => ({}) } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, false);
});
