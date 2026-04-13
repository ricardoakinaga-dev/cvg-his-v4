import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleAuthRoutes } from './auth-routes.js';

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
      accountId: 'acc-1' as never,
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
      accountId: 'acc-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['auth.session.read'],
      capabilities: []
    }
  };
}

test('handleAuthRoutes returns the current authenticated session payload', () => {
  const principal = createPrincipal();
  const response = new MockResponse();
  let auditEntry: { action: string; entityId: string; correlationId: string } | undefined;

  const handled = handleAuthRoutes(
    '/auth/session',
    { method: 'GET', url: '/auth/session' } as never,
    response as never,
    'corr-auth-1',
    {
      requirePrincipal: () => principal,
      appendAudit: (
        _actorId,
        _accountId,
        _module,
        action,
        _entityType,
        entityId,
        _payloadSummary,
        _riskLevel,
        correlationId
      ) => {
        auditEntry = { action, entityId, correlationId };
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), {
    session: principal.session,
    access: principal.access,
    principal
  });
  assert.deepEqual(auditEntry, {
    action: 'session_read',
    entityId: principal.session.sessionId,
    correlationId: 'corr-auth-1'
  });
});

test('handleAuthRoutes ignores unrelated routes', () => {
  const response = new MockResponse();

  const handled = handleAuthRoutes(
    '/auth/login',
    { method: 'POST', url: '/auth/login' } as never,
    response as never,
    'corr-auth-2',
    {
      requirePrincipal: () => createPrincipal(),
      appendAudit: () => {}
    }
  );

  assert.equal(handled, false);
});
