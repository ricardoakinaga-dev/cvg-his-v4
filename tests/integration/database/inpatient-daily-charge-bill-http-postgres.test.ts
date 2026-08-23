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

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID();
const USER_ID = randomUUID();
const OWNER_ID = randomUUID();
const PATIENT_ID = randomUUID();
const ENCOUNTER_ID = randomUUID();
const STAY_ID = randomUUID();
const DAILY_CHARGE_ID = randomUUID();
const ROLLBACK_ENCOUNTER_ID = randomUUID();
const ROLLBACK_STAY_ID = randomUUID();
const ROLLBACK_CHARGE_ID = randomUUID();
const CONCURRENT_ENCOUNTER_ID = randomUUID();
const CONCURRENT_STAY_ID = randomUUID();
const CONCURRENT_CHARGE_ID = randomUUID();
const USERNAME = `daily-http-${USER_ID.slice(0, 8)}`;
const EMAIL = `${USERNAME}@example.com`;
const ROLLBACK_CONSTRAINT = 'daily_charge_http_rollback_status_guard';

let server: ApiServer | undefined;
let baseUrl = '';
let accessToken = '';

interface LoginResponse {
  readonly accessToken: string;
}

interface DailyChargeResponse {
  readonly id: string;
  readonly stayId: string;
  readonly status: string;
  readonly billingRecordId?: string;
}

async function requestJson<T>(path: string, init: RequestInit = {}) {
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
    'x-account-id': ACCOUNT_ID
  };
}

async function postBill(
  stayId: string,
  chargeId: string,
  idempotencyKey: string,
  body: Record<string, unknown> = {}
): Promise<{ status: number; body?: DailyChargeResponse & { readonly code?: string }; text: string }> {
  return requestJson<DailyChargeResponse & { readonly code?: string }>(
    `/inpatient/${stayId}/daily-charges/${chargeId}/bill`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey
      },
      body: JSON.stringify(body)
    }
  );
}

async function insertStayCharge(
  encounterId: string,
  stayId: string,
  chargeId: string,
  description: string
): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO encounters (
       id, account_id, patient_id, owner_id, status, opened_by_user_id
     ) VALUES ($1, $2, $3, $4, 'open', $5)`,
    [encounterId, ACCOUNT_ID, PATIENT_ID, OWNER_ID, USER_ID]
  );
  await pool.query(
    `INSERT INTO inpatient_stays (
       id, account_id, patient_id, owner_id, encounter_id, status, unit, ward, bed,
       admitted_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, 'admitted', 'Internacao', 'Ala A', $6, $7)`,
    [stayId, ACCOUNT_ID, PATIENT_ID, OWNER_ID, encounterId, `A-${stayId.slice(0, 4)}`, USER_ID]
  );
  await pool.query(
    `INSERT INTO inpatient_daily_charges (
       id, account_id, stay_id, encounter_id, patient_id, description, charge_date,
       quantity, unit_amount, total_amount, status, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 1, 180, 180,
       'pending', $7, clock_timestamp(), clock_timestamp())`,
    [chargeId, ACCOUNT_ID, stayId, encounterId, PATIENT_ID, description, USER_ID]
  );
}

async function seedFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, 'Daily charge HTTP tenant', 'active')`,
    [TENANT_ID, `daily-http-tenant-${TENANT_ID.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Daily charge HTTP account')`,
    [ACCOUNT_ID, TENANT_ID, `daily-http-account-${ACCOUNT_ID.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name, is_active
     ) VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Daily HTTP Operator', true)`,
    [USER_ID, ACCOUNT_ID, USERNAME, EMAIL]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from the test seed');
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [USER_ID, role.rows[0].id]);
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Daily HTTP Owner')`,
    [OWNER_ID, ACCOUNT_ID]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Daily HTTP Patient', 'canine')`,
    [PATIENT_ID, ACCOUNT_ID, OWNER_ID]
  );
  await insertStayCharge(ENCOUNTER_ID, STAY_ID, DAILY_CHARGE_ID, 'Diaria HTTP');
  await insertStayCharge(
    ROLLBACK_ENCOUNTER_ID,
    ROLLBACK_STAY_ID,
    ROLLBACK_CHARGE_ID,
    'Diaria HTTP rollback'
  );
  await insertStayCharge(
    CONCURRENT_ENCOUNTER_ID,
    CONCURRENT_STAY_ID,
    CONCURRENT_CHARGE_ID,
    'Diaria HTTP concorrente'
  );
}

beforeAll(async () => {
  await seedFixture();
  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-daily-http-')),
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
    workerDetail: 'Daily-charge HTTP integration test runtime',
    productionReady: true,
    initialized: true
  });

  server = createApiServer({
    appName: 'daily-charge-http-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'daily-charge-http-test-secret',
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

  const login = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: 'seed_admin' })
  });
  if (login.status !== 200 || !login.body?.accessToken) {
    throw new Error(`Daily-charge HTTP fixture login failed: ${login.status} ${login.text}`);
  }
  accessToken = login.body.accessToken;
});

afterAll(async () => {
  const pool = getTestPool();
  await pool.query(`ALTER TABLE inpatient_daily_charges DROP CONSTRAINT IF EXISTS ${ROLLBACK_CONSTRAINT}`);
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await shutdownServices();
});

describe('inpatient daily-charge HTTP PostgreSQL boundary', () => {
  it('commits, replays and conflicts through the published tenant command boundary', async () => {
    const idempotencyKey = randomUUID();
    const first = await postBill(STAY_ID, DAILY_CHARGE_ID, idempotencyKey);
    const replay = await postBill(STAY_ID, DAILY_CHARGE_ID, idempotencyKey);
    const conflict = await postBill(STAY_ID, DAILY_CHARGE_ID, idempotencyKey, {
      billingRecordId: randomUUID()
    });

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ stayId: STAY_ID, id: DAILY_CHARGE_ID, status: 'billed' });
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    expect(conflict.status).toBe(409);

    const state = await getTestPool().query<{
      readonly billingItems: number;
      readonly billingRecords: number;
      readonly dailyChargeStatus: string;
      readonly billingRecordId: string | null;
      readonly completedIdempotency: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM billing_items
           WHERE account_id = $1 AND source_entity_type = 'inpatient_daily_charge'
             AND source_entity_id = $2) AS "billingItems",
         (SELECT COUNT(*)::int FROM billing_records
           WHERE account_id = $1 AND encounter_id = $3) AS "billingRecords",
         (SELECT status FROM inpatient_daily_charges
           WHERE account_id = $1 AND id = $2) AS "dailyChargeStatus",
         (SELECT billing_record_id::text FROM inpatient_daily_charges
           WHERE account_id = $1 AND id = $2) AS "billingRecordId",
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND operation = $5
             AND idempotency_key = $4 AND status = 'completed') AS "completedIdempotency"`,
      [ACCOUNT_ID, DAILY_CHARGE_ID, ENCOUNTER_ID, idempotencyKey, `POST /inpatient/${STAY_ID}/daily-charges/${DAILY_CHARGE_ID}/bill`]
    );

    expect(state.rows[0]).toMatchObject({
      billingItems: 1,
      billingRecords: 1,
      dailyChargeStatus: 'billed',
      completedIdempotency: 1
    });
    expect(state.rows[0]?.billingRecordId).toBe(first.body?.billingRecordId);
  });

  it('rolls back billing and clinical linkage when the published command fails', async () => {
    const pool = getTestPool();
    await pool.query(
      `ALTER TABLE inpatient_daily_charges
         ADD CONSTRAINT ${ROLLBACK_CONSTRAINT}
         CHECK (NOT (id::uuid = '${ROLLBACK_CHARGE_ID}'::uuid AND status = 'billed'))`
    );

    const idempotencyKey = randomUUID();
    const response = await postBill(ROLLBACK_STAY_ID, ROLLBACK_CHARGE_ID, idempotencyKey);
    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ code: 'INTERNAL_ERROR' });

    const state = await pool.query<{
      readonly billingItems: number;
      readonly billingRecords: number;
      readonly dailyChargeStatus: string;
      readonly billingRecordId: string | null;
      readonly idempotencyRows: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM billing_items
           WHERE account_id = $1 AND source_entity_type = 'inpatient_daily_charge'
             AND source_entity_id = $2) AS "billingItems",
         (SELECT COUNT(*)::int FROM billing_records
           WHERE account_id = $1 AND encounter_id = $3) AS "billingRecords",
         (SELECT status FROM inpatient_daily_charges
           WHERE account_id = $1 AND id = $2) AS "dailyChargeStatus",
         (SELECT billing_record_id::text FROM inpatient_daily_charges
           WHERE account_id = $1 AND id = $2) AS "billingRecordId",
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND idempotency_key = $4) AS "idempotencyRows"`,
      [ACCOUNT_ID, ROLLBACK_CHARGE_ID, ROLLBACK_ENCOUNTER_ID, idempotencyKey]
    );

    expect(state.rows[0]).toEqual({
      billingItems: 0,
      billingRecords: 0,
      dailyChargeStatus: 'pending',
      billingRecordId: null,
      idempotencyRows: 0
    });
  });

  it('converges same-key concurrent billing into one item and one idempotency row', async () => {
    const idempotencyKey = randomUUID();
    const [first, second] = await Promise.all([
      postBill(CONCURRENT_STAY_ID, CONCURRENT_CHARGE_ID, idempotencyKey),
      postBill(CONCURRENT_STAY_ID, CONCURRENT_CHARGE_ID, idempotencyKey)
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 200]);
    expect(first.body).toEqual(second.body);

    const state = await getTestPool().query<{
      readonly billingItems: number;
      readonly completedIdempotency: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM billing_items
           WHERE account_id = $1 AND source_entity_type = 'inpatient_daily_charge'
             AND source_entity_id = $2) AS "billingItems",
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND operation = $3
             AND idempotency_key = $4 AND status = 'completed') AS "completedIdempotency"`,
      [
        ACCOUNT_ID,
        CONCURRENT_CHARGE_ID,
        `POST /inpatient/${CONCURRENT_STAY_ID}/daily-charges/${CONCURRENT_CHARGE_ID}/bill`,
        idempotencyKey
      ]
    );

    expect(state.rows[0]).toEqual({ billingItems: 1, completedIdempotency: 1 });
  });
});
