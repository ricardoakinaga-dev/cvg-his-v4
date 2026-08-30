import { createHmac, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { DatabasePixProviderEventIngressRepository } from '../../../apps/api/src/pix-provider-event-ingress-repository.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { setAppState } from '../../../apps/api/src/app-state.js';
import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import { getPool } from '@cvg-his-v2/shared-database';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_IS_EPHEMERAL, TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';
import {
  correlatePixProviderSettlement,
  createPixProviderWebhookSettlementFixture,
  type PixProviderWebhookSettlementFixture
} from '../../helpers/pix-provider-webhook-settlement-fixture.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const WORKER_ENTRYPOINT = resolve(ROOT, 'apps/worker/src/index.ts');
const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const runtimePassword = `pix-webhook-settlement-${suffix}`;
const apiRole = `pix_webhook_api_${suffix}`;
const workerRole = `pix_webhook_worker_${suffix}`;
const keyId = `pix-key-${suffix}`;
const secret = Buffer.alloc(32, 0x5a);

let apiServer: ApiServer | undefined;
let fileStoragePath = '';
let apiBaseUrl = '';
let fixtureA: PixProviderWebhookSettlementFixture | undefined;
let fixtureB: PixProviderWebhookSettlementFixture | undefined;

interface WorkerHandle {
  readonly child: ChildProcess;
  readonly output: () => string;
  readonly close: () => Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>;
}

const activeWorkers = new Set<WorkerHandle>();

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function databaseUrlForRole(role: string): string {
  const url = new URL(TEST_DB_URL);
  url.username = role;
  url.password = runtimePassword;
  return url.toString();
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

function startWorker(port: number, accountId: string, reportServiceUserId: string): WorkerHandle {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', WORKER_ENTRYPOINT], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrlForRole(workerRole),
      WORKER_ACCOUNT_ID: accountId,
      WORKER_REPORTS_USER_ID: reportServiceUserId,
      WORKER_INSTANCE_ID: `pix-webhook-settlement-${suffix}-${port}`,
      WORKER_HEALTH_PORT: String(port),
      WORKER_INTERVAL_MS: '100',
      WORKER_PIX_SETTLEMENT_ENABLED: '1',
      WORKER_PIX_SYNTHETIC_ENABLED: '1',
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

async function stopWorker(
  handle: WorkerHandle,
  signal: NodeJS.Signals = 'SIGTERM'
): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }> {
  if (handle.child.exitCode === null && handle.child.signalCode === null) {
    handle.child.kill(signal);
  }
  return handle.close();
}

async function waitForWorkerHealth(
  port: number,
  path: '/health' | '/ready',
  predicate: (payload: Record<string, unknown>) => boolean,
  timeoutMs = 30_000
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

function webhookBody(fixture: PixProviderWebhookSettlementFixture): Buffer {
  return Buffer.from(
    JSON.stringify({
      type: 'pix.payment.confirmed.v1',
      accountId: fixture.accountId,
      attemptId: fixture.attemptId,
      providerTransactionId: fixture.providerTransactionId,
      amountCents: fixture.amountCents,
      currency: 'BRL',
      confirmedAt: new Date().toISOString()
    }),
    'utf8'
  );
}

function signedHeaders(body: Buffer, eventId: string, timestamp = Math.floor(Date.now() / 1_000)) {
  const signature = createHmac('sha256', secret)
    .update(`v1.${timestamp}.${eventId}.`, 'ascii')
    .update(body)
    .digest('hex');
  return {
    'content-type': 'application/json',
    'x-cvg-pix-key-id': keyId,
    'x-cvg-pix-timestamp': String(timestamp),
    'x-cvg-pix-event-id': eventId,
    'x-cvg-pix-signature': `v1=${signature}`
  };
}

async function postWebhook(
  body: Buffer,
  headers: Record<string, string>
): Promise<{
  readonly status: number;
  readonly text: string;
}> {
  const address = apiServer?.address() as AddressInfo | null;
  if (!address) throw new Error('PIX webhook API is not listening');
  return new Promise((resolveResponse, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port: address.port,
        method: 'POST',
        path: '/webhooks/pix/synthetic/v1',
        headers: { ...headers, 'content-length': String(body.length) }
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        response.on('end', () =>
          resolveResponse({
            status: response.statusCode ?? 0,
            text: Buffer.concat(chunks).toString('utf8')
          })
        );
      }
    );
    req.on('error', reject);
    req.end(body);
  });
}

async function readIngress(accountId: string, providerEventId: string) {
  const result = await getTestPool().query<{
    readonly event_id: string;
    readonly delivery_id: string;
    readonly delivery_state: string;
    readonly delivery_attempts: number;
    readonly receipt_count: string;
    readonly delivery_count: string;
  }>(
    `SELECT event.id::text AS event_id,
            delivery.id::text AS delivery_id,
            delivery.state AS delivery_state,
            delivery.attempts AS delivery_attempts,
            (SELECT COUNT(*)::text FROM pix_provider_events
              WHERE account_id = $1 AND provider_event_id = $2) AS receipt_count,
            (SELECT COUNT(*)::text FROM pix_provider_event_deliveries
              WHERE account_id = $1 AND event_id = event.id) AS delivery_count
       FROM pix_provider_events AS event
       JOIN pix_provider_event_deliveries AS delivery
         ON delivery.account_id = event.account_id AND delivery.event_id = event.id
      WHERE event.account_id = $1 AND event.provider_event_id = $2`,
    [accountId, providerEventId]
  );
  return result.rows[0];
}

interface SettlementState {
  readonly delivery_state: string;
  readonly delivery_attempts: number;
  readonly last_error_code: string | null;
  readonly billing_status: string;
  readonly attempt_state: string;
  readonly pix_status: string | null;
  readonly pix_settlement_status: string | null;
  readonly receipt_count: string;
  readonly journal_count: string;
  readonly settlement_outbox_count: string;
  readonly event_count: string;
  readonly delivery_count: string;
}

async function readSettlementState(
  fixture: PixProviderWebhookSettlementFixture,
  providerEventId: string
): Promise<SettlementState | undefined> {
  const result = await getTestPool().query<SettlementState>(
    `SELECT delivery.state AS delivery_state,
            delivery.attempts AS delivery_attempts,
            delivery.last_error_code,
            billing.status AS billing_status,
            attempt.state AS attempt_state,
            pix.status AS pix_status,
            pix.billing_settlement_status AS pix_settlement_status,
            (SELECT COUNT(*)::text FROM encounter_non_cash_receipts AS receipt
              WHERE receipt.account_id = delivery.account_id
                AND receipt.billing_record_id = billing.id) AS receipt_count,
            (SELECT COUNT(*)::text FROM financial_journal_entries AS entry
              WHERE entry.account_id = delivery.account_id
                AND entry.source_type = 'encounter_non_cash_receipt'
                AND entry.source_id IN (
                  SELECT receipt.id::text FROM encounter_non_cash_receipts AS receipt
                   WHERE receipt.account_id = delivery.account_id
                     AND receipt.billing_record_id = billing.id
                )) AS journal_count,
            (SELECT COUNT(*)::text FROM outbox_events AS outbox
              WHERE outbox.account_id = delivery.account_id
                AND outbox.event_type = 'encounter.non-cash-receipt.created'
                AND outbox.payload->>'providerEventId' = $2) AS settlement_outbox_count,
            (SELECT COUNT(*)::text FROM pix_provider_events AS event
              WHERE event.account_id = delivery.account_id
                AND event.provider_event_id = $2) AS event_count,
            (SELECT COUNT(*)::text FROM pix_provider_event_deliveries AS other_delivery
              WHERE other_delivery.account_id = delivery.account_id
                AND other_delivery.event_id = delivery.event_id) AS delivery_count
       FROM pix_provider_event_deliveries AS delivery
       JOIN pix_provider_events AS provider_event
         ON provider_event.account_id = delivery.account_id
        AND provider_event.id = delivery.event_id
       JOIN encounter_payment_attempts AS attempt
         ON attempt.account_id = provider_event.account_id
        AND attempt.id = provider_event.payment_attempt_id
       JOIN billing_records AS billing
         ON billing.account_id = attempt.account_id
        AND billing.id = attempt.billing_record_id
       LEFT JOIN pix_transactions AS pix
         ON pix.account_id = attempt.account_id
        AND pix.payment_attempt_id = attempt.id
      WHERE delivery.account_id = $1 AND provider_event.provider_event_id = $2`,
    [fixture.accountId, providerEventId]
  );
  return result.rows[0];
}

async function waitForSettlementState(
  fixture: PixProviderWebhookSettlementFixture,
  providerEventId: string,
  predicate: (state: SettlementState | undefined) => boolean,
  timeoutMs = 30_000
): Promise<SettlementState> {
  const deadline = Date.now() + timeoutMs;
  let latest: SettlementState | undefined;
  while (Date.now() < deadline) {
    latest = await readSettlementState(fixture, providerEventId);
    if (predicate(latest)) return latest as SettlementState;
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 100));
  }
  throw new Error(`PIX settlement state did not converge: ${JSON.stringify(latest)}`);
}

describe.skipIf(!TEST_DB_IS_EPHEMERAL)(
  'signed PIX webhook through PostgreSQL to the real worker settlement loop',
  () => {
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

      const identities = await getAdminPool().query<{
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
      expect(identities.rows).toHaveLength(2);
      for (const identity of identities.rows) {
        expect(identity).toMatchObject({
          rolsuper: false,
          rolbypassrls: false,
          rolinherit: false,
          rolcanlogin: true,
          rolcreaterole: false,
          rolcreatedb: false,
          rolreplication: false
        });
      }

      const apiAcl = await new Pool({ connectionString: databaseUrlForRole(apiRole), max: 1 });
      try {
        const probe = await apiAcl.query<{
          readonly current_user: string;
          readonly receipt_select: boolean;
          readonly receipt_insert: boolean;
          readonly delivery_select: boolean;
          readonly delivery_insert: boolean;
        }>(
          `SELECT current_user,
                has_table_privilege(current_user, 'public.pix_provider_events', 'SELECT') AS receipt_select,
                has_table_privilege(current_user, 'public.pix_provider_events', 'INSERT') AS receipt_insert,
                has_table_privilege(current_user, 'public.pix_provider_event_deliveries', 'SELECT') AS delivery_select,
                has_table_privilege(current_user, 'public.pix_provider_event_deliveries', 'INSERT') AS delivery_insert`
        );
        expect(probe.rows[0]).toEqual({
          current_user: apiRole,
          receipt_select: true,
          receipt_insert: true,
          delivery_select: true,
          delivery_insert: true
        });
      } finally {
        await apiAcl.end();
      }

      fixtureA = await createPixProviderWebhookSettlementFixture(pool);
      fixtureB = await createPixProviderWebhookSettlementFixture(pool);

      const bootstrap = await bootstrapServices({
        databaseUrl: databaseUrlForRole(apiRole),
        environment: 'test',
        fileStoragePath: (fileStoragePath = mkdtempSync('/tmp/cvg-pix-webhook-settlement-')),
        maxRetries: 10,
        retryDelayMs: 100
      });
      if (!bootstrap.databaseHealthy || !bootstrap.unitOfWork) {
        throw new Error(`PIX webhook API bootstrap failed: ${bootstrap.databaseDetail}`);
      }
      const sharedPoolIdentity = await getPool().query<{
        readonly current_user: string;
        readonly session_user: string;
        readonly receipt_select: boolean;
        readonly receipt_insert: boolean;
      }>(
        `SELECT current_user, session_user,
              has_table_privilege(current_user, 'public.pix_provider_events', 'SELECT') AS receipt_select,
              has_table_privilege(current_user, 'public.pix_provider_events', 'INSERT') AS receipt_insert`
      );
      expect(sharedPoolIdentity.rows[0]).toEqual({
        current_user: apiRole,
        session_user: apiRole,
        receipt_select: true,
        receipt_insert: true
      });
      setAppState({
        persistenceMode: 'database',
        databaseConfigured: true,
        databaseHealthy: true,
        databaseDetail: bootstrap.databaseDetail,
        repositoriesReady: true,
        repositoryCount: Object.values(bootstrap.repositories).filter(Boolean).length,
        workerReady: true,
        workerDetail: 'Signed PIX webhook settlement process proof',
        productionReady: true,
        initialized: true
      });
      apiServer = createApiServer({
        appName: 'pix-webhook-settlement-process-test',
        environment: 'test',
        version: '0.1.0',
        authSecret: `pix-webhook-settlement-auth-${suffix}`,
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
        googleCalendarMockMode: true,
        pixProviderWebhookSyntheticEnabled: true,
        pixProviderWebhookKeyring: new Map([[keyId, { accountId: fixtureA.accountId, secret }]]),
        pixProviderEventIngressRepository: new DatabasePixProviderEventIngressRepository()
      });
      await apiServer.ready;
      await new Promise<void>((resolveListen) =>
        apiServer?.listen(0, '127.0.0.1', () => resolveListen())
      );
      const address = apiServer.address() as AddressInfo | null;
      if (!address) throw new Error('PIX webhook API did not expose a port');
      apiBaseUrl = `http://127.0.0.1:${address.port}`;
      if (!apiBaseUrl.startsWith('http://127.0.0.1:')) throw new Error('invalid API test URL');
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

      const accountIds = [fixtureA?.accountId, fixtureB?.accountId].filter(
        (accountId): accountId is string => Boolean(accountId)
      );
      const tenantIds = [fixtureA?.tenantId, fixtureB?.tenantId].filter(
        (tenantId): tenantId is string => Boolean(tenantId)
      );
      if (TEST_DB_IS_EPHEMERAL && accountIds.length > 0) {
        // Receipt rows are intentionally append-only in production. This is a
        // disposable test database, so truncate only the isolated ingress
        // tables before removing the fixture accounts.
        await pool.query(
          `TRUNCATE TABLE
           pix_provider_event_deliveries,
           pix_provider_events,
           encounter_non_cash_receipts,
           encounter_cash_receipts,
           encounter_cash_receipt_reversals,
           counter_sale_receipts,
           financial_journal_lines,
           financial_journal_entries`
        );
        // The fixture deliberately leaves an awaiting confirmation attempt
        // reserved until the worker settles it. Clear that reservation before
        // the account cascade so billing_items' mutation guard does not reject
        // teardown as an application failure.
        await pool.query(
          `UPDATE encounter_payment_attempts
            SET state = 'cancelled', next_attempt_at = NULL, updated_at = clock_timestamp()
          WHERE account_id = ANY($1::uuid[])
            AND state IN (
              'pending_dispatch',
              'awaiting_confirmation',
              'confirmed_pending_apply',
              'reconciliation_required'
            )`,
          [accountIds]
        );
        await pool.query(
          `UPDATE billing_records
            SET active_payment_attempt_id = NULL
          WHERE account_id = ANY($1::uuid[])`,
          [accountIds]
        );
        // PostgreSQL may delete billing_records before their cascading
        // billing_items. Remove the guarded child rows while their parent still
        // exists, otherwise the reservation-integrity trigger sees no parent.
        await pool.query(`DELETE FROM billing_items WHERE account_id = ANY($1::uuid[])`, [
          accountIds
        ]);
        await pool.query(`DELETE FROM accounts WHERE id = ANY($1::uuid[])`, [accountIds]);
      } else if (accountIds.length > 0) {
        // An explicitly supplied test database may be shared with another
        // process. Never truncate append-only or financial tables there; the
        // global test setup owns reset of that database on the next run.
        await pool.query(
          `UPDATE encounter_payment_attempts
            SET state = 'cancelled', next_attempt_at = NULL, updated_at = clock_timestamp()
          WHERE account_id = ANY($1::uuid[])
            AND state IN (
              'pending_dispatch',
              'awaiting_confirmation',
              'confirmed_pending_apply',
              'reconciliation_required'
            )`,
          [accountIds]
        );
      }
      if (TEST_DB_IS_EPHEMERAL && tenantIds.length > 0) {
        await pool.query(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, [tenantIds]);
      }
      await pool
        .query(
          `REASSIGN OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)} TO CURRENT_USER`
        )
        .catch(() => undefined);
      await pool
        .query(`DROP OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`)
        .catch(() => undefined);
      const adminPool = getAdminPool();
      await adminPool
        .query(
          `REVOKE cvg_installer FROM ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
        )
        .catch(() => undefined);
      await adminPool
        .query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`)
        .catch(() => undefined);
      await adminPool
        .query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`)
        .catch(() => undefined);
    }, 60_000);

    it('requires the signed public callback, retries correlation, settles once, and survives restart', async () => {
      const fixture = fixtureA;
      if (!fixture) throw new Error('fixture A was not initialized');
      const foreignFixture = fixtureB;
      if (!foreignFixture) throw new Error('fixture B was not initialized');
      const providerEventId = `provider-event-${randomUUID()}`;
      const body = webhookBody(fixture);
      const headers = signedHeaders(body, providerEventId);

      const foreignProviderEventId = `provider-event-foreign-${randomUUID()}`;
      const foreignBody = webhookBody(foreignFixture);
      const foreign = await postWebhook(
        foreignBody,
        signedHeaders(foreignBody, foreignProviderEventId)
      );
      expect(foreign.status, foreign.text).toBe(400);
      expect(await readIngress(foreignFixture.accountId, foreignProviderEventId)).toBeUndefined();

      const first = await postWebhook(body, headers);
      expect(first.status, first.text).toBe(202);
      expect(JSON.parse(first.text)).toEqual({ accepted: true });

      const initial = await waitForSettlementState(
        fixture,
        providerEventId,
        (state) => state?.delivery_state === 'pending' && state.last_error_code === null,
        10_000
      );
      expect(initial).toMatchObject({
        delivery_state: 'pending',
        delivery_attempts: 0,
        billing_status: 'open',
        attempt_state: 'awaiting_confirmation',
        pix_status: null,
        receipt_count: '0',
        journal_count: '0',
        settlement_outbox_count: '0',
        event_count: '1',
        delivery_count: '1'
      });

      const observer = await readIngress(fixture.accountId, providerEventId);
      expect(observer).toMatchObject({
        delivery_state: 'pending',
        delivery_attempts: 0,
        receipt_count: '1',
        delivery_count: '1'
      });

      const replay = await postWebhook(body, headers);
      expect(replay.status, replay.text).toBe(202);
      expect(JSON.parse(replay.text)).toEqual({ accepted: true });
      expect(await readIngress(fixture.accountId, providerEventId)).toMatchObject({
        event_id: observer?.event_id,
        delivery_id: observer?.delivery_id,
        receipt_count: '1',
        delivery_count: '1'
      });

      const port = await reservePort();
      const worker = startWorker(port, fixture.accountId, fixture.reportServiceUserId);
      let health: Record<string, unknown>;
      try {
        health = await waitForWorkerHealth(port, '/health', (payload) => {
          const eventBus = payload.eventBus as Record<string, unknown> | undefined;
          const workerState = payload.worker as Record<string, unknown> | undefined;
          return (
            workerState?.pixProviderSettlementEnabled === true &&
            eventBus?.deliveryGuaranteesReady === true &&
            eventBus?.durableConsumerGuardReady === true
          );
        });
        expect(health.worker).toMatchObject({ pixProviderSettlementEnabled: true });
        expect(health.eventBus).toMatchObject({
          deliveryGuaranteesReady: true,
          durableConsumerGuardReady: true
        });

        const retry = await waitForSettlementState(
          fixture,
          providerEventId,
          (state) =>
            state?.delivery_state === 'pending' &&
            state.delivery_attempts >= 1 &&
            state.last_error_code === 'PIX_NOT_CORRELATED',
          30_000
        );
        expect(retry).toMatchObject({
          delivery_state: 'pending',
          last_error_code: 'PIX_NOT_CORRELATED',
          billing_status: 'open',
          attempt_state: 'awaiting_confirmation',
          pix_status: null,
          receipt_count: '0',
          journal_count: '0',
          settlement_outbox_count: '0',
          event_count: '1',
          delivery_count: '1'
        });

        const transactionId = await correlatePixProviderSettlement(pool, fixture);
        const applied = await waitForSettlementState(
          fixture,
          providerEventId,
          (state) =>
            state?.delivery_state === 'applied' &&
            state.billing_status === 'settled' &&
            state.attempt_state === 'settled' &&
            state.pix_status === 'completed',
          30_000
        );
        expect(applied).toMatchObject({
          delivery_state: 'applied',
          billing_status: 'settled',
          attempt_state: 'settled',
          pix_status: 'completed',
          pix_settlement_status: 'applied',
          receipt_count: '1',
          journal_count: '1',
          settlement_outbox_count: '1',
          event_count: '1',
          delivery_count: '1'
        });
        const pix = await pool.query<{ readonly count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM pix_transactions
          WHERE account_id = $1 AND transaction_id = $2`,
          [fixture.accountId, transactionId]
        );
        expect(pix.rows[0]?.count).toBe('1');

        const other = await pool.query<{ readonly events: string; readonly deliveries: string }>(
          `SELECT
           (SELECT COUNT(*)::text FROM pix_provider_events WHERE account_id = $1) AS events,
           (SELECT COUNT(*)::text FROM pix_provider_event_deliveries WHERE account_id = $1) AS deliveries`,
          [fixtureB?.accountId]
        );
        expect(other.rows[0]).toEqual({ events: '0', deliveries: '0' });
      } finally {
        const stopped = await stopWorker(worker);
        expect(stopped).toEqual({ code: 0, signal: null });
      }

      const restarted = startWorker(port, fixture.accountId, fixture.reportServiceUserId);
      try {
        await waitForWorkerHealth(port, '/ready', (payload) => {
          const readiness = payload.readiness as Record<string, unknown> | undefined;
          return readiness?.ready === true;
        });
        await new Promise((resolveSleep) => setTimeout(resolveSleep, 500));
        const afterRestart = await readSettlementState(fixture, providerEventId);
        expect(afterRestart).toMatchObject({
          delivery_state: 'applied',
          billing_status: 'settled',
          attempt_state: 'settled',
          pix_status: 'completed',
          receipt_count: '1',
          journal_count: '1',
          settlement_outbox_count: '1',
          event_count: '1',
          delivery_count: '1'
        });
      } finally {
        const stopped = await stopWorker(restarted);
        expect(stopped).toEqual({ code: 0, signal: null });
      }
    }, 120_000);
  }
);
