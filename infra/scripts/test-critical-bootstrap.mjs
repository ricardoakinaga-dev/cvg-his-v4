#!/usr/bin/env node
/**
 * test:critical bootstrap script
 *
 * Provisions the test database and runs the critical test suite.
 * Usage:
 *   node infra/scripts/test-critical-bootstrap.mjs
 *   DATABASE_URL_TEST="$DATABASE_URL_TEST" node infra/scripts/test-critical-bootstrap.mjs
 *
 * Requirements:
 *   - Docker + docker compose available to start the isolated test PostgreSQL service
 *   - PostgreSQL accessible at DATABASE_URL_TEST (default: localhost:5433)
 *   - pnpm installed
 *
 * What this script does:
 *   1. Starts the isolated PostgreSQL test service
 *   2. Validates PostgreSQL connectivity
 *   3. Runs pnpm test:critical with REQUIRE_TEST_DB=1
 *
 * The Vitest global setup owns database reset, canonical migration application,
 * and seed provisioning.
 */

import { execSync } from 'node:child_process';
import { env } from 'node:process';

import { waitForPostgres } from './test-critical-bootstrap-lib.mjs';

function resolveDefaultTestDbUrl() {
  if (env.DATABASE_URL_TEST ?? env.DATABASE_URL) {
    return env.DATABASE_URL_TEST ?? env.DATABASE_URL;
  }

  const url = new URL('postgres://localhost:5433/cvg_his_v2_test');
  url.username = 'postgres';
  url.password = 'postgres';
  url.pathname = `${url.pathname}_${process.pid}`;
  return url.toString();
}

const TEST_DB_URL = resolveDefaultTestDbUrl();
const TEST_DB_NAME = new URL(TEST_DB_URL).pathname.replace(/^\//, '');
const ADMIN_DB_URL = (() => {
  const u = new URL(TEST_DB_URL);
  u.pathname = '/postgres';
  return u.toString();
})();
const COMPOSE_FILE = 'docker-compose.test.yml';

function log(msg) {
  console.log(`[test-critical-bootstrap] ${msg}`);
}

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { stdio: 'inherit', env: { ...env, ...opts.env }, cwd: process.cwd() });
  } catch (err) {
    log(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

function cleanupRunner() {
  run('node infra/scripts/cleanup-test-runner.mjs --kill-orphans --drop-stale-dbs');
}

async function main() {
  log(`Using test database: ${TEST_DB_NAME}`);
  log(`Database URL: ${TEST_DB_URL.replace(/\/\/.*:.*@/, '//***:***@')}`);

  log('Cleaning orphan test processes and stale ephemeral databases...');
  cleanupRunner();

  // Step 1: Start isolated test PostgreSQL and validate connectivity
  log('Starting isolated PostgreSQL test service...');
  run(`docker compose -f ${COMPOSE_FILE} up -d postgres-test`);

  log('Checking PostgreSQL connectivity...');
  const connected = await waitForPostgres({ databaseUrl: ADMIN_DB_URL });

  if (!connected) {
    log('ERROR: Cannot connect to isolated PostgreSQL test service.');
    log(`Expected connection string: ${TEST_DB_URL.replace(/\/\/.*:.*@/, '//***:***@')}`);
    log('For local validation: pnpm test:db:start');
    process.exit(1);
  }
  log('PostgreSQL is reachable.');

  // Step 2: Run critical tests. The Vitest global setup owns reset + migrate + seed.
  log('Running critical tests with canonical DB setup...');
  run(
    `REQUIRE_TEST_DB=1 DATABASE_URL_TEST="${TEST_DB_URL}" DATABASE_URL="${TEST_DB_URL}" pnpm test:critical`
  );

  log('All critical tests passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
