import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_IS_EPHEMERAL, TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const API_PROCESS_FIXTURE = resolve(
  ROOT,
  'apps/api/test-fixtures/inpatient-clinical-financial-process.ts'
);
const suffix = randomUUID().replaceAll('-', '');
const apiRole = `clinical_financial_api_${suffix}`;
const workerRole = `clinical_financial_worker_${suffix}`;
const rolePassword = `clinical-financial-${suffix}`;
const authSecret = `clinical-financial-auth-${suffix}-secret-with-sufficient-entropy`;
const tenantA = randomUUID();
const accountA = randomUUID();
const userA = randomUUID();
const ownerA = randomUUID();
const patientA = randomUUID();
const encounterA = randomUUID();
const itemA = `clinical-financial-item-${randomUUID()}`;
const lotA = `clinical-financial-lot-${randomUUID()}`;
const cashRegisterA = randomUUID();
const usernameA = `clinical-financial-a-${userA.slice(0, 8)}`;
const tenantB = randomUUID();
const accountB = randomUUID();
const userB = randomUUID();
const ownerB = randomUUID();
const patientB = randomUUID();
const encounterB = randomUUID();
const itemB = `clinical-financial-item-${randomUUID()}`;
const lotB = `clinical-financial-lot-${randomUUID()}`;
const usernameB = `clinical-financial-b-${userB.slice(0, 8)}`;
const triggerName = `clinical_financial_pause_${suffix}`;
const triggerFunction = `clinical_financial_pause_fn_${suffix}`;
const pauseLockName = `cvg-clinical-financial-consumption-${suffix}`;
const inventoryOperation = 'POST /inventory/consumptions';
const receiptOperation = 'encounter.cash-receipt.create';
const consumptionQuantity = 2;
const initialStock = 10;
const remainingStock = initialStock - consumptionQuantity;
const inventoryUnitCost = 25;
const inventoryChargePrice = 40;
const amountInventory = 80;
const amountDaily = 180;
const amountTotal = amountInventory + amountDaily;
const openingCash = 50;
const expectedCashBalance = openingCash + amountTotal;

let primary: ApiProcess | undefined;
let accessTokenA = '';
let accessTokenB = '';
let stayId = '';

interface ApiProcess {
  readonly child: ChildProcess;
  readonly pid: number;
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

interface FinancialJourneyIds {
  readonly dailyChargeId: string;
  readonly receiptId: string;
  readonly receiptKey: string;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function decodeIdempotencyResponse(responseBody: Record<string, unknown>): Record<string, unknown> {
  const bodyBase64 = responseBody.bodyBase64;
  if (typeof bodyBase64 === 'string') {
    expect(responseBody).toMatchObject({
      statusCode: 201,
      headers: expect.objectContaining({
        'content-type': expect.stringContaining('application/json')
      })
    });
    return JSON.parse(Buffer.from(bodyBase64, 'base64').toString('utf8')) as Record<
      string,
      unknown
    >;
  }
  return responseBody;
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
  if (!address) throw new Error('clinical-financial child process did not expose a port');
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
      NODE_ENV: 'test',
      INPATIENT_CLINICAL_FINANCIAL_PROCESS_FIXTURE: '1',
      APP_NAME: 'inpatient-clinical-financial-child-process',
      HOST: '127.0.0.1',
      PORT: String(port),
      DATABASE_URL: databaseUrlFor(apiRole),
      POSTGRES_API_USER: apiRole,
      POSTGRES_WORKER_USER: workerRole,
      AUTH_SECRET: authSecret,
      CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:3000',
      OTEL_ENABLED: 'false',
      PIX_MOCK_MODE: 'true',
      EMAIL_MOCK_MODE: 'true',
      SMS_MOCK_MODE: 'true',
      GOOGLE_CALENDAR_MOCK_MODE: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (child.pid === undefined) throw new Error('clinical-financial API child did not expose a PID');

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
  }>((resolveClosed) => {
    resolveClose = resolveClosed;
  });
  child.once('close', (code, signal) => {
    closeResult = { code, signal };
    resolveClose?.(closeResult);
  });

  return {
    child,
    pid: child.pid,
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
    if (!processHandle.child.kill(signal)) {
      throw new Error(`failed to send ${signal} to API child PID ${processHandle.pid}`);
    }
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
    `clinical-financial API child did not become ready: ${lastError}\n${processHandle.output().slice(-4000)}`
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

function headersB(): HeadersInit {
  return headers(accessTokenB, tenantB, accountB);
}

async function login(processHandle: ApiProcess, username: string): Promise<string> {
  const response = await requestJson<LoginResponse>(processHandle, '/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'seed_admin' })
  });
  if (response.status !== 200 || !response.body?.accessToken) {
    throw new Error(`clinical-financial child login failed: ${response.status} ${response.text}`);
  }
  return response.body.accessToken;
}

async function createLoginRole(role: string): Promise<void> {
  const adminPool = getAdminPool();
  const result = await adminPool.query<{ readonly sql: string }>(
    `SELECT format(
       'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD %L',
       $1::text, $2::text
     ) AS sql`,
    [role, rolePassword]
  );
  const sql = result.rows[0]?.sql;
  if (!sql) throw new Error(`failed to create clinical-financial runtime role ${role}`);
  await adminPool.query(sql);
  await adminPool.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(TEST_DB_NAME)} TO ${quoteIdentifier(role)}`
  );
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
  readonly inventoryItemId?: string;
  readonly inventoryLotId?: string;
}): Promise<void> {
  const pool = getTestPool();
  await pool.query(`INSERT INTO tenants (id, slug, name, status) VALUES ($1, $2, $3, 'active')`, [
    input.tenantId,
    `clinical-financial-${input.tenantId.slice(0, 8)}`,
    `Clinical financial ${input.username} tenant`
  ]);
  await pool.query(`INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, $4)`, [
    input.accountId,
    input.tenantId,
    `clinical-financial-${input.accountId.slice(0, 8)}`,
    `Clinical financial ${input.username} account`
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
  if (!adminRole.rows[0]) throw new Error('admin role is missing from clinical-financial fixture');
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
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, $4, 'canine')`,
    [input.patientId, input.accountId, input.ownerId, `${input.username} patient`]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id, reason)
     VALUES ($1, $2, $3, $4, 'open', $5, 'Clinical-financial child process journey')`,
    [input.encounterId, input.accountId, input.patientId, input.ownerId, input.userId]
  );
  if (!input.includeInventory) return;
  const inventoryItemId = input.inventoryItemId;
  const inventoryLotId = input.inventoryLotId;
  if (!inventoryItemId || !inventoryLotId) {
    throw new Error('inventory fixture identifiers are required when inventory is enabled');
  }
  await pool.query(
    `INSERT INTO inventory_items (
       id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
       unit_cost_amount, charge_unit_price_amount
     ) VALUES ($1, $2, $3, 'Clinical financial supply', 'unit', $4, 1, $5, $6)`,
    [
      inventoryItemId,
      input.accountId,
      `SKU-${inventoryItemId.slice(-12)}`,
      initialStock,
      inventoryUnitCost,
      inventoryChargePrice
    ]
  );
  await pool.query(
    `INSERT INTO inventory_lots (
       id, account_id, inventory_item_id, lot_number, quantity, reserved_quantity,
       unit, location, supplier, expiry_date, status
     ) VALUES ($1, $2, $3, $4, $5, 0, 'unit', 'Ala A', 'Clinical financial supplier',
       '2028-12-31T00:00:00.000Z', 'active')`,
    [
      inventoryLotId,
      input.accountId,
      inventoryItemId,
      `LOT-${inventoryLotId.slice(-12)}`,
      initialStock
    ]
  );
}

async function seedCashRegister(): Promise<void> {
  await getTestPool().query(
    `INSERT INTO cash_registers (id, account_id, opened_by_user_id, opening_amount, status)
     VALUES ($1, $2, $3, $4, 'open')`,
    [cashRegisterA, accountA, userA, openingCash]
  );
}

async function prepareClinicalJourney(processHandle: ApiProcess): Promise<void> {
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
        clinicalSummary: 'Paciente clínico estável e em observação.',
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
}

async function assertRuntimeRolePolicy(): Promise<void> {
  const result = await getTestPool().query<{
    readonly roleName: string;
    readonly canLogin: boolean;
    readonly isSuperuser: boolean;
    readonly canCreateDb: boolean;
    readonly canCreateRole: boolean;
    readonly inherits: boolean;
    readonly canReplicate: boolean;
    readonly bypassesRls: boolean;
    readonly hasInstaller: boolean;
    readonly hasApiKeyAuth: boolean;
    readonly hasPixDlqOperator: boolean;
    readonly rolesInsert: boolean;
    readonly usersInsert: boolean;
    readonly inventoryInsert: boolean;
  }>(
    `SELECT runtime_role.rolname AS "roleName",
            runtime_role.rolcanlogin AS "canLogin",
            runtime_role.rolsuper AS "isSuperuser",
            runtime_role.rolcreatedb AS "canCreateDb",
            runtime_role.rolcreaterole AS "canCreateRole",
            runtime_role.rolinherit AS "inherits",
            runtime_role.rolreplication AS "canReplicate",
            runtime_role.rolbypassrls AS "bypassesRls",
            EXISTS (
              SELECT 1
                FROM pg_auth_members membership
                JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
               WHERE membership.member = runtime_role.oid
                 AND granted_role.rolname = 'cvg_installer'
            ) AS "hasInstaller",
            EXISTS (
              SELECT 1
                FROM pg_auth_members membership
                JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
               WHERE membership.member = runtime_role.oid
                 AND granted_role.rolname = 'cvg_api_key_auth'
            ) AS "hasApiKeyAuth",
            EXISTS (
              SELECT 1
                FROM pg_auth_members membership
                JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
               WHERE membership.member = runtime_role.oid
                 AND granted_role.rolname = 'cvg_pix_dlq_operator'
            ) AS "hasPixDlqOperator",
            has_table_privilege(runtime_role.rolname, 'public.roles', 'INSERT') AS "rolesInsert",
            has_table_privilege(runtime_role.rolname, 'public.users', 'INSERT') AS "usersInsert",
            has_table_privilege(runtime_role.rolname, 'public.inventory_consumptions', 'INSERT') AS "inventoryInsert"
       FROM pg_roles AS runtime_role
      WHERE runtime_role.rolname = ANY($1::text[])
      ORDER BY runtime_role.rolname`,
    [[apiRole, workerRole]]
  );

  expect(result.rows).toEqual([
    {
      roleName: apiRole,
      canLogin: true,
      isSuperuser: false,
      canCreateDb: false,
      canCreateRole: false,
      inherits: false,
      canReplicate: false,
      bypassesRls: false,
      hasInstaller: true,
      hasApiKeyAuth: false,
      hasPixDlqOperator: false,
      rolesInsert: true,
      usersInsert: true,
      inventoryInsert: true
    },
    {
      roleName: workerRole,
      canLogin: true,
      isSuperuser: false,
      canCreateDb: false,
      canCreateRole: false,
      inherits: false,
      canReplicate: false,
      bypassesRls: false,
      hasInstaller: false,
      hasApiKeyAuth: false,
      hasPixDlqOperator: false,
      rolesInsert: false,
      usersInsert: false,
      inventoryInsert: true
    }
  ]);
}

async function installBillingPause(): Promise<void> {
  await getTestPool().query(
    `CREATE OR REPLACE FUNCTION public.${quoteIdentifier(triggerFunction)}()
       RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         PERFORM pg_advisory_xact_lock(hashtextextended('${pauseLockName}', 0));
         PERFORM pg_sleep(30);
         RETURN NEW;
       END;
       $$`
  );
  await getTestPool().query(
    `CREATE TRIGGER ${quoteIdentifier(triggerName)}
       AFTER INSERT ON billing_items
       FOR EACH ROW EXECUTE FUNCTION public.${quoteIdentifier(triggerFunction)}()`
  );
}

async function removeBillingPause(): Promise<void> {
  await getTestPool().query(
    `DROP TRIGGER IF EXISTS ${quoteIdentifier(triggerName)} ON billing_items`
  );
  await getTestPool().query(`DROP FUNCTION IF EXISTS public.${quoteIdentifier(triggerFunction)}()`);
}

async function waitForBillingPause(): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await getAdminPool().query<{ readonly pid: number }>(
      `SELECT activity.pid
         FROM pg_stat_activity AS activity
         JOIN pg_locks AS lock ON lock.pid = activity.pid
        WHERE activity.usename = $1
          AND activity.datname = $2
          AND lock.locktype = 'advisory'
          AND lock.granted
          AND lock.classid = ((hashtextextended($3, 0) >> 32) & 4294967295)::oid
          AND lock.objid = (hashtextextended($3, 0) & 4294967295)::oid
          AND lock.objsubid = 1`,
      [apiRole, TEST_DB_NAME, pauseLockName]
    );
    if (result.rows.length > 0) return;
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 25));
  }
  throw new Error('clinical-financial API child did not reach the billing pause trigger');
}

async function assertRolledBackConsumption(consumptionKey: string): Promise<void> {
  const result = await getTestPool().query<{
    readonly consumptions: number;
    readonly billingRecords: number;
    readonly billingItems: number;
    readonly stock: number;
    readonly lotQuantity: number;
    readonly lotReserved: number;
    readonly lotStatus: string;
    readonly movements: number;
    readonly audit: number;
    readonly outbox: number;
    readonly idempotency: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM inventory_consumptions
         WHERE account_id = $1
           AND inventory_item_id = $2
           AND encounter_id = $3::text
           AND patient_id = $4::text
           AND quantity = $5
           AND unit = 'unit'
           AND cost_amount = $6
           AND source_entity_type = 'inpatient_stay'
           AND source_entity_id = $7) AS consumptions,
       (SELECT COUNT(*)::int FROM billing_records
         WHERE account_id = $1 AND encounter_id = $3::uuid) AS "billingRecords",
       (SELECT COUNT(*)::int FROM billing_items
         WHERE account_id = $1
           AND encounter_id = $3::uuid
           AND source_entity_type = 'inventory_consumption') AS "billingItems",
       (SELECT on_hand_quantity::int FROM inventory_items
         WHERE account_id = $1 AND id = $2) AS stock,
       (SELECT quantity::float8 FROM inventory_lots
         WHERE account_id = $1 AND inventory_item_id = $2 AND id = $8) AS "lotQuantity",
       (SELECT reserved_quantity::float8 FROM inventory_lots
         WHERE account_id = $1 AND inventory_item_id = $2 AND id = $8) AS "lotReserved",
       (SELECT status FROM inventory_lots
         WHERE account_id = $1 AND inventory_item_id = $2 AND id = $8) AS "lotStatus",
       (SELECT COUNT(*)::int FROM inventory_stock_movements
         WHERE account_id = $1 AND inventory_item_id = $2) AS movements,
       (SELECT COUNT(*)::int FROM audit_events
         WHERE account_id = $1
           AND ((entity_type = 'inventory-consumption' AND action = 'consume')
             OR (entity_type = 'billing-item' AND action = 'capture_inventory_consumption_charge'))) AS audit,
       (SELECT COUNT(*)::int FROM outbox_events
         WHERE account_id = $1
           AND event_type = 'inventory.consumption.created'
           AND payload->>'encounterId' = $3::text) AS outbox,
       (SELECT COUNT(*)::int FROM idempotency_requests
         WHERE account_id = $1 AND operation = $9 AND idempotency_key = $10) AS idempotency`,
    [
      accountA,
      itemA,
      encounterA,
      patientA,
      consumptionQuantity,
      consumptionQuantity * inventoryUnitCost,
      stayId,
      lotA,
      inventoryOperation,
      consumptionKey
    ]
  );
  expect(result.rows[0]).toEqual({
    consumptions: 0,
    billingRecords: 0,
    billingItems: 0,
    stock: initialStock,
    lotQuantity: initialStock,
    lotReserved: 0,
    lotStatus: 'active',
    movements: 0,
    audit: 0,
    outbox: 0,
    idempotency: 0
  });
}

async function assertTenantBUnchanged(foreignKey: string): Promise<void> {
  const result = await getTestPool().query<{
    readonly stock: number;
    readonly lotQuantity: number;
    readonly consumptions: number;
    readonly movements: number;
    readonly billingItems: number;
    readonly audit: number;
    readonly outbox: number;
    readonly idempotency: number;
  }>(
    `SELECT
       (SELECT on_hand_quantity::float8 FROM inventory_items
         WHERE account_id = $1 AND id = $2) AS stock,
       (SELECT quantity::float8 FROM inventory_lots
         WHERE account_id = $1 AND inventory_item_id = $2 AND id = $3) AS "lotQuantity",
       (SELECT COUNT(*)::int FROM inventory_consumptions
         WHERE account_id = $1 AND inventory_item_id = $2) AS consumptions,
       (SELECT COUNT(*)::int FROM inventory_stock_movements
         WHERE account_id = $1 AND inventory_item_id = $2) AS movements,
       (SELECT COUNT(*)::int FROM billing_items
         WHERE account_id = $1 AND source_entity_type = 'inventory_consumption') AS "billingItems",
       (SELECT COUNT(*)::int FROM audit_events
         WHERE account_id = $1
           AND ((entity_type = 'inventory-consumption' AND action = 'consume')
             OR (entity_type = 'billing-item' AND action = 'capture_inventory_consumption_charge'))) AS audit,
       (SELECT COUNT(*)::int FROM outbox_events
         WHERE account_id = $1 AND event_type = 'inventory.consumption.created') AS outbox,
       (SELECT COUNT(*)::int FROM idempotency_requests
         WHERE account_id = $1 AND operation = $4 AND idempotency_key = $5) AS idempotency`,
    [accountB, itemB, lotB, inventoryOperation, foreignKey]
  );
  expect(result.rows[0]).toEqual({
    stock: initialStock,
    lotQuantity: initialStock,
    consumptions: 0,
    movements: 0,
    billingItems: 0,
    audit: 0,
    outbox: 0,
    idempotency: 0
  });
}

async function assertReconciled(
  consumptionKey: string,
  dailyChargeId: string,
  receiptId: string,
  receiptKey: string
): Promise<void> {
  const pool = getTestPool();
  const consumptionResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly inventoryItemId: string;
    readonly encounterId: string;
    readonly patientId: string;
    readonly quantity: number;
    readonly unit: string;
    readonly costAmount: number;
    readonly sourceEntityType: string;
    readonly sourceEntityId: string;
    readonly recordedByUserId: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            inventory_item_id AS "inventoryItemId",
            encounter_id AS "encounterId",
            patient_id AS "patientId",
            quantity::float8,
            unit,
            cost_amount::float8 AS "costAmount",
            source_entity_type AS "sourceEntityType",
            source_entity_id AS "sourceEntityId",
            recorded_by_user_id AS "recordedByUserId"
       FROM inventory_consumptions
      WHERE account_id = $1 AND encounter_id = $2::text AND inventory_item_id = $3`,
    [accountA, encounterA, itemA]
  );
  expect(consumptionResult.rows).toHaveLength(1);
  const consumption = consumptionResult.rows[0];
  if (!consumption) throw new Error('reconciled inventory consumption row is missing');
  expect(consumption).toMatchObject({
    accountId: accountA,
    inventoryItemId: itemA,
    encounterId: encounterA,
    patientId: patientA,
    quantity: consumptionQuantity,
    unit: 'unit',
    costAmount: consumptionQuantity * inventoryUnitCost,
    sourceEntityType: 'inpatient_stay',
    sourceEntityId: stayId,
    recordedByUserId: userA
  });

  const itemResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly unit: string;
    readonly onHandQuantity: number;
    readonly unitCostAmount: number;
    readonly chargeUnitPriceAmount: number;
  }>(
    `SELECT id,
            account_id AS "accountId",
            unit,
            on_hand_quantity::float8 AS "onHandQuantity",
            unit_cost_amount::float8 AS "unitCostAmount",
            charge_unit_price_amount::float8 AS "chargeUnitPriceAmount"
       FROM inventory_items
      WHERE account_id = $1 AND id = $2`,
    [accountA, itemA]
  );
  expect(itemResult.rows).toEqual([
    {
      id: itemA,
      accountId: accountA,
      unit: 'unit',
      onHandQuantity: remainingStock,
      unitCostAmount: inventoryUnitCost,
      chargeUnitPriceAmount: inventoryChargePrice
    }
  ]);

  const lotResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly inventoryItemId: string;
    readonly quantity: number;
    readonly reservedQuantity: number;
    readonly unit: string;
    readonly status: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            inventory_item_id AS "inventoryItemId",
            quantity::float8,
            reserved_quantity::float8 AS "reservedQuantity",
            unit,
            status
       FROM inventory_lots
      WHERE account_id = $1 AND inventory_item_id = $2 AND id = $3`,
    [accountA, itemA, lotA]
  );
  expect(lotResult.rows).toEqual([
    {
      id: lotA,
      accountId: accountA,
      inventoryItemId: itemA,
      quantity: remainingStock,
      reservedQuantity: 0,
      unit: 'unit',
      status: 'active'
    }
  ]);

  const movementResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly inventoryItemId: string;
    readonly movementType: string;
    readonly quantityDelta: number;
    readonly balanceBefore: number;
    readonly balanceAfter: number;
    readonly unitCostAmount: number;
    readonly reason: string;
    readonly reference: string;
    readonly recordedByUserId: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            inventory_item_id AS "inventoryItemId",
            movement_type AS "movementType",
            quantity_delta::float8 AS "quantityDelta",
            balance_before::float8 AS "balanceBefore",
            balance_after::float8 AS "balanceAfter",
            unit_cost_amount::float8 AS "unitCostAmount",
            reason,
            reference,
            recorded_by_user_id AS "recordedByUserId"
       FROM inventory_stock_movements
      WHERE account_id = $1 AND inventory_item_id = $2
      ORDER BY created_at, id`,
    [accountA, itemA]
  );
  expect(movementResult.rows).toHaveLength(1);
  const movement = movementResult.rows[0];
  if (!movement) throw new Error('reconciled inventory movement row is missing');
  expect(movement).toMatchObject({
    accountId: accountA,
    inventoryItemId: itemA,
    movementType: 'consumption',
    quantityDelta: -consumptionQuantity,
    balanceBefore: initialStock,
    balanceAfter: remainingStock,
    unitCostAmount: inventoryUnitCost,
    reason: 'Consumo assistencial inpatient_stay',
    reference: stayId,
    recordedByUserId: userA
  });

  const inventoryBillingItemResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly billingRecordId: string;
    readonly encounterId: string;
    readonly itemType: string;
    readonly description: string;
    readonly quantity: number;
    readonly unitPriceAmount: number;
    readonly totalAmount: number;
    readonly sourceEntityType: string;
    readonly sourceEntityId: string;
    readonly createdByUserId: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            billing_record_id AS "billingRecordId",
            encounter_id AS "encounterId",
            item_type AS "itemType",
            description,
            quantity::float8,
            unit_price_amount::float8 AS "unitPriceAmount",
            total_amount::float8 AS "totalAmount",
            source_entity_type AS "sourceEntityType",
            source_entity_id AS "sourceEntityId",
            created_by_user_id AS "createdByUserId"
       FROM billing_items
      WHERE account_id = $1
        AND encounter_id = $2::uuid
        AND source_entity_type = 'inventory_consumption'
        AND source_entity_id = $3`,
    [accountA, encounterA, consumption.id]
  );
  expect(inventoryBillingItemResult.rows).toHaveLength(1);
  const inventoryBillingItem = inventoryBillingItemResult.rows[0];
  if (!inventoryBillingItem) throw new Error('reconciled inventory billing item is missing');
  expect(inventoryBillingItem).toMatchObject({
    accountId: accountA,
    encounterId: encounterA,
    itemType: 'supply',
    description: 'Consumo de Clinical financial supply na internacao',
    quantity: consumptionQuantity,
    unitPriceAmount: inventoryChargePrice,
    totalAmount: amountInventory,
    sourceEntityType: 'inventory_consumption',
    sourceEntityId: consumption.id,
    createdByUserId: userA
  });

  const dailyResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly stayId: string;
    readonly encounterId: string;
    readonly patientId: string;
    readonly description: string;
    readonly quantity: number;
    readonly unitAmount: number;
    readonly totalAmount: number;
    readonly status: string;
    readonly billingRecordId: string;
    readonly createdByUserId: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            stay_id AS "stayId",
            encounter_id AS "encounterId",
            patient_id AS "patientId",
            description,
            quantity::float8,
            unit_amount::float8 AS "unitAmount",
            total_amount::float8 AS "totalAmount",
            status,
            billing_record_id AS "billingRecordId",
            created_by_user_id AS "createdByUserId"
       FROM inpatient_daily_charges
      WHERE account_id = $1 AND id = $2 AND stay_id = $3 AND encounter_id = $4`,
    [accountA, dailyChargeId, stayId, encounterA]
  );
  expect(dailyResult.rows).toEqual([
    {
      id: dailyChargeId,
      accountId: accountA,
      stayId,
      encounterId: encounterA,
      patientId: patientA,
      description: 'Diária pós-restart do processo filho',
      quantity: 1,
      unitAmount: amountDaily,
      totalAmount: amountDaily,
      status: 'billed',
      billingRecordId: expect.any(String),
      createdByUserId: userA
    }
  ]);
  const daily = dailyResult.rows[0];
  if (!daily) throw new Error('reconciled daily charge row is missing');
  const billingRecordId = daily.billingRecordId;
  expect(billingRecordId).toBe(inventoryBillingItem.billingRecordId);

  const billingRecordResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly encounterId: string;
    readonly patientId: string;
    readonly ownerId: string;
    readonly status: string;
    readonly subtotalAmount: number;
    readonly currency: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            encounter_id AS "encounterId",
            patient_id AS "patientId",
            owner_id AS "ownerId",
            status,
            subtotal_amount::float8 AS "subtotalAmount",
            currency
       FROM billing_records
      WHERE account_id = $1 AND encounter_id = $2::uuid`,
    [accountA, encounterA]
  );
  expect(billingRecordResult.rows).toEqual([
    {
      id: billingRecordId,
      accountId: accountA,
      encounterId: encounterA,
      patientId: patientA,
      ownerId: ownerA,
      status: 'settled',
      subtotalAmount: amountTotal,
      currency: 'BRL'
    }
  ]);

  const billingItemsResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly billingRecordId: string;
    readonly encounterId: string;
    readonly itemType: string;
    readonly description: string;
    readonly quantity: number;
    readonly unitPriceAmount: number;
    readonly totalAmount: number;
    readonly sourceEntityType: string;
    readonly sourceEntityId: string;
    readonly createdByUserId: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            billing_record_id AS "billingRecordId",
            encounter_id AS "encounterId",
            item_type AS "itemType",
            description,
            quantity::float8,
            unit_price_amount::float8 AS "unitPriceAmount",
            total_amount::float8 AS "totalAmount",
            source_entity_type AS "sourceEntityType",
            source_entity_id AS "sourceEntityId",
            created_by_user_id AS "createdByUserId"
       FROM billing_items
      WHERE account_id = $1 AND billing_record_id = $2 AND encounter_id = $3::uuid
      ORDER BY source_entity_type, id`,
    [accountA, billingRecordId, encounterA]
  );
  expect(billingItemsResult.rows).toEqual([
    {
      id: expect.any(String),
      accountId: accountA,
      billingRecordId,
      encounterId: encounterA,
      itemType: 'daily_rate',
      description: 'Diária pós-restart do processo filho',
      quantity: 1,
      unitPriceAmount: amountDaily,
      totalAmount: amountDaily,
      sourceEntityType: 'inpatient_daily_charge',
      sourceEntityId: dailyChargeId,
      createdByUserId: userA
    },
    {
      id: inventoryBillingItem.id,
      accountId: accountA,
      billingRecordId,
      encounterId: encounterA,
      itemType: 'supply',
      description: 'Consumo de Clinical financial supply na internacao',
      quantity: consumptionQuantity,
      unitPriceAmount: inventoryChargePrice,
      totalAmount: amountInventory,
      sourceEntityType: 'inventory_consumption',
      sourceEntityId: consumption.id,
      createdByUserId: userA
    }
  ]);
  const dailyBillingItem = billingItemsResult.rows[0];
  if (!dailyBillingItem) throw new Error('reconciled daily billing item is missing');

  const financialAccountResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly encounterId: string;
    readonly financialStatus: string;
    readonly subtotalSnapshot: number;
    readonly discountTotalSnapshot: number;
    readonly totalSnapshot: number;
    readonly paidAmount: number;
    readonly balanceDue: number;
    readonly closedByUserId: string;
    readonly closedAtPresent: boolean;
    readonly snapshotJson: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            encounter_id AS "encounterId",
            financial_status AS "financialStatus",
            subtotal_snapshot::float8 AS "subtotalSnapshot",
            discount_total_snapshot::float8 AS "discountTotalSnapshot",
            total_snapshot::float8 AS "totalSnapshot",
            paid_amount::float8 AS "paidAmount",
            balance_due::float8 AS "balanceDue",
            closed_by_user_id AS "closedByUserId",
            (closed_at IS NOT NULL) AS "closedAtPresent",
            snapshot_json AS "snapshotJson"
       FROM encounter_financial_accounts
      WHERE account_id = $1 AND encounter_id = $2::uuid`,
    [accountA, encounterA]
  );
  expect(financialAccountResult.rows).toHaveLength(1);
  const financialAccount = financialAccountResult.rows[0];
  if (!financialAccount) throw new Error('reconciled financial account is missing');
  expect(financialAccount).toEqual({
    id: expect.any(String),
    accountId: accountA,
    encounterId: encounterA,
    financialStatus: 'paid',
    subtotalSnapshot: amountTotal,
    discountTotalSnapshot: 0,
    totalSnapshot: amountTotal,
    paidAmount: amountTotal,
    balanceDue: 0,
    closedByUserId: userA,
    closedAtPresent: true,
    snapshotJson: JSON.stringify({ source: 'encounter_cash_receipt', capturedAmount: amountTotal })
  });

  const receivableResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly encounterId: string;
    readonly financialAccountId: string;
    readonly installmentNumber: number;
    readonly status: string;
    readonly amountOriginal: number;
    readonly amountPaid: number;
    readonly amountOutstanding: number;
    readonly settledAtPresent: boolean;
  }>(
    `SELECT id,
            account_id AS "accountId",
            encounter_id AS "encounterId",
            financial_account_id AS "financialAccountId",
            installment_number AS "installmentNumber",
            status,
            amount_original::float8 AS "amountOriginal",
            amount_paid::float8 AS "amountPaid",
            amount_outstanding::float8 AS "amountOutstanding",
            (settled_at IS NOT NULL) AS "settledAtPresent"
       FROM encounter_receivables
      WHERE account_id = $1 AND encounter_id = $2::uuid`,
    [accountA, encounterA]
  );
  expect(receivableResult.rows).toHaveLength(1);
  const receivable = receivableResult.rows[0];
  if (!receivable) throw new Error('reconciled receivable is missing');
  expect(receivable).toEqual({
    id: expect.any(String),
    accountId: accountA,
    encounterId: encounterA,
    financialAccountId: financialAccount.id,
    installmentNumber: 1,
    status: 'settled',
    amountOriginal: amountTotal,
    amountPaid: amountTotal,
    amountOutstanding: 0,
    settledAtPresent: true
  });
  expect(receivable.financialAccountId).toBe(financialAccount.id);

  const receiptResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly encounterId: string;
    readonly billingRecordId: string;
    readonly financialAccountId: string;
    readonly receivableId: string;
    readonly receivablePaymentId: string;
    readonly cashRegisterId: string;
    readonly cashMovementId: string;
    readonly journalEntryId: string;
    readonly receivedByUserId: string;
    readonly amount: number;
    readonly currency: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            encounter_id AS "encounterId",
            billing_record_id AS "billingRecordId",
            financial_account_id AS "financialAccountId",
            receivable_id AS "receivableId",
            receivable_payment_id AS "receivablePaymentId",
            cash_register_id AS "cashRegisterId",
            cash_movement_id AS "cashMovementId",
            journal_entry_id AS "journalEntryId",
            received_by_user_id AS "receivedByUserId",
            amount::float8,
            currency
       FROM encounter_cash_receipts
      WHERE account_id = $1 AND encounter_id = $2::uuid`,
    [accountA, encounterA]
  );
  expect(receiptResult.rows).toHaveLength(1);
  const receipt = receiptResult.rows[0];
  if (!receipt) throw new Error('reconciled cash receipt is missing');
  expect(receipt).toMatchObject({
    id: receiptId,
    accountId: accountA,
    encounterId: encounterA,
    billingRecordId,
    financialAccountId: financialAccount.id,
    receivableId: receivable.id,
    cashRegisterId: cashRegisterA,
    receivedByUserId: userA,
    amount: amountTotal,
    currency: 'BRL'
  });

  const paymentResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly encounterId: string;
    readonly financialAccountId: string;
    readonly receivableId: string;
    readonly amountPaid: number;
    readonly paidByUserId: string;
    readonly externalReferenceType: string;
    readonly externalReferenceId: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            encounter_id AS "encounterId",
            financial_account_id AS "financialAccountId",
            receivable_id AS "receivableId",
            amount_paid::float8 AS "amountPaid",
            paid_by_user_id AS "paidByUserId",
            external_reference_type AS "externalReferenceType",
            external_reference_id AS "externalReferenceId"
       FROM encounter_receivable_payments
      WHERE account_id = $1 AND encounter_id = $2::uuid`,
    [accountA, encounterA]
  );
  expect(paymentResult.rows).toEqual([
    {
      id: receipt.receivablePaymentId,
      accountId: accountA,
      encounterId: encounterA,
      financialAccountId: financialAccount.id,
      receivableId: receivable.id,
      amountPaid: amountTotal,
      paidByUserId: userA,
      externalReferenceType: 'cash_movement',
      externalReferenceId: receipt.cashMovementId
    }
  ]);

  const cashMovementResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly cashRegisterId: string;
    readonly movementType: string;
    readonly amount: number;
    readonly runningBalance: number;
    readonly reference: string;
    readonly createdByUserId: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            cash_register_id AS "cashRegisterId",
            movement_type AS "movementType",
            amount::float8,
            running_balance::float8 AS "runningBalance",
            reference,
            created_by_user_id AS "createdByUserId"
       FROM cash_movements
      WHERE account_id = $1 AND cash_register_id = $2 AND movement_type = 'payment'`,
    [accountA, cashRegisterA]
  );
  expect(cashMovementResult.rows).toEqual([
    {
      id: receipt.cashMovementId,
      accountId: accountA,
      cashRegisterId: cashRegisterA,
      movementType: 'payment',
      amount: amountTotal,
      runningBalance: expectedCashBalance,
      reference: `encounter_cash_receipt:${receiptId}`,
      createdByUserId: userA
    }
  ]);

  const journalEntryResult = await pool.query<{
    readonly id: string;
    readonly accountId: string;
    readonly sourceType: string;
    readonly sourceId: string;
    readonly description: string;
    readonly createdByUserId: string;
  }>(
    `SELECT id,
            account_id AS "accountId",
            source_type AS "sourceType",
            source_id AS "sourceId",
            description,
            created_by_user_id AS "createdByUserId"
       FROM financial_journal_entries
      WHERE account_id = $1 AND source_type = 'encounter_cash_receipt'`,
    [accountA]
  );
  expect(journalEntryResult.rows).toEqual([
    {
      id: receipt.journalEntryId,
      accountId: accountA,
      sourceType: 'encounter_cash_receipt',
      sourceId: receiptId,
      description: `Recebimento integral em dinheiro do atendimento ${encounterA}`,
      createdByUserId: userA
    }
  ]);

  const journalLinesResult = await pool.query<{
    readonly accountId: string;
    readonly entryId: string;
    readonly accountCode: string;
    readonly debit: number;
    readonly credit: number;
    readonly memo: string;
  }>(
    `SELECT account_id AS "accountId",
            entry_id AS "entryId",
            account_code AS "accountCode",
            debit::float8,
            credit::float8,
            memo
       FROM financial_journal_lines
      WHERE account_id = $1 AND entry_id = $2
      ORDER BY account_code`,
    [accountA, receipt.journalEntryId]
  );
  expect(journalLinesResult.rows).toEqual([
    {
      accountId: accountA,
      entryId: receipt.journalEntryId,
      accountCode: '1.1.01-caixa',
      debit: amountTotal,
      credit: 0,
      memo: `Receipt ${receiptId}`
    },
    {
      accountId: accountA,
      entryId: receipt.journalEntryId,
      accountCode: '3.1.01-receita-clinica',
      debit: 0,
      credit: amountTotal,
      memo: `Receipt ${receiptId}`
    }
  ]);

  const lifecycleResult = await pool.query<{
    readonly encounterId: string;
    readonly encounterAccountId: string;
    readonly patientId: string;
    readonly ownerId: string;
    readonly encounterStatus: string;
    readonly closeReason: string;
    readonly closedAtPresent: boolean;
    readonly stayId: string;
    readonly stayAccountId: string;
    readonly stayEncounterId: string;
    readonly stayPatientId: string;
    readonly stayOwnerId: string;
    readonly stayStatus: string;
    readonly dischargedAtPresent: boolean;
  }>(
    `SELECT encounter.id AS "encounterId",
            encounter.account_id AS "encounterAccountId",
            encounter.patient_id AS "patientId",
            encounter.owner_id AS "ownerId",
            encounter.status AS "encounterStatus",
            encounter.close_reason AS "closeReason",
            (encounter.closed_at IS NOT NULL) AS "closedAtPresent",
            stay.id AS "stayId",
            stay.account_id AS "stayAccountId",
            stay.encounter_id AS "stayEncounterId",
            stay.patient_id AS "stayPatientId",
            stay.owner_id AS "stayOwnerId",
            stay.status AS "stayStatus",
            (stay.discharged_at IS NOT NULL) AS "dischargedAtPresent"
       FROM encounters AS encounter
       JOIN inpatient_stays AS stay
         ON stay.account_id = encounter.account_id AND stay.encounter_id = encounter.id
      WHERE encounter.account_id = $1
        AND encounter.id = $2::uuid
        AND stay.id = $3::uuid`,
    [accountA, encounterA, stayId]
  );
  expect(lifecycleResult.rows).toEqual([
    {
      encounterId: encounterA,
      encounterAccountId: accountA,
      patientId: patientA,
      ownerId: ownerA,
      encounterStatus: 'closed',
      closeReason: 'Alta pós-restart do processo filho',
      closedAtPresent: true,
      stayId,
      stayAccountId: accountA,
      stayEncounterId: encounterA,
      stayPatientId: patientA,
      stayOwnerId: ownerA,
      stayStatus: 'discharged',
      dischargedAtPresent: true
    }
  ]);

  const idempotencyResult = await pool.query<{
    readonly operation: string;
    readonly idempotencyKey: string;
    readonly status: string;
    readonly requestHash: string;
    readonly responseBody: Record<string, unknown>;
  }>(
    `SELECT operation,
            idempotency_key AS "idempotencyKey",
            status,
            request_hash AS "requestHash",
            response_body AS "responseBody"
       FROM idempotency_requests
      WHERE account_id = $1
        AND ((operation = $2 AND idempotency_key = $3)
          OR (operation = $4 AND idempotency_key = $5))
      ORDER BY operation`,
    [accountA, inventoryOperation, consumptionKey, receiptOperation, receiptKey]
  );
  expect(idempotencyResult.rows).toHaveLength(2);
  const consumptionIdempotency = idempotencyResult.rows.find(
    (row) => row.operation === inventoryOperation
  );
  const receiptIdempotency = idempotencyResult.rows.find(
    (row) => row.operation === receiptOperation
  );
  if (!consumptionIdempotency) throw new Error('reconciled consumption idempotency row is missing');
  if (!receiptIdempotency) throw new Error('reconciled receipt idempotency row is missing');
  const persistedConsumptionResponse = decodeIdempotencyResponse(
    consumptionIdempotency.responseBody
  );
  expect(consumptionIdempotency).toMatchObject({
    operation: inventoryOperation,
    idempotencyKey: consumptionKey,
    status: 'completed',
    requestHash: expect.any(String)
  });
  expect(persistedConsumptionResponse).toMatchObject({
    id: consumption.id,
    accountId: accountA,
    inventoryItemId: itemA,
    encounterId: encounterA,
    patientId: patientA,
    quantity: consumptionQuantity,
    unit: 'unit',
    costAmount: consumptionQuantity * inventoryUnitCost,
    sourceEntityType: 'inpatient_stay',
    sourceEntityId: stayId,
    recordedByUserId: userA,
    createdAt: expect.any(String)
  });
  const persistedReceiptResponse = decodeIdempotencyResponse(receiptIdempotency.responseBody);
  expect(receiptIdempotency).toMatchObject({
    operation: receiptOperation,
    idempotencyKey: receiptKey,
    status: 'completed',
    requestHash: expect.any(String)
  });
  expect(persistedReceiptResponse).toMatchObject({
    id: receiptId,
    accountId: accountA,
    encounterId: encounterA,
    billingRecordId,
    financialAccountId: financialAccount.id,
    receivableId: receivable.id,
    receivablePaymentId: receipt.receivablePaymentId,
    cashRegisterId: cashRegisterA,
    cashMovementId: receipt.cashMovementId,
    journalEntryId: receipt.journalEntryId,
    amount: amountTotal,
    currency: 'BRL',
    receivedByUserId: userA,
    receivedAt: expect.any(String)
  });

  const auditResult = await pool.query<{
    readonly accountId: string;
    readonly actorUserId: string;
    readonly entityType: string;
    readonly entityId: string;
    readonly action: string;
    readonly metadata: Record<string, unknown>;
  }>(
    `SELECT account_id AS "accountId",
            actor_user_id AS "actorUserId",
            entity_type AS "entityType",
            entity_id AS "entityId",
            action,
            metadata
       FROM audit_events
      WHERE account_id = $1
        AND ((entity_type = 'inventory-consumption' AND entity_id = $2 AND action = 'consume')
          OR (entity_type = 'billing-item' AND entity_id = $3 AND action = 'capture_inventory_consumption_charge')
          OR (entity_type = 'inpatient-stay' AND entity_id = $4 AND action = 'create_daily_charge')
          OR (entity_type = 'inpatient-daily-charge' AND entity_id = $5 AND action = 'bill_daily_charge')
          OR (entity_type = 'encounter' AND entity_id = $6 AND action = 'close')
          OR (entity_type = 'encounter_cash_receipt' AND entity_id = $7 AND action = 'cash_received'))`,
    [
      accountA,
      consumption.id,
      inventoryBillingItem.id,
      stayId,
      dailyChargeId,
      encounterA,
      receiptId
    ]
  );
  expect(auditResult.rows).toHaveLength(6);
  const audits = new Map(
    auditResult.rows.map((row) => [`${row.entityType}:${row.action}:${row.entityId}`, row])
  );
  expect(audits.get(`inventory-consumption:consume:${consumption.id}`)).toMatchObject({
    accountId: accountA,
    actorUserId: userA,
    metadata: {
      module: 'inventory',
      payloadSummary: `Inventory consumption recorded for item ${itemA}`,
      riskLevel: 'high'
    }
  });
  expect(
    audits.get(`billing-item:capture_inventory_consumption_charge:${inventoryBillingItem.id}`)
  ).toMatchObject({
    accountId: accountA,
    actorUserId: userA,
    metadata: {
      module: 'billing',
      payloadSummary: `Billing item ${inventoryBillingItem.id} captured from inventory consumption ${consumption.id}`,
      riskLevel: 'high'
    }
  });
  expect(audits.get(`inpatient-stay:create_daily_charge:${stayId}`)).toMatchObject({
    accountId: accountA,
    actorUserId: userA,
    metadata: {
      module: 'inpatient',
      payloadSummary: 'Inpatient daily charge created: Diária pós-restart do processo filho',
      riskLevel: 'medium'
    }
  });
  expect(audits.get(`inpatient-daily-charge:bill_daily_charge:${dailyChargeId}`)).toMatchObject({
    accountId: accountA,
    actorUserId: userA,
    metadata: {
      module: 'inpatient',
      payloadSummary: 'Inpatient daily charge billed',
      riskLevel: 'high'
    }
  });
  expect(audits.get(`encounter:close:${encounterA}`)).toMatchObject({
    accountId: accountA,
    actorUserId: userA,
    metadata: {
      module: 'encounters',
      payloadSummary: 'Encounter closed: Alta pós-restart do processo filho',
      riskLevel: 'high'
    }
  });
  expect(audits.get(`encounter_cash_receipt:cash_received:${receiptId}`)).toEqual(
    expect.objectContaining({
      accountId: accountA,
      actorUserId: userA,
      metadata: {
        encounterId: encounterA,
        billingRecordId,
        cashRegisterId: cashRegisterA,
        amount: amountTotal,
        currency: 'BRL'
      }
    })
  );

  const outboxResult = await pool.query<{
    readonly accountId: string;
    readonly moduleName: string;
    readonly eventType: string;
    readonly payload: Record<string, unknown>;
  }>(
    `SELECT account_id AS "accountId",
            module_name AS "moduleName",
            event_type AS "eventType",
            payload
       FROM outbox_events
      WHERE account_id = $1
        AND ((event_type = 'inventory.consumption.created' AND payload->>'consumptionId' = $2)
          OR (event_type = 'encounter.cash-receipt.created' AND payload->>'receiptId' = $3)
          OR (event_type = 'encounter.closed' AND payload->>'encounterId' = $4))`,
    [accountA, consumption.id, receiptId, encounterA]
  );
  expect(outboxResult.rows).toHaveLength(3);
  const outboxByType = new Map(outboxResult.rows.map((row) => [row.eventType, row]));
  expect(outboxByType.get('inventory.consumption.created')).toMatchObject({
    accountId: accountA,
    moduleName: 'inventory',
    payload: {
      accountId: accountA,
      _meta: { accountId: accountA },
      consumptionId: consumption.id,
      inventoryItemId: itemA,
      encounterId: encounterA,
      patientId: patientA,
      quantity: consumptionQuantity,
      unit: 'unit',
      costAmount: consumptionQuantity * inventoryUnitCost,
      sourceEntityType: 'inpatient_stay',
      sourceEntityId: stayId,
      billingItemId: inventoryBillingItem.id
    }
  });
  expect(outboxByType.get('encounter.cash-receipt.created')).toMatchObject({
    accountId: accountA,
    moduleName: 'financial',
    payload: {
      accountId: accountA,
      _meta: { accountId: accountA },
      receiptId,
      encounterId: encounterA,
      billingRecordId,
      financialAccountId: financialAccount.id,
      receivableId: receivable.id,
      receivablePaymentId: receipt.receivablePaymentId,
      cashRegisterId: cashRegisterA,
      cashMovementId: receipt.cashMovementId,
      journalEntryId: receipt.journalEntryId,
      amount: amountTotal,
      currency: 'BRL'
    }
  });
  expect(outboxByType.get('encounter.closed')).toMatchObject({
    accountId: accountA,
    moduleName: 'encounters',
    payload: {
      accountId: accountA,
      _meta: { accountId: accountA },
      encounterId: encounterA,
      patientId: patientA,
      ownerId: ownerA,
      closeReason: 'Alta pós-restart do processo filho',
      status: 'closed',
      closedAt: expect.any(String)
    }
  });
}

async function completeFinancialJourney(processHandle: ApiProcess): Promise<FinancialJourneyIds> {
  const daily = await requestJson<DailyChargeResponse>(
    processHandle,
    `/inpatient/${stayId}/daily-charges`,
    {
      method: 'POST',
      headers: headersA(),
      body: JSON.stringify({
        description: 'Diária pós-restart do processo filho',
        quantity: 1,
        unitAmount: amountDaily
      })
    }
  );
  expect(daily.status).toBe(201);
  const dailyChargeId = daily.body?.id;
  if (!dailyChargeId) throw new Error('clinical-financial daily charge response omitted its id');
  const billed = await requestJson<DailyChargeResponse>(
    processHandle,
    `/inpatient/${stayId}/daily-charges/${dailyChargeId}/bill`,
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
  expect(opened.body?.status).toBe('open');

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
      body: JSON.stringify({ closeReason: 'Alta pós-restart do processo filho' })
    }
  );
  expect(closed.status).toBe(200);
  expect(closed.body?.status).toBe('closed');

  const receiptKey = randomUUID();
  const receipt = await requestJson<ReceiptResponse>(
    processHandle,
    `/encounters/${encounterA}/cash-receipts`,
    {
      method: 'POST',
      headers: { ...headersA(), 'idempotency-key': receiptKey },
      body: JSON.stringify({ cashRegisterId: cashRegisterA, expectedAmount: amountTotal })
    }
  );
  expect(receipt.status).toBe(201);
  expect(receipt.body?.amount).toBe(amountTotal);
  const receiptId = receipt.body?.id;
  if (!receiptId) throw new Error('clinical-financial cash receipt response omitted its id');
  const replay = await requestJson<ReceiptResponse>(
    processHandle,
    `/encounters/${encounterA}/cash-receipts`,
    {
      method: 'POST',
      headers: { ...headersA(), 'idempotency-key': receiptKey },
      body: JSON.stringify({ cashRegisterId: cashRegisterA, expectedAmount: amountTotal })
    }
  );
  expect(replay.status).toBe(201);
  expect(replay.body).toEqual(receipt.body);
  return { dailyChargeId, receiptId, receiptKey };
}

interface CleanupAction {
  readonly label: string;
  readonly run: () => Promise<void>;
}

async function stopPrimaryForCleanup(): Promise<void> {
  const processHandle = primary;
  if (!processHandle) return;
  await stopApi(processHandle, 'SIGKILL');
  primary = undefined;
}

async function cleanupRuntimeRole(role: string): Promise<void> {
  const pool = getTestPool();
  const result = await pool.query<{ readonly exists: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists',
    [role]
  );
  if (!result.rows[0]?.exists) return;
  await pool.query(`REASSIGN OWNED BY ${quoteIdentifier(role)} TO CURRENT_USER`);
  await pool.query(`DROP OWNED BY ${quoteIdentifier(role)}`);
}

async function dropRuntimeRole(role: string): Promise<void> {
  const adminPool = getAdminPool();
  const result = await adminPool.query<{ readonly exists: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists',
    [role]
  );
  if (!result.rows[0]?.exists) return;
  await adminPool.query(`REVOKE cvg_installer FROM ${quoteIdentifier(role)}`);
  await adminPool.query(`DROP ROLE ${quoteIdentifier(role)}`);
}

async function runCleanupActions(actions: readonly CleanupAction[]): Promise<void> {
  const errors: Error[] = [];
  for (const action of actions) {
    try {
      await action.run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(new Error(`${action.label}: ${message}`));
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'clinical-financial child-process cleanup failed');
  }
}

beforeAll(async () => {
  if (!TEST_DB_IS_EPHEMERAL) {
    throw new Error(
      `[clinical-financial-child-process] requires an ephemeral test database; unset DATABASE_URL/DATABASE_URL_TEST or set TEST_DB_EPHEMERAL=1 (db=${TEST_DB_NAME})`
    );
  }
  await createLoginRole(apiRole);
  await createLoginRole(workerRole);
  const client = await getTestPool().connect();
  try {
    await reconcileRuntimeRoles(client, { apiRole, workerRole });
  } finally {
    client.release();
  }
  await assertRuntimeRolePolicy();
  await seedTenant({
    tenantId: tenantA,
    accountId: accountA,
    userId: userA,
    ownerId: ownerA,
    patientId: patientA,
    encounterId: encounterA,
    username: usernameA,
    includeInventory: true,
    inventoryItemId: itemA,
    inventoryLotId: lotA
  });
  await seedTenant({
    tenantId: tenantB,
    accountId: accountB,
    userId: userB,
    ownerId: ownerB,
    patientId: patientB,
    encounterId: encounterB,
    username: usernameB,
    includeInventory: true,
    inventoryItemId: itemB,
    inventoryLotId: lotB
  });
  await seedCashRegister();
}, 120_000);

afterEach(async () => {
  await runCleanupActions([
    { label: 'stop API child', run: stopPrimaryForCleanup },
    { label: 'remove billing pause', run: removeBillingPause }
  ]);
});

afterAll(async () => {
  await runCleanupActions([
    { label: 'stop API child', run: stopPrimaryForCleanup },
    { label: 'remove billing pause', run: removeBillingPause },
    { label: `cleanup API role ${apiRole}`, run: () => cleanupRuntimeRole(apiRole) },
    { label: `cleanup worker role ${workerRole}`, run: () => cleanupRuntimeRole(workerRole) },
    { label: `drop API role ${apiRole}`, run: () => dropRuntimeRole(apiRole) },
    { label: `drop worker role ${workerRole}`, run: () => dropRuntimeRole(workerRole) }
  ]);
});

describe('inpatient clinical-financial real child-process SIGKILL boundary', () => {
  it('rolls back interrupted clinical consumption, replays after child restart, and completes finance', async () => {
    const firstPort = await reservePort();
    primary = startApi(firstPort);
    await waitForApi(primary);
    accessTokenA = await login(primary, usernameA);
    accessTokenB = await login(primary, usernameB);
    await prepareClinicalJourney(primary);

    const consumptionKey = randomUUID();
    await installBillingPause();
    const firstProcessPid = primary.pid;
    const pendingConsumption = fetch(`${primary.baseUrl}/inventory/consumptions`, {
      method: 'POST',
      headers: { ...headersA(), 'idempotency-key': consumptionKey },
      body: JSON.stringify({
        encounterId: encounterA,
        inventoryItemId: itemA,
        quantity: consumptionQuantity,
        sourceEntityType: 'inpatient_stay',
        sourceEntityId: stayId
      })
    }).then(
      () => ({ completed: true }),
      (error: unknown) => ({ completed: false, error })
    );
    await waitForBillingPause();
    expect(await stopApi(primary, 'SIGKILL')).toEqual({ code: null, signal: 'SIGKILL' });
    primary = undefined;
    const interrupted = await pendingConsumption;
    expect(interrupted.completed).toBe(false);
    await assertRolledBackConsumption(consumptionKey);

    await removeBillingPause();
    const restartPort = await reservePort();
    primary = startApi(restartPort);
    expect(primary.pid).not.toBe(firstProcessPid);
    await waitForApi(primary);
    accessTokenA = await login(primary, usernameA);
    accessTokenB = await login(primary, usernameB);

    const replay = await requestJson<{ readonly id: string; readonly quantity: number }>(
      primary,
      '/inventory/consumptions',
      {
        method: 'POST',
        headers: { ...headersA(), 'idempotency-key': consumptionKey },
        body: JSON.stringify({
          encounterId: encounterA,
          inventoryItemId: itemA,
          quantity: consumptionQuantity,
          sourceEntityType: 'inpatient_stay',
          sourceEntityId: stayId
        })
      }
    );
    expect(replay.status).toBe(201);
    expect(replay.body).toMatchObject({ quantity: consumptionQuantity });

    const replayAgain = await requestJson<{ readonly id: string; readonly quantity: number }>(
      primary,
      '/inventory/consumptions',
      {
        method: 'POST',
        headers: { ...headersA(), 'idempotency-key': consumptionKey },
        body: JSON.stringify({
          encounterId: encounterA,
          inventoryItemId: itemA,
          quantity: consumptionQuantity,
          sourceEntityType: 'inpatient_stay',
          sourceEntityId: stayId
        })
      }
    );
    expect(replayAgain.status).toBe(201);
    expect(replayAgain.body).toEqual(replay.body);
    expect(replayAgain.body?.id).toBe(replay.body?.id);

    const divergent = await requestJson<{ readonly code?: string }>(
      primary,
      '/inventory/consumptions',
      {
        method: 'POST',
        headers: { ...headersA(), 'idempotency-key': consumptionKey },
        body: JSON.stringify({
          encounterId: encounterA,
          inventoryItemId: itemA,
          quantity: 3,
          sourceEntityType: 'inpatient_stay',
          sourceEntityId: stayId
        })
      }
    );
    expect(divergent.status).toBe(409);
    expect(divergent.body?.code).toBe('IDEMPOTENCY_CONFLICT');

    const foreignKey = randomUUID();
    const foreign = await requestJson<{ readonly code?: string }>(
      primary,
      '/inventory/consumptions',
      {
        method: 'POST',
        headers: { ...headersB(), 'idempotency-key': foreignKey },
        body: JSON.stringify({
          encounterId: encounterA,
          inventoryItemId: itemB,
          quantity: consumptionQuantity,
          sourceEntityType: 'inpatient_stay',
          sourceEntityId: stayId
        })
      }
    );
    expect(foreign.status).toBe(404);
    await assertTenantBUnchanged(foreignKey);

    const foreignRead = await requestJson<{ readonly items: readonly unknown[] }>(
      primary,
      `/inventory/consumptions?encounterId=${encodeURIComponent(encounterA)}`,
      { method: 'GET', headers: headersB() }
    );
    expect(foreignRead.status).toBe(200);
    expect(foreignRead.body?.items).toEqual([]);

    const journey = await completeFinancialJourney(primary);
    await assertReconciled(
      consumptionKey,
      journey.dailyChargeId,
      journey.receiptId,
      journey.receiptKey
    );
  }, 120_000);
});
