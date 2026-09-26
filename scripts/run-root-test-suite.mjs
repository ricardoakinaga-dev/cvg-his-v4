import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';

const repositoryRoot = resolve(import.meta.dirname, '..');
const pnpmExecutable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const EXPECTED_JSDOM_WARNING = /^Not implemented: navigation to another Document$/;
const TEST_STAGE_TIMEOUT_MS = 30 * 60 * 1000;
const TERMINATION_GRACE_MS = 10 * 1000;
const TEST_DB_OWNER_COMMENT_PREFIX = 'cvg-test-db-owner';
const DATABASE_ENV_KEYS = [
  'DATABASE_URL',
  'PGHOST',
  'PGHOSTADDR',
  'PGPORT',
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
  'PGOPTIONS',
  'PGSERVICE',
  'PGSERVICEFILE',
  'PGSSLMODE',
  'PGSSLROOTCERT',
  'PGSSLCERT',
  'PGSSLKEY',
  'TEST_DB_URL_RESOLVED',
  'TEST_DB_PROCESS_ISOLATION'
];

export function isExpectedJsdomWarning(line) {
  return EXPECTED_JSDOM_WARNING.test(line.trim());
}

export function filterExpectedJsdomWarnings(output) {
  return output
    .split(/\r?\n/)
    .filter((line) => !isExpectedJsdomWarning(line))
    .join('\n');
}

function createOutputFilter(write, { suppressExpectedJsdomWarnings = false } = {}) {
  let pending = '';

  const emit = (chunk) => {
    pending += String(chunk);
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? '';
    for (const line of lines) {
      if (suppressExpectedJsdomWarnings && isExpectedJsdomWarning(line)) continue;
      write(`${line}\n`);
    }
  };

  const flush = () => {
    if (!pending) return;
    if (!(suppressExpectedJsdomWarnings && isExpectedJsdomWarning(pending))) {
      write(pending);
    }
    pending = '';
  };

  return { emit, flush };
}

export function buildTestCommands(executable = pnpmExecutable) {
  return [
    { label: 'root', executable, args: ['run', 'test:root'] },
    { label: 'workspaces', executable, args: ['run', 'test:workspaces'] }
  ];
}

function signalExitCode(signal) {
  if (signal === 'SIGINT') return 130;
  if (signal === 'SIGTERM') return 143;
  if (signal === 'SIGKILL') return 137;
  return 1;
}

function signalProcessTree(child, signal) {
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

export function executeTestCommand(
  command,
  { cwd = repositoryRoot, env = process.env, timeoutMs = TEST_STAGE_TIMEOUT_MS, abortSignal } = {}
) {
  return new Promise((resolveStatus) => {
    let settled = false;
    let timedOut = false;
    let terminating = false;
    let abortHandler = () => {};
    let timeout;
    let forceKillTimeout;
    let spawnError = false;
    const finish = (status) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearTimeout(forceKillTimeout);
      abortSignal?.removeEventListener('abort', abortHandler);
      resolveStatus(status);
    };

    let child;
    try {
      child = spawn(command.executable, command.args, {
        cwd,
        env,
        shell: false,
        detached: process.platform !== 'win32',
        stdio: ['inherit', 'pipe', 'pipe']
      });
    } catch {
      finish(1);
      return;
    }

    const terminate = () => {
      if (terminating || settled) return;
      terminating = true;
      try {
        signalProcessTree(child, 'SIGTERM');
      } catch {
        // The close event below remains the single completion path.
      }
      forceKillTimeout = setTimeout(() => {
        try {
          signalProcessTree(child, 'SIGKILL');
        } catch {
          // The process may have exited between SIGTERM and SIGKILL.
        }
      }, TERMINATION_GRACE_MS);
      forceKillTimeout.unref?.();
    };
    abortHandler = () => terminate();

    const stdout = createOutputFilter((chunk) => process.stdout.write(chunk));
    const stderr = createOutputFilter((chunk) => process.stderr.write(chunk), {
      suppressExpectedJsdomWarnings: true
    });
    child.stdout?.on('data', stdout.emit);
    child.stderr?.on('data', stderr.emit);
    child.once('error', () => {
      spawnError = true;
    });
    child.once('close', (status, signal) => {
      stdout.flush();
      stderr.flush();
      const exitStatus = spawnError
        ? 1
        : typeof status === 'number'
          ? status
          : signalExitCode(signal);
      if (timedOut) {
        process.stderr.write(
          `[test-runner] ${command.label ?? command.executable} exceeded ${timeoutMs}ms and was terminated\n`
        );
      }
      if (exitStatus !== 0) {
        process.stderr.write(
          `[test-runner] ${command.label ?? command.executable} stopped at first failure (exit ${exitStatus})\n`
        );
      }
      finish(exitStatus);
    });

    timeout = setTimeout(() => {
      timedOut = true;
      terminate();
    }, timeoutMs);
    timeout.unref?.();
    if (abortSignal?.aborted) terminate();
    else abortSignal?.addEventListener('abort', abortHandler, { once: true });
  });
}

export function buildRootTestEnvironment(source = process.env) {
  if (source.REQUIRE_TEST_DB !== '1' || source.TEST_DB_EPHEMERAL !== '1') {
    throw new Error(
      'Refusing the aggregate test suite without REQUIRE_TEST_DB=1 and TEST_DB_EPHEMERAL=1.'
    );
  }
  if (!source.DATABASE_URL_TEST || !source.TEST_DB_SUFFIX) {
    throw new Error(
      'Refusing the aggregate test suite without an explicit DATABASE_URL_TEST and unique TEST_DB_SUFFIX.'
    );
  }
  let testDatabaseUrl;
  try {
    testDatabaseUrl = new URL(source.DATABASE_URL_TEST);
  } catch {
    throw new Error('DATABASE_URL_TEST must be a valid PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(testDatabaseUrl.protocol)) {
    throw new Error('DATABASE_URL_TEST must use the PostgreSQL protocol.');
  }
  let baseDatabaseName;
  try {
    baseDatabaseName = decodeURIComponent(testDatabaseUrl.pathname.replace(/^\/+/, ''));
  } catch {
    throw new Error('DATABASE_URL_TEST must contain a valid database name.');
  }
  if (!/^[a-zA-Z0-9_-]{1,63}$/.test(baseDatabaseName)) {
    throw new Error('DATABASE_URL_TEST must use a simple test database name.');
  }
  if (!/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(baseDatabaseName)) {
    throw new Error('DATABASE_URL_TEST must name a disposable test or e2e database.');
  }
  const maxPrefixLength = Math.max(
    0,
    63 - baseDatabaseName.length - 1 - 1 - String(process.pid).length - 1 - 8 - 2 - 10
  );
  const suffixPrefix = source.TEST_DB_SUFFIX.trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, Math.min(16, maxPrefixLength));
  if (!suffixPrefix) throw new Error('TEST_DB_SUFFIX must contain a usable suffix prefix.');
  const suffix = `${suffixPrefix}_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 8)}`;

  const allowedKeys = [
    'PATH',
    'HOME',
    'USERPROFILE',
    'HOMEDRIVE',
    'HOMEPATH',
    'TMP',
    'TEMP',
    'TMPDIR',
    'SystemRoot',
    'WINDIR',
    'CI',
    'TERM',
    'NO_COLOR',
    'FORCE_COLOR',
    'DATABASE_URL_TEST',
    'TEST_DB_SUFFIX',
    'TEST_DB_EPHEMERAL',
    'REQUIRE_TEST_DB',
    'CVG_WORKSPACE_BUILD_PREPARED'
  ];
  const childEnvironment = Object.fromEntries(
    allowedKeys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]])
  );
  for (const key of DATABASE_ENV_KEYS) delete childEnvironment[key];
  childEnvironment.DOTENV_CONFIG_PATH = '/dev/null';
  childEnvironment.NODE_ENV = 'test';
  childEnvironment.REQUIRE_TEST_DB = '1';
  childEnvironment.TEST_DB_EPHEMERAL = '1';
  childEnvironment.TEST_DB_SUFFIX = suffix;
  childEnvironment.TEST_DB_PROCESS_ISOLATION = '1';
  childEnvironment.TEST_DB_RUN_ID = randomUUID().replaceAll('-', '');
  childEnvironment.DATABASE_URL_TEST = testDatabaseUrl.toString();
  return childEnvironment;
}

function quotePostgresIdentifier(identifier) {
  if (!/^[a-zA-Z0-9_-]{1,63}$/.test(identifier)) {
    throw new Error('Refusing to clean an invalid owned test database identifier.');
  }
  return `"${identifier.replaceAll('"', '""')}"`;
}

function adminDatabaseUrl(connectionString) {
  const url = new URL(connectionString);
  url.pathname = '/postgres';
  return url.toString();
}

export async function cleanupOwnedTestDatabases({
  directory,
  runId,
  databaseUrl,
  createPool = (connectionString) => new Pool({ connectionString })
}) {
  if (!directory || !/^[a-f0-9]{32}$/i.test(runId ?? '')) {
    throw new Error('Missing or invalid test database ownership context.');
  }

  let files;
  try {
    files = await readdir(directory);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  if (files.length === 0) return [];

  const baseDatabaseName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\/+/, ''));
  const records = [];
  const invalidMarkers = [];
  for (const file of files) {
    const markerFile = /^[a-f0-9]{64}\.json(?:\.\d+\.tmp)?$/i.test(file);
    if (!markerFile) {
      invalidMarkers.push(file);
      continue;
    }
    try {
      const record = JSON.parse(await readFile(join(directory, file), 'utf8'));
      const databaseName = record?.databaseName;
      const ownerRoleName = record?.ownerRoleName;
      const ownerComment = record?.ownerComment;
      if (
        record?.runId !== runId ||
        typeof databaseName !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,63}$/.test(databaseName) ||
        !/(?:^|[_-])(test|e2e)(?:[_-]|$)/i.test(databaseName) ||
        !databaseName.startsWith(`${baseDatabaseName}_`) ||
        typeof ownerRoleName !== 'string' ||
        !new RegExp(`^cvg_test_owner_${runId}_p\\d{1,10}$`, 'i').test(ownerRoleName) ||
        ownerComment !== `${TEST_DB_OWNER_COMMENT_PREFIX}:${runId}:${databaseName}` ||
        createHash('sha256').update(databaseName).digest('hex') !== file.slice(0, 64)
      ) {
        invalidMarkers.push(file);
        continue;
      }
      records.push({ file, databaseName, ownerRoleName, ownerComment });
    } catch {
      invalidMarkers.push(file);
    }
  }
  if (invalidMarkers.length > 0) {
    throw new Error(
      `Refusing database cleanup because ${invalidMarkers.length} ownership marker(s) are malformed or belong to another run; records remain at ${directory}.`
    );
  }

  const pool = createPool(adminDatabaseUrl(databaseUrl));
  const cleaned = [];
  const failures = [];
  try {
    for (const record of records) {
      try {
        const role = await pool.query(
          `SELECT shobj_description(oid, 'pg_authid') AS owner_comment,
                  rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
                  rolreplication, rolbypassrls, rolinherit
             FROM pg_roles WHERE rolname = $1`,
          [record.ownerRoleName]
        );
        if (role.rowCount > 0) {
          const attributes = role.rows[0];
          if (
            attributes.owner_comment !== record.ownerComment ||
            attributes.rolcanlogin ||
            attributes.rolsuper ||
            attributes.rolcreatedb ||
            attributes.rolcreaterole ||
            attributes.rolreplication ||
            attributes.rolbypassrls ||
            attributes.rolinherit
          ) {
            throw new Error(
              `Owner role ${record.ownerRoleName} failed ownership or privilege checks`
            );
          }
        }

        const database = await pool.query(
          `SELECT owner.rolname AS owner_role_name,
                  shobj_description(owner.oid, 'pg_authid') AS owner_comment
             FROM pg_database AS db
             JOIN pg_roles AS owner ON owner.oid = db.datdba
            WHERE db.datname = $1`,
          [record.databaseName]
        );
        if (database.rowCount > 0) {
          const owner = database.rows[0];
          if (
            owner.owner_role_name !== record.ownerRoleName ||
            owner.owner_comment !== record.ownerComment
          ) {
            throw new Error(
              `Database ${record.databaseName} is not owned by its recorded test role`
            );
          }
          await pool.query(
            `SELECT pg_terminate_backend(pid)
               FROM pg_stat_activity
              WHERE datname = $1 AND pid <> pg_backend_pid()`,
            [record.databaseName]
          );
          if (role.rowCount === 0) {
            throw new Error(`Database ${record.databaseName} has no recorded owner role`);
          }
          await pool.query(`DROP DATABASE ${quotePostgresIdentifier(record.databaseName)}`);
        }

        if (role.rowCount > 0) {
          const dependentDatabase = await pool.query(
            `SELECT 1 FROM pg_database WHERE datdba = (SELECT oid FROM pg_roles WHERE rolname = $1)`,
            [record.ownerRoleName]
          );
          if (dependentDatabase.rowCount > 0) {
            throw new Error(`Owner role ${record.ownerRoleName} still owns a database`);
          }
          await pool.query(`DROP ROLE ${quotePostgresIdentifier(record.ownerRoleName)}`);
        }
        await rm(join(directory, record.file), { force: true });
        cleaned.push(record.databaseName);
      } catch {
        failures.push(record.databaseName);
      }
    }
  } finally {
    await pool.end();
  }
  if (failures.length > 0) {
    throw new Error(
      `Could not clean ${failures.length} owned test database(s); ownership records remain at ${directory}.`
    );
  }
  return cleaned;
}

export async function runRootTestSuite({
  cwd = repositoryRoot,
  commands = buildTestCommands(),
  execute = executeTestCommand,
  env = process.env,
  abortSignal,
  cleanup = async () => {}
} = {}) {
  try {
    for (const command of commands) {
      const status = await execute(command, { cwd, env, abortSignal });
      if (status !== 0) {
        return status;
      }
    }
    return 0;
  } finally {
    await cleanup();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const controller = new AbortController();
  const handleSignal = () => controller.abort();
  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
  let env;
  try {
    env = buildRootTestEnvironment();
  } catch (error) {
    console.error(
      `[test-runner] ${error instanceof Error ? error.message : 'Invalid isolated test environment.'}`
    );
    process.exitCode = 1;
  }
  if (env) {
    const ownershipDirectory = mkdtempSync(join(tmpdir(), 'cvg-test-db-ownership-'));
    env.TEST_DB_OWNERSHIP_DIRECTORY = ownershipDirectory;
    runRootTestSuite({
      env,
      abortSignal: controller.signal,
      cleanup: async () => {
        try {
          await cleanupOwnedTestDatabases({
            directory: ownershipDirectory,
            runId: env.TEST_DB_RUN_ID,
            databaseUrl: env.DATABASE_URL_TEST
          });
          rmSync(ownershipDirectory, { recursive: true, force: true });
        } catch (error) {
          process.stderr.write(
            `[test-runner] ${error instanceof Error ? error.message : 'Owned test database cleanup failed.'}\n`
          );
          throw error;
        }
      }
    })
      .then((status) => {
        process.exitCode = status;
      })
      .catch(() => {
        process.exitCode = 1;
      });
  }
}
