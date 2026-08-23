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
const ITEM_A = `inv-charge-${randomUUID()}`;
const LOT_A = `lot-charge-${randomUUID()}`;

const TENANT_B = randomUUID();
const ACCOUNT_B = randomUUID();
const USER_B = randomUUID();
const OWNER_B = randomUUID();
const PATIENT_B = randomUUID();
const ENCOUNTER_B = randomUUID();
const ITEM_B = `inv-charge-${randomUUID()}`;
const LOT_B = `lot-charge-${randomUUID()}`;

const USERNAME_A = `inventory-charge-${USER_A.slice(0, 8)}`;
const USERNAME_B = `inventory-charge-foreign-${USER_B.slice(0, 8)}`;

let server: ApiServer | undefined;
let baseUrl = '';
let accessTokenA = '';
let accessTokenB = '';

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
  readonly accountId: string;
  readonly inventoryItemId: string;
  readonly encounterId: string;
  readonly quantity: number;
  readonly sourceEntityType: string;
  readonly sourceEntityId?: string;
}

interface JsonResponse<T> {
  readonly status: number;
  readonly body?: T;
  readonly text: string;
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

function authHeaders(
  token: string,
  tenantId: string,
  accountId: string,
  spoof?: { readonly tenantId: string; readonly accountId: string }
): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-id': spoof?.tenantId ?? tenantId,
    'x-account-id': spoof?.accountId ?? accountId,
    'content-type': 'application/json'
  };
}

async function seedTenant(input: {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly ownerId: string;
  readonly patientId: string;
  readonly encounterId: string;
  readonly itemId: string;
  readonly lotId: string;
  readonly username: string;
  readonly label: string;
  readonly chargeUnitPriceAmount?: number;
}): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, $3, 'active')`,
    [input.tenantId, `inventory-charge-${input.tenantId.slice(0, 8)}`, input.label]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, $4)`,
    [
      input.accountId,
      input.tenantId,
      `inventory-charge-${input.accountId.slice(0, 8)}`,
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
  if (!role.rows[0]) throw new Error('admin role is missing from the test seed');
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
  await pool.query(
    `INSERT INTO encounters (
       id, account_id, patient_id, owner_id, status, opened_by_user_id
     ) VALUES ($1, $2, $3, $4, 'open', $5)`,
    [input.encounterId, input.accountId, input.patientId, input.ownerId, input.userId]
  );
  await pool.query(
    `INSERT INTO inventory_items (
       id, account_id, sku, name, unit, on_hand_quantity, reorder_level, unit_cost_amount,
       charge_unit_price_amount
     ) VALUES ($1, $2, $3, $4, 'unit', 10, 1, 25, $5)`,
    [
      input.itemId,
      input.accountId,
      `SKU-${input.itemId.slice(-12)}`,
      `${input.label} supply`,
      input.chargeUnitPriceAmount ?? null
    ]
  );
  await pool.query(
    `INSERT INTO inventory_lots (
       id, account_id, inventory_item_id, lot_number, quantity, reserved_quantity, unit,
       location, supplier, expiry_date, status
     ) VALUES ($1, $2, $3, $4, 10, 0, 'unit', 'Ala A', 'Test supplier',
       '2028-12-31T00:00:00.000Z', 'active')`,
    [input.lotId, input.accountId, input.itemId, `LOT-${input.lotId.slice(-12)}`]
  );
}

async function login(username: string): Promise<string> {
  const response = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'seed_admin' })
  });
  if (response.status !== 200 || !response.body?.accessToken) {
    throw new Error(`Inventory charge fixture login failed: ${response.status} ${response.text}`);
  }
  return response.body.accessToken;
}

async function admitA(idempotencyKey: string): Promise<JsonResponse<AdmissionResponse>> {
  return requestJson<AdmissionResponse>('/inpatient', {
    method: 'POST',
    headers: {
      ...authHeaders(accessTokenA, TENANT_A, ACCOUNT_A),
      'idempotency-key': idempotencyKey
    },
    body: JSON.stringify({
      encounterId: ENCOUNTER_A,
      patientId: PATIENT_A,
      unit: 'Internacao clinica',
      ward: 'Ala A',
      bed: 'A-01'
    })
  });
}

async function admitB(idempotencyKey: string): Promise<JsonResponse<AdmissionResponse>> {
  return requestJson<AdmissionResponse>('/inpatient', {
    method: 'POST',
    headers: {
      ...authHeaders(accessTokenB, TENANT_B, ACCOUNT_B),
      'idempotency-key': idempotencyKey
    },
    body: JSON.stringify({
      encounterId: ENCOUNTER_B,
      patientId: PATIENT_B,
      unit: 'Internacao clinica',
      ward: 'Ala B',
      bed: 'B-01'
    })
  });
}

async function consume(
  token: string,
  tenantId: string,
  accountId: string,
  encounterId: string,
  itemId: string,
  sourceEntityId: string,
  idempotencyKey: string,
  spoof?: { readonly tenantId: string; readonly accountId: string }
): Promise<JsonResponse<ConsumptionResponse & { readonly code?: string }>> {
  return requestJson<ConsumptionResponse & { readonly code?: string }>('/inventory/consumptions', {
    method: 'POST',
    headers: {
      ...authHeaders(token, tenantId, accountId, spoof),
      'idempotency-key': idempotencyKey
    },
    body: JSON.stringify({
      encounterId,
      inventoryItemId: itemId,
      quantity: 2,
      sourceEntityType: 'inpatient_stay',
      sourceEntityId
    })
  });
}

async function insertCrossTenantInventoryConsumption(stayId: string): Promise<void> {
  await getTestPool().query(
    `INSERT INTO inventory_consumptions (
       id, account_id, inventory_item_id, encounter_id, patient_id, quantity, unit,
       cost_amount, source_entity_type, source_entity_id, recorded_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, 1, 'unit', 40, 'inpatient_stay', $6, $7)`,
    [randomUUID(), ACCOUNT_A, ITEM_A, ENCOUNTER_A, PATIENT_A, stayId, USER_A]
  );
}

beforeAll(async () => {
  await seedTenant({
    tenantId: TENANT_A,
    accountId: ACCOUNT_A,
    userId: USER_A,
    ownerId: OWNER_A,
    patientId: PATIENT_A,
    encounterId: ENCOUNTER_A,
    itemId: ITEM_A,
    lotId: LOT_A,
    username: USERNAME_A,
    label: 'Inventory charge A',
    chargeUnitPriceAmount: 40
  });
  await seedTenant({
    tenantId: TENANT_B,
    accountId: ACCOUNT_B,
    userId: USER_B,
    ownerId: OWNER_B,
    patientId: PATIENT_B,
    encounterId: ENCOUNTER_B,
    itemId: ITEM_B,
    lotId: LOT_B,
    username: USERNAME_B,
    label: 'Inventory charge B'
  });

  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-inventory-charge-http-')),
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
    workerDetail: 'Inventory charge capture HTTP integration test runtime',
    productionReady: true,
    initialized: true
  });

  server = createApiServer({
    appName: 'inventory-charge-http-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'inventory-charge-http-test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage,
    unitOfWork: bootstrap.unitOfWork,
    preserveSeedUsersWithRepository: false,
    preserveSeedMasterDataWithRepository: false
  });
  await server.ready;
  await new Promise<void>((resolve) => {
    server?.listen(0, '127.0.0.1', () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  accessTokenA = await login(USERNAME_A);
  accessTokenB = await login(USERNAME_B);
});

afterAll(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await shutdownServices();
});

describe('inpatient inventory charge capture HTTP PostgreSQL boundary', () => {
  it('creates one source-idempotent billing item when inpatient stock is consumed', async () => {
    const admission = await admitA(randomUUID());
    expect(admission.status).toBe(201);
    const stayId = admission.body?.id;
    expect(stayId).toBeTruthy();

    const idempotencyKey = randomUUID();
    const first = await consume(
      accessTokenA,
      TENANT_A,
      ACCOUNT_A,
      ENCOUNTER_A,
      ITEM_A,
      stayId as string,
      idempotencyKey
    );
    const replay = await consume(
      accessTokenA,
      TENANT_A,
      ACCOUNT_A,
      ENCOUNTER_A,
      ITEM_A,
      stayId as string,
      idempotencyKey
    );

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);

    const concurrentKeys = [randomUUID(), randomUUID()];
    const concurrent = await Promise.all(
      concurrentKeys.map((key) =>
        consume(accessTokenA, TENANT_A, ACCOUNT_A, ENCOUNTER_A, ITEM_A, stayId as string, key)
      )
    );
    expect(concurrent.map((response) => response.status).sort()).toEqual([201, 201]);

    const state = await getTestPool().query<{
      readonly consumptions: number;
      readonly stockMovements: number;
      readonly billingItems: number;
      readonly billingRecords: number;
      readonly chargeTotal: number;
      readonly onHand: number;
      readonly completedIdempotency: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM inventory_consumptions
           WHERE account_id = $1 AND encounter_id = $2::text
             AND source_entity_type = 'inpatient_stay' AND source_entity_id = $3) AS "consumptions",
         (SELECT COUNT(*)::int FROM inventory_stock_movements
           WHERE account_id = $1 AND inventory_item_id = $4
             AND movement_type = 'consumption') AS "stockMovements",
         (SELECT COUNT(*)::int FROM billing_items
           WHERE account_id = $1 AND encounter_id = $2::uuid
             AND source_entity_type = 'inventory_consumption') AS "billingItems",
         (SELECT COUNT(*)::int FROM billing_records
           WHERE account_id = $1 AND encounter_id = $2::uuid) AS "billingRecords",
         (SELECT COALESCE(SUM(total_amount), 0)::float8 FROM billing_items
           WHERE account_id = $1 AND encounter_id = $2::uuid
             AND source_entity_type = 'inventory_consumption') AS "chargeTotal",
         (SELECT on_hand_quantity::float8 FROM inventory_items
           WHERE account_id = $1 AND id = $4) AS "onHand",
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND operation = 'POST /inventory/consumptions'
             AND idempotency_key = ANY($5::text[]) AND status = 'completed') AS "completedIdempotency"`,
      [ACCOUNT_A, ENCOUNTER_A, stayId, ITEM_A, [idempotencyKey, ...concurrentKeys]]
    );

    expect(state.rows[0]).toEqual({
      consumptions: 3,
      stockMovements: 3,
      billingItems: 3,
      billingRecords: 1,
      chargeTotal: 240,
      onHand: 4,
      completedIdempotency: 3
    });
  });

  it('denies tenant B from consuming tenant A resources despite spoofed headers', async () => {
    const response = await consume(
      accessTokenB,
      TENANT_B,
      ACCOUNT_B,
      ENCOUNTER_A,
      ITEM_A,
      randomUUID(),
      randomUUID(),
      { tenantId: TENANT_A, accountId: ACCOUNT_A }
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: expect.any(String) });
  });

  it('rejects inpatient consumption without an explicit charge price before mutating stock', async () => {
    const admission = await admitB(randomUUID());
    expect(admission.status).toBe(201);
    const stayId = admission.body?.id;
    expect(stayId).toBeTruthy();

    const idempotencyKey = randomUUID();
    const response = await consume(
      accessTokenB,
      TENANT_B,
      ACCOUNT_B,
      ENCOUNTER_B,
      ITEM_B,
      stayId as string,
      idempotencyKey
    );

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ code: 'PRICE_SOURCE_REQUIRED' });

    const state = await getTestPool().query<{
      readonly consumptions: number;
      readonly billingItems: number;
      readonly onHand: number;
      readonly completedIdempotency: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM inventory_consumptions
           WHERE account_id = $1 AND encounter_id = $2::text AND source_entity_id = $3) AS "consumptions",
         (SELECT COUNT(*)::int FROM billing_items
           WHERE account_id = $1 AND encounter_id = $4::uuid
             AND source_entity_type = 'inventory_consumption') AS "billingItems",
         (SELECT on_hand_quantity::float8 FROM inventory_items
           WHERE account_id = $1 AND id = $5) AS "onHand",
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND operation = 'POST /inventory/consumptions'
             AND idempotency_key = $6 AND status = 'completed') AS "completedIdempotency"`,
      [ACCOUNT_B, ENCOUNTER_B, stayId, ENCOUNTER_B, ITEM_B, idempotencyKey]
    );

    expect(state.rows[0]).toEqual({
      consumptions: 0,
      billingItems: 0,
      onHand: 10,
      completedIdempotency: 0
    });

    await expect(insertCrossTenantInventoryConsumption(stayId as string)).rejects.toMatchObject({
      code: '23503'
    });

    const crossTenantState = await getTestPool().query<{ readonly consumptions: number }>(
      `SELECT COUNT(*)::int AS consumptions
         FROM inventory_consumptions
        WHERE account_id = $1 AND encounter_id = $2::text`,
      [ACCOUNT_A, ENCOUNTER_A]
    );
    expect(crossTenantState.rows[0]?.consumptions).toBe(3);
  });
});
