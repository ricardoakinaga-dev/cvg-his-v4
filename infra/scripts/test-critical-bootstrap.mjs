#!/usr/bin/env node
/**
 * test:critical bootstrap script
 *
 * Provisions the test database and runs the critical test suite.
 * Usage:
 *   node infra/scripts/test-critical-bootstrap.mjs
 *   DATABASE_URL_TEST=postgres://user:pass@host:5433/cvg_his_v2_test node infra/scripts/test-critical-bootstrap.mjs
 *
 * Requirements:
 *   - PostgreSQL accessible at DATABASE_URL_TEST (default: localhost:5432)
 *   - pnpm installed
 *
 * What this script does:
 *   1. Validates PostgreSQL connectivity
 *   2. Creates/resets the test database
 *   3. Applies Drizzle migration
 *   4. Applies seed data
 *   5. Runs pnpm test:critical
 */

import { execSync } from 'node:child_process';
import { env } from 'node:process';

const TEST_DB_URL =
  env.DATABASE_URL_TEST ??
  env.DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5432/cvg_his_v2_test';
const TEST_DB_NAME = new URL(TEST_DB_URL).pathname.replace(/^\//, '');
const ADMIN_DB_URL = (() => {
  const u = new URL(TEST_DB_URL);
  u.pathname = '/postgres';
  return u.toString();
})();

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

async function main() {
  log(`Using test database: ${TEST_DB_NAME}`);
  log(`Database URL: ${TEST_DB_URL.replace(/\/\/.*:.*@/, '//***:***@')}`);

  // Step 1: Validate PostgreSQL connectivity
  log('Checking PostgreSQL connectivity...');
  try {
    run(`psql "${ADMIN_DB_URL}" -c "SELECT 1"`, { env: { PGCONNECT_TIMEOUT: '5' } });
    log('PostgreSQL is reachable.');
  } catch {
    log('ERROR: Cannot connect to PostgreSQL.');
    log('Make sure PostgreSQL is running and accessible.');
    log('For local testing: pnpm test:db:start');
    process.exit(1);
  }

  // Step 2: Create/reset test database
  log('Creating test database if not exists...');
  run(
    `psql "${ADMIN_DB_URL}" -c "SELECT 'CREATE DATABASE \\"${TEST_DB_NAME}\\"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${TEST_DB_NAME}')\\gexec"`
  );

  // Step 3: Apply migration
  log('Applying Drizzle migration...');
  run(`DATABASE_URL="${TEST_DB_URL}" npx tsx packages/db/src/migrate.ts`);

  // Step 4: Apply seed
  log('Applying seed data...');
  run(
    `DATABASE_URL="${TEST_DB_URL}" ADMIN_EMAIL=test@cvg.local ADMIN_PASSWORD=Test123! npx tsx packages/db/src/seed.ts`
  );

  // Step 5: Run critical tests
  log('Running critical tests...');
  run(`DATABASE_URL_TEST="${TEST_DB_URL}" DATABASE_URL="${TEST_DB_URL}" pnpm test:critical`);

  log('All critical tests passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
