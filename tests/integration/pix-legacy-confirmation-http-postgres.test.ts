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
  ApiKeysService
} from '../../packages/modules/api-keys/src/index.ts';
import type { ApiKeySummary } from '../../packages/shared/types/src/index.ts';
import { runWithTenantContext } from '../../packages/tenant-context/src/index.ts';
import { closeDatabaseClient, getPool } from '../../packages/shared/database/src/index.ts';
import { getAdminPool, getTestPool } from '../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../setup/env.js';

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
let limitedKey: ApiKeyFixture;
let confirmGatewayCalls = 0;
let originalConfirmPayment: typeof LocalPixPaymentGateway.prototype.confirmPayment;
let apiDatabaseRole: string;
let workerDatabaseRole: string;

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
  // Test setup can initialize the shared singleton under the admin test user.
  // Reopen it here under the actual API runtime login before building services.
  await closeDatabaseClient();
  const suffix = randomUUID().replaceAll('-', '');
  apiDatabaseRole = `legacy_http_api_${suffix}`;
  workerDatabaseRole = `legacy_http_worker_${suffix}`;
  const rolePassword = `legacy-http-${suffix}`;
  const adminPool = getAdminPool();
  const dbIdentifier = TEST_DB_NAME.replaceAll('"', '""');
  await adminPool.query(
    `CREATE ROLE "${apiDatabaseRole}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${rolePassword}'`
  );
  await adminPool.query(
    `CREATE ROLE "${workerDatabaseRole}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${rolePassword}'`
  );
  await adminPool.query(
    `GRANT CONNECT ON DATABASE "${dbIdentifier}" TO "${apiDatabaseRole}", "${workerDatabaseRole}"`
  );
  const reconcileClient = await getTestPool().connect();
  try {
    const { reconcileRuntimeRoles } =
      await import('../../packages/db/src/reconcile-runtime-roles.js');
    await reconcileRuntimeRoles(reconcileClient, {
      apiRole: apiDatabaseRole,
      workerRole: workerDatabaseRole
    });
  } finally {
    reconcileClient.release();
  }
  const runtimeDatabaseUrl = new URL(TEST_DB_URL);
  runtimeDatabaseUrl.username = apiDatabaseRole;
  runtimeDatabaseUrl.password = rolePassword;
  const bootstrap = await bootstrapServices({
    databaseUrl: runtimeDatabaseUrl.toString(),
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
  const limited = await runWithTenantContext(
    {
      tenantId: owner.tenantId,
      accountId: owner.accountId,
      userId: owner.userId,
      correlationId: correlationId('legacy-pix-http-limited-key')
    },
    () =>
      new ApiKeysService(runtime.repositories.apiKey).create({
        accountId: owner.accountId as ApiKeySummary['accountId'],
        name: 'Legacy PIX HTTP limited key',
        permissions: ['payments.manage'],
        rateLimit: 2,
        rateLimitWindow: 3600,
        createdBy: owner.userId
      })
  );
  limitedKey = { id: limited.apiKey.id, rawKey: limited.rawKey };
  const databaseIdentity = await getPool().query<{
    readonly current_user: string;
    readonly can_resolve_key: boolean;
  }>(
    `SELECT current_user,
            has_function_privilege(current_user, 'app.resolve_active_api_key(text, text)'::regprocedure, 'EXECUTE') AS can_resolve_key`
  );
  expect(databaseIdentity.rows).toEqual([
    { current_user: apiDatabaseRole, can_resolve_key: true }
  ]);
  expect(await new ApiKeysService(runtime.repositories.apiKey).validate(ownerKey.rawKey)).not.toBeNull();
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
    repositories: runtime.repositories,
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
  if (apiDatabaseRole && workerDatabaseRole) {
    await getTestPool().query(`DROP OWNED BY "${apiDatabaseRole}"`);
    await getTestPool().query(`DROP OWNED BY "${workerDatabaseRole}"`);
    await getAdminPool().query(`DROP ROLE IF EXISTS "${apiDatabaseRole}"`);
    await getAdminPool().query(`DROP ROLE IF EXISTS "${workerDatabaseRole}"`);
  }
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

  it('enforces the API-key rate limit atomically under concurrent HTTP requests', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        requestJson<{ readonly id?: string; readonly code?: string }>(
          '/payments/pix/intents',
          limitedKey.rawKey,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ amount: 10 + index, description: `rate-limit-${index}` })
          }
        )
      )
    );

    expect(responses.filter((response) => response.status === 201)).toHaveLength(2);
    expect(responses.filter((response) => response.status === 429)).toHaveLength(6);
    expect(responses.filter((response) => response.status !== 201 && response.status !== 429)).toEqual(
      []
    );
  });
});
