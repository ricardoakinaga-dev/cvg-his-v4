#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const HOOK_TIMEOUT_MS = 120_000;
const PROCESS_TESTS = [
  {
    id: 'inpatient-domain-sigkill',
    file: 'tests/integration/process/inpatient-domain-sigkill.test.ts'
  },
  {
    id: 'inpatient-clinical-financial-restart',
    file: 'tests/integration/process/inpatient-clinical-financial-restart.test.ts'
  },
  {
    id: 'inpatient-cash-receipt-sigkill',
    file: 'tests/integration/process/inpatient-cash-receipt-sigkill.test.ts'
  },
  {
    id: 'inpatient-cash-receipt-concurrency',
    file: 'tests/integration/process/inpatient-cash-receipt-concurrency.test.ts'
  },
  {
    id: 'pix-provider-settlement-sigkill',
    file: 'tests/integration/process/pix-provider-settlement-sigkill.test.ts'
  },
  {
    id: 'worker-runtime-entrypoint',
    file: 'tests/integration/process/worker-runtime-entrypoint.test.ts'
  },
  {
    id: 'webhook-delivery-sigkill',
    file: 'tests/integration/process/webhook-delivery-sigkill.test.ts'
  }
];

function log(message) {
  console.log(`[critical-process-suite] ${message}`);
}

function normalizeSuffix(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function suffixFingerprint(value) {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function resolveSuiteSuffix() {
  const configuredSuffix = normalizeSuffix(process.env.TEST_DB_SUFFIX ?? '');
  const configuredFingerprint = suffixFingerprint(configuredSuffix || 'default');
  return `critical_process_${process.pid}_${configuredFingerprint}`;
}

function resolveTestSuffix(suiteSuffix, index, testId) {
  return `${suiteSuffix}_${String(index + 1).padStart(2, '0')}_${testId}`.slice(0, 40);
}

function buildVitestArgs(file) {
  return [
    'exec',
    'vitest',
    'run',
    file,
    '--config',
    'vitest.integration.config.ts',
    '--reporter=verbose',
    '--no-cache',
    '--no-file-parallelism',
    `--hookTimeout=${HOOK_TIMEOUT_MS}`,
    `--teardownTimeout=${HOOK_TIMEOUT_MS}`
  ];
}

function validateManifest() {
  const testIds = new Set();
  const testFiles = new Set();

  for (const test of PROCESS_TESTS) {
    if (testIds.has(test.id) || testFiles.has(test.file)) {
      throw new Error(`Duplicate process-suite manifest entry: ${test.id} (${test.file})`);
    }
    if (!existsSync(test.file)) {
      throw new Error(`Required process test is missing: ${test.file}`);
    }

    testIds.add(test.id);
    testFiles.add(test.file);
  }
}

function printManifest() {
  for (const test of PROCESS_TESTS) {
    console.log(test.file);
  }
}

function runTest(test, index, suiteSuffix, dryRun) {
  const testSuffix = resolveTestSuffix(suiteSuffix, index, test.id);
  const args = buildVitestArgs(test.file);
  const env = {
    ...process.env,
    REQUIRE_TEST_DB: '1',
    TEST_DB_EPHEMERAL: '1',
    TEST_DB_SUFFIX: testSuffix
  };

  log(`[${index + 1}/${PROCESS_TESTS.length}] ${test.file} (db suffix: ${testSuffix})`);
  if (dryRun) {
    log(`dry run: pnpm ${args.join(' ')}`);
    return 0;
  }

  const result = spawnSync('pnpm', args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit'
  });

  if (result.error) {
    console.error(`[critical-process-suite] Failed to start ${test.file}: ${result.error.message}`);
    return 1;
  }

  if (result.status !== 0) {
    const reason = result.signal ? `signal ${result.signal}` : `exit ${result.status ?? 1}`;
    console.error(`[critical-process-suite] ${test.file} failed (${reason}); stopping suite.`);
    return result.status ?? 1;
  }

  return 0;
}

function main() {
  const listOnly = process.argv.includes('--list');
  const dryRun = process.argv.includes('--dry-run');

  validateManifest();
  if (listOnly) {
    printManifest();
    return 0;
  }

  const suiteSuffix = resolveSuiteSuffix();
  for (const [index, test] of PROCESS_TESTS.entries()) {
    const exitCode = runTest(test, index, suiteSuffix, dryRun);
    if (exitCode !== 0) {
      return exitCode;
    }
  }

  log(`Completed ${PROCESS_TESTS.length} process test(s) serially.`);
  return 0;
}

process.exitCode = main();
