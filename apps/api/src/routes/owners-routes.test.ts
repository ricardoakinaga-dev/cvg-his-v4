import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { OwnersService } from '@cvg-his-v2/module-owners';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleOwnersRoutes } from './owners-routes.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  readonly #body: Buffer;
  #sent = false;

  constructor(input: { method: string; url: string; body?: Record<string, unknown> }) {
    super();
    this.method = input.method;
    this.url = input.url;
    this.#body = Buffer.from(input.body ? JSON.stringify(input.body) : '', 'utf8');
  }

  _read(): void {
    if (this.#sent) {
      this.push(null);
      return;
    }

    this.#sent = true;
    if (this.#body.length > 0) {
      this.push(this.#body);
    }
    this.push(null);
  }
}

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

function createPrincipal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc_cvg_demo' as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc_cvg_demo' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['owners.read', 'owners.manage'],
      capabilities: []
    }
  };
}

test('handleOwnersRoutes GET /owners lists filtered owners', async () => {
  const response = new MockResponse();

  const handled = await handleOwnersRoutes(
    '/owners',
    new MockRequest({
      method: 'GET',
      url: '/owners?financialResponsible=true'
    }) as never,
    response as never,
    'corr-owners-1',
    {
      owners: new OwnersService(),
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ id: string; financialResponsible: boolean }> }>();
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0]?.id, 'owner_maria_silva');
  assert.equal(payload.items[0]?.financialResponsible, true);
});

test('handleOwnersRoutes POST /owners creates a new owner', async () => {
  const response = new MockResponse();
  const owners = new OwnersService();

  const handled = await handleOwnersRoutes(
    '/owners',
    new MockRequest({
      method: 'POST',
      url: '/owners',
      body: {
        fullName: 'Ana Martins',
        documentId: '333.333.333-33',
        contacts: [
          {
            label: 'Celular',
            value: '+55 11 97777-3333',
            type: 'whatsapp',
            primary: true
          }
        ],
        financialResponsible: true
      }
    }) as never,
    response as never,
    'corr-owners-2',
    {
      owners,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  const payload = response.bodyJson<{ id: string; fullName: string }>();
  assert.equal(payload.fullName, 'Ana Martins');
  assert.equal(owners.list('Ana Martins').length, 1);
});
