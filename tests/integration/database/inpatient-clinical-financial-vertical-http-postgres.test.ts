import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setAppState } from '../../../apps/api/src/app-state.js';
import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

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

  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-inpatient-vertical-http-')),
    maxRetries: 10,
    retryDelayMs: 1000
  });
  if (!bootstrap.databaseHealthy || !bootstrap.unitOfWork) {
    throw new Error(`Database/UoW unavailable: ${bootstrap.databaseDetail}`);
  }
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
