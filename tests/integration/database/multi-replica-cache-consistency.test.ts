import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setAppState } from '../../../apps/api/src/app-state.js';
import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { PostgresCacheSyncBus } from '../../../packages/shared/database/src/cache-sync-bus.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

/**
 * R2-ARC-02 / R2-ARC-03 acceptance: two API instances (separate per-process
 * caches) on the same PostgreSQL. Rows created on A are readable on B on first
 * access (read-through); updates and inactivations on A converge on B through
 * LISTEN/NOTIFY; another account never sees them.
 */

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID();
const USER_ID = randomUUID();
const FOREIGN_TENANT_ID = randomUUID();
const FOREIGN_ACCOUNT_ID = randomUUID();
const FOREIGN_USER_ID = randomUUID();
const USERNAME = `replica-${USER_ID.slice(0, 8)}`;
const FOREIGN_USERNAME = `replica-foreign-${FOREIGN_USER_ID.slice(0, 8)}`;
const CHANNEL = `cvg_cache_sync_replica_test_${process.pid}`;

let serverA: ApiServer | undefined;
let serverB: ApiServer | undefined;
let busA: PostgresCacheSyncBus | undefined;
let busB: PostgresCacheSyncBus | undefined;
let urlA = '';
let urlB = '';
let tokenA = '';
let tokenB = '';
let foreignTokenB = '';

interface JsonResponse<T> {
  readonly status: number;
  readonly body?: T;
  readonly text: string;
}

async function requestJson<T>(origin: string, path: string, init: RequestInit = {}): Promise<JsonResponse<T>> {
  const response = await fetch(`${origin}${path}`, init);
  const text = await response.text();
  return { status: response.status, body: text.length > 0 ? (JSON.parse(text) as T) : undefined, text };
}

function headers(token: string, tenantId = TENANT_ID, accountId = ACCOUNT_ID): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'x-account-id': accountId,
    'content-type': 'application/json'
  };
}

async function login(origin: string, username: string): Promise<string> {
  const response = await requestJson<{ readonly accessToken: string }>(origin, '/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'seed_admin' })
  });
  if (response.status !== 200 || !response.body?.accessToken) throw new Error(`login failed: ${response.text}`);
  return response.body.accessToken;
}

async function eventually<T>(read: () => Promise<T>, predicate: (value: T) => boolean, timeoutMs = 5_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T = await read();
  while (!predicate(last)) {
    if (Date.now() > deadline) throw new Error(`condition not met in time; last value: ${JSON.stringify(last)}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    last = await read();
  }
  return last;
}

async function seedTenant(input: {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly username: string;
}): Promise<void> {
  const pool = getTestPool();
  await pool.query(`INSERT INTO tenants (id, slug, name, status) VALUES ($1, $2, 'Replica tenant', 'active')`, [
    input.tenantId,
    `replica-tenant-${input.tenantId.slice(0, 8)}`
  ]);
  await pool.query(`INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, 'Replica account')`, [
    input.accountId,
    input.tenantId,
    `replica-account-${input.accountId.slice(0, 8)}`
  ]);
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Replica Operator', true)`,
    [input.userId, input.accountId, input.username, `${input.username}@example.com`]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from the test seed');
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [input.userId, role.rows[0].id]);
}

beforeAll(async () => {
  await seedTenant({ tenantId: TENANT_ID, accountId: ACCOUNT_ID, userId: USER_ID, username: USERNAME });
  await seedTenant({
    tenantId: FOREIGN_TENANT_ID,
    accountId: FOREIGN_ACCOUNT_ID,
    userId: FOREIGN_USER_ID,
    username: FOREIGN_USERNAME
  });
  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-replica-')),
    maxRetries: 10,
    retryDelayMs: 1000
  });
  if (!bootstrap.databaseHealthy || !bootstrap.unitOfWork) {
    throw new Error(`database-backed bootstrap required: ${bootstrap.databaseDetail}`);
  }
  setAppState({ persistenceMode: 'database', productionReady: true, initialized: true });

  const start = async (name: string) => {
    const bus = new PostgresCacheSyncBus({ connectionString: TEST_DB_URL, channel: CHANNEL, originId: name });
    await bus.start();
    const server = createApiServer({
      appName: `replica-test-${name}`,
      environment: 'test',
      version: '0.1.0',
      authSecret: 'replica-test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      repositories: bootstrap.repositories,
      fileStorage: bootstrap.fileStorage,
      unitOfWork: bootstrap.unitOfWork,
      preserveSeedUsersWithRepository: false,
      preserveSeedMasterDataWithRepository: false,
      cacheSync: bus
    });
    await server.ready;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    return { bus, server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
  };
  const a = await start('replica-a');
  const b = await start('replica-b');
  serverA = a.server;
  serverB = b.server;
  busA = a.bus;
  busB = b.bus;
  urlA = a.url;
  urlB = b.url;
  tokenA = await login(urlA, USERNAME);
  tokenB = await login(urlB, USERNAME);
  foreignTokenB = await login(urlB, FOREIGN_USERNAME);
}, 120_000);

afterAll(async () => {
  for (const server of [serverA, serverB]) {
    if (!server) continue;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await server.closeDependencies();
  }
  await busA?.stop();
  await busB?.stop();
  await shutdownServices();
});

describe('two API replicas on one PostgreSQL', () => {
  let ownerId = '';
  let patientId = '';
  let encounterId = '';

  it('reads on B an owner created on A (read-through, account-scoped)', async () => {
    const created = await requestJson<{ readonly id: string }>(urlA, '/owners', {
      method: 'POST',
      headers: headers(tokenA),
      body: JSON.stringify({ fullName: 'Owner Created On A', contacts: [{ label: 'phone', value: '11999999999', type: 'phone', primary: true }], financialResponsible: true })
    });
    expect(created.status, created.text).toBe(201);
    ownerId = created.body!.id;

    const onB = await requestJson<{ readonly id: string; readonly fullName: string }>(urlB, `/owners/${ownerId}`, {
      headers: headers(tokenB)
    });
    expect(onB.status, onB.text).toBe(200);
    expect(onB.body?.fullName).toBe('Owner Created On A');

    const foreign = await requestJson(urlB, `/owners/${ownerId}`, {
      headers: headers(foreignTokenB, FOREIGN_TENANT_ID, FOREIGN_ACCOUNT_ID)
    });
    expect(foreign.status).toBe(404);
  });

  it('reads on B a patient created on A and lists it there after the sync event', async () => {
    const created = await requestJson<{ readonly id: string }>(urlA, '/patients', {
      method: 'POST',
      headers: headers(tokenA),
      body: JSON.stringify({ name: 'Patient Created On A', species: 'canine', sex: 'female', primaryOwnerId: ownerId })
    });
    expect(created.status, created.text).toBe(201);
    patientId = created.body!.id;

    const onB = await requestJson<{ readonly id: string; readonly name: string }>(urlB, `/patients/${patientId}`, {
      headers: headers(tokenB)
    });
    expect(onB.status, onB.text).toBe(200);
    expect(onB.body?.name).toBe('Patient Created On A');

    const listed = await eventually(
      () =>
        requestJson<{ readonly items: ReadonlyArray<{ readonly id: string }> }>(urlB, '/patients', {
          headers: headers(tokenB)
        }),
      (response) => response.status === 200 && (response.body?.items ?? []).some((item) => item.id === patientId)
    );
    expect(listed.status).toBe(200);
  });

  it('reads on B an encounter opened on A', async () => {
    const created = await requestJson<{ readonly id: string }>(urlA, '/encounters', {
      method: 'POST',
      headers: headers(tokenA),
      body: JSON.stringify({ patientId, ownerId, visitType: 'walk_in', origin: 'reception', reason: 'Replica test' })
    });
    expect(created.status, created.text).toBe(201);
    encounterId = created.body!.id;

    const onB = await requestJson<{ readonly encounter?: { readonly id: string }; readonly id?: string }>(
      urlB,
      `/encounters/${encounterId}`,
      { headers: headers(tokenB) }
    );
    expect(onB.status, onB.text).toBe(200);
    expect(onB.body?.encounter?.id ?? onB.body?.id).toBe(encounterId);
  });

  it('converges an owner update made on A onto B without a restart', async () => {
    const patched = await requestJson(urlA, `/owners/${ownerId}`, {
      method: 'PATCH',
      headers: headers(tokenA),
      body: JSON.stringify({ fullName: 'Owner Renamed On A' })
    });
    expect(patched.status, patched.text).toBe(200);

    const onB = await eventually(
      () => requestJson<{ readonly fullName: string }>(urlB, `/owners/${ownerId}`, { headers: headers(tokenB) }),
      (response) => response.body?.fullName === 'Owner Renamed On A'
    );
    expect(onB.body?.fullName).toBe('Owner Renamed On A');
  });

  it('converges a patient update and an owner inactivation made on A onto B', async () => {
    const patched = await requestJson(urlA, `/patients/${patientId}`, {
      method: 'PATCH',
      headers: headers(tokenA),
      body: JSON.stringify({ name: 'Patient Renamed On A' })
    });
    expect(patched.status, patched.text).toBe(200);
    await eventually(
      () => requestJson<{ readonly name: string }>(urlB, `/patients/${patientId}`, { headers: headers(tokenB) }),
      (response) => response.body?.name === 'Patient Renamed On A'
    );

    const inactivated = await requestJson(urlA, `/owners/${ownerId}`, { method: 'DELETE', headers: headers(tokenA) });
    expect(inactivated.status, inactivated.text).toBe(204);
    const onB = await eventually(
      () => requestJson<{ readonly status: string }>(urlB, `/owners/${ownerId}`, { headers: headers(tokenB) }),
      (response) => response.body?.status === 'inactive'
    );
    expect(onB.body?.status).toBe('inactive');
  });
});
