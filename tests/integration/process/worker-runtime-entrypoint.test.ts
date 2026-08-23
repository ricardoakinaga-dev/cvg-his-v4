import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import { ADMIN_DB_URL, TEST_DB_URL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const scratchDatabase = `cvg_worker_entrypoint_${process.pid}_${suffix}`;
const apiRole = `cvg_worker_entry_api_${suffix}`;
const workerRole = `cvg_worker_entry_worker_${suffix}`;
const runtimePassword = `worker_entry_${suffix}_password`;
const tenantId = randomUUID();
const accountId = randomUUID();
const workerEntrypoint = resolve(ROOT, 'apps/worker/src/index.ts');

function databaseUrl(databaseName: string, role?: string, password?: string): string {
  const url = new URL(TEST_DB_URL);
  url.pathname = `/${databaseName}`;
  if (role) url.username = role;
  if (password) url.password = password;
  return url.toString();
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function createLoginRole(pool: Pool, role: string): Promise<void> {
  const result = await pool.query<{ readonly sql: string }>(
    `SELECT format(
       'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD %L',
       $1::text,
       $2::text
     ) AS sql`,
    [role, runtimePassword]
  );
  const sql = result.rows[0]?.sql;
  if (!sql) throw new Error(`failed to create role ${role}`);
  await pool.query(sql);
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
  const address = server.address() as AddressInfo | null;
  if (!address) throw new Error('could not reserve worker health port');
  const port = address.port;
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
  return port;
}

async function seedWorkerAccount(pool: Pool): Promise<void> {
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status, activated_at)
     VALUES ($1, $2, 'Worker entrypoint tenant', 'active', now())`,
    [tenantId, `worker-entry-${suffix}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
     VALUES ($1, $2, $3, 'Worker entrypoint account', true)`,
    [accountId, tenantId, `worker-entry-account-${suffix}`]
  );
}

interface WorkerHandle {
  readonly child: ChildProcess;
  readonly output: () => string;
  readonly close: () => Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>;
}

const activeWorkers = new Set<WorkerHandle>();

function startWorker(databaseUrlValue: string, port: number): WorkerHandle {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', workerEntrypoint], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'staging',
      DATABASE_URL: databaseUrlValue,
      WORKER_ACCOUNT_ID: accountId,
      WORKER_INSTANCE_ID: `worker-entry-${suffix}-${port}`,
      WORKER_HEALTH_PORT: String(port),
      WORKER_INTERVAL_MS: '100',
      WORKER_PIX_SETTLEMENT_ENABLED: '0',
      WORKER_PIX_SYNTHETIC_ENABLED: '0',
      OTEL_ENABLED: 'false'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr?.on('data', (chunk: string) => {
    output += chunk;
  });

  let closeResult: { readonly code: number | null; readonly signal: NodeJS.Signals | null } | null =
    null;
  let resolveClose:
    | ((result: { readonly code: number | null; readonly signal: NodeJS.Signals | null }) => void)
    | null = null;
  const closePromise = new Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolveClosePromise) => {
    resolveClose = resolveClosePromise;
  });
  let handle: WorkerHandle | undefined;
  child.once('close', (code, signal) => {
    closeResult = { code, signal };
    resolveClose?.(closeResult);
    if (handle) activeWorkers.delete(handle);
  });

  handle = {
    child,
    output: () => output,
    close: () => (closeResult ? Promise.resolve(closeResult) : closePromise)
  };
  if (!handle) throw new Error('worker process handle was not initialized');
  activeWorkers.add(handle);
  return handle;
}

async function waitForHealth(
  port: number,
  path: '/health' | '/live' | '/metrics' | '/ready',
  predicate: (payload: Record<string, unknown>) => boolean,
  timeoutMs = 15_000
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        signal: AbortSignal.timeout(500)
      });
      const payload = (await response.json()) as Record<string, unknown>;
      if (response.status === 200 && predicate(payload)) return payload;
      lastError = `${response.status} ${JSON.stringify(payload)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 50));
  }
  throw new Error(`worker health ${path} did not become ready: ${lastError}`);
}

async function waitForDegradedReadiness(port: number, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/ready`, {
        signal: AbortSignal.timeout(500)
      });
      const payload = (await response.json()) as Record<string, unknown>;
      const readiness = payload.readiness as Record<string, unknown> | undefined;
      const dependencies = payload.dependencies as Record<string, unknown> | undefined;
      const worker = dependencies?.worker as Record<string, unknown> | undefined;
      if (
        response.status === 503 &&
        readiness?.ready === false &&
        worker?.state === 'degraded' &&
        String(worker.detail).includes('missing event bus consumers')
      ) {
        return;
      }
      lastError = `${response.status} ${JSON.stringify(payload)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 50));
  }
  throw new Error(`worker readiness did not remain explicitly degraded: ${lastError}`);
}

async function stopWorker(
  handle: WorkerHandle,
  signal: NodeJS.Signals
): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }> {
  if (handle.child.exitCode === null && handle.child.signalCode === null) {
    handle.child.kill(signal);
  }
  return handle.close();
}

async function inspectWorkerMutationPrivileges(
  connectionString: string
): Promise<readonly Record<string, unknown>[]> {
  const pool = new Pool({ connectionString });
  try {
    const result = await pool.query(
      `SELECT c.relname, c.relrowsecurity, privilege.privilege_type,
            has_table_privilege(current_user, c.oid, privilege.privilege_type) AS granted
       FROM pg_class c
       JOIN pg_namespace namespace ON namespace.oid = c.relnamespace
       CROSS JOIN (VALUES ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) privilege(privilege_type)
      WHERE namespace.nspname = 'public'
        AND c.relkind IN ('r', 'p')
        AND has_table_privilege(current_user, c.oid, privilege.privilege_type)
        AND NOT (
          c.relrowsecurity
          AND c.relname <> 'audit_events'
          AND privilege.privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
        )
        AND NOT (c.relrowsecurity AND c.relname = 'audit_events' AND privilege.privilege_type = 'INSERT')
      ORDER BY c.relname, privilege.privilege_type`
    );
    return result.rows;
  } finally {
    await pool.end();
  }
}

describe('real worker entrypoint under restricted runtime role', () => {
  const clusterAdmin = new Pool({ connectionString: ADMIN_DB_URL, max: 2 });
  const scratchUrl = databaseUrl(scratchDatabase);
  const scratchAdmin = new Pool({ connectionString: scratchUrl, max: 8 });
  const workerUrl = databaseUrl(scratchDatabase, workerRole, runtimePassword);

  beforeAll(async () => {
    await clusterAdmin.query(`CREATE DATABASE ${quoteIdentifier(scratchDatabase)}`);
    execFileSync('pnpm', ['exec', 'tsx', 'packages/db/src/migrate.ts'], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: scratchUrl },
      stdio: 'pipe'
    });
    await createLoginRole(clusterAdmin, apiRole);
    await createLoginRole(clusterAdmin, workerRole);
    await clusterAdmin.query(
      `GRANT CONNECT ON DATABASE ${quoteIdentifier(scratchDatabase)} TO ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
    );
    await seedWorkerAccount(scratchAdmin);
    const client = await scratchAdmin.connect();
    try {
      await reconcileRuntimeRoles(client, { apiRole, workerRole });
    } finally {
      client.release();
    }
  }, 120_000);

  afterAll(async () => {
    await Promise.all(
      [...activeWorkers].map((handle) => stopWorker(handle, 'SIGKILL').catch(() => undefined))
    );
    await scratchAdmin.query(
      `REASSIGN OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)} TO postgres`
    );
    await scratchAdmin.query(
      `DROP OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
    );
    await scratchAdmin.query(
      `REVOKE cvg_installer FROM ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
    );
    await scratchAdmin.end();
    await clusterAdmin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1',
      [scratchDatabase]
    );
    await clusterAdmin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(scratchDatabase)}`);
    await clusterAdmin.query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`);
    await clusterAdmin.query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`);
    await clusterAdmin.end();
  }, 30_000);

  it('opens live health, advances a real loop, survives SIGKILL, and restarts on the same port', async () => {
    const port = await reservePort();
    const first = startWorker(workerUrl, port);
    let firstReady: Record<string, unknown>;
    try {
      await waitForHealth(port, '/live', (payload) => {
        const liveness = payload.liveness as Record<string, unknown> | undefined;
        return liveness?.live === true;
      });
      await waitForHealth(port, '/metrics', (payload) => Number(payload.ticksCompleted) > 0);
      await waitForDegradedReadiness(port);
      firstReady = await waitForHealth(port, '/health', (payload) => {
        const dependencies = payload.dependencies as Record<string, unknown> | undefined;
        const database = dependencies?.database as Record<string, unknown> | undefined;
        const worker = dependencies?.worker as Record<string, unknown> | undefined;
        return database?.state === 'healthy' && worker?.state === 'degraded';
      });
    } catch (error) {
      const forbidden = await inspectWorkerMutationPrivileges(workerUrl);
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nworker output (tail):\n${first.output().slice(-4000)}\nforbidden privileges:\n${JSON.stringify(forbidden)}`
      );
    }
    const firstHealth = (await (await fetch(`http://127.0.0.1:${port}/health`)).json()) as Record<
      string,
      unknown
    >;
    const firstWorker = firstHealth.worker as Record<string, unknown>;
    const firstWorkerDependency = (firstHealth.dependencies as Record<string, unknown>)
      .worker as Record<string, unknown>;
    expect(firstReady.readiness).toMatchObject({ ready: false, persistenceMode: 'database' });
    expect(Number(firstWorker.uptime)).toBeGreaterThan(0);
    expect(firstWorkerDependency.state).toBe('degraded');
    expect(String(firstWorkerDependency.detail)).toMatch(/missing event bus consumers/);
    const firstForbidden = await inspectWorkerMutationPrivileges(workerUrl);
    expect(firstForbidden, JSON.stringify(firstForbidden)).toEqual([]);

    const killed = await stopWorker(first, 'SIGKILL');
    expect(killed.signal).toBe('SIGKILL');
    expect(first.output()).not.toMatch(/Unsafe PostgreSQL runtime role|database unavailable/i);

    const second = startWorker(workerUrl, port);
    await waitForHealth(port, '/metrics', (payload) => Number(payload.ticksCompleted) > 0);
    await waitForDegradedReadiness(port);
    const secondReady = await waitForHealth(port, '/health', (payload) => {
      const readiness = payload.readiness as Record<string, unknown> | undefined;
      const dependencies = payload.dependencies as Record<string, unknown> | undefined;
      const database = dependencies?.database as Record<string, unknown> | undefined;
      const worker = dependencies?.worker as Record<string, unknown> | undefined;
      return (
        readiness?.persistenceMode === 'database' &&
        database?.state === 'healthy' &&
        worker?.state === 'degraded'
      );
    });
    expect(secondReady.readiness).toMatchObject({ ready: false, persistenceMode: 'database' });
    const secondHealth = (await (await fetch(`http://127.0.0.1:${port}/health`)).json()) as Record<
      string,
      unknown
    >;
    const secondWorker = secondHealth.worker as Record<string, unknown>;
    const secondWorkerDependency = (secondHealth.dependencies as Record<string, unknown>)
      .worker as Record<string, unknown>;
    expect(Number(secondWorker.uptime)).toBeGreaterThan(0);
    expect(secondWorkerDependency.state).toBe('degraded');
    expect(String(secondWorkerDependency.detail)).toMatch(/missing event bus consumers/);
    const secondForbidden = await inspectWorkerMutationPrivileges(workerUrl);
    expect(secondForbidden, JSON.stringify(secondForbidden)).toEqual([]);
    expect(await stopWorker(second, 'SIGTERM')).toEqual({ code: 0, signal: null });
    expect(second.output()).not.toMatch(/worker crashed|Unsafe PostgreSQL runtime role/i);
  }, 60_000);
});
