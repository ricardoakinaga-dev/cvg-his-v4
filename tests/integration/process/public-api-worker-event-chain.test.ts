import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { setAppState } from '../../../apps/api/src/app-state.js';
import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const WORKER_ENTRYPOINT = resolve(ROOT, 'apps/worker/src/index.ts');
const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const runtimePassword = `public-worker-chain-${suffix}`;
const apiRole = `public_chain_api_${suffix}`;
const workerRole = `public_chain_worker_${suffix}`;
const tenantId = randomUUID();
const accountId = randomUUID();
const otherTenantId = randomUUID();
const otherAccountId = randomUUID();
const userId = randomUUID();
const reportServiceUserId = randomUUID();
const ownerId = randomUUID();
const patientId = randomUUID();
const encounterId = randomUUID();

let apiServer: ApiServer | undefined;
let apiBaseUrl = '';
let fileStoragePath = '';
let accessToken = '';

interface WorkerHandle {
  readonly child: ChildProcess;
  readonly output: () => string;
  readonly close: () => Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>;
}

const activeWorkers = new Set<WorkerHandle>();

function databaseUrlForRole(role: string): string {
  const url = new URL(TEST_DB_URL);
  url.username = role;
  url.password = runtimePassword;
  return url.toString();
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function createLoginRole(role: string): Promise<void> {
  const adminPool = getAdminPool();
  const result = await adminPool.query<{ readonly sql: string }>(
    `SELECT format(
       'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD %L',
       $1::text, $2::text
     ) AS sql`,
    [role, runtimePassword]
  );
  const sql = result.rows[0]?.sql;
  if (!sql) throw new Error(`failed to create role ${role}`);
  await adminPool.query(sql);
  await adminPool.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(TEST_DB_NAME)} TO ${quoteIdentifier(role)}`
  );
}

async function seedFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status, activated_at)
     VALUES ($1, $2, 'Public worker chain tenant', 'active', now()),
            ($3, $4, 'Public worker chain other tenant', 'active', now())`,
    [
      tenantId,
      `public-worker-${tenantId.slice(0, 8)}`,
      otherTenantId,
      `public-worker-other-${otherTenantId.slice(0, 8)}`
    ]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
     VALUES ($1, $2, $3, 'Public worker chain account', true),
            ($4, $5, $6, 'Public worker chain other account', true)`,
    [
      accountId,
      tenantId,
      `public-worker-account-${accountId.slice(0, 8)}`,
      otherAccountId,
      otherTenantId,
      `public-worker-other-account-${otherAccountId.slice(0, 8)}`
    ]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from the integration database');
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Public Worker Operator', true)`,
    [userId, accountId, `public-worker-${suffix}`, `public-worker-${suffix}@example.test`]
  );
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name,
       principal_kind, interactive_login_enabled, is_active
     ) VALUES ($1, $2, $3, $4, 'public-worker-report-test-hash',
       'Public Worker report service', 'service', false, true)`,
    [
      reportServiceUserId,
      accountId,
      `public-worker-report-service-${suffix}`,
      `public-worker-report-service-${suffix}@example.test`
    ]
  );
  await pool.query(
    `INSERT INTO account_service_principals (account_id, purpose, user_id)
     VALUES ($1, 'report-execution', $2)`,
    [accountId, reportServiceUserId]
  );
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    userId,
    role.rows[0].id
  ]);
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Public Worker Owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Public Worker Patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id, reason)
     VALUES ($1, $2, $3, $4, 'open', $5, 'Public API to worker event-chain proof')`,
    [encounterId, accountId, patientId, ownerId, userId]
  );
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<{
  readonly status: number;
  readonly body: T | undefined;
  readonly text: string;
}> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  const text = await response.text();
  return {
    status: response.status,
    body: text ? (JSON.parse(text) as T) : undefined,
    text
  };
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
  const address = server.address() as AddressInfo | null;
  if (!address) throw new Error('worker health server did not expose a port');
  const port = address.port;
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
  return port;
}

function startWorker(port: number): WorkerHandle {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', WORKER_ENTRYPOINT], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'staging',
      DATABASE_URL: databaseUrlForRole(workerRole),
      WORKER_ACCOUNT_ID: accountId,
      WORKER_REPORTS_USER_ID: reportServiceUserId,
      WORKER_INSTANCE_ID: `public-worker-chain-${suffix}-${port}`,
      WORKER_HEALTH_PORT: String(port),
      WORKER_INTERVAL_MS: '100',
      WORKER_PIX_SETTLEMENT_ENABLED: '0',
      WORKER_PIX_SYNTHETIC_ENABLED: '0',
      OTEL_ENABLED: 'false'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr?.on('data', (chunk: string) => {
    output += chunk;
  });

  let closeResult: { readonly code: number | null; readonly signal: NodeJS.Signals | null } | null =
    null;
  let resolveClose:
    | ((result: { readonly code: number | null; readonly signal: NodeJS.Signals | null }) => void)
    | undefined;
  const closePromise = new Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolveClosePromise) => {
    resolveClose = resolveClosePromise;
  });
  const handle: WorkerHandle = {
    child,
    output: () => output,
    close: () => (closeResult ? Promise.resolve(closeResult) : closePromise)
  };
  child.once('close', (code, signal) => {
    closeResult = { code, signal };
    resolveClose?.(closeResult);
    activeWorkers.delete(handle);
  });
  activeWorkers.add(handle);
  return handle;
}

async function stopWorker(handle: WorkerHandle, signal: NodeJS.Signals = 'SIGTERM') {
  if (handle.child.exitCode === null && handle.child.signalCode === null) {
    handle.child.kill(signal);
  }
  return handle.close();
}

async function waitForWorkerHealth(
  port: number,
  path: '/health' | '/ready',
  predicate: (payload: Record<string, unknown>) => boolean,
  timeoutMs = 20_000
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        signal: AbortSignal.timeout(500)
      });
      const payload = (await response.json()) as Record<string, unknown>;
      if (response.status === 200 && predicate(payload)) return payload;
      lastError = `${response.status} ${JSON.stringify(payload)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 50));
  }
  throw new Error(`worker ${path} did not become ready: ${lastError}`);
}

async function waitForOutboxCompletion(eventId: string): Promise<{
  readonly status: string;
  readonly inboxCount: number;
}> {
  const pool = getTestPool();
  const deadline = Date.now() + 20_000;
  let last = { status: 'missing', inboxCount: 0 };
  while (Date.now() < deadline) {
    const result = await pool.query<{ readonly status: string; readonly inboxCount: number }>(
      `SELECT
         (SELECT status FROM outbox_events WHERE account_id = $1 AND id = $2) AS status,
         (SELECT COUNT(*)::int FROM inbox_events WHERE account_id = $1 AND event_id = $2) AS "inboxCount"`,
      [accountId, eventId]
    );
    last = result.rows[0] ?? last;
    if (last.status === 'completed' && last.inboxCount === 3) return last;
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 100));
  }
  throw new Error(`public worker event chain did not complete: ${JSON.stringify(last)}`);
}

describe('public API to durable outbox to real worker event chain', () => {
  const pool = getTestPool();

  beforeAll(async () => {
    await createLoginRole(apiRole);
    await createLoginRole(workerRole);
    const client = await pool.connect();
    try {
      await reconcileRuntimeRoles(client, { apiRole, workerRole });
    } finally {
      client.release();
    }
    const runtimeRoles = await getAdminPool().query<{
      readonly rolname: string;
      readonly rolsuper: boolean;
      readonly rolbypassrls: boolean;
      readonly rolinherit: boolean;
      readonly rolcanlogin: boolean;
      readonly rolcreaterole: boolean;
      readonly rolcreatedb: boolean;
      readonly rolreplication: boolean;
    }>(
      `SELECT rolname, rolsuper, rolbypassrls, rolinherit, rolcanlogin,
              rolcreaterole, rolcreatedb, rolreplication
         FROM pg_roles
        WHERE rolname IN ($1, $2)
        ORDER BY rolname`,
      [apiRole, workerRole]
    );
    expect(runtimeRoles.rows).toHaveLength(2);
    for (const role of runtimeRoles.rows) {
      expect(role).toMatchObject({
        rolsuper: false,
        rolbypassrls: false,
        rolinherit: false,
        rolcanlogin: true,
        rolcreaterole: false,
        rolcreatedb: false,
        rolreplication: false
      });
    }
    await seedFixture();

    const bootstrap = await bootstrapServices({
      databaseUrl: databaseUrlForRole(apiRole),
      environment: 'test',
      fileStoragePath: (fileStoragePath = mkdtempSync('/tmp/cvg-public-worker-chain-')),
      maxRetries: 10,
      retryDelayMs: 100
    });
    if (!bootstrap.databaseHealthy || !bootstrap.unitOfWork) {
      throw new Error(`public worker chain API bootstrap failed: ${bootstrap.databaseDetail}`);
    }
    setAppState({
      persistenceMode: 'database',
      databaseConfigured: true,
      databaseHealthy: true,
      databaseDetail: bootstrap.databaseDetail,
      repositoriesReady: true,
      repositoryCount: Object.values(bootstrap.repositories).filter(Boolean).length,
      workerReady: true,
      workerDetail: 'Public API to worker event-chain process fixture',
      productionReady: true,
      initialized: true
    });
    apiServer = createApiServer({
      appName: 'public-worker-event-chain-test',
      environment: 'test',
      version: '0.1.0',
      authSecret: `public-worker-chain-auth-${suffix}`,
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage,
      unitOfWork: bootstrap.unitOfWork,
      preserveSeedUsersWithRepository: false,
      preserveSeedMasterDataWithRepository: false,
      pixMockMode: true,
      emailMockMode: true,
      smsMockMode: true,
      googleCalendarMockMode: true
    });
    await apiServer.ready;
    await new Promise<void>((resolveListen) =>
      apiServer?.listen(0, '127.0.0.1', () => resolveListen())
    );
    const address = apiServer.address() as AddressInfo | null;
    if (!address) throw new Error('public worker chain API did not expose a port');
    apiBaseUrl = `http://127.0.0.1:${address.port}`;

    const login = await requestJson<{ readonly accessToken: string }>('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: `public-worker-${suffix}`, password: 'seed_admin' })
    });
    if (login.status !== 200 || !login.body?.accessToken) {
      throw new Error(`public worker chain login failed: ${login.status} ${login.text}`);
    }
    accessToken = login.body.accessToken;
  }, 120_000);

  afterAll(async () => {
    await Promise.all(
      [...activeWorkers].map((worker) => stopWorker(worker).catch(() => undefined))
    );
    if (apiServer?.listening) {
      await new Promise<void>((resolveClose, reject) => {
        apiServer?.close((error) => (error ? reject(error) : resolveClose()));
      });
    }
    await shutdownServices().catch(() => undefined);
    if (fileStoragePath) rmSync(fileStoragePath, { recursive: true, force: true });
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [accountId, otherAccountId]);
    const adminPool = getAdminPool();
    await pool
      .query(
        `REASSIGN OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)} TO CURRENT_USER`
      )
      .catch(() => undefined);
    await pool
      .query(`DROP OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`)
      .catch(() => undefined);
    await adminPool
      .query(
        `REVOKE cvg_installer FROM ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
      )
      .catch(() => undefined);
    await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`);
    await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`);
  }, 30_000);

  it('proves public billing mutation, durable outbox processing and restart idempotency', async () => {
    const headers = {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-id': tenantId,
      'x-account-id': accountId,
      'content-type': 'application/json',
      'idempotency-key': `public-worker-billing-${suffix}`
    };
    const created = await requestJson<{ readonly id: string }>('/billing/estimate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ encounterId, administrativeNotes: 'Public worker chain fixture' })
    });
    expect(created.status, created.text).toBe(200);
    expect(created.body?.id).toEqual(expect.any(String));

    const pending = await pool.query<{
      readonly id: string;
      readonly status: string;
      readonly eventType: string;
      readonly correlationId: string;
      readonly payloadAccountId: string;
      readonly metaAccountId: string;
    }>(
      `SELECT id, status, event_type AS "eventType", correlation_id AS "correlationId",
              payload->>'accountId' AS "payloadAccountId",
              payload->'_meta'->>'accountId' AS "metaAccountId"
         FROM outbox_events
        WHERE account_id = $1 AND event_type = 'billing.record.created'
        ORDER BY created_at DESC`,
      [accountId]
    );
    expect(pending.rows).toHaveLength(1);
    expect(pending.rows[0]).toMatchObject({
      id: expect.any(String),
      status: 'pending',
      eventType: 'billing.record.created',
      correlationId: expect.any(String),
      payloadAccountId: accountId,
      metaAccountId: accountId
    });
    const eventId = pending.rows[0]?.id;
    if (!eventId) throw new Error('public billing mutation did not persist an outbox event');

    const otherAccountEvents = await pool.query<{ readonly count: number }>(
      `SELECT COUNT(*)::int AS count FROM outbox_events WHERE account_id = $1 AND event_type = 'billing.record.created'`,
      [otherAccountId]
    );
    expect(otherAccountEvents.rows[0]?.count).toBe(0);

    const port = await reservePort();
    const firstWorker = startWorker(port);
    try {
      const health = await waitForWorkerHealth(port, '/health', (payload) => {
        const eventBus = payload.eventBus as Record<string, unknown> | undefined;
        return (
          eventBus?.deliveryGuaranteesReady === true &&
          eventBus?.durableConsumerGuardReady === true &&
          JSON.stringify(eventBus?.registeredConsumers) ===
            JSON.stringify(['payments', 'billing', 'webhooks'])
        );
      });
      expect(health.eventBus).toMatchObject({
        requiredConsumers: ['payments', 'billing', 'webhooks'],
        registeredConsumers: ['payments', 'billing', 'webhooks'],
        deliveryGuaranteesReady: true,
        durableConsumerGuardReady: true
      });
      const completed = await waitForOutboxCompletion(eventId);
      expect(completed).toEqual({ status: 'completed', inboxCount: 3 });
      const firstInbox = await pool.query<{ readonly consumerName: string }>(
        `SELECT consumer_name AS "consumerName"
           FROM inbox_events WHERE account_id = $1 AND event_id = $2
          ORDER BY consumer_name`,
        [accountId, eventId]
      );
      expect(firstInbox.rows.map((row) => row.consumerName)).toEqual([
        'billing',
        'payments',
        'webhooks'
      ]);
    } finally {
      const stopped = await stopWorker(firstWorker);
      expect(stopped).toEqual({ code: 0, signal: null });
    }

    const secondWorker = startWorker(port);
    try {
      await waitForWorkerHealth(port, '/ready', (payload) => {
        const readiness = payload.readiness as Record<string, unknown> | undefined;
        return readiness?.ready === true && readiness.persistenceMode === 'database';
      });
      await new Promise((resolveSleep) => setTimeout(resolveSleep, 500));
      const afterRestart = await pool.query<{
        readonly status: string;
        readonly inboxCount: number;
        readonly eventCount: number;
        readonly billingCount: number;
      }>(
        `SELECT
           (SELECT status FROM outbox_events WHERE account_id = $1 AND id = $2) AS status,
           (SELECT COUNT(*)::int FROM inbox_events WHERE account_id = $1 AND event_id = $2) AS "inboxCount",
           (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'billing.record.created') AS "eventCount",
           (SELECT COUNT(*)::int FROM billing_records WHERE account_id = $1 AND encounter_id = $3) AS "billingCount"`,
        [accountId, eventId, encounterId]
      );
      expect(afterRestart.rows).toEqual([
        { status: 'completed', inboxCount: 3, eventCount: 1, billingCount: 1 }
      ]);
    } finally {
      const stopped = await stopWorker(secondWorker);
      expect(stopped).toEqual({ code: 0, signal: null });
    }
  }, 90_000);
});
