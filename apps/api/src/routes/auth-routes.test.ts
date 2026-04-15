import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import {
  createInMemoryOidcStateStore,
  createStatelessOidcStateStore,
  handleAuthRoutes
} from './auth-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #headers = new Map<string, string>();
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

test('handleAuthRoutes returns the current authenticated session payload', async () => {
  const principal = createPrincipal();
  const response = new MockResponse();
  let auditEntry: { action: string; entityId: string; correlationId: string } | undefined;

  const handled = await handleAuthRoutes(
    '/auth/session',
    { method: 'GET', url: '/auth/session' } as never,
    response as never,
    'corr-auth-1',
    {
      auth: {} as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
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

test('handleAuthRoutes ignores unrelated routes', async () => {
  const response = new MockResponse();

  const handled = await handleAuthRoutes(
    '/owners',
    { method: 'GET', url: '/owners', headers: {}, socket: { remoteAddress: '127.0.0.1' } } as never,
    response as never,
    'corr-auth-2',
    {
      auth: {} as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => createPrincipal(),
      appendAudit: () => {}
    }
  );

  assert.equal(handled, false);
});

test('handleAuthRoutes POST /auth/login returns a session on success', async () => {
  const response = new MockResponse();

  const handled = await handleAuthRoutes(
    '/auth/login',
    {
      method: 'POST',
      url: '/auth/login',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ username: 'admin', password: 'secret' }));
      }
    } as never,
    response as never,
    'corr-auth-3',
    {
      auth: {
        login: async () => ({ accessToken: 'token-1', refreshToken: 'refresh-1' })
      } as never,
      authRateLimiter: {
        check: async () => ({
          limit: 5,
          remaining: 4,
          reset: 123,
          blocked: false,
          retryAfterMs: 0
        })
      },
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => createPrincipal(),
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.getHeader('x-ratelimit-limit'), '5');
  assert.equal(response.bodyJson<{ accessToken: string }>().accessToken, 'token-1');
});

test('handleAuthRoutes POST /auth/login returns 429 when rate limited', async () => {
  const response = new MockResponse();

  const handled = await handleAuthRoutes(
    '/auth/login',
    {
      method: 'POST',
      url: '/auth/login',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {}
    } as never,
    response as never,
    'corr-auth-4',
    {
      auth: {} as never,
      authRateLimiter: {
        check: async () => ({
          limit: 5,
          remaining: 0,
          reset: 123,
          blocked: true,
          retryAfterMs: 30_000
        })
      },
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => createPrincipal(),
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 429);
  assert.equal(response.getHeader('retry-after'), '30');
  assert.equal(response.bodyJson<{ code: string }>().code, 'RATE_LIMITED');
});

test('handleAuthRoutes GET /auth/oidc/login emits a stateless signed state when distributed mode is enabled', async () => {
  const response = new MockResponse();
  const oidcStateStore = createStatelessOidcStateStore('oidc-test-secret');

  const handled = await handleAuthRoutes(
    '/auth/oidc/login',
    {
      method: 'GET',
      url: '/auth/oidc/login',
      headers: {
        host: 'localhost',
        'x-oidc-redirect-uri': 'https://app.example.com/auth/callback'
      },
      socket: { remoteAddress: '127.0.0.1' }
    } as never,
    response as never,
    'corr-auth-oidc-login',
    {
      auth: {} as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: true,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      oidcConfig: {
        issuer: 'https://issuer.example.com',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'https://app.example.com/auth/callback',
        scope: 'openid profile email',
        authorizationEndpoint: 'https://issuer.example.com/auth',
        tokenEndpoint: 'https://issuer.example.com/token',
        userinfoEndpoint: 'https://issuer.example.com/userinfo',
        endSessionEndpoint: 'https://issuer.example.com/logout'
      },
      oidcStateStore,
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => createPrincipal(),
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 302);
  const location = response.getHeader('location');
  assert.ok(location);
  const redirect = new URL(location);
  const state = redirect.searchParams.get('state');
  assert.ok(state);
  const stored = oidcStateStore.consume(state);
  assert.equal(stored?.redirectUri, 'https://app.example.com/auth/callback');
  assert.equal(typeof stored?.codeVerifier, 'string');
  assert.equal(typeof stored?.codeChallenge, 'string');
});

test('handleAuthRoutes GET /auth/oidc/callback rejects tampered stateless state', async () => {
  const response = new MockResponse();
  const oidcStateStore = createStatelessOidcStateStore('oidc-test-secret');
  const state = oidcStateStore.create({
    codeChallenge: 'challenge-1',
    codeVerifier: 'verifier-1',
    redirectUri: 'https://app.example.com/auth/callback',
    createdAt: Date.now()
  });
  const tamperedState = `${state.slice(0, -1)}${state.endsWith('a') ? 'b' : 'a'}`;

  const handled = await handleAuthRoutes(
    '/auth/oidc/callback',
    {
      method: 'GET',
      url: `/auth/oidc/callback?code=oidc-code&state=${encodeURIComponent(tamperedState)}`,
      headers: { host: 'localhost' },
      socket: { remoteAddress: '127.0.0.1' }
    } as never,
    response as never,
    'corr-auth-oidc-callback',
    {
      auth: {} as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: true,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      oidcConfig: {
        issuer: 'https://issuer.example.com',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'https://app.example.com/auth/callback',
        scope: 'openid profile email',
        authorizationEndpoint: 'https://issuer.example.com/auth',
        tokenEndpoint: 'https://issuer.example.com/token',
        userinfoEndpoint: 'https://issuer.example.com/userinfo',
        endSessionEndpoint: 'https://issuer.example.com/logout'
      },
      oidcStateStore: createStatelessOidcStateStore('oidc-test-secret'),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => createPrincipal(),
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 400);
  assert.equal(response.bodyJson<{ code: string }>().code, 'INVALID_STATE');
});
