#!/usr/bin/env node
/**
 * Provision the default isolated Docker service, or reuse DATABASE_URL_TEST.
 * The canonical critical harness creates ephemeral databases, migrates and seeds
 * them. An explicitly configured database never triggers Docker or a fallback.
 * --check-only verifies connectivity without executing the critical suite.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

export function resolveBootstrapDatabase(environment = process.env) {
  const explicit = Boolean(environment.DATABASE_URL_TEST?.trim());
  const connectionString = explicit
    ? environment.DATABASE_URL_TEST.trim()
    : 'postgres://postgres:postgres@127.0.0.1:5433/cvg_his_v2_test';
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL_TEST must be a valid PostgreSQL URL');
  }
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !/^[a-zA-Z0-9_]+$/.test(name) || !/(?:^|_)(?:test|e2e)(?:_|$)/i.test(name)) {
    throw new Error('Refusing a database without an explicit test/e2e name');
  }
  url.pathname = '/postgres';
  return { explicit, connectionString, adminUrl: url.toString(), name };
}

async function probeDatabase(connectionString) {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
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

function run(command, args, environment) {
  execFileSync(command, args, { stdio: 'inherit', env: environment });
}

export async function bootstrapCritical({
  environment = process.env,
  checkOnly = false,
  probe = probeDatabase,
  execute = run,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log = (message) => console.log(`[test-critical-bootstrap] ${message}`)
} = {}) {
  const database = resolveBootstrapDatabase(environment);
  log(`Checking isolated test database: ${database.name}`);
  // An explicit target is a contract, not merely an address for a cluster.
  // Connecting to /postgres would hide a typo or missing configured database.
  const probeUrl = database.explicit ? database.connectionString : database.adminUrl;
  let connected = await probe(probeUrl);
  if (!connected && database.explicit) {
    throw new Error('Explicit test PostgreSQL is unreachable; refusing Docker or in-memory fallback');
  }
  if (!connected) {
    execute('docker', ['compose', '-f', 'docker-compose.test.yml', 'up', '-d', 'postgres-test'], environment);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      connected = await probe(database.adminUrl);
      if (connected) break;
      if (attempt < 29) await sleep(1000);
    }
  }
  if (!connected) throw new Error('Isolated test PostgreSQL is unreachable');
  log('PostgreSQL is reachable.');
  if (checkOnly) return;
  execute(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['test:critical'], {
    ...environment,
    REQUIRE_TEST_DB: '1',
    DATABASE_URL_TEST: database.connectionString,
    DATABASE_URL: database.connectionString
  });
  log('All critical tests passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check-only')) {
    console.error('Usage: test-critical-bootstrap.mjs [--check-only]');
    process.exitCode = 1;
  } else {
    bootstrapCritical({ checkOnly: args.includes('--check-only') }).catch((error) => {
      // Connection strings and provider errors can contain credentials.
      console.error(`[test-critical-bootstrap] ${error instanceof Error && !('status' in error) ? error.message : 'Critical command failed; inspect its output'}`);
      process.exitCode = 1;
    });
  }
}
