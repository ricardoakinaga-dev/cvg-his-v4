import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';

import {
  createInMemoryOidcStateStore,
  createStatelessOidcStateStore,
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

  const handled = await handleAuthRoutes(
    '/auth/sessions',
    { method: 'GET', url: '/auth/sessions', headers: {} } as never,
    response as never,
    'corr-auth-sessions',
    {
      auth: {
        listSessionsForUser: () => [principal.session]
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
  assert.deepEqual(response.bodyJson(), { items: [principal.session] });
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
  assert.equal(response.bodyJson<{ accessToken: string }>().accessToken, 'token-1');
});

test('handleAuthRoutes POST /auth/login maps authentication failures to a safe 401 response', async () => {
  const response = new MockResponse();

  const handled = await handleAuthRoutes(
    '/auth/login',
    {
      method: 'POST',
      url: '/auth/login',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(JSON.stringify({ username: 'admin', password: 'wrong' }));
      }
    } as never,
    response as never,
    'corr-auth-invalid-credentials',
    {
      auth: {
        login: async () => {
          throw new AuthenticationError('Invalid credentials');
        }
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
  assert.equal(response.bodyJson<{ code: string }>().code, 'AUTHENTICATION_ERROR');
  assert.doesNotMatch(response.bodyJson<{ message?: string }>().message ?? '', /stack|secret/i);
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

test('OIDC state stores reject malformed values and consume valid state only once', () => {
  const memory = createInMemoryOidcStateStore();
  const state = memory.create({
    codeChallenge: 'challenge',
    codeVerifier: 'verifier',
    redirectUri: 'https://app.example.com/callback',
    createdAt: Date.now()
  });
  assert.ok(memory.consume(state));
  assert.equal(memory.consume(state), null);
  assert.equal(memory.consume('missing'), null);

  const stateless = createStatelessOidcStateStore('enterprise-secret');
  assert.equal(stateless.consume('missing-separator'), null);
  assert.equal(stateless.consume('payload.short'), null);
  const invalidShape = stateless.create({ createdAt: Date.now() } as never);
  assert.equal(stateless.consume(invalidShape), null);
});

test('handleAuthRoutes exposes safe MFA, WebAuthn and OIDC edge responses', async () => {
  const principal = createPrincipal();
  const oidcConfig = {
    issuer: 'https://issuer.example.com',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'https://app.example.com/auth/callback',
    scope: 'openid profile email',
    authorizationEndpoint: 'https://issuer.example.com/auth',
    tokenEndpoint: 'https://issuer.example.com/token',
    userinfoEndpoint: 'https://issuer.example.com/userinfo',
    endSessionEndpoint: 'https://issuer.example.com/logout'
  };
  const request = (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) => ({
    method,
    url,
    headers,
    socket: { remoteAddress: undefined },
    [Symbol.asyncIterator]: async function* () {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    }
  });
  const baseHandlers = {
    auth: {} as never,
    authRateLimiter: {
      check: async () => ({ limit: 5, remaining: 4, reset: 123, blocked: false, retryAfterMs: 0 })
    },
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
  const invoke = async (
    pathname: string,
    method: string,
    overrides: Record<string, unknown> = {},
    body?: unknown,
    url = pathname,
    headers: Record<string, string> = {}
  ) => {
    const response = new MockResponse();
    const handled = await handleAuthRoutes(
      pathname,
      request(method, url, body, headers) as never,
      response as never,
      `corr-edge-${pathname}`,
      { ...baseHandlers, ...overrides } as never
    );
    return { handled, response };
  };

  for (const [pathname, method] of [
    ['/mfa/setup', 'POST'],
    ['/mfa/setup/confirm', 'POST'],
    ['/mfa/status', 'GET'],
    ['/mfa/disable', 'POST'],
    ['/mfa/recovery-codes/regenerate', 'POST'],
    ['/auth/mfa/webauthn/setup', 'GET'],
    ['/auth/mfa/webauthn/setup', 'POST'],
    ['/auth/mfa/webauthn/authenticate', 'POST'],
    ['/auth/mfa/webauthn/assert', 'POST']
  ] as const) {
    const { response } = await invoke(pathname, method, {}, {});
    assert.equal(response.statusCode, pathname === '/mfa/status' ? 200 : 501);
  }

  const webauthnDisabled = { generateRegistrationOptions: async () => ({}) } as never;
  for (const [pathname, method] of [
    ['/auth/mfa/webauthn/setup', 'GET'],
    ['/auth/mfa/webauthn/setup', 'POST'],
    ['/auth/mfa/webauthn/authenticate', 'POST'],
    ['/auth/mfa/webauthn/assert', 'POST']
  ] as const) {
    const { response } = await invoke(pathname, method, { webauthnService: webauthnDisabled }, {});
    assert.equal(response.statusCode, 403);
  }

  const challenges = new Map<string, { challenge: string; createdAt: number }>();
  const webauthnService = {
    async generateRegistrationOptions() {
      return { publicKeyOptions: { rp: { id: 'clinic.example.com' } }, challenge: 'reg-challenge' };
    },
    async verifyRegistration() { return { credentialId: 'credential-1' }; },
    async generateAuthenticationOptions() {
      return { publicKeyOptions: {}, challenge: 'auth-challenge' };
    },
    async verifyAuthentication() { return { success: false }; }
  };
  const webauthnOverrides = {
    webauthnService,
    webauthnChallenges: challenges,
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: true }
  };
  const setup = await invoke(
    '/auth/mfa/webauthn/setup',
    'GET',
    webauthnOverrides,
    undefined,
    '/auth/mfa/webauthn/setup',
    { 'x-rp-id': 'clinic.example.com' }
  );
  assert.equal(setup.response.statusCode, 200);
  const registration = await invoke('/auth/mfa/webauthn/setup', 'POST', webauthnOverrides, {
    credentialId: 'credential-1',
    attestationObject: 'attestation',
    clientDataJSON: 'client-data'
  });
  assert.equal(registration.response.statusCode, 200);

  const authentication = await invoke('/auth/mfa/webauthn/authenticate', 'POST', webauthnOverrides, {
    credentialId: 'credential-1'
  });
  assert.equal(authentication.response.statusCode, 200);
  const failedAssertion = await invoke('/auth/mfa/webauthn/assert', 'POST', webauthnOverrides, {
    credentialId: 'credential-1',
    authenticatorData: 'auth-data',
    clientDataJSON: 'client-data',
    signature: 'signature'
  });
  assert.equal(failedAssertion.response.statusCode, 401);

  const missingChallenge = await invoke('/auth/mfa/webauthn/assert', 'POST', webauthnOverrides, {
    credentialId: 'credential-1',
    authenticatorData: 'auth-data',
    clientDataJSON: 'client-data',
    signature: 'signature'
  });
  assert.equal(missingChallenge.response.statusCode, 400);
  assert.equal(missingChallenge.response.bodyJson<{ code: string }>().code, 'INVALID_CHALLENGE');

  for (const [pathname, method] of [
    ['/auth/oidc/login', 'GET'],
    ['/auth/oidc/callback', 'GET'],
    ['/auth/oidc/logout', 'POST']
  ] as const) {
    const { response } = await invoke(pathname, method);
    assert.equal(response.statusCode, 501);
  }
  for (const pathname of ['/auth/oidc/login', '/auth/oidc/callback']) {
    const { response } = await invoke(pathname, 'GET', { oidcConfig });
    assert.equal(response.statusCode, 403);
  }

  const oidcEnabled = {
    oidcConfig,
    featureFlags: { authOidcEnabled: true, authWebauthnEnabled: false }
  };
  const providerError = await invoke(
    '/auth/oidc/callback',
    'GET',
    oidcEnabled,
    undefined,
    '/auth/oidc/callback?error=access_denied'
  );
  assert.equal(providerError.response.statusCode, 400);
  assert.equal(providerError.response.bodyJson<{ message: string }>().message, 'access_denied');
  const invalidCallback = await invoke('/auth/oidc/callback', 'GET', oidcEnabled);
  assert.equal(invalidCallback.response.bodyJson<{ code: string }>().code, 'INVALID_CALLBACK');

  const expiredStore = createInMemoryOidcStateStore();
  const expiredState = expiredStore.create({
    codeChallenge: 'challenge',
    codeVerifier: 'verifier',
    redirectUri: oidcConfig.redirectUri,
    createdAt: Date.now() - 10_000
  });
  const expired = await invoke(
    '/auth/oidc/callback',
    'GET',
    { ...oidcEnabled, oidcStateStore: expiredStore, oidcStateTtlMs: 1 },
    undefined,
    `/auth/oidc/callback?code=code&state=${encodeURIComponent(expiredState)}`
  );
  assert.equal(expired.response.bodyJson<{ code: string }>().code, 'STATE_EXPIRED');

  const localLogoutConfig = { ...oidcConfig, endSessionEndpoint: undefined };
  const localLogout = await invoke('/auth/oidc/logout', 'POST', { oidcConfig: localLogoutConfig }, {});
  assert.equal(localLogout.response.statusCode, 200);
  const providerLogout = await invoke(
    '/auth/oidc/logout',
    'POST',
    { oidcConfig },
    { idTokenHint: 'id-token' }
  );
  assert.equal(providerLogout.response.statusCode, 302);
  assert.match(providerLogout.response.getHeader('location') ?? '', /id_token_hint=id-token/);

  const revoked = await invoke('/auth/sessions/session-inactive/revoke', 'POST', {
    auth: { revokeSessionForUser: () => false }
  });
  assert.equal(revoked.response.bodyJson<{ revoked: boolean }>().revoked, false);

  const mfaLimited = await invoke('/auth/login/mfa', 'POST', {
    authRateLimiter: {
      check: async () => ({ limit: 5, remaining: 0, reset: 123, blocked: true, retryAfterMs: 1000 })
    }
  });
  assert.equal(mfaLimited.response.statusCode, 429);
});

test('handleAuthRoutes completes refresh, logout, TOTP and successful WebAuthn contracts', async () => {
  const principal = createPrincipal();
  const calls: string[] = [];
  const mfaService = {
    async initiateSetup() { calls.push('setup'); return { secret: 'secret', qrCode: 'qr' }; },
    async confirmSetup() { calls.push('confirm'); return { isActive: true }; },
    async isMfaActive() { calls.push('status'); return true; },
    isMfaRequired() { return true; },
    async disableMfa() { calls.push('disable'); },
    async regenerateRecoveryCodes() { calls.push('recovery'); return ['code-1']; }
  };
  const auth = {
    mfaService,
    refresh: () => ({ accessToken: 'refreshed' }),
    logout: () => { calls.push('logout'); },
    completeMfaLogin: async () => ({ accessToken: 'mfa-token' })
  };
  const challenges = new Map<string, { challenge: string; createdAt: number }>();
  const webauthnService = {
    async generateAuthenticationOptions() {
      return { publicKeyOptions: {}, challenge: 'auth-success' };
    },
    async verifyAuthentication() { return { success: true }; }
  };
  const handlers = {
    auth,
    authRateLimiter: {
      check: async () => ({ limit: 5, remaining: 4, reset: 123, blocked: false, retryAfterMs: 0 })
    },
    logger: { error: () => {} },
    appName: 'test-app',
    featureFlags: { authOidcEnabled: false, authWebauthnEnabled: true },
    webauthnService,
    webauthnChallenges: challenges,
    webauthnChallengeTtlMs: DEFAULT_WEBAUTHN_CHALLENGE_TTL_MS,
    oidcConfig: null,
    oidcStateStore: createInMemoryOidcStateStore(),
    oidcStateTtlMs: 60_000,
    requirePrincipal: () => principal,
    appendAudit: () => {}
  };
  const invoke = async (
    pathname: string,
    method: string,
    body?: unknown,
    headers: Record<string, string> = {}
  ) => {
    const response = new MockResponse();
    await handleAuthRoutes(
      pathname,
      {
        method,
        url: pathname,
        headers,
        socket: { remoteAddress: '127.0.0.1' },
        [Symbol.asyncIterator]: async function* () {
          if (body !== undefined) yield Buffer.from(JSON.stringify(body));
        }
      } as never,
      response as never,
      `corr-success-${pathname}`,
      handlers as never
    );
    return response;
  };

  assert.equal((await invoke('/auth/refresh', 'POST', { refreshToken: 'refresh' })).statusCode, 200);
  assert.equal(
    (await invoke('/auth/logout', 'POST', { refreshToken: 'refresh' }, { authorization: 'Bearer token' })).statusCode,
    204
  );
  assert.equal((await invoke('/auth/login/mfa', 'POST', { userId: 'user-1', token: '123456' })).statusCode, 200);
  assert.equal((await invoke('/mfa/setup', 'POST')).statusCode, 200);
  assert.equal((await invoke('/mfa/setup/confirm', 'POST', { token: '123456' })).statusCode, 200);
  assert.equal((await invoke('/mfa/status', 'GET')).bodyJson<{ isRequired: boolean }>().isRequired, true);
  assert.equal((await invoke('/mfa/disable', 'POST', { token: '123456' })).statusCode, 200);
  assert.deepEqual(
    (await invoke('/mfa/recovery-codes/regenerate', 'POST')).bodyJson<{ recoveryCodes: string[] }>().recoveryCodes,
    ['code-1']
  );

  await invoke('/auth/mfa/webauthn/authenticate', 'POST', {});
  const assertion = await invoke('/auth/mfa/webauthn/assert', 'POST', {
    credentialId: 'credential-success',
    authenticatorData: 'auth-data',
    clientDataJSON: 'client-data',
    signature: 'signature'
  }, { 'x-rp-id': 'clinic.example.com' });
  assert.equal(assertion.statusCode, 200);
  assert.deepEqual(calls, ['logout', 'setup', 'confirm', 'status', 'disable', 'recovery']);
});
