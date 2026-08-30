import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setAppState } from '../../../apps/api/src/app-state.js';
import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { DatabaseVetusImportLogRepository } from '../../../apps/api/src/repositories/vetus-import-log-repository.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

interface Fixture {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly username: string;
  readonly email: string;
  readonly ownerId?: string;
  readonly patientId?: string;
}

interface LoginResponse {
  readonly accessToken: string;
}

interface JsonResponse<T> {
  readonly status: number;
  readonly body?: T;
  readonly text: string;
}

interface PublicImportSummary {
  readonly id: string;
  readonly ownerId: string;
  readonly patientId: string;
  readonly sourceReference: string | null;
  readonly [key: string]: unknown;
}

interface PublicBatchItem {
  readonly id: string;
  readonly rowNumber: number;
  readonly status: string;
  readonly ownerId: string | null;
  readonly patientId: string | null;
  readonly ownerCreated: boolean;
  readonly patientCreated: boolean;
  readonly [key: string]: unknown;
}

interface PublicBatch {
  readonly id: string;
  readonly status: string;
  readonly importedCount: number;
  readonly linkedCount: number;
  readonly rejectedCount: number;
  readonly rolledBackCount: number;
  readonly [key: string]: unknown;
}

interface BatchResponse {
  readonly batch: PublicBatch;
  readonly items: readonly PublicBatchItem[];
}

interface DomainCounts {
  readonly owners: number;
  readonly patients: number;
  readonly logs: number;
}

const primary: Fixture = {
  tenantId: randomUUID(),
  accountId: randomUUID(),
  userId: randomUUID(),
  username: `vetus-http-${randomUUID().slice(0, 8)}`,
  email: `vetus-http-${randomUUID().slice(0, 8)}@example.test`,
  ownerId: randomUUID(),
  patientId: randomUUID()
};

const foreign: Fixture = {
  tenantId: randomUUID(),
  accountId: randomUUID(),
  userId: randomUUID(),
  username: `vetus-http-foreign-${randomUUID().slice(0, 8)}`,
  email: `vetus-http-foreign-${randomUUID().slice(0, 8)}@example.test`
};

let server: ApiServer | undefined;
let secondaryServer: ApiServer | undefined;
let baseUrl = '';
let secondaryBaseUrl = '';
let accessToken = '';
let foreignAccessToken = '';

async function seedTenant(fixture: Fixture, withExistingPatient: boolean): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status, activated_at)
     VALUES ($1, $2, $3, 'active', now())`,
    [fixture.tenantId, `vetus-http-${fixture.tenantId.slice(0, 8)}`, 'Vetus HTTP tenant']
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
     VALUES ($1, $2, $3, $4, true)`,
    [
      fixture.accountId,
      fixture.tenantId,
      `vetus-http-${fixture.accountId.slice(0, 8)}`,
      'Vetus HTTP account'
    ]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Vetus HTTP operator', true)`,
    [fixture.userId, fixture.accountId, fixture.username, fixture.email]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from the Vetus HTTP fixture');
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    fixture.userId,
    role.rows[0].id
  ]);

  if (withExistingPatient && fixture.ownerId && fixture.patientId) {
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name, address_json)
       VALUES ($1, $2, 'Vetus Existing Owner', '{"status":"active"}'::jsonb)`,
      [fixture.ownerId, fixture.accountId]
    );
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species, alerts_json)
       VALUES ($1, $2, $3, 'Vetus Existing Patient', 'canine', '{"status":"active"}'::jsonb)`,
      [fixture.patientId, fixture.accountId, fixture.ownerId]
    );
  }
}

async function requestJson<T>(
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

function authHeaders(token: string, fixture: Fixture): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-id': fixture.tenantId,
    'x-account-id': fixture.accountId,
    'content-type': 'application/json'
  };
}

async function login(origin: string, username: string): Promise<string> {
  const response = await requestJson<LoginResponse>(origin, '/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'seed_admin' })
  });
  if (response.status !== 200 || !response.body?.accessToken) {
    throw new Error(`Vetus HTTP fixture login failed: ${response.status} ${response.text}`);
  }
  return response.body.accessToken;
}

async function postVetus<T>(
  origin: string,
  token: string,
  fixture: Fixture,
  path: string,
  body: unknown,
  idempotencyKey: string
): Promise<JsonResponse<T>> {
  return requestJson<T>(origin, path, {
    method: 'POST',
    headers: {
      ...authHeaders(token, fixture),
      'idempotency-key': idempotencyKey
    },
    body: JSON.stringify(body)
  });
}

async function domainCounts(accountId: string): Promise<DomainCounts> {
  const result = await getTestPool().query<DomainCounts>(
    `SELECT
       (SELECT COUNT(*)::int FROM owners WHERE account_id = $1) AS owners,
       (SELECT COUNT(*)::int FROM patients WHERE account_id = $1) AS patients,
       (SELECT COUNT(*)::int FROM vetus_import_logs WHERE account_id = $1) AS logs`,
    [accountId]
  );
  return result.rows[0] ?? { owners: 0, patients: 0, logs: 0 };
}

async function listen(api: ApiServer): Promise<string> {
  await api.ready;
  await new Promise<void>((resolve) => api.listen(0, '127.0.0.1', () => resolve()));
  return `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
}

async function close(api: ApiServer | undefined): Promise<void> {
  if (!api?.listening) return;
  await new Promise<void>((resolve, reject) =>
    api.close((error) => (error ? reject(error) : resolve()))
  );
}

beforeAll(async () => {
  await seedTenant(primary, true);
  await seedTenant(foreign, false);

  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-vetus-http-')),
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
    workerDetail: 'Vetus HTTP PostgreSQL integration test runtime',
    productionReady: true,
    initialized: true
  });

  const options = {
    environment: 'test' as const,
    version: '0.1.0',
    authSecret: 'vetus-http-postgres-test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage,
    unitOfWork: bootstrap.unitOfWork,
    preserveSeedUsersWithRepository: false,
    preserveSeedMasterDataWithRepository: false,
    vetusImportLogRepository: new DatabaseVetusImportLogRepository()
  };

  server = createApiServer({ appName: 'vetus-http-postgres-test', ...options });
  baseUrl = await listen(server);
  secondaryServer = createApiServer({ appName: 'vetus-http-postgres-test-secondary', ...options });
  secondaryBaseUrl = await listen(secondaryServer);

  accessToken = await login(baseUrl, primary.username);
  foreignAccessToken = await login(baseUrl, foreign.username);
});

afterAll(async () => {
  await close(secondaryServer);
  await close(server);
  try {
    await getTestPool().query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [
      [primary.accountId, foreign.accountId]
    ]);
  } finally {
    await shutdownServices();
  }
});

describe('Vetus import HTTP PostgreSQL boundary', () => {
  it('applies nullable internal fingerprints and tenant-safe database constraints', async () => {
    const columns = await getTestPool().query<{
      readonly table_name: string;
      readonly is_nullable: string;
      readonly character_maximum_length: number;
    }>(
      `SELECT table_name, is_nullable, character_maximum_length::int
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND column_name = 'request_hash'
         AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [['vetus_import_batches', 'vetus_import_logs']]
    );
    expect(columns.rows).toEqual([
      {
        table_name: 'vetus_import_batches',
        is_nullable: 'YES',
        character_maximum_length: 64
      },
      {
        table_name: 'vetus_import_logs',
        is_nullable: 'YES',
        character_maximum_length: 64
      }
    ]);

    const constraints = await getTestPool().query<{ readonly conname: string }>(
      `SELECT conname
       FROM pg_constraint
       WHERE conname = ANY($1::text[])
       ORDER BY conname`,
      [['vetus_import_batches_request_hash_format', 'vetus_import_logs_request_hash_format']]
    );
    expect(constraints.rows.map((row) => row.conname)).toEqual([
      'vetus_import_batches_request_hash_format',
      'vetus_import_logs_request_hash_format'
    ]);
  });

  it('persists, replays and rejects divergent single imports across API instances', async () => {
    const body = {
      sourceSystem: 'Vetus',
      sourceReference: `single-${primary.accountId.slice(0, 8)}`,
      reviewedBy: 'HTTP operator',
      owner: {
        legacyVetusId: 'vetus-http-owner-1',
        fullName: 'Vetus Imported Owner',
        phone: '+5511900001001'
      },
      patient: {
        legacyVetusId: 'vetus-http-patient-1',
        name: 'Vetus Imported Patient',
        species: 'canine'
      }
    };
    const before = await domainCounts(primary.accountId);
    const createKey = randomUUID();
    const replayKey = randomUUID();
    const conflictKey = randomUUID();

    const first = await postVetus<PublicImportSummary>(
      baseUrl,
      accessToken,
      primary,
      '/vetus-imports',
      body,
      createKey
    );
    expect(first.status).toBe(201);
    expect(first.body).toBeDefined();
    expect(first.body && Object.hasOwn(first.body, 'requestHash')).toBe(false);
    const firstBody = first.body as PublicImportSummary;

    const afterCreate = await domainCounts(primary.accountId);
    expect(afterCreate).toEqual({
      owners: before.owners + 1,
      patients: before.patients + 1,
      logs: before.logs + 1
    });

    const durableList = await requestJson<{ readonly items: readonly PublicImportSummary[] }>(
      secondaryBaseUrl,
      '/vetus-imports',
      { headers: authHeaders(accessToken, primary) }
    );
    expect(durableList.status).toBe(200);
    expect(durableList.body?.items).toHaveLength(1);
    expect(durableList.body?.items[0]?.id).toBe(firstBody.id);
    expect(durableList.body?.items[0] && Object.hasOwn(durableList.body.items[0], 'requestHash')).toBe(
      false
    );

    const replay = await postVetus<PublicImportSummary>(
      secondaryBaseUrl,
      accessToken,
      primary,
      '/vetus-imports',
      body,
      replayKey
    );
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(firstBody);
    expect(await domainCounts(primary.accountId)).toEqual(afterCreate);

    const conflict = await postVetus<{ readonly code?: string }>(
      baseUrl,
      accessToken,
      primary,
      '/vetus-imports',
      {
        ...body,
        patient: { ...body.patient, name: 'Vetus Divergent Patient' }
      },
      conflictKey
    );
    expect(conflict.status).toBe(409);
    expect(conflict.body?.code).toBe('CONFLICT');
    expect(await domainCounts(primary.accountId)).toEqual(afterCreate);

    const persisted = await getTestPool().query<{
      readonly request_hash: string;
      readonly import_audits: number;
      readonly completed_idempotency: number;
      readonly conflict_idempotency: number;
    }>(
      `SELECT
         (SELECT request_hash FROM vetus_import_logs
           WHERE account_id = $1 AND source_system = 'Vetus' AND source_reference = $2) AS request_hash,
         (SELECT COUNT(*)::int FROM audit_events
           WHERE account_id = $1 AND entity_type = 'vetus-import' AND action = 'create') AS import_audits,
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND operation = 'POST /vetus-imports'
             AND status = 'completed' AND idempotency_key = ANY($3::text[])) AS completed_idempotency,
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND operation = 'POST /vetus-imports'
             AND idempotency_key = $4) AS conflict_idempotency`,
      [primary.accountId, body.sourceReference, [createKey, replayKey], conflictKey]
    );
    expect(persisted.rows[0]?.request_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(persisted.rows[0]?.import_audits).toBe(1);
    expect(persisted.rows[0]?.completed_idempotency).toBe(2);
    expect(persisted.rows[0]?.conflict_idempotency).toBe(0);
  });

  it('supports durable dry-run, resume, rollback and cross-tenant isolation', async () => {
    const dryRunBody = {
      sourceSystem: 'Vetus',
      sourceReference: `dry-run-${primary.accountId.slice(0, 8)}`,
      dryRun: true,
      items: [
        {
          owner: { fullName: 'Vetus Dry Run Owner', phone: '+5511900001002' },
          patient: { name: 'Vetus Dry Run Patient', species: 'feline' }
        },
        {
          owner: { fullName: 'Vetus Invalid Owner' },
          patient: { name: 'Vetus Invalid Patient', species: 'canine' }
        }
      ]
    };
    const beforeDryRun = await domainCounts(primary.accountId);
    const dryRun = await postVetus<BatchResponse>(
      baseUrl,
      accessToken,
      primary,
      '/vetus-import-batches',
      dryRunBody,
      randomUUID()
    );
    expect(dryRun.status).toBe(201);
    expect(dryRun.body?.batch.status).toBe('dry_run');
    expect(dryRun.body?.batch.importedCount).toBe(1);
    expect(dryRun.body?.batch.rejectedCount).toBe(1);
    expect(dryRun.body?.items.map((item) => item.status)).toEqual(['validated', 'rejected']);
    expect(dryRun.body?.batch && Object.hasOwn(dryRun.body.batch, 'requestHash')).toBe(false);
    expect(await domainCounts(primary.accountId)).toEqual(beforeDryRun);

    const dryRunPersisted = await getTestPool().query<{
      readonly request_hash: string;
      readonly items: number;
    }>(
      `SELECT b.request_hash, COUNT(i.id)::int AS items
       FROM vetus_import_batches b
       LEFT JOIN vetus_import_batch_items i
         ON i.account_id = b.account_id AND i.batch_id = b.id
       WHERE b.account_id = $1 AND b.source_reference = $2
       GROUP BY b.request_hash`,
      [primary.accountId, dryRunBody.sourceReference]
    );
    expect(dryRunPersisted.rows[0]?.request_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(dryRunPersisted.rows[0]?.items).toBe(2);

    const lifecycleSource = `lifecycle-${primary.accountId.slice(0, 8)}`;
    const partial = await postVetus<BatchResponse>(
      baseUrl,
      accessToken,
      primary,
      '/vetus-import-batches',
      {
        sourceSystem: 'Vetus',
        sourceReference: lifecycleSource,
        items: [
          {
            owner: { fullName: 'Vetus Resumable Owner' },
            patient: { name: 'Vetus Resumable Patient', species: 'canine' }
          },
          {
            owner: { fullName: 'Vetus Existing Owner', phone: '+5511900001003' },
            patient: { name: 'Vetus Existing Patient', species: 'canine' }
          }
        ]
      },
      randomUUID()
    );
    expect(partial.status).toBe(201);
    expect(partial.body?.batch.status).toBe('partial');
    expect(partial.body?.batch.linkedCount).toBe(1);
    expect(partial.body?.batch.rejectedCount).toBe(1);
    expect(partial.body?.items.map((item) => item.status)).toEqual(['rejected', 'linked']);

    const resumed = await postVetus<BatchResponse>(
      secondaryBaseUrl,
      accessToken,
      primary,
      '/vetus-import-batches',
      {
        sourceSystem: 'Vetus',
        sourceReference: lifecycleSource,
        resumeBatchId: partial.body?.batch.id,
        items: [
          {
            owner: { fullName: 'Vetus Resumable Owner', phone: '+5511900001004' },
            patient: { name: 'Vetus Resumable Patient', species: 'canine' }
          }
        ]
      },
      randomUUID()
    );
    expect(resumed.status).toBe(200);
    expect(resumed.body?.batch.status).toBe('completed');
    expect(resumed.body?.batch.importedCount).toBe(1);
    expect(resumed.body?.batch.linkedCount).toBe(1);
    expect(resumed.body?.batch.rejectedCount).toBe(0);
    expect(resumed.body?.items.map((item) => item.status)).toEqual(['imported', 'linked']);

    const newItem = resumed.body?.items.find((item) => item.rowNumber === 1);
    const existingItem = resumed.body?.items.find((item) => item.rowNumber === 2);
    expect(newItem?.ownerCreated).toBe(true);
    expect(newItem?.patientCreated).toBe(true);
    expect(existingItem?.ownerCreated).toBe(false);
    expect(existingItem?.patientCreated).toBe(false);
    if (!newItem?.ownerId || !newItem.patientId || !partial.body?.batch.id) {
      throw new Error('Vetus resume fixture did not return the created row identifiers');
    }

    const rollback = await postVetus<BatchResponse>(
      baseUrl,
      accessToken,
      primary,
      `/vetus-import-batches/${encodeURIComponent(partial.body.batch.id)}/rollback`,
      {},
      randomUUID()
    );
    expect(rollback.status).toBe(200);
    expect(rollback.body?.batch.status).toBe('rolled_back');
    expect(rollback.body?.batch.rolledBackCount).toBe(2);
    expect(rollback.body?.items.every((item) => item.status === 'rolled_back')).toBe(true);

    const statuses = await getTestPool().query<{
      readonly new_owner_status: string | null;
      readonly new_patient_status: string | null;
      readonly existing_owner_status: string | null;
      readonly existing_patient_status: string | null;
      readonly logs: number;
    }>(
      `SELECT
         (SELECT address_json->>'status' FROM owners WHERE id = $2) AS new_owner_status,
         (SELECT alerts_json->>'status' FROM patients WHERE id = $3) AS new_patient_status,
         (SELECT address_json->>'status' FROM owners WHERE id = $4) AS existing_owner_status,
         (SELECT alerts_json->>'status' FROM patients WHERE id = $5) AS existing_patient_status,
         (SELECT COUNT(*)::int FROM vetus_import_logs WHERE account_id = $1) AS logs`,
      [
        primary.accountId,
        newItem.ownerId,
        newItem.patientId,
        primary.ownerId,
        primary.patientId
      ]
    );
    expect(statuses.rows[0]).toMatchObject({
      new_owner_status: 'inactive',
      new_patient_status: 'inactive',
      existing_owner_status: 'active',
      existing_patient_status: 'active',
      logs: 3
    });

    const restartedBatch = await requestJson<BatchResponse>(
      secondaryBaseUrl,
      `/vetus-import-batches/${encodeURIComponent(partial.body.batch.id)}`,
      { headers: authHeaders(accessToken, primary) }
    );
    expect(restartedBatch.status).toBe(200);
    expect(restartedBatch.body?.batch.status).toBe('rolled_back');

    const foreignList = await requestJson<{ readonly items: readonly unknown[] }>(
      baseUrl,
      '/vetus-imports',
      { headers: authHeaders(foreignAccessToken, foreign) }
    );
    expect(foreignList.status).toBe(200);
    expect(foreignList.body?.items).toHaveLength(0);
    const foreignDetail = await requestJson<{ readonly code?: string }>(
      baseUrl,
      `/vetus-import-batches/${encodeURIComponent(partial.body.batch.id)}`,
      { headers: authHeaders(foreignAccessToken, foreign) }
    );
    expect(foreignDetail.status).toBe(404);
    expect(foreignDetail.body?.code).toBeUndefined();
  });

  it('uses normalized batch fingerprints and aborts divergent item references atomically', async () => {
    const normalizedSource = `normalized-${primary.accountId.slice(0, 8)}`;
    const before = await domainCounts(primary.accountId);
    const first = await postVetus<BatchResponse>(
      baseUrl,
      accessToken,
      primary,
      '/vetus-import-batches',
      {
        sourceReference: normalizedSource,
        items: [{
          ignoredField: 'discarded by normalization',
          owner: { fullName: 'Normalized HTTP Owner', phone: '  +5511900001010  ' },
          patient: { name: 'Normalized HTTP Patient', species: 'canine', sex: 'Femea', baseWeightKg: '12,4' }
        }]
      },
      randomUUID()
    );
    expect(first.status).toBe(201);

    const replay = await postVetus<BatchResponse>(
      secondaryBaseUrl,
      accessToken,
      primary,
      '/vetus-import-batches',
      {
        sourceSystem: ' Vetus ',
        sourceReference: normalizedSource,
        items: [{
          owner: { fullName: 'Normalized HTTP Owner', phone: '+5511900001010' },
          patient: { name: 'Normalized HTTP Patient', species: 'canine', sex: 'female', baseWeightKg: 12.4 }
        }]
      },
      randomUUID()
    );
    expect(replay.status).toBe(200);
    expect(replay.body?.batch.id).toBe(first.body?.batch.id);
    expect(await domainCounts(primary.accountId)).toEqual({
      owners: before.owners + 1,
      patients: before.patients + 1,
      logs: before.logs + 1
    });

    const singleSource = `line-conflict-${primary.accountId.slice(0, 8)}`;
    const single = await postVetus<PublicImportSummary>(
      baseUrl,
      accessToken,
      primary,
      '/vetus-imports',
      {
        sourceSystem: 'Vetus',
        sourceReference: singleSource,
        owner: { fullName: 'HTTP Line Conflict Owner', phone: '+5511900001011' },
        patient: { name: 'HTTP Line Conflict Patient', species: 'feline' }
      },
      randomUUID()
    );
    expect(single.status).toBe(201);
    const beforeConflict = await domainCounts(primary.accountId);
    const batchesBeforeConflict = await getTestPool().query<{ readonly count: number }>(
      'SELECT COUNT(*)::int AS count FROM vetus_import_batches WHERE account_id = $1',
      [primary.accountId]
    );

    const conflict = await postVetus<{ readonly code?: string }>(
      secondaryBaseUrl,
      accessToken,
      primary,
      '/vetus-import-batches',
      {
        items: [{
          sourceReference: singleSource,
          owner: { fullName: 'HTTP Line Conflict Owner', phone: '+5511900001011' },
          patient: { name: 'HTTP Line Conflict Divergent', species: 'feline' }
        }]
      },
      randomUUID()
    );
    expect(conflict.status).toBe(409);
    expect(conflict.body?.code).toBe('CONFLICT');
    expect(await domainCounts(primary.accountId)).toEqual(beforeConflict);
    const batchesAfterConflict = await getTestPool().query<{ readonly count: number }>(
      'SELECT COUNT(*)::int AS count FROM vetus_import_batches WHERE account_id = $1',
      [primary.accountId]
    );
    expect(batchesAfterConflict.rows[0]?.count).toBe(batchesBeforeConflict.rows[0]?.count);
  });

  it('resumes a later rejected row without changing its durable row identity', async () => {
    if (!primary.ownerId) throw new Error('Primary owner fixture is required');
    const ownerId = primary.ownerId;
    const deactivate = await requestJson<unknown>(
      baseUrl,
      `/owners/${encodeURIComponent(ownerId)}`,
      {
        method: 'PATCH',
        headers: { ...authHeaders(accessToken, primary), 'idempotency-key': randomUUID() },
        body: JSON.stringify({ status: 'inactive' })
      }
    );
    expect(deactivate.status).toBe(200);
    const deactivateSecondary = await requestJson<unknown>(
      secondaryBaseUrl,
      `/owners/${encodeURIComponent(ownerId)}`,
      {
        method: 'PATCH',
        headers: { ...authHeaders(accessToken, primary), 'idempotency-key': randomUUID() },
        body: JSON.stringify({ status: 'inactive' })
      }
    );
    expect(deactivateSecondary.status).toBe(200);

    const sourceReference = `row-number-${primary.accountId.slice(0, 8)}`;
    const partial = await postVetus<BatchResponse>(
      baseUrl,
      accessToken,
      primary,
      '/vetus-import-batches',
      {
        sourceReference,
        items: [
          {
            owner: { fullName: 'HTTP Later Row Owner', phone: '+5511900001012' },
            patient: { name: 'HTTP First Row Patient', species: 'canine' }
          },
          {
            owner: { fullName: 'Vetus Existing Owner', phone: '+5511900001013' },
            patient: { name: 'HTTP Later Row Patient', species: 'feline' }
          }
        ]
      },
      randomUUID()
    );
    expect(partial.status).toBe(201);
    expect(partial.body?.items.map((item) => item.status)).toEqual(['imported', 'rejected']);

    const activate = await requestJson<unknown>(
      baseUrl,
      `/owners/${encodeURIComponent(ownerId)}`,
      {
        method: 'PATCH',
        headers: { ...authHeaders(accessToken, primary), 'idempotency-key': randomUUID() },
        body: JSON.stringify({ status: 'active' })
      }
    );
    expect(activate.status).toBe(200);
    const activateSecondary = await requestJson<unknown>(
      secondaryBaseUrl,
      `/owners/${encodeURIComponent(ownerId)}`,
      {
        method: 'PATCH',
        headers: { ...authHeaders(accessToken, primary), 'idempotency-key': randomUUID() },
        body: JSON.stringify({ status: 'active' })
      }
    );
    expect(activateSecondary.status).toBe(200);

    const resumed = await postVetus<BatchResponse>(
      baseUrl,
      accessToken,
      primary,
      '/vetus-import-batches',
      { resumeBatchId: partial.body?.batch.id },
      randomUUID()
    );
    expect(resumed.status).toBe(200);
    expect(resumed.body?.batch.status).toBe('completed');
    expect(resumed.body?.items.map((item) => [item.rowNumber, item.status])).toEqual([
      [1, 'imported'],
      [2, 'imported']
    ]);
  });

  it('rejects an oversized batch before any durable mutation', async () => {
    const before = await domainCounts(primary.accountId);
    const batchesBefore = await getTestPool().query<{ readonly count: number }>(
      'SELECT COUNT(*)::int AS count FROM vetus_import_batches WHERE account_id = $1',
      [primary.accountId]
    );
    const oversized = await postVetus<{ readonly code?: string }>(
      secondaryBaseUrl,
      accessToken,
      primary,
      '/vetus-import-batches',
      { items: Array.from({ length: 600 }, () => ({ noise: 'x'.repeat(500) })) },
      randomUUID()
    );
    expect(oversized.status).toBe(400);
    expect(oversized.body?.code).toBe('VALIDATION_ERROR');
    expect(await domainCounts(primary.accountId)).toEqual(before);
    const batchesAfter = await getTestPool().query<{ readonly count: number }>(
      'SELECT COUNT(*)::int AS count FROM vetus_import_batches WHERE account_id = $1',
      [primary.accountId]
    );
    expect(batchesAfter.rows[0]?.count).toBe(batchesBefore.rows[0]?.count);
  });

  it('serializes concurrent identical source-reference imports across instances', async () => {
    const body = {
      sourceSystem: 'Vetus',
      sourceReference: `concurrent-${primary.accountId.slice(0, 8)}`,
      owner: { fullName: 'Vetus Concurrent Owner', phone: '+5511900001005' },
      patient: { name: 'Vetus Concurrent Patient', species: 'canine' }
    };
    const before = await domainCounts(primary.accountId);
    const [first, second] = await Promise.all([
      postVetus<PublicImportSummary>(
        baseUrl,
        accessToken,
        primary,
        '/vetus-imports',
        body,
        randomUUID()
      ),
      postVetus<PublicImportSummary>(
        secondaryBaseUrl,
        accessToken,
        primary,
        '/vetus-imports',
        body,
        randomUUID()
      )
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(first.body?.id).toBe(second.body?.id);
    expect(await domainCounts(primary.accountId)).toEqual({
      owners: before.owners + 1,
      patients: before.patients + 1,
      logs: before.logs + 1
    });
  });
});
