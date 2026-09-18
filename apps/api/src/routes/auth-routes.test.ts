import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { OIDCConfig } from '@cvg-his-v2/module-auth';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import {
  createInMemoryOidcStateStore,
  createStatelessOidcStateStore,
  getClientIp,
  handleAuthRoutes
} from './auth-routes.js';

const DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS = 60_000;

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

  bodyText(): string {
    return Buffer.concat(this.#chunks).toString('utf8');
  }

  bodyJson<T>(): T {
    return JSON.parse(this.bodyText()) as T;
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

function createSingleAttemptRateLimiter() {
  const attempts = new Map<string, number>();

  return {
    check: async (input: {
      ip: string;
      route: string;
      accountId?: string;
      userId?: string;
      tenantId?: string;
    }) => {
      const key = JSON.stringify(input);
      const count = (attempts.get(key) ?? 0) + 1;
      attempts.set(key, count);
      return {
        limit: 1,
        remaining: count > 1 ? 0 : 1 - count,
        reset: Date.now() + 60_000,
        blocked: count > 1,
        retryAfterMs: count > 1 ? 60_000 : 0
      };
    }
  };
}

function createJsonRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
  remoteAddress = '127.0.0.1'
) {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
  return {
    method,
    url,
    headers,
    socket: { remoteAddress },
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) yield chunk;
    }
  } as never;
}

function createBaseAuthHandlers(overrides: Record<string, unknown> = {}) {
  return {
    auth: {},
    authRateLimiter: {
      check: async () => ({
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60_000,
        blocked: false,
        retryAfterMs: 0
      })
    },
    logger: { error: () => {} },
    appName: 'test-app',
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false },
    webauthnChallenges: new Map(),
    webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
    oidcConfig: null,
    oidcStateStore: createInMemoryOidcStateStore(),
    oidcStateTtlMs: 60_000,
    requirePrincipal: () => createPrincipal(),
    appendAudit: () => {},
    ...overrides
  } as never;
}

function createOidcConfig(overrides: Record<string, unknown> = {}) {
  return {
    issuer: 'https://issuer.example.com',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'https://app.example.com/auth/callback',
    scope: 'openid profile email',
    authorizationEndpoint: 'https://issuer.example.com/auth',
    tokenEndpoint: 'https://issuer.example.com/token',
    userinfoEndpoint: 'https://issuer.example.com/userinfo',
    ...overrides
  } as OIDCConfig;
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
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
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

test('handleAuthRoutes returns the current user session list', async () => {
  const principal = createPrincipal();
  const response = new MockResponse();
  const persistedSession = {
    ...principal.session,
    roleCodes: ['admin'],
    refreshNonce: 'refresh-nonce-must-not-leak',
    revokedAt: undefined
  };
  let auditEntry:
    | {
        action: string;
        entityId: string;
        payloadSummary: string;
        correlationId: string;
      }
    | undefined;

  const handled = await handleAuthRoutes(
    '/auth/sessions',
    { method: 'GET', url: '/auth/sessions', headers: {} } as never,
    response as never,
    'corr-auth-sessions',
    {
      auth: {
        listSessionsForUserAuthoritative: async () => [persistedSession]
      } as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
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
        payloadSummary,
        _riskLevel,
        correlationId
      ) => {
        auditEntry = { action, entityId, payloadSummary, correlationId };
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), { items: [principal.session] });
  assert.deepEqual(auditEntry, {
    action: 'session_list',
    entityId: principal.session.sessionId,
    payloadSummary: 'Listed 1 sessions',
    correlationId: 'corr-auth-sessions'
  });
});

test('handleAuthRoutes prefers the authoritative session list when available', async () => {
  const principal = createPrincipal();
  const response = new MockResponse();
  const persistedSession = {
    ...principal.session,
    roleCodes: ['admin'],
    refreshNonce: 'refresh-nonce-must-not-leak',
    revokedAt: '2026-08-30T12:00:00.000Z'
  };
  let authoritativeCall: { userId: string; correlationId: string } | undefined;

  const handled = await handleAuthRoutes(
    '/auth/sessions',
    { method: 'GET', url: '/auth/sessions', headers: {} } as never,
    response as never,
    'corr-auth-authoritative-sessions',
    {
      auth: {
        listSessionsForUserAuthoritative: async (userId: string, correlationId: string) => {
          authoritativeCall = { userId, correlationId };
          return [persistedSession];
        },
        listSessionsForUser: () => {
          throw new Error('stale cache path must not be used');
        }
      } as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => principal,
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(authoritativeCall, {
    userId: principal.user.id,
    correlationId: 'corr-auth-authoritative-sessions'
  });
  assert.deepEqual(response.bodyJson(), { items: [principal.session] });
});

test('handleAuthRoutes propagates authoritative session-list failures without stale response or audit', async () => {
  const principal = createPrincipal();
  const response = new MockResponse();
  let auditCalls = 0;

  await assert.rejects(
    () =>
      handleAuthRoutes(
        '/auth/sessions',
        { method: 'GET', url: '/auth/sessions', headers: {} } as never,
        response as never,
        'corr-auth-authoritative-sessions-failure',
        {
          auth: {
            listSessionsForUserAuthoritative: async () => {
              throw new Error('session repository unavailable');
            }
          } as never,
          authRateLimiter: {} as never,
          logger: { error: () => {} },
          appName: 'test-app',
          featureFlags: {
            authOidcEnabled: false,
            authWebauthnEnabled: false
          },
          webauthnChallenges: new Map(),
          webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
          oidcConfig: null,
          oidcStateStore: createInMemoryOidcStateStore(),
          oidcStateTtlMs: 60_000,
          requirePrincipal: () => principal,
          appendAudit: () => {
            auditCalls += 1;
          }
        }
      ),
    /session repository unavailable/
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.bodyText(), '');
  assert.equal(auditCalls, 0);
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
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
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
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
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
  assert.equal(
    response.bodyJson<{ accessToken: string; refreshToken?: string }>().accessToken,
    'token-1'
  );
  assert.equal(response.bodyJson<{ refreshToken?: string }>().refreshToken, undefined);
  assert.match(String(response.getHeader('set-cookie')), /cvg_his_refresh=refresh-1/);
  assert.match(String(response.getHeader('set-cookie')), /HttpOnly/);
  assert.match(String(response.getHeader('set-cookie')), /SameSite=Strict/);
});

test('handleAuthRoutes rejects malformed and oversized login payloads before authentication', async () => {
  const cases: readonly { label: string; payload: unknown }[] = [
    { label: 'null body', payload: null },
    { label: 'array body', payload: [] },
    { label: 'primitive body', payload: 'not-an-object' },
    { label: 'missing username', payload: { password: 'secret' } },
    { label: 'missing password', payload: { username: 'admin' } },
    { label: 'empty username', payload: { username: ' ', password: 'secret' } },
    { label: 'empty password', payload: { username: 'admin', password: ' ' } },
    { label: 'null username', payload: { username: null, password: 'secret' } },
    { label: 'null password', payload: { username: 'admin', password: null } },
    {
      label: 'null account id',
      payload: { username: 'admin', password: 'secret', accountId: null }
    },
    { label: 'numeric username', payload: { username: 123456, password: 'secret' } },
    { label: 'numeric password', payload: { username: 'admin', password: 123456 } },
    {
      label: 'numeric account id',
      payload: { username: 'admin', password: 'secret', accountId: 123456 }
    },
    { label: 'array username', payload: { username: [], password: 'secret' } },
    { label: 'array password', payload: { username: 'admin', password: [] } },
    {
      label: 'array account id',
      payload: { username: 'admin', password: 'secret', accountId: [] }
    },
    {
      label: 'object password',
      payload: { username: 'admin', password: { value: 'password-not-for-output' } }
    },
    {
      label: 'oversized username',
      payload: { username: 'u'.repeat(129), password: 'secret' }
    },
    {
      label: 'oversized password',
      payload: { username: 'admin', password: 'p'.repeat(129) }
    },
    {
      label: 'oversized account id',
      payload: { username: 'admin', password: 'secret', accountId: 'a'.repeat(256) }
    }
  ];

  for (const { label, payload } of cases) {
    const response = new MockResponse();
    const events: string[] = [];
    const loggedContexts: unknown[] = [];
    let loginCalls = 0;

    const handled = await handleAuthRoutes(
      '/auth/login',
      {
        method: 'POST',
        url: '/auth/login',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(JSON.stringify(payload));
        }
      } as never,
      response as never,
      `corr-auth-input-${label.replace(/\s+/g, '-')}`,
      {
        auth: {
          login: async () => {
            events.push('auth.login');
            loginCalls += 1;
            return { accessToken: 'token-1', refreshToken: 'refresh-1' };
          }
        } as never,
        authRateLimiter: {
          check: async () => {
            events.push('rate-limit');
            return {
              limit: 5,
              remaining: 4,
              reset: 123,
              blocked: false,
              retryAfterMs: 0
            };
          }
        },
        logger: { error: (_message: string, context?: unknown) => loggedContexts.push(context) },
        appName: 'test-app',
        featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false },
        webauthnChallenges: new Map(),
        webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
        oidcConfig: null,
        oidcStateStore: createInMemoryOidcStateStore(),
        oidcStateTtlMs: 60_000,
        requirePrincipal: () => createPrincipal(),
        appendAudit: () => {}
      }
    );

    assert.equal(handled, true, label);
    assert.equal(response.statusCode, 400, label);
    assert.equal(response.bodyJson<{ code: string }>().code, 'VALIDATION_ERROR', label);
    assert.equal(loginCalls, 0, label);
    assert.equal(events.at(-1), 'rate-limit', label);
    assert.ok(
      events.every((event) => event === 'rate-limit'),
      label
    );
    assert.ok(!JSON.stringify(loggedContexts).includes('password-not-for-output'), label);
    assert.ok(!response.bodyText().includes('password-not-for-output'), label);
    assert.ok(!response.bodyText().includes('u'.repeat(129)), label);
    assert.ok(!response.bodyText().includes('p'.repeat(129)), label);
    assert.ok(!response.bodyText().includes('a'.repeat(256)), label);
  }
});

test('handleAuthRoutes accepts login fields at the inclusive upper bounds', async () => {
  const response = new MockResponse();
  const payload = {
    username: 'u'.repeat(128),
    password: 'p'.repeat(128),
    accountId: 'a'.repeat(255)
  };
  const events: string[] = [];
  let receivedPayload: unknown;

  const handled = await handleAuthRoutes(
    '/auth/login',
    {
      method: 'POST',
      url: '/auth/login',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify(payload));
      }
    } as never,
    response as never,
    'corr-auth-input-boundary-inclusive',
    {
      auth: {
        login: async (input: unknown) => {
          events.push('auth.login');
          receivedPayload = input;
          return { accessToken: 'token-1', refreshToken: 'refresh-1' };
        }
      } as never,
      authRateLimiter: {
        check: async () => {
          events.push('rate-limit');
          return {
            limit: 5,
            remaining: 4,
            reset: 123,
            blocked: false,
            retryAfterMs: 0
          };
        }
      },
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false },
      webauthnChallenges: new Map(),
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => createPrincipal(),
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedPayload, payload);
  assert.deepEqual(events, ['rate-limit', 'rate-limit', 'auth.login']);
});

test('login rate limiting normalizes the username and cannot be bypassed by changing IP', async () => {
  const authRateLimiter = createSingleAttemptRateLimiter();
  const handlers = {
    auth: {
      login: async () => ({ accessToken: 'token-1', refreshToken: 'refresh-1' })
    } as never,
    authRateLimiter,
    logger: { error: () => {} },
    appName: 'test-app',
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false },
    webauthnChallenges: new Map(),
    webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
    oidcConfig: null,
    oidcStateStore: createInMemoryOidcStateStore(),
    oidcStateTtlMs: 60_000,
    requirePrincipal: () => createPrincipal(),
    appendAudit: () => {}
  };

  for (const [index, username] of ['admin', ' admin '].entries()) {
    const response = new MockResponse();
    await handleAuthRoutes(
      '/auth/login',
      {
        method: 'POST',
        url: '/auth/login',
        headers: {},
        socket: { remoteAddress: `192.0.2.${index + 1}` },
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(JSON.stringify({ username, password: 'secret' }));
        }
      } as never,
      response as never,
      `corr-auth-normalized-${index}`,
      handlers
    );

    assert.equal(response.statusCode, index === 0 ? 200 : 429);
  }
});

test('login rate limiting enforces an IP bucket across distinct users', async () => {
  const authRateLimiter = createSingleAttemptRateLimiter();
  const handlers = {
    auth: {
      login: async () => ({ accessToken: 'token-1', refreshToken: 'refresh-1' })
    } as never,
    authRateLimiter,
    logger: { error: () => {} },
    appName: 'test-app',
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false },
    webauthnChallenges: new Map(),
    webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
    oidcConfig: null,
    oidcStateStore: createInMemoryOidcStateStore(),
    oidcStateTtlMs: 60_000,
    requirePrincipal: () => createPrincipal(),
    appendAudit: () => {}
  };

  for (const username of ['admin', 'reception']) {
    const response = new MockResponse();
    await handleAuthRoutes(
      '/auth/login',
      {
        method: 'POST',
        url: '/auth/login',
        headers: {},
        socket: { remoteAddress: '203.0.113.10' },
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(JSON.stringify({ username, password: 'secret' }));
        }
      } as never,
      response as never,
      `corr-auth-shared-proxy-${username}`,
      handlers
    );

    assert.equal(response.statusCode, username === 'admin' ? 200 : 429);
  }
});

test('MFA rate limiting uses the verified body identity instead of a caller-controlled header', async () => {
  const authRateLimiter = createSingleAttemptRateLimiter();
  const handlers = {
    auth: {
      completeMfaLogin: async () => ({ accessToken: 'token-1', refreshToken: 'refresh-1' })
    } as never,
    authRateLimiter,
    logger: { error: () => {} },
    appName: 'test-app',
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false },
    webauthnChallenges: new Map(),
    webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
    oidcConfig: null,
    oidcStateStore: createInMemoryOidcStateStore(),
    oidcStateTtlMs: 60_000,
    requirePrincipal: () => createPrincipal(),
    appendAudit: () => {}
  };

  for (const [index, headerUserId] of ['attacker-choice-1', 'attacker-choice-2'].entries()) {
    const response = new MockResponse();
    await handleAuthRoutes(
      '/auth/login/mfa',
      {
        method: 'POST',
        url: '/auth/login/mfa',
        headers: { 'x-mfa-user-id': headerUserId },
        socket: { remoteAddress: `198.51.100.${index + 1}` },
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(
            JSON.stringify({ userId: 'user-1', token: '123456', challengeId: 'challenge-1' })
          );
        }
      } as never,
      response as never,
      `corr-auth-mfa-limit-${index}`,
      handlers
    );

    assert.equal(response.statusCode, index === 0 ? 200 : 429);
  }
});

test('MFA login rejects malformed and oversized payloads before the auth service', async () => {
  const invalidPayloads: readonly unknown[] = [
    null,
    [],
    'not-an-object',
    42,
    {},
    { userId: undefined, token: '123456', challengeId: 'challenge-1' },
    { userId: 'user-1', token: undefined, challengeId: 'challenge-1' },
    { userId: 'user-1', token: '123456', challengeId: undefined },
    { userId: null, token: '123456', challengeId: 'challenge-1' },
    { userId: 'user-1', token: null, challengeId: 'challenge-1' },
    { userId: 'user-1', token: '123456', challengeId: null },
    { userId: 123, token: '123456', challengeId: 'challenge-1' },
    { userId: 'user-1', token: 123456, challengeId: 'challenge-1' },
    { userId: 'user-1', token: '123456', challengeId: 123 },
    { userId: [], token: '123456', challengeId: 'challenge-1' },
    { userId: 'user-1', token: [], challengeId: 'challenge-1' },
    { userId: 'user-1', token: '123456', challengeId: [] },
    { userId: ' ', token: '123456', challengeId: 'challenge-1' },
    { userId: 'user-1', token: ' ', challengeId: 'challenge-1' },
    { userId: 'user-1', token: '123456', challengeId: ' ' },
    {
      userId: 'u'.repeat(129),
      token: '123456',
      challengeId: 'challenge-1'
    },
    {
      userId: 'user-1',
      token: 't'.repeat(129),
      challengeId: 'challenge-1'
    },
    {
      userId: 'user-1',
      token: '123456',
      challengeId: 'c'.repeat(513)
    },
    {
      userId: 'user-1',
      token: `mfa-token-not-for-output${'t'.repeat(129)}`,
      challengeId: 'challenge-1'
    }
  ];
  let completeCalls = 0;
  const loggerContexts: unknown[] = [];
  const handlers = {
    auth: {
      completeMfaLogin: async () => {
        completeCalls += 1;
        return { accessToken: 'token-1', refreshToken: 'refresh-1' };
      }
    } as never,
    authRateLimiter: {
      check: async () => ({
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60_000,
        blocked: false,
        retryAfterMs: 0
      })
    },
    logger: { error: (_message: string, context?: unknown) => loggerContexts.push(context) },
    appName: 'test-app',
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false },
    webauthnChallenges: new Map(),
    webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
    oidcConfig: null,
    oidcStateStore: createInMemoryOidcStateStore(),
    oidcStateTtlMs: 60_000,
    requirePrincipal: () => createPrincipal(),
    appendAudit: () => {}
  };

  for (const [index, payload] of invalidPayloads.entries()) {
    const response = new MockResponse();
    await handleAuthRoutes(
      '/auth/login/mfa',
      {
        method: 'POST',
        url: '/auth/login/mfa',
        headers: {},
        socket: { remoteAddress: `198.51.100.${index + 10}` },
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(JSON.stringify(payload));
        }
      } as never,
      response as never,
      `corr-auth-mfa-invalid-${index}`,
      handlers
    );

    assert.equal(response.statusCode, 400, `payload ${index} should be rejected`);
    assert.doesNotMatch(response.bodyText(), /mfa-token-not-for-output/);
  }

  assert.equal(completeCalls, 0);
  assert.doesNotMatch(JSON.stringify(loggerContexts), /mfa-token-not-for-output/);
});

test('MFA login accepts the inclusive field limits after rate limiting', async () => {
  let received:
    | { readonly userId: string; readonly token: string; readonly challengeId: string }
    | undefined;
  const handlers = {
    auth: {
      completeMfaLogin: async (payload: typeof received) => {
        received = payload;
        return { accessToken: 'token-1', refreshToken: 'refresh-1' };
      }
    } as never,
    authRateLimiter: createSingleAttemptRateLimiter(),
    logger: { error: () => {} },
    appName: 'test-app',
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false },
    webauthnChallenges: new Map(),
    webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
    oidcConfig: null,
    oidcStateStore: createInMemoryOidcStateStore(),
    oidcStateTtlMs: 60_000,
    requirePrincipal: () => createPrincipal(),
    appendAudit: () => {}
  };
  const payload = {
    userId: 'u'.repeat(128),
    token: 't'.repeat(128),
    challengeId: 'c'.repeat(512)
  };
  const response = new MockResponse();

  await handleAuthRoutes(
    '/auth/login/mfa',
    {
      method: 'POST',
      url: '/auth/login/mfa',
      headers: {},
      socket: { remoteAddress: '198.51.100.240' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify(payload));
      }
    } as never,
    response as never,
    'corr-auth-mfa-limits-inclusive',
    handlers
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, payload);
});

test('MFA login rate limits before validation without exposing token or challenge fields', async () => {
  const rateLimitInputs: Array<Record<string, unknown>> = [];
  const events: string[] = [];
  let completeCalls = 0;
  const handlers = {
    auth: {
      completeMfaLogin: async () => {
        completeCalls += 1;
        events.push('auth');
        return { accessToken: 'token-1', refreshToken: 'refresh-1' };
      }
    } as never,
    authRateLimiter: {
      check: async (input: Record<string, unknown>) => {
        rateLimitInputs.push(input);
        events.push(`rate-limit:${String(input.route)}`);
        return {
          limit: 100,
          remaining: 99,
          reset: Date.now() + 60_000,
          blocked: false,
          retryAfterMs: 0
        };
      }
    },
    logger: { error: () => {} },
    appName: 'test-app',
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false },
    webauthnChallenges: new Map(),
    webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
    oidcConfig: null,
    oidcStateStore: createInMemoryOidcStateStore(),
    oidcStateTtlMs: 60_000,
    requirePrincipal: () => createPrincipal(),
    appendAudit: () => {}
  };
  const payload = {
    userId: ' user-1 ',
    token: `credential-marker-${'x'.repeat(129)}`,
    challengeId: 'challenge-marker'
  };
  const response = new MockResponse();

  await handleAuthRoutes(
    '/auth/login/mfa',
    {
      method: 'POST',
      url: '/auth/login/mfa',
      headers: {},
      socket: { remoteAddress: '198.51.100.241' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify(payload));
      }
    } as never,
    response as never,
    'corr-auth-mfa-ordering',
    handlers
  );

  assert.equal(response.statusCode, 400);
  assert.equal(completeCalls, 0);
  assert.deepEqual(events, [
    'rate-limit:/auth/login/mfa:ip',
    'rate-limit:/auth/login/mfa:identity'
  ]);
  assert.equal(rateLimitInputs[0]?.userId, undefined);
  assert.equal(rateLimitInputs[1]?.userId, 'user-1');
  assert.doesNotMatch(JSON.stringify(rateLimitInputs), /credential-marker|challenge-marker/);
});

test('public MFA enrollment delegates tenant-scoped start and confirm operations to AuthService', async () => {
  const calls: Array<{ operation: string; challengeId: string; value: string }> = [];
  const principal = createPrincipal();
  const handlers = {
    auth: {
      mfaService: {},
      beginMfaEnrollment: async (challengeId: string, issuer: string, correlationId: string) => {
        calls.push({ operation: 'begin', challengeId, value: `${issuer}:${correlationId}` });
        return {
          secret: 'TESTSECRET',
          provisioningUri: 'otpauth://totp/test',
          recoveryCodes: ['AAAA-BBBB']
        };
      },
      confirmMfaEnrollment: async (challengeId: string, token: string, correlationId: string) => {
        calls.push({ operation: 'confirm', challengeId, value: `${token}:${correlationId}` });
        return {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenType: 'Bearer',
          principal
        };
      }
    } as never,
    authRateLimiter: {} as never,
    logger: { error: () => {} },
    appName: 'test-app',
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false },
    webauthnChallenges: new Map(),
    webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
    oidcConfig: null,
    oidcStateStore: createInMemoryOidcStateStore(),
    oidcStateTtlMs: 60_000,
    requirePrincipal: () => principal,
    appendAudit: () => {}
  };

  const startResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/mfa/enroll',
    {
      method: 'POST',
      url: '/auth/mfa/enroll',
      headers: {},
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ challengeId: 'challenge-1' }));
      }
    } as never,
    startResponse as never,
    'corr-enroll-start',
    handlers
  );

  const confirmResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/mfa/enroll/confirm',
    {
      method: 'POST',
      url: '/auth/mfa/enroll/confirm',
      headers: {},
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ challengeId: 'challenge-1', token: '123456' }));
      }
    } as never,
    confirmResponse as never,
    'corr-enroll-confirm',
    handlers
  );

  assert.equal(startResponse.statusCode, 200);
  assert.equal(startResponse.bodyJson<{ secret: string }>().secret, 'TESTSECRET');
  assert.equal(confirmResponse.statusCode, 200);
  assert.equal(confirmResponse.bodyJson<{ accessToken: string }>().accessToken, 'access-token');
  assert.deepEqual(calls, [
    {
      operation: 'begin',
      challengeId: 'challenge-1',
      value: 'test-app:corr-enroll-start'
    },
    {
      operation: 'confirm',
      challengeId: 'challenge-1',
      value: '123456:corr-enroll-confirm'
    }
  ]);
});

test('handleAuthRoutes POST /auth/refresh consumes the HttpOnly refresh cookie and does not expose it', async () => {
  const response = new MockResponse();
  let receivedRefreshToken: string | undefined;

  const handled = await handleAuthRoutes(
    '/auth/refresh',
    {
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: 'other=value; cvg_his_refresh=refresh-cookie' },
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('{}');
      }
    } as never,
    response as never,
    'corr-auth-refresh-cookie',
    {
      auth: {
        refresh: async (input: { refreshToken: string }) => {
          receivedRefreshToken = input.refreshToken;
          return {
            accessToken: 'access-rotated',
            refreshToken: 'refresh-rotated',
            tokenType: 'Bearer',
            principal: createPrincipal()
          };
        }
      } as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => createPrincipal(),
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(receivedRefreshToken, 'refresh-cookie');
  assert.equal(
    response.bodyJson<{ accessToken: string; refreshToken?: string }>().accessToken,
    'access-rotated'
  );
  assert.equal(response.bodyJson<{ refreshToken?: string }>().refreshToken, undefined);
  assert.match(String(response.getHeader('set-cookie')), /cvg_his_refresh=refresh-rotated/);
});

test('handleAuthRoutes POST /auth/refresh returns session-not-found without a cookie', async () => {
  const response = new MockResponse();

  const handled = await handleAuthRoutes(
    '/auth/refresh',
    {
      method: 'POST',
      url: '/auth/refresh',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('{}');
      }
    } as never,
    response as never,
    'corr-auth-refresh-missing-cookie',
    {
      auth: {
        refresh: async () => {
          throw new Error('must not be called');
        }
      } as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false },
      webauthnChallenges: new Map(),
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => createPrincipal(),
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 401);
  assert.equal(response.bodyJson<{ code: string }>().code, 'SESSION_NOT_FOUND');
});

test('handleAuthRoutes POST /auth/logout revokes the cookie session and clears the cookie', async () => {
  const response = new MockResponse();
  let receivedRefreshToken: string | undefined;

  const handled = await handleAuthRoutes(
    '/auth/logout',
    {
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: 'cvg_his_refresh=refresh-cookie' },
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {}
    } as never,
    response as never,
    'corr-auth-logout-cookie',
    {
      auth: {
        logout: async (input: { refreshToken?: string }) => {
          receivedRefreshToken = input.refreshToken;
        }
      } as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => createPrincipal(),
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 204);
  assert.equal(receivedRefreshToken, 'refresh-cookie');
  assert.match(String(response.getHeader('set-cookie')), /Max-Age=0/);
  assert.match(String(response.getHeader('set-cookie')), /Expires=Thu, 01 Jan 1970/);
});

test('handleAuthRoutes rejects cookie mutations from an untrusted browser origin', async () => {
  const response = new MockResponse();
  let refreshCalled = false;

  const handled = await handleAuthRoutes(
    '/auth/refresh',
    {
      method: 'POST',
      url: '/auth/refresh',
      headers: {
        origin: 'https://evil.example.com',
        cookie: 'cvg_his_refresh=refresh-cookie'
      },
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('{}');
      }
    } as never,
    response as never,
    'corr-auth-csrf-denied',
    {
      auth: {
        refresh: async () => {
          refreshCalled = true;
          throw new Error('must not be called');
        }
      } as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      csrfAllowedOrigins: ['https://app.example.com'],
      requirePrincipal: () => createPrincipal(),
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 403);
  assert.equal(response.bodyJson<{ code: string }>().code, 'CSRF_ORIGIN_DENIED');
  assert.equal(refreshCalled, false);
});

test('getClientIp ignores forwarded addresses from an untrusted remote peer', () => {
  const request = {
    socket: { remoteAddress: '10.20.0.10' },
    headers: { 'x-forwarded-for': '198.51.100.20' }
  } as never;

  assert.equal(getClientIp(request, ['127.0.0.1/32']), '10.20.0.10');
});

test('getClientIp walks a forwarded chain only from a trusted proxy', () => {
  const request = {
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'x-forwarded-for': '198.51.100.20, 10.20.0.10, 127.0.0.1' }
  } as never;

  assert.equal(getClientIp(request, ['127.0.0.1/32']), '10.20.0.10');
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
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
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

test('handleAuthRoutes POST /auth/logout-all-others revokes sibling sessions', async () => {
  const principal = createPrincipal();
  const response = new MockResponse();

  const handled = await handleAuthRoutes(
    '/auth/logout-all-others',
    {
      method: 'POST',
      url: '/auth/logout-all-others',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {}
    } as never,
    response as never,
    'corr-auth-revoke-others',
    {
      auth: {
        revokeOtherSessions: () => 2
      } as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => principal,
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), {
    revokedSessions: 2,
    keptSessionId: principal.session.sessionId
  });
});

test('handleAuthRoutes POST /auth/sessions/:sessionId/revoke revokes a targeted sibling session', async () => {
  const principal = createPrincipal();
  const response = new MockResponse();

  const handled = await handleAuthRoutes(
    '/auth/sessions/session-2/revoke',
    {
      method: 'POST',
      url: '/auth/sessions/session-2/revoke',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {}
    } as never,
    response as never,
    'corr-auth-revoke-one',
    {
      auth: {
        revokeSessionForUser: () => true
      } as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: false
      },
      webauthnChallenges: new Map(),
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => principal,
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), {
    revoked: true,
    sessionId: 'session-2'
  });
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
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
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
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
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

test('handleAuthRoutes GET /auth/oidc/callback normalizes OAuth tokens and fetches userinfo', async () => {
  const response = new MockResponse();
  const oidcStateStore = createInMemoryOidcStateStore();
  const state = oidcStateStore.create({
    codeChallenge: 'code-challenge',
    codeVerifier: 'code-verifier',
    redirectUri: 'https://app.example.com/auth/callback',
    createdAt: Date.now()
  });
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; authorization?: string }> = [];

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    requests.push({ url, authorization: headers.get('authorization') ?? undefined });
    if (url.endsWith('/token')) {
      return new Response(
        JSON.stringify({
          access_token: 'provider-access-token',
          id_token: 'provider-id-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email'
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify({ sub: 'provider-user', email: 'user@example.com' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }) as typeof fetch;

  try {
    const handled = await handleAuthRoutes(
      '/auth/oidc/callback',
      {
        method: 'GET',
        url: `/auth/oidc/callback?code=authorization-code&state=${encodeURIComponent(state)}`,
        headers: { host: 'localhost' },
        socket: { remoteAddress: '127.0.0.1' }
      } as never,
      response as never,
      'corr-auth-oidc-callback-success',
      {
        auth: {} as never,
        authRateLimiter: {} as never,
        logger: { error: () => {} },
        appName: 'test-app',
        featureFlags: { authOidcEnabled: true, authWebauthnEnabled: false },
        webauthnChallenges: new Map(),
        webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
        oidcConfig: {
          issuer: 'https://issuer.example.com',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          redirectUri: 'https://app.example.com/auth/callback',
          scope: 'openid profile email',
          authorizationEndpoint: 'https://issuer.example.com/auth',
          tokenEndpoint: 'https://issuer.example.com/token',
          userinfoEndpoint: 'https://issuer.example.com/userinfo'
        },
        oidcStateStore,
        oidcStateTtlMs: 60_000,
        requirePrincipal: () => createPrincipal(),
        appendAudit: () => {}
      }
    );

    assert.equal(handled, true);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.bodyJson(), {
      tokens: {
        accessToken: 'provider-access-token',
        idToken: 'provider-id-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        scope: 'openid profile email'
      },
      userInfo: { sub: 'provider-user', email: 'user@example.com' }
    });
    assert.deepEqual(requests, [
      { url: 'https://issuer.example.com/token', authorization: undefined },
      {
        url: 'https://issuer.example.com/userinfo',
        authorization: 'Bearer provider-access-token'
      }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('handleAuthRoutes POST /auth/mfa/webauthn/setup rejects expired registration challenge', async () => {
  const principal = createPrincipal();
  const response = new MockResponse();
  let verifyCalled = false;

  const handled = await handleAuthRoutes(
    '/auth/mfa/webauthn/setup',
    {
      method: 'POST',
      url: '/auth/mfa/webauthn/setup',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            credentialId: 'cred-1',
            attestationObject: 'attestation',
            clientDataJSON: 'client-data'
          })
        );
      }
    } as never,
    response as never,
    'corr-auth-webauthn-reg-expired',
    {
      auth: {} as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: true
      },
      webauthnService: {
        verifyRegistration: async () => {
          verifyCalled = true;
          return { credentialId: 'cred-1' };
        }
      } as never,
      webauthnChallenges: new Map([
        ['reg:user-1', { challenge: 'challenge-1', createdAt: Date.now() - 5_000 }]
      ]),
      webauthnChallengeTtlMs: 1_000,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => principal,
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 400);
  assert.equal(response.bodyJson<{ code: string }>().code, 'CHALLENGE_EXPIRED');
  assert.equal(verifyCalled, false);
});

test('handleAuthRoutes POST /auth/mfa/webauthn/assert rejects expired authentication challenge', async () => {
  const principal = createPrincipal();
  const response = new MockResponse();
  let verifyCalled = false;

  const handled = await handleAuthRoutes(
    '/auth/mfa/webauthn/assert',
    {
      method: 'POST',
      url: '/auth/mfa/webauthn/assert',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            credentialId: 'cred-1',
            authenticatorData: 'auth-data',
            clientDataJSON: 'client-data',
            signature: 'signature'
          })
        );
      }
    } as never,
    response as never,
    'corr-auth-webauthn-assert-expired',
    {
      auth: {} as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: true
      },
      webauthnService: {
        verifyAuthentication: async () => {
          verifyCalled = true;
          return { success: true };
        }
      } as never,
      webauthnChallenges: new Map([
        ['auth:user-1', { challenge: 'challenge-2', createdAt: Date.now() - 5_000 }]
      ]),
      webauthnChallengeTtlMs: 1_000,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => principal,
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 400);
  assert.equal(response.bodyJson<{ code: string }>().code, 'CHALLENGE_EXPIRED');
  assert.equal(verifyCalled, false);
});

test('handleAuthRoutes uses account-scoped durable WebAuthn challenge state', async () => {
  const principal = createPrincipal();
  const response = new MockResponse();
  let issuedKey: { accountId: string; userId: string; purpose: string } | undefined;
  let generatedScope: string[] | undefined;

  const handled = await handleAuthRoutes(
    '/auth/mfa/webauthn/setup',
    {
      method: 'GET',
      url: '/auth/mfa/webauthn/setup',
      headers: { 'x-rp-id': 'attacker.example' },
      socket: { remoteAddress: '127.0.0.1' }
    } as never,
    response as never,
    'corr-auth-webauthn-durable-setup',
    {
      auth: {} as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: true
      },
      webauthnRpId: 'cvg.local',
      webauthnService: {
        generateRegistrationOptions: async (...args: unknown[]) => {
          generatedScope = args.slice(0, 2) as string[];
          return { publicKeyOptions: {}, challenge: 'durable-challenge' };
        }
      } as never,
      webauthnChallengeStore: {
        issue: async (input: { key: typeof issuedKey }) => {
          issuedKey = input.key;
        }
      } as never,
      webauthnChallenges: new Map(),
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => principal,
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(generatedScope, [principal.user.accountId, principal.user.id]);
  assert.deepEqual(issuedKey, {
    accountId: principal.user.accountId,
    userId: principal.user.id,
    purpose: 'registration'
  });
});

test('handleAuthRoutes consumes the durable assertion challenge with principal account scope', async () => {
  const principal = createPrincipal();
  const response = new MockResponse();
  let consumedKey: { accountId: string; userId: string; purpose: string } | undefined;
  let verificationScope: string[] | undefined;

  const handled = await handleAuthRoutes(
    '/auth/mfa/webauthn/assert',
    {
      method: 'POST',
      url: '/auth/mfa/webauthn/assert',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          JSON.stringify({
            credentialId: 'cred-1',
            authenticatorData: 'auth-data',
            clientDataJSON: 'client-data',
            signature: 'signature'
          })
        );
      }
    } as never,
    response as never,
    'corr-auth-webauthn-durable-assert',
    {
      auth: {} as never,
      authRateLimiter: {} as never,
      logger: { error: () => {} },
      appName: 'test-app',
      featureFlags: {
        authOidcEnabled: false,
        authWebauthnEnabled: true
      },
      webauthnService: {
        verifyAuthentication: async (...args: unknown[]) => {
          verificationScope = args.slice(0, 3) as string[];
          return { success: true };
        }
      } as never,
      webauthnChallengeStore: {
        consume: async (key: typeof consumedKey) => {
          consumedKey = key;
          return { ok: true, challenge: 'durable-challenge' };
        }
      } as never,
      webauthnChallenges: new Map(),
      webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
      oidcConfig: null,
      oidcStateStore: createInMemoryOidcStateStore(),
      oidcStateTtlMs: 60_000,
      requirePrincipal: () => principal,
      appendAudit: () => {}
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(consumedKey, {
    accountId: principal.user.accountId,
    userId: principal.user.id,
    purpose: 'authentication'
  });
  assert.deepEqual(verificationScope, [principal.user.accountId, principal.user.id, 'cred-1']);
});

test('handleAuthRoutes rejects malformed MFA and WebAuthn payloads before service calls', async () => {
  const cases: readonly {
    path: string;
    body: unknown;
    service: 'mfa' | 'webauthn';
  }[] = [
    { path: '/auth/mfa/enroll', body: {}, service: 'mfa' },
    { path: '/auth/mfa/enroll/confirm', body: { challengeId: 'challenge-1' }, service: 'mfa' },
    { path: '/mfa/setup/confirm', body: { token: '' }, service: 'mfa' },
    { path: '/mfa/disable', body: { token: 123456 }, service: 'mfa' },
    {
      path: '/auth/mfa/webauthn/setup',
      body: { credentialId: 'credential-1' },
      service: 'webauthn'
    },
    {
      path: '/auth/mfa/webauthn/assert',
      body: {
        credentialId: 'credential-1',
        authenticatorData: 'authenticator-data',
        clientDataJSON: 'client-data'
      },
      service: 'webauthn'
    }
  ];

  for (const [index, entry] of cases.entries()) {
    let serviceCalls = 0;
    const principal = createPrincipal();
    const mfaService = {
      initiateSetup: async () => {
        serviceCalls += 1;
        return { secret: 'secret', provisioningUri: 'uri', recoveryCodes: [] };
      },
      confirmSetup: async () => {
        serviceCalls += 1;
        return { isActive: true };
      },
      disableMfa: async () => {
        serviceCalls += 1;
      }
    };
    const webauthnService = {
      generateRegistrationOptions: async () => {
        serviceCalls += 1;
        return { publicKeyOptions: {}, challenge: 'challenge' };
      },
      verifyRegistration: async () => {
        serviceCalls += 1;
        return { credentialId: 'credential-1' };
      },
      generateAuthenticationOptions: async () => {
        serviceCalls += 1;
        return { publicKeyOptions: {}, challenge: 'challenge' };
      },
      verifyAuthentication: async () => {
        serviceCalls += 1;
        return { success: true };
      }
    };
    const response = new MockResponse();
    const handlers = createBaseAuthHandlers({
      auth: { mfaService },
      featureFlags: { authOidcEnabled: false, authWebauthnEnabled: true },
      webauthnService,
      requirePrincipal: () => principal
    });

    await assert.rejects(
      () =>
        handleAuthRoutes(
          entry.path,
          createJsonRequest('POST', entry.path, entry.body),
          response as never,
          `corr-auth-invalid-boundary-${index}`,
          handlers
        ),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, 'VALIDATION_ERROR');
        return true;
      },
      entry.path
    );
    assert.equal(serviceCalls, 0, entry.path);
  }
});

test('handleAuthRoutes serves the configured MFA management routes with tenant principal data', async () => {
  const principal = createPrincipal();
  const calls: Array<{ operation: string; accountId: string; userId: string; value?: string }> = [];
  const mfaService = {
    initiateSetup: async (accountId: string, userId: string, email: string, issuer: string) => {
      calls.push({ operation: 'setup', accountId, userId, value: `${email}:${issuer}` });
      return { secret: 'secret', provisioningUri: 'otpauth://totp/test', recoveryCodes: ['code-1'] };
    },
    confirmSetup: async (accountId: string, userId: string, token: string) => {
      calls.push({ operation: 'confirm', accountId, userId, value: token });
      return { isActive: true };
    },
    isMfaActive: async (accountId: string, userId: string) => {
      calls.push({ operation: 'status', accountId, userId });
      return true;
    },
    isMfaRequired: (roleCodes: readonly string[]) => roleCodes.includes('admin'),
    disableMfa: async (accountId: string, userId: string, token: string) => {
      calls.push({ operation: 'disable', accountId, userId, value: token });
    },
    regenerateRecoveryCodes: async (accountId: string, userId: string) => {
      calls.push({ operation: 'regenerate', accountId, userId });
      return ['code-2', 'code-3'];
    }
  };
  const handlers = createBaseAuthHandlers({
    auth: { mfaService },
    requirePrincipal: () => principal
  });

  const setupResponse = new MockResponse();
  await handleAuthRoutes(
    '/mfa/setup',
    createJsonRequest('POST', '/mfa/setup'),
    setupResponse as never,
    'corr-mfa-management-setup',
    handlers
  );
  const confirmResponse = new MockResponse();
  await handleAuthRoutes(
    '/mfa/setup/confirm',
    createJsonRequest('POST', '/mfa/setup/confirm', { token: '123456' }),
    confirmResponse as never,
    'corr-mfa-management-confirm',
    handlers
  );
  const statusResponse = new MockResponse();
  await handleAuthRoutes(
    '/mfa/status',
    createJsonRequest('GET', '/mfa/status'),
    statusResponse as never,
    'corr-mfa-management-status',
    handlers
  );
  const disableResponse = new MockResponse();
  await handleAuthRoutes(
    '/mfa/disable',
    createJsonRequest('POST', '/mfa/disable', { token: '654321' }),
    disableResponse as never,
    'corr-mfa-management-disable',
    handlers
  );
  const recoveryResponse = new MockResponse();
  await handleAuthRoutes(
    '/mfa/recovery-codes/regenerate',
    createJsonRequest('POST', '/mfa/recovery-codes/regenerate'),
    recoveryResponse as never,
    'corr-mfa-management-recovery',
    handlers
  );

  assert.equal(setupResponse.statusCode, 200);
  assert.deepEqual(setupResponse.bodyJson(), {
    secret: 'secret',
    provisioningUri: 'otpauth://totp/test',
    recoveryCodes: ['code-1']
  });
  assert.deepEqual(confirmResponse.bodyJson(), { isActive: true });
  assert.deepEqual(statusResponse.bodyJson(), { isActive: true, isRequired: true });
  assert.deepEqual(disableResponse.bodyJson(), { success: true });
  assert.deepEqual(recoveryResponse.bodyJson(), { recoveryCodes: ['code-2', 'code-3'] });
  assert.deepEqual(calls, [
    {
      operation: 'setup',
      accountId: principal.user.accountId,
      userId: principal.user.id,
      value: 'admin@example.com:test-app'
    },
    {
      operation: 'confirm',
      accountId: principal.user.accountId,
      userId: principal.user.id,
      value: '123456'
    },
    { operation: 'status', accountId: principal.user.accountId, userId: principal.user.id },
    {
      operation: 'disable',
      accountId: principal.user.accountId,
      userId: principal.user.id,
      value: '654321'
    },
    { operation: 'regenerate', accountId: principal.user.accountId, userId: principal.user.id }
  ]);
});

test('handleAuthRoutes handles fallback WebAuthn challenges and failed assertions without success leakage', async () => {
  const principal = createPrincipal();
  const webauthnChallenges = new Map<string, { challenge: string; createdAt: number }>();
  const registrationScopes: string[] = [];
  const verificationScopes: string[] = [];
  let assertionSuccess = false;
  const webauthnService = {
    generateRegistrationOptions: async (
      accountId: string,
      userId: string,
      options: { rpId: string }
    ) => {
      registrationScopes.push(`${accountId}:${userId}:${options.rpId}`);
      return { publicKeyOptions: { rpId: options.rpId }, challenge: 'registration-challenge' };
    },
    verifyRegistration: async (
      accountId: string,
      userId: string,
      response: { credentialId: string },
      challenge: string
    ) => {
      verificationScopes.push(`${accountId}:${userId}:${response.credentialId}:${challenge}`);
      return { credentialId: 'stored-credential' };
    },
    generateAuthenticationOptions: async (
      accountId: string,
      userId: string,
      options: { rpId: string }
    ) => {
      registrationScopes.push(`${accountId}:${userId}:${options.rpId}`);
      return { publicKeyOptions: {}, challenge: 'assertion-challenge' };
    },
    verifyAuthentication: async (
      accountId: string,
      userId: string,
      credentialId: string,
      _response: unknown,
      challenge: string,
      rpId: string
    ) => {
      verificationScopes.push(`${accountId}:${userId}:${credentialId}:${challenge}:${rpId}`);
      return { success: assertionSuccess };
    }
  };
  const handlers = createBaseAuthHandlers({
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: true },
    webauthnRpId: 'cvg.local',
    webauthnService,
    webauthnChallenges,
    requirePrincipal: () => principal
  });

  const registrationOptionsResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/mfa/webauthn/setup',
    createJsonRequest('GET', '/auth/mfa/webauthn/setup', undefined, {
      'x-rp-id': 'attacker.example'
    }),
    registrationOptionsResponse as never,
    'corr-webauthn-fallback-registration-options',
    handlers
  );
  assert.equal(registrationOptionsResponse.statusCode, 200);
  assert.equal(webauthnChallenges.has(`reg:${principal.user.id}`), true);

  const registrationResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/mfa/webauthn/setup',
    createJsonRequest('POST', '/auth/mfa/webauthn/setup', {
      credentialId: 'client-credential',
      attestationObject: 'attestation',
      clientDataJSON: 'client-data'
    }),
    registrationResponse as never,
    'corr-webauthn-fallback-registration-complete',
    handlers
  );
  assert.deepEqual(registrationResponse.bodyJson(), {
    success: true,
    credentialId: 'stored-credential'
  });
  assert.equal(webauthnChallenges.has(`reg:${principal.user.id}`), false);

  const authenticationOptionsResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/mfa/webauthn/authenticate',
    createJsonRequest('POST', '/auth/mfa/webauthn/authenticate', {
      credentialId: 'stored-credential'
    }),
    authenticationOptionsResponse as never,
    'corr-webauthn-fallback-auth-options',
    handlers
  );
  assert.equal(authenticationOptionsResponse.statusCode, 200);
  assert.deepEqual(authenticationOptionsResponse.bodyJson(), {
    publicKeyOptions: {
      allowCredentials: [{ id: 'stored-credential', type: 'public-key' }]
    },
    challenge: 'assertion-challenge'
  });

  const failedAssertionResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/mfa/webauthn/assert',
    createJsonRequest('POST', '/auth/mfa/webauthn/assert', {
      credentialId: 'stored-credential',
      authenticatorData: 'authenticator-data',
      clientDataJSON: 'client-data',
      signature: 'signature',
      userHandle: 'user-handle'
    }),
    failedAssertionResponse as never,
    'corr-webauthn-fallback-assert-failed',
    handlers
  );
  assert.equal(failedAssertionResponse.statusCode, 401);
  assert.deepEqual(failedAssertionResponse.bodyJson(), {
    code: 'AUTHENTICATION_FAILED',
    message: 'WebAuthn assertion failed'
  });

  await handleAuthRoutes(
    '/auth/mfa/webauthn/authenticate',
    createJsonRequest('POST', '/auth/mfa/webauthn/authenticate', {}),
    new MockResponse() as never,
    'corr-webauthn-fallback-auth-options-second',
    handlers
  );
  assertionSuccess = true;
  const successfulAssertionResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/mfa/webauthn/assert',
    createJsonRequest('POST', '/auth/mfa/webauthn/assert', {
      credentialId: 'stored-credential',
      authenticatorData: 'authenticator-data',
      clientDataJSON: 'client-data',
      signature: 'signature'
    }),
    successfulAssertionResponse as never,
    'corr-webauthn-fallback-assert-success',
    handlers
  );
  assert.deepEqual(successfulAssertionResponse.bodyJson(), { success: true });
  assert.deepEqual(registrationScopes, [
    `${principal.user.accountId}:${principal.user.id}:cvg.local`,
    `${principal.user.accountId}:${principal.user.id}:cvg.local`,
    `${principal.user.accountId}:${principal.user.id}:cvg.local`
  ]);
  assert.deepEqual(verificationScopes, [
    `${principal.user.accountId}:${principal.user.id}:client-credential:registration-challenge`,
    `${principal.user.accountId}:${principal.user.id}:stored-credential:assertion-challenge:cvg.local`,
    `${principal.user.accountId}:${principal.user.id}:stored-credential:assertion-challenge:cvg.local`
  ]);
});

test('handleAuthRoutes fails closed when optional authentication features are unavailable or disabled', async () => {
  const unavailableCases: readonly {
    path: string;
    method: 'GET' | 'POST';
    statusCode: number;
    body?: unknown;
    overrides?: Record<string, unknown>;
    expectedPayload?: unknown;
  }[] = [
    { path: '/auth/mfa/enroll', method: 'POST', statusCode: 501 },
    { path: '/auth/mfa/enroll/confirm', method: 'POST', statusCode: 501 },
    { path: '/mfa/setup', method: 'POST', statusCode: 501 },
    { path: '/mfa/setup/confirm', method: 'POST', statusCode: 501 },
    {
      path: '/mfa/status',
      method: 'GET',
      statusCode: 200,
      expectedPayload: { isActive: false, isRequired: false }
    },
    { path: '/mfa/disable', method: 'POST', statusCode: 501 },
    { path: '/mfa/recovery-codes/regenerate', method: 'POST', statusCode: 501 },
    { path: '/auth/mfa/webauthn/setup', method: 'GET', statusCode: 501 },
    { path: '/auth/mfa/webauthn/setup', method: 'POST', statusCode: 501 },
    { path: '/auth/mfa/webauthn/authenticate', method: 'POST', statusCode: 501 },
    { path: '/auth/mfa/webauthn/assert', method: 'POST', statusCode: 501 },
    { path: '/auth/oidc/login', method: 'GET', statusCode: 501 },
    { path: '/auth/oidc/callback', method: 'GET', statusCode: 501 },
    { path: '/auth/oidc/logout', method: 'POST', statusCode: 501 }
  ];

  for (const entry of unavailableCases) {
    const response = new MockResponse();
    const handled = await handleAuthRoutes(
      entry.path,
      createJsonRequest(entry.method, entry.path, entry.body),
      response as never,
      `corr-auth-feature-unavailable-${entry.path.replaceAll('/', '-')}-${entry.method}`,
      createBaseAuthHandlers(entry.overrides)
    );

    assert.equal(handled, true, entry.path);
    assert.equal(response.statusCode, entry.statusCode, entry.path);
    if (entry.expectedPayload !== undefined) {
      assert.deepEqual(response.bodyJson(), entry.expectedPayload, entry.path);
    }
  }

  const disabledCases: readonly { path: string; method: 'GET' | 'POST'; overrides: Record<string, unknown> }[] = [
    {
      path: '/auth/mfa/webauthn/setup',
      method: 'GET',
      overrides: { webauthnService: {}, featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false } }
    },
    {
      path: '/auth/mfa/webauthn/setup',
      method: 'POST',
      overrides: { webauthnService: {}, featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false } }
    },
    {
      path: '/auth/mfa/webauthn/authenticate',
      method: 'POST',
      overrides: { webauthnService: {}, featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false } }
    },
    {
      path: '/auth/mfa/webauthn/assert',
      method: 'POST',
      overrides: { webauthnService: {}, featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false } }
    },
    {
      path: '/auth/oidc/login',
      method: 'GET',
      overrides: {
        oidcConfig: createOidcConfig(),
        featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false }
      }
    },
    {
      path: '/auth/oidc/callback',
      method: 'GET',
      overrides: {
        oidcConfig: createOidcConfig(),
        featureFlags: { authOidcEnabled: false, authWebauthnEnabled: false }
      }
    }
  ];

  for (const entry of disabledCases) {
    const response = new MockResponse();
    await handleAuthRoutes(
      entry.path,
      createJsonRequest(entry.method, entry.path),
      response as never,
      `corr-auth-feature-disabled-${entry.path.replaceAll('/', '-')}-${entry.method}`,
      createBaseAuthHandlers(entry.overrides)
    );

    assert.equal(response.statusCode, 403, entry.path);
    assert.equal(response.bodyJson<{ code: string }>().code, 'FLAG_DISABLED', entry.path);
  }
});

test('configured authentication routes reject non-object bodies before invoking services', async () => {
  let serviceCalls = 0;
  const mfaService = {
    confirmSetup: async () => {
      serviceCalls += 1;
      return { isActive: true };
    },
    disableMfa: async () => {
      serviceCalls += 1;
    }
  };
  const webauthnService = {
    generateAuthenticationOptions: async () => {
      serviceCalls += 1;
      return { publicKeyOptions: {}, challenge: 'challenge' };
    },
    verifyRegistration: async () => {
      serviceCalls += 1;
      return { credentialId: 'credential-1' };
    }
  };
  const cases: readonly { path: string; body: unknown }[] = [
    { path: '/mfa/setup/confirm', body: null },
    { path: '/mfa/disable', body: [] },
    { path: '/auth/mfa/webauthn/setup', body: 'not-an-object' },
    { path: '/auth/mfa/webauthn/authenticate', body: null },
    { path: '/auth/mfa/webauthn/assert', body: null }
  ];

  for (const [index, entry] of cases.entries()) {
    const response = new MockResponse();
    await assert.rejects(
      () =>
        handleAuthRoutes(
          entry.path,
          createJsonRequest('POST', entry.path, entry.body),
          response as never,
          `corr-auth-non-object-${index}`,
          createBaseAuthHandlers({
            auth: { mfaService },
            featureFlags: { authOidcEnabled: false, authWebauthnEnabled: true },
            webauthnService
          })
        ),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, 'VALIDATION_ERROR', entry.path);
        return true;
      },
      entry.path
    );
  }

  assert.equal(serviceCalls, 0);
});

test('login and MFA routes serialize service failures and non-session responses', async () => {
  const loginChallengeResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/login',
    createJsonRequest('POST', '/auth/login', { username: 'admin', password: 'secret' }),
    loginChallengeResponse as never,
    'corr-auth-login-challenge',
    createBaseAuthHandlers({
      auth: { login: async () => ({ mfaRequired: true, challengeId: 'challenge-1' }) }
    })
  );
  assert.equal(loginChallengeResponse.statusCode, 200);
  assert.deepEqual(loginChallengeResponse.bodyJson(), {
    mfaRequired: true,
    challengeId: 'challenge-1'
  });

  const loginErrorResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/login',
    createJsonRequest('POST', '/auth/login', { username: 'admin', password: 'secret' }),
    loginErrorResponse as never,
    'corr-auth-login-error',
    createBaseAuthHandlers({
      auth: { login: async () => { throw new Error('credentials backend unavailable'); } }
    })
  );
  assert.equal(loginErrorResponse.statusCode, 500);
  assert.doesNotMatch(loginErrorResponse.bodyText(), /credentials backend unavailable/);

  const mfaErrorResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/login/mfa',
    createJsonRequest('POST', '/auth/login/mfa', {
      userId: 'user-1',
      token: '123456',
      challengeId: 'challenge-1'
    }),
    mfaErrorResponse as never,
    'corr-auth-mfa-error',
    createBaseAuthHandlers({
      auth: {
        completeMfaLogin: async () => { throw new Error('MFA backend unavailable'); }
      }
    })
  );
  assert.equal(mfaErrorResponse.statusCode, 500);
  assert.doesNotMatch(mfaErrorResponse.bodyText(), /MFA backend unavailable/);
});

test('authentication rate limiting fails closed and combines an identity block', async () => {
  const routes: string[] = [];
  let loginCalls = 0;
  const identityBlocked = {
    limit: 3,
    remaining: 0,
    reset: 123,
    blocked: true,
    retryAfterMs: 4_001
  };
  const response = new MockResponse();
  await handleAuthRoutes(
    '/auth/login',
    createJsonRequest('POST', '/auth/login', { username: 'admin', password: 'secret' }),
    response as never,
    'corr-auth-identity-rate-limit',
    createBaseAuthHandlers({
      auth: {
        login: async () => {
          loginCalls += 1;
          return { accessToken: 'access', refreshToken: 'refresh' };
        }
      },
      authRateLimiter: {
        check: async (input: { route: string }) => {
          routes.push(input.route);
          return input.route.endsWith(':identity')
            ? identityBlocked
            : { limit: 10, remaining: 9, reset: 100, blocked: false, retryAfterMs: 0 };
        }
      }
    })
  );
  assert.equal(response.statusCode, 429);
  assert.equal(response.getHeader('retry-after'), '5');
  assert.equal(loginCalls, 0);
  assert.deepEqual(routes, ['/auth/login:ip', '/auth/login:identity']);

  await assert.rejects(
    () =>
      handleAuthRoutes(
        '/auth/login',
        createJsonRequest('POST', '/auth/login', { username: 'admin', password: 'secret' }),
        new MockResponse() as never,
        'corr-auth-rate-limit-unavailable',
        createBaseAuthHandlers({
          authRateLimiter: {
            check: async () => {
              throw new Error('rate limit unavailable');
            }
          }
        })
      ),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'RATE_LIMIT_UNAVAILABLE');
      return true;
    }
  );
});

test('cookie-backed session routes honor body tokens, secure attributes, and origin validation', async () => {
  let receivedToken: string | undefined;
  const response = new MockResponse();
  response.setHeader('set-cookie', 'existing=value');
  await handleAuthRoutes(
    '/auth/refresh',
    createJsonRequest(
      'POST',
      '/auth/refresh',
      { refreshToken: 'body-token' },
      { origin: 'https://app.example.com' }
    ),
    response as never,
    'corr-auth-cookie-body-token',
    createBaseAuthHandlers({
      auth: {
        refresh: async (input: { refreshToken: string }) => {
          receivedToken = input.refreshToken;
          return { accessToken: 'access', refreshToken: 'rotated' };
        }
      },
      csrfAllowedOrigins: ['https://app.example.com'],
      refreshCookieMaxAgeSeconds: 12.9,
      secureCookies: true
    })
  );
  assert.equal(response.statusCode, 200);
  assert.equal(receivedToken, 'body-token');
  assert.match(String(response.getHeader('set-cookie')), /Max-Age=12/);
  assert.match(String(response.getHeader('set-cookie')), /Secure/);
  assert.match(String(response.getHeader('set-cookie')), /existing=value/);

  let refreshCalls = 0;
  const invalidCookieResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/refresh',
    createJsonRequest('POST', '/auth/refresh', {}, {
      cookie: 'malformed-cookie-part; cvg_his_refresh=%E0%A4%A'
    }),
    invalidCookieResponse as never,
    'corr-auth-cookie-invalid-encoding',
    createBaseAuthHandlers({
      auth: {
        refresh: async () => {
          refreshCalls += 1;
          return { accessToken: 'access', refreshToken: 'refresh' };
        }
      }
    })
  );
  assert.equal(invalidCookieResponse.statusCode, 401);
  assert.equal(refreshCalls, 0);

  for (const [index, origin] of ['not-a-url', 'ftp://app.example.com'].entries()) {
    const originResponse = new MockResponse();
    await handleAuthRoutes(
      '/auth/refresh',
      createJsonRequest('POST', '/auth/refresh', { refreshToken: 'token' }, { origin }),
      originResponse as never,
      `corr-auth-cookie-origin-${index}`,
      createBaseAuthHandlers({
        csrfAllowedOrigins: ['https://app.example.com'],
        auth: {
          refresh: async () => {
            throw new Error('must not refresh with an invalid origin');
          }
        }
      })
    );
    assert.equal(originResponse.statusCode, 403, origin);
    assert.equal(originResponse.bodyJson<{ code: string }>().code, 'CSRF_ORIGIN_DENIED', origin);
  }

  const noAllowListResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/refresh',
    createJsonRequest('POST', '/auth/refresh', { refreshToken: 'token' }, {
      origin: 'https://app.example.com'
    }),
    noAllowListResponse as never,
    'corr-auth-cookie-origin-no-allow-list',
    createBaseAuthHandlers({
      auth: {
        refresh: async () => {
          throw new Error('must not refresh without an allow list');
        }
      }
    })
  );
  assert.equal(noAllowListResponse.statusCode, 403);

  const nullBodyResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/refresh',
    createJsonRequest('POST', '/auth/refresh', null),
    nullBodyResponse as never,
    'corr-auth-cookie-null-body',
    createBaseAuthHandlers({
      auth: {
        refresh: async () => {
          throw new Error('must not refresh without a token');
        }
      }
    })
  );
  assert.equal(nullBodyResponse.statusCode, 401);
});

test('getClientIp handles malformed addresses and trusted proxy boundary forms', () => {
  const cases: readonly {
    remoteAddress: string | undefined;
    trustedProxyCidrs: readonly string[];
    forwardedFor?: string;
    expected: string;
  }[] = [
    { remoteAddress: undefined, trustedProxyCidrs: [], expected: 'unknown' },
    { remoteAddress: '::ffff:198.51.100.10', trustedProxyCidrs: [], expected: '198.51.100.10' },
    { remoteAddress: '999.1.1.1', trustedProxyCidrs: ['192.0.2.0/24'], expected: '999.1.1.1' },
    {
      remoteAddress: '192.0.2.10',
      trustedProxyCidrs: [
        'not-an-ip/24',
        '192.0.2.0/33',
        '192.0.2.0/-1',
        '192.0.2.0/not-a-number',
        '999.0.0.0/24',
        '0.0.0.0/0'
      ],
      expected: '192.0.2.10'
    },
    { remoteAddress: '192.0.2.10', trustedProxyCidrs: ['192.0.2.10'], expected: '192.0.2.10' },
    {
      remoteAddress: '192.0.2.10',
      trustedProxyCidrs: ['192.0.2.0/24'],
      forwardedFor: '192.0.2.11',
      expected: '192.0.2.10'
    },
    { remoteAddress: 'invalid-ip', trustedProxyCidrs: ['192.0.2.0/24'], expected: 'invalid-ip' }
  ];

  for (const entry of cases) {
    const request = {
      socket: { remoteAddress: entry.remoteAddress },
      headers: entry.forwardedFor === undefined ? {} : { 'x-forwarded-for': entry.forwardedFor }
    };
    assert.equal(getClientIp(request as never, entry.trustedProxyCidrs), entry.expected);
  }
});

test('session revocation audits already-inactive targets without reporting a false revoke', async () => {
  const auditPayloads: string[] = [];
  const response = new MockResponse();
  const handled = await handleAuthRoutes(
    '/auth/sessions/session-inactive/revoke',
    createJsonRequest('POST', '/auth/sessions/session-inactive/revoke'),
    response as never,
    'corr-auth-revoke-inactive',
    createBaseAuthHandlers({
      auth: { revokeSessionForUser: async () => false },
      appendAudit: (
        _actor: string,
        _account: string,
        _module: string,
        _action: string,
        _type: string,
        _id: string,
        payload: string
      ) => {
        auditPayloads.push(payload);
      }
    })
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), { revoked: false, sessionId: 'session-inactive' });
  assert.deepEqual(auditPayloads, ['Session session-inactive already inactive']);
});

test('WebAuthn returns distinct invalid-challenge responses without invoking verification', async () => {
  const principal = createPrincipal();
  let registrationVerifyCalls = 0;
  let authenticationVerifyCalls = 0;
  const webauthnService = {
    verifyRegistration: async () => {
      registrationVerifyCalls += 1;
      return { credentialId: 'credential-1' };
    },
    verifyAuthentication: async () => {
      authenticationVerifyCalls += 1;
      return { success: true };
    }
  };
  const handlers = createBaseAuthHandlers({
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: true },
    webauthnService,
    webauthnChallenges: new Map(),
    requirePrincipal: () => principal
  });

  const registrationResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/mfa/webauthn/setup',
    createJsonRequest('POST', '/auth/mfa/webauthn/setup', {
      credentialId: 'credential-1',
      attestationObject: 'attestation',
      clientDataJSON: 'client-data'
    }),
    registrationResponse as never,
    'corr-auth-webauthn-registration-missing-challenge',
    handlers
  );
  assert.equal(registrationResponse.statusCode, 400);
  assert.deepEqual(registrationResponse.bodyJson(), {
    code: 'INVALID_CHALLENGE',
    message: 'No pending WebAuthn registration'
  });

  const authenticationResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/mfa/webauthn/assert',
    createJsonRequest('POST', '/auth/mfa/webauthn/assert', {
      credentialId: 'credential-1',
      authenticatorData: 'auth-data',
      clientDataJSON: 'client-data',
      signature: 'signature'
    }),
    authenticationResponse as never,
    'corr-auth-webauthn-assert-missing-challenge',
    handlers
  );
  assert.equal(authenticationResponse.statusCode, 400);
  assert.deepEqual(authenticationResponse.bodyJson(), {
    code: 'INVALID_CHALLENGE',
    message: 'No pending WebAuthn assertion'
  });
  assert.equal(registrationVerifyCalls, 0);
  assert.equal(authenticationVerifyCalls, 0);
});

test('OIDC state stores reject malformed values and consume state only once', () => {
  const inMemory = createInMemoryOidcStateStore();
  const value = {
    codeChallenge: 'challenge',
    codeVerifier: 'verifier',
    redirectUri: 'https://app.example.com/callback',
    createdAt: Date.now()
  };
  const state = inMemory.create(value);
  assert.deepEqual(inMemory.consume(state), value);
  assert.equal(inMemory.consume(state), null);

  const secret = 'oidc-state-test-secret';
  const stateless = createStatelessOidcStateStore(secret);
  assert.equal(stateless.consume('missing-separator'), null);
  const validState = stateless.create(value);
  assert.equal(stateless.consume(`${validState}.x`), null);
  assert.equal(
    stateless.consume(
      stateless.create({
        codeChallenge: 'challenge',
        codeVerifier: 'verifier',
        redirectUri: 'https://app.example.com/callback',
        createdAt: 'not-a-number'
      } as never)
    ),
    null
  );

  const invalidPayload = Buffer.from('{', 'utf8').toString('base64url');
  const invalidSignature = createHmac('sha256', secret).update(invalidPayload).digest('base64url');
  assert.equal(stateless.consume(`${invalidPayload}.${invalidSignature}`), null);
});

test('OIDC callback handles provider failures and optional userinfo paths', async () => {
  const config = createOidcConfig();
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () => {
      throw new Error('provider down');
    }) as typeof fetch;
    const exchangeFailureStore = createInMemoryOidcStateStore();
    const exchangeFailureState = exchangeFailureStore.create({
      codeChallenge: 'challenge',
      codeVerifier: 'verifier',
      redirectUri: config.redirectUri,
      createdAt: Date.now()
    });
    const exchangeFailureResponse = new MockResponse();
    await handleAuthRoutes(
      '/auth/oidc/callback',
      createJsonRequest(
        'GET',
        `/auth/oidc/callback?code=code&state=${encodeURIComponent(exchangeFailureState)}`
      ),
      exchangeFailureResponse as never,
      'corr-auth-oidc-provider-failure',
      createBaseAuthHandlers({
        featureFlags: { authOidcEnabled: true, authWebauthnEnabled: false },
        oidcConfig: config,
        oidcStateStore: exchangeFailureStore
      })
    );
    assert.equal(exchangeFailureResponse.statusCode, 502);
    assert.equal(exchangeFailureResponse.bodyJson<{ code: string }>().code, 'TOKEN_EXCHANGE_FAILED');

    globalThis.fetch = (async () => {
      throw 'provider down';
    }) as typeof fetch;
    const nonErrorStore = createInMemoryOidcStateStore();
    const nonErrorState = nonErrorStore.create({
      codeChallenge: 'challenge',
      codeVerifier: 'verifier',
      redirectUri: config.redirectUri,
      createdAt: Date.now()
    });
    const nonErrorResponse = new MockResponse();
    await handleAuthRoutes(
      '/auth/oidc/callback',
      createJsonRequest(
        'GET',
        `/auth/oidc/callback?code=code&state=${encodeURIComponent(nonErrorState)}`
      ),
      nonErrorResponse as never,
      'corr-auth-oidc-provider-non-error',
      createBaseAuthHandlers({
        featureFlags: { authOidcEnabled: true, authWebauthnEnabled: false },
        oidcConfig: config,
        oidcStateStore: nonErrorStore
      })
    );
    assert.equal(nonErrorResponse.statusCode, 502);
    assert.equal(nonErrorResponse.bodyJson<{ message: string }>().message, 'Token exchange failed');

    globalThis.fetch = (async (input: string | URL | Request) => {
      if (String(input).endsWith('/token')) {
        return new Response(
          JSON.stringify({ access_token: 'provider-access', token_type: 'Bearer', expires_in: 60 }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      throw new Error(`unexpected request ${String(input)}`);
    }) as typeof fetch;
    const noUserInfoStore = createInMemoryOidcStateStore();
    const noUserInfoState = noUserInfoStore.create({
      codeChallenge: 'challenge',
      codeVerifier: 'verifier',
      redirectUri: config.redirectUri,
      createdAt: Date.now()
    });
    const noUserInfoResponse = new MockResponse();
    await handleAuthRoutes(
      '/auth/oidc/callback',
      createJsonRequest(
        'GET',
        `/auth/oidc/callback?code=code&state=${encodeURIComponent(noUserInfoState)}`
      ),
      noUserInfoResponse as never,
      'corr-auth-oidc-no-userinfo',
      createBaseAuthHandlers({
        featureFlags: { authOidcEnabled: true, authWebauthnEnabled: false },
        oidcConfig: createOidcConfig({ userinfoEndpoint: undefined }),
        oidcStateStore: noUserInfoStore
      })
    );
    assert.equal(noUserInfoResponse.statusCode, 200);
    assert.equal(noUserInfoResponse.bodyJson<{ userInfo: unknown }>().userInfo, null);
    assert.equal(noUserInfoResponse.bodyJson<{ tokens: { scope: string } }>().tokens.scope, config.scope);

    globalThis.fetch = (async (input: string | URL | Request) => {
      if (String(input).endsWith('/token')) {
        return new Response(
          JSON.stringify({ access_token: 'provider-access', token_type: 'Bearer', expires_in: 60 }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      return new Response('userinfo unavailable', { status: 503 });
    }) as typeof fetch;
    const userInfoFailureStore = createInMemoryOidcStateStore();
    const userInfoFailureState = userInfoFailureStore.create({
      codeChallenge: 'challenge',
      codeVerifier: 'verifier',
      redirectUri: config.redirectUri,
      createdAt: Date.now()
    });
    const userInfoFailureResponse = new MockResponse();
    await handleAuthRoutes(
      '/auth/oidc/callback',
      createJsonRequest(
        'GET',
        `/auth/oidc/callback?code=code&state=${encodeURIComponent(userInfoFailureState)}`
      ),
      userInfoFailureResponse as never,
      'corr-auth-oidc-userinfo-failure',
      createBaseAuthHandlers({
        featureFlags: { authOidcEnabled: true, authWebauthnEnabled: false },
        oidcConfig: config,
        oidcStateStore: userInfoFailureStore
      })
    );
    assert.equal(userInfoFailureResponse.statusCode, 200);
    assert.equal(userInfoFailureResponse.bodyJson<{ userInfo: unknown }>().userInfo, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OIDC callback rejects protocol errors, incomplete callbacks, unknown states, and expired states', async () => {
  const config = createOidcConfig();
  const cases: readonly { query: string; expectedCode: string }[] = [
    { query: '?error=access_denied&error_description=denied-by-provider', expectedCode: 'OIDC_ERROR' },
    { query: '?error=access_denied', expectedCode: 'OIDC_ERROR' },
    { query: '?code=code-only', expectedCode: 'INVALID_CALLBACK' },
    { query: '?state=state-only', expectedCode: 'INVALID_CALLBACK' },
    { query: '?code=code&state=unknown', expectedCode: 'INVALID_STATE' }
  ];

  for (const [index, entry] of cases.entries()) {
    const response = new MockResponse();
    await handleAuthRoutes(
      '/auth/oidc/callback',
      createJsonRequest('GET', `/auth/oidc/callback${entry.query}`),
      response as never,
      `corr-auth-oidc-invalid-${index}`,
      createBaseAuthHandlers({
        featureFlags: { authOidcEnabled: true, authWebauthnEnabled: false },
        oidcConfig: config
      })
    );
    assert.equal(response.statusCode, 400, entry.query);
    assert.equal(response.bodyJson<{ code: string }>().code, entry.expectedCode, entry.query);
  }

  const expiredStore = createInMemoryOidcStateStore();
  const expiredState = expiredStore.create({
    codeChallenge: 'challenge',
    codeVerifier: 'verifier',
    redirectUri: config.redirectUri,
    createdAt: Date.now() - 61_000
  });
  const expiredResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/oidc/callback',
    createJsonRequest('GET', `/auth/oidc/callback?code=code&state=${encodeURIComponent(expiredState)}`),
    expiredResponse as never,
    'corr-auth-oidc-expired-state',
    createBaseAuthHandlers({
      featureFlags: { authOidcEnabled: true, authWebauthnEnabled: false },
      oidcConfig: config,
      oidcStateStore: expiredStore,
      oidcStateTtlMs: 1_000
    })
  );
  assert.equal(expiredResponse.statusCode, 400);
  assert.equal(expiredResponse.bodyJson<{ code: string }>().code, 'STATE_EXPIRED');
});

test('OIDC login and logout use configured redirects and safe local fallback', async () => {
  const oidcConfig = createOidcConfig({ endSessionEndpoint: 'https://issuer.example.com/logout' });
  const stateStore = createInMemoryOidcStateStore();
  const loginResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/oidc/login',
    createJsonRequest('GET', '/auth/oidc/login'),
    loginResponse as never,
    'corr-auth-oidc-login-default-redirect',
    createBaseAuthHandlers({
      featureFlags: { authOidcEnabled: true, authWebauthnEnabled: false },
      oidcConfig,
      oidcStateStore: stateStore
    })
  );
  assert.equal(loginResponse.statusCode, 302);
  const authorizationUrl = new URL(String(loginResponse.getHeader('location')));
  assert.equal(authorizationUrl.searchParams.get('redirect_uri'), oidcConfig.redirectUri);
  assert.ok(stateStore.consume(authorizationUrl.searchParams.get('state') ?? ''));

  const logoutResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/oidc/logout',
    createJsonRequest('POST', '/auth/oidc/logout', { idTokenHint: 'id-token' }),
    logoutResponse as never,
    'corr-auth-oidc-logout-redirect',
    createBaseAuthHandlers({ oidcConfig })
  );
  assert.equal(logoutResponse.statusCode, 302);
  assert.match(String(logoutResponse.getHeader('location')), /id_token_hint=id-token/);

  const fallbackResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/oidc/logout',
    createJsonRequest('POST', '/auth/oidc/logout', {}),
    fallbackResponse as never,
    'corr-auth-oidc-logout-fallback',
    createBaseAuthHandlers({ oidcConfig: createOidcConfig({ endSessionEndpoint: undefined }) })
  );
  assert.equal(fallbackResponse.statusCode, 200);
  assert.deepEqual(fallbackResponse.bodyJson(), {
    success: true,
    message: 'OIDC not configured for end-session'
  });
});

test('auth routes apply empty-body fallbacks only to routes that support them', async () => {
  let refreshToken: string | undefined;
  const refreshResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/refresh',
    createJsonRequest('POST', '/auth/refresh', undefined, {
      cookie: 'cvg_his_refresh=cookie-token'
    }),
    refreshResponse as never,
    'corr-auth-empty-refresh-body',
    createBaseAuthHandlers({
      auth: {
        refresh: async (input: { refreshToken: string }) => {
          refreshToken = input.refreshToken;
          return { accessToken: 'access', refreshToken: 'rotated' };
        }
      }
    })
  );
  assert.equal(refreshResponse.statusCode, 200);
  assert.equal(refreshToken, 'cookie-token');

  const mfaResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/login/mfa',
    createJsonRequest('POST', '/auth/login/mfa'),
    mfaResponse as never,
    'corr-auth-empty-mfa-body',
    createBaseAuthHandlers({
      auth: {
        completeMfaLogin: async () => {
          throw new Error('must not complete MFA without a body');
        }
      }
    })
  );
  assert.equal(mfaResponse.statusCode, 400);

  const noMatchingCookieResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/refresh',
    createJsonRequest('POST', '/auth/refresh', {}, { cookie: 'other=value' }),
    noMatchingCookieResponse as never,
    'corr-auth-cookie-no-match',
    createBaseAuthHandlers({
      auth: {
        refresh: async () => {
          throw new Error('must not refresh without a matching cookie');
        }
      }
    })
  );
  assert.equal(noMatchingCookieResponse.statusCode, 401);

  const oidcLogoutResponse = new MockResponse();
  await handleAuthRoutes(
    '/auth/oidc/logout',
    createJsonRequest('POST', '/auth/oidc/logout'),
    oidcLogoutResponse as never,
    'corr-auth-empty-oidc-logout-body',
    createBaseAuthHandlers({ oidcConfig: createOidcConfig({ endSessionEndpoint: undefined }) })
  );
  assert.equal(oidcLogoutResponse.statusCode, 200);
});
