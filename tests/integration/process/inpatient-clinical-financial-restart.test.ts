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

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID();
const USER_ID = randomUUID();
const OWNER_ID = randomUUID();
const PATIENT_ID = randomUUID();
const ENCOUNTER_ID = randomUUID();
const ITEM_ID = `restart-item-${randomUUID()}`;
const LOT_ID = `restart-lot-${randomUUID()}`;
const CASH_REGISTER_ID = randomUUID();
const USERNAME = `restart-${USER_ID.slice(0, 8)}`;
const AMOUNT_INVENTORY = 80;
const AMOUNT_DAILY = 180;
const AMOUNT_TOTAL = AMOUNT_INVENTORY + AMOUNT_DAILY;

const API_ROLE = `restart_api_${randomUUID().replaceAll('-', '')}`;
const WORKER_ROLE = `restart_worker_${randomUUID().replaceAll('-', '')}`;
const ROLE_PASSWORD = `restart-${randomUUID()}`;

let server: ApiServer | undefined;
let baseUrl = '';
let accessToken = '';
let stayId = '';

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
  readonly encounterId: string;
  readonly accountId: string;
  readonly status: string;
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

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<JsonResponse<T>> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  return {
    status: response.status,
    body: text.length > 0 ? (JSON.parse(text) as T) : undefined,
    text
  };
}

function authHeaders(): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
    'x-tenant-id': TENANT_ID,
    'x-account-id': ACCOUNT_ID,
    'content-type': 'application/json'
  };
}

async function seedFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, 'Inpatient restart tenant', 'active')`,
    [TENANT_ID, `restart-${TENANT_ID.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Inpatient restart account')`,
    [ACCOUNT_ID, TENANT_ID, `restart-${ACCOUNT_ID.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name, is_active
     ) VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Restart Operator', true)`,
    [USER_ID, ACCOUNT_ID, USERNAME, `${USERNAME}@example.test`]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from restart fixture');
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    USER_ID,
    role.rows[0].id
  ]);
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'Restart Owner')`,
    [OWNER_ID, ACCOUNT_ID]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Restart Patient', 'canine')`,
    [PATIENT_ID, ACCOUNT_ID, OWNER_ID]
  );
  await pool.query(
    `INSERT INTO encounters (
       id, account_id, patient_id, owner_id, status, opened_by_user_id, reason
     ) VALUES ($1, $2, $3, $4, 'open', $5, 'Restart bounded journey')`,
    [ENCOUNTER_ID, ACCOUNT_ID, PATIENT_ID, OWNER_ID, USER_ID]
  );
  await pool.query(
    `INSERT INTO inventory_items (
       id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
       unit_cost_amount, charge_unit_price_amount
     ) VALUES ($1, $2, $3, 'Restart inpatient supply', 'unit', 10, 1, 25, 40)`,
    [ITEM_ID, ACCOUNT_ID, `SKU-${ITEM_ID.slice(-12)}`]
  );
  await pool.query(
    `INSERT INTO inventory_lots (
       id, account_id, inventory_item_id, lot_number, quantity, reserved_quantity,
       unit, location, supplier, expiry_date, status
     ) VALUES ($1, $2, $3, $4, 10, 0, 'unit', 'Ala A', 'Restart supplier',
       '2028-12-31T00:00:00.000Z', 'active')`,
    [LOT_ID, ACCOUNT_ID, ITEM_ID, `LOT-${LOT_ID.slice(-12)}`]
  );
  await pool.query(
    `INSERT INTO cash_registers (
       id, account_id, opened_by_user_id, opening_amount, status
     ) VALUES ($1, $2, $3, 50, 'open')`,
    [CASH_REGISTER_ID, ACCOUNT_ID, USER_ID]
  );
}

async function configureNobypassRuntimeRoles(): Promise<string> {
  const adminPool = getAdminPool();
  const dbIdentifier = TEST_DB_NAME.replaceAll('"', '""');
  await adminPool.query(
    `CREATE ROLE "${API_ROLE}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
       NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${ROLE_PASSWORD}'`
  );
  await adminPool.query(
    `CREATE ROLE "${WORKER_ROLE}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
       NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${ROLE_PASSWORD}'`
  );
  await adminPool.query(
    `GRANT CONNECT ON DATABASE "${dbIdentifier}" TO "${API_ROLE}", "${WORKER_ROLE}"`
  );

  const client = await getTestPool().connect();
  try {
    const { reconcileRuntimeRoles } =
      await import('../../../packages/db/src/reconcile-runtime-roles.js');
    await reconcileRuntimeRoles(client, { apiRole: API_ROLE, workerRole: WORKER_ROLE });
  } finally {
    client.release();
  }
  const runtimeUrl = new URL(TEST_DB_URL);
  runtimeUrl.username = API_ROLE;
  runtimeUrl.password = ROLE_PASSWORD;
  return runtimeUrl.toString();
}

async function stopRuntime(): Promise<void> {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) =>
      server?.close((error) => (error ? reject(error) : resolve()))
    );
  }
  server = undefined;
  baseUrl = '';
  accessToken = '';
  await shutdownServices();
}

async function startRuntime(databaseUrl: string): Promise<void> {
  const bootstrap = await bootstrapServices({
    databaseUrl,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-inpatient-restart-')),
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
    { current_user: API_ROLE, rolbypassrls: false, rolsuper: false }
  ]);
  const runtimeOptions = {
    environment: 'test' as const,
    version: '0.1.0',
    authSecret: 'inpatient-restart-http-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage,
    unitOfWork: bootstrap.unitOfWork,
    preserveSeedUsersWithRepository: false,
    preserveSeedMasterDataWithRepository: false
  };
  setAppState({
    persistenceMode: 'database',
    databaseConfigured: true,
    databaseHealthy: true,
    databaseDetail: bootstrap.databaseDetail,
    repositoriesReady: true,
    repositoryCount: Object.values(bootstrap.repositories).filter(Boolean).length,
    workerReady: true,
    workerDetail: 'Inpatient clinical-financial controlled restart test runtime',
    productionReady: true,
    initialized: true
  });
  server = createApiServer({ appName: 'inpatient-restart-process-test', ...runtimeOptions });
  await server.ready;
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const login = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: 'seed_admin' })
  });
  if (login.status !== 200 || !login.body?.accessToken) {
    throw new Error(`Restart fixture login failed: ${login.status} ${login.text}`);
  }
  accessToken = login.body.accessToken;
}

async function admit(): Promise<JsonResponse<AdmissionResponse>> {
  return requestJson<AdmissionResponse>('/inpatient', {
    method: 'POST',
    headers: { ...authHeaders(), 'idempotency-key': randomUUID() },
    body: JSON.stringify({
      encounterId: ENCOUNTER_ID,
      patientId: PATIENT_ID,
      unit: 'Internacao clinica',
      ward: 'Ala A',
      bed: 'A-01'
    })
  });
}

async function consume(key: string): Promise<JsonResponse<ConsumptionResponse>> {
  return requestJson<ConsumptionResponse>('/inventory/consumptions', {
    method: 'POST',
    headers: { ...authHeaders(), 'idempotency-key': key },
    body: JSON.stringify({
      encounterId: ENCOUNTER_ID,
      inventoryItemId: ITEM_ID,
      quantity: 2,
      sourceEntityType: 'inpatient_stay',
      sourceEntityId: stayId
    })
  });
}

beforeAll(async () => {
  await seedFixture();
  const runtimeUrl = await configureNobypassRuntimeRoles();
  await startRuntime(runtimeUrl);
});

afterAll(async () => {
  await stopRuntime();
  const testPool = getTestPool();
  await testPool.query(`REASSIGN OWNED BY "${API_ROLE}" TO CURRENT_USER`).catch(() => undefined);
  await testPool.query(`DROP OWNED BY "${API_ROLE}"`).catch(() => undefined);
  await testPool.query(`REASSIGN OWNED BY "${WORKER_ROLE}" TO CURRENT_USER`).catch(() => undefined);
  await testPool.query(`DROP OWNED BY "${WORKER_ROLE}"`).catch(() => undefined);
  const adminPool = getAdminPool();
  await adminPool.query(`REVOKE cvg_installer FROM "${API_ROLE}"`);
  await adminPool.query(`DROP ROLE IF EXISTS "${API_ROLE}"`);
  await adminPool.query(`DROP ROLE IF EXISTS "${WORKER_ROLE}"`);
});

describe('inpatient clinical-financial controlled restart/replay process boundary', () => {
  it('replays committed inventory consumption after rebootstrap and completes one financial journey', async () => {
    const admission = await admit();
    expect(admission.status).toBe(201);
    stayId = admission.body?.id ?? '';
    expect(stayId).toMatch(/^[0-9a-f-]{36}$/i);

    const consumptionKey = randomUUID();
    const firstConsumption = await consume(consumptionKey);
    expect(firstConsumption.status).toBe(201);
    expect(firstConsumption.body).toMatchObject({ encounterId: ENCOUNTER_ID, quantity: 2 });

    const committedBeforeRestart = await getTestPool().query<{
      readonly consumptions: number;
      readonly consumptionItems: number;
      readonly billingRecords: number;
      readonly stock: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM inventory_consumptions WHERE account_id = $1 AND source_entity_id = $2::text) AS consumptions,
         (SELECT COUNT(*)::int FROM billing_items WHERE account_id = $1 AND source_entity_type = 'inventory_consumption' AND source_entity_id = $3::text) AS "consumptionItems",
         (SELECT COUNT(*)::int FROM billing_records WHERE account_id = $1 AND encounter_id = $4) AS "billingRecords",
         (SELECT on_hand_quantity::int FROM inventory_items WHERE account_id = $1 AND id = $5) AS stock`,
      [ACCOUNT_ID, stayId, firstConsumption.body?.id, ENCOUNTER_ID, ITEM_ID]
    );
    expect(committedBeforeRestart.rows[0]).toEqual({
      consumptions: 1,
      consumptionItems: 1,
      billingRecords: 1,
      stock: 8
    });

    // Controlled restart: this closes the API and its database pool, then creates
    // a fresh bootstrap/runtime. A real SIGKILL child-process harness is residual.
    await stopRuntime();
    const runtimeUrl = new URL(TEST_DB_URL);
    runtimeUrl.username = API_ROLE;
    runtimeUrl.password = ROLE_PASSWORD;
    await startRuntime(runtimeUrl.toString());

    const replayConsumption = await consume(consumptionKey);
    expect(replayConsumption.status).toBe(201);
    expect(replayConsumption.body).toEqual(firstConsumption.body);

    const daily = await requestJson<DailyChargeResponse>(`/inpatient/${stayId}/daily-charges`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        description: 'Diária pós-restart',
        quantity: 1,
        unitAmount: AMOUNT_DAILY
      })
    });
    expect(daily.status).toBe(201);
    const billed = await requestJson<DailyChargeResponse>(
      `/inpatient/${stayId}/daily-charges/${daily.body?.id}/bill`,
      {
        method: 'POST',
        headers: { ...authHeaders(), 'idempotency-key': randomUUID() },
        body: JSON.stringify({})
      }
    );
    expect(billed.status).toBe(200);
    expect(billed.body?.status).toBe('billed');

    const opened = await requestJson<{ readonly status: string }>(
      `/billing/${ENCOUNTER_ID}/status`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'open' })
      }
    );
    expect(opened.status).toBe(200);
    expect(opened.body?.status).toBe('open');

    const discharged = await requestJson('/discharges', {
      method: 'POST',
      headers: { ...authHeaders(), 'idempotency-key': randomUUID() },
      body: JSON.stringify({ encounterId: ENCOUNTER_ID, dischargeType: 'inpatient' })
    });
    expect(discharged.status).toBe(201);
    const closed = await requestJson<{ readonly status: string }>(
      `/encounters/${ENCOUNTER_ID}/close`,
      {
        method: 'POST',
        headers: { ...authHeaders(), 'idempotency-key': randomUUID() },
        body: JSON.stringify({ closeReason: 'Alta pós-restart' })
      }
    );
    expect(closed.status).toBe(200);
    expect(closed.body?.status).toBe('closed');

    const receiptKey = randomUUID();
    const receipt = await requestJson<{ readonly id: string; readonly amount: number }>(
      `/encounters/${ENCOUNTER_ID}/cash-receipts`,
      {
        method: 'POST',
        headers: { ...authHeaders(), 'idempotency-key': receiptKey },
        body: JSON.stringify({ cashRegisterId: CASH_REGISTER_ID, expectedAmount: AMOUNT_TOTAL })
      }
    );
    expect(receipt.status).toBe(201);
    expect(receipt.body?.amount).toBe(AMOUNT_TOTAL);
    const receiptReplay = await requestJson<{ readonly id: string; readonly amount: number }>(
      `/encounters/${ENCOUNTER_ID}/cash-receipts`,
      {
        method: 'POST',
        headers: { ...authHeaders(), 'idempotency-key': receiptKey },
        body: JSON.stringify({ cashRegisterId: CASH_REGISTER_ID, expectedAmount: AMOUNT_TOTAL })
      }
    );
    expect(receiptReplay.status).toBe(201);
    expect(receiptReplay.body).toEqual(receipt.body);

    const reconciliation = await getTestPool().query<{
      readonly consumptions: number;
      readonly inventoryBillingItems: number;
      readonly dailyCharges: number;
      readonly dailyBillingItems: number;
      readonly billingRecords: number;
      readonly receivables: number;
      readonly receipts: number;
      readonly payments: number;
      readonly cashMovements: number;
      readonly journalEntries: number;
      readonly journalLines: number;
      readonly debit: number;
      readonly credit: number;
      readonly consumptionKeyRows: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM inventory_consumptions WHERE account_id = $1 AND encounter_id = $2::text) AS consumptions,
         (SELECT COUNT(*)::int FROM billing_items item JOIN inventory_consumptions consumption
            ON consumption.account_id = item.account_id AND item.source_entity_type = 'inventory_consumption'
           AND item.source_entity_id = consumption.id::text
          WHERE item.account_id = $1 AND consumption.encounter_id = $2::text) AS "inventoryBillingItems",
         (SELECT COUNT(*)::int FROM inpatient_daily_charges WHERE account_id = $1 AND encounter_id = $2::uuid) AS "dailyCharges",
         (SELECT COUNT(*)::int FROM billing_items item JOIN inpatient_daily_charges charge
            ON charge.account_id = item.account_id AND item.source_entity_type = 'inpatient_daily_charge'
           AND item.source_entity_id = charge.id::text
          WHERE item.account_id = $1 AND charge.encounter_id = $2::uuid) AS "dailyBillingItems",
         (SELECT COUNT(*)::int FROM billing_records WHERE account_id = $1 AND encounter_id = $2::uuid) AS "billingRecords",
         (SELECT COUNT(*)::int FROM encounter_receivables WHERE account_id = $1 AND encounter_id = $2::uuid) AS receivables,
         (SELECT COUNT(*)::int FROM encounter_cash_receipts WHERE account_id = $1 AND encounter_id = $2::uuid) AS receipts,
         (SELECT COUNT(*)::int FROM encounter_receivable_payments WHERE account_id = $1 AND encounter_id = $2::uuid) AS payments,
         (SELECT COUNT(*)::int FROM cash_movements WHERE account_id = $1 AND cash_register_id = $3 AND movement_type = 'payment') AS "cashMovements",
         (SELECT COUNT(*)::int FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt') AS "journalEntries",
         (SELECT COUNT(*)::int FROM financial_journal_lines line JOIN financial_journal_entries entry
            ON entry.account_id = line.account_id AND entry.id = line.entry_id
          WHERE line.account_id = $1 AND entry.source_type = 'encounter_cash_receipt') AS "journalLines",
         (SELECT COALESCE(SUM(line.debit), 0)::float8 FROM financial_journal_lines line JOIN financial_journal_entries entry
            ON entry.account_id = line.account_id AND entry.id = line.entry_id
          WHERE line.account_id = $1 AND entry.source_type = 'encounter_cash_receipt') AS debit,
         (SELECT COALESCE(SUM(line.credit), 0)::float8 FROM financial_journal_lines line JOIN financial_journal_entries entry
            ON entry.account_id = line.account_id AND entry.id = line.entry_id
          WHERE line.account_id = $1 AND entry.source_type = 'encounter_cash_receipt') AS credit,
         (SELECT COUNT(*)::int FROM idempotency_requests WHERE account_id = $1 AND idempotency_key = $4 AND status = 'completed') AS "consumptionKeyRows"`,
      [ACCOUNT_ID, ENCOUNTER_ID, CASH_REGISTER_ID, consumptionKey]
    );
    expect(reconciliation.rows[0]).toEqual({
      consumptions: 1,
      inventoryBillingItems: 1,
      dailyCharges: 1,
      dailyBillingItems: 1,
      billingRecords: 1,
      receivables: 1,
      receipts: 1,
      payments: 1,
      cashMovements: 1,
      journalEntries: 1,
      journalLines: 2,
      debit: AMOUNT_TOTAL,
      credit: AMOUNT_TOTAL,
      consumptionKeyRows: 1
    });
  }, 60_000);
});
