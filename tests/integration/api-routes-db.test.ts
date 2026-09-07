import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { parse } from 'yaml';

import { createApiServer } from '../../apps/api/src/server.ts';
import { setAppState } from '../../apps/api/src/app-state.ts';
import { bootstrapServices, shutdownServices } from '../../apps/api/src/bootstrap.ts';
import { ApiKeysService } from '../../packages/modules/api-keys/src/index.ts';
import { runWithTenantContext } from '../../packages/tenant-context/src/index.ts';
import { TEST_DB_URL } from '../setup/env.ts';
import { hashSeedPassword } from '../../packages/db/src/password.ts';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface OpenApiOperation {
  readonly security?: unknown;
  readonly requestBody?: unknown;
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

let server: ReturnType<typeof createApiServer>;
let baseUrl: string;
let pool: Pool;
let accessToken: string;
let refreshToken: string;
let rawApiKey: string;
let createdApiKeyId: string;
const principal = { userId: randomUUID(), accountId: randomUUID(), tenantId: randomUUID() };
const USERNAME = `route-probe-${principal.userId}`;
const PASSWORD = 'route-probe-test-password';
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
  init: RequestInit = {}
): Promise<{ status: number; text: string; json?: Record<string, unknown> }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let json: Record<string, unknown> | undefined;

  if (text.length > 0) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = undefined;
    }
  }

  return { status: response.status, text, json };
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
        username: USERNAME,
        password: PASSWORD
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

async function cleanupProbeRows(): Promise<void> {
  await pool.query(`DELETE FROM api_key_usage WHERE api_key_id = $1`, [createdApiKeyId ?? null]);
  await pool.query(`DELETE FROM api_key_rate_limits WHERE api_key_id = $1`, [createdApiKeyId ?? null]);
  await pool.query('DELETE FROM api_keys WHERE account_id = $1', [principal.accountId]);
  await pool.query('DELETE FROM webhook_deliveries WHERE webhook_id IN (SELECT id FROM webhooks WHERE account_id = $1)', [principal.accountId]);
  await pool.query('DELETE FROM webhooks WHERE account_id = $1', [principal.accountId]);
  await pool.query('DELETE FROM audit_events WHERE account_id = $1 OR actor_user_id = $2', [principal.accountId, principal.userId]);
  await pool.query('DELETE FROM quotes WHERE account_id = $1', [principal.accountId]);
  await pool.query('DELETE FROM counter_sales WHERE account_id = $1', [principal.accountId]);
  await pool.query('DELETE FROM sessions WHERE account_id = $1', [principal.accountId]);
  await pool.query('DELETE FROM user_roles WHERE user_id = $1', [principal.userId]);
  await pool.query('DELETE FROM users WHERE id = $1', [principal.userId]);
  await pool.query('DELETE FROM accounts WHERE id = $1', [principal.accountId]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [principal.tenantId]);
}

beforeAll(async () => {
  pool = new Pool({ connectionString: TEST_DB_URL, max: 2 });
  await pool.query(`INSERT INTO tenants (id, slug, name, status) VALUES ($1, $2, 'Route Probe Tenant', 'active')`, [principal.tenantId, `probe-${principal.tenantId}`]);
  await pool.query(`INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, 'Route Probe Account')`, [principal.accountId, principal.tenantId, `probe-${principal.accountId}`]);
  await pool.query(`INSERT INTO users (id, account_id, username, email, password_hash, full_name) VALUES ($1, $2, $3, $4, $5, 'Route Probe User')`, [principal.userId, principal.accountId, USERNAME, `${USERNAME}@example.test`, await hashSeedPassword(PASSWORD)]);
  const role = await pool.query<{ id: string }>(`SELECT id FROM roles WHERE name = 'admin'`);
  expect(role.rowCount).toBe(1);
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [principal.userId, role.rows[0].id]);
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
    preserveSeedUsersWithRepository: false,
    repositories: repositoriesUnderTest,
    fileStorage: bootstrap.fileStorage,
    unitOfWork: bootstrap.unitOfWork
  });

  await server.ready;
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const loginResponse = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  });

  expect(loginResponse.status).toBe(200);
  accessToken = loginResponse.body.accessToken;
  refreshToken = loginResponse.body.refreshToken;

  const apiKeys = new ApiKeysService(repositoriesUnderTest.apiKey);
  const createdApiKey = await runWithTenantContext(
    {
      ...principal,
      correlationId: 'corr-route-probe-api-key-bootstrap'
    },
    () =>
      apiKeys.create({
        accountId: principal.accountId as never,
        name: 'Route Probe Bootstrap Key',
        permissions: ['integrations.read', 'payments.manage'],
        createdBy: principal.userId
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
  it('persists audit events with the authenticated database principal', async () => {
    const beforeCountResult = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::int AS total FROM audit_events`
    );
    const beforeCount = Number(beforeCountResult.rows[0]?.total ?? 0);

    const loginResponse = await requestJson<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
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
    expect(persistedRow?.account_id).toBe(principal.accountId);
    expect(persistedRow?.actor_user_id).toBe(principal.userId);
    expect(persistedRow?.metadata).toMatchObject({
      module: 'auth',
      payloadSummary: `User ${USERNAME} authenticated`,
      riskLevel: 'medium'
    });
    expect(persistedRow?.metadata).not.toHaveProperty('legacyAccountId');
    expect(persistedRow?.metadata).not.toHaveProperty('legacyActorId');
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
    expect(apiKeyRow.rows[0].created_by).toBe(principal.userId);
  });

  it.each([null, true, [], '', 'not-a-number', 4])(
    'rejects invalid laboratory reference ranges without an internal error (%j)',
    async (minValue) => {
      const response = await request('/laboratory/hemogram-reference-values', {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ parameter: 'probe', unit: 'g/L', minValue, maxValue: 3 })
      });
      expect(response.status).toBe(400);
      expect(response.json?.code).toBe('VALIDATION_ERROR');
    }
  );

  it.each(['equipment', 'report-types', 'reference-values'])(
    'returns not-found for an absent laboratory %s record',
    async (resource) => {
      const response = await request(`/laboratory/${resource}/${randomUUID()}`, {
        method: 'PATCH',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({})
      });
      expect(response.status).toBe(404);
      expect(response.json?.code).toBe('NOT_FOUND');
    }
  );

  it('does not leave documented routes unmapped in the runtime router', async () => {
    const spec = loadOpenApiDocument();
    const failures: string[] = [];

    async function ensureAuthenticatedProbe(): Promise<void> {
      const session = await request('/auth/session', {
        headers: { authorization: `Bearer ${accessToken}` }
      });
      if (session.status !== 200) {
        // Probing logout legitimately revokes the fixture's session. Restore it
        // before judging another route, so a global 401 cannot hide a missing route.
        const login = await requestJson<LoginResponse>('/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });
        expect(login.status).toBe(200);
        accessToken = login.body.accessToken;
      }
      const missing = await request(`/route-probe-nonexistent-${principal.userId}`, {
        headers: { authorization: `Bearer ${accessToken}` }
      });
      expect(missing.status).toBe(404);
      expect(missing.json?.message).toBe('Route not found');
    }

    for (const [rawPath, operations] of Object.entries(spec.paths)) {
      for (const [rawMethod, operation] of Object.entries(operations)) {
        if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(rawMethod)) continue;
        await ensureAuthenticatedProbe();
        const method = rawMethod.toUpperCase() as HttpMethod;
        const pathname = resolveRoutePath(rawPath);
        const body = buildRequestBody(method, rawPath);
        const headers: Record<string, string> = {};

        if (body !== undefined) {
          headers['content-type'] = 'application/json';
        }

        if (!isPublicOperation(operation, rawPath)) {
          headers.authorization = `Bearer ${accessToken}`;
        }
        if (needsApiKey(rawPath)) {
          headers['x-api-key'] = rawApiKey;
        } else if (!rawPath.startsWith('/health') && rawPath !== '/ready' && rawPath !== '/live') {
          headers['x-account-id'] = principal.accountId;
        }

        const response = await request(pathname, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined
        });

        const routeWasMissing =
          response.status === 404 && response.json?.message === 'Route not found';

        if (routeWasMissing) {
          failures.push(`${method} ${rawPath}`);
        }
        if (response.status === 429) {
          failures.push(`${method} ${rawPath}: rate limit prevented runtime dispatch verification`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
