#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');
const composeFile = resolve(rootDir, 'docker-compose.dev.yml');
const schemaFile = resolve(
  rootDir,
  'packages/shared/database/src/migrations/001_initial_schema.sql'
);
const databaseUrl = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/cvg_his_test';
const requireFromSharedDatabase = createRequire(
  resolve(rootDir, 'packages/shared/database/package.json')
);
const { Client } = requireFromSharedDatabase('pg');

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

async function ensureDatabaseExists() {
  const targetDatabase = getDatabaseName(databaseUrl);
  const adminClient = new Client({ connectionString: getAdminDatabaseUrl(databaseUrl) });

  await adminClient.connect();
  try {
    const result = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      targetDatabase
    ]);

    if (result.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${targetDatabase}"`);
      console.log(`Created database ${targetDatabase}.`);
    }
  } finally {
    await adminClient.end();
  }
}

async function ensurePostgresRunning() {
  try {
    if (await canConnect(databaseUrl)) {
      console.log('Using existing PostgreSQL instance.');
      return;
    }

    if (await canConnect(getAdminDatabaseUrl(databaseUrl))) {
      await ensureDatabaseExists();
      if (await canConnect(databaseUrl)) {
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
      if (await canConnect(databaseUrl)) {
        console.log('Using existing PostgreSQL instance bound on configured port.');
        return;
      }

      if (await canConnect(getAdminDatabaseUrl(databaseUrl))) {
        await ensureDatabaseExists();
        if (await canConnect(databaseUrl)) {
          console.log('Using existing PostgreSQL server with newly prepared database.');
          return;
        }
      }
    }

    throw error;
  }

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (await canConnect(databaseUrl)) {
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
        if (await canConnect(databaseUrl)) {
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
  const schemaSql = readFileSync(schemaFile, 'utf8');
  const reconcileSql = `
ALTER TABLE clinical_entries ADD COLUMN IF NOT EXISTS account_id VARCHAR(255);
ALTER TABLE clinical_timeline ADD COLUMN IF NOT EXISTS account_id VARCHAR(255);
ALTER TABLE clinical_timeline ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP;
ALTER TABLE notification_jobs ADD COLUMN IF NOT EXISTS account_id VARCHAR(255);
`;

  const sql = `
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
${schemaSql}
${reconcileSql}
`;

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('Preparing PostgreSQL for db-persistence tests...');
  await ensurePostgresRunning();
  await applySchema();
  console.log('Database ready for db-persistence tests.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
