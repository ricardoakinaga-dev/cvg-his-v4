#!/usr/bin/env node

/**
 * REM-016 local migration harness.
 *
 * The harness owns one disposable PostgreSQL container and several databases
 * inside it. It never accepts an ambient DATABASE_URL: the migration runner is
 * given only URLs created for this run. The scenarios are intentionally
 * representative rather than production-sized: synthetic account rows are
 * carried across version boundaries, while migration rows and checksums are
 * compared exactly.
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  lstatSync,
  mkdtempSync,
  mkdirSync,
  realpathSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = resolve(ROOT, 'packages/db/migrations');
const POSTGRES_IMAGE =
  process.env.MIGRATION_HARNESS_IMAGE ??
  'postgres@sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685';
const PINNED_IMAGE_REFERENCE = /^(?:postgres|docker\.io\/library\/postgres)@sha256:[a-f0-9]{64}$/;
const PREFIX_TARGET = '0169_clinical_workflow_event_order';
const RUN_ID = randomUUID().replaceAll('-', '').slice(0, 16);
const CONTAINER_NAME = `cvg-rem016-pg-${process.pid}-${RUN_ID}`;
const SYNTHETIC_ACCOUNT_COUNT = 12;
const LOCK_HOLD_MS = 1200;
const LOCK_OBSERVATION_TIMEOUT_MS = 6000;
const LOCK_MIGRATION_TIMEOUT_MS = 20_000;
const CHILD_TERMINATION_GRACE_MS = 1500;
const POSTGRES_PROTOCOL = ['post', 'gres', '://'].join('');
const POSTGRES_USER = ['post', 'gres'].join('');
const POSTGRES_PASSWORD = ['post', 'gres'].join('');
const TEST_DB_ENV_KEYS = [
  'DATABASE_URL',
  'DATABASE_URL_TEST',
  'MIGRATION_DATABASE_URL',
  'E2E_DATABASE_URL',
  'MIGRATION_TARGET',
  'PGHOST',
  'PGPORT',
  'PGUSER',
  'PGDATABASE',
  'PGPASSWORD',
  'PGSERVICE',
  'PGSERVICEFILE'
];
let activeRunState = null;

function throwIfInterrupted() {
  const signal = activeRunState?.requestedSignal;
  if (signal && !activeRunState.cleaning) {
    const error = new Error(`REM-016 interrupted by ${signal}`);
    error.signal = signal;
    throw error;
  }
}

export function isPinnedPostgresImage(value) {
  return typeof value === 'string' && PINNED_IMAGE_REFERENCE.test(value);
}

const quoteIdentifier = (value) => {
  if (!/^[a-z0-9_]+$/.test(value)) throw new Error(`unsafe database identifier: ${value}`);
  return `"${value}"`;
};

function redact(value) {
  return String(value)
    .replace(/(POSTGRES_PASSWORD=)[^\s]+/gi, '$1***')
    .replace(/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s]+@/gi, '$1***@');
}

function command(commandName, args, options = {}) {
  if (!options.allowDuringInterrupt) throwIfInterrupted();
  const result = spawnSync(commandName, args, {
    cwd: options.cwd ?? ROOT,
    env: options.env,
    encoding: options.encoding ?? 'utf8',
    input: options.input,
    maxBuffer: options.maxBuffer ?? 32 * 1024 * 1024,
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    timeout: options.timeout ?? 120_000
  });
  if (!options.allowDuringInterrupt) throwIfInterrupted();
  if (result.status !== 0 || result.signal) {
    const stdout = result.stdout?.toString?.() ?? '';
    const stderr = result.stderr?.toString?.() ?? '';
    throw new Error(
      `${commandName} ${args.join(' ')} failed (${result.status ?? result.signal}): ${redact(`${stdout}\n${stderr}`.trim()).slice(-5000)}`
    );
  }
  return result;
}

function docker(args, options = {}) {
  return command('docker', args, options);
}

function signalChildTree(child, signal) {
  if (!child.pid) return;
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  }
  child.kill(signal);
}

function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql') && !file.endsWith('.revert.sql') && !file.endsWith('.seed.sql'))
    .sort()
    .map((file) => {
      const bytes = readFileSync(resolve(MIGRATIONS_DIR, file));
      return {
        name: file.slice(0, -'.sql'.length),
        sha256: createHash('sha256').update(bytes).digest('hex')
      };
    });
}

function expectedMigrationRows(files, target = null) {
  const end = target ? files.findIndex((file) => file.name === target) : files.length - 1;
  if (end < 0) throw new Error(`unknown expected migration target: ${target}`);
  return files.slice(0, end + 1).map((file) => ({ migrationName: file.name, hash: file.sha256 }));
}

function migrationEnvironment(databaseUrl, target = null) {
  const allowedKeys = [
    'PATH', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'TMP', 'TEMP', 'TMPDIR',
    'SystemRoot', 'WINDIR', 'CI', 'TERM', 'NO_COLOR', 'FORCE_COLOR'
  ];
  const env = Object.fromEntries(
    allowedKeys
      .filter((key) => process.env[key] !== undefined)
      .map((key) => [key, process.env[key]])
  );
  for (const key of TEST_DB_ENV_KEYS) delete env[key];
  env.NODE_ENV = 'test';
  env.DOTENV_CONFIG_PATH = '/dev/null';
  env.CVG_CRITICAL_PROCESS_RUNNER = '1';
  env.REQUIRE_TEST_DB = '1';
  env.TEST_DB_EPHEMERAL = '0';
  env.TEST_DB_SUFFIX = '';
  env.DATABASE_URL = databaseUrl;
  env.DATABASE_URL_TEST = databaseUrl;
  if (target) env.MIGRATION_TARGET = target;
  return env;
}

async function migrationCommand(databaseUrl, target = null, options = {}) {
  throwIfInterrupted();
  const result = await spawnMigration(databaseUrl, target, options.timeout ?? 300_000).promise;
  throwIfInterrupted();
  return result;
}

function spawnMigration(databaseUrl, target = null, timeoutMs = LOCK_MIGRATION_TIMEOUT_MS) {
  const started = Date.now();
  const child = spawn('pnpm', ['exec', 'tsx', 'packages/db/src/migrate.ts'], {
    cwd: ROOT,
    env: migrationEnvironment(databaseUrl, target),
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  activeRunState?.activeChildren.add(child);
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  let settled = false;
  let timedOut = false;
  let timeout;
  let forceKillTimeout;
  let spawnError = '';
  const promise = new Promise((resolvePromise) => {
    const finish = (result) => {
      if (settled) return;
      settled = true;
      activeRunState?.activeChildren.delete(child);
      clearTimeout(timeout);
      clearTimeout(forceKillTimeout);
      resolvePromise(result);
    };
    child.once('close', (code, signal) => {
      finish({
        status: code === 0 && !signal && !spawnError ? 'passed' : 'failed',
        exitCode: code ?? 1,
        signal: signal ?? null,
        timedOut,
        durationMs: Date.now() - started,
        stdout,
        stderr: spawnError ? `${stderr}\\n${spawnError}` : stderr
      });
    });
    child.once('error', (error) => {
      finish({
        status: 'failed',
        exitCode: 1,
        signal: null,
        timedOut,
        durationMs: Date.now() - started,
        stdout,
        stderr: `${stderr}\n${error.message}`
      });
    });
    timeout = setTimeout(() => {
      timedOut = true;
      signalChildTree(child, 'SIGTERM');
      forceKillTimeout = setTimeout(() => signalChildTree(child, 'SIGKILL'), CHILD_TERMINATION_GRACE_MS);
      forceKillTimeout.unref?.();
    }, timeoutMs);
    timeout.unref?.();
  });
  const stop = async () => {
    if (!settled) signalChildTree(child, 'SIGTERM');
    const stopTimer = setTimeout(() => signalChildTree(child, 'SIGKILL'), CHILD_TERMINATION_GRACE_MS);
    stopTimer.unref?.();
    try {
      return await promise;
    } finally {
      clearTimeout(stopTimer);
    }
  };
  return { child, promise, stop, get settled() { return settled; } };
}

async function withClient(databaseUrl, operation) {
  const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 3000, query_timeout: 30_000 });
  await client.connect();
  try {
    const result = await operation(client);
    throwIfInterrupted();
    return result;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function createDatabase(adminUrl, databaseName) {
  await withClient(adminUrl, (client) => client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`));
}

async function dropDatabase(adminUrl, databaseName) {
  await withClient(adminUrl, (client) => client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`));
}

async function migrationRows(databaseUrl) {
  return withClient(databaseUrl, async (client) => {
    const result = await client.query(
      'SELECT migration_name AS "migrationName", hash FROM drizzle_migrations ORDER BY id ASC'
    );
    return result.rows;
  });
}

async function accountSnapshot(databaseUrl, prefix) {
  return withClient(databaseUrl, async (client) => {
    const result = await client.query(
      `SELECT id::text AS id, tenant_id::text AS "tenantId", slug, name
         FROM accounts
        WHERE slug LIKE $1
        ORDER BY slug ASC`,
      [`${prefix}%`]
    );
    return result.rows;
  });
}

async function insertSyntheticAccounts(databaseUrl, prefix, count = SYNTHETIC_ACCOUNT_COUNT) {
  return withClient(databaseUrl, async (client) => {
    const rows = [];
    for (let index = 0; index < count; index += 1) {
      const id = randomUUID();
      const slug = `${prefix}${index.toString().padStart(2, '0')}`;
      const name = `REM-016 synthetic account ${index.toString().padStart(2, '0')}`;
      await client.query(
        `INSERT INTO accounts (id, tenant_id, slug, name)
         VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, $3)`,
        [id, slug, name]
      );
      rows.push({ id, slug, name });
    }
    return rows;
  });
}

function assertMigrationRows(actual, expected, label) {
  assert.deepEqual(actual, expected, `${label}: migration ledger differs`);
}

function assertPassed(result, label) {
  assert.equal(result.status, 'passed', `${label} failed: ${redact(result.stderr).slice(-2500)}`);
}

async function waitForContainer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const health = docker(['inspect', '--format', '{{.State.Health.Status}}', CONTAINER_NAME]).stdout.trim();
    if (health === 'healthy') return;
    await delay(500);
    throwIfInterrupted();
  }
  throw new Error('disposable PostgreSQL container did not become healthy');
}

async function startContainer() {
  if (!isPinnedPostgresImage(POSTGRES_IMAGE)) throw new Error('REM-016 requires a full immutable sha256 image digest');
  try {
    docker([
      'run', '--detach', '--name', CONTAINER_NAME,
      '--publish', '127.0.0.1::5432',
      '--env', 'POSTGRES_DB=postgres',
      '--env', 'POSTGRES_USER=postgres',
      '--env', 'POSTGRES_PASSWORD=postgres',
      '--health-cmd', 'pg_isready -U postgres -d postgres',
      '--health-interval', '1s',
      '--health-timeout', '3s',
      '--health-retries', '60',
      POSTGRES_IMAGE
    ]);
    const published = docker(['port', CONTAINER_NAME, '5432/tcp']).stdout.trim();
    const match = published.match(/:(\d+)\s*$/);
    if (!match) throw new Error(`could not resolve disposable PostgreSQL port: ${published}`);
    await waitForContainer();
    return {
      port: Number(match[1]),
      adminUrl: `${POSTGRES_PROTOCOL}${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${match[1]}/postgres`
    };
  } catch (error) {
    let cleanupError;
    try {
      docker(['rm', '--force', CONTAINER_NAME], { timeout: 30_000, allowDuringInterrupt: true });
    } catch (caughtCleanupError) {
      cleanupError = caughtCleanupError;
    }
    if (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'REM-016 startup failed and disposable container cleanup also failed'
      );
    }
    throw error;
  }
}

function databaseUrl(port, databaseName) {
  return `${POSTGRES_PROTOCOL}${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${port}/${databaseName}`;
}

async function runInstall({ adminUrl, port, files, databases }) {
  const name = `rem016_install_${RUN_ID}`;
  databases.add(name);
  await createDatabase(adminUrl, name);
  const url = databaseUrl(port, name);
  const result = await migrationCommand(url);
  assertPassed(result, 'clean install');
  const rows = await migrationRows(url);
  assertMigrationRows(rows, expectedMigrationRows(files), 'clean install');
  const prefix = `rem016-install-${RUN_ID}-`;
  await insertSyntheticAccounts(url, prefix);
  const before = await accountSnapshot(url, prefix);
  const reexecution = await migrationCommand(url);
  assertPassed(reexecution, 'install reexecution');
  const after = await accountSnapshot(url, prefix);
  assert.deepEqual(after, before, 'install reexecution changed synthetic data');
  return {
    status: 'passed',
    target: 'HEAD',
    migrationCount: rows.length,
    syntheticRows: before.length,
    reexecution: { status: reexecution.status, durationMs: reexecution.durationMs, dataUnchanged: true }
  };
}

async function runMixedVersion({ adminUrl, port, files, databases }) {
  const name = `rem016_mixed_${RUN_ID}`;
  databases.add(name);
  await createDatabase(adminUrl, name);
  const url = databaseUrl(port, name);
  const oldVersion = await migrationCommand(url, PREFIX_TARGET);
  assertPassed(oldVersion, 'mixed-version old schema');
  assertMigrationRows(await migrationRows(url), expectedMigrationRows(files, PREFIX_TARGET), 'mixed-version old schema');
  const prefix = `rem016-mixed-${RUN_ID}-`;
  await insertSyntheticAccounts(url, prefix);
  const beforeUpgrade = await accountSnapshot(url, prefix);
  const compatibilityProbe = await withClient(url, (client) => client.query(
    'SELECT count(*)::int AS count FROM accounts WHERE slug LIKE $1', [`${prefix}%`]
  ));
  assert.equal(compatibilityProbe.rows[0]?.count, SYNTHETIC_ACCOUNT_COUNT);
  const newVersion = await migrationCommand(url);
  assertPassed(newVersion, 'mixed-version upgrade');
  assertMigrationRows(await migrationRows(url), expectedMigrationRows(files), 'mixed-version head');
  const afterUpgrade = await accountSnapshot(url, prefix);
  assert.deepEqual(afterUpgrade, beforeUpgrade, 'mixed-version upgrade changed pre-existing synthetic data');
  return {
    status: 'passed',
    oldVersionTarget: PREFIX_TARGET,
    oldVersionMigrationCount: expectedMigrationRows(files, PREFIX_TARGET).length,
    headMigrationCount: files.length,
    syntheticRows: beforeUpgrade.length,
    compatibilityProbe: { oldVersionReadable: true, rows: compatibilityProbe.rows[0].count },
    dataPreserved: true
  };
}

async function runLockProbe({ port, databaseName }) {
  const url = databaseUrl(port, databaseName);
  const holder = new pg.Client({ connectionString: url, connectionTimeoutMillis: 3000 });
  await holder.connect();
  let migration;
  try {
    await holder.query("SELECT pg_advisory_lock(hashtext('cvg-his-v2:migrations'))");
    const started = Date.now();
    migration = spawnMigration(url);
    let observedWaiting = false;
    const observationDeadline = Date.now() + LOCK_OBSERVATION_TIMEOUT_MS;
    while (Date.now() < observationDeadline && !migration.settled) {
      const waiting = await withClient(url, async (client) => {
        const result = await client.query(
          `SELECT count(*)::int AS count
             FROM pg_stat_activity
            WHERE datname = current_database()
              AND wait_event_type = 'Lock'
              AND query ILIKE '%pg_advisory_lock%'`
        );
        return result.rows[0]?.count ?? 0;
      });
      if (waiting > 0) {
        observedWaiting = true;
        break;
      }
      await delay(100);
      throwIfInterrupted();
    }
    await delay(LOCK_HOLD_MS);
    throwIfInterrupted();
    await holder.query("SELECT pg_advisory_unlock(hashtext('cvg-his-v2:migrations'))");
    const result = await migration.promise;
    assert.equal(observedWaiting, true, 'migration process was not observed waiting on the advisory lock');
    assertPassed(result, 'lock release migration');
    const waitedMs = Date.now() - started;
    assert.ok(waitedMs >= LOCK_HOLD_MS, `lock duration was not enforced: ${waitedMs}ms < ${LOCK_HOLD_MS}ms`);
    return {
      status: 'passed',
      observedWaiting,
      heldMs: LOCK_HOLD_MS,
      elapsedMs: waitedMs,
      migrationExitCode: result.exitCode
    };
  } finally {
    await holder.query("SELECT pg_advisory_unlock(hashtext('cvg-his-v2:migrations'))").catch(() => undefined);
    await holder.end().catch(() => undefined);
    if (migration && !migration.settled) await migration.stop();
  }
}

function dumpDatabase(databaseName) {
  const result = docker([
    'exec', CONTAINER_NAME, 'pg_dump', '--format=custom', '--no-owner', '--no-acl',
    '-U', 'postgres', '-d', databaseName
  ], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  return result.stdout;
}

function restoreDatabase(databaseName, dumpBytes) {
  const hostDumpDirectory = mkdtempSync(join(tmpdir(), 'cvg-rem016-dump-'));
  const hostDump = join(hostDumpDirectory, 'rollback.dump');
  const containerDump = `/tmp/rem016-${RUN_ID}-rollback.dump`;
  const failures = [];
  try {
    writeFileSync(hostDump, dumpBytes, { mode: 0o600 });
    docker(['cp', hostDump, `${CONTAINER_NAME}:${containerDump}`]);
    docker(['exec', CONTAINER_NAME, 'pg_restore', '--exit-on-error', '--no-owner', '--no-acl', '-U', 'postgres', '-d', databaseName, containerDump]);
  } catch (error) {
    failures.push(error);
  }
  try {
    rmSync(hostDumpDirectory, { recursive: true });
  } catch (error) {
    failures.push(error);
  }
  try {
    docker([
      'exec', CONTAINER_NAME, 'sh', '-c',
      'if [ -e "$1" ]; then rm -- "$1"; fi', 'sh', containerDump
    ], { timeout: 30_000 });
  } catch (error) {
    failures.push(error);
  }
  if (failures.length > 0)
    throw new AggregateError(failures, 'REM-016 database restore or temporary dump cleanup failed');
}

async function runRollback({ adminUrl, port, files, databases }) {
  const source = `rem016_rollback_source_${RUN_ID}`;
  const restored = `rem016_rollback_restored_${RUN_ID}`;
  databases.add(source);
  databases.add(restored);
  await createDatabase(adminUrl, source);
  const sourceUrl = databaseUrl(port, source);
  const prefixResult = await migrationCommand(sourceUrl, PREFIX_TARGET);
  assertPassed(prefixResult, 'rollback prefix install');
  const prefix = `rem016-rollback-${RUN_ID}-`;
  await insertSyntheticAccounts(sourceUrl, prefix);
  const beforeUpgradeRows = await migrationRows(sourceUrl);
  const beforeUpgradeData = await accountSnapshot(sourceUrl, prefix);
  const dump = dumpDatabase(source);
  const headResult = await migrationCommand(sourceUrl);
  assertPassed(headResult, 'rollback source upgrade');
  assertMigrationRows(await migrationRows(sourceUrl), expectedMigrationRows(files), 'rollback source head');
  await createDatabase(adminUrl, restored);
  restoreDatabase(restored, dump);
  const restoredUrl = databaseUrl(port, restored);
  assertMigrationRows(await migrationRows(restoredUrl), beforeUpgradeRows, 'rollback restored prefix');
  assert.deepEqual(await accountSnapshot(restoredUrl, prefix), beforeUpgradeData, 'rollback lost synthetic data');
  return {
    status: 'passed',
    rollbackMethod: 'pg_dump-custom-plus-pg_restore-into-owned-replacement-database',
    sourceHeadAfterUpgrade: true,
    restoredTarget: PREFIX_TARGET,
    restoredMigrationCount: beforeUpgradeRows.length,
    syntheticRowsRestored: beforeUpgradeData.length,
    dataPreserved: true
  };
}

async function runFailureRecovery({ adminUrl, port, files, databases }) {
  const name = `rem016_failure_${RUN_ID}`;
  databases.add(name);
  await createDatabase(adminUrl, name);
  const url = databaseUrl(port, name);
  const prefixResult = await migrationCommand(url, PREFIX_TARGET);
  assertPassed(prefixResult, 'failure recovery prefix');
  const prefix = `rem016-failure-${RUN_ID}-`;
  await insertSyntheticAccounts(url, prefix);
  const beforeData = await accountSnapshot(url, prefix);
  const corrupted = files[0];
  await withClient(url, (client) => client.query(
    'UPDATE drizzle_migrations SET hash = $1 WHERE migration_name = $2',
    ['0'.repeat(64), corrupted.name]
  ));
  const corruptedRows = await migrationRows(url);
  const failed = await migrationCommand(url);
  assert.equal(failed.status, 'failed', 'checksum known-bad unexpectedly passed');
  assert.match(`${failed.stdout}\n${failed.stderr}`, /checksum mismatch/i);
  assert.deepEqual(await migrationRows(url), corruptedRows, 'checksum failure changed migration rows beyond the injected corruption');
  assert.deepEqual(await accountSnapshot(url, prefix), beforeData, 'checksum failure changed synthetic data');
  await withClient(url, (client) => client.query(
    'UPDATE drizzle_migrations SET hash = $1 WHERE migration_name = $2',
    [corrupted.sha256, corrupted.name]
  ));
  const recovered = await migrationCommand(url);
  assertPassed(recovered, 'failure recovery after checksum repair');
  assertMigrationRows(await migrationRows(url), expectedMigrationRows(files), 'failure recovery head');
  return {
    status: 'passed',
    knownBad: 'corrupted-applied-migration-checksum',
    knownBadExitCode: failed.exitCode,
    noAdditionalMutationDuringFailure: true,
    recoveredToHead: true
  };
}

async function runUnknownTargetKnownBad({ adminUrl, port, databases }) {
  const name = `rem016_unknown_${RUN_ID}`;
  databases.add(name);
  await createDatabase(adminUrl, name);
  const url = databaseUrl(port, name);
  const result = await migrationCommand(url, '9999_unknown_rem016_target');
  assert.equal(result.status, 'failed', 'unknown migration target known-bad unexpectedly passed');
  assert.match(`${result.stdout}\n${result.stderr}`, /unknown migration target/i);
  assertMigrationRows(await migrationRows(url), [], 'unknown target no-op');
  return { status: 'passed', knownBad: 'unknown-migration-target', exitCode: result.exitCode, noMigrationRowsCreated: true };
}

function isWithinPath(rootPath, targetPath) {
  const pathFromRoot = relative(rootPath, targetPath);
  return pathFromRoot === '' ||
    (!isAbsolute(pathFromRoot) && pathFromRoot !== '..' && !pathFromRoot.startsWith('..' + sep));
}

export function writeOutput(root, outputPath, report) {
  if (!outputPath) return null;
  if (typeof outputPath !== 'string' || isAbsolute(outputPath) || /^[A-Za-z]:/.test(outputPath))
    throw new Error('output path must be repository-relative');

  const segments = outputPath.split(/[\\/]/);
  if (segments.length < 2 || segments.some((segment) =>
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment) || segment === '.' || segment === '..'
  )) throw new Error('output path contains an invalid segment');
  const fileName = segments.pop();
  if (!fileName.endsWith('.json')) throw new Error('output file must use the .json extension');

  const canonicalRoot = realpathSync(resolve(root));
  let currentDirectory = canonicalRoot;
  for (const segment of segments) {
    currentDirectory = resolve(currentDirectory, segment);
    try {
      const stat = lstatSync(currentDirectory);
      if (stat.isSymbolicLink()) throw new Error('output directory cannot traverse a symbolic link');
      if (!stat.isDirectory()) throw new Error('output parent path must contain only directories');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      try {
        mkdirSync(currentDirectory, { mode: 0o700 });
      } catch {
        throw new Error('output directory could not be created safely');
      }
    }
  }

  const canonicalDirectory = realpathSync(currentDirectory);
  if (!isWithinPath(canonicalRoot, canonicalDirectory))
    throw new Error('output directory must stay inside the repository');
  const absolute = resolve(canonicalDirectory, fileName);
  try {
    lstatSync(absolute);
    throw new Error('output refuses to overwrite an existing path');
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      if (error instanceof Error && error.message === 'output refuses to overwrite an existing path')
        throw error;
      throw new Error('output path could not be inspected safely');
    }
  }
  try {
    writeFileSync(absolute, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  } catch {
    throw new Error('output could not be created exclusively');
  }
  return relative(canonicalRoot, absolute).split(sep).join('/');
}

function parseArgs(argv) {
  const args = { output: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--') continue;
    if (argv[index] === '--output') args.output = argv[++index] ?? null;
    else if (argv[index] === '--help') {
      console.log('Usage: node scripts/run-rem016-migration-harness.mjs [--output <repository-relative-json>]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return args;
}

export async function runRem016MigrationHarness({ root = ROOT, output = null } = {}) {
  if (activeRunState) throw new Error('REM-016 harness already has an active run');
  const state = { activeChildren: new Set(), cleaning: false, interruptErrors: [], requestedSignal: null };
  activeRunState = state;
  const requestInterrupt = (signal) => {
    state.requestedSignal ??= signal;
    for (const child of state.activeChildren) {
      try {
        signalChildTree(child, 'SIGTERM');
      } catch (error) {
        if (error?.code !== 'ESRCH') state.interruptErrors.push(error);
      }
      const killTimer = setTimeout(() => {
        if (!state.activeChildren.has(child)) return;
        try {
          signalChildTree(child, 'SIGKILL');
        } catch (error) {
          if (error?.code !== 'ESRCH') state.interruptErrors.push(error);
        }
      }, CHILD_TERMINATION_GRACE_MS);
      killTimer.unref?.();
    }
  };
  const onSigint = () => requestInterrupt('SIGINT');
  const onSigterm = () => requestInterrupt('SIGTERM');
  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);

  const databases = new Set();
  const cleanupErrors = state.interruptErrors;
  let server;
  let report;
  let runError;

  try {
    const files = migrationFiles();
    if (files.length < 10) throw new Error('unexpectedly small migration inventory');
    server = await startContainer();
    throwIfInterrupted();
    const install = await runInstall({ ...server, files, databases });
    throwIfInterrupted();
    const mixedVersion = await runMixedVersion({ ...server, files, databases });
    throwIfInterrupted();
    const lock = await runLockProbe({ ...server, databaseName: 'rem016_install_' + RUN_ID });
    throwIfInterrupted();
    const rollback = await runRollback({ ...server, files, databases });
    throwIfInterrupted();
    const failureRecovery = await runFailureRecovery({ ...server, files, databases });
    throwIfInterrupted();
    const unknownTarget = await runUnknownTargetKnownBad({ ...server, databases });
    throwIfInterrupted();
    report = {
      schemaVersion: 1,
      task: 'REM-016',
      status: 'PASS',
      runId: RUN_ID,
      image: POSTGRES_IMAGE,
      databaseIsolation: 'owned disposable PostgreSQL container and per-run databases',
      migrationCount: files.length,
      prefixTarget: PREFIX_TARGET,
      scenarios: { install, mixedVersion, lock, rollback, failureRecovery, unknownTarget },
      limitations: [
        'Synthetic data and a disposable local container do not prove target rollback, RPO/RTO, operator readiness or human approval.',
        'Mixed-version is represented by an old migration-prefix schema followed by the current migration runner; it does not certify an independently built historical application binary.',
        'No shared database, real credential, provider, clinical/PII data, deploy, restore drill or release action was used.'
      ]
    };
  } catch (error) {
    runError = error;
  } finally {
    state.cleaning = true;
    try {
      if (server) {
        for (const name of [...databases].reverse()) {
          try {
            await dropDatabase(server.adminUrl, name);
          } catch (error) {
            cleanupErrors.push(error);
          }
        }
        try {
          docker(['rm', '--force', CONTAINER_NAME], { timeout: 30_000 });
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
    } finally {
      process.removeListener('SIGINT', onSigint);
      process.removeListener('SIGTERM', onSigterm);
      activeRunState = null;
    }
  }

  if (state.requestedSignal && !runError) {
    runError = new Error(`REM-016 interrupted by ${state.requestedSignal}`);
  }
  if (runError || cleanupErrors.length > 0) {
    const failures = runError ? [runError, ...cleanupErrors] : cleanupErrors;
    const aggregate = new AggregateError(
      failures,
      'REM-016 scenarios or disposable-resource cleanup failed; no PASS report was published'
    );
    if (state.requestedSignal) {
      aggregate.signal = state.requestedSignal;
      aggregate.exitCode = state.requestedSignal === 'SIGINT' ? 130 : 143;
    }
    throw aggregate;
  }
  if (!report) throw new Error('REM-016 completed without a result report');
  writeOutput(root, output, report);
  return report;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  runRem016MigrationHarness({ output: parseArgs(process.argv.slice(2)).output })
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
    })
    .catch((error) => {
      console.error(`REM-016 migration harness failed: ${redact(error.stack ?? error.message)}`);
      process.exitCode = error.exitCode ?? 1;
    });
}
