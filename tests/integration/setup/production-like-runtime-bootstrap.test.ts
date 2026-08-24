import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import {
  bootstrapWorkerServices,
  shutdownWorkerServices
} from '../../../apps/worker/src/bootstrap.js';
import { ADMIN_DB_URL, TEST_DB_URL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const scratchDatabase = `cvg_runtime_bootstrap_${process.pid}_${suffix}`;
const apiRole = `cvg_bootstrap_api_${suffix}`;
const workerRole = `cvg_bootstrap_worker_${suffix}`;
const unsafeRole = `cvg_bootstrap_unsafe_${suffix}`;
const runtimePassword = `runtime_${suffix}_password`;
const unsafePassword = `unsafe_${suffix}_password`;

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

async function createLoginRole(
  pool: Pool,
  role: string,
  password: string,
  options: { readonly superuser?: boolean } = {}
): Promise<void> {
  const statement = await pool.query<{ sql: string }>(
    `SELECT format(
       'CREATE ROLE %I LOGIN %s PASSWORD %L',
       $1::text,
       $2::text,
       $3::text
     ) AS sql`,
    [
      role,
      options.superuser
        ? 'SUPERUSER'
        : 'NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
      password
    ]
  );
  const sql = statement.rows[0]?.sql;
  if (!sql) throw new Error(`Failed to build CREATE ROLE statement for ${role}`);
  await pool.query(sql);
}

async function configureRestrictedRole(pool: Pool, role: string): Promise<void> {
  const identifier = quoteIdentifier(role);
  await pool.query(
    `ALTER ROLE ${identifier}
       LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
     REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, ${identifier};
     REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, ${identifier};
     REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC, ${identifier};
     GRANT USAGE ON SCHEMA public, app TO ${identifier};`
  );

  const tables = await pool.query<{ readonly table_name: string }>(
    `SELECT c.relname AS table_name
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')`
  );
  for (const table of tables.rows) {
    const tableIdentifier = `public.${quoteIdentifier(table.table_name)}`;
    await pool.query(`GRANT SELECT ON TABLE ${tableIdentifier} TO ${identifier}`);
    // The bootstrap probes catalog metadata only; keep this fixture read-only
    // so the role inspection cannot be satisfied by broad DML privileges.
  }

  const sequences = await pool.query<{ readonly sequence_name: string }>(
    `SELECT sequence_name
       FROM information_schema.sequences
      WHERE sequence_schema = 'public'`
  );
  for (const sequence of sequences.rows) {
    await pool.query(
      `GRANT USAGE, SELECT ON SEQUENCE public.${quoteIdentifier(sequence.sequence_name)} TO ${identifier}`
    );
  }

  await pool.query(
    `GRANT EXECUTE ON FUNCTION app.current_account_id(), app.has_account_context() TO ${identifier}`
  );
}

async function runEntrypoint(
  entrypoint: string,
  environment: 'staging' | 'stage',
  extraEnv: Record<string, string>
): Promise<{ readonly code: number | null; readonly output: string }> {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', resolve(ROOT, entrypoint)], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: environment,
      OTEL_ENABLED: 'false',
      AUTH_SECRET: `process-test-secret-${suffix}-${'x'.repeat(48)}`,
      CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:3000',
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const outputParts: string[] = [];
  child.stdout.on('data', (chunk: Buffer) => outputParts.push(chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => outputParts.push(chunk.toString()));

  const result = await new Promise<{ readonly code: number | null; readonly output: string }>(
    (resolveResult, reject) => {
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`${entrypoint} stayed alive after fail-closed bootstrap`));
      }, 15_000);

      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('exit', (code) => {
        clearTimeout(timeout);
        resolveResult({ code, output: outputParts.join('') });
      });
    }
  );

  return result;
}

describe('production-like bootstrap uses a real restricted role and fails closed', () => {
  const clusterAdmin = new Pool({ connectionString: ADMIN_DB_URL, max: 2 });
  const scratchUrl = databaseUrl(scratchDatabase);
  const scratchAdmin = new Pool({ connectionString: scratchUrl, max: 4 });
  const apiUrl = databaseUrl(scratchDatabase, apiRole, runtimePassword);
  const workerUrl = databaseUrl(scratchDatabase, workerRole, runtimePassword);
  const unsafeUrl = databaseUrl(scratchDatabase, unsafeRole, unsafePassword);

  beforeAll(async () => {
    await clusterAdmin.query(`CREATE DATABASE ${quoteIdentifier(scratchDatabase)}`);
    execFileSync('pnpm', ['exec', 'tsx', 'packages/db/src/migrate.ts'], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: scratchUrl },
      stdio: 'pipe'
    });

    await createLoginRole(clusterAdmin, apiRole, runtimePassword);
    await createLoginRole(clusterAdmin, workerRole, runtimePassword);
    await createLoginRole(clusterAdmin, unsafeRole, unsafePassword, { superuser: true });
    await clusterAdmin.query(
      `GRANT CONNECT ON DATABASE ${quoteIdentifier(scratchDatabase)} TO ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
    );

    await configureRestrictedRole(scratchAdmin, apiRole);
    await configureRestrictedRole(scratchAdmin, workerRole);
  }, 120_000);

  afterAll(async () => {
    await shutdownServices();
    await shutdownWorkerServices();
    await scratchAdmin.end();
    await clusterAdmin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1',
      [scratchDatabase]
    );
    await clusterAdmin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(scratchDatabase)}`);
    await clusterAdmin.query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`);
    await clusterAdmin.query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`);
    await clusterAdmin.query(`DROP ROLE IF EXISTS ${quoteIdentifier(unsafeRole)}`);
    await clusterAdmin.end();
  }, 120_000);

  it('proves the restricted API and worker logins are NOBYPASSRLS before bootstrap', async () => {
    const result = await scratchAdmin.query<{
      readonly rolname: string;
      readonly rolbypassrls: boolean;
      readonly rolsuper: boolean;
    }>(
      `SELECT rolname, rolbypassrls, rolsuper
         FROM pg_roles
        WHERE rolname = ANY($1::text[])
        ORDER BY rolname`,
      [[apiRole, workerRole]]
    );

    expect(result.rows).toEqual([
      { rolname: apiRole, rolbypassrls: false, rolsuper: false },
      { rolname: workerRole, rolbypassrls: false, rolsuper: false }
    ]);
  });

  it('rejects an unsafe login role in the API and worker production-like bootstraps', async () => {
    await expect(
      bootstrapServices({
        environment: 'staging',
        databaseUrl: unsafeUrl,
        maxRetries: 1,
        retryDelayMs: 0
      })
    ).rejects.toThrow(/Unsafe PostgreSQL runtime role/);
    await shutdownServices();

    await expect(
      bootstrapWorkerServices({ environment: 'stage', databaseUrl: unsafeUrl })
    ).rejects.toThrow(/Unsafe PostgreSQL runtime role/);
    await shutdownWorkerServices();
  }, 30_000);

  it('rejects an incomplete schema in the API instead of composing a mixed runtime', async () => {
    await scratchAdmin.query(
      'ALTER TABLE public.inbox_events RENAME TO bootstrap_inbox_events_missing'
    );
    try {
      await expect(
        bootstrapServices({
          environment: 'staging',
          databaseUrl: apiUrl,
          maxRetries: 1,
          retryDelayMs: 0
        })
      ).rejects.toThrow(/Production database runtime is not ready|unitOfWork|fallback/i);
    } finally {
      await shutdownServices();
      await scratchAdmin.query(
        'ALTER TABLE public.bootstrap_inbox_events_missing RENAME TO inbox_events'
      );
    }
  }, 60_000);

  it('rejects an incomplete delivery schema in the worker instead of entering its loop', async () => {
    await scratchAdmin.query(
      'ALTER TABLE public.inbox_events RENAME TO bootstrap_inbox_events_missing'
    );
    try {
      await expect(
        bootstrapWorkerServices({ environment: 'staging', databaseUrl: workerUrl })
      ).rejects.toThrow(/delivery guarantee schema is not ready/i);
    } finally {
      await shutdownWorkerServices();
      await scratchAdmin.query(
        'ALTER TABLE public.bootstrap_inbox_events_missing RENAME TO inbox_events'
      );
    }
  }, 60_000);
});

describe('production-like entrypoints do not listen or loop after bootstrap failure', () => {
  it.each([
    ['apps/api/src/index.ts', 'api', '30191'],
    ['apps/worker/src/index.ts', 'worker', '30291']
  ] as const)(
    'exits without a %s listener for an unavailable staging database',
    async (entrypoint, service, port) => {
      const result = await runEntrypoint(entrypoint, 'staging', {
        DATABASE_URL: `postgresql://invalid:invalid@127.0.0.1:1/${service}_unavailable`,
        ...(service === 'api' ? { PORT: port } : { WORKER_HEALTH_PORT: port })
      });

      expect(result.code).not.toBe(0);
      expect(result.output).not.toMatch(/(?:api server|worker health endpoint) listening/i);
    },
    30_000
  );
});
