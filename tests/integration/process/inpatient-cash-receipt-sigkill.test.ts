import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const API_PROCESS_FIXTURE = resolve(ROOT, 'apps/api/test-fixtures/api-process.ts');
const suffix = randomUUID().replaceAll('-', '');
const apiRole = `receipt_kill_api_${suffix}`;
const workerRole = `receipt_kill_worker_${suffix}`;
const rolePassword = `receipt-kill-${suffix}`;
const tenantA = randomUUID();
const accountA = randomUUID();
const userA = randomUUID();
const ownerA = randomUUID();
const patientA = randomUUID();
const encounterA = randomUUID();
const itemA = `receipt-kill-item-${randomUUID()}`;
const lotA = `receipt-kill-lot-${randomUUID()}`;
const cashRegisterA = randomUUID();
const usernameA = `receipt-kill-a-${userA.slice(0, 8)}`;
const tenantB = randomUUID();
const accountB = randomUUID();
const userB = randomUUID();
const ownerB = randomUUID();
const patientB = randomUUID();
const encounterB = randomUUID();
const usernameB = `receipt-kill-b-${userB.slice(0, 8)}`;
const triggerName = `receipt_kill_pause_${suffix}`;
const triggerFunction = `receipt_kill_pause_fn_${suffix}`;
const amountInventory = 80;
const amountDaily = 180;
const amountTotal = amountInventory + amountDaily;

let primary: ApiProcess | undefined;
let accessTokenA = '';
let accessTokenB = '';
let stayId = '';

interface ApiProcess {
  readonly child: ChildProcess;
  readonly pid: number;
  readonly port: number;
  readonly baseUrl: string;
  readonly output: () => string;
  readonly close: () => Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>;
}

interface JsonResponse<T> {
  readonly status: number;
  readonly body?: T;
  readonly text: string;
}

interface LoginResponse {
  readonly accessToken: string;
}

interface AdmissionResponse {
  readonly id: string;
}

interface HandoffResponse {
  readonly id: string;
}

interface DailyChargeResponse {
  readonly id: string;
  readonly status: string;
}

interface ReceiptResponse {
  readonly id: string;
  readonly amount: number;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function databaseUrlFor(role: string): string {
  const url = new URL(TEST_DB_URL);
  url.username = role;
  url.password = rolePassword;
  return url.toString();
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
  const address = server.address() as AddressInfo | null;
  if (!address) throw new Error('could not reserve API process port');
  const port = address.port;
  await new Promise<void>((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose()))
  );
  return port;
}

function startApi(port: number): ApiProcess {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', API_PROCESS_FIXTURE], {
    cwd: ROOT,
    env: {
      ...process.env,
      API_PROCESS_FIXTURE: '1',
      NODE_ENV: 'test',
      APP_NAME: 'inpatient-cash-receipt-sigkill',
      HOST: '127.0.0.1',
      PORT: String(port),
      DATABASE_URL: databaseUrlFor(apiRole),
      AUTH_SECRET: '8b4f0c3a91de72f06a6c4e9b1d7f3a5c8e2b6d0f4a9c1e7b3d5f8a2c6e0b4d9',
      CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:3000',
      OTEL_ENABLED: 'false',
      PIX_MOCK_MODE: 'true',
      EMAIL_MOCK_MODE: 'true',
      SMS_MOCK_MODE: 'true',
      GOOGLE_CALENDAR_MOCK_MODE: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (child.pid === undefined) throw new Error('API process fixture did not expose a PID');
  let output = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr?.on('data', (chunk: string) => {
    output += chunk;
  });
  let closeResult:
    | { readonly code: number | null; readonly signal: NodeJS.Signals | null }
    | undefined;
  let resolveClose:
    | ((result: { readonly code: number | null; readonly signal: NodeJS.Signals | null }) => void)
    | undefined;
  const closed = new Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolveClosePromise) => {
    resolveClose = resolveClosePromise;
  });
  child.once('close', (code, signal) => {
    closeResult = { code, signal };
    resolveClose?.(closeResult);
  });
  return {
    child,
    pid: child.pid,
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    output: () => output,
    close: () => (closeResult ? Promise.resolve(closeResult) : closed)
  };
}

async function stopApi(
  processHandle: ApiProcess,
  signal: NodeJS.Signals
): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }> {
  if (processHandle.child.exitCode === null && processHandle.child.signalCode === null) {
    processHandle.child.kill(signal);
  }
  return processHandle.close();
}

async function waitForApi(processHandle: ApiProcess): Promise<void> {
  const deadline = Date.now() + 30_000;
  let lastError = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${processHandle.baseUrl}/health`, {
        signal: AbortSignal.timeout(500)
      });
      const body = (await response.json()) as { readonly persistenceMode?: string };
      if (response.status === 200 && body.persistenceMode === 'database') return;
      lastError = `${response.status} ${JSON.stringify(body)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 50));
  }
  throw new Error(
    `API process did not become ready: ${lastError}\n${processHandle.output().slice(-4000)}`
  );
}

async function requestJson<T>(
  processHandle: ApiProcess,
  path: string,
  init: RequestInit = {}
): Promise<JsonResponse<T>> {
  const response = await fetch(`${processHandle.baseUrl}${path}`, init);
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as T) : undefined, text };
}

function headers(token: string, tenantId: string, accountId: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'x-account-id': accountId,
    'content-type': 'application/json'
  };
}

function headersA(): HeadersInit {
  return headers(accessTokenA, tenantA, accountA);
}

async function login(processHandle: ApiProcess, username: string): Promise<string> {
  const response = await requestJson<LoginResponse>(processHandle, '/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'seed_admin' })
  });
  if (response.status !== 200 || !response.body?.accessToken) {
    throw new Error(`process fixture login failed: ${response.status} ${response.text}`);
  }
  return response.body.accessToken;
}

async function seedTenant(input: {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly ownerId: string;
  readonly patientId: string;
  readonly encounterId: string;
  readonly username: string;
  readonly includeInventory: boolean;
}): Promise<void> {
  const pool = getTestPool();
  await pool.query(`INSERT INTO tenants (id, slug, name, status) VALUES ($1, $2, $3, 'active')`, [
    input.tenantId,
    `receipt-kill-${input.tenantId.slice(0, 8)}`,
    `Receipt kill ${input.username} tenant`
  ]);
  await pool.query(`INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, $4)`, [
    input.accountId,
    input.tenantId,
    `receipt-kill-${input.accountId.slice(0, 8)}`,
    `Receipt kill ${input.username} account`
  ]);
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', $5, true)`,
    [
      input.userId,
      input.accountId,
      input.username,
      `${input.username}@example.test`,
      `${input.username} operator`
    ]
  );
  const adminRole = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!adminRole.rows[0]) throw new Error('admin role is missing from receipt SIGKILL fixture');
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    input.userId,
    adminRole.rows[0].id
  ]);
  await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, $3)`, [
    input.ownerId,
    input.accountId,
    `${input.username} owner`
  ]);
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species) VALUES ($1, $2, $3, $4, 'canine')`,
    [input.patientId, input.accountId, input.ownerId, `${input.username} patient`]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id, reason)
     VALUES ($1, $2, $3, $4, 'open', $5, 'Cash receipt SIGKILL journey')`,
    [input.encounterId, input.accountId, input.patientId, input.ownerId, input.userId]
  );
  if (!input.includeInventory) return;
  await pool.query(
    `INSERT INTO inventory_items (
       id, account_id, sku, name, unit, on_hand_quantity, reorder_level, unit_cost_amount, charge_unit_price_amount
     ) VALUES ($1, $2, $3, 'Receipt SIGKILL supply', 'unit', 10, 1, 25, 40)`,
    [itemA, accountA, `SKU-${itemA.slice(-12)}`]
  );
  await pool.query(
    `INSERT INTO inventory_lots (
       id, account_id, inventory_item_id, lot_number, quantity, reserved_quantity, unit, location, supplier, expiry_date, status
     ) VALUES ($1, $2, $3, $4, 10, 0, 'unit', 'Ala A', 'Receipt SIGKILL supplier', '2028-12-31T00:00:00.000Z', 'active')`,
    [lotA, accountA, itemA, `LOT-${lotA.slice(-12)}`]
  );
}

async function seedCashRegister(): Promise<void> {
  await getTestPool().query(
    `INSERT INTO cash_registers (id, account_id, opened_by_user_id, opening_amount, status)
     VALUES ($1, $2, $3, 50, 'open')`,
    [cashRegisterA, accountA, userA]
  );
}

async function prepareJourney(processHandle: ApiProcess): Promise<void> {
  const admission = await requestJson<AdmissionResponse>(processHandle, '/inpatient', {
    method: 'POST',
    headers: { ...headersA(), 'idempotency-key': randomUUID() },
    body: JSON.stringify({
      encounterId: encounterA,
      patientId: patientA,
      unit: 'Internacao clinica',
      ward: 'Ala A',
      bed: 'A-01'
    })
  });
  expect(admission.status).toBe(201);
  stayId = admission.body?.id ?? '';
  expect(stayId).toMatch(/^[0-9a-f-]{36}$/i);

  const handoff = await requestJson<HandoffResponse>(
    processHandle,
    '/clinical-handoffs/send-to-reception',
    {
      method: 'POST',
      headers: headersA(),
      body: JSON.stringify({
        encounterId: encounterA,
        clinicalSummary: 'Paciente internado, estável e em observação.',
        receptionInstructions: 'Confirmar itens e valores na alta.',
        priority: 'medium'
      })
    }
  );
  expect(handoff.status).toBe(201);
  const acknowledged = await requestJson<HandoffResponse>(
    processHandle,
    `/clinical-handoffs/${handoff.body?.id}/acknowledge`,
    {
      method: 'POST',
      headers: headersA(),
      body: JSON.stringify({ note: 'Recepção confirmou a vaga.' })
    }
  );
  expect(acknowledged.status).toBe(200);

  const consumed = await requestJson(processHandle, '/inventory/consumptions', {
    method: 'POST',
    headers: { ...headersA(), 'idempotency-key': randomUUID() },
    body: JSON.stringify({
      encounterId: encounterA,
      inventoryItemId: itemA,
      quantity: 2,
      sourceEntityType: 'inpatient_stay',
      sourceEntityId: stayId
    })
  });
  expect(consumed.status).toBe(201);

  const daily = await requestJson<DailyChargeResponse>(
    processHandle,
    `/inpatient/${stayId}/daily-charges`,
    {
      method: 'POST',
      headers: headersA(),
      body: JSON.stringify({
        description: 'Diária do receipt SIGKILL',
        quantity: 1,
        unitAmount: amountDaily
      })
    }
  );
  expect(daily.status).toBe(201);
  const billed = await requestJson<DailyChargeResponse>(
    processHandle,
    `/inpatient/${stayId}/daily-charges/${daily.body?.id}/bill`,
    {
      method: 'POST',
      headers: { ...headersA(), 'idempotency-key': randomUUID() },
      body: JSON.stringify({})
    }
  );
  expect(billed.status).toBe(200);
  expect(billed.body?.status).toBe('billed');

  const opened = await requestJson<{ readonly status: string }>(
    processHandle,
    `/billing/${encounterA}/status`,
    {
      method: 'PATCH',
      headers: headersA(),
      body: JSON.stringify({ status: 'open' })
    }
  );
  expect(opened.status).toBe(200);

  const discharged = await requestJson(processHandle, '/discharges', {
    method: 'POST',
    headers: { ...headersA(), 'idempotency-key': randomUUID() },
    body: JSON.stringify({ encounterId: encounterA, dischargeType: 'inpatient' })
  });
  expect(discharged.status).toBe(201);
  const closed = await requestJson<{ readonly status: string }>(
    processHandle,
    `/encounters/${encounterA}/close`,
    {
      method: 'POST',
      headers: { ...headersA(), 'idempotency-key': randomUUID() },
      body: JSON.stringify({ closeReason: 'Alta pronta para recebimento' })
    }
  );
  expect(closed.status).toBe(200);
  expect(closed.body?.status).toBe('closed');
}

async function installReceiptPause(): Promise<void> {
  await getTestPool().query(
    `CREATE OR REPLACE FUNCTION public.${quoteIdentifier(triggerFunction)}()
       RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         PERFORM pg_advisory_lock(hashtextextended('cvg-cash-receipt-pause', 0));
         PERFORM pg_sleep(30);
         RETURN NEW;
       END;
       $$`
  );
  await getTestPool().query(
    `CREATE TRIGGER ${quoteIdentifier(triggerName)}
       AFTER INSERT ON encounter_cash_receipts
       FOR EACH ROW EXECUTE FUNCTION public.${quoteIdentifier(triggerFunction)}()`
  );
}

async function removeReceiptPause(): Promise<void> {
  await getTestPool()
    .query(`DROP TRIGGER IF EXISTS ${quoteIdentifier(triggerName)} ON encounter_cash_receipts`)
    .catch(() => undefined);
  await getTestPool()
    .query(`DROP FUNCTION IF EXISTS public.${quoteIdentifier(triggerFunction)}()`)
    .catch(() => undefined);
}

async function waitForReceiptPause(): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await getAdminPool().query<{ readonly pid: number }>(
      `SELECT activity.pid
         FROM pg_stat_activity AS activity
         JOIN pg_locks AS lock ON lock.pid = activity.pid
        WHERE activity.usename = $1
          AND activity.datname = $2
          AND lock.locktype = 'advisory'
          AND lock.granted`,
      [apiRole, TEST_DB_NAME]
    );
    if (result.rows.length > 0) return;
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 25));
  }
  throw new Error('API process did not reach the receipt pause trigger');
}

async function assertNoReceiptResidue(idempotencyKey: string): Promise<void> {
  const result = await getTestPool().query<{
    readonly receipt: number;
    readonly payment: number;
    readonly cashMovement: number;
    readonly journalEntry: number;
    readonly journalLines: number;
    readonly audit: number;
    readonly outbox: number;
    readonly idempotency: number;
    readonly billingStatus: string;
    readonly receivable: number;
    readonly financialAccount: number;
    readonly receivableSettled: number;
    readonly financialPaid: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM encounter_cash_receipts WHERE account_id = $1 AND encounter_id = $2) AS receipt,
       (SELECT COUNT(*)::int FROM encounter_receivable_payments WHERE account_id = $1 AND encounter_id = $2) AS payment,
       (SELECT COUNT(*)::int FROM cash_movements WHERE account_id = $1 AND reference LIKE 'encounter_cash_receipt:%') AS "cashMovement",
       (SELECT COUNT(*)::int FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt') AS "journalEntry",
       (SELECT COUNT(*)::int FROM financial_journal_lines WHERE account_id = $1 AND entry_id IN (SELECT id FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt')) AS "journalLines",
       (SELECT COUNT(*)::int FROM audit_events WHERE account_id = $1 AND entity_type = 'encounter_cash_receipt') AS audit,
       (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'encounter.cash-receipt.created') AS outbox,
       (SELECT COUNT(*)::int FROM idempotency_requests WHERE account_id = $1 AND operation = $4 AND idempotency_key = $3) AS idempotency,
       (SELECT status FROM billing_records WHERE account_id = $1 AND encounter_id = $2) AS "billingStatus",
       (SELECT COUNT(*)::int FROM encounter_receivables WHERE account_id = $1 AND encounter_id = $2) AS receivable,
       (SELECT COUNT(*)::int FROM encounter_financial_accounts WHERE account_id = $1 AND encounter_id = $2) AS "financialAccount",
       (SELECT COUNT(*)::int FROM encounter_receivables WHERE account_id = $1 AND encounter_id = $2 AND status = 'settled') AS "receivableSettled",
       (SELECT COUNT(*)::int FROM encounter_financial_accounts WHERE account_id = $1 AND encounter_id = $2 AND financial_status = 'paid') AS "financialPaid"`,
    [accountA, encounterA, idempotencyKey, `POST /encounters/${encounterA}/cash-receipts`]
  );
  expect(result.rows[0]).toEqual({
    receipt: 0,
    payment: 0,
    cashMovement: 0,
    journalEntry: 0,
    journalLines: 0,
    audit: 0,
    outbox: 0,
    idempotency: 0,
    billingStatus: 'open',
    receivable: 0,
    financialAccount: 0,
    receivableSettled: 0,
    financialPaid: 0
  });
}

async function assertExactlyOneReceipt(idempotencyKey: string): Promise<void> {
  const result = await getTestPool().query<{
    readonly receipt: number;
    readonly payment: number;
    readonly cashMovement: number;
    readonly journalEntry: number;
    readonly journalLines: number;
    readonly audit: number;
    readonly outbox: number;
    readonly idempotency: number;
    readonly billingStatus: string;
    readonly receivable: number;
    readonly financialAccount: number;
    readonly receivableSettled: number;
    readonly financialPaid: number;
    readonly debit: number;
    readonly credit: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM encounter_cash_receipts WHERE account_id = $1 AND encounter_id = $2) AS receipt,
       (SELECT COUNT(*)::int FROM encounter_receivable_payments WHERE account_id = $1 AND encounter_id = $2) AS payment,
       (SELECT COUNT(*)::int FROM cash_movements WHERE account_id = $1 AND reference LIKE 'encounter_cash_receipt:%') AS "cashMovement",
       (SELECT COUNT(*)::int FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt') AS "journalEntry",
       (SELECT COUNT(*)::int FROM financial_journal_lines WHERE account_id = $1 AND entry_id IN (SELECT id FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt')) AS "journalLines",
       (SELECT COUNT(*)::int FROM audit_events WHERE account_id = $1 AND entity_type = 'encounter_cash_receipt') AS audit,
       (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'encounter.cash-receipt.created') AS outbox,
       (SELECT COUNT(*)::int FROM idempotency_requests WHERE account_id = $1 AND operation = $4 AND idempotency_key = $3 AND status = 'completed') AS idempotency,
       (SELECT status FROM billing_records WHERE account_id = $1 AND encounter_id = $2) AS "billingStatus",
       (SELECT COUNT(*)::int FROM encounter_receivables WHERE account_id = $1 AND encounter_id = $2) AS receivable,
       (SELECT COUNT(*)::int FROM encounter_financial_accounts WHERE account_id = $1 AND encounter_id = $2) AS "financialAccount",
       (SELECT COUNT(*)::int FROM encounter_receivables WHERE account_id = $1 AND encounter_id = $2 AND status = 'settled') AS "receivableSettled",
       (SELECT COUNT(*)::int FROM encounter_financial_accounts WHERE account_id = $1 AND encounter_id = $2 AND financial_status = 'paid') AS "financialPaid",
       (SELECT COALESCE(SUM(debit), 0)::float8 FROM financial_journal_lines WHERE account_id = $1 AND entry_id IN (SELECT id FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt')) AS debit,
       (SELECT COALESCE(SUM(credit), 0)::float8 FROM financial_journal_lines WHERE account_id = $1 AND entry_id IN (SELECT id FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt')) AS credit`,
    [accountA, encounterA, idempotencyKey, `POST /encounters/${encounterA}/cash-receipts`]
  );
  expect(result.rows[0]).toEqual({
    receipt: 1,
    payment: 1,
    cashMovement: 1,
    journalEntry: 1,
    journalLines: 2,
    audit: 1,
    outbox: 1,
    idempotency: 1,
    billingStatus: 'settled',
    receivable: 1,
    financialAccount: 1,
    receivableSettled: 1,
    financialPaid: 1,
    debit: amountTotal,
    credit: amountTotal
  });
}

beforeAll(async () => {
  const adminPool = getAdminPool();
  await adminPool.query(
    `CREATE ROLE ${quoteIdentifier(apiRole)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${rolePassword}'`
  );
  await adminPool.query(
    `CREATE ROLE ${quoteIdentifier(workerRole)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${rolePassword}'`
  );
  await adminPool.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(TEST_DB_NAME)} TO ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
  );
  const client = await getTestPool().connect();
  try {
    await reconcileRuntimeRoles(client, { apiRole, workerRole });
  } finally {
    client.release();
  }
  await seedTenant({
    tenantId: tenantA,
    accountId: accountA,
    userId: userA,
    ownerId: ownerA,
    patientId: patientA,
    encounterId: encounterA,
    username: usernameA,
    includeInventory: true
  });
  await seedTenant({
    tenantId: tenantB,
    accountId: accountB,
    userId: userB,
    ownerId: ownerB,
    patientId: patientB,
    encounterId: encounterB,
    username: usernameB,
    includeInventory: false
  });
  await seedCashRegister();
}, 120_000);

afterEach(async () => {
  if (primary) {
    await stopApi(primary, 'SIGKILL').catch(() => undefined);
    primary = undefined;
  }
  await removeReceiptPause();
});

afterAll(async () => {
  if (primary) {
    await stopApi(primary, 'SIGKILL').catch(() => undefined);
    primary = undefined;
  }
  await removeReceiptPause();
  const pool = getTestPool();
  await pool
    .query(`REASSIGN OWNED BY ${quoteIdentifier(apiRole)} TO CURRENT_USER`)
    .catch(() => undefined);
  await pool.query(`DROP OWNED BY ${quoteIdentifier(apiRole)}`).catch(() => undefined);
  await pool
    .query(`REASSIGN OWNED BY ${quoteIdentifier(workerRole)} TO CURRENT_USER`)
    .catch(() => undefined);
  await pool.query(`DROP OWNED BY ${quoteIdentifier(workerRole)}`).catch(() => undefined);
  const adminPool = getAdminPool();
  await adminPool
    .query(`REVOKE cvg_installer FROM ${quoteIdentifier(apiRole)}`)
    .catch(() => undefined);
  await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`).catch(() => undefined);
  await adminPool
    .query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`)
    .catch(() => undefined);
});

describe('inpatient cash receipt real API-process SIGKILL boundary', () => {
  it('rolls back the whole receipt graph when killed after receipt insert, then replays exactly once after restart', async () => {
    const firstPort = await reservePort();
    primary = startApi(firstPort);
    await waitForApi(primary);
    accessTokenA = await login(primary, usernameA);
    accessTokenB = await login(primary, usernameB);
    await prepareJourney(primary);

    const idempotencyKey = randomUUID();
    const firstProcessPid = primary.pid;
    await installReceiptPause();
    const pendingReceipt = fetch(`${primary.baseUrl}/encounters/${encounterA}/cash-receipts`, {
      method: 'POST',
      headers: { ...headersA(), 'idempotency-key': idempotencyKey },
      body: JSON.stringify({
        cashRegisterId: cashRegisterA,
        expectedAmount: amountTotal,
        notes: 'SIGKILL receipt'
      })
    }).then(
      () => undefined,
      (error: unknown) => error
    );
    await waitForReceiptPause();
    expect(await stopApi(primary, 'SIGKILL')).toEqual({ code: null, signal: 'SIGKILL' });
    primary = undefined;
    expect(await pendingReceipt).toBeInstanceOf(Error);
    await assertNoReceiptResidue(idempotencyKey);

    await removeReceiptPause();
    const restartPort = await reservePort();
    primary = startApi(restartPort);
    expect(primary.pid).not.toBe(firstProcessPid);
    await waitForApi(primary);
    accessTokenA = await login(primary, usernameA);
    accessTokenB = await login(primary, usernameB);

    const replay = await requestJson<ReceiptResponse>(
      primary,
      `/encounters/${encounterA}/cash-receipts`,
      {
        method: 'POST',
        headers: { ...headersA(), 'idempotency-key': idempotencyKey },
        body: JSON.stringify({
          cashRegisterId: cashRegisterA,
          expectedAmount: amountTotal,
          notes: 'SIGKILL receipt'
        })
      }
    );
    expect(replay.status).toBe(201);
    expect(replay.body).toMatchObject({ amount: amountTotal });
    await assertExactlyOneReceipt(idempotencyKey);

    const divergent = await requestJson<{ readonly code?: string }>(
      primary,
      `/encounters/${encounterA}/cash-receipts`,
      {
        method: 'POST',
        headers: { ...headersA(), 'idempotency-key': idempotencyKey },
        body: JSON.stringify({
          cashRegisterId: cashRegisterA,
          expectedAmount: amountTotal + 1,
          notes: 'payload divergente'
        })
      }
    );
    expect(divergent.status).toBe(409);
    expect(divergent.body?.code).toBe('IDEMPOTENCY_CONFLICT');
    await assertExactlyOneReceipt(idempotencyKey);

    const foreign = await requestJson<{ readonly code?: string }>(
      primary,
      `/encounters/${encounterA}/cash-receipts`,
      {
        method: 'POST',
        headers: { ...headers(accessTokenB, tenantB, accountB), 'idempotency-key': randomUUID() },
        body: JSON.stringify({ cashRegisterId: cashRegisterA, expectedAmount: amountTotal })
      }
    );
    expect(foreign.status).toBe(404);
    await assertExactlyOneReceipt(idempotencyKey);
  }, 120_000);
});
