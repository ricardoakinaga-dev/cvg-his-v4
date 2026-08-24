import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const API_PROCESS_FIXTURE = resolve(ROOT, 'apps/api/test-fixtures/api-process.ts');
const suffix = randomUUID().replaceAll('-', '');
const apiRole = `laboratory_bootstrap_api_${suffix}`;
const workerRole = `laboratory_bootstrap_worker_${suffix}`;
const rolePassword = `laboratory-bootstrap-${suffix}`;
const tenantA = randomUUID();
const accountA = randomUUID();
const userA = randomUUID();
const usernameA = `laboratory-bootstrap-a-${userA.slice(0, 8)}`;
const tenantB = randomUUID();
const accountB = randomUUID();
const userB = randomUUID();
const usernameB = `laboratory-bootstrap-b-${userB.slice(0, 8)}`;
const triggerName = `laboratory_bootstrap_pause_${suffix}`;
const triggerFunction = `laboratory_bootstrap_pause_fn_${suffix}`;
const customEquipmentId = `${accountA}:custom-equipment-${suffix}`;
const bootstrapLockClassId = 41673;
const bootstrapLockObjectId = 1;
const canonicalEquipmentSourceIds = ['lab-eq-hem', 'lab-eq-bio', 'lab-eq-uri', 'lab-eq-img'];
const canonicalReportTypeSourceIds = [
  'cat_001',
  'cat_002',
  'cat_003',
  'cat_004',
  'cat_005',
  'cat_006'
];
const canonicalReferenceValueSourceIds = [
  'ref-hem-1',
  'ref-hem-2',
  'ref-bio-1',
  'ref-bio-2',
  'ref-urin-1',
  'ref-urin-2'
];

let firstApi: ApiProcess | undefined;
let secondApi: ApiProcess | undefined;

interface ApiProcess {
  readonly child: ChildProcess;
  readonly pid: number;
  readonly baseUrl: string;
  readonly output: () => string;
  readonly close: () => Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>;
}

interface JsonResponse<T> {
  readonly status: number;
  readonly body?: T;
  readonly text: string;
}

interface LoginResponse {
  readonly accessToken: string;
}

interface EquipmentResponse {
  readonly items: readonly {
    readonly id: string;
    readonly serialNumber: string;
    readonly status: string;
  }[];
}

interface CatalogCounts {
  readonly equipment: number;
  readonly reportTypes: number;
  readonly referenceValues: number;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function databaseUrlFor(role: string): string {
  const url = new URL(TEST_DB_URL);
  url.username = role;
  url.password = rolePassword;
  return url.toString();
}

function buildDiagnosticsModule(): void {
  execFileSync('pnpm', ['--filter', '@cvg-his-v2/module-diagnostics', 'run', 'build'], {
    cwd: ROOT,
    stdio: 'inherit'
  });
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
  const address = server.address() as AddressInfo | null;
  if (!address) throw new Error('could not reserve API process port');
  await new Promise<void>((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose()))
  );
  return address.port;
}

function startApi(port: number, label: string): ApiProcess {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', API_PROCESS_FIXTURE], {
    cwd: ROOT,
    env: {
      ...process.env,
      API_PROCESS_FIXTURE: '1',
      NODE_ENV: 'test',
      APP_NAME: `laboratory-catalog-bootstrap-${label}`,
      HOST: '127.0.0.1',
      PORT: String(port),
      DATABASE_URL: databaseUrlFor(apiRole),
      AUTH_SECRET: 'laboratory-catalog-bootstrap-test-auth-secret',
      CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:3000',
      OTEL_ENABLED: 'false',
      PIX_MOCK_MODE: 'true',
      EMAIL_MOCK_MODE: 'true',
      SMS_MOCK_MODE: 'true',
      GOOGLE_CALENDAR_MOCK_MODE: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (child.pid === undefined) throw new Error('API process fixture did not expose a PID');

  let output = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr?.on('data', (chunk: string) => {
    output += chunk;
  });

  let closeResult:
    | { readonly code: number | null; readonly signal: NodeJS.Signals | null }
    | undefined;
  let resolveClose:
    | ((result: { readonly code: number | null; readonly signal: NodeJS.Signals | null }) => void)
    | undefined;
  const closed = new Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolveClosePromise) => {
    resolveClose = resolveClosePromise;
  });
  child.once('close', (code, signal) => {
    closeResult = { code, signal };
    resolveClose?.(closeResult);
  });

  return {
    child,
    pid: child.pid,
    baseUrl: `http://127.0.0.1:${port}`,
    output: () => output,
    close: () => (closeResult ? Promise.resolve(closeResult) : closed)
  };
}

async function stopApi(
  processHandle: ApiProcess,
  signal: NodeJS.Signals
): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }> {
  if (processHandle.child.exitCode === null && processHandle.child.signalCode === null) {
    processHandle.child.kill(signal);
  }
  return processHandle.close();
}

async function waitForApi(processHandle: ApiProcess): Promise<void> {
  const deadline = Date.now() + 30_000;
  let lastError = 'no response';
  while (Date.now() < deadline) {
    if (processHandle.child.exitCode !== null || processHandle.child.signalCode !== null) {
      throw new Error(
        `API process exited before readiness: ${processHandle.child.exitCode ?? processHandle.child.signalCode}\n${processHandle.output().slice(-4000)}`
      );
    }
    try {
      const response = await fetch(`${processHandle.baseUrl}/health`, {
        signal: AbortSignal.timeout(500)
      });
      const body = (await response.json()) as { readonly persistenceMode?: string };
      if (response.status === 200 && body.persistenceMode === 'database') return;
      lastError = `${response.status} ${JSON.stringify(body)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 50));
  }
  throw new Error(
    `API process did not become ready: ${lastError}\n${processHandle.output().slice(-4000)}`
  );
}

async function requestJson<T>(
  processHandle: ApiProcess,
  path: string,
  init: RequestInit = {}
): Promise<JsonResponse<T>> {
  const response = await fetch(processHandle.baseUrl + path, init);
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as T) : undefined, text };
}

function headers(token: string, tenantId: string, accountId: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'x-account-id': accountId
  };
}

async function login(processHandle: ApiProcess, username: string): Promise<string> {
  const response = await requestJson<LoginResponse>(processHandle, '/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'seed_admin' })
  });
  if (response.status !== 200 || !response.body?.accessToken) {
    throw new Error(`process fixture login failed: ${response.status} ${response.text}`);
  }
  return response.body.accessToken;
}

async function seedAccount(input: {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly username: string;
}): Promise<void> {
  const pool = getTestPool();
  await pool.query("INSERT INTO tenants (id, slug, name, status) VALUES ($1, $2, $3, 'active')", [
    input.tenantId,
    `laboratory-bootstrap-${input.tenantId.slice(0, 8)}`,
    `Laboratory bootstrap ${input.username} tenant`
  ]);
  await pool.query('INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, $4)', [
    input.accountId,
    input.tenantId,
    `laboratory-bootstrap-${input.accountId.slice(0, 8)}`,
    `Laboratory bootstrap ${input.username} account`
  ]);
  await pool.query(
    'INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active) ' +
      "VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', $5, true)",
    [
      input.userId,
      input.accountId,
      input.username,
      `${input.username}@example.test`,
      `${input.username} operator`
    ]
  );
  const adminRole = await pool.query<{ readonly id: string }>(
    "SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1"
  );
  if (!adminRole.rows[0])
    throw new Error('admin role is missing from laboratory bootstrap fixture');
  await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [
    input.userId,
    adminRole.rows[0].id
  ]);
}

async function installBootstrapPause(): Promise<void> {
  await getTestPool().query(
    `CREATE OR REPLACE FUNCTION public.${quoteIdentifier(triggerFunction)}() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.account_id = ${quoteLiteral(accountA)}
          AND current_setting('cvg.laboratory_bootstrap_pause', true) IS NULL THEN
          PERFORM set_config('cvg.laboratory_bootstrap_pause', '1', true);
          IF pg_try_advisory_xact_lock(${bootstrapLockClassId}, ${bootstrapLockObjectId}) THEN
            PERFORM pg_sleep(10);
          ELSE
            PERFORM pg_advisory_xact_lock(${bootstrapLockClassId}, ${bootstrapLockObjectId});
          END IF;
        END IF;
        RETURN NEW;
      END;
    $$`
  );
  await getTestPool().query(
    `CREATE TRIGGER ${quoteIdentifier(triggerName)}
      BEFORE INSERT ON laboratory_equipment
      FOR EACH ROW EXECUTE FUNCTION public.${quoteIdentifier(triggerFunction)}()`
  );
}

async function removeBootstrapPause(): Promise<void> {
  await getTestPool()
    .query(`DROP TRIGGER IF EXISTS ${quoteIdentifier(triggerName)} ON laboratory_equipment`)
    .catch(() => undefined);
  await getTestPool()
    .query(`DROP FUNCTION IF EXISTS public.${quoteIdentifier(triggerFunction)}()`)
    .catch(() => undefined);
}

async function waitForBootstrapContention(): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const result = await getAdminPool().query<{
      readonly granted: number;
      readonly waiting: number;
      readonly pids: number;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE lock.granted)::int AS granted,
        COUNT(*) FILTER (WHERE NOT lock.granted)::int AS waiting,
        COUNT(DISTINCT activity.pid)::int AS pids
      FROM pg_stat_activity AS activity
      JOIN pg_locks AS lock ON lock.pid = activity.pid
      WHERE activity.usename = $1
        AND activity.datname = $2
        AND lock.locktype = 'advisory'
        AND lock.mode = 'ExclusiveLock'
        AND lock.classid::int = ${bootstrapLockClassId}
        AND lock.objid::int = ${bootstrapLockObjectId}
      GROUP BY lock.classid, lock.objid, lock.objsubid`,
      [apiRole, TEST_DB_NAME]
    );
    if (result.rows.some((row) => row.granted >= 1 && row.waiting >= 1 && row.pids >= 2)) {
      return;
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 25));
  }
  throw new Error('API processes did not contend on the laboratory bootstrap advisory lock');
}

async function catalogCounts(accountId: string): Promise<CatalogCounts> {
  const result = await getTestPool().query<CatalogCounts>(
    `SELECT
      (SELECT COUNT(*)::int FROM laboratory_equipment WHERE account_id = $1) AS equipment,
      (SELECT COUNT(*)::int FROM laboratory_report_types WHERE account_id = $1) AS "reportTypes",
      (SELECT COUNT(*)::int FROM laboratory_reference_values WHERE account_id = $1) AS "referenceValues"`,
    [accountId]
  );
  if (!result.rows[0]) throw new Error('catalog count query returned no row');
  return result.rows[0];
}

async function assertCatalog(accountId: string, expectedEquipment: number): Promise<void> {
  expect(await catalogCounts(accountId)).toEqual({
    equipment: expectedEquipment,
    reportTypes: 6,
    referenceValues: 6
  });
  const ids = await getTestPool().query<{ readonly id: string }>(
    `SELECT id FROM laboratory_equipment WHERE account_id = $1
     UNION ALL SELECT id FROM laboratory_report_types WHERE account_id = $1
     UNION ALL SELECT id FROM laboratory_reference_values WHERE account_id = $1`,
    [accountId]
  );
  const expectedIds = [
    ...canonicalEquipmentSourceIds,
    ...canonicalReportTypeSourceIds,
    ...canonicalReferenceValueSourceIds
  ].map((sourceId) => `${accountId}:${sourceId}`);
  if (accountId === accountA && expectedEquipment === 5) expectedIds.push(customEquipmentId);
  expect(ids.rows.map((row) => row.id).sort()).toEqual(expectedIds.sort());
}

beforeAll(async () => {
  buildDiagnosticsModule();
  const adminPool = getAdminPool();
  await adminPool.query(
    `CREATE ROLE ${quoteIdentifier(apiRole)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${rolePassword}'`
  );
  await adminPool.query(
    `CREATE ROLE ${quoteIdentifier(workerRole)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${rolePassword}'`
  );
  await adminPool.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(TEST_DB_NAME)} TO ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
  );
  const client = await getTestPool().connect();
  try {
    await reconcileRuntimeRoles(client, { apiRole, workerRole });
  } finally {
    client.release();
  }
  await seedAccount({ tenantId: tenantA, accountId: accountA, userId: userA, username: usernameA });
  await seedAccount({ tenantId: tenantB, accountId: accountB, userId: userB, username: usernameB });
}, 120_000);

afterEach(async () => {
  const processes = [firstApi, secondApi].filter((item): item is ApiProcess => item !== undefined);
  firstApi = undefined;
  secondApi = undefined;
  await Promise.all(
    processes.map((processHandle) => stopApi(processHandle, 'SIGKILL').catch(() => undefined))
  );
  await removeBootstrapPause();
});

afterAll(async () => {
  const processes = [firstApi, secondApi].filter((item): item is ApiProcess => item !== undefined);
  firstApi = undefined;
  secondApi = undefined;
  await Promise.all(
    processes.map((processHandle) => stopApi(processHandle, 'SIGKILL').catch(() => undefined))
  );
  await removeBootstrapPause();
  const pool = getTestPool();
  await pool
    .query(`REASSIGN OWNED BY ${quoteIdentifier(apiRole)} TO CURRENT_USER`)
    .catch(() => undefined);
  await pool.query(`DROP OWNED BY ${quoteIdentifier(apiRole)}`).catch(() => undefined);
  await pool
    .query(`REASSIGN OWNED BY ${quoteIdentifier(workerRole)} TO CURRENT_USER`)
    .catch(() => undefined);
  await pool.query(`DROP OWNED BY ${quoteIdentifier(workerRole)}`).catch(() => undefined);
  const adminPool = getAdminPool();
  await adminPool
    .query(`REVOKE cvg_installer FROM ${quoteIdentifier(apiRole)}`)
    .catch(() => undefined);
  await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`).catch(() => undefined);
  await adminPool
    .query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`)
    .catch(() => undefined);
});

describe('laboratory catalog real API-process bootstrap concurrency boundary', () => {
  it('hydrates two isolated tenant catalogs atomically across concurrent API entrypoints and repairs a missing default', async () => {
    await installBootstrapPause();
    const firstPort = await reservePort();
    const secondPort = await reservePort();
    firstApi = startApi(firstPort, 'one');
    secondApi = startApi(secondPort, 'two');
    expect(firstApi.pid).not.toBe(secondApi.pid);
    await waitForBootstrapContention();
    await Promise.all([waitForApi(firstApi), waitForApi(secondApi)]);

    const accessTokenA = await login(firstApi, usernameA);
    const accessTokenB = await login(secondApi, usernameB);
    const [equipmentA, equipmentB] = await Promise.all([
      requestJson<EquipmentResponse>(firstApi, '/laboratory/equipment', {
        headers: headers(accessTokenA, tenantA, accountA)
      }),
      requestJson<EquipmentResponse>(secondApi, '/laboratory/equipment', {
        headers: headers(accessTokenB, tenantB, accountB)
      })
    ]);
    expect(equipmentA.status).toBe(200);
    expect(equipmentB.status).toBe(200);
    expect(equipmentA.body?.items).toHaveLength(4);
    expect(equipmentB.body?.items).toHaveLength(4);
    expect(equipmentA.body?.items.every((item) => item.id.startsWith(`${accountA}:`))).toBe(true);
    expect(equipmentB.body?.items.every((item) => item.id.startsWith(`${accountB}:`))).toBe(true);
    await assertCatalog(accountA, 4);
    await assertCatalog(accountB, 4);

    await getTestPool().query(
      `INSERT INTO laboratory_equipment (
        id, account_id, name, type, serial_number, status, last_calibration_at, created_at, updated_at
      ) VALUES ($1, $2, 'Custom laboratory equipment', 'Custom', 'CUSTOM-001', 'maintenance', NOW(), NOW(), NOW())`,
      [customEquipmentId, accountA]
    );
    await getTestPool().query('DELETE FROM laboratory_equipment WHERE id = $1', [
      `${accountA}:lab-eq-bio`
    ]);

    const repaired = await requestJson<EquipmentResponse>(firstApi, '/laboratory/equipment', {
      headers: headers(accessTokenA, tenantA, accountA)
    });
    expect(repaired.status).toBe(200);
    expect(repaired.body?.items).toHaveLength(5);
    expect(repaired.body?.items.some((item) => item.id === `${accountA}:lab-eq-bio`)).toBe(true);
    expect(repaired.body?.items.find((item) => item.id === customEquipmentId)).toMatchObject({
      id: customEquipmentId,
      serialNumber: 'CUSTOM-001',
      status: 'maintenance'
    });
    await assertCatalog(accountA, 5);
    await assertCatalog(accountB, 4);
  }, 120_000);
});
