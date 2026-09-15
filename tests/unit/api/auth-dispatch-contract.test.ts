import { readFileSync } from 'node:fs';

import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import { parse } from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createInMemoryOidcStateStore,
  handleAuthRoutes
} from '../../../apps/api/src/routes/auth-routes.js';

/**
 * Critical auth dispatch contract.
 *
 * This exercises the real dispatcher and handler decisions in
 * `handleAuthRoutes` by invoking it directly with controlled
 * request/response doubles and stubbed external dependencies (OIDC
 * provider calls, WebAuthn service). It deliberately does not mock the
 * router/matcher under test.
 *
 * Declared limit: this is the handler/dispatch boundary used by
 * `server.ts`, not an end-to-end HTTP proof. A full server round-trip and
 * the real OIDC provider belong to MA-08.
 */

const VALID_HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

const OIDC_CONFIG = {
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

type CriticalOperation = {
  key: string;
  method: 'GET' | 'POST';
  /** Runtime path sent to the dispatcher. */
  path: string;
  /** OpenAPI path template when the runtime path carries a concrete id. */
  documentedPath?: string;
  operationId: string;
  /** Permission required by `requirePrincipal`; undefined for public operations. */
  permission?: string;
  expectedStatus: number;
  body?: unknown;
};

const CRITICAL_OPERATIONS: readonly CriticalOperation[] = [
  {
    key: 'GET /auth/session',
    method: 'GET',
    path: '/auth/session',
    operationId: 'getSession',
    permission: 'auth.session.read',
    expectedStatus: 200
  },
  {
    key: 'GET /auth/sessions',
    method: 'GET',
    path: '/auth/sessions',
    operationId: 'listAuthSessions',
    permission: 'auth.session.read',
    expectedStatus: 200
  },
  {
    key: 'POST /auth/logout-all-others',
    method: 'POST',
    path: '/auth/logout-all-others',
    operationId: 'revokeOtherAuthSessions',
    permission: 'auth.session.read',
    expectedStatus: 200
  },
  {
    key: 'POST /auth/sessions/{sessionId}/revoke',
    method: 'POST',
    path: '/auth/sessions/session-2/revoke',
    documentedPath: '/auth/sessions/{sessionId}/revoke',
    operationId: 'revokeAuthSession',
    permission: 'auth.session.read',
    expectedStatus: 200
  },
  {
    key: 'GET /auth/mfa/webauthn/setup',
    method: 'GET',
    path: '/auth/mfa/webauthn/setup',
    operationId: 'beginWebAuthnRegistration',
    permission: 'auth.mfa.manage',
    expectedStatus: 200
  },
  {
    key: 'POST /auth/mfa/webauthn/setup',
    method: 'POST',
    path: '/auth/mfa/webauthn/setup',
    operationId: 'completeWebAuthnRegistration',
    permission: 'auth.mfa.manage',
    expectedStatus: 200,
    body: { credentialId: 'cred-1', attestationObject: 'attestation', clientDataJSON: 'client' }
  },
  {
    key: 'POST /auth/mfa/webauthn/authenticate',
    method: 'POST',
    path: '/auth/mfa/webauthn/authenticate',
    operationId: 'beginWebAuthnAuthentication',
    permission: 'auth.mfa.manage',
    expectedStatus: 200,
    body: {}
  },
  {
    key: 'POST /auth/mfa/webauthn/assert',
    method: 'POST',
    path: '/auth/mfa/webauthn/assert',
    operationId: 'verifyWebAuthnAssertion',
    permission: 'auth.mfa.manage',
    expectedStatus: 200,
    body: {
      credentialId: 'cred-1',
      authenticatorData: 'authenticator',
      clientDataJSON: 'client',
      signature: 'signature'
    }
  },
  {
    key: 'GET /auth/oidc/login',
    method: 'GET',
    path: '/auth/oidc/login',
    operationId: 'beginOidcLogin',
    expectedStatus: 302
  },
  {
    key: 'GET /auth/oidc/callback',
    method: 'GET',
    path: '/auth/oidc/callback',
    operationId: 'completeOidcLogin',
    expectedStatus: 200
  },
  {
    key: 'POST /auth/oidc/logout',
    method: 'POST',
    path: '/auth/oidc/logout',
    operationId: 'oidcLogout',
    expectedStatus: 302,
    body: { idTokenHint: 'provider-id-token' }
  }
];

function createPrincipal() {
  return {
    user: {
      id: 'user-1',
      accountId: 'acc-1',
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    session: {
      sessionId: 'session-1',
      userId: 'user-1',
      accountId: 'acc-1',
      createdAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-01-02T00:00:00Z',
      authTime: '2026-01-01T00:00:00Z',
      refreshExpiresAt: '2026-01-08T00:00:00Z',
      active: true
    },
    access: { roleCodes: ['admin'], permissions: [] }
  };
}

function createRequest(method: string, url: string, body?: unknown) {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
  return {
    method,
    url,
    headers: {} as Record<string, string>,
    socket: { remoteAddress: '127.0.0.1' },
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) yield chunk;
    }
  } as never;
}

class MockResponse {
  statusCode = 200;
  readonly headers = new Map<string, string>();
  body = '';

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  getHeader(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }

  end(payload?: string): this {
    this.body = payload ?? '';
    return this;
  }

  json<T>(): T {
    return JSON.parse(this.body) as T;
  }
}

function createWebAuthnService() {
  return {
    generateRegistrationOptions: async () => ({
      publicKeyOptions: { rp: { id: 'localhost' } },
      challenge: 'reg-challenge'
    }),
    verifyRegistration: async () => ({ credentialId: 'cred-1' }),
    generateAuthenticationOptions: async () => ({
      publicKeyOptions: { challenge: 'auth-challenge' },
      challenge: 'auth-challenge'
    }),
    verifyAuthentication: async () => ({ success: true })
  };
}

function createContext(overrides: Record<string, unknown> = {}) {
  const principal = createPrincipal();
  const oidcStateStore = createInMemoryOidcStateStore();
  const webauthnChallenges = new Map<string, { challenge: string; createdAt: number }>();
  const handlers: Record<string, unknown> = {
    auth: {
      listSessionsForUserAuthoritative: async () => [],
      revokeOtherSessions: async () => 2,
      revokeSessionForUser: async () => true
    },
    authRateLimiter: {
      check: async () => ({ limit: 100, remaining: 99, reset: 0, blocked: false, retryAfterMs: 0 })
    },
    logger: { error: () => {} },
    appName: 'dispatch-contract',
    featureFlags: { authOidcEnabled: true, authWebauthnEnabled: true },
    webauthnService: createWebAuthnService(),
    webauthnChallenges,
    webauthnChallengeTtlMs: 60_000,
    oidcConfig: OIDC_CONFIG,
    oidcStateStore,
    oidcStateTtlMs: 60_000,
    requirePrincipal: vi.fn(() => principal),
    appendAudit: () => {},
    ...overrides
  };

  return {
    handlers: handlers as never,
    requirePrincipal: handlers.requirePrincipal as ReturnType<typeof vi.fn>,
    oidcStateStore,
    webauthnChallenges,
    principal
  };
}

function requestForOperation(
  operation: CriticalOperation,
  context: ReturnType<typeof createContext>
) {
  let url = operation.path;
  if (operation.path === '/auth/oidc/callback') {
    const state = context.oidcStateStore.create({
      codeChallenge: 'code-challenge',
      codeVerifier: 'code-verifier',
      redirectUri: OIDC_CONFIG.redirectUri,
      createdAt: Date.now()
    });
    url = `${operation.path}?code=authorization-code&state=${encodeURIComponent(state)}`;
  }
  if (operation.path === '/auth/mfa/webauthn/setup' && operation.method === 'POST') {
    context.webauthnChallenges.set(`reg:${context.principal.user.id}`, {
      challenge: 'reg-challenge',
      createdAt: Date.now()
    });
  }
  if (operation.path === '/auth/mfa/webauthn/assert') {
    context.webauthnChallenges.set(`auth:${context.principal.user.id}`, {
      challenge: 'auth-challenge',
      createdAt: Date.now()
    });
  }
  return createRequest(operation.method, url, operation.body);
}

async function invoke(
  operation: CriticalOperation,
  context: ReturnType<typeof createContext>,
  requestOverride?: ReturnType<typeof createRequest>,
  pathOverride?: string
) {
  const response = new MockResponse();
  const handled = await handleAuthRoutes(
    pathOverride ?? operation.path,
    requestOverride ?? requestForOperation(operation, context),
    response as never,
    `corr-${operation.operationId}`,
    context.handlers
  );
  return { handled, response };
}

function stubOidcProvider(status = 200) {
  vi.stubGlobal('fetch', async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/token')) {
      if (status !== 200) {
        return new Response(JSON.stringify({ error: 'token_exchange_failed' }), {
          status,
          headers: { 'content-type': 'application/json' }
        });
      }
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
    return new Response(JSON.stringify({ sub: 'provider-user' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  });
}

function resolveSchema(document: Record<string, unknown>, schema: Record<string, unknown>) {
  if (schema?.$ref) {
    const name = String(schema.$ref).split('/').at(-1)!;
    return (document.components as Record<string, Record<string, unknown>>).schemas[name];
  }
  return schema;
}

function assertDocumentedEnvelope(
  document: Record<string, unknown>,
  operation: CriticalOperation,
  response: MockResponse
) {
  const docPath = operation.documentedPath ?? operation.path;
  const paths = document.paths as Record<string, Record<string, Record<string, unknown>>>;
  const documented = paths[docPath][operation.method.toLowerCase()].responses as Record<
    string,
    Record<string, unknown>
  >;
  const observed = documented[String(response.statusCode)];
  expect(observed, `${operation.key} must document ${response.statusCode}`).toBeDefined();
  const media = (observed.content as Record<string, Record<string, unknown>> | undefined)?.[
    'application/json'
  ];
  if (!media) return;
  const schema = resolveSchema(document, media.schema as Record<string, unknown>);
  const body = response.json<Record<string, unknown>>();
  for (const key of (schema.required as string[] | undefined) ?? []) {
    expect(body, `${operation.key} missing required "${key}"`).toHaveProperty(key);
  }
  for (const key of Object.keys((schema.properties as Record<string, unknown>) ?? {})) {
    expect(body, `${operation.key} missing documented property "${key}"`).toHaveProperty(key);
  }
}

describe('critical auth operations: OpenAPI, handler and dispatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('documents exactly the 11 critical runtime operations with matching operationIds', () => {
    const document = parse(readFileSync('apps/api/src/openapi.yaml', 'utf8'));
    const paths = document.paths as Record<string, Record<string, unknown>>;
    const isCritical = (routePath: string) =>
      routePath === '/auth/session' ||
      routePath === '/auth/sessions' ||
      routePath === '/auth/logout-all-others' ||
      routePath.startsWith('/auth/sessions/') ||
      routePath.startsWith('/auth/mfa/webauthn/') ||
      routePath.startsWith('/auth/oidc/');

    const documented: string[] = [];
    for (const [routePath, item] of Object.entries(paths)) {
      if (!isCritical(routePath)) continue;
      for (const method of VALID_HTTP_METHODS) {
        if (item[method]) documented.push(`${method.toUpperCase()} ${routePath}`);
      }
    }

    const expected = CRITICAL_OPERATIONS.map(
      (operation) => `${operation.method} ${operation.documentedPath ?? operation.path}`
    );
    expect(documented.sort()).toEqual(expected.sort());

    for (const operation of CRITICAL_OPERATIONS) {
      const docPath = operation.documentedPath ?? operation.path;
      const operationDoc = paths[docPath][operation.method.toLowerCase()];
      expect(operationDoc.operationId, operation.key).toBe(operation.operationId);
      expect(Object.keys(operationDoc.responses as object), operation.key).toContain(
        String(operation.expectedStatus)
      );
      if (operation.permission) {
        expect(operationDoc.security, `${operation.key} must inherit auth`).toBeUndefined();
      } else {
        expect(operationDoc.security, `${operation.key} must stay public`).toEqual([]);
      }
    }
  });

  it('dispatches every critical operation to its handler with the documented envelope', async () => {
    const document = parse(readFileSync('apps/api/src/openapi.yaml', 'utf8'));
    stubOidcProvider();

    for (const operation of CRITICAL_OPERATIONS) {
      const context = createContext();
      const { handled, response } = await invoke(operation, context);

      expect(handled, operation.key).toBe(true);
      expect(response.statusCode, operation.key).toBe(operation.expectedStatus);
      if (operation.permission) {
        expect(context.requirePrincipal, operation.key).toHaveBeenCalledWith(
          expect.anything(),
          operation.permission
        );
      } else {
        expect(context.requirePrincipal, operation.key).not.toHaveBeenCalled();
      }
      assertDocumentedEnvelope(document, operation, response);
    }
  });

  it('does not treat wrong methods or wrong paths as critical operations', async () => {
    for (const operation of CRITICAL_OPERATIONS) {
      for (const probe of [
        { label: 'wrong method', method: 'DELETE', path: operation.path },
        { label: 'typo path', method: operation.method, path: `${operation.path}x` }
      ]) {
        const context = createContext();
        const request = createRequest(probe.method, probe.path, operation.body);
        const { handled, response } = await invoke(
          operation,
          context,
          request as never,
          probe.path
        );
        expect(handled, `${operation.key} ${probe.label}`).toBe(false);
        expect(response.body, `${operation.key} ${probe.label}`).toBe('');
      }
    }

    const context = createContext();
    const { handled } = await invoke(
      CRITICAL_OPERATIONS[3],
      context,
      createRequest('POST', '/auth/sessions/session-2/revoke/extra'),
      '/auth/sessions/session-2/revoke/extra'
    );
    expect(handled).toBe(false);
  });

  it('fails closed without a principal for every protected operation', async () => {
    const protectedOperations = CRITICAL_OPERATIONS.filter((operation) => operation.permission);
    expect(protectedOperations).toHaveLength(8);

    for (const operation of protectedOperations) {
      const context = createContext({
        requirePrincipal: vi.fn(() => {
          throw new AuthenticationError('Missing bearer token');
        })
      });
      const request = requestForOperation(operation, context);
      const response = new MockResponse();

      await expect(
        handleAuthRoutes(
          operation.path,
          request,
          response as never,
          `corr-${operation.operationId}`,
          context.handlers
        ),
        operation.key
      ).rejects.toMatchObject({ name: 'AuthenticationError', statusCode: 401 });
      expect(response.body, operation.key).toBe('');
    }
  });

  it('returns canonical refusals instead of success when configuration or flags are missing', async () => {
    const webauthnOperations = CRITICAL_OPERATIONS.filter((operation) =>
      operation.path.startsWith('/auth/mfa/webauthn/')
    );
    for (const operation of webauthnOperations) {
      const noService = await invoke(operation, createContext({ webauthnService: undefined }));
      expect(noService.response.statusCode, `${operation.key} unconfigured service`).toBe(501);
      expect(noService.response.json<{ code: string }>().code).toBe('NOT_IMPLEMENTED');

      const flagDisabled = await invoke(
        operation,
        createContext({
          featureFlags: { authOidcEnabled: true, authWebauthnEnabled: false }
        })
      );
      expect(flagDisabled.response.statusCode, `${operation.key} disabled flag`).toBe(403);
      expect(flagDisabled.response.json<{ code: string }>().code).toBe('FLAG_DISABLED');
    }

    const oidcOperations = CRITICAL_OPERATIONS.filter((operation) =>
      operation.path.startsWith('/auth/oidc/')
    );
    for (const operation of oidcOperations) {
      const notConfigured = await invoke(operation, createContext({ oidcConfig: null }));
      expect(notConfigured.response.statusCode, `${operation.key} unconfigured`).toBe(501);
      expect(notConfigured.response.json<{ code: string }>().code).toBe('NOT_CONFIGURED');
    }

    for (const operation of oidcOperations.filter(
      (candidate) => candidate.path !== '/auth/oidc/logout'
    )) {
      const flagDisabled = await invoke(
        operation,
        createContext({
          featureFlags: { authOidcEnabled: false, authWebauthnEnabled: true }
        })
      );
      expect(flagDisabled.response.statusCode, `${operation.key} disabled flag`).toBe(403);
      expect(flagDisabled.response.json<{ code: string }>().code).toBe('FLAG_DISABLED');
    }
  });

  it('rejects invalid critical-operation input with the documented error status', async () => {
    const setup = CRITICAL_OPERATIONS.find(
      (operation) => operation.key === 'POST /auth/mfa/webauthn/setup'
    )!;
    const noRegistrationChallenge = await invoke(
      setup,
      createContext(),
      createRequest('POST', setup.path, setup.body)
    );
    expect(noRegistrationChallenge.response.statusCode).toBe(400);
    expect(noRegistrationChallenge.response.json<{ code: string }>().code).toBe(
      'INVALID_CHALLENGE'
    );

    const assertOperation = CRITICAL_OPERATIONS.find(
      (operation) => operation.key === 'POST /auth/mfa/webauthn/assert'
    )!;
    const noAssertionChallenge = await invoke(
      assertOperation,
      createContext(),
      createRequest('POST', assertOperation.path, assertOperation.body)
    );
    expect(noAssertionChallenge.response.statusCode).toBe(400);
    expect(noAssertionChallenge.response.json<{ code: string }>().code).toBe(
      'INVALID_CHALLENGE'
    );

    const callback = CRITICAL_OPERATIONS.find(
      (operation) => operation.key === 'GET /auth/oidc/callback'
    )!;
    const missingParameters = await invoke(
      callback,
      createContext(),
      createRequest('GET', callback.path)
    );
    expect(missingParameters.response.statusCode).toBe(400);
    expect(missingParameters.response.json<{ code: string }>().code).toBe('INVALID_CALLBACK');

    const providerError = await invoke(
      callback,
      createContext(),
      createRequest('GET', `${callback.path}?error=access_denied&error_description=denied`)
    );
    expect(providerError.response.statusCode).toBe(400);
    expect(providerError.response.json<{ code: string }>().code).toBe('OIDC_ERROR');

    const invalidState = await invoke(
      callback,
      createContext(),
      createRequest('GET', `${callback.path}?code=code-1&state=unknown-state`)
    );
    expect(invalidState.response.statusCode).toBe(400);
    expect(invalidState.response.json<{ code: string }>().code).toBe('INVALID_STATE');
  });

  it('fails the assertion and the token exchange without faking success', async () => {
    const assertOperation = CRITICAL_OPERATIONS.find(
      (operation) => operation.key === 'POST /auth/mfa/webauthn/assert'
    )!;
    const failedAssertion = createContext({
      webauthnService: {
        ...createWebAuthnService(),
        verifyAuthentication: async () => ({ success: false })
      }
    });
    const assertionResult = await invoke(assertOperation, failedAssertion);
    expect(assertionResult.response.statusCode).toBe(401);
    expect(assertionResult.response.json<{ code: string }>().code).toBe('AUTHENTICATION_FAILED');

    const callback = CRITICAL_OPERATIONS.find(
      (operation) => operation.key === 'GET /auth/oidc/callback'
    )!;
    stubOidcProvider(500);
    const failedExchange = await invoke(callback, createContext());
    expect(failedExchange.response.statusCode).toBe(502);
    expect(failedExchange.response.json<{ code: string }>().code).toBe('TOKEN_EXCHANGE_FAILED');
  });
});
