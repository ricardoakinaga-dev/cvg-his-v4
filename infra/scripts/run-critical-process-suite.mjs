#!/usr/bin/env node

import { existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

import {
  cleanupOwnedProcess,
  preserveFailureArtifact,
  readBoundedReportText,
  removeReportEntry,
  resolveRunnerTimeoutMs,
  runOwnedProcess,
  sanitizeReportInPlace,
  sanitizeDiagnostic
} from './critical-process-suite-runtime.mjs';

const HOOK_TIMEOUT_MS = 120_000;
const RUNNER_TIMEOUT_MS = resolveRunnerTimeoutMs();
const EPHEMERAL_DATABASE_CLEANUP_TIMEOUT_MS = 15_000;
const EPHEMERAL_DATABASE_CLOSE_TIMEOUT_MS = 5_000;
const PROCESS_TESTS = [
  {
    id: 'setup-installation-to-session',
    file: 'tests/integration/process/setup-installation-to-session.test.ts'
  },
  {
    id: 'public-laboratory-structured-results',
    file: 'tests/integration/process/public-laboratory-structured-results.test.ts'
  },
  {
    id: 'inpatient-domain-sigkill',
    file: 'tests/integration/process/inpatient-domain-sigkill.test.ts'
  },
  {
    id: 'inpatient-clinical-financial-restart',
    file: 'tests/integration/process/inpatient-clinical-financial-restart.test.ts'
  },
  {
    id: 'inpatient-clinical-financial-child-process',
    file: 'tests/integration/process/inpatient-clinical-financial-child-process.test.ts'
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

const SIGNAL_EXIT_CODES = {
  SIGINT: 130,
  SIGTERM: 143,
  SIGKILL: 137
};
const PACKAGE_MANAGER_COMMAND = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const APPROVED_TEST_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const TEST_DATABASE_NAME_PATTERN = /^cvg_his_v2_test(?:_[a-z0-9_]+)*$/;

function resolveDefaultTestDatabaseUrl() {
  const url = new URL('postgres://localhost:5433/cvg_his_v2_test');
  url.username = 'postgres';
  url.password = 'postgres';
  return url.toString();
}

const CHILD_ENVIRONMENT_KEYS = new Set([
  'CI',
  'ComSpec',
  'COREPACK_HOME',
  'FORCE_COLOR',
  'HOME',
  'LANG',
  'LANGUAGE',
  'LC_ALL',
  'LC_CTYPE',
  'LOG_LEVEL',
  'NVM_BIN',
  'NO_COLOR',
  'PATH',
  'PNPM_HOME',
  'REDIS_CLI_BIN',
  'REDIS_SERVER_BIN',
  'REDIS_SERVER_LIBRARY_PATH',
  'PATHEXT',
  'TEMP',
  'TERM',
  'TMP',
  'TMPDIR',
  'SystemRoot',
  'WINDIR'
]);

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

function buildVitestArgs(file, reportPath) {
  return [
    'exec',
    'vitest',
    'run',
    file,
    '--config',
    'vitest.integration.config.ts',
    '--reporter=verbose',
    '--reporter=json',
    `--outputFile=${reportPath}`,
    '--no-cache',
    '--no-file-parallelism',
    `--hookTimeout=${HOOK_TIMEOUT_MS}`,
    `--teardownTimeout=${HOOK_TIMEOUT_MS}`
  ];
}

function quoteWindowsCommandArgument(argument) {
  const value = String(argument);
  if (/^[A-Za-z0-9_./\\:@=+,-]+$/.test(value)) return value;
  const escaped = value.replace(/([()%!^&|<>])/g, '^$1').replace(/"/g, '""');
  return `"${escaped}"`;
}

export function resolvePackageManagerInvocation(args) {
  if (process.platform !== 'win32') {
    return { command: PACKAGE_MANAGER_COMMAND, args };
  }

  const commandLine = [PACKAGE_MANAGER_COMMAND, ...args].map(quoteWindowsCommandArgument).join(' ');
  return {
    command: process.env.ComSpec || 'cmd.exe',
    args: ['/d', '/s', '/c', commandLine]
  };
}

export function resolveCriticalTestDatabaseUrl(rawValue = undefined) {
  const candidate =
    rawValue ??
    process.env.DATABASE_URL_TEST ??
    process.env.DATABASE_URL ??
    resolveDefaultTestDatabaseUrl();
  if (typeof candidate !== 'string' || candidate.trim() === '') {
    throw new Error('critical process runner requires a dedicated local PostgreSQL test URL');
  }

  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('critical process runner received an invalid PostgreSQL test URL');
  }

  const hostname = url.hostname.toLowerCase();
  const port = Number(url.port || 5432);
  const encodedDatabaseName = url.pathname.replace(/^\//, '');
  let databaseName;
  try {
    databaseName = decodeURIComponent(encodedDatabaseName);
  } catch {
    throw new Error('critical process runner received an invalid test database name');
  }

  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !APPROVED_TEST_DATABASE_HOSTS.has(hostname) ||
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    !databaseName ||
    databaseName.includes('/') ||
    !TEST_DATABASE_NAME_PATTERN.test(databaseName)
  ) {
    throw new Error(
      'critical process runner only permits localhost PostgreSQL databases named cvg_his_v2_test[_suffix]'
    );
  }

  return candidate;
}

function quoteSqlIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function runWithDeadline(operation, deadline, label) {
  const remainingMs = Math.max(0, deadline - Date.now());
  if (remainingMs <= 0) {
    return Promise.reject(new Error(`${label} exceeded its finite cleanup budget`));
  }

  let timeoutHandle;
  const operationPromise = Promise.resolve().then(operation);
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`${label} exceeded its finite cleanup budget`)),
      remainingMs
    );
  });
  return Promise.race([operationPromise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

export function resolveCriticalTestDatabaseName(rawDatabaseUrl, testSuffix) {
  const databaseUrl = resolveCriticalTestDatabaseUrl(rawDatabaseUrl);
  const baseName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\/+/, ''));
  const normalizedSuffix = normalizeSuffix(String(testSuffix ?? '')).slice(0, 40);

  if (!normalizedSuffix || !TEST_DATABASE_NAME_PATTERN.test(baseName)) {
    throw new Error('critical process runner received an invalid owned test database suffix');
  }

  const databaseName = `${baseName}_${normalizedSuffix}`;
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName) || databaseName === baseName) {
    throw new Error('critical process runner received an invalid owned test database name');
  }
  return databaseName;
}

async function cleanupEphemeralTestDatabase(databaseUrl, testSuffix) {
  let databaseName;
  try {
    databaseName = resolveCriticalTestDatabaseName(databaseUrl, testSuffix);
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';
  const cleanupDeadline = Date.now() + EPHEMERAL_DATABASE_CLEANUP_TIMEOUT_MS;
  const client = new Client({
    connectionString: adminUrl.toString(),
    connectionTimeoutMillis: EPHEMERAL_DATABASE_CLEANUP_TIMEOUT_MS,
    query_timeout: EPHEMERAL_DATABASE_CLEANUP_TIMEOUT_MS,
    statement_timeout: EPHEMERAL_DATABASE_CLEANUP_TIMEOUT_MS
  });
  let cleanupError = null;

  try {
    await runWithDeadline(() => client.connect(), cleanupDeadline, 'database cleanup connect');
    await runWithDeadline(
      () =>
        client.query(
          `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()`,
          [databaseName]
        ),
      cleanupDeadline,
      'database cleanup session termination'
    );
    await runWithDeadline(
      () => client.query(`DROP DATABASE IF EXISTS ${quoteSqlIdentifier(databaseName)}`),
      cleanupDeadline,
      'database cleanup drop'
    );
  } catch (error) {
    cleanupError = new Error(
      `could not clean ephemeral test database ${databaseName}: ${sanitizeDiagnostic(error instanceof Error ? error.message : String(error), 500)}`
    );
  } finally {
    const closeDeadline = Date.now() + EPHEMERAL_DATABASE_CLOSE_TIMEOUT_MS;
    try {
      await runWithDeadline(() => client.end(), closeDeadline, 'database cleanup close');
    } catch (error) {
      try {
        client.connection?.stream?.destroy();
      } catch {
        // The connection may already be closed; the cleanup error remains authoritative.
      }
      const closeError = new Error(
        `could not close ephemeral database cleanup connection: ${sanitizeDiagnostic(error instanceof Error ? error.message : String(error), 500)}`
      );
      cleanupError = cleanupError
        ? new Error(`${cleanupError.message}; ${closeError.message}`)
        : closeError;
    }
  }
  if (!cleanupError) log(`cleaned ephemeral test database ${databaseName}`);
  return cleanupError;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireReportCounter(report, counterName) {
  const value = report[counterName];
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Vitest report counter ${counterName} is missing or invalid`);
  }
  return value;
}

export function validateTestReport(reportPath, testFile, reportDirectory = null) {
  let report;
  try {
    const reportContent = readBoundedReportText(reportPath, reportDirectory);
    if (reportContent.truncated) {
      throw new Error('the Vitest result report exceeded the bounded input size');
    }
    report = JSON.parse(reportContent.content);
    if (!isPlainObject(report)) throw new Error('the Vitest result report must be a JSON object');
  } catch (error) {
    throw new Error(
      `Could not read the Vitest result contract for ${testFile}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const requiredCounters = [
    'numTotalTestSuites',
    'numPassedTestSuites',
    'numFailedTestSuites',
    'numPendingTestSuites',
    'numTotalTests',
    'numPassedTests',
    'numFailedTests',
    'numPendingTests',
    'numTodoTests'
  ];
  const counters = Object.fromEntries(
    requiredCounters.map((counterName) => [counterName, requireReportCounter(report, counterName)])
  );
  const optionalCounters = {
    numSkippedTests: report.numSkippedTests ?? 0,
    numTodoTestSuites: report.numTodoTestSuites ?? 0,
    numSkippedTestSuites: report.numSkippedTestSuites ?? 0
  };
  for (const [counterName, value] of Object.entries(optionalCounters)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Vitest report counter ${counterName} is invalid`);
    }
  }

  if (report.success !== true) throw new Error('Vitest result report did not succeed');
  if (!Array.isArray(report.testResults) || report.testResults.length === 0) {
    throw new Error('Vitest result report has no executable suite results');
  }
  // Vitest's numTotalTestSuites counts the root file suite and nested describe
  // suites, while testResults contains one entry per executed test file. Each
  // runner child receives exactly one test file, so the executable-file
  // inventory must be exactly one regardless of the nested-suite count.
  if (report.testResults.length !== 1) {
    throw new Error('Vitest result report must contain exactly one executable test-file result');
  }

  const expectedTestFile = resolve(testFile);
  const assertionResults = [];
  for (const suite of report.testResults) {
    if (!isPlainObject(suite) || typeof suite.name !== 'string') {
      throw new Error('Vitest result report contains a malformed suite identity');
    }
    if (resolve(suite.name) !== expectedTestFile || suite.status !== 'passed') {
      throw new Error(`Vitest result report contains an unexpected suite for ${testFile}`);
    }
    if (!Array.isArray(suite.assertionResults) || suite.assertionResults.length === 0) {
      throw new Error(`Vitest result report contains no assertions for ${testFile}`);
    }
    for (const assertion of suite.assertionResults) {
      if (
        !isPlainObject(assertion) ||
        typeof assertion.title !== 'string' ||
        assertion.title.trim() === '' ||
        typeof assertion.fullName !== 'string' ||
        assertion.fullName.trim() === '' ||
        assertion.status !== 'passed'
      ) {
        throw new Error(`Vitest result report contains an unpassed assertion for ${testFile}`);
      }
      assertionResults.push(assertion);
    }
  }

  const hasCompletePassedAssertionInventory =
    assertionResults.length === counters.numTotalTests &&
    assertionResults.every((assertion) => assertion?.status === 'passed');
  const hasConsistentSuiteInventory =
    counters.numTotalTestSuites ===
    counters.numPassedTestSuites +
      counters.numFailedTestSuites +
      counters.numPendingTestSuites +
      optionalCounters.numTodoTestSuites +
      optionalCounters.numSkippedTestSuites;
  const hasConsistentTestInventory =
    counters.numTotalTests ===
    counters.numPassedTests +
      counters.numFailedTests +
      counters.numPendingTests +
      counters.numTodoTests +
      optionalCounters.numSkippedTests;

  if (
    counters.numTotalTestSuites === 0 ||
    counters.numPassedTestSuites === 0 ||
    counters.numTotalTests === 0 ||
    counters.numFailedTests !== 0 ||
    counters.numFailedTestSuites !== 0 ||
    counters.numPendingTests !== 0 ||
    counters.numPendingTestSuites !== 0 ||
    counters.numTodoTests !== 0 ||
    optionalCounters.numSkippedTests !== 0 ||
    optionalCounters.numTodoTestSuites !== 0 ||
    optionalCounters.numSkippedTestSuites !== 0 ||
    counters.numPassedTests !== counters.numTotalTests ||
    !hasConsistentSuiteInventory ||
    !hasConsistentTestInventory ||
    !hasCompletePassedAssertionInventory
  ) {
    throw new Error(
      `Critical process proof did not fully execute for ${testFile}: ${JSON.stringify({
        success: report.success,
        total: counters.numTotalTests,
        passed: counters.numPassedTests,
        failed: counters.numFailedTests,
        failedSuites: counters.numFailedTestSuites,
        pending: counters.numPendingTests,
        pendingSuites: counters.numPendingTestSuites,
        todo: counters.numTodoTests,
        skipped: optionalCounters.numSkippedTests,
        totalSuites: counters.numTotalTestSuites,
        passedSuites: counters.numPassedTestSuites,
        assertionResults: assertionResults.length
      })}`
    );
  }
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

function createArtifactDirectory(artifactRoot, test) {
  mkdirSync(artifactRoot, { recursive: true, mode: 0o700 });
  return mkdtempSync(join(artifactRoot, `${normalizeSuffix(test.id)}-`));
}

function createTransientReportDirectory(test) {
  return mkdtempSync(join(tmpdir(), `cvg-critical-process-report-${normalizeSuffix(test.id)}-`));
}

function removeTransientReportDirectory(reportDirectory, testFile, reportPath) {
  const cleanupErrors = [];
  try {
    sanitizeReportInPlace(reportPath, reportDirectory);
  } catch (error) {
    console.error(
      `[critical-process-suite] Could not scrub the transient report for ${testFile}: ${sanitizeDiagnostic(error instanceof Error ? error.message : String(error), 500)}`
    );
    cleanupErrors.push(error);
    try {
      removeReportEntry(reportPath, reportDirectory);
    } catch (removeError) {
      console.error(
        `[critical-process-suite] Could not remove the unsafe transient report entry for ${testFile}: ${sanitizeDiagnostic(removeError instanceof Error ? removeError.message : String(removeError), 500)}`
      );
      cleanupErrors.push(removeError);
    }
  }

  try {
    let directoryStat;
    try {
      directoryStat = lstatSync(reportDirectory);
    } catch (error) {
      if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return cleanupErrors[0] ?? null;
      throw error;
    }
    if (directoryStat.isSymbolicLink()) {
      unlinkSync(reportDirectory);
    } else {
      rmSync(reportDirectory, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(
      `[critical-process-suite] Could not remove the transient report directory for ${testFile}: ${sanitizeDiagnostic(error instanceof Error ? error.message : String(error), 500)}`
    );
    cleanupErrors.push(error);
  }
  if (cleanupErrors.length === 0) return null;
  return new Error(
    cleanupErrors
      .map((error) => (error instanceof Error ? error.message : String(error)))
      .join('; ')
  );
}

function removeArtifactDirectory(artifactDirectory, testFile) {
  try {
    rmSync(artifactDirectory, { recursive: true, force: true });
    return null;
  } catch (error) {
    console.error(
      `[critical-process-suite] Could not remove the successful artifact directory for ${testFile}: ${sanitizeDiagnostic(error instanceof Error ? error.message : String(error), 500)}`
    );
    return error;
  }
}

function outcomeExitCode(outcome) {
  if (Number.isInteger(outcome.status) && outcome.status > 0) return outcome.status;
  if (outcome.signal && SIGNAL_EXIT_CODES[outcome.signal]) return SIGNAL_EXIT_CODES[outcome.signal];
  return 1;
}

function outcomeDescription(outcome) {
  const details = [outcome.kind];
  if (outcome.signal) details.push(`signal ${outcome.signal}`);
  if (outcome.status !== null && outcome.status !== undefined)
    details.push(`exit ${outcome.status}`);
  if (outcome.errorCode) details.push(`code ${outcome.errorCode}`);
  if (outcome.errorMessage) details.push(sanitizeDiagnostic(outcome.errorMessage, 500));
  if (outcome.cleanupError) details.push(sanitizeDiagnostic(outcome.cleanupError, 500));
  return details.join('; ');
}

function preserveRunnerError({
  artifactDirectory,
  test,
  command,
  args,
  reportPath,
  reportDirectory,
  error
}) {
  return preserveFailureArtifact({
    artifactDirectory,
    label: test.file,
    command,
    args,
    reportPath,
    reportDirectory,
    outcome: {
      kind: 'runner_error',
      status: null,
      signal: null,
      errorCode: error?.code ?? null,
      errorMessage: error instanceof Error ? error.message : String(error)
    },
    elapsedMs: 0
  });
}

function installSignalHandlers(activeChildren) {
  let receivedSignal = null;
  const pendingCleanups = new Set();
  const abortController = new AbortController();

  const scheduleCleanup = (child, signal = receivedSignal ?? 'SIGTERM') => {
    const cleanup = cleanupOwnedProcess(child, signal).catch((error) => {
      console.error(
        `[critical-process-suite] Could not terminate owned process tree: ${sanitizeDiagnostic(error instanceof Error ? error.message : String(error), 500)}`
      );
      return false;
    });
    pendingCleanups.add(cleanup);
    void cleanup.finally(() => pendingCleanups.delete(cleanup));
    return cleanup;
  };

  const handleSignal = (signal) => {
    receivedSignal ??= signal;
    abortController.abort(signal);
    for (const child of activeChildren) {
      scheduleCleanup(child, signal);
    }
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  return {
    get receivedSignal() {
      return receivedSignal;
    },
    abortSignal: abortController.signal,
    cleanupChild: scheduleCleanup,
    async waitForCleanup() {
      while (pendingCleanups.size > 0) {
        await Promise.allSettled([...pendingCleanups]);
      }
    },
    remove() {
      process.off('SIGINT', handleSignal);
      process.off('SIGTERM', handleSignal);
    }
  };
}

function buildChildEnvironment(testSuffix, databaseUrl) {
  const inheritedEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) => CHILD_ENVIRONMENT_KEYS.has(key) && typeof value === 'string'
    )
  );

  return {
    ...inheritedEnvironment,
    DOTENV_CONFIG_PATH: process.platform === 'win32' ? 'NUL' : '/dev/null',
    CVG_CRITICAL_PROCESS_RUNNER: '1',
    DATABASE_URL: databaseUrl,
    DATABASE_URL_TEST: databaseUrl,
    NODE_ENV: 'test',
    REQUIRE_TEST_DB: '1',
    TEST_DB_EPHEMERAL: '1',
    TEST_DB_SUFFIX: testSuffix
  };
}

async function runTest(
  test,
  index,
  suiteSuffix,
  dryRun,
  artifactRoot,
  activeChildren,
  databaseUrl,
  signalHandlers
) {
  const testSuffix = resolveTestSuffix(suiteSuffix, index, test.id);
  const artifactDirectory = dryRun ? null : createArtifactDirectory(artifactRoot, test);
  const reportDirectory = dryRun ? null : createTransientReportDirectory(test);
  const reportPath = reportDirectory ? join(reportDirectory, `${test.id}.json`) : '<report.json>';
  const args = buildVitestArgs(test.file, reportPath);
  const packageManagerInvocation = resolvePackageManagerInvocation(args);

  log(`[${index + 1}/${PROCESS_TESTS.length}] ${test.file} (db suffix: ${testSuffix})`);
  if (dryRun) {
    log(`dry run: ${packageManagerInvocation.command} ${packageManagerInvocation.args.join(' ')}`);
    return 0;
  }

  const env = buildChildEnvironment(testSuffix, databaseUrl);

  let outcome;
  try {
    outcome = await runOwnedProcess({
      command: packageManagerInvocation.command,
      args: packageManagerInvocation.args,
      cwd: process.cwd(),
      env,
      timeoutMs: RUNNER_TIMEOUT_MS,
      artifactDirectory,
      label: test.file,
      reportPath,
      reportDirectory,
      abortSignal: signalHandlers.abortSignal,
      onChildSpawn: (child) => {
        activeChildren.add(child);
        if (signalHandlers.receivedSignal) {
          void signalHandlers.cleanupChild(child, signalHandlers.receivedSignal);
        }
      },
      onChildClose: (child, cleanupComplete) => {
        if (cleanupComplete) activeChildren.delete(child);
      }
    });
  } catch (error) {
    let failureArtifactPath;
    try {
      failureArtifactPath = preserveRunnerError({
        artifactDirectory,
        test,
        command: packageManagerInvocation.command,
        args: packageManagerInvocation.args,
        reportPath,
        reportDirectory,
        error
      });
    } catch (artifactError) {
      console.error(
        `[critical-process-suite] Could not preserve runner failure artifact: ${sanitizeDiagnostic(artifactError instanceof Error ? artifactError.message : String(artifactError), 500)}`
      );
    }
    const cleanupError = removeTransientReportDirectory(reportDirectory, test.file, reportPath);
    console.error(
      `[critical-process-suite] ${test.file} failed (runner_error); failure artifact: ${failureArtifactPath ?? 'unavailable'}`
    );
    if (cleanupError) return 1;
    return 1;
  }

  if (outcome.kind !== 'success') {
    console.error(
      `[critical-process-suite] ${test.file} failed (${outcomeDescription(outcome)}); failure artifact: ${outcome.failureArtifactPath ?? 'unavailable'}; stopping suite.`
    );
    const cleanupError = removeTransientReportDirectory(reportDirectory, test.file, reportPath);
    if (cleanupError) return 1;
    return outcomeExitCode(outcome);
  }

  try {
    validateTestReport(reportPath, test.file, reportDirectory);
  } catch (error) {
    let failureArtifactPath;
    try {
      failureArtifactPath = preserveFailureArtifact({
        artifactDirectory,
        label: test.file,
        command: packageManagerInvocation.command,
        args: packageManagerInvocation.args,
        reportPath,
        reportDirectory,
        outcome: {
          kind: 'report_contract',
          status: 1,
          signal: null,
          errorCode: null,
          errorMessage: error instanceof Error ? error.message : String(error)
        },
        elapsedMs: outcome.elapsedMs,
        stdout: outcome.stdout,
        stderr: outcome.stderr
      });
    } catch (artifactError) {
      console.error(
        `[critical-process-suite] Could not preserve report-contract artifact: ${sanitizeDiagnostic(artifactError instanceof Error ? artifactError.message : String(artifactError), 500)}`
      );
    }
    console.error(
      `[critical-process-suite] ${error instanceof Error ? error.message : String(error)}; failure artifact: ${failureArtifactPath ?? 'unavailable'}`
    );
    const cleanupError = removeTransientReportDirectory(reportDirectory, test.file, reportPath);
    if (cleanupError) return 1;
    return 1;
  }

  log(`[${test.id}] verified non-skipped result contract.`);
  const cleanupError = removeTransientReportDirectory(reportDirectory, test.file, reportPath);
  if (cleanupError) {
    console.error(
      `[critical-process-suite] ${test.file} produced a cleanup error after a successful report contract.`
    );
    return 1;
  }
  if (removeArtifactDirectory(artifactDirectory, test.file)) return 1;
  return 0;
}

function resolveArtifactRoot() {
  const configuredRoot = process.env.CRITICAL_PROCESS_ARTIFACT_DIR;
  return configuredRoot
    ? resolve(configuredRoot)
    : join(tmpdir(), `cvg-critical-process-failures-${process.pid}`);
}

async function main() {
  const listOnly = process.argv.includes('--list');
  const dryRun = process.argv.includes('--dry-run');

  validateManifest();
  if (listOnly) {
    printManifest();
    return 0;
  }

  const criticalTestDatabaseUrl = dryRun ? null : resolveCriticalTestDatabaseUrl();
  const artifactRoot = dryRun ? null : resolveArtifactRoot();
  const suiteSuffix = resolveSuiteSuffix();
  const activeChildren = new Set();
  const signalHandlers = installSignalHandlers(activeChildren);
  let activeTestDatabase = null;
  let exitCode = 0;

  try {
    for (const [index, test] of PROCESS_TESTS.entries()) {
      if (signalHandlers.receivedSignal) {
        exitCode = SIGNAL_EXIT_CODES[signalHandlers.receivedSignal] ?? 1;
        break;
      }
      const testSuffix = resolveTestSuffix(suiteSuffix, index, test.id);
      activeTestDatabase = criticalTestDatabaseUrl
        ? { databaseUrl: criticalTestDatabaseUrl, testSuffix }
        : null;
      let childExitCode = 1;
      let databaseCleanupError = null;
      try {
        childExitCode = await runTest(
          test,
          index,
          suiteSuffix,
          dryRun,
          artifactRoot,
          activeChildren,
          criticalTestDatabaseUrl,
          signalHandlers
        );
      } finally {
        if (activeTestDatabase) {
          databaseCleanupError = await cleanupEphemeralTestDatabase(
            activeTestDatabase.databaseUrl,
            activeTestDatabase.testSuffix
          );
          activeTestDatabase = null;
        }
      }
      if (databaseCleanupError) {
        console.error(`[critical-process-suite] ${databaseCleanupError.message}`);
        exitCode = 1;
        break;
      }
      if (signalHandlers.receivedSignal) {
        exitCode = SIGNAL_EXIT_CODES[signalHandlers.receivedSignal] ?? 1;
        break;
      }
      if (childExitCode !== 0) {
        exitCode = childExitCode;
        break;
      }
    }

    if (exitCode === 0) log(`Completed ${PROCESS_TESTS.length} process test(s) serially.`);
  } finally {
    if (activeTestDatabase) {
      const databaseCleanupError = await cleanupEphemeralTestDatabase(
        activeTestDatabase.databaseUrl,
        activeTestDatabase.testSuffix
      );
      if (databaseCleanupError) {
        console.error(`[critical-process-suite] ${databaseCleanupError.message}`);
        exitCode ||= 1;
      }
      activeTestDatabase = null;
    }
    const trackedChildren = [...activeChildren];
    const cleanupResults = await Promise.allSettled(
      trackedChildren.map((child) => signalHandlers.cleanupChild(child, 'SIGTERM'))
    );
    cleanupResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value === true) {
        activeChildren.delete(trackedChildren[index]);
        return;
      }
      console.error(
        `[critical-process-suite] Could not confirm cleanup for owned child ${trackedChildren[index].pid ?? 'unknown'}`
      );
      exitCode ||= 1;
    });
    await signalHandlers.waitForCleanup();
    if (signalHandlers.receivedSignal) {
      exitCode = SIGNAL_EXIT_CODES[signalHandlers.receivedSignal] ?? 1;
    }
    signalHandlers.remove();
  }
  return exitCode;
}

const isMainModule =
  process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMainModule) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(
        `[critical-process-suite] ${sanitizeDiagnostic(error instanceof Error ? error.message : String(error))}`
      );
      process.exitCode = 1;
    });
}
