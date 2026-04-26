import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal, WebhookSummary } from '@cvg-his-v2/shared-types';

import { handleWebhooksRoutes } from './webhooks-routes.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;

  constructor(input: { method: string; url: string }) {
    super();
    this.method = input.method;
    this.url = input.url;
  }

  _read(): void {
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
  const now = new Date().toISOString();
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc_cvg_demo' as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc_cvg_demo' as never,
      createdAt: now,
      expiresAt: now,
      authTime: now,
      refreshExpiresAt: now,
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['webhooks.read', 'webhooks.manage'],
      capabilities: []
    }
  };
}

function createWebhook(id: string, input: Partial<WebhookSummary>): WebhookSummary {
  const now = new Date().toISOString();
  return {
    id: id as never,
    accountId: 'acc_cvg_demo' as never,
    url: 'https://hooks.example.com/cvg',
    events: ['patient.created'],
    secret: 'must-not-leak',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...input
  };
}

test('handleWebhooksRoutes lists webhooks with Vetus-like filters and redacts secret', async () => {
  const response = new MockResponse();
  const list = test.mock.fn(async () => [
    createWebhook('wh-1', {
      url: 'https://hooks.example.com/cvg',
      events: ['patient.created', 'encounter.created']
    }),
    createWebhook('wh-2', {
      url: 'https://billing.example.com/cvg',
      events: ['billing.record.created'],
      isActive: false
    })
  ]);

  const handled = await handleWebhooksRoutes(
    '/webhooks',
    new MockRequest({
      method: 'GET',
      url: '/webhooks?url=hooks.example.com&event=patient&active=true'
    }) as never,
    response as never,
    'corr-webhooks-list',
    {
      webhooks: { list } as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<WebhookSummary & { secret?: string }> }>();
  assert.deepEqual(payload.items.map((item) => item.id), ['wh-1']);
  assert.equal(payload.items[0]?.secret, undefined);
});

test('handleWebhooksRoutes accepts Vetus-like collection aliases', async () => {
  const response = new MockResponse();
  const list = test.mock.fn(async () => []);

  const handled = await handleWebhooksRoutes(
    '/cadastros/webhooks',
    new MockRequest({ method: 'GET', url: '/cadastros/webhooks' }) as never,
    response as never,
    'corr-webhooks-alias',
    {
      webhooks: { list } as never,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), { items: [] });
});
