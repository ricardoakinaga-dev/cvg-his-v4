import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { parse } from 'yaml';

import { createApiServer } from '../../apps/api/src/server.ts';
import { setAppState } from '../../apps/api/src/app-state.ts';
import { bootstrapServices, shutdownServices } from '../../apps/api/src/bootstrap.ts';
import { ApiKeysService } from '../../packages/modules/api-keys/src/index.ts';
import { runWithTenantContext } from '../../packages/tenant-context/src/index.ts';
import { TEST_DB_URL } from '../setup/env.ts';

const ACCOUNT_SLUG = 'default';
const ROUTE_USER_ID = 'a0111111-1111-4111-8111-111111111111';
const ROUTE_USERNAME = 'route-probe-admin';
const ROUTE_EMAIL = `${ROUTE_USERNAME}@example.com`;
const ROUTE_PASSWORD = 'seed_admin';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface OpenApiOperation {
  readonly security?: unknown;
  readonly requestBody?: unknown;
  readonly responses?: Readonly<
    Record<string, { readonly content?: Readonly<Record<string, unknown>> }>
  >;
}

interface OpenApiDocument {
  readonly paths: Record<string, Partial<Record<Lowercase<HttpMethod>, OpenApiOperation>>>;
}

interface LoginResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
}

interface CreatedApiKeyResponse {
  readonly apiKey: {
    readonly id: string;
    readonly name: string;
    readonly permissions: readonly string[];
  };
  readonly rawKey: string;
}

interface CreatedWebhookResponse {
  readonly id: string;
  readonly url: string;
  readonly isActive: boolean;
  readonly events: readonly string[];
}

interface RouteProbeResponse {
  readonly status: number;
  readonly text: string;
  readonly json?: Record<string, unknown>;
}

let server: ReturnType<typeof createApiServer>;
let baseUrl: string;
let pool: Pool;
let accessToken: string;
let refreshToken: string;
let rawApiKey: string;
let createdApiKeyId: string;
let accountId: string;
let tenantId: string;
let repositoriesUnderTest: Awaited<ReturnType<typeof bootstrapServices>>['repositories'];

function loadOpenApiDocument(): OpenApiDocument {
  return parse(readFileSync('apps/api/src/openapi.yaml', 'utf8')) as OpenApiDocument;
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; body: T; text: string }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  const body = text.length > 0 ? (JSON.parse(text) as T) : (undefined as T);
  return { status: response.status, body, text };
}

async function request(
  path: string,
  init: RequestInit = {},
  expectedBodyFormat: 'json' | 'text' = 'json'
): Promise<RouteProbeResponse> {
  const method = String(init.method ?? 'GET').toUpperCase();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${method} ${path} failed at the HTTP transport: ${detail}`, {
      cause: error
    });
  }

  const text = await response.text();

  if (text.trim().length === 0) {
    if (response.status === 204 || response.status === 205) {
      return { status: response.status, text };
    }

    throw new Error(`${method} ${path} returned an empty response body (HTTP ${response.status})`);
  }

  if (expectedBodyFormat === 'text' && response.status >= 200 && response.status < 300) {
    return { status: response.status, text };
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      `${method} ${path} returned a non-JSON response body (HTTP ${response.status})`,
      { cause: error }
    );
  }

  if (typeof parsedBody !== 'object' || parsedBody === null || Array.isArray(parsedBody)) {
    throw new Error(`${method} ${path} returned a non-object JSON body (HTTP ${response.status})`);
  }

  const json = parsedBody as Record<string, unknown>;
  return { status: response.status, text, json };
}

function isMissingRuntimeRoute(response: RouteProbeResponse): boolean {
  if (response.status !== 404 || !response.json) {
    return false;
  }

  const code = typeof response.json.code === 'string' ? response.json.code : '';
  const normalizedCode = code
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  const routeSpecificCode =
    /(?:^|_)(?:ROUTE|ENDPOINT)(?:_|$)/.test(normalizedCode) &&
    /(?:NOT_FOUND|MISSING|UNMAPPED|NO_MATCH)/.test(normalizedCode);

  const message =
    typeof response.json.message === 'string'
      ? response.json.message
      : typeof response.json.error === 'string'
        ? response.json.error
        : '';
  const identifiesRoute = /\b(?:route|endpoint)\b/i.test(message);
  const identifiesMissingTarget =
    /\b(?:not\s+found|missing|unmapped)\b/i.test(message) ||
    /\bno\b.*\bmatch(?:ed|es|ing)?\b/i.test(message);

  return routeSpecificCode || (identifiesRoute && identifiesMissingTarget);
}

function resolveRoutePath(pathname: string): string {
  const replacements: Record<string, string> = {
    ownerId: 'route-probe-owner',
    patientId: 'route-probe-patient',
    appointmentId: 'route-probe-appointment',
    queueEntryId: 'route-probe-queue',
    encounterId: 'route-probe-encounter',
    triageId: 'route-probe-triage',
    staffId: 'staff_admin',
    userId: 'user_admin',
    quoteId: 'route-probe-quote',
    webhookId: 'route-probe-webhook',
    deliveryId: 'route-probe-delivery',
    eventId: 'route-probe-event',
    intentId: 'route-probe-intent',
    stayId: 'route-probe-stay',
    dischargeId: 'route-probe-discharge',
    executionId: 'route-probe-execution',
    diagnosticOrderId: 'route-probe-diagnostic-order',
    orderId: 'route-probe-order',
    productId: 'route-probe-product',
    serviceId: 'route-probe-service',
    teamId: 'route-probe-team',
    sectorId: 'route-probe-sector',
    itemId: 'route-probe-item',
    inventoryItemId: 'route-probe-item',
    recordId: 'route-probe-record'
  };

  return pathname.replace(/\{([^}]+)\}/g, (_match, rawParam) => {
    const paramName = String(rawParam);
    return replacements[paramName] ?? `route-probe-${paramName}`;
  });
}

function buildRequestBody(method: HttpMethod, pathname: string): Record<string, unknown> | undefined {
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    if (pathname === '/auth/login') {
      return {
        accountSlug: ACCOUNT_SLUG,
        username: ROUTE_USERNAME,
        password: ROUTE_PASSWORD
      };
    }

    if (pathname === '/auth/refresh') {
      return {
        refreshToken: 'route-probe-invalid-refresh-token'
      };
    }

    if (pathname === '/payments/pix/intents') {
      return {
        amount: 10,
        description: 'route probe payment'
      };
    }

    return {};
  }

  return undefined;
}

function needsApiKey(pathname: string): boolean {
  return pathname.startsWith('/payments/') || pathname === '/integrations/catalog';
}

function isPublicOperation(operation: OpenApiOperation | undefined, pathname: string): boolean {
  if (!operation) {
    return false;
  }

  if (Array.isArray(operation.security) && operation.security.length === 0) {
    return true;
  }

  return pathname === '/webhooks/whatsapp/inbound';
}

function expectedSuccessBodyFormat(operation: OpenApiOperation | undefined): 'json' | 'text' {
  const successContentTypes = Object.entries(operation?.responses ?? {})
    .filter(([status]) => status.startsWith('2'))
    .flatMap(([, response]) => Object.keys(response.content ?? {}));

  const hasJsonResponse = successContentTypes.some((contentType) =>
    contentType.toLowerCase().includes('json')
  );
  const hasTextResponse = successContentTypes.some((contentType) =>
    contentType.toLowerCase().startsWith('text/')
  );

  return hasTextResponse && !hasJsonResponse ? 'text' : 'json';
}

async function cleanupProbeRows(): Promise<void> {
  await pool.query(`DELETE FROM api_key_usage WHERE api_key_id = $1`, [createdApiKeyId ?? null]);
  await pool.query(`DELETE FROM api_key_rate_limits WHERE api_key_id = $1`, [createdApiKeyId ?? null]);
  await pool.query(`DELETE FROM api_keys WHERE name LIKE 'Route Probe %'`);
  await pool.query(`DELETE FROM webhook_deliveries WHERE webhook_id IN (SELECT id FROM webhooks WHERE url LIKE 'https://route-probe.%')`);
  await pool.query(`DELETE FROM webhooks WHERE url LIKE 'https://route-probe.%'`);
  await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [ROUTE_USER_ID]);
  await pool.query(`DELETE FROM audit_events WHERE account_id = $1 OR actor_user_id = $2`, [
    accountId,
    ROUTE_USER_ID
  ]);
  await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [ROUTE_USER_ID]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [ROUTE_USER_ID]);
}

beforeAll(async () => {
  pool = new Pool({ connectionString: TEST_DB_URL, max: 2 });
  const accountResult = await pool.query<{ id: string; tenant_id: string }>(
    `SELECT id, tenant_id FROM accounts WHERE slug = $1`,
    [ACCOUNT_SLUG]
  );
  const defaultAccount = accountResult.rows[0];
  if (!defaultAccount) {
    throw new Error('Default account fixture is missing');
  }
  accountId = defaultAccount.id;
  tenantId = defaultAccount.tenant_id;

  await pool.query(
    `INSERT INTO users (id, account_id, email, password_hash, full_name)
     VALUES ($1, $2, $3, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Route Probe Admin')
     ON CONFLICT (id) DO NOTHING`,
    [ROUTE_USER_ID, accountId, ROUTE_EMAIL]
  );
  await pool.query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE name = 'admin'
     ON CONFLICT (user_id, role_id) DO NOTHING`,
    [ROUTE_USER_ID]
  );

  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-route-tests-')),
    maxRetries: 10,
    retryDelayMs: 1000
  });

  expect(bootstrap.databaseHealthy).toBe(true);
  expect(bootstrap.repositories.session?.constructor.name).toBe('DatabaseSessionRepository');
  expect(bootstrap.repositories.audit?.constructor.name).toBe('DatabaseAuditRepository');
  repositoriesUnderTest = bootstrap.repositories;

  setAppState({
    persistenceMode: 'database',
    databaseConfigured: true,
    databaseHealthy: true,
    databaseDetail: bootstrap.databaseDetail,
    repositoriesReady: true,
    repositoryCount: Object.values(repositoriesUnderTest).filter(Boolean).length,
    workerReady: true,
    workerDetail: 'Integration test runtime',
    productionReady: true,
    initialized: true
  });

  server = createApiServer({
    appName: 'api-routes-db-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    pixMockMode: true,
    emailMockMode: true,
    smsMockMode: true,
    googleCalendarMockMode: true,
    repositories: repositoriesUnderTest,
    fileStorage: bootstrap.fileStorage
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const loginResponse = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      accountSlug: ACCOUNT_SLUG,
      username: ROUTE_USERNAME,
      password: ROUTE_PASSWORD
    })
  });

  expect(loginResponse.status).toBe(200);
  accessToken = loginResponse.body.accessToken;
  refreshToken = loginResponse.body.refreshToken;

  const apiKeys = new ApiKeysService(repositoriesUnderTest.apiKey);
  const createdApiKey = await runWithTenantContext(
    {
      tenantId,
      accountId,
      userId: ROUTE_USER_ID,
      correlationId: 'corr-route-probe-api-key-bootstrap'
    },
    () =>
      apiKeys.create({
        accountId: accountId as never,
        name: 'Route Probe Bootstrap Key',
        permissions: ['integrations.read', 'payments.manage'],
        createdBy: ROUTE_USER_ID
      })
  );

  createdApiKeyId = createdApiKey.apiKey.id;
  rawApiKey = createdApiKey.rawKey;
});

afterAll(async () => {
  if (pool) {
    await cleanupProbeRows();
  }

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  if (pool) {
    await pool.end();
  }

  await shutdownServices();
});

describe('API Routes with Database', () => {
  it.each([
    { label: 'empty', responseText: '' },
    { label: 'non-JSON', responseText: '<html>not found</html>' }
  ])('rejects an unexpected $label route-probe response', async ({ responseText }) => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(responseText, { status: 200 }));

    try {
      await expect(request('/probe', { method: 'GET' })).rejects.toThrow('GET /probe');
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('accepts expected non-empty text from a documented text route', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('# HELP probe metric', { status: 200 }));

    try {
      await expect(request('/metrics', { method: 'GET' }, 'text')).resolves.toMatchObject({
        status: 200,
        text: '# HELP probe metric'
      });
    } finally {
      fetchMock.mockRestore();
    }
  });

  it.each([
    {
      label: 'current runtime fallback',
      response: {
        status: 404,
        text: '{"code":"NOT_FOUND","message":"Route not found"}',
        json: { code: 'NOT_FOUND', message: 'Route not found' }
      },
      expected: true
    },
    {
      label: 'route-specific error code',
      response: {
        status: 404,
        text: '{"code":"ROUTE_NOT_FOUND","message":"No endpoint matched the request"}',
        json: { code: 'ROUTE_NOT_FOUND', message: 'No endpoint matched the request' }
      },
      expected: true
    },
    {
      label: 'wording variation',
      response: {
        status: 404,
        text: '{"code":"NOT_FOUND","message":"Requested runtime route was not found"}',
        json: { code: 'NOT_FOUND', message: 'Requested runtime route was not found' }
      },
      expected: true
    },
    {
      label: 'missing resource',
      response: {
        status: 404,
        text: '{"code":"NOT_FOUND","message":"Webhook not found"}',
        json: { code: 'NOT_FOUND', message: 'Webhook not found' }
      },
      expected: false
    },
    {
      label: 'non-404 route-shaped error',
      response: {
        status: 400,
        text: '{"code":"ROUTE_NOT_FOUND","message":"Route not found"}',
        json: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' }
      },
      expected: false
    }
  ])('classifies $label robustly', ({ response, expected }) => {
    expect(isMissingRuntimeRoute(response)).toBe(expected);
  });

  it('persists tenant and actor UUIDs directly in durable audit events', async () => {
    const beforeCountResult = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::int AS total FROM audit_events`
    );
    const beforeCount = Number(beforeCountResult.rows[0]?.total ?? 0);

    const loginResponse = await requestJson<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accountSlug: ACCOUNT_SLUG,
        username: ROUTE_USERNAME,
        password: ROUTE_PASSWORD
      })
    });

    expect(loginResponse.status).toBe(200);

    let persistedRow:
      | {
          id: string;
          action: string;
          account_id: string | null;
          actor_user_id: string | null;
          metadata: Record<string, unknown> | null;
        }
      | undefined;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const result = await pool.query<{
        id: string;
        action: string;
        account_id: string | null;
        actor_user_id: string | null;
        metadata: Record<string, unknown> | null;
      }>(
        `SELECT id, action, account_id, actor_user_id, metadata
         FROM audit_events
         ORDER BY created_at DESC
         LIMIT 1`
      );

      const countResult = await pool.query<{ total: string }>(
        `SELECT COUNT(*)::int AS total FROM audit_events`
      );

      if (Number(countResult.rows[0]?.total ?? 0) > beforeCount) {
        persistedRow = result.rows[0];
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(persistedRow).toBeDefined();
    expect(persistedRow?.action).toBe('login');
    expect(persistedRow?.account_id).toBe(accountId);
    expect(persistedRow?.actor_user_id).toBe(ROUTE_USER_ID);
    expect(persistedRow?.metadata).toMatchObject({
      module: 'auth',
      payloadSummary: `User ${ROUTE_USERNAME} authenticated`,
      riskLevel: 'medium'
    });
  });

  it('returns an authentication error and durably audits a login for an unknown account', async () => {
    const correlationId = `unknown-account-${Date.now()}`;
    const response = await requestJson<{ code: string; message: string }>('/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlationId
      },
      body: JSON.stringify({
        accountSlug: 'defaut',
        username: ROUTE_USERNAME,
        password: ROUTE_PASSWORD
      })
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: 'AUTHENTICATION_ERROR',
      message: 'Invalid username or password'
    });

    const auditResult = await pool.query<{
      account_id: string | null;
      actor_user_id: string | null;
      action: string;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT account_id, actor_user_id, action, metadata
       FROM audit_events
       WHERE correlation_id = $1`,
      [correlationId]
    );

    expect(auditResult.rows).toHaveLength(1);
    expect(auditResult.rows[0]).toMatchObject({
      account_id: null,
      actor_user_id: null,
      action: 'login_failed'
    });
    expect(auditResult.rows[0]?.metadata).toMatchObject({
      module: 'auth',
      legacyAccountId: 'unknown',
      legacyActorId: 'anonymous',
      payloadSummary: 'Invalid username or password'
    });
  });

  it('persists webhook routes in the database', async () => {
    const createdWebhook = await requestJson<CreatedWebhookResponse>('/webhooks', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://route-probe.example/webhooks/db-flow',
        events: ['billing.record.created'],
        secret: 'route-probe-secret'
      })
    });

    expect(createdWebhook.status).toBe(201);
    expect(createdWebhook.body.url).toBe('https://route-probe.example/webhooks/db-flow');

    const webhookRow = await pool.query<{
      id: string;
      url: string;
      is_active: boolean;
    }>('SELECT id, url, is_active FROM webhooks WHERE id = $1', [createdWebhook.body.id]);

    expect(webhookRow.rowCount).toBe(1);
    expect(webhookRow.rows[0].url).toBe('https://route-probe.example/webhooks/db-flow');
    expect(webhookRow.rows[0].is_active).toBe(true);

    const patchedWebhook = await requestJson<CreatedWebhookResponse>(
      `/webhooks/${createdWebhook.body.id}`,
      {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          isActive: false,
          url: 'https://route-probe.example/webhooks/db-flow-updated'
        })
      }
    );

    expect(patchedWebhook.status).toBe(200);
    expect(patchedWebhook.body.isActive).toBe(false);

    const updatedWebhookRow = await pool.query<{
      url: string;
      is_active: boolean;
    }>('SELECT url, is_active FROM webhooks WHERE id = $1', [createdWebhook.body.id]);

    expect(updatedWebhookRow.rows[0].url).toBe(
      'https://route-probe.example/webhooks/db-flow-updated'
    );
    expect(updatedWebhookRow.rows[0].is_active).toBe(false);

    const apiKeyRow = await pool.query<{
      id: string;
      name: string;
      created_by: string;
    }>('SELECT id, name, created_by FROM api_keys WHERE id = $1', [createdApiKeyId]);

    expect(apiKeyRow.rowCount).toBe(1);
    expect(apiKeyRow.rows[0].name).toBe('Route Probe Bootstrap Key');
    expect(apiKeyRow.rows[0].created_by).toBe(ROUTE_USER_ID);
  });

  it('does not leave documented routes unmapped in the runtime router', async () => {
    const spec = loadOpenApiDocument();
    const failures: string[] = [];

    for (const [rawPath, operations] of Object.entries(spec.paths)) {
      for (const [rawMethod, operation] of Object.entries(operations)) {
        const method = rawMethod.toUpperCase() as HttpMethod;
        const pathname = resolveRoutePath(rawPath);
        const body = buildRequestBody(method, rawPath);
        const headers: Record<string, string> = {};

        if (body !== undefined) {
          headers['content-type'] = 'application/json';
        }

        if (needsApiKey(rawPath)) {
          headers['x-api-key'] = rawApiKey;
        } else if (!isPublicOperation(operation, rawPath)) {
          headers.authorization = `Bearer ${accessToken}`;
        } else if (!rawPath.startsWith('/health') && rawPath !== '/ready' && rawPath !== '/live') {
          headers['x-account-id'] = accountId;
        }

        const response = await request(
          pathname,
          {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined
          },
          expectedSuccessBodyFormat(operation)
        );

        const routeWasMissing = isMissingRuntimeRoute(response);

        if (routeWasMissing) {
          failures.push(`${method} ${rawPath}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
