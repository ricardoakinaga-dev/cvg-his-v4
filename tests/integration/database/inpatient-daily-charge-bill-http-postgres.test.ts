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
const CROSS_TENANT_ENCOUNTER_ID = randomUUID();
const CROSS_TENANT_STAY_ID = randomUUID();
const CROSS_TENANT_CHARGE_ID = randomUUID();
const FOREIGN_TENANT_ID = randomUUID();
const FOREIGN_ACCOUNT_ID = randomUUID();
const FOREIGN_USER_ID = randomUUID();
const FOREIGN_OWNER_ID = randomUUID();
const FOREIGN_PATIENT_ID = randomUUID();
const FOREIGN_ENCOUNTER_ID = randomUUID();
const FOREIGN_STAY_ID = randomUUID();
const FOREIGN_CHARGE_ID = randomUUID();
const USERNAME = `daily-http-${USER_ID.slice(0, 8)}`;
const EMAIL = `${USERNAME}@example.com`;
const FOREIGN_USERNAME = `daily-http-foreign-${FOREIGN_USER_ID.slice(0, 8)}`;
const FOREIGN_EMAIL = `${FOREIGN_USERNAME}@example.com`;
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

interface TenantFixture {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly ownerId: string;
  readonly patientId: string;
  readonly username: string;
  readonly email: string;
  readonly accessToken: string;
}

let foreignFixture: TenantFixture = {
  tenantId: FOREIGN_TENANT_ID,
  accountId: FOREIGN_ACCOUNT_ID,
  userId: FOREIGN_USER_ID,
  ownerId: FOREIGN_OWNER_ID,
  patientId: FOREIGN_PATIENT_ID,
  username: FOREIGN_USERNAME,
  email: FOREIGN_EMAIL,
  accessToken: ''
};

async function requestJson<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  return {
    status: response.status,
    body: text.length > 0 ? (JSON.parse(text) as T) : undefined,
    text
  };
}

function authHeadersFor(
  fixture: Pick<TenantFixture, 'tenantId' | 'accountId' | 'accessToken'>,
  spoof?: Pick<TenantFixture, 'tenantId' | 'accountId'>
): HeadersInit {
  return {
    authorization: `Bearer ${fixture.accessToken}`,
    'x-tenant-id': spoof?.tenantId ?? fixture.tenantId,
    'x-account-id': spoof?.accountId ?? fixture.accountId
  };
}

function authHeaders(): HeadersInit {
  return authHeadersFor({
    tenantId: TENANT_ID,
    accountId: ACCOUNT_ID,
    accessToken
  });
}

async function postBill(
  stayId: string,
  chargeId: string,
  idempotencyKey: string,
  body: Record<string, unknown> = {}
): Promise<{
  status: number;
  body?: DailyChargeResponse & { readonly code?: string };
  text: string;
}> {
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

async function postBillAs(
  fixture: Pick<TenantFixture, 'tenantId' | 'accountId' | 'accessToken'>,
  stayId: string,
  chargeId: string,
  idempotencyKey: string,
  body: Record<string, unknown> = {},
  spoof?: Pick<TenantFixture, 'tenantId' | 'accountId'>
): Promise<{
  status: number;
  body?: DailyChargeResponse & { readonly code?: string };
  text: string;
}> {
  return requestJson<DailyChargeResponse & { readonly code?: string }>(
    `/inpatient/${stayId}/daily-charges/${chargeId}/bill`,
    {
      method: 'POST',
      headers: {
        ...authHeadersFor(fixture, spoof),
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
  return insertStayChargeFor(
    {
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      ownerId: OWNER_ID,
      userId: USER_ID
    },
    encounterId,
    stayId,
    chargeId,
    description
  );
}

async function insertStayChargeFor(
  fixture: Pick<TenantFixture, 'accountId' | 'patientId' | 'ownerId' | 'userId'>,
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
    [encounterId, fixture.accountId, fixture.patientId, fixture.ownerId, fixture.userId]
  );
  await pool.query(
    `INSERT INTO inpatient_stays (
       id, account_id, patient_id, owner_id, encounter_id, status, unit, ward, bed,
       admitted_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, 'admitted', 'Internacao', 'Ala A', $6, $7)`,
    [
      stayId,
      fixture.accountId,
      fixture.patientId,
      fixture.ownerId,
      encounterId,
      `A-${stayId.slice(0, 4)}`,
      fixture.userId
    ]
  );
  await pool.query(
    `INSERT INTO inpatient_daily_charges (
       id, account_id, stay_id, encounter_id, patient_id, description, charge_date,
       quantity, unit_amount, total_amount, status, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 1, 180, 180,
       'pending', $7, clock_timestamp(), clock_timestamp())`,
    [
      chargeId,
      fixture.accountId,
      stayId,
      encounterId,
      fixture.patientId,
      description,
      fixture.userId
    ]
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
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    USER_ID,
    role.rows[0].id
  ]);
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
  await insertStayCharge(
    CROSS_TENANT_ENCOUNTER_ID,
    CROSS_TENANT_STAY_ID,
    CROSS_TENANT_CHARGE_ID,
    'Diaria HTTP isolamento'
  );
}

async function seedForeignFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, 'Daily charge HTTP foreign tenant', 'active')`,
    [FOREIGN_TENANT_ID, `daily-http-foreign-tenant-${FOREIGN_TENANT_ID.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Daily charge HTTP foreign account')`,
    [
      FOREIGN_ACCOUNT_ID,
      FOREIGN_TENANT_ID,
      `daily-http-foreign-account-${FOREIGN_ACCOUNT_ID.slice(0, 8)}`
    ]
  );
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name, is_active
     ) VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Foreign Daily HTTP Operator', true)`,
    [FOREIGN_USER_ID, FOREIGN_ACCOUNT_ID, FOREIGN_USERNAME, FOREIGN_EMAIL]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from the foreign test seed');
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    FOREIGN_USER_ID,
    role.rows[0].id
  ]);
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Foreign Daily HTTP Owner')`,
    [FOREIGN_OWNER_ID, FOREIGN_ACCOUNT_ID]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Foreign Daily HTTP Patient', 'feline')`,
    [FOREIGN_PATIENT_ID, FOREIGN_ACCOUNT_ID, FOREIGN_OWNER_ID]
  );
  await insertStayChargeFor(
    {
      accountId: FOREIGN_ACCOUNT_ID,
      patientId: FOREIGN_PATIENT_ID,
      ownerId: FOREIGN_OWNER_ID,
      userId: FOREIGN_USER_ID
    },
    FOREIGN_ENCOUNTER_ID,
    FOREIGN_STAY_ID,
    FOREIGN_CHARGE_ID,
    'Diaria HTTP tenant B'
  );
}

beforeAll(async () => {
  await seedFixture();
  await seedForeignFixture();
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

  const foreignLogin = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: FOREIGN_USERNAME, password: 'seed_admin' })
  });
  if (foreignLogin.status !== 200 || !foreignLogin.body?.accessToken) {
    throw new Error(
      `Foreign daily-charge HTTP fixture login failed: ${foreignLogin.status} ${foreignLogin.text}`
    );
  }
  foreignFixture = { ...foreignFixture, accessToken: foreignLogin.body.accessToken };
});

afterAll(async () => {
  const pool = getTestPool();
  await pool.query(
    `ALTER TABLE inpatient_daily_charges DROP CONSTRAINT IF EXISTS ${ROLLBACK_CONSTRAINT}`
  );
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
      [
        ACCOUNT_ID,
        DAILY_CHARGE_ID,
        ENCOUNTER_ID,
        idempotencyKey,
        `POST /inpatient/${STAY_ID}/daily-charges/${DAILY_CHARGE_ID}/bill`
      ]
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
         CHECK (NOT (id = '${ROLLBACK_CHARGE_ID}' AND status = 'billed'))`
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

  it('keeps inpatient reads, writes and idempotency scoped to the bearer tenant', async () => {
    const spoofedPrimaryHeaders = { tenantId: TENANT_ID, accountId: ACCOUNT_ID };
    const foreignKey = randomUUID();
    const foreignOperation = `POST /inpatient/${FOREIGN_STAY_ID}/daily-charges/${FOREIGN_CHARGE_ID}/bill`;
    const foreignSuccess = await postBillAs(
      foreignFixture,
      FOREIGN_STAY_ID,
      FOREIGN_CHARGE_ID,
      foreignKey,
      {},
      spoofedPrimaryHeaders
    );

    expect(foreignSuccess.status).toBe(200);
    expect(foreignSuccess.body).toMatchObject({
      stayId: FOREIGN_STAY_ID,
      id: FOREIGN_CHARGE_ID,
      status: 'billed'
    });

    const worklist = await requestJson<{ readonly items: readonly DailyChargeResponse[] }>(
      '/inpatient/daily-charges/worklist',
      {
        headers: {
          ...authHeadersFor(foreignFixture, spoofedPrimaryHeaders)
        }
      }
    );
    expect(worklist.status).toBe(200);
    expect(worklist.body?.items.map((item) => item.id)).toContain(FOREIGN_CHARGE_ID);
    expect(worklist.body?.items.map((item) => item.id)).not.toContain(CROSS_TENANT_CHARGE_ID);

    const hiddenRead = await requestJson<{ readonly code?: string }>(
      `/inpatient/${CROSS_TENANT_STAY_ID}/daily-charges`,
      {
        headers: {
          ...authHeadersFor(foreignFixture, spoofedPrimaryHeaders)
        }
      }
    );
    expect(hiddenRead.status).toBe(404);

    const deniedKey = randomUUID();
    const deniedOperation = `POST /inpatient/${CROSS_TENANT_STAY_ID}/daily-charges/${CROSS_TENANT_CHARGE_ID}/bill`;
    const deniedWrite = await postBillAs(
      foreignFixture,
      CROSS_TENANT_STAY_ID,
      CROSS_TENANT_CHARGE_ID,
      deniedKey,
      {},
      spoofedPrimaryHeaders
    );
    expect(deniedWrite.status).toBe(404);

    const state = await getTestPool().query<{
      readonly foreignBillingItems: number;
      readonly foreignChargeStatus: string;
      readonly primaryBillingItems: number;
      readonly primaryChargeStatus: string;
      readonly foreignCompletedIdempotency: number;
      readonly deniedIdempotencyRows: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM billing_items
           WHERE account_id = $1 AND source_entity_type = 'inpatient_daily_charge'
             AND source_entity_id = $2) AS "foreignBillingItems",
         (SELECT status FROM inpatient_daily_charges
           WHERE account_id = $1 AND id = $2) AS "foreignChargeStatus",
         (SELECT COUNT(*)::int FROM billing_items
           WHERE account_id = $3 AND source_entity_type = 'inpatient_daily_charge'
             AND source_entity_id = $4) AS "primaryBillingItems",
         (SELECT status FROM inpatient_daily_charges
           WHERE account_id = $3 AND id = $4) AS "primaryChargeStatus",
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND operation = $5
             AND idempotency_key = $6 AND status = 'completed') AS "foreignCompletedIdempotency",
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND operation = $7
             AND idempotency_key = $8) AS "deniedIdempotencyRows"`,
      [
        FOREIGN_ACCOUNT_ID,
        FOREIGN_CHARGE_ID,
        ACCOUNT_ID,
        CROSS_TENANT_CHARGE_ID,
        foreignOperation,
        foreignKey,
        deniedOperation,
        deniedKey
      ]
    );

    expect(state.rows[0]).toEqual({
      foreignBillingItems: 1,
      foreignChargeStatus: 'billed',
      primaryBillingItems: 0,
      primaryChargeStatus: 'pending',
      foreignCompletedIdempotency: 1,
      deniedIdempotencyRows: 0
    });
  });
});
