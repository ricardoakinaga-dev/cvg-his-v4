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
import { TEST_DB_URL } from '../setup/env.ts';

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
        username: 'admin',
        password: 'seed_admin'
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
  await pool.query(`DELETE FROM api_keys WHERE name LIKE 'Route Probe %'`);
  await pool.query(`DELETE FROM webhook_deliveries WHERE webhook_id IN (SELECT id FROM webhooks WHERE url LIKE 'https://route-probe.%')`);
  await pool.query(`DELETE FROM webhooks WHERE url LIKE 'https://route-probe.%'`);
}

beforeAll(async () => {
  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-route-tests-')),
    maxRetries: 10,
    retryDelayMs: 1000
  });

  expect(bootstrap.databaseHealthy).toBe(true);
  expect(bootstrap.repositories.session?.constructor.name).toBe('InMemorySessionRepository');
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
    repositories: repositoriesUnderTest,
    fileStorage: bootstrap.fileStorage
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  pool = new Pool({ connectionString: TEST_DB_URL, max: 2 });

  const loginResponse = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'seed_admin' })
  });

  expect(loginResponse.status).toBe(200);
  accessToken = loginResponse.body.accessToken;
  refreshToken = loginResponse.body.refreshToken;

  const apiKeys = new ApiKeysService(repositoriesUnderTest.apiKey);
  const createdApiKey = await apiKeys.create({
    accountId: 'acc_cvg_demo' as never,
    name: 'Route Probe Bootstrap Key',
    permissions: ['integrations.read', 'payments.manage'],
    createdBy: 'user_admin'
  });

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
  it('persists audit events in the database while preserving legacy runtime ids in metadata', async () => {
    const beforeCountResult = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::int AS total FROM audit_events`
    );
    const beforeCount = Number(beforeCountResult.rows[0]?.total ?? 0);

    const loginResponse = await requestJson<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'seed_admin' })
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
    expect(persistedRow?.account_id).toBeNull();
    expect(persistedRow?.actor_user_id).toBeNull();
    expect(persistedRow?.metadata).toMatchObject({
      module: 'auth',
      legacyAccountId: 'acc_cvg_demo',
      legacyActorId: 'user_admin',
      payloadSummary: 'User admin authenticated',
      riskLevel: 'medium'
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
    expect(apiKeyRow.rows[0].created_by).toBe('user_admin');
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
          headers['x-account-id'] = 'acc_cvg_demo';
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
      }
    }

    expect(failures).toEqual([]);
  });
});
