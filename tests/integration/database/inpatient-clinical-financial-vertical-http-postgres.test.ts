import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setAppState } from '../../../apps/api/src/app-state.js';
import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { getPool } from '../../../packages/shared/database/src/index.js';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

const TENANT_A = randomUUID();
const ACCOUNT_A = randomUUID();
const USER_A = randomUUID();
const OWNER_A = randomUUID();
const PATIENT_A = randomUUID();
const ENCOUNTER_A = randomUUID();
const RACE_ENCOUNTER_A = randomUUID();
const ITEM_A = `vertical-item-${randomUUID()}`;
const LOT_A = `vertical-lot-${randomUUID()}`;
const CASH_REGISTER_A = randomUUID();

const TENANT_B = randomUUID();
const ACCOUNT_B = randomUUID();
const USER_B = randomUUID();
const OWNER_B = randomUUID();
const PATIENT_B = randomUUID();
const ENCOUNTER_B = randomUUID();
const ITEM_B = `vertical-item-${randomUUID()}`;
const LOT_B = `vertical-lot-${randomUUID()}`;

const USERNAME_A = `vertical-a-${USER_A.slice(0, 8)}`;
const USERNAME_B = `vertical-b-${USER_B.slice(0, 8)}`;
const AMOUNT_INVENTORY = 80;
const AMOUNT_DAILY = 180;
const AMOUNT_TOTAL = AMOUNT_INVENTORY + AMOUNT_DAILY;
const ROLLBACK_CONSTRAINT = `vertical_close_rollback_${randomUUID().replaceAll('-', '')}`;

let server: ApiServer | undefined;
let secondaryServer: ApiServer | undefined;
let baseUrl = '';
let secondaryBaseUrl = '';
let accessTokenA = '';
let accessTokenB = '';
let apiDatabaseRole = '';
let workerDatabaseRole = '';
let runtimeRolePassword = '';
let journeyReceiptId = '';

interface LoginResponse {
  readonly accessToken: string;
}

interface JsonResponse<T> {
  readonly status: number;
  readonly body?: T;
  readonly text: string;
}

interface AdmissionResponse {
  readonly id: string;
  readonly encounterId: string;
  readonly accountId: string;
  readonly status: string;
}

interface HandoffResponse {
  readonly id: string;
  readonly encounterId: string;
  readonly handoffStatus: string;
}

interface ConsumptionResponse {
  readonly id: string;
  readonly encounterId: string;
  readonly quantity: number;
}

interface DailyChargeResponse {
  readonly id: string;
  readonly stayId: string;
  readonly status: string;
  readonly billingRecordId?: string;
}

interface DischargeResponse {
  readonly id: string;
  readonly encounterId: string;
  readonly dischargeType: string;
}

interface EncounterResponse {
  readonly id: string;
  readonly status: string;
  readonly closeReason?: string;
}

interface ReceiptResponse {
  readonly id: string;
  readonly encounterId: string;
  readonly amount: number;
  readonly billingRecordId: string;
}

async function requestJsonAt<T>(
  origin: string,
  path: string,
  init: RequestInit = {}
): Promise<JsonResponse<T>> {
  const response = await fetch(`${origin}${path}`, init);
  const text = await response.text();
  return {
    status: response.status,
    body: text.length > 0 ? (JSON.parse(text) as T) : undefined,
    text
  };
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<JsonResponse<T>> {
  return requestJsonAt(baseUrl, path, init);
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
  return headers(accessTokenA, TENANT_A, ACCOUNT_A);
}

function headersB(): HeadersInit {
  return headers(accessTokenB, TENANT_B, ACCOUNT_B);
}

async function seedTenant(input: {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly ownerId: string;
  readonly patientId: string;
  readonly encounterIds: readonly string[];
  readonly itemId: string;
  readonly lotId: string;
  readonly username: string;
  readonly label: string;
  readonly chargeUnitPriceAmount: number;
}): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, $3, 'active')`,
    [input.tenantId, `vertical-${input.tenantId.slice(0, 8)}`, `${input.label} tenant`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, $4)`,
    [
      input.accountId,
      input.tenantId,
      `vertical-${input.accountId.slice(0, 8)}`,
      `${input.label} account`
    ]
  );
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name, is_active
     ) VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', $5, true)`,
    [
      input.userId,
      input.accountId,
      input.username,
      `${input.username}@example.test`,
      `${input.label} operator`
    ]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from the vertical test seed');
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    input.userId,
    role.rows[0].id
  ]);
  await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, $3)`, [
    input.ownerId,
    input.accountId,
    `${input.label} owner`
  ]);
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, $4, 'canine')`,
    [input.patientId, input.accountId, input.ownerId, `${input.label} patient`]
  );
  for (const encounterId of input.encounterIds) {
    await pool.query(
      `INSERT INTO encounters (
         id, account_id, patient_id, owner_id, status, opened_by_user_id, reason
       ) VALUES ($1, $2, $3, $4, 'open', $5, 'Vertical inpatient journey')`,
      [encounterId, input.accountId, input.patientId, input.ownerId, input.userId]
    );
  }
  await pool.query(
    `INSERT INTO inventory_items (
       id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
       unit_cost_amount, charge_unit_price_amount
     ) VALUES ($1, $2, $3, $4, 'unit', 10, 1, 25, $5)`,
    [
      input.itemId,
      input.accountId,
      `SKU-${input.itemId.slice(-12)}`,
      `${input.label} inpatient supply`,
      input.chargeUnitPriceAmount
    ]
  );
  await pool.query(
    `INSERT INTO inventory_lots (
       id, account_id, inventory_item_id, lot_number, quantity, reserved_quantity,
       unit, location, supplier, expiry_date, status
     ) VALUES ($1, $2, $3, $4, 10, 0, 'unit', 'Ala A', 'Vertical supplier',
       '2028-12-31T00:00:00.000Z', 'active')`,
    [input.lotId, input.accountId, input.itemId, `LOT-${input.lotId.slice(-12)}`]
  );
}

async function seedCashRegister(): Promise<void> {
  await getTestPool().query(
    `INSERT INTO cash_registers (
       id, account_id, opened_by_user_id, opening_amount, status
     ) VALUES ($1, $2, $3, 50, 'open')`,
    [CASH_REGISTER_A, ACCOUNT_A, USER_A]
  );
}

async function login(username: string): Promise<string> {
  const response = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'seed_admin' })
  });
  if (response.status !== 200 || !response.body?.accessToken) {
    throw new Error(`Vertical fixture login failed: ${response.status} ${response.text}`);
  }
  return response.body.accessToken;
}

async function admit(
  token: string,
  tenantId: string,
  accountId: string,
  encounterId: string,
  patientId: string,
  idempotencyKey: string
): Promise<JsonResponse<AdmissionResponse>> {
  return requestJson<AdmissionResponse>('/inpatient', {
    method: 'POST',
    headers: {
      ...headers(token, tenantId, accountId),
      'idempotency-key': idempotencyKey
    },
    body: JSON.stringify({
      encounterId,
      patientId,
      unit: 'Internacao clinica',
      ward: 'Ala A',
      bed: 'A-01'
    })
  });
}

async function sendHandoff(): Promise<JsonResponse<HandoffResponse>> {
  return requestJson<HandoffResponse>('/clinical-handoffs/send-to-reception', {
    method: 'POST',
    headers: headersA(),
    body: JSON.stringify({
      encounterId: ENCOUNTER_A,
      clinicalSummary: 'Paciente internado, estável e em observação.',
      receptionInstructions: 'Confirmar itens e valores na alta.',
      priority: 'medium'
    })
  });
}

async function consume(
  idempotencyKey: string,
  quantity = 2
): Promise<JsonResponse<ConsumptionResponse & { readonly code?: string }>> {
  return requestJson<ConsumptionResponse & { readonly code?: string }>('/inventory/consumptions', {
    method: 'POST',
    headers: { ...headersA(), 'idempotency-key': idempotencyKey },
    body: JSON.stringify({
      encounterId: ENCOUNTER_A,
      inventoryItemId: ITEM_A,
      quantity,
      sourceEntityType: 'inpatient_stay',
      sourceEntityId: journeyStayId
    })
  });
}

async function createDailyCharge(): Promise<JsonResponse<DailyChargeResponse>> {
  return requestJson<DailyChargeResponse>(`/inpatient/${journeyStayId}/daily-charges`, {
    method: 'POST',
    headers: headersA(),
    body: JSON.stringify({
      description: 'Diária da internação vertical',
      quantity: 1,
      unitAmount: AMOUNT_DAILY
    })
  });
}

async function billDailyCharge(
  chargeId: string,
  idempotencyKey: string,
  body: Record<string, unknown> = {}
): Promise<JsonResponse<DailyChargeResponse & { readonly code?: string }>> {
  return requestJson<DailyChargeResponse & { readonly code?: string }>(
    `/inpatient/${journeyStayId}/daily-charges/${chargeId}/bill`,
    {
      method: 'POST',
      headers: { ...headersA(), 'idempotency-key': idempotencyKey },
      body: JSON.stringify(body)
    }
  );
}

async function discharge(
  encounterId: string,
  idempotencyKey: string,
  token = accessTokenA,
  tenantId = TENANT_A,
  accountId = ACCOUNT_A
): Promise<JsonResponse<DischargeResponse & { readonly code?: string }>> {
  return requestJson<DischargeResponse & { readonly code?: string }>('/discharges', {
    method: 'POST',
    headers: { ...headers(token, tenantId, accountId), 'idempotency-key': idempotencyKey },
    body: JSON.stringify({ encounterId, dischargeType: 'inpatient' })
  });
}

async function closeEncounter(
  encounterId: string,
  idempotencyKey: string,
  closeReason = 'Alta clínica confirmada',
  origin = baseUrl
): Promise<JsonResponse<EncounterResponse & { readonly code?: string }>> {
  return requestJsonAt<EncounterResponse & { readonly code?: string }>(
    origin,
    `/encounters/${encounterId}/close`,
    {
      method: 'POST',
      headers: { ...headersA(), 'idempotency-key': idempotencyKey },
      body: JSON.stringify({ closeReason })
    }
  );
}

async function receipt(
  idempotencyKey: string,
  expectedAmount = AMOUNT_TOTAL
): Promise<JsonResponse<ReceiptResponse & { readonly code?: string }>> {
  return requestJson<ReceiptResponse & { readonly code?: string }>(
    `/encounters/${ENCOUNTER_A}/cash-receipts`,
    {
      method: 'POST',
      headers: { ...headersA(), 'idempotency-key': idempotencyKey },
      body: JSON.stringify({
        cashRegisterId: CASH_REGISTER_A,
        expectedAmount,
        notes: 'Recebimento da alta hospitalar'
      })
    }
  );
}

let journeyStayId = '';

beforeAll(async () => {
  await seedTenant({
    tenantId: TENANT_A,
    accountId: ACCOUNT_A,
    userId: USER_A,
    ownerId: OWNER_A,
    patientId: PATIENT_A,
    encounterIds: [ENCOUNTER_A, RACE_ENCOUNTER_A],
    itemId: ITEM_A,
    lotId: LOT_A,
    username: USERNAME_A,
    label: 'Vertical A',
    chargeUnitPriceAmount: 40
  });
  await seedTenant({
    tenantId: TENANT_B,
    accountId: ACCOUNT_B,
    userId: USER_B,
    ownerId: OWNER_B,
    patientId: PATIENT_B,
    encounterIds: [ENCOUNTER_B],
    itemId: ITEM_B,
    lotId: LOT_B,
    username: USERNAME_B,
    label: 'Vertical B',
    chargeUnitPriceAmount: 40
  });
  await seedCashRegister();

  const roleSuffix = randomUUID().replaceAll('-', '');
  apiDatabaseRole = `vertical_api_${roleSuffix}`;
  workerDatabaseRole = `vertical_worker_${roleSuffix}`;
  runtimeRolePassword = `vertical-${roleSuffix}`;
  const adminPool = getAdminPool();
  const dbIdentifier = TEST_DB_NAME.replaceAll('"', '""');
  await adminPool.query(
    `CREATE ROLE "${apiDatabaseRole}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
       NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${runtimeRolePassword}'`
  );
  await adminPool.query(
    `CREATE ROLE "${workerDatabaseRole}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
       NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${runtimeRolePassword}'`
  );
  await adminPool.query(
    `GRANT CONNECT ON DATABASE "${dbIdentifier}" TO "${apiDatabaseRole}", "${workerDatabaseRole}"`
  );
  const reconcileClient = await getTestPool().connect();
  try {
    const { reconcileRuntimeRoles } =
      await import('../../../packages/db/src/reconcile-runtime-roles.js');
    await reconcileRuntimeRoles(reconcileClient, {
      apiRole: apiDatabaseRole,
      workerRole: workerDatabaseRole
    });
  } finally {
    reconcileClient.release();
  }

  const runtimeDatabaseUrl = new URL(TEST_DB_URL);
  runtimeDatabaseUrl.username = apiDatabaseRole;
  runtimeDatabaseUrl.password = runtimeRolePassword;

  const bootstrap = await bootstrapServices({
    databaseUrl: runtimeDatabaseUrl.toString(),
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-inpatient-vertical-http-')),
    maxRetries: 10,
    retryDelayMs: 1000
  });
  if (!bootstrap.databaseHealthy || !bootstrap.unitOfWork) {
    throw new Error(`Database/UoW unavailable: ${bootstrap.databaseDetail}`);
  }
  const databaseIdentity = await getPool().query<{
    readonly current_user: string;
    readonly rolbypassrls: boolean;
    readonly rolsuper: boolean;
  }>(
    `SELECT current_user, rolbypassrls, rolsuper
       FROM pg_roles
      WHERE rolname = current_user`
  );
  expect(databaseIdentity.rows).toEqual([
    { current_user: apiDatabaseRole, rolbypassrls: false, rolsuper: false }
  ]);
  const settlementFunctionPrivileges = await getTestPool().query<{
    readonly apiExecute: boolean;
    readonly workerExecute: boolean;
    readonly publicExecute: boolean;
  }>(
    `SELECT
       has_function_privilege($1, 'app.assert_encounter_cash_receipt_consistent(uuid, boolean)', 'EXECUTE') AS "apiExecute",
       has_function_privilege($2, 'app.assert_encounter_cash_receipt_consistent(uuid, boolean)', 'EXECUTE') AS "workerExecute",
       has_function_privilege('public', 'app.assert_encounter_cash_receipt_consistent(uuid, boolean)', 'EXECUTE') AS "publicExecute"`,
    [apiDatabaseRole, workerDatabaseRole]
  );
  expect(settlementFunctionPrivileges.rows[0]).toEqual({
    apiExecute: true,
    workerExecute: true,
    publicExecute: false
  });
  setAppState({
    persistenceMode: 'database',
    databaseConfigured: true,
    databaseHealthy: true,
    databaseDetail: bootstrap.databaseDetail,
    repositoriesReady: true,
    repositoryCount: Object.values(bootstrap.repositories).filter(Boolean).length,
    workerReady: true,
    workerDetail: 'Inpatient clinical-financial vertical HTTP test runtime',
    productionReady: true,
    initialized: true
  });

  const options = {
    environment: 'test' as const,
    version: '0.1.0',
    authSecret: 'inpatient-vertical-http-test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage,
    unitOfWork: bootstrap.unitOfWork,
    preserveSeedUsersWithRepository: false,
    preserveSeedMasterDataWithRepository: false
  };
  server = createApiServer({ appName: 'inpatient-vertical-http-test', ...options });
  await server.ready;
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  secondaryServer = createApiServer({
    appName: 'inpatient-vertical-http-test-secondary',
    ...options
  });
  await secondaryServer.ready;
  await new Promise<void>((resolve) => secondaryServer?.listen(0, '127.0.0.1', () => resolve()));
  secondaryBaseUrl = `http://127.0.0.1:${(secondaryServer.address() as AddressInfo).port}`;

  accessTokenA = await login(USERNAME_A);
  accessTokenB = await login(USERNAME_B);
});

afterAll(async () => {
  await getTestPool().query(
    `ALTER TABLE encounters DROP CONSTRAINT IF EXISTS ${ROLLBACK_CONSTRAINT}`
  );
  if (server?.listening) {
    await new Promise<void>((resolve, reject) =>
      server?.close((error) => (error ? reject(error) : resolve()))
    );
  }
  if (secondaryServer?.listening) {
    await new Promise<void>((resolve, reject) =>
      secondaryServer?.close((error) => (error ? reject(error) : resolve()))
    );
  }
  await shutdownServices();
  if (apiDatabaseRole && workerDatabaseRole) {
    const testPool = getTestPool();
    await testPool
      .query(`REASSIGN OWNED BY "${apiDatabaseRole}" TO CURRENT_USER`)
      .catch(() => undefined);
    await testPool.query(`DROP OWNED BY "${apiDatabaseRole}"`).catch(() => undefined);
    await testPool
      .query(`REASSIGN OWNED BY "${workerDatabaseRole}" TO CURRENT_USER`)
      .catch(() => undefined);
    await testPool.query(`DROP OWNED BY "${workerDatabaseRole}"`).catch(() => undefined);
    const adminPool = getAdminPool();
    await adminPool.query(`REVOKE cvg_installer FROM "${apiDatabaseRole}"`).catch(() => undefined);
    await adminPool.query(`DROP ROLE IF EXISTS "${apiDatabaseRole}"`);
    await adminPool.query(`DROP ROLE IF EXISTS "${workerDatabaseRole}"`);
  }
});

describe('inpatient clinical-financial vertical HTTP PostgreSQL boundary', () => {
  it('runs admission → handoff/stay → consumption → daily charge → discharge → close → receipt', async () => {
    const baseline = await getTestPool().query<{
      readonly billing: number;
      readonly receivables: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM billing_records WHERE account_id = $1 AND encounter_id = $2) AS billing,
         (SELECT COUNT(*)::int FROM encounter_receivables WHERE account_id = $1 AND encounter_id = $2) AS receivables`,
      [ACCOUNT_A, ENCOUNTER_A]
    );
    expect(baseline.rows[0]).toEqual({ billing: 0, receivables: 0 });

    const admission = await admit(
      accessTokenA,
      TENANT_A,
      ACCOUNT_A,
      ENCOUNTER_A,
      PATIENT_A,
      randomUUID()
    );
    expect(admission.status).toBe(201);
    expect(admission.body).toMatchObject({ encounterId: ENCOUNTER_A, accountId: ACCOUNT_A });
    journeyStayId = admission.body?.id ?? '';
    expect(journeyStayId).toMatch(/^[0-9a-f-]{36}$/i);

    const handoff = await sendHandoff();
    expect(handoff.status).toBe(201);
    expect(handoff.body).toMatchObject({
      encounterId: ENCOUNTER_A,
      handoffStatus: 'sent_to_reception'
    });
    const acknowledged = await requestJson<HandoffResponse>(
      `/clinical-handoffs/${handoff.body?.id}/acknowledge`,
      {
        method: 'POST',
        headers: headersA(),
        body: JSON.stringify({ note: 'Recepção confirmou a vaga.' })
      }
    );
    expect(acknowledged.status).toBe(200);
    expect(acknowledged.body?.handoffStatus).toBe('acknowledged_by_reception');

    const consumptionKey = randomUUID();
    const consumed = await consume(consumptionKey);
    const consumptionReplay = await consume(consumptionKey);
    const consumptionConflict = await consume(consumptionKey, 3);
    expect(consumed.status).toBe(201);
    expect(consumed.body).toMatchObject({ encounterId: ENCOUNTER_A, quantity: 2 });
    expect(consumptionReplay.status).toBe(201);
    expect(consumptionReplay.body).toEqual(consumed.body);
    expect(consumptionConflict.status).toBe(409);

    const daily = await createDailyCharge();
    expect(daily.status).toBe(201);
    expect(daily.body).toMatchObject({ stayId: journeyStayId, status: 'pending' });
    const billKey = randomUUID();
    const billed = await billDailyCharge(daily.body?.id ?? '', billKey);
    const billedReplay = await billDailyCharge(daily.body?.id ?? '', billKey);
    const billedConflict = await billDailyCharge(daily.body?.id ?? '', billKey, {
      billingRecordId: randomUUID()
    });
    expect(billed.status).toBe(200);
    expect(billed.body).toMatchObject({ id: daily.body?.id, status: 'billed' });
    const billingRecordId = billed.body?.billingRecordId;
    expect(billingRecordId).toBeTruthy();
    expect(billedReplay.status).toBe(200);
    expect(billedReplay.body).toEqual(billed.body);
    expect(billedConflict.status).toBe(409);

    const openedBilling = await requestJson<{ readonly status: string }>(
      `/billing/${ENCOUNTER_A}/status`,
      {
        method: 'PATCH',
        headers: headersA(),
        body: JSON.stringify({ status: 'open' })
      }
    );
    expect(openedBilling.status).toBe(200);
    expect(openedBilling.body?.status).toBe('open');

    const dischargeKey = randomUUID();
    const discharged = await discharge(ENCOUNTER_A, dischargeKey);
    const dischargeReplay = await discharge(ENCOUNTER_A, dischargeKey);
    expect(discharged.status).toBe(201);
    expect(discharged.body).toMatchObject({ encounterId: ENCOUNTER_A, dischargeType: 'inpatient' });
    expect(dischargeReplay.status).toBe(201);
    expect(dischargeReplay.body).toEqual(discharged.body);

    const closeKey = randomUUID();
    const closed = await closeEncounter(ENCOUNTER_A, closeKey);
    const closeReplay = await closeEncounter(ENCOUNTER_A, closeKey);
    const closeConflict = await closeEncounter(ENCOUNTER_A, closeKey, 'Motivo divergente');
    expect(closed.status).toBe(200);
    expect(closed.body).toMatchObject({ id: ENCOUNTER_A, status: 'closed' });
    expect(closeReplay.status).toBe(200);
    expect(closeReplay.body).toEqual(closed.body);
    expect(closeConflict.status).toBe(409);

    const receiptKey = randomUUID();
    const received = await receipt(receiptKey);
    const receiptReplay = await receipt(receiptKey);
    const receiptConflict = await receipt(receiptKey, AMOUNT_TOTAL + 1);
    expect(received.status).toBe(201);
    expect(received.body).toMatchObject({ encounterId: ENCOUNTER_A, amount: AMOUNT_TOTAL });
    journeyReceiptId = received.body?.id ?? '';
    expect(journeyReceiptId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(receiptReplay.status).toBe(201);
    expect(receiptReplay.body).toEqual(received.body);
    expect(receiptConflict.status).toBe(409);

    const reconciliation = await requestJson<{
      readonly balanced: boolean;
      readonly totalDebit: number;
      readonly totalCredit: number;
    }>('/financial/ledger/reconciliation', { headers: headersA() });
    expect(reconciliation.status).toBe(200);
    expect(reconciliation.body).toMatchObject({
      balanced: true,
      totalDebit: AMOUNT_TOTAL,
      totalCredit: AMOUNT_TOTAL
    });

    const state = await getTestPool().query<{
      readonly stayStatus: string;
      readonly encounterStatus: string;
      readonly billingRecords: number;
      readonly billingItems: number;
      readonly billingTotal: number;
      readonly discharges: number;
      readonly receipts: number;
      readonly payments: number;
      readonly cashMovements: number;
      readonly journalEntries: number;
      readonly journalDebit: number;
      readonly journalCredit: number;
      readonly handoffs: number;
      readonly inventoryOutbox: number;
      readonly closeOutbox: number;
      readonly receiptOutbox: number;
    }>(
      `SELECT
         (SELECT status FROM inpatient_stays WHERE account_id = $1 AND id = $2) AS "stayStatus",
         (SELECT status FROM encounters WHERE account_id = $1 AND id = $3) AS "encounterStatus",
         (SELECT COUNT(*)::int FROM billing_records WHERE account_id = $1 AND encounter_id = $3) AS "billingRecords",
         (SELECT COUNT(*)::int FROM billing_items WHERE account_id = $1 AND encounter_id = $3) AS "billingItems",
         (SELECT COALESCE(SUM(total_amount), 0)::float8 FROM billing_items WHERE account_id = $1 AND encounter_id = $3) AS "billingTotal",
         (SELECT COUNT(*)::int FROM discharges WHERE account_id = $1 AND encounter_id = $3) AS discharges,
         (SELECT COUNT(*)::int FROM encounter_cash_receipts WHERE account_id = $1 AND encounter_id = $3) AS receipts,
         (SELECT COUNT(*)::int FROM encounter_receivable_payments WHERE account_id = $1 AND encounter_id = $3) AS payments,
         (SELECT COUNT(*)::int FROM cash_movements WHERE account_id = $1 AND cash_register_id = $4 AND movement_type = 'payment') AS "cashMovements",
         (SELECT COUNT(*)::int FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt') AS "journalEntries",
         (SELECT COALESCE(SUM(debit), 0)::float8 FROM financial_journal_lines WHERE account_id = $1 AND entry_id IN (SELECT id FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt')) AS "journalDebit",
         (SELECT COALESCE(SUM(credit), 0)::float8 FROM financial_journal_lines WHERE account_id = $1 AND entry_id IN (SELECT id FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt')) AS "journalCredit",
         (SELECT COUNT(*)::int FROM clinical_handoffs WHERE account_id = $1 AND encounter_id = $3) AS handoffs,
         (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'inventory.consumption.created' AND payload->>'encounterId' = $3::text) AS "inventoryOutbox",
         (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'encounter.closed' AND payload->>'encounterId' = $3::text) AS "closeOutbox",
         (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'encounter.cash-receipt.created' AND payload->>'encounterId' = $3::text) AS "receiptOutbox"`,
      [ACCOUNT_A, journeyStayId, ENCOUNTER_A, CASH_REGISTER_A]
    );
    expect(state.rows[0]).toEqual({
      stayStatus: 'discharged',
      encounterStatus: 'closed',
      billingRecords: 1,
      billingItems: 2,
      billingTotal: AMOUNT_TOTAL,
      discharges: 1,
      receipts: 1,
      payments: 1,
      cashMovements: 1,
      journalEntries: 1,
      journalDebit: AMOUNT_TOTAL,
      journalCredit: AMOUNT_TOTAL,
      handoffs: 1,
      inventoryOutbox: 1,
      closeOutbox: 1,
      receiptOutbox: 1
    });

    const inventoryLinks = await getTestPool().query<{
      readonly consumptionId: string;
      readonly quantity: number;
      readonly costAmount: number;
      readonly sourceEntityId: string;
      readonly billingItemId: string | null;
      readonly billingRecordId: string | null;
      readonly billingQuantity: number | null;
      readonly billingUnitPrice: number | null;
      readonly billingTotal: number | null;
    }>(
      `SELECT
         consumption.id AS "consumptionId",
         consumption.quantity::float8 AS quantity,
         consumption.cost_amount::float8 AS "costAmount",
         consumption.source_entity_id AS "sourceEntityId",
         item.id AS "billingItemId",
         item.billing_record_id AS "billingRecordId",
         item.quantity::float8 AS "billingQuantity",
         item.unit_price_amount::float8 AS "billingUnitPrice",
         item.total_amount::float8 AS "billingTotal"
       FROM inventory_consumptions AS consumption
       LEFT JOIN billing_items AS item
         ON item.account_id = consumption.account_id
        AND item.source_entity_type = 'inventory_consumption'
        AND item.source_entity_id = consumption.id
      WHERE consumption.account_id = $1
        AND consumption.encounter_id = $2::text
        AND consumption.source_entity_type = 'inpatient_stay'
        AND consumption.source_entity_id = $3`,
      [ACCOUNT_A, ENCOUNTER_A, journeyStayId]
    );
    expect(inventoryLinks.rows).toHaveLength(1);
    expect(inventoryLinks.rows[0]).toMatchObject({
      quantity: 2,
      costAmount: 50,
      sourceEntityId: journeyStayId,
      billingRecordId,
      billingQuantity: 2,
      billingUnitPrice: 40,
      billingTotal: AMOUNT_INVENTORY
    });
    expect(inventoryLinks.rows[0]?.billingItemId).toMatch(/^[A-Za-z0-9_-]+$/);

    const dailyLinks = await getTestPool().query<{
      readonly dailyChargeId: string;
      readonly dailyStatus: string;
      readonly dailyQuantity: number;
      readonly dailyUnitAmount: number;
      readonly dailyBillingRecordId: string | null;
      readonly billingItemId: string | null;
      readonly billingQuantity: number | null;
      readonly billingUnitPrice: number | null;
      readonly billingTotal: number | null;
    }>(
      `SELECT
         charge.id AS "dailyChargeId",
         charge.status AS "dailyStatus",
         charge.quantity::float8 AS "dailyQuantity",
         charge.unit_amount::float8 AS "dailyUnitAmount",
         charge.billing_record_id AS "dailyBillingRecordId",
         item.id AS "billingItemId",
         item.quantity::float8 AS "billingQuantity",
         item.unit_price_amount::float8 AS "billingUnitPrice",
         item.total_amount::float8 AS "billingTotal"
       FROM inpatient_daily_charges AS charge
       LEFT JOIN billing_items AS item
         ON item.account_id = charge.account_id
        AND item.source_entity_type = 'inpatient_daily_charge'
        AND item.source_entity_id = charge.id
      WHERE charge.account_id = $1
        AND charge.stay_id = $2`,
      [ACCOUNT_A, journeyStayId]
    );
    expect(dailyLinks.rows).toHaveLength(1);
    expect(dailyLinks.rows[0]).toMatchObject({
      dailyChargeId: daily.body?.id,
      dailyStatus: 'billed',
      dailyQuantity: 1,
      dailyUnitAmount: AMOUNT_DAILY,
      dailyBillingRecordId: billingRecordId,
      billingQuantity: 1,
      billingUnitPrice: AMOUNT_DAILY,
      billingTotal: AMOUNT_DAILY
    });
    expect(dailyLinks.rows[0]?.billingItemId).toMatch(/^[A-Za-z0-9_-]+$/);

    const financialGraph = await getTestPool().query<{
      readonly billingRecordId: string;
      readonly billingStatus: string;
      readonly billingSubtotal: number;
      readonly billingItemCount: number;
      readonly itemTotal: number;
      readonly financialAccountId: string | null;
      readonly financialStatus: string | null;
      readonly financialTotal: number | null;
      readonly financialPaid: number | null;
      readonly financialBalance: number | null;
      readonly receivableId: string | null;
      readonly receivableStatus: string | null;
      readonly receivableOriginal: number | null;
      readonly receivablePaid: number | null;
      readonly receivableOutstanding: number | null;
    }>(
      `SELECT
         billing.id AS "billingRecordId",
         billing.status AS "billingStatus",
         billing.subtotal_amount::float8 AS "billingSubtotal",
         COUNT(DISTINCT item.id)::int AS "billingItemCount",
         COALESCE(SUM(item.total_amount), 0)::float8 AS "itemTotal",
         financial.id AS "financialAccountId",
         financial.financial_status AS "financialStatus",
         financial.total_snapshot::float8 AS "financialTotal",
         financial.paid_amount::float8 AS "financialPaid",
         financial.balance_due::float8 AS "financialBalance",
         receivable.id AS "receivableId",
         receivable.status AS "receivableStatus",
         receivable.amount_original::float8 AS "receivableOriginal",
         receivable.amount_paid::float8 AS "receivablePaid",
         receivable.amount_outstanding::float8 AS "receivableOutstanding"
       FROM billing_records AS billing
       LEFT JOIN billing_items AS item
         ON item.account_id = billing.account_id
        AND item.billing_record_id = billing.id
       LEFT JOIN encounter_financial_accounts AS financial
         ON financial.account_id = billing.account_id
        AND financial.encounter_id = billing.encounter_id
       LEFT JOIN encounter_receivables AS receivable
         ON receivable.account_id = financial.account_id
        AND receivable.encounter_id = financial.encounter_id
        AND receivable.financial_account_id = financial.id
      WHERE billing.account_id = $1
        AND billing.id = $2
      GROUP BY billing.id, billing.status, billing.subtotal_amount,
        financial.id, financial.financial_status, financial.total_snapshot,
        financial.paid_amount, financial.balance_due, receivable.id,
        receivable.status, receivable.amount_original, receivable.amount_paid,
        receivable.amount_outstanding`,
      [ACCOUNT_A, billingRecordId]
    );
    expect(financialGraph.rows).toHaveLength(1);
    expect(financialGraph.rows[0]).toMatchObject({
      billingRecordId,
      billingStatus: 'settled',
      billingSubtotal: AMOUNT_TOTAL,
      billingItemCount: 2,
      itemTotal: AMOUNT_TOTAL,
      financialStatus: 'paid',
      financialTotal: AMOUNT_TOTAL,
      financialPaid: AMOUNT_TOTAL,
      financialBalance: 0,
      receivableStatus: 'settled',
      receivableOriginal: AMOUNT_TOTAL,
      receivablePaid: AMOUNT_TOTAL,
      receivableOutstanding: 0
    });

    const receiptGraph = await getTestPool().query<{
      readonly receiptId: string;
      readonly receiptAmount: number;
      readonly receiptBillingRecordId: string;
      readonly financialAccountId: string;
      readonly receivableId: string;
      readonly receivablePaymentId: string;
      readonly cashRegisterId: string;
      readonly cashMovementId: string;
      readonly journalEntryId: string;
      readonly paymentAmount: number | null;
      readonly externalReferenceType: string | null;
      readonly externalReferenceId: string | null;
      readonly cashAmount: number | null;
      readonly movementType: string | null;
      readonly journalSourceType: string | null;
      readonly journalSourceId: string | null;
      readonly journalDebit: number;
      readonly journalCredit: number;
    }>(
      `SELECT
         receipt.id AS "receiptId",
         receipt.amount::float8 AS "receiptAmount",
         receipt.billing_record_id AS "receiptBillingRecordId",
         receipt.financial_account_id::text AS "financialAccountId",
         receipt.receivable_id::text AS "receivableId",
         receipt.receivable_payment_id::text AS "receivablePaymentId",
         receipt.cash_register_id::text AS "cashRegisterId",
         receipt.cash_movement_id::text AS "cashMovementId",
         receipt.journal_entry_id::text AS "journalEntryId",
         payment.amount_paid::float8 AS "paymentAmount",
         payment.external_reference_type AS "externalReferenceType",
         payment.external_reference_id AS "externalReferenceId",
         movement.amount::float8 AS "cashAmount",
         movement.movement_type AS "movementType",
         entry.source_type AS "journalSourceType",
         entry.source_id AS "journalSourceId",
         COALESCE(SUM(line.debit), 0)::float8 AS "journalDebit",
         COALESCE(SUM(line.credit), 0)::float8 AS "journalCredit"
       FROM encounter_cash_receipts AS receipt
       LEFT JOIN encounter_receivable_payments AS payment
         ON payment.account_id = receipt.account_id
        AND payment.id = receipt.receivable_payment_id
       LEFT JOIN cash_movements AS movement
         ON movement.account_id = receipt.account_id
        AND movement.id = receipt.cash_movement_id
       LEFT JOIN financial_journal_entries AS entry
         ON entry.account_id = receipt.account_id
        AND entry.id = receipt.journal_entry_id
       LEFT JOIN financial_journal_lines AS line
         ON line.account_id = entry.account_id
        AND line.entry_id = entry.id
      WHERE receipt.account_id = $1
        AND receipt.encounter_id = $2
      GROUP BY receipt.id, payment.id, movement.id, entry.id`,
      [ACCOUNT_A, ENCOUNTER_A]
    );
    expect(receiptGraph.rows).toHaveLength(1);
    const receiptRow = receiptGraph.rows[0];
    expect(receiptRow).toMatchObject({
      receiptAmount: AMOUNT_TOTAL,
      receiptBillingRecordId: billingRecordId,
      paymentAmount: AMOUNT_TOTAL,
      externalReferenceType: 'cash_movement',
      externalReferenceId: receiptRow?.cashMovementId,
      cashAmount: AMOUNT_TOTAL,
      movementType: 'payment',
      journalSourceType: 'encounter_cash_receipt',
      journalSourceId: receiptRow?.receiptId,
      journalDebit: AMOUNT_TOTAL,
      journalCredit: AMOUNT_TOTAL
    });
    expect(receiptRow?.financialAccountId).toBe(financialGraph.rows[0]?.financialAccountId);
    expect(receiptRow?.receivableId).toBe(financialGraph.rows[0]?.receivableId);
    expect(receiptRow?.cashRegisterId).toBe(CASH_REGISTER_A);

    const secondaryInpatient = await requestJsonAt<{
      readonly items: readonly AdmissionResponse[];
    }>(
      secondaryBaseUrl,
      `/inpatient?encounterId=${encodeURIComponent(ENCOUNTER_A)}&includeDischarged=true`,
      { headers: headersA() }
    );
    expect(secondaryInpatient.status).toBe(200);
    expect(secondaryInpatient.body?.items).toHaveLength(1);
    expect(secondaryInpatient.body?.items[0]).toMatchObject({
      id: journeyStayId,
      encounterId: ENCOUNTER_A,
      accountId: ACCOUNT_A,
      status: 'discharged'
    });

    const secondaryDischarges = await requestJsonAt<{
      readonly items: readonly DischargeResponse[];
    }>(secondaryBaseUrl, '/discharges', { headers: headersA() });
    expect(secondaryDischarges.status).toBe(200);
    expect(secondaryDischarges.body?.items).toHaveLength(1);
    expect(secondaryDischarges.body?.items[0]).toMatchObject({
      encounterId: ENCOUNTER_A,
      dischargeType: 'inpatient'
    });

    const foreignSecondaryInpatient = await requestJsonAt<{
      readonly items: readonly AdmissionResponse[];
    }>(
      secondaryBaseUrl,
      `/inpatient?encounterId=${encodeURIComponent(ENCOUNTER_A)}&includeDischarged=true`,
      { headers: headersB() }
    );
    expect(foreignSecondaryInpatient.status).toBe(200);
    expect(foreignSecondaryInpatient.body?.items).toEqual([]);

    const foreignSecondaryDischarges = await requestJsonAt<{
      readonly items: readonly DischargeResponse[];
    }>(secondaryBaseUrl, '/discharges', { headers: headersB() });
    expect(foreignSecondaryDischarges.status).toBe(200);
    expect(foreignSecondaryDischarges.body?.items).toEqual([]);
  });

  it('rejects a shadowed settlement under a runtime role with pg_temp search_path', async () => {
    expect(journeyReceiptId).toMatch(/^[0-9a-f-]{36}$/i);
    const client = await getPool().connect();
    const shadowReceiptId = randomUUID();

    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_account_id', $1, true)`, [ACCOUNT_A]);
      await client.query('SET LOCAL search_path = pg_temp, public, app');
      await client.query(
        `CREATE TEMP TABLE encounter_cash_receipts
         AS SELECT * FROM public.encounter_cash_receipts WITH NO DATA`
      );
      await client.query(
        `CREATE TEMP TABLE financial_journal_entries
         AS SELECT * FROM public.financial_journal_entries WITH NO DATA`
      );
      await client.query(
        `INSERT INTO pg_temp.encounter_cash_receipts
           (id, account_id, encounter_id, billing_record_id,
            financial_account_id, receivable_id, receivable_payment_id,
            cash_register_id, cash_movement_id, journal_entry_id,
            received_by_user_id, amount, currency, received_at, notes,
            created_at, updated_at)
         SELECT $1::uuid, receipt.account_id, receipt.encounter_id,
                receipt.billing_record_id, receipt.financial_account_id,
                receipt.receivable_id, receipt.receivable_payment_id,
                receipt.cash_register_id, receipt.cash_movement_id,
                receipt.journal_entry_id, receipt.received_by_user_id,
                receipt.amount, receipt.currency, receipt.received_at,
                receipt.notes, receipt.created_at, receipt.updated_at
           FROM public.encounter_cash_receipts AS receipt
          WHERE receipt.id = $2::uuid`,
        [shadowReceiptId, journeyReceiptId]
      );
      await client.query(
        `INSERT INTO pg_temp.financial_journal_entries
           (id, account_id, source_type, source_id, description,
            occurred_at, created_by_user_id, created_at)
         SELECT entry.id, entry.account_id, entry.source_type, $1::text,
                entry.description, entry.occurred_at,
                entry.created_by_user_id, entry.created_at
           FROM public.financial_journal_entries AS entry
          WHERE entry.id = (
            SELECT receipt.journal_entry_id
              FROM public.encounter_cash_receipts AS receipt
             WHERE receipt.id = $2::uuid
          )`,
        [shadowReceiptId, journeyReceiptId]
      );

      await expect(
        client.query(`SELECT app.assert_encounter_cash_receipt_consistent($1, false)`, [
          shadowReceiptId
        ])
      ).rejects.toThrow(/Encounter cash receipt .* inconsistent/);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('serializes a concurrent same-key daily charge billing replay', async () => {
    const admission = await admit(
      accessTokenA,
      TENANT_A,
      ACCOUNT_A,
      RACE_ENCOUNTER_A,
      PATIENT_A,
      randomUUID()
    );
    expect(admission.status).toBe(201);
    const raceStayId = admission.body?.id;
    expect(raceStayId).toBeTruthy();
    const daily = await requestJson<DailyChargeResponse>(`/inpatient/${raceStayId}/daily-charges`, {
      method: 'POST',
      headers: headersA(),
      body: JSON.stringify({ description: 'Diária concorrente', quantity: 1, unitAmount: 100 })
    });
    expect(daily.status).toBe(201);
    const key = randomUUID();
    const billPath = `/inpatient/${raceStayId}/daily-charges/${daily.body?.id}/bill`;
    const [first, second] = await Promise.all(
      [baseUrl, secondaryBaseUrl].map((origin) =>
        requestJsonAt<DailyChargeResponse>(origin, billPath, {
          method: 'POST',
          headers: { ...headersA(), 'idempotency-key': key },
          body: JSON.stringify({})
        })
      )
    );
    expect([first.status, second.status].sort()).toEqual([200, 200]);
    expect(first.body).toEqual(second.body);
    const state = await getTestPool().query<{ readonly items: number; readonly records: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM billing_items WHERE account_id = $1 AND encounter_id = $2) AS items,
         (SELECT COUNT(*)::int FROM billing_records WHERE account_id = $1 AND encounter_id = $2) AS records`,
      [ACCOUNT_A, RACE_ENCOUNTER_A]
    );
    expect(state.rows[0]).toEqual({ items: 1, records: 1 });
  });

  it('rolls back a close failpoint without leaving audit, outbox or idempotency residue', async () => {
    await getTestPool().query(
      `ALTER TABLE encounters ADD CONSTRAINT ${ROLLBACK_CONSTRAINT}
       CHECK (NOT (id = '${ENCOUNTER_B}'::uuid AND status = 'closed'))`
    );
    const key = randomUUID();
    const response = await requestJson<EncounterResponse & { readonly code?: string }>(
      `/encounters/${ENCOUNTER_B}/close`,
      {
        method: 'POST',
        headers: { ...headersB(), 'idempotency-key': key },
        body: JSON.stringify({ closeReason: 'Failpoint vertical' })
      }
    );
    expect(response.status).toBe(500);
    const state = await getTestPool().query<{
      readonly status: string;
      readonly audits: number;
      readonly outbox: number;
      readonly idempotency: number;
    }>(
      `SELECT
         (SELECT status FROM encounters WHERE account_id = $1 AND id = $2) AS status,
         (SELECT COUNT(*)::int FROM audit_events WHERE account_id = $1 AND entity_type = 'encounter' AND entity_id = $2::text AND action = 'close') AS audits,
         (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'encounter.closed' AND payload->>'encounterId' = $2::text) AS outbox,
         (SELECT COUNT(*)::int FROM idempotency_requests WHERE account_id = $1 AND operation = $3 AND idempotency_key = $4) AS idempotency`,
      [ACCOUNT_B, ENCOUNTER_B, `POST /encounters/${ENCOUNTER_B}/close`, key]
    );
    expect(state.rows[0]).toEqual({ status: 'open', audits: 0, outbox: 0, idempotency: 0 });
  });

  it('does not cross tenant boundaries when bearer A targets tenant B', async () => {
    const response = await requestJson<AdmissionResponse & { readonly code?: string }>(
      '/inpatient',
      {
        method: 'POST',
        headers: {
          ...headers(accessTokenA, TENANT_A, ACCOUNT_A),
          'idempotency-key': randomUUID()
        },
        body: JSON.stringify({
          encounterId: ENCOUNTER_B,
          patientId: PATIENT_B,
          unit: 'Internacao clinica',
          ward: 'Ala A',
          bed: 'A-02'
        })
      }
    );
    expect(response.status).toBe(404);

    const falsifiedHeaders = await requestJson<AdmissionResponse & { readonly code?: string }>(
      '/inpatient',
      {
        method: 'POST',
        headers: {
          ...headers(accessTokenA, TENANT_B, ACCOUNT_B),
          'idempotency-key': randomUUID()
        },
        body: JSON.stringify({
          encounterId: ENCOUNTER_B,
          patientId: PATIENT_B,
          unit: 'Internacao clinica',
          ward: 'Ala A',
          bed: 'A-03'
        })
      }
    );
    expect(falsifiedHeaders.status).toBe(404);

    const state = await getTestPool().query<{
      readonly accountAStays: number;
      readonly accountBStays: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM inpatient_stays WHERE account_id = $1 AND encounter_id = $2) AS "accountAStays",
         (SELECT COUNT(*)::int FROM inpatient_stays WHERE account_id = $3 AND encounter_id = $2) AS "accountBStays"`,
      [ACCOUNT_A, ENCOUNTER_B, ACCOUNT_B]
    );
    expect(state.rows[0]).toEqual({ accountAStays: 0, accountBStays: 0 });
  });
});
