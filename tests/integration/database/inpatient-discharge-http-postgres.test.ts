import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setAppState } from '../../../apps/api/src/app-state.js';
import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { DatabaseDischargeRepository } from '../../../packages/modules/discharges/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID();
const USER_ID = randomUUID();
const OWNER_ID = randomUUID();
const PATIENT_ID = randomUUID();
const ENCOUNTER_ID = randomUUID();
const STAY_ID = randomUUID();
const ROLLBACK_ENCOUNTER_ID = randomUUID();
const ROLLBACK_STAY_ID = randomUUID();
const CONCURRENT_ENCOUNTER_ID = randomUUID();
const CONCURRENT_STAY_ID = randomUUID();
const DETAIL_ENCOUNTER_ID = randomUUID();
const DETAIL_STAY_ID = randomUUID();
const FOREIGN_TENANT_ID = randomUUID();
const FOREIGN_ACCOUNT_ID = randomUUID();
const FOREIGN_USER_ID = randomUUID();
const FOREIGN_OWNER_ID = randomUUID();
const FOREIGN_PATIENT_ID = randomUUID();
const FOREIGN_ENCOUNTER_ID = randomUUID();
const FOREIGN_STAY_ID = randomUUID();
const USERNAME = `discharge-http-${USER_ID.slice(0, 8)}`;
const EMAIL = `${USERNAME}@example.com`;
const FOREIGN_USERNAME = `discharge-http-foreign-${FOREIGN_USER_ID.slice(0, 8)}`;
const FOREIGN_EMAIL = `${FOREIGN_USERNAME}@example.com`;
const ROLLBACK_CONSTRAINT = 'inpatient_discharge_http_rollback_status_guard';

let server: ApiServer | undefined;
let secondaryServer: ApiServer | undefined;
let baseUrl = '';
let secondaryBaseUrl = '';
let accessToken = '';
let foreignAccessToken = '';

interface LoginResponse {
  readonly accessToken: string;
}

interface JsonResponse<T> {
  readonly status: number;
  readonly body?: T;
  readonly text: string;
}

interface DischargeResponse {
  readonly id: string;
  readonly accountId: string;
  readonly encounterId: string;
  readonly dischargeType: string;
  readonly outcome?: string;
  readonly version: number;
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<JsonResponse<T>> {
  return requestJsonAt<T>(baseUrl, path, init);
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

function authHeaders(token: string, tenantId: string, accountId: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'x-account-id': accountId,
    'content-type': 'application/json'
  };
}

async function postDischarge(
  token: string,
  tenantId: string,
  accountId: string,
  encounterId: string,
  idempotencyKey: string,
  body: Record<string, unknown> = { dischargeType: 'inpatient' },
  spoof?: { readonly tenantId: string; readonly accountId: string },
  origin = baseUrl
): Promise<JsonResponse<DischargeResponse & { readonly code?: string }>> {
  return requestJsonAt<DischargeResponse & { readonly code?: string }>(origin, '/discharges', {
    method: 'POST',
    headers: {
      ...authHeaders(token, spoof?.tenantId ?? tenantId, spoof?.accountId ?? accountId),
      'idempotency-key': idempotencyKey
    },
    body: JSON.stringify({ encounterId, ...body })
  });
}

async function seedTenant(input: {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly ownerId: string;
  readonly patientId: string;
  readonly username: string;
  readonly email: string;
  readonly encounterIds: readonly string[];
  readonly stayIds: readonly string[];
}): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, 'Inpatient discharge HTTP tenant', 'active')`,
    [input.tenantId, `discharge-http-tenant-${input.tenantId.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Inpatient discharge HTTP account')`,
    [input.accountId, input.tenantId, `discharge-http-account-${input.accountId.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name, is_active
     ) VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Discharge HTTP Operator', true)`,
    [input.userId, input.accountId, input.username, input.email]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from the test seed');
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    input.userId,
    role.rows[0].id
  ]);
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'Discharge HTTP Owner')`,
    [input.ownerId, input.accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Discharge HTTP Patient', 'canine')`,
    [input.patientId, input.accountId, input.ownerId]
  );
  for (let index = 0; index < input.encounterIds.length; index += 1) {
    await pool.query(
      `INSERT INTO encounters (
         id, account_id, patient_id, owner_id, status, opened_by_user_id
       ) VALUES ($1, $2, $3, $4, 'open', $5)`,
      [input.encounterIds[index], input.accountId, input.patientId, input.ownerId, input.userId]
    );
    await pool.query(
      `INSERT INTO inpatient_stays (
         id, account_id, patient_id, owner_id, encounter_id, status, unit, ward, bed,
         admitted_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, 'admitted', 'Internacao', 'Ala A', $6, $7)`,
      [
        input.stayIds[index],
        input.accountId,
        input.patientId,
        input.ownerId,
        input.encounterIds[index],
        `A-${input.stayIds[index].slice(0, 4)}`,
        input.userId
      ]
    );
  }
}

beforeAll(async () => {
  await seedTenant({
    tenantId: TENANT_ID,
    accountId: ACCOUNT_ID,
    userId: USER_ID,
    ownerId: OWNER_ID,
    patientId: PATIENT_ID,
    username: USERNAME,
    email: EMAIL,
    encounterIds: [
      ENCOUNTER_ID,
      ROLLBACK_ENCOUNTER_ID,
      CONCURRENT_ENCOUNTER_ID,
      DETAIL_ENCOUNTER_ID
    ],
    stayIds: [STAY_ID, ROLLBACK_STAY_ID, CONCURRENT_STAY_ID, DETAIL_STAY_ID]
  });
  await seedTenant({
    tenantId: FOREIGN_TENANT_ID,
    accountId: FOREIGN_ACCOUNT_ID,
    userId: FOREIGN_USER_ID,
    ownerId: FOREIGN_OWNER_ID,
    patientId: FOREIGN_PATIENT_ID,
    username: FOREIGN_USERNAME,
    email: FOREIGN_EMAIL,
    encounterIds: [FOREIGN_ENCOUNTER_ID],
    stayIds: [FOREIGN_STAY_ID]
  });

  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-discharge-http-')),
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
    workerDetail: 'Inpatient discharge HTTP integration test runtime',
    productionReady: true,
    initialized: true
  });
  server = createApiServer({
    appName: 'inpatient-discharge-http-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'inpatient-discharge-http-test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage,
    unitOfWork: bootstrap.unitOfWork,
    preserveSeedUsersWithRepository: false,
    preserveSeedMasterDataWithRepository: false
  });
  await server.ready;
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  secondaryServer = createApiServer({
    appName: 'inpatient-discharge-http-test-secondary',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'inpatient-discharge-http-test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage,
    unitOfWork: bootstrap.unitOfWork,
    preserveSeedUsersWithRepository: false,
    preserveSeedMasterDataWithRepository: false
  });
  await secondaryServer.ready;
  await new Promise<void>((resolve) => secondaryServer?.listen(0, '127.0.0.1', () => resolve()));
  secondaryBaseUrl = `http://127.0.0.1:${(secondaryServer.address() as AddressInfo).port}`;

  const login = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: 'seed_admin' })
  });
  if (login.status !== 200 || !login.body?.accessToken)
    throw new Error(`Primary login failed: ${login.text}`);
  accessToken = login.body.accessToken;
  const foreignLogin = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: FOREIGN_USERNAME, password: 'seed_admin' })
  });
  if (foreignLogin.status !== 200 || !foreignLogin.body?.accessToken)
    throw new Error(`Foreign login failed: ${foreignLogin.text}`);
  foreignAccessToken = foreignLogin.body.accessToken;
});

afterAll(async () => {
  const pool = getTestPool();
  await pool.query(`ALTER TABLE inpatient_stays DROP CONSTRAINT IF EXISTS ${ROLLBACK_CONSTRAINT}`);
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

describe('inpatient discharge HTTP PostgreSQL boundary', () => {
  it('closes the stay, replays safely, and blocks post-discharge daily charges', async () => {
    const idempotencyKey = randomUUID();
    const first = await postDischarge(
      accessToken,
      TENANT_ID,
      ACCOUNT_ID,
      ENCOUNTER_ID,
      idempotencyKey
    );
    const replay = await postDischarge(
      accessToken,
      TENANT_ID,
      ACCOUNT_ID,
      ENCOUNTER_ID,
      idempotencyKey
    );
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ encounterId: ENCOUNTER_ID, dischargeType: 'inpatient' });
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);

    const state = await getTestPool().query<{
      readonly discharges: number;
      readonly stayStatus: string;
      readonly dischargedAt: string | null;
      readonly completedIdempotency: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM discharges WHERE account_id = $1 AND encounter_id = $2) AS discharges,
         (SELECT status FROM inpatient_stays WHERE account_id = $1 AND id = $3) AS "stayStatus",
         (SELECT discharged_at::text FROM inpatient_stays WHERE account_id = $1 AND id = $3) AS "dischargedAt",
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND operation = $4 AND idempotency_key = $5 AND status = 'completed') AS "completedIdempotency"`,
      [ACCOUNT_ID, ENCOUNTER_ID, STAY_ID, 'POST /discharges', idempotencyKey]
    );
    expect(state.rows[0]).toMatchObject({
      discharges: 1,
      stayStatus: 'discharged',
      completedIdempotency: 1
    });
    expect(state.rows[0]?.dischargedAt).toBeTruthy();

    const dailyCharge = await requestJson<{ readonly code?: string }>(
      `/inpatient/${STAY_ID}/daily-charges`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(accessToken, TENANT_ID, ACCOUNT_ID),
          'idempotency-key': randomUUID()
        },
        body: JSON.stringify({ description: 'Após alta', unitAmount: 100 })
      }
    );
    expect(dailyCharge.status).toBe(400);
  });

  it('rolls back discharge and stay closure together when the stay update fails', async () => {
    const pool = getTestPool();
    await pool.query(
      `ALTER TABLE inpatient_stays ADD CONSTRAINT ${ROLLBACK_CONSTRAINT}
       CHECK (NOT (id::uuid = '${ROLLBACK_STAY_ID}'::uuid AND status = 'discharged'))`
    );
    const idempotencyKey = randomUUID();
    const response = await postDischarge(
      accessToken,
      TENANT_ID,
      ACCOUNT_ID,
      ROLLBACK_ENCOUNTER_ID,
      idempotencyKey
    );
    expect(response.status).toBe(500);
    const state = await pool.query<{
      readonly discharges: number;
      readonly stayStatus: string;
      readonly idempotencyRows: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM discharges WHERE account_id = $1 AND encounter_id = $2) AS discharges,
         (SELECT status FROM inpatient_stays WHERE account_id = $1 AND id = $3) AS "stayStatus",
         (SELECT COUNT(*)::int FROM idempotency_requests WHERE account_id = $1 AND operation = $4
           AND idempotency_key = $5) AS "idempotencyRows"`,
      [ACCOUNT_ID, ROLLBACK_ENCOUNTER_ID, ROLLBACK_STAY_ID, 'POST /discharges', idempotencyKey]
    );
    expect(state.rows[0]).toMatchObject({
      discharges: 0,
      stayStatus: 'admitted',
      idempotencyRows: 0
    });

    const cachedList = await requestJson<{
      readonly items: readonly DischargeResponse[];
    }>('/discharges', {
      headers: authHeaders(accessToken, TENANT_ID, ACCOUNT_ID)
    });
    expect(cachedList.status).toBe(200);
    expect(cachedList.body?.items.some((item) => item.encounterId === ROLLBACK_ENCOUNTER_ID)).toBe(
      false
    );
  });

  it('maps distinct-key discharge races to one commit and one conflict', async () => {
    const [first, second] = await Promise.all([
      postDischarge(
        accessToken,
        TENANT_ID,
        ACCOUNT_ID,
        CONCURRENT_ENCOUNTER_ID,
        randomUUID(),
        { dischargeType: 'inpatient' },
        undefined,
        baseUrl
      ),
      postDischarge(
        accessToken,
        TENANT_ID,
        ACCOUNT_ID,
        CONCURRENT_ENCOUNTER_ID,
        randomUUID(),
        { dischargeType: 'inpatient' },
        undefined,
        secondaryBaseUrl
      )
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);

    const state = await getTestPool().query<{
      readonly discharges: number;
      readonly stayStatus: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM discharges WHERE account_id = $1 AND encounter_id = $2) AS discharges,
         (SELECT status FROM inpatient_stays WHERE account_id = $1 AND id = $3) AS "stayStatus"`,
      [ACCOUNT_ID, CONCURRENT_ENCOUNTER_ID, CONCURRENT_STAY_ID]
    );
    expect(state.rows[0]).toEqual({ discharges: 1, stayStatus: 'discharged' });
  });

  it('does not use spoofed tenant headers to discharge another account stay', async () => {
    const response = await postDischarge(
      foreignAccessToken,
      FOREIGN_TENANT_ID,
      FOREIGN_ACCOUNT_ID,
      ENCOUNTER_ID,
      randomUUID(),
      { dischargeType: 'inpatient' },
      { tenantId: TENANT_ID, accountId: ACCOUNT_ID }
    );
    expect(response.status).toBe(404);
    const state = await getTestPool().query<{ readonly discharges: number }>(
      `SELECT COUNT(*)::int AS discharges FROM discharges WHERE account_id = $1 AND encounter_id = $2`,
      [ACCOUNT_ID, ENCOUNTER_ID]
    );
    expect(state.rows[0]?.discharges).toBe(1);
  });

  it('rejects a non-inpatient discharge that points at another tenant encounter', async () => {
    const response = await postDischarge(
      foreignAccessToken,
      FOREIGN_TENANT_ID,
      FOREIGN_ACCOUNT_ID,
      ROLLBACK_ENCOUNTER_ID,
      randomUUID(),
      { dischargeType: 'ambulatory' },
      { tenantId: TENANT_ID, accountId: ACCOUNT_ID }
    );
    expect(response.status).toBe(404);

    const state = await getTestPool().query<{ readonly discharges: number }>(
      `SELECT COUNT(*)::int AS discharges FROM discharges WHERE account_id = $1 AND encounter_id = $2`,
      [FOREIGN_ACCOUNT_ID, ROLLBACK_ENCOUNTER_ID]
    );
    expect(state.rows[0]?.discharges).toBe(0);
  });

  it('does not disclose or mutate discharge detail across authenticated accounts', async () => {
    const created = await postDischarge(
      accessToken,
      TENANT_ID,
      ACCOUNT_ID,
      DETAIL_ENCOUNTER_ID,
      randomUUID()
    );
    expect(created.status).toBe(201);
    const dischargeId = created.body?.id;
    expect(dischargeId).toBeTruthy();

    const foreignDetail = await requestJson<DischargeResponse>(`/discharges/${dischargeId}`, {
      headers: authHeaders(foreignAccessToken, TENANT_ID, ACCOUNT_ID)
    });
    expect(foreignDetail.status).toBe(404);

    const foreignPatch = await requestJson<DischargeResponse>(`/discharges/${dischargeId}`, {
      method: 'PATCH',
      headers: authHeaders(foreignAccessToken, TENANT_ID, ACCOUNT_ID),
      body: JSON.stringify({ outcome: 'cross-account mutation' })
    });
    expect(foreignPatch.status).toBe(404);

    const ownerDetail = await requestJson<DischargeResponse>(`/discharges/${dischargeId}`, {
      headers: authHeaders(accessToken, TENANT_ID, ACCOUNT_ID)
    });
    expect(ownerDetail.status).toBe(200);
    expect(ownerDetail.body).toMatchObject({
      id: dischargeId,
      accountId: ACCOUNT_ID,
      encounterId: DETAIL_ENCOUNTER_ID
    });
    expect(ownerDetail.body?.outcome).toBeUndefined();

    const repository = new DatabaseDischargeRepository();
    const ownerContext = {
      tenantId: TENANT_ID,
      accountId: ACCOUNT_ID,
      correlationId: randomUUID()
    };
    const foreignContext = {
      tenantId: FOREIGN_TENANT_ID,
      accountId: FOREIGN_ACCOUNT_ID,
      correlationId: randomUUID()
    };
    const ownerRow = await runWithTenantContext(ownerContext, () =>
      repository.findById(ACCOUNT_ID as never, dischargeId as never)
    );
    expect(ownerRow?.accountId).toBe(ACCOUNT_ID);
    if (!ownerRow) throw new Error('Owner discharge row was not persisted');

    const concurrentUpdates = await Promise.allSettled([
      runWithTenantContext(ownerContext, () =>
        repository.update(
          { ...ownerRow, outcome: 'first atomic update', version: ownerRow.version + 1 },
          ownerRow.version
        )
      ),
      runWithTenantContext(ownerContext, () =>
        repository.update(
          { ...ownerRow, outcome: 'second atomic update', version: ownerRow.version + 1 },
          ownerRow.version
        )
      )
    ]);
    expect(concurrentUpdates.map((result) => result.status).sort()).toEqual([
      'fulfilled',
      'rejected'
    ]);
    const conflict = concurrentUpdates.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    expect(conflict?.reason).toMatchObject({ code: 'CONFLICT' });

    await expect(
      runWithTenantContext(foreignContext, () =>
        repository.create({
          ...ownerRow,
          id: randomUUID() as never,
          accountId: ACCOUNT_ID,
          version: 1,
          outcome: 'incompatible active account'
        })
      )
    ).rejects.toThrow('Discharge not found');

    await expect(
      runWithTenantContext(foreignContext, () =>
        repository.findById(ACCOUNT_ID as never, dischargeId as never)
      )
    ).resolves.toBeNull();
    await expect(
      runWithTenantContext(foreignContext, () =>
        repository.findByEncounterId(ACCOUNT_ID as never, DETAIL_ENCOUNTER_ID as never)
      )
    ).resolves.toBeNull();
    await expect(
      runWithTenantContext(foreignContext, () =>
        repository.update({ ...ownerRow, accountId: FOREIGN_ACCOUNT_ID as never })
      )
    ).rejects.toThrow('Discharge not found');

    await runWithTenantContext(foreignContext, () =>
      repository.delete(FOREIGN_ACCOUNT_ID as never, dischargeId as never)
    );
    await expect(
      runWithTenantContext(ownerContext, () =>
        repository.findById(ACCOUNT_ID as never, dischargeId as never)
      )
    ).resolves.toMatchObject({
      id: dischargeId,
      accountId: ACCOUNT_ID,
      version: ownerRow.version + 1
    });

    const replicaPatch = await requestJsonAt<DischargeResponse>(
      secondaryBaseUrl,
      `/discharges/${dischargeId}`,
      {
        method: 'PATCH',
        headers: authHeaders(accessToken, TENANT_ID, ACCOUNT_ID),
        body: JSON.stringify({
          expectedVersion: ownerRow.version + 1,
          outcome: 'updated on secondary replica'
        })
      }
    );
    expect(replicaPatch.status).toBe(200);
    expect(replicaPatch.body).toMatchObject({
      id: dischargeId,
      accountId: ACCOUNT_ID,
      outcome: 'updated on secondary replica',
      version: ownerRow.version + 2
    });

    const persistedAfterReplicaPatch = await runWithTenantContext(ownerContext, () =>
      repository.findById(ACCOUNT_ID as never, dischargeId as never)
    );
    expect(persistedAfterReplicaPatch).toMatchObject({
      id: dischargeId,
      outcome: 'updated on secondary replica',
      version: ownerRow.version + 2
    });
  });
});
