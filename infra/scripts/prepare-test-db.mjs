#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const composeFile = resolve(rootDir, 'docker-compose.dev.yml');
const defaultDatabaseUrl = new URL('postgres://localhost:5433/cvg_his_v2_test');
defaultDatabaseUrl.username = 'postgres';
defaultDatabaseUrl.password = 'postgres';
const databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl.toString();
const skipSetup = process.env.SKIP_DB_SETUP === 'true';
const requireFromSharedDatabase = createRequire(
  resolve(rootDir, 'packages/shared/database/package.json')
);
const { Client } = requireFromSharedDatabase('pg');

if (skipSetup) {
  console.log('SKIP_DB_SETUP=true - skipping database preparation.');
  console.log('Ensure DATABASE_URL points to an existing database with schema applied.');
  process.exit(0);
}

function getAdminDatabaseUrl(connectionString) {
  const url = new URL(connectionString);
  url.pathname = '/postgres';
  return url.toString();
}

function getDatabaseName(connectionString) {
  const url = new URL(connectionString);
  return url.pathname.replace(/^\//, '') || 'postgres';
}

function runCommand(cmd, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd: rootDir,
      stdio: options.stdio ?? 'pipe',
      ...options
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
      } else {
        reject(new Error(stderr || stdout || `Command failed: ${cmd} ${args.join(' ')}`));
      }
    });
  });
}

async function sleep(ms) {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function canConnect(connectionString) {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function waitForStableConnections(connectionString, requiredSuccesses = 3) {
  let consecutiveSuccesses = 0;

  for (let attempt = 1; attempt <= requiredSuccesses * 5; attempt += 1) {
    if (await canConnect(connectionString)) {
      consecutiveSuccesses += 1;
      if (consecutiveSuccesses >= requiredSuccesses) {
        return true;
      }
    } else {
      consecutiveSuccesses = 0;
    }

    await sleep(1000);
  }

  return false;
}

async function ensureDatabaseExists() {
  const targetDatabase = getDatabaseName(databaseUrl);
  const adminClient = new Client({ connectionString: getAdminDatabaseUrl(databaseUrl) });

  await adminClient.connect();
  try {
    const result = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      targetDatabase
    ]);

    if (result.rowCount === 0) {
      try {
        await adminClient.query(`CREATE DATABASE "${targetDatabase}"`);
        console.log(`Created database ${targetDatabase}.`);
      } catch (error) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? String(error.code)
            : undefined;

        // PostgreSQL can finish materializing POSTGRES_DB moments after the server
        // accepts admin connections. Treat duplicate-database as ready state.
        if (code !== '42P04') {
          throw error;
        }
      }
    }
  } finally {
    await adminClient.end();
  }
}

async function resetDatabase() {
  const targetDatabase = getDatabaseName(databaseUrl);
  const adminClient = new Client({ connectionString: getAdminDatabaseUrl(databaseUrl) });

  await adminClient.connect();
  try {
    await adminClient.query(
      `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()
      `,
      [targetDatabase]
    );
    await adminClient.query(`DROP DATABASE IF EXISTS "${targetDatabase}"`);
    await adminClient.query(`CREATE DATABASE "${targetDatabase}"`);
    console.log(`Reset database ${targetDatabase}.`);
  } finally {
    await adminClient.end();
  }
}

async function ensurePostgresRunning() {
  const adminDatabaseUrl = getAdminDatabaseUrl(databaseUrl);

  // In E2E/release gates the database may already be provisioned, but the
  // published host port can take a few extra seconds to accept connections
  // even after the container healthcheck turns green.
  for (let attempt = 1; attempt <= 15; attempt += 1) {
    try {
      if (await waitForStableConnections(databaseUrl)) {
        console.log('Using existing PostgreSQL instance.');
        return;
      }

      if (await canConnect(adminDatabaseUrl)) {
        await ensureDatabaseExists();
        if (await waitForStableConnections(databaseUrl)) {
          console.log('Using existing PostgreSQL server with newly prepared database.');
          return;
        }
      }
    } catch {
      // Keep retrying before falling back to Docker bootstrap.
    }

    await sleep(1000);
  }

  try {
    if (await canConnect(adminDatabaseUrl)) {
      await ensureDatabaseExists();
      if (await waitForStableConnections(databaseUrl)) {
        console.log('Using existing PostgreSQL server with newly prepared database.');
        return;
      }
    }
  } catch {
    // Fall through to Docker bootstrap if local instance cannot be prepared.
  }

  try {
    await runCommand('docker', ['compose', '-f', composeFile, 'up', '-d', 'postgres'], {
      stdio: 'inherit'
    });
  } catch (error) {
    // If the port is already bound, try the existing local postgres one more time.
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('address already in use')) {
      if (await waitForStableConnections(databaseUrl)) {
        console.log('Using existing PostgreSQL instance bound on configured port.');
        return;
      }

      if (await canConnect(adminDatabaseUrl)) {
        await ensureDatabaseExists();
        if (await waitForStableConnections(databaseUrl)) {
          console.log('Using existing PostgreSQL server with newly prepared database.');
          return;
        }
      }
    }

    throw new Error(
      `Docker bootstrap failed: ${message}\n\nTip: Set SKIP_DB_SETUP=true and configure DATABASE_URL to use an existing PostgreSQL instance.`
    );
  }

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (await waitForStableConnections(databaseUrl)) {
      return;
    }

    try {
      const { stdout } = await runCommand(
        'docker',
        ['compose', '-f', composeFile, 'ps', '--format', 'json', 'postgres'],
        { stdio: 'pipe' }
      );

      if (stdout.includes('healthy')) {
        await ensureDatabaseExists().catch(() => {});
        if (await waitForStableConnections(databaseUrl)) {
          return;
        }
      }
    } catch {
      // Keep retry loop simple; connection success is the source of truth.
    }

    await sleep(1000);
  }

  throw new Error('PostgreSQL did not become healthy in time');
}

async function applySchema() {
  await runCommand('npx', ['tsx', 'packages/db/src/migrate.ts'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl
    }
  });
}

async function main() {
  console.log('Preparing PostgreSQL for db-persistence tests...');
  await ensurePostgresRunning();
  await resetDatabase();
  await applySchema();
  console.log('Database ready for db-persistence tests.');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  console.error('');
  console.error('=== Troubleshooting ===');
  console.error(
    '• To use an existing PostgreSQL instance, set: SKIP_DB_SETUP=true and DATABASE_URL'
  );
  console.error(
    '  Example: SKIP_DB_SETUP=true DATABASE_URL="$DATABASE_URL_TEST" pnpm test:db'
  );
  console.error('• To use Docker, ensure Docker is running and docker-compose is available.');
  console.error('• For CI environments, ensure PostgreSQL is pre-configured via DATABASE_URL.');
  process.exit(1);
});
