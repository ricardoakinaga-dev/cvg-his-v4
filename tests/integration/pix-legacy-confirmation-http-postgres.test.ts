import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setAppState } from '../../apps/api/src/app-state.js';
import { bootstrapServices, shutdownServices } from '../../apps/api/src/bootstrap.js';
import { LocalPixPaymentGateway } from '../../apps/api/src/payment-gateway.js';
import { createApiServer, type ApiServer } from '../../apps/api/src/server.js';
import {
  ApiKeysService,
  type ApiKeyRepository
} from '../../packages/modules/api-keys/src/index.ts';
import type {
  ApiKeyId,
  ApiKeySummary,
  ApiKeyUsageSummary
} from '../../packages/shared/types/src/index.ts';
import { runWithTenantContext } from '../../packages/tenant-context/src/index.ts';
import { getTestPool } from '../db/db-admin.js';
import { TEST_DB_URL } from '../setup/env.js';

interface AccountFixture {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly billingRecordId: string;
  readonly attemptId: string;
  readonly transactionId: string;
}

interface ApiKeyFixture {
  readonly id: string;
  readonly rawKey: string;
}

interface RuntimeFixture {
  readonly repositories: Awaited<ReturnType<typeof bootstrapServices>>['repositories'];
  readonly fileStorage: Awaited<ReturnType<typeof bootstrapServices>>['fileStorage'];
}

const servers: ApiServer[] = [];
let server: ApiServer;
let baseUrl: string;
let runtime: RuntimeFixture;
let owner: AccountFixture;
let foreign: AccountFixture;
let ownerKey: ApiKeyFixture;
let foreignKey: ApiKeyFixture;
let confirmGatewayCalls = 0;
let originalConfirmPayment: typeof LocalPixPaymentGateway.prototype.confirmPayment;

function correlationId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function dateAfterMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function createAccountFixture(label: string): Promise<AccountFixture> {
  const pool = getTestPool();
  const tenantId = randomUUID();
  const accountId = randomUUID();
  const userId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const billingRecordId = `legacy-pix-http-${randomUUID()}`;
  const attemptId = randomUUID();
  const transactionId = `pix-legacy-http-${randomUUID()}`;
  const suffix = accountId.replaceAll('-', '');
  const amountCents = 12_345;

  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, $3, 'active')`,
    [tenantId, `legacy-pix-http-${suffix}`, `Legacy PIX HTTP ${label}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, $4)`,
    [accountId, tenantId, `legacy-pix-http-${suffix}`, `Legacy PIX HTTP ${label}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', $5)`,
    [userId, accountId, `legacy_pix_http_${suffix}`, `${suffix}@example.com`, label]
  );
  await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, $3)`, [
    ownerId,
    accountId,
    `${label} owner`
  ]);
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, $4, 'canine')`,
    [patientId, accountId, ownerId, `${label} patient`]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'open', $5)`,
    [encounterId, accountId, patientId, ownerId, userId]
  );
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, 'open', $6, 'BRL')`,
    [billingRecordId, accountId, encounterId, patientId, ownerId, amountCents / 100]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type, description,
       quantity, unit_price_amount, total_amount, created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'service', 'PIX HTTP proof item', 1, $5, $5, $6)`,
    [randomUUID(), accountId, billingRecordId, encounterId, amountCents / 100, userId]
  );
  await pool.query(
    `INSERT INTO encounter_payment_attempts (
       id, account_id, encounter_id, billing_record_id, requested_by_user_id,
       payment_method, provider_key, state, amount_cents, currency,
       request_key_hash, provider_idempotency_key, next_attempt_at
     ) VALUES ($1, $2, $3, $4, $5, 'pix', 'local-pix', 'awaiting_confirmation', $6, 'BRL', $7, $8, NULL)`,
    [
      attemptId,
      accountId,
      encounterId,
      billingRecordId,
      userId,
      amountCents,
      randomUUID().replaceAll('-', '').padEnd(64, 'a').slice(0, 64),
      `cvg:pix:create:v1:${attemptId}`
    ]
  );

  return { tenantId, accountId, userId, billingRecordId, attemptId, transactionId };
}

function mapApiKey(row: Record<string, unknown>): ApiKeySummary {
  const permissions = Array.isArray(row.permissions)
    ? row.permissions
    : (JSON.parse(String(row.permissions)) as unknown);
  return {
    id: row.id as ApiKeyId,
    accountId: row.account_id as ApiKeySummary['accountId'],
    name: row.name as string,
    keyPrefix: row.key_prefix as string,
    keyHash: row.key_hash as string,
    permissions: permissions as readonly string[],
    rateLimit: row.rate_limit as number,
    rateLimitWindow: row.rate_limit_window as number,
    expiresAt: row.expires_at ? new Date(row.expires_at as string).toISOString() : null,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at as string).toISOString() : null,
    isActive: row.is_active as boolean,
    createdBy: row.created_by as string,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString()
  };
}

/**
 * API-key bootstrap happens before the HTTP request has an account context.
 * The application repository uses tenant-scoped queries once that account is
 * known. PostgreSQL returns JSONB permissions as an array, while the existing
 * repository expects a JSON string. This adapter keeps the whole API-key flow
 * database-backed while accepting the driver's canonical JSONB representation.
 */
function createPostgresApiKeyRepository(): ApiKeyRepository {
  return {
    async create(apiKey: ApiKeySummary): Promise<void> {
      await getTestPool().query(
        `INSERT INTO api_keys (
           id, account_id, name, key_prefix, key_hash, permissions, rate_limit,
           rate_limit_window, expires_at, last_used_at, is_active, created_by, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          apiKey.id,
          apiKey.accountId,
          apiKey.name,
          apiKey.keyPrefix,
          apiKey.keyHash,
          JSON.stringify(apiKey.permissions),
          apiKey.rateLimit,
          apiKey.rateLimitWindow,
          apiKey.expiresAt ? new Date(apiKey.expiresAt) : null,
          apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt) : null,
          apiKey.isActive,
          apiKey.createdBy,
          new Date(apiKey.createdAt),
          new Date(apiKey.updatedAt)
        ]
      );
    },
    async findById(id: ApiKeyId): Promise<ApiKeySummary | null> {
      const result = await getTestPool().query<Record<string, unknown>>(
        'SELECT * FROM api_keys WHERE id = $1',
        [id]
      );
      return result.rows[0] ? mapApiKey(result.rows[0]) : null;
    },
    async findByAccount(accountId: string): Promise<readonly ApiKeySummary[]> {
      const result = await getTestPool().query<Record<string, unknown>>(
        'SELECT * FROM api_keys WHERE account_id = $1 ORDER BY created_at DESC',
        [accountId]
      );
      return result.rows.map(mapApiKey);
    },
    async findByPrefix(keyPrefix: string): Promise<readonly ApiKeySummary[]> {
      const result = await getTestPool().query<Record<string, unknown>>(
        `SELECT * FROM api_keys
         WHERE key_prefix = $1 AND is_active = true
         ORDER BY created_at DESC`,
        [keyPrefix]
      );
      return result.rows.map(mapApiKey);
    },
    async findActiveById(id: ApiKeyId): Promise<ApiKeySummary | null> {
      const result = await getTestPool().query<Record<string, unknown>>(
        `SELECT * FROM api_keys
         WHERE id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > now())`,
        [id]
      );
      return result.rows[0] ? mapApiKey(result.rows[0]) : null;
    },
    async update(apiKey: ApiKeySummary): Promise<void> {
      await getTestPool().query(
        `UPDATE api_keys
         SET name = $2, permissions = $3, rate_limit = $4, rate_limit_window = $5,
             expires_at = $6, last_used_at = $7, is_active = $8, updated_at = $9
         WHERE id = $1`,
        [
          apiKey.id,
          apiKey.name,
          JSON.stringify(apiKey.permissions),
          apiKey.rateLimit,
          apiKey.rateLimitWindow,
          apiKey.expiresAt ? new Date(apiKey.expiresAt) : null,
          apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt) : null,
          apiKey.isActive,
          new Date(apiKey.updatedAt)
        ]
      );
    },
    async delete(id: ApiKeyId): Promise<void> {
      await getTestPool().query('DELETE FROM api_keys WHERE id = $1', [id]);
    },
    async incrementUsage(apiKeyId: string, windowStart: Date): Promise<void> {
      await getTestPool().query(
        `INSERT INTO api_key_rate_limits (api_key_id, window_start, request_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (api_key_id, window_start)
         DO UPDATE SET request_count = api_key_rate_limits.request_count + 1`,
        [apiKeyId, windowStart]
      );
    },
    async getUsageCount(apiKeyId: string, windowStart: Date): Promise<number> {
      const result = await getTestPool().query<{ readonly request_count: number }>(
        'SELECT request_count FROM api_key_rate_limits WHERE api_key_id = $1 AND window_start = $2',
        [apiKeyId, windowStart]
      );
      return result.rows[0]?.request_count ?? 0;
    },
    async recordUsage(usage): Promise<void> {
      await getTestPool().query(
        `INSERT INTO api_key_usage (id, api_key_id, endpoint, method, status_code, response_time_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          usage.id,
          usage.apiKeyId,
          usage.endpoint,
          usage.method,
          usage.statusCode,
          usage.responseTimeMs,
          new Date(usage.createdAt)
        ]
      );
    },
    async getUsageHistory(apiKeyId: string, limit = 100) {
      const result = await getTestPool().query<ApiKeyUsageSummary>(
        `SELECT id, api_key_id AS "apiKeyId", endpoint, method,
                status_code AS "statusCode", response_time_ms AS "responseTimeMs",
                created_at AS "createdAt"
         FROM api_key_usage
         WHERE api_key_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [apiKeyId, limit]
      );
      return result.rows;
    }
  };
}

async function createApiKey(fixture: AccountFixture, label: string): Promise<ApiKeyFixture> {
  const apiKeys = new ApiKeysService(runtime.repositories.apiKey);
  const created = await runWithTenantContext(
    {
      tenantId: fixture.tenantId,
      accountId: fixture.accountId,
      userId: fixture.userId,
      correlationId: correlationId('legacy-pix-http-key')
    },
    () =>
      apiKeys.create({
        accountId: fixture.accountId as ApiKeySummary['accountId'],
        name: `Legacy PIX HTTP ${label}`,
        permissions: ['payments.manage'],
        createdBy: fixture.userId
      })
  );
  return { id: created.apiKey.id, rawKey: created.rawKey };
}

async function persistAttemptLinkedTransaction(fixture: AccountFixture): Promise<void> {
  const repository = runtime.repositories.pixTransaction;
  if (!repository) throw new Error('Database PIX transaction repository is required for this test');

  await runWithTenantContext(
    {
      tenantId: fixture.tenantId,
      accountId: fixture.accountId,
      userId: fixture.userId,
      correlationId: correlationId('legacy-pix-http-persist')
    },
    () =>
      repository.create({
        transactionId: fixture.transactionId,
        provider: 'local-pix',
        accountId: fixture.accountId,
        billingRecordId: fixture.billingRecordId,
        paymentAttemptId: fixture.attemptId,
        amount: 123.45,
        currency: 'BRL',
        description: 'PIX B2 attempt-bound HTTP proof',
        qrCodePayload: 'pix-http-proof',
        qrCodeBase64: Buffer.from('pix-http-proof', 'utf8').toString('base64'),
        expiresAt: dateAfterMinutes(30),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        billingSettlementStatus: 'awaiting_payment',
        cashReconciliationStatus: 'pending'
      })
  );
}

async function requestJson<T>(
  path: string,
  rawKey: string,
  init: RequestInit = {}
): Promise<{ readonly status: number; readonly body: T }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'x-api-key': rawKey,
      ...(init.headers ?? {})
    }
  });
  return {
    status: response.status,
    body: (await response.json()) as T
  };
}

async function confirmedOutboxCount(accountId: string, transactionId: string): Promise<number> {
  const result = await getTestPool().query<{ readonly count: string }>(
    `SELECT COUNT(*)::TEXT AS count
     FROM outbox_events
     WHERE account_id = $1
       AND event_type = 'payment.pix.confirmed'
       AND payload->>'intentId' = $2`,
    [accountId, transactionId]
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function cleanup(): Promise<void> {
  const pool = getTestPool();
  const accounts = [owner?.accountId, foreign?.accountId].filter((accountId): accountId is string =>
    Boolean(accountId)
  );
  for (const accountId of accounts) {
    await pool.query(
      'DELETE FROM api_key_usage WHERE api_key_id IN (SELECT id FROM api_keys WHERE account_id = $1)',
      [accountId]
    );
    await pool.query(
      'DELETE FROM api_key_rate_limits WHERE api_key_id IN (SELECT id FROM api_keys WHERE account_id = $1)',
      [accountId]
    );
    await pool.query('DELETE FROM api_keys WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM outbox_events WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM audit_events WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM pix_transactions WHERE account_id = $1', [accountId]);
    await pool.query(
      `UPDATE encounter_payment_attempts
       SET state = 'cancelled'
       WHERE account_id = $1 AND state = 'awaiting_confirmation'`,
      [accountId]
    );
    await pool.query('DELETE FROM encounter_payment_attempts WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM billing_items WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM billing_records WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM encounters WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM patients WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM owners WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM users WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
  }
  for (const tenantId of [owner?.tenantId, foreign?.tenantId]) {
    if (tenantId) await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  }
}

beforeAll(async () => {
  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-legacy-pix-http-')),
    maxRetries: 10,
    retryDelayMs: 1_000
  });
  expect(bootstrap.databaseHealthy).toBe(true);
  expect(bootstrap.repositories.pixTransaction?.constructor.name).toBe(
    'DatabasePixTransactionRepository'
  );
  expect(bootstrap.repositories.apiKey?.constructor.name).toBe('DatabaseApiKeyRepository');
  runtime = { repositories: bootstrap.repositories, fileStorage: bootstrap.fileStorage };

  setAppState({
    persistenceMode: 'database',
    databaseConfigured: true,
    databaseHealthy: true,
    databaseDetail: bootstrap.databaseDetail,
    repositoriesReady: true,
    repositoryCount: Object.values(bootstrap.repositories).filter(Boolean).length,
    workerReady: true,
    workerDetail: 'Legacy PIX HTTP PostgreSQL integration test runtime',
    productionReady: true,
    initialized: true
  });

  owner = await createAccountFixture('owner');
  foreign = await createAccountFixture('foreign');
  ownerKey = await createApiKey(owner, 'owner key');
  foreignKey = await createApiKey(foreign, 'foreign key');
  await persistAttemptLinkedTransaction(owner);

  originalConfirmPayment = LocalPixPaymentGateway.prototype.confirmPayment;
  LocalPixPaymentGateway.prototype.confirmPayment = async function instrumentedConfirmPayment(
    transactionId: string
  ) {
    confirmGatewayCalls += 1;
    return originalConfirmPayment.call(this, transactionId);
  };

  server = createApiServer({
    appName: 'legacy-pix-http-postgres-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'legacy-pix-http-postgres-test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 3_600,
    pixMockMode: true,
    // A DB runtime must not hydrate the string-only in-memory seed principal.
    // This fixture supplies UUID-backed principals instead.
    preserveSeedUsersWithRepository: false,
    repositories: {
      ...runtime.repositories,
      apiKey: createPostgresApiKeyRepository()
    },
    fileStorage: runtime.fileStorage
  });
  servers.push(server);
  await server.ready;
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  LocalPixPaymentGateway.prototype.confirmPayment = originalConfirmPayment;
  await Promise.all(
    servers.splice(0).map(
      (item) =>
        new Promise<void>((resolve, reject) => {
          if (!item.listening) {
            resolve();
            return;
          }
          item.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
  await cleanup();
  await shutdownServices();
});

describe('legacy PIX confirmation HTTP to PostgreSQL boundary', () => {
  it('returns 410 from the persisted B2 payment_attempt_id record before gateway or outbox confirmation', async () => {
    const observer = await getTestPool().query<{
      readonly payment_attempt_id: string;
      readonly account_id: string;
      readonly status: string;
    }>(
      `SELECT payment_attempt_id::TEXT, account_id::TEXT, status
       FROM pix_transactions
       WHERE transaction_id = $1`,
      [owner.transactionId]
    );
    expect(observer.rows).toEqual([
      {
        payment_attempt_id: owner.attemptId,
        account_id: owner.accountId,
        status: 'pending'
      }
    ]);
    const beforeGatewayCalls = confirmGatewayCalls;
    const beforeOutbox = await confirmedOutboxCount(owner.accountId, owner.transactionId);

    const response = await requestJson<{
      readonly code: string;
      readonly message: string;
    }>(`/payments/pix/intents/${owner.transactionId}/confirm`, ownerKey.rawKey, {
      method: 'POST'
    });

    expect(response.status).toBe(410);
    expect(response.body).toEqual({
      code: 'LEGACY_PIX_CONFIRMATION_DISABLED',
      message: 'PIX confirmation for encounter payment attempts is disabled'
    });
    expect(confirmGatewayCalls).toBe(beforeGatewayCalls);
    expect(await confirmedOutboxCount(owner.accountId, owner.transactionId)).toBe(beforeOutbox);
  });

  it('returns the opaque 404 to a different account before gateway or confirmation event', async () => {
    const beforeGatewayCalls = confirmGatewayCalls;
    const beforeOutbox = await confirmedOutboxCount(owner.accountId, owner.transactionId);

    const response = await requestJson<{
      readonly code: string;
      readonly message: string;
    }>(`/payments/pix/intents/${owner.transactionId}/confirm`, foreignKey.rawKey, {
      method: 'POST'
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'NOT_FOUND', message: 'Intent not found' });
    expect(confirmGatewayCalls).toBe(beforeGatewayCalls);
    expect(await confirmedOutboxCount(owner.accountId, owner.transactionId)).toBe(beforeOutbox);
  });

  it('keeps direct legacy PIX confirmation separate when no payment_attempt_id exists', async () => {
    const created = await requestJson<{
      readonly id: string;
      readonly accountId: string;
      readonly billingRecordId?: string;
    }>('/payments/pix/intents', ownerKey.rawKey, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: 10, description: 'PIX legacy direct HTTP' })
    });
    expect(created.status).toBe(201);
    expect(created.body.accountId).toBe(owner.accountId);
    expect(created.body.billingRecordId).toBeUndefined();

    const beforeGatewayCalls = confirmGatewayCalls;
    const response = await requestJson<{
      readonly transactionId: string;
      readonly status: string;
    }>(`/payments/pix/intents/${created.body.id}/confirm`, ownerKey.rawKey, { method: 'POST' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ transactionId: created.body.id, status: 'completed' });
    expect(confirmGatewayCalls).toBe(beforeGatewayCalls + 1);
    expect(await confirmedOutboxCount(owner.accountId, created.body.id)).toBe(1);
  });
});
