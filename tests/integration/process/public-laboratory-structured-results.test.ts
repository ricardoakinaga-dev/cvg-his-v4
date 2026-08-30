import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createServer, type AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { setAppState } from '../../../apps/api/src/app-state.js';
import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const runtimePassword = `public-lab-process-${suffix}`;
const apiRole = `public_lab_api_${suffix}`;
const workerRole = `public_lab_worker_${suffix}`;
const tenantId = randomUUID();
const accountId = randomUUID();
const otherTenantId = randomUUID();
const otherAccountId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();
const ownerId = randomUUID();
const patientId = randomUUID();
const encounterId = randomUUID();
const professionId = randomUUID();
const staffId = randomUUID();

let apiServer: ApiServer | undefined;
let apiBaseUrl = '';
let fileStoragePath = '';
let accessToken = '';
let otherAccessToken = '';

interface LaboratoryOrderResponse {
  readonly id: string;
  readonly accountId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly examType: string;
  readonly status: string;
  readonly collectionAttempt?: number;
  readonly history?: readonly { readonly eventType: string }[];
  readonly resultValues?: readonly {
    readonly parameter: string;
    readonly value: string;
    readonly unit?: string;
    readonly reference?: string;
    readonly outOfRange?: boolean;
  }[];
  readonly reportedByUserId?: string;
  readonly signedByUserId?: string;
  readonly signatureHash?: string;
  readonly recollectionReason?: string;
  readonly workflowVersion?: number;
}

interface ListResponse {
  readonly items: readonly LaboratoryOrderResponse[];
}

function databaseUrlForRole(role: string): string {
  const url = new URL(TEST_DB_URL);
  url.username = role;
  url.password = runtimePassword;
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
    [role, runtimePassword]
  );
  const sql = result.rows[0]?.sql;
  if (!sql) throw new Error(`failed to create role ${role}`);
  await adminPool.query(sql);
  await adminPool.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(TEST_DB_NAME)} TO ${quoteIdentifier(role)}`
  );
}

async function seedFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status, activated_at)
     VALUES ($1, $2, 'Public laboratory tenant', 'active', now()),
            ($3, $4, 'Public laboratory other tenant', 'active', now())`,
    [
      tenantId,
      `public-lab-${tenantId.slice(0, 8)}`,
      otherTenantId,
      `public-lab-other-${otherTenantId.slice(0, 8)}`
    ]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
     VALUES ($1, $2, $3, 'Public laboratory account', true),
            ($4, $5, $6, 'Public laboratory other account', true)`,
    [
      accountId,
      tenantId,
      `public-lab-account-${accountId.slice(0, 8)}`,
      otherAccountId,
      otherTenantId,
      `public-lab-other-account-${otherAccountId.slice(0, 8)}`
    ]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from the integration database');
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active, principal_kind)
     VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Public Laboratory Signer', true, 'human'),
            ($5, $6, $7, $8, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Public Laboratory Reader', true, 'human')`,
    [
      userId,
      accountId,
      `public-lab-${suffix}`,
      `public-lab-${suffix}@example.test`,
      otherUserId,
      otherAccountId,
      `public-lab-other-${suffix}`,
      `public-lab-other-${suffix}@example.test`
    ]
  );
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $3), ($2, $3)`, [
    userId,
    otherUserId,
    role.rows[0].id
  ]);
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Public Laboratory Owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Public Laboratory Patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id, reason)
     VALUES ($1, $2, $3, $4, 'open', $5, 'Public laboratory structured-results process proof')`,
    [encounterId, accountId, patientId, ownerId, userId]
  );
  await pool.query(
    `INSERT INTO professions (id, account_id, code, name, is_active)
     VALUES ($1, $2, 'LAB-PROCESS', 'Public laboratory technician', true)`,
    [professionId, accountId]
  );
  await pool.query(
    `INSERT INTO staff (id, account_id, user_id, employee_code, full_name, department, job_title, profession_id, is_active)
     VALUES ($1, $2, $3, 'LAB-PROCESS-001', 'Public Laboratory Signer', 'Laboratory', 'Technician', $4, true)`,
    [staffId, accountId, userId, professionId]
  );
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<{
  readonly status: number;
  readonly body: T | undefined;
  readonly text: string;
}> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  const text = await response.text();
  return {
    status: response.status,
    body: text ? (JSON.parse(text) as T) : undefined,
    text
  };
}

function headers(
  token: string,
  requestAccountId: string,
  requestTenantId: string,
  idempotencyKey?: string
): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-id': requestTenantId,
    'x-account-id': requestAccountId,
    'content-type': 'application/json',
    ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {})
  };
}

async function login(username: string): Promise<string> {
  const response = await requestJson<{ readonly accessToken: string }>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'seed_admin' })
  });
  if (response.status !== 200 || !response.body?.accessToken) {
    throw new Error(`public laboratory login failed: ${response.status} ${response.text}`);
  }
  return response.body.accessToken;
}

describe('public authenticated laboratory structured-results process', () => {
  const pool = getTestPool();

  beforeAll(async () => {
    await createLoginRole(apiRole);
    await createLoginRole(workerRole);
    const client = await pool.connect();
    try {
      await reconcileRuntimeRoles(client, { apiRole, workerRole });
    } finally {
      client.release();
    }

    const runtimeRoles = await getAdminPool().query<{
      readonly rolname: string;
      readonly rolsuper: boolean;
      readonly rolbypassrls: boolean;
      readonly rolinherit: boolean;
      readonly rolcanlogin: boolean;
      readonly rolcreaterole: boolean;
      readonly rolcreatedb: boolean;
      readonly rolreplication: boolean;
    }>(
      `SELECT rolname, rolsuper, rolbypassrls, rolinherit, rolcanlogin,
              rolcreaterole, rolcreatedb, rolreplication
         FROM pg_roles
        WHERE rolname IN ($1, $2)
        ORDER BY rolname`,
      [apiRole, workerRole]
    );
    expect(runtimeRoles.rows).toHaveLength(2);
    for (const role of runtimeRoles.rows) {
      expect(role).toMatchObject({
        rolsuper: false,
        rolbypassrls: false,
        rolinherit: false,
        rolcanlogin: true,
        rolcreaterole: false,
        rolcreatedb: false,
        rolreplication: false
      });
    }

    await seedFixture();
    const bootstrap = await bootstrapServices({
      databaseUrl: databaseUrlForRole(apiRole),
      environment: 'test',
      fileStoragePath: (fileStoragePath = mkdtempSync('/tmp/cvg-public-lab-process-')),
      maxRetries: 10,
      retryDelayMs: 100
    });
    if (!bootstrap.databaseHealthy || !bootstrap.unitOfWork) {
      throw new Error(`public laboratory API bootstrap failed: ${bootstrap.databaseDetail}`);
    }
    setAppState({
      persistenceMode: 'database',
      databaseConfigured: true,
      databaseHealthy: true,
      databaseDetail: bootstrap.databaseDetail,
      repositoriesReady: true,
      repositoryCount: Object.values(bootstrap.repositories).filter(Boolean).length,
      workerReady: true,
      workerDetail: 'Public laboratory structured-results process fixture',
      productionReady: true,
      initialized: true
    });
    apiServer = createApiServer({
      appName: 'public-laboratory-process-test',
      environment: 'test',
      version: '0.1.0',
      authSecret: `public-lab-auth-${suffix}`,
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage,
      unitOfWork: bootstrap.unitOfWork,
      preserveSeedUsersWithRepository: false,
      preserveSeedMasterDataWithRepository: false,
      pixMockMode: true,
      emailMockMode: true,
      smsMockMode: true,
      googleCalendarMockMode: true
    });
    await apiServer.ready;
    await new Promise<void>((resolveListen) =>
      apiServer?.listen(0, '127.0.0.1', () => resolveListen())
    );
    const address = apiServer.address() as AddressInfo | null;
    if (!address) throw new Error('public laboratory API did not expose a port');
    apiBaseUrl = `http://127.0.0.1:${address.port}`;
    accessToken = await login(`public-lab-${suffix}`);
    otherAccessToken = await login(`public-lab-other-${suffix}`);
  }, 120_000);

  afterAll(async () => {
    if (apiServer?.listening) {
      await new Promise<void>((resolveClose, reject) => {
        apiServer?.close((error) => (error ? reject(error) : resolveClose()));
      });
    }
    await shutdownServices().catch(() => undefined);
    if (fileStoragePath) rmSync(fileStoragePath, { recursive: true, force: true });
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [accountId, otherAccountId]);
    const adminPool = getAdminPool();
    await pool
      .query(
        `REASSIGN OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)} TO CURRENT_USER`
      )
      .catch(() => undefined);
    await pool
      .query(`DROP OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`)
      .catch(() => undefined);
    await adminPool
      .query(
        `REVOKE cvg_installer FROM ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
      )
      .catch(() => undefined);
    await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`);
    await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`);
  }, 30_000);

  it('persists and projects a signed structured result with idempotency, isolation and recollection clearing', async () => {
    const created = await requestJson<LaboratoryOrderResponse>('/laboratory/orders', {
      method: 'POST',
      headers: headers(accessToken, accountId, tenantId),
      body: JSON.stringify({
        encounterId,
        patientId,
        examType: 'BIO',
        examCatalogId: 'cat_002',
        reason: 'Public analytical result process proof'
      })
    });
    expect(created.status, created.text).toBe(201);
    expect(created.body).toMatchObject({
      accountId,
      encounterId,
      patientId,
      examType: 'BIO',
      status: 'requested'
    });
    const orderId = created.body?.id;
    if (!orderId) throw new Error('public laboratory order did not return an id');

    const transition = async (
      status: string,
      body: Record<string, unknown>,
      idempotencyKey: string
    ) =>
      requestJson<LaboratoryOrderResponse>(`/laboratory/orders/${orderId}/result`, {
        method: 'POST',
        headers: headers(accessToken, accountId, tenantId, idempotencyKey),
        body: JSON.stringify({ status, ...body })
      });

    const collected = await transition('collected', {}, `public-lab-collect-${suffix}`);
    expect(collected.status, collected.text).toBe(200);
    expect(collected.body).toMatchObject({
      status: 'collected',
      collectionAttempt: 1
    });

    const analyzed = await transition('in_analysis', {}, `public-lab-analysis-${suffix}`);
    expect(analyzed.status, analyzed.text).toBe(200);
    expect(analyzed.body).toMatchObject({ status: 'in_analysis' });

    const resultValues = [
      {
        parameter: 'ALT',
        value: '92',
        unit: 'U/L',
        reference: '10-125 U/L',
        outOfRange: false
      }
    ];
    const forged = await transition(
      'reported',
      {
        resultSummary: 'ALT liberada',
        resultValues,
        signedByUserId: 'forged-user',
        signatureHash: 'forged-signature'
      },
      `public-lab-forged-${suffix}`
    );
    expect(forged.status).toBeGreaterThanOrEqual(400);

    const reported = await transition(
      'reported',
      { resultSummary: 'ALT liberada', resultValues },
      `public-lab-report-${suffix}`
    );
    expect(reported.status, reported.text).toBe(200);
    expect(reported.body).toMatchObject({
      status: 'reported',
      reportedByUserId: userId,
      signedByUserId: userId,
      resultValues,
      signatureHash: expect.stringMatching(/^[a-f0-9]{64}$/)
    });
    const reportedHistoryLength = reported.body?.history?.length;
    if (reportedHistoryLength === undefined)
      throw new Error('reported workflow history is missing');

    const replayed = await transition(
      'reported',
      { resultSummary: 'ALT liberada', resultValues },
      `public-lab-report-${suffix}`
    );
    expect(replayed.status, replayed.text).toBe(200);
    expect(replayed.body).toMatchObject({
      status: 'reported',
      resultValues,
      reportedByUserId: userId,
      signedByUserId: userId
    });
    expect(replayed.body?.history).toHaveLength(reportedHistoryLength);

    const persisted = await pool.query<{
      readonly status: string;
      readonly collectionAttempt: number;
      readonly resultValues: unknown;
      readonly reportedByUserId: string | null;
      readonly signedByUserId: string | null;
      readonly signatureHash: string | null;
    }>(
      `SELECT status, collection_attempt AS "collectionAttempt", result_values AS "resultValues",
              reported_by_user_id AS "reportedByUserId", signed_by_user_id AS "signedByUserId",
              signature_hash AS "signatureHash"
         FROM diagnostic_order_workflows
        WHERE account_id = $1 AND order_id = $2`,
      [accountId, orderId]
    );
    expect(persisted.rows).toHaveLength(1);
    expect(persisted.rows[0]).toMatchObject({
      status: 'reported',
      collectionAttempt: 1,
      resultValues,
      reportedByUserId: userId,
      signedByUserId: userId,
      signatureHash: expect.stringMatching(/^[a-f0-9]{64}$/)
    });

    const reportEvents = await pool.query<{ readonly count: number }>(
      `SELECT COUNT(*)::int AS count
         FROM diagnostic_order_workflow_events
        WHERE account_id = $1 AND order_id = $2 AND event_type = 'reported'`,
      [accountId, orderId]
    );
    expect(reportEvents.rows[0]?.count).toBe(1);

    for (const path of ['/laboratory/biochemistry?body=ALT', '/laboratory/results?body=ALT']) {
      const list = await requestJson<ListResponse>(path, {
        headers: headers(accessToken, accountId, tenantId)
      });
      expect(list.status, list.text).toBe(200);
      expect(list.body?.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: orderId,
            examType: 'BIO',
            resultValues
          })
        ])
      );
    }

    const recollected = await requestJson<LaboratoryOrderResponse>(
      `/laboratory/orders/${orderId}/recollect`,
      {
        method: 'POST',
        headers: headers(accessToken, accountId, tenantId, `public-lab-recollect-${suffix}`),
        body: JSON.stringify({ reason: 'Amostra inadequada para nova coleta' })
      }
    );
    expect(recollected.status, recollected.text).toBe(200);
    expect(recollected.body).toMatchObject({
      status: 'collected',
      collectionAttempt: 2,
      recollectionReason: 'Amostra inadequada para nova coleta'
    });
    expect(recollected.body?.resultValues).toBeUndefined();

    const recollectedWorkflow = await pool.query<{
      readonly status: string;
      readonly collectionAttempt: number;
      readonly resultValues: unknown;
      readonly signedByUserId: string | null;
      readonly signatureHash: string | null;
      readonly recollectionReason: string | null;
    }>(
      `SELECT status, collection_attempt AS "collectionAttempt", result_values AS "resultValues",
              signed_by_user_id AS "signedByUserId", signature_hash AS "signatureHash",
              recollection_reason AS "recollectionReason"
         FROM diagnostic_order_workflows
        WHERE account_id = $1 AND order_id = $2`,
      [accountId, orderId]
    );
    expect(recollectedWorkflow.rows).toEqual([
      {
        status: 'collected',
        collectionAttempt: 2,
        resultValues: null,
        signedByUserId: null,
        signatureHash: null,
        recollectionReason: 'Amostra inadequada para nova coleta'
      }
    ]);

    const eventHistory = await pool.query<{ readonly eventType: string }>(
      `SELECT event_type AS "eventType"
         FROM diagnostic_order_workflow_events
        WHERE account_id = $1 AND order_id = $2
        ORDER BY occurred_at ASC, id ASC`,
      [accountId, orderId]
    );
    expect(eventHistory.rows.map((event) => event.eventType)).toEqual([
      'collected',
      'in_analysis',
      'reported',
      'recollected'
    ]);

    const afterRecollection = await requestJson<ListResponse>('/laboratory/biochemistry?body=ALT', {
      headers: headers(accessToken, accountId, tenantId)
    });
    expect(afterRecollection.status, afterRecollection.text).toBe(200);
    expect(afterRecollection.body?.items.some((item) => item.id === orderId)).toBe(false);

    const otherResults = await requestJson<ListResponse>('/laboratory/results?body=ALT', {
      headers: headers(otherAccessToken, otherAccountId, otherTenantId)
    });
    expect(otherResults.status, otherResults.text).toBe(200);
    expect(otherResults.body?.items).toEqual([]);

    const crossAccountOrder = await requestJson<unknown>(`/laboratory/orders/${orderId}`, {
      headers: headers(otherAccessToken, otherAccountId, otherTenantId)
    });
    expect(crossAccountOrder.status).toBe(404);
  }, 90_000);
});
