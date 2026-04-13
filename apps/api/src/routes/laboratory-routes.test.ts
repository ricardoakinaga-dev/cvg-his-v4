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
    } as never
  );

  diagnostics.createOrder({
    encounterId: 'enc-1',
    patientId: 'pat-1',
    examType: 'Hemograma',
    examCatalogId: 'cat_001',
    reason: 'Check-up'
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
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].encounterId, 'enc-1');
});
