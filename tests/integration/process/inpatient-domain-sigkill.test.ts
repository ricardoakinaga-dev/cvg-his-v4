import { createInterface } from 'node:readline';
import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { setAppState } from '../../../apps/api/src/app-state.js';
import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import {
  getDatabaseClient,
  getPool,
  hashIdempotencyPayload
} from '../../../packages/shared/database/src/index.js';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const processFixturePath = resolve(
  __dirname,
  '../../../apps/worker/test-fixtures/inpatient-domain-process.ts'
);
// The real API command performs charge capture and outbox writes; leave enough
// lease headroom for a cold child process plus PostgreSQL round trips while
// retaining a bounded takeover window.
const LEASE_MS = 5_000;
const ROLE_PASSWORD = `domain-process-${randomUUID()}`;
const API_ROLE = `domain_process_api_${randomUUID().replaceAll('-', '')}`;
const WORKER_ROLE = `domain_process_worker_${randomUUID().replaceAll('-', '')}`;

type Checkpoint = 'after_claim' | 'after_domain_command_before_cas';

interface ProcessEvent {
  readonly event: string;
  readonly payload: Record<string, unknown>;
}

interface DomainFixture {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly ownerId: string;
  readonly patientId: string;
  readonly encounterId: string;
  readonly itemId: string;
  readonly sectorId: string;
  readonly initialBedId: string;
  readonly targetBedId: string;
  readonly outboxEventId: string;
  readonly idempotencyKey: string;
  readonly username: string;
  stayId: string;
}

interface DomainProcess {
  readonly child: ChildProcess;
  readonly pid: number;
  readonly events: () => readonly ProcessEvent[];
  readonly stderr: () => string;
  resume(): void;
  waitFor(event: string, timeoutMs?: number): Promise<ProcessEvent>;
  waitForClose(): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>;
  kill(signal: NodeJS.Signals): Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>;
}

let server: ApiServer | undefined;
let baseUrl = '';
let accessToken = '';
let fixture: DomainFixture;
let apiDatabaseUrl = '';
let workerDatabaseUrl = '';
const activeProcesses = new Set<DomainProcess>();

function databaseUrlForRole(role: string): string {
  const url = new URL(TEST_DB_URL);
  url.username = role;
  url.password = ROLE_PASSWORD;
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
    [role, ROLE_PASSWORD]
  );
  const sql = result.rows[0]?.sql;
  if (!sql) throw new Error(`failed to create runtime role ${role}`);
  await adminPool.query(sql);
  await adminPool.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(TEST_DB_NAME)} TO ${quoteIdentifier(role)}`
  );
}

function parseEvent(line: string): ProcessEvent | null {
  const separator = line.indexOf(' ');
  if (separator <= 0) return null;
  try {
    return {
      event: line.slice(0, separator),
      payload: JSON.parse(line.slice(separator + 1)) as Record<string, unknown>
    };
  } catch {
    return null;
  }
}

function startDomainProcess(options: {
  readonly workerId: string;
  readonly checkpoint?: Checkpoint;
  readonly exitAfterResult?: boolean;
  readonly pauseUntilSignal?: boolean;
}): DomainProcess {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', processFixturePath], {
    cwd: resolve(__dirname, '../../..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DOMAIN_PROCESS_FIXTURE: '1',
      DATABASE_URL: workerDatabaseUrl,
      DOMAIN_ACCOUNT_ID: fixture.accountId,
      DOMAIN_OUTBOX_EVENT_ID: fixture.outboxEventId,
      DOMAIN_API_URL: baseUrl,
      DOMAIN_ACCESS_TOKEN: accessToken,
      DOMAIN_TENANT_ID: fixture.tenantId,
      DOMAIN_WORKER_ID: options.workerId,
      DOMAIN_LEASE_MS: String(LEASE_MS),
      DOMAIN_CHECKPOINT: options.checkpoint ?? '',
      DOMAIN_PAUSE_UNTIL_SIGNAL: options.pauseUntilSignal ? '1' : '0',
      DOMAIN_EXIT_AFTER_RESULT: options.exitAfterResult ? '1' : '0'
    },
    stdio: ['ignore', 'ignore', 'pipe', 'pipe']
  });
  if (!child.pid) throw new Error('inpatient domain process did not expose a PID');
  const controlChannel = child.stdio[3];
  if (!controlChannel || typeof controlChannel === 'number') {
    throw new Error('inpatient domain process did not expose control channel');
  }
  if (!child.stderr) throw new Error('inpatient domain process did not expose stderr');

  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  const events: ProcessEvent[] = [];
  const waiters = new Map<
    string,
    Array<{
      readonly resolve: (event: ProcessEvent) => void;
      readonly reject: (error: Error) => void;
      readonly timer: NodeJS.Timeout;
    }>
  >();
  createInterface({ input: controlChannel }).on('line', (line) => {
    const event = parseEvent(line);
    if (!event) return;
    events.push(event);
    const pending = waiters.get(event.event);
    if (!pending) return;
    waiters.delete(event.event);
    for (const waiter of pending) {
      clearTimeout(waiter.timer);
      waiter.resolve(event);
    }
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
  child.once('close', (code, signal) => {
    closeResult = { code, signal };
    resolveClose?.(closeResult);
    for (const [eventName, pending] of waiters) {
      for (const waiter of pending) {
        clearTimeout(waiter.timer);
        waiter.reject(
          new Error(
            `child closed before ${eventName}; events=${JSON.stringify(events)}; stderr=${stderr}`
          )
        );
      }
    }
    waiters.clear();
  });

  const processHandle: DomainProcess = {
    child,
    pid: child.pid,
    events: () => Object.freeze([...events]),
    stderr: () => stderr,
    resume() {
      if (closeResult) throw new Error(`cannot resume closed child PID ${child.pid}`);
      if (!child.kill('SIGUSR2')) throw new Error(`failed to send SIGUSR2 to PID ${child.pid}`);
    },
    waitFor(event, timeoutMs = 15_000) {
      const existing = events.find((candidate) => candidate.event === event);
      if (existing) return Promise.resolve(existing);
      return new Promise<ProcessEvent>((resolveEvent, rejectEvent) => {
        const timer = setTimeout(() => {
          const pending = waiters.get(event) ?? [];
          waiters.set(
            event,
            pending.filter((waiter) => waiter.resolve !== resolveEvent)
          );
          rejectEvent(
            new Error(
              `timed out waiting for ${event}; events=${JSON.stringify(events)}; stderr=${stderr}`
            )
          );
        }, timeoutMs);
        const pending = waiters.get(event) ?? [];
        waiters.set(event, [...pending, { resolve: resolveEvent, reject: rejectEvent, timer }]);
      });
    },
    waitForClose: () => (closeResult ? Promise.resolve(closeResult) : closePromise),
    async kill(signal) {
      if (closeResult) return closeResult;
      if (!child.kill(signal)) throw new Error(`failed to send ${signal} to PID ${child.pid}`);
      return closePromise;
    }
  };
  activeProcesses.add(processHandle);
  void processHandle.waitForClose().finally(() => activeProcesses.delete(processHandle));
  return processHandle;
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<{
  readonly status: number;
  readonly body?: T;
  readonly text: string;
}> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  return {
    status: response.status,
    body: text ? (JSON.parse(text) as T) : undefined,
    text
  };
}

function authHeaders(): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
    'x-tenant-id': fixture.tenantId,
    'x-account-id': fixture.accountId,
    'content-type': 'application/json'
  };
}

async function configureOutboxCommand(payload: Record<string, unknown>): Promise<void> {
  await getTestPool().query(
    `UPDATE outbox_events
        SET event_type = $3,
            payload = $4::jsonb
      WHERE account_id = $1 AND id = $2`,
    [
      fixture.accountId,
      fixture.outboxEventId,
      `test.${String(payload.operation)}`,
      JSON.stringify(payload)
    ]
  );
}

async function seedFixture(): Promise<void> {
  fixture = {
    tenantId: randomUUID(),
    accountId: randomUUID(),
    userId: randomUUID(),
    ownerId: randomUUID(),
    patientId: randomUUID(),
    encounterId: randomUUID(),
    itemId: randomUUID(),
    sectorId: randomUUID(),
    initialBedId: randomUUID(),
    targetBedId: randomUUID(),
    outboxEventId: randomUUID(),
    idempotencyKey: randomUUID(),
    username: `domain_${randomUUID().replaceAll('-', '').slice(0, 16)}`,
    stayId: ''
  };
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status) VALUES ($1, $2, 'Domain process tenant', 'active')`,
    [fixture.tenantId, `domain-${fixture.tenantId.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, 'Domain process account')`,
    [fixture.accountId, fixture.tenantId, `domain-${fixture.accountId.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Domain Process Operator', true)`,
    [fixture.userId, fixture.accountId, fixture.username, `${fixture.username}@example.test`]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from domain process fixture');
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    fixture.userId,
    role.rows[0].id
  ]);
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'Domain Owner')`,
    [fixture.ownerId, fixture.accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Domain Patient', 'canine')`,
    [fixture.patientId, fixture.accountId, fixture.ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id, reason)
     VALUES ($1, $2, $3, $4, 'open', $5, 'Process SIGKILL inpatient proof')`,
    [fixture.encounterId, fixture.accountId, fixture.patientId, fixture.ownerId, fixture.userId]
  );
  await pool.query(
    `INSERT INTO inventory_items (
       id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
       unit_cost_amount, charge_unit_price_amount
     ) VALUES ($1, $2, $3, 'Process inpatient supply', 'unit', 10, 1, 25, 40)`,
    [fixture.itemId, fixture.accountId, `SIGKILL-${fixture.itemId.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO sectors (id, account_id, code, name, kind, active, created_at, updated_at)
     VALUES ($1, $2, 'SIGKILL-A', 'Ala SIGKILL', 'observation', true, now(), now())`,
    [fixture.sectorId, fixture.accountId]
  );
  await pool.query(
    `INSERT INTO beds (
       id, account_id, sector_id, code, name, status, supports_species, active,
       created_at, updated_at
     ) VALUES
       ($1, $3, $4, 'SIG-01', 'Leito SIGKILL inicial', 'available', 'canine', true, now(), now()),
       ($2, $3, $4, 'SIG-02', 'Leito SIGKILL destino', 'available', 'canine', true, now(), now())`,
    [fixture.initialBedId, fixture.targetBedId, fixture.accountId, fixture.sectorId]
  );
  await pool.query(
    `INSERT INTO inventory_lots (
       id, account_id, inventory_item_id, lot_number, quantity, reserved_quantity,
       unit, location, supplier, expiry_date, status
     ) VALUES ($1, $2, $3, $4, 10, 0, 'unit', 'Ala A', 'Process supplier', '2028-12-31', 'active')`,
    [randomUUID(), fixture.accountId, fixture.itemId, `LOT-${fixture.itemId.slice(0, 8)}`]
  );
}

async function startRuntime(): Promise<void> {
  const bootstrap = await bootstrapServices({
    databaseUrl: apiDatabaseUrl,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-domain-process-')),
    maxRetries: 10,
    retryDelayMs: 250
  });
  if (!bootstrap.databaseHealthy || !bootstrap.unitOfWork) {
    throw new Error(`Domain process API bootstrap failed: ${bootstrap.databaseDetail}`);
  }
  const identity = await getPool().query<{
    readonly current_user: string;
    readonly rolsuper: boolean;
    readonly rolbypassrls: boolean;
  }>(
    `SELECT current_user, rolsuper, rolbypassrls
       FROM pg_roles WHERE rolname = current_user`
  );
  expect(identity.rows).toEqual([{ current_user: API_ROLE, rolsuper: false, rolbypassrls: false }]);
  setAppState({
    persistenceMode: 'database',
    databaseConfigured: true,
    databaseHealthy: true,
    databaseDetail: bootstrap.databaseDetail,
    repositoriesReady: true,
    repositoryCount: Object.values(bootstrap.repositories).filter(Boolean).length,
    workerReady: true,
    workerDetail: 'Domain SIGKILL process fixture',
    productionReady: true,
    initialized: true
  });
  server = createApiServer({
    appName: 'inpatient-domain-process-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: randomUUID(),
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 3_600,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage,
    unitOfWork: bootstrap.unitOfWork,
    sectorBedOptions: { databaseClient: getDatabaseClient() },
    preserveSeedUsersWithRepository: false,
    preserveSeedMasterDataWithRepository: false
  });
  await server.ready;
  await new Promise<void>((resolveListen) => server?.listen(0, '127.0.0.1', () => resolveListen()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const login = await requestJson<{ readonly accessToken: string }>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: fixture.username, password: 'seed_admin' })
  });
  if (login.status !== 200 || !login.body?.accessToken) {
    throw new Error(`Domain process fixture login failed: ${login.status} ${login.text}`);
  }
  accessToken = login.body.accessToken;
  const admission = await requestJson<{ readonly id: string }>('/inpatient', {
    method: 'POST',
    headers: { ...authHeaders(), 'idempotency-key': randomUUID() },
    body: JSON.stringify({
      encounterId: fixture.encounterId,
      patientId: fixture.patientId,
      unit: 'Internacao clinica',
      ward: 'Ala A',
      bed: 'SIG-01',
      sectorId: fixture.sectorId,
      bedId: fixture.initialBedId
    })
  });
  if (admission.status !== 201 || !admission.body?.id) {
    throw new Error(`Domain process admission failed: ${admission.status} ${admission.text}`);
  }
  fixture.stayId = admission.body.id;
  await getTestPool().query(
    `INSERT INTO outbox_events (
       id, account_id, correlation_id, module_name, event_type, payload,
       status, attempts, max_attempts, scheduled_at, created_at
     ) VALUES ($1, $2, $3, 'inpatient', 'test.inpatient.inventory.consume', $4::jsonb,
       'pending', 0, 3, now(), now())`,
    [
      fixture.outboxEventId,
      fixture.accountId,
      randomUUID(),
      JSON.stringify({
        accountId: fixture.accountId,
        _meta: { accountId: fixture.accountId },
        operation: 'inventory.consume',
        encounterId: fixture.encounterId,
        inventoryItemId: fixture.itemId,
        sourceEntityId: fixture.stayId,
        quantity: 2,
        idempotencyKey: fixture.idempotencyKey
      })
    ]
  );
}

async function waitForLeaseExpiry(): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await getTestPool().query<{ readonly state: string; readonly expired: boolean }>(
      `SELECT status AS state, lease_expires_at <= clock_timestamp() AS expired
         FROM outbox_events WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, fixture.outboxEventId]
    );
    if (result.rows[0]?.state === 'processing' && result.rows[0].expired) return;
    await sleep(50);
  }
  throw new Error('inpatient domain lease did not expire after SIGKILL');
}

async function assertReconciled(attempts: number): Promise<void> {
  const result = await getTestPool().query<{
    readonly consumptions: number;
    readonly consumptionId: string;
    readonly stock: number;
    readonly sourceEntityId: string;
    readonly billingItems: number;
    readonly billingSourceEntityType: string;
    readonly billingSourceEntityId: string;
    readonly billingTotal: number;
    readonly auditEvents: number;
    readonly derivedOutboxEvents: number;
    readonly derivedOutboxSourceEntityId: string;
    readonly idempotency: number;
    readonly idempotencyOperation: string;
    readonly idempotencyRequestHashLength: number;
    readonly idempotencyRequestHash: string;
    readonly idempotencyResponseStatus: number | null;
    readonly idempotencyResponseContainsEncounter: boolean;
    readonly outboxStatus: string;
    readonly outboxAttempts: number;
    readonly outboxLeaseVersion: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM inventory_consumptions WHERE account_id = $1 AND encounter_id = $2
          AND source_entity_type = 'inpatient_stay' AND source_entity_id = $6) AS consumptions,
       (SELECT id::text FROM inventory_consumptions WHERE account_id = $1 AND encounter_id = $2
          AND source_entity_type = 'inpatient_stay' AND source_entity_id = $6 LIMIT 1) AS "consumptionId",
       (SELECT source_entity_id FROM inventory_consumptions WHERE account_id = $1 AND encounter_id = $2
          AND source_entity_type = 'inpatient_stay' LIMIT 1) AS "sourceEntityId",
       (SELECT on_hand_quantity::int FROM inventory_items WHERE account_id = $1 AND id = $3) AS stock,
       (SELECT COUNT(*)::int FROM billing_items WHERE account_id = $1 AND encounter_id = $2::uuid
          AND source_entity_type = 'inventory_consumption') AS "billingItems",
       (SELECT source_entity_type FROM billing_items WHERE account_id = $1 AND encounter_id = $2::uuid
          AND source_entity_type = 'inventory_consumption' LIMIT 1) AS "billingSourceEntityType",
       (SELECT source_entity_id FROM billing_items WHERE account_id = $1 AND encounter_id = $2::uuid
          AND source_entity_type = 'inventory_consumption' LIMIT 1) AS "billingSourceEntityId",
       (SELECT COALESCE(SUM(total_amount), 0)::float8 FROM billing_items WHERE account_id = $1
          AND encounter_id = $2::uuid AND source_entity_type = 'inventory_consumption') AS "billingTotal",
       (SELECT COUNT(*)::int FROM audit_events WHERE account_id = $1
          AND action IN ('capture_inventory_consumption_charge', 'consume')
          AND entity_type IN ('billing-item', 'inventory-consumption')) AS "auditEvents",
       (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1
          AND module_name = 'inventory' AND event_type = 'inventory.consumption.created'
          AND payload->>'encounterId' = $2::text AND payload->>'sourceEntityId' = $6) AS "derivedOutboxEvents",
       (SELECT payload->>'sourceEntityId' FROM outbox_events WHERE account_id = $1
          AND module_name = 'inventory' AND event_type = 'inventory.consumption.created'
          AND payload->>'encounterId' = $2::text LIMIT 1) AS "derivedOutboxSourceEntityId",
       (SELECT COUNT(*)::int FROM idempotency_requests WHERE account_id = $1
          AND operation = 'POST /inventory/consumptions' AND idempotency_key = $4 AND status = 'completed') AS idempotency,
       (SELECT operation FROM idempotency_requests WHERE account_id = $1
          AND idempotency_key = $4 LIMIT 1) AS "idempotencyOperation",
       (SELECT length(request_hash)::int FROM idempotency_requests WHERE account_id = $1
          AND idempotency_key = $4 LIMIT 1) AS "idempotencyRequestHashLength",
       (SELECT request_hash FROM idempotency_requests WHERE account_id = $1
          AND idempotency_key = $4 LIMIT 1) AS "idempotencyRequestHash",
       (SELECT (response_body->>'statusCode')::int FROM idempotency_requests WHERE account_id = $1
          AND idempotency_key = $4 AND status = 'completed' LIMIT 1) AS "idempotencyResponseStatus",
       (SELECT convert_from(decode(response_body->>'bodyBase64', 'base64'), 'utf8')
          LIKE '%' || $2::text || '%' FROM idempotency_requests WHERE account_id = $1
          AND idempotency_key = $4 AND status = 'completed' LIMIT 1) AS "idempotencyResponseContainsEncounter",
       event.status AS "outboxStatus", event.attempts AS "outboxAttempts",
       event.lease_version::int AS "outboxLeaseVersion"
       FROM outbox_events event WHERE event.account_id = $1 AND event.id = $5`,
    [
      fixture.accountId,
      fixture.encounterId,
      fixture.itemId,
      fixture.idempotencyKey,
      fixture.outboxEventId,
      fixture.stayId
    ]
  );
  const row = result.rows[0];
  expect(row).toMatchObject({
    consumptions: 1,
    stock: 8,
    sourceEntityId: fixture.stayId,
    billingItems: 1,
    billingSourceEntityType: 'inventory_consumption',
    billingTotal: 80,
    auditEvents: 2,
    derivedOutboxEvents: 1,
    derivedOutboxSourceEntityId: fixture.stayId,
    idempotency: 1,
    idempotencyOperation: 'POST /inventory/consumptions',
    idempotencyRequestHashLength: 64,
    idempotencyRequestHash: hashIdempotencyPayload({
      path: '/inventory/consumptions',
      query: {},
      body: {
        encounterId: fixture.encounterId,
        inventoryItemId: fixture.itemId,
        quantity: 2,
        sourceEntityType: 'inpatient_stay',
        sourceEntityId: fixture.stayId
      }
    }),
    idempotencyResponseStatus: 201,
    idempotencyResponseContainsEncounter: true,
    outboxStatus: 'completed',
    outboxAttempts: attempts,
    outboxLeaseVersion: 2
  });
  expect(row?.billingSourceEntityId).toBe(row?.consumptionId);
}

beforeAll(async () => {
  await createLoginRole(API_ROLE);
  await createLoginRole(WORKER_ROLE);
  const client = await getTestPool().connect();
  try {
    await reconcileRuntimeRoles(client, { apiRole: API_ROLE, workerRole: WORKER_ROLE });
  } finally {
    client.release();
  }
  apiDatabaseUrl = databaseUrlForRole(API_ROLE);
  workerDatabaseUrl = databaseUrlForRole(WORKER_ROLE);
});

beforeEach(async () => {
  await seedFixture();
  await startRuntime();
});

afterEach(async () => {
  await Promise.all(
    [...activeProcesses].map((process) => process.kill('SIGKILL').catch(() => undefined))
  );
  if (server?.listening) {
    await new Promise<void>((resolveClose, rejectClose) =>
      server?.close((error) => (error ? rejectClose(error) : resolveClose()))
    );
  }
  server = undefined;
  baseUrl = '';
  accessToken = '';
  await shutdownServices();
  // TRUNCATE does not invoke the financial guard triggers that intentionally
  // reject row-by-row deletion of reserved billing items. Each test creates a
  // fresh tenant/account fixture, so this remains deterministic cleanup.
  await getTestPool().query('TRUNCATE TABLE accounts CASCADE');
});

afterAll(async () => {
  const adminPool = getAdminPool();
  await adminPool
    .query(`REVOKE cvg_installer FROM ${quoteIdentifier(API_ROLE)}`)
    .catch(() => undefined);
  await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(API_ROLE)}`).catch(() => undefined);
  await adminPool
    .query(`DROP ROLE IF EXISTS ${quoteIdentifier(WORKER_ROLE)}`)
    .catch(() => undefined);
});

describe('inpatient domain child-process SIGKILL/takeover boundary', () => {
  it.each(['after_claim', 'after_domain_command_before_cas'] as const)(
    'replays the inpatient inventory command after SIGKILL at %s',
    async (checkpoint) => {
      const workerA = startDomainProcess({
        workerId: `domain-a-${checkpoint}`,
        checkpoint
      });
      const readyA = await workerA.waitFor('DOMAIN_READY');
      expect(Number(readyA.payload.pid)).toBe(workerA.pid);
      expect(readyA.payload).toMatchObject({
        currentUser: WORKER_ROLE,
        rolsuper: false,
        rolbypassrls: false
      });
      const checkpointA = await workerA.waitFor('DOMAIN_CHECKPOINT');
      expect(checkpointA.payload.checkpoint).toBe(checkpoint);
      expect(Number(checkpointA.payload.leaseVersion)).toBe(1);

      if (checkpoint === 'after_domain_command_before_cas') {
        const commandResult = await workerA.waitFor('DOMAIN_COMMAND_RESULT');
        expect(commandResult.payload).toMatchObject({ httpStatus: 201 });
        const beforeKill = await getTestPool().query<{ readonly count: number }>(
          `SELECT COUNT(*)::int AS count FROM inventory_consumptions WHERE account_id = $1`,
          [fixture.accountId]
        );
        expect(beforeKill.rows[0]?.count).toBe(1);
      }

      const killed = await workerA.kill('SIGKILL');
      expect(killed.signal).toBe('SIGKILL');
      await waitForLeaseExpiry();

      const workerB = startDomainProcess({
        workerId: `domain-b-${checkpoint}`,
        exitAfterResult: true
      });
      const readyB = await workerB.waitFor('DOMAIN_READY');
      expect(Number(readyB.payload.pid)).toBe(workerB.pid);
      expect(workerB.pid).not.toBe(workerA.pid);
      expect(readyB.payload).toMatchObject({
        currentUser: WORKER_ROLE,
        rolsuper: false,
        rolbypassrls: false
      });
      const resultB = await workerB.waitFor('DOMAIN_RESULT');
      expect(resultB.payload).toMatchObject({
        httpStatus: 201,
        outboxCompletion: true
      });
      expect(await workerB.waitForClose()).toEqual({ code: 0, signal: null });
      expect(workerB.stderr()).toBe('');
      await assertReconciled(2);
    },
    60_000
  );

  it.each(['after_claim', 'after_domain_command_before_cas'] as const)(
    'replays a cross-domain inpatient status command after SIGKILL at %s',
    async (checkpoint) => {
      await getTestPool().query(
        `UPDATE outbox_events
            SET event_type = 'test.inpatient.status.update',
                payload = $3::jsonb
          WHERE account_id = $1 AND id = $2`,
        [
          fixture.accountId,
          fixture.outboxEventId,
          JSON.stringify({
            accountId: fixture.accountId,
            _meta: { accountId: fixture.accountId },
            operation: 'inpatient.status.update',
            stayId: fixture.stayId,
            status: 'stable',
            idempotencyKey: fixture.idempotencyKey
          })
        ]
      );

      const workerA = startDomainProcess({
        workerId: `domain-status-a-${checkpoint}`,
        checkpoint
      });
      await workerA.waitFor('DOMAIN_READY');
      const checkpointA = await workerA.waitFor('DOMAIN_CHECKPOINT');
      expect(checkpointA.payload).toMatchObject({
        checkpoint,
        leaseVersion: 1
      });

      if (checkpoint === 'after_domain_command_before_cas') {
        await expect(workerA.waitFor('DOMAIN_COMMAND_RESULT')).resolves.toMatchObject({
          payload: { httpStatus: 200 }
        });
        const committed = await getTestPool().query<{ readonly status: string }>(
          `SELECT status FROM inpatient_stays WHERE account_id = $1 AND id = $2`,
          [fixture.accountId, fixture.stayId]
        );
        expect(committed.rows[0]?.status).toBe('stable');
      }

      const killed = await workerA.kill('SIGKILL');
      expect(killed.signal).toBe('SIGKILL');
      await waitForLeaseExpiry();

      const workerB = startDomainProcess({
        workerId: `domain-status-b-${checkpoint}`,
        exitAfterResult: true
      });
      await workerB.waitFor('DOMAIN_READY');
      const resultB = await workerB.waitFor('DOMAIN_RESULT');
      expect(resultB.payload).toMatchObject({
        httpStatus: 200,
        outboxCompletion: true,
        leaseLost: false
      });
      expect(await workerB.waitForClose()).toEqual({ code: 0, signal: null });
      expect(workerB.stderr()).toBe('');

      const reconciled = await getTestPool().query<{
        readonly stayStatus: string;
        readonly timelineEvents: number;
        readonly auditEvents: number;
        readonly idempotencyRows: number;
        readonly outboxStatus: string;
        readonly outboxAttempts: number;
        readonly outboxLeaseVersion: number;
      }>(
        `SELECT
           (SELECT status FROM inpatient_stays
             WHERE account_id = $1 AND id = $2) AS "stayStatus",
           (SELECT COUNT(*)::int FROM clinical_timeline
             WHERE account_id = $1 AND encounter_id = $3
               AND event_type = 'inpatient_progressed') AS "timelineEvents",
           (SELECT COUNT(*)::int FROM audit_events
             WHERE account_id = $1 AND action = 'update_status'
               AND entity_type = 'inpatient-stay' AND entity_id = $2::text) AS "auditEvents",
           (SELECT COUNT(*)::int FROM idempotency_requests
             WHERE account_id = $1 AND operation = 'PATCH /inpatient/' || $2 || '/update-status'
               AND idempotency_key = $4 AND status = 'completed') AS "idempotencyRows",
           event.status AS "outboxStatus", event.attempts AS "outboxAttempts",
           event.lease_version::int AS "outboxLeaseVersion"
         FROM outbox_events event
        WHERE event.account_id = $1 AND event.id = $5`,
        [
          fixture.accountId,
          fixture.stayId,
          fixture.encounterId,
          fixture.idempotencyKey,
          fixture.outboxEventId
        ]
      );
      expect(reconciled.rows[0]).toMatchObject({
        stayStatus: 'stable',
        timelineEvents: 1,
        auditEvents: 1,
        idempotencyRows: 1,
        outboxStatus: 'completed',
        outboxAttempts: 2,
        outboxLeaseVersion: 2
      });
    },
    60_000
  );

  it.each([
    {
      checkpoint: 'after_claim' as const,
      label: 'assignment',
      operation: 'inpatient.beds.assign' as const,
      endpoint: 'assign-bed',
      auditAction: 'assign_bed',
      expectedStatus: 'admitted',
      timelineEvent: 'never'
    },
    {
      checkpoint: 'after_domain_command_before_cas' as const,
      label: 'assignment',
      operation: 'inpatient.beds.assign' as const,
      endpoint: 'assign-bed',
      auditAction: 'assign_bed',
      expectedStatus: 'admitted',
      timelineEvent: 'never'
    },
    {
      checkpoint: 'after_claim' as const,
      label: 'transfer',
      operation: 'inpatient.beds.transfer' as const,
      endpoint: 'transfer-bed',
      auditAction: 'transfer_bed',
      expectedStatus: 'transferred',
      timelineEvent: 'inpatient_transferred'
    },
    {
      checkpoint: 'after_domain_command_before_cas' as const,
      label: 'transfer',
      operation: 'inpatient.beds.transfer' as const,
      endpoint: 'transfer-bed',
      auditAction: 'transfer_bed',
      expectedStatus: 'transferred',
      timelineEvent: 'inpatient_transferred'
    }
  ])(
    'replays inpatient bed $label after SIGKILL at $checkpoint',
    async (scenario) => {
      await configureOutboxCommand({
        accountId: fixture.accountId,
        _meta: { accountId: fixture.accountId },
        operation: scenario.operation,
        stayId: fixture.stayId,
        bedId: fixture.targetBedId,
        sectorId: fixture.sectorId,
        idempotencyKey: fixture.idempotencyKey
      });

      const workerA = startDomainProcess({
        workerId: `domain-${scenario.label}-a-${scenario.checkpoint}`,
        checkpoint: scenario.checkpoint
      });
      await workerA.waitFor('DOMAIN_READY');
      const checkpointA = await workerA.waitFor('DOMAIN_CHECKPOINT');
      expect(checkpointA.payload).toMatchObject({
        checkpoint: scenario.checkpoint,
        leaseVersion: 1
      });

      if (scenario.checkpoint === 'after_domain_command_before_cas') {
        await expect(workerA.waitFor('DOMAIN_COMMAND_RESULT')).resolves.toMatchObject({
          payload: { httpStatus: 200 }
        });
        const committed = await getTestPool().query<{
          readonly status: string;
          readonly bedId: string;
        }>(
          `SELECT status, bed_id::text AS "bedId"
             FROM inpatient_stays WHERE account_id = $1 AND id = $2`,
          [fixture.accountId, fixture.stayId]
        );
        expect(committed.rows[0]).toMatchObject({
          status: scenario.expectedStatus,
          bedId: fixture.targetBedId
        });
      }

      const killed = await workerA.kill('SIGKILL');
      expect(killed.signal).toBe('SIGKILL');
      await waitForLeaseExpiry();

      const workerB = startDomainProcess({
        workerId: `domain-${scenario.label}-b-${scenario.checkpoint}`,
        exitAfterResult: true
      });
      await workerB.waitFor('DOMAIN_READY');
      const resultB = await workerB.waitFor('DOMAIN_RESULT');
      expect(resultB.payload).toMatchObject({
        httpStatus: 200,
        outboxCompletion: true,
        leaseLost: false
      });
      expect(await workerB.waitForClose()).toEqual({ code: 0, signal: null });
      expect(workerB.stderr()).toBe('');

      const reconciled = await getTestPool().query<{
        readonly stayStatus: string;
        readonly stayBedId: string;
        readonly initialBedStatus: string;
        readonly targetBedStatus: string;
        readonly timelineEvents: number;
        readonly auditEvents: number;
        readonly idempotencyRows: number;
        readonly outboxStatus: string;
        readonly outboxAttempts: number;
        readonly outboxLeaseVersion: number;
      }>(
        `SELECT
           (SELECT status FROM inpatient_stays
             WHERE account_id = $1 AND id = $2) AS "stayStatus",
           (SELECT bed_id::text FROM inpatient_stays
             WHERE account_id = $1 AND id = $2) AS "stayBedId",
           (SELECT status FROM beds WHERE account_id = $1 AND id = $3) AS "initialBedStatus",
           (SELECT status FROM beds WHERE account_id = $1 AND id = $4) AS "targetBedStatus",
           (SELECT COUNT(*)::int FROM clinical_timeline
             WHERE account_id = $1 AND encounter_id = $5 AND event_type = $6) AS "timelineEvents",
           (SELECT COUNT(*)::int FROM audit_events
             WHERE account_id = $1 AND action = $7
               AND entity_type = 'inpatient-stay' AND entity_id = $2::text) AS "auditEvents",
           (SELECT COUNT(*)::int FROM idempotency_requests
             WHERE account_id = $1 AND operation = $8
               AND idempotency_key = $9 AND status = 'completed') AS "idempotencyRows",
           event.status AS "outboxStatus", event.attempts AS "outboxAttempts",
           event.lease_version::int AS "outboxLeaseVersion"
         FROM outbox_events event
        WHERE event.account_id = $1 AND event.id = $10`,
        [
          fixture.accountId,
          fixture.stayId,
          fixture.initialBedId,
          fixture.targetBedId,
          fixture.encounterId,
          scenario.timelineEvent,
          scenario.auditAction,
          `POST /inpatient/${fixture.stayId}/${scenario.endpoint}`,
          fixture.idempotencyKey,
          fixture.outboxEventId
        ]
      );
      expect(reconciled.rows[0]).toMatchObject({
        stayStatus: scenario.expectedStatus,
        stayBedId: fixture.targetBedId,
        initialBedStatus: 'available',
        targetBedStatus: 'occupied',
        timelineEvents: scenario.timelineEvent === 'never' ? 0 : 1,
        auditEvents: 1,
        idempotencyRows: 1,
        outboxStatus: 'completed',
        outboxAttempts: 2,
        outboxLeaseVersion: 2
      });
    },
    60_000
  );

  it.each(['after_claim', 'after_domain_command_before_cas'] as const)(
    'fences a stale owner while process A is still alive at %s',
    async (checkpoint) => {
      const workerA = startDomainProcess({
        workerId: `domain-stale-a-${checkpoint}`,
        checkpoint,
        pauseUntilSignal: true,
        exitAfterResult: true
      });
      const readyA = await workerA.waitFor('DOMAIN_READY');
      expect(Number(readyA.payload.pid)).toBe(workerA.pid);
      expect(readyA.payload).toMatchObject({
        currentUser: WORKER_ROLE,
        rolsuper: false,
        rolbypassrls: false
      });
      const checkpointA = await workerA.waitFor('DOMAIN_CHECKPOINT');
      expect(checkpointA.payload.checkpoint).toBe(checkpoint);
      expect(Number(checkpointA.payload.leaseVersion)).toBe(1);

      if (checkpoint === 'after_domain_command_before_cas') {
        await expect(workerA.waitFor('DOMAIN_COMMAND_RESULT')).resolves.toMatchObject({
          payload: { httpStatus: 201 }
        });
      }

      await waitForLeaseExpiry();
      const workerB = startDomainProcess({
        workerId: `domain-stale-b-${checkpoint}`,
        exitAfterResult: true
      });
      const readyB = await workerB.waitFor('DOMAIN_READY');
      expect(Number(readyB.payload.pid)).toBe(workerB.pid);
      expect(workerB.pid).not.toBe(workerA.pid);
      expect(readyB.payload).toMatchObject({
        currentUser: WORKER_ROLE,
        rolsuper: false,
        rolbypassrls: false
      });
      const checkpointB = await workerB.waitFor('DOMAIN_CHECKPOINT');
      expect(Number(checkpointB.payload.leaseVersion)).toBe(2);
      const resultB = await workerB.waitFor('DOMAIN_RESULT');
      expect(resultB.payload).toMatchObject({
        httpStatus: 201,
        outboxCompletion: true,
        leaseLost: false
      });
      expect(await workerB.waitForClose()).toEqual({ code: 0, signal: null });
      expect(workerB.stderr()).toBe('');
      expect(workerA.child.exitCode).toBeNull();
      expect(workerA.child.signalCode).toBeNull();

      workerA.resume();
      const resultA = await workerA.waitFor('DOMAIN_RESULT');
      expect(resultA.payload).toMatchObject({
        httpStatus: 201,
        outboxCompletion: false,
        leaseLost: true
      });
      expect(await workerA.waitForClose()).toEqual({ code: 0, signal: null });
      expect(workerA.stderr()).toBe('');

      const divergentReplay = await requestJson<{ readonly code?: string }>(
        '/inventory/consumptions',
        {
          method: 'POST',
          headers: { ...authHeaders(), 'idempotency-key': fixture.idempotencyKey },
          body: JSON.stringify({
            encounterId: fixture.encounterId,
            inventoryItemId: fixture.itemId,
            quantity: 3,
            sourceEntityType: 'inpatient_stay',
            sourceEntityId: fixture.stayId
          })
        }
      );
      expect(divergentReplay.status).toBe(409);
      expect(divergentReplay.body).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
      await assertReconciled(2);
    },
    60_000
  );
});
