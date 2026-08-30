import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

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
      headers: { 'x-rp-id': 'cvg.local' },
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
