#!/usr/bin/env node

/**
 * Capture low-cardinality diagnostics around the k6 performance gate.
 *
 * The collector is deliberately best effort. It never changes the load
 * profile or SLO thresholds and it does not record SQL text, request bodies,
 * connection-string credentials, or environment values wholesale. A partial
 * snapshot is more useful than losing the performance result altogether.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { arch, cpus, freemem, hostname, loadavg, platform, release, totalmem } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const DEFAULT_OUTPUT = 'benchmarks/k6/results/performance-diagnostics.json';
const DEFAULT_INTERVAL_MS = 5_000;
const MAX_COMMAND_OUTPUT = 30_000;

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function currentCommit(rootDir) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    timeout: 5_000
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

export function redactConnectionString(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    if (parsed.username) parsed.username = '<redacted>';
    if (parsed.password) parsed.password = '<redacted>';
    return parsed.toString();
  } catch {
    return '<invalid-connection-string>';
  }
}

function safeOrigin(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function truncate(value) {
  const text = String(value ?? '');
  return text.length <= MAX_COMMAND_OUTPUT
    ? text
    : `${text.slice(0, MAX_COMMAND_OUTPUT)}\n...[truncated]`;
}

function command(commandName, args = [], timeout = 4_000) {
  try {
    return {
      status: 'PASS',
      output: truncate(
        execFileSync(commandName, args, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout,
          maxBuffer: MAX_COMMAND_OUTPUT
        })
      )
    };
  } catch (error) {
    return {
      status: 'UNAVAILABLE',
      error: error?.code ?? error?.message ?? 'command failed',
      output: truncate(error?.stdout ?? '')
    };
  }
}

function readFile(path) {
  try {
    return truncate(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function cgroupSnapshot() {
  const files = [
    '/sys/fs/cgroup/cpu.stat',
    '/sys/fs/cgroup/cpu.max',
    '/sys/fs/cgroup/memory.current',
    '/sys/fs/cgroup/memory.max',
    '/sys/fs/cgroup/memory.events'
  ];
  const values = {};
  for (const path of files) {
    const value = readFile(path);
    if (value !== null) values[path] = value;
  }
  return values;
}

function systemSnapshot({ detailed = true } = {}) {
  const snapshot = {
    load_average: loadavg(),
    runner: {
      hostname_hash: hash(hostname()),
      platform: platform(),
      release: release(),
      arch: arch(),
      cpu_count: cpus().length,
      total_memory_bytes: totalmem(),
      free_memory_bytes: freemem()
    },
    proc: {
      loadavg: readFile('/proc/loadavg'),
      meminfo: readFile('/proc/meminfo')
    },
    cgroup: cgroupSnapshot(),
    commands: {}
  };

  if (detailed) {
    snapshot.commands = {
      vmstat: command('vmstat', ['-S', 'M', '1', '1'], 4_000),
      iostat: command('iostat', ['-xz', '1', '1'], 4_000),
      sockets: command('ss', ['-s']),
      processes: command('ps', [
        '-eo',
        'pid,ppid,pcpu,pmem,rss,vsz,stat,etime,comm',
        '--sort=-pcpu'
      ]),
      disk: command('df', ['-P', '-h', '.'])
    };
  } else {
    snapshot.commands = {
      note: 'lightweight interval sample; detailed commands are captured at watch boundaries'
    };
  }

  return snapshot;
}

async function databaseSnapshot(connectionString) {
  if (!connectionString) {
    return { status: 'SKIPPED', reason: 'DATABASE_URL not configured' };
  }

  const snapshot = {
    status: 'PASS',
    connection: redactConnectionString(connectionString),
    aggregates: null,
    waits: [],
    database: null,
    errors: []
  };

  let pool;
  try {
    pool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 2_000,
      idleTimeoutMillis: 1_000
    });
  } catch (error) {
    return {
      ...snapshot,
      status: 'PARTIAL',
      errors: [{ query: 'pool.initialize', error: error?.code ?? error?.message }]
    };
  }

  try {
    const aggregates = await pool.query(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        current_setting('max_connections')::integer AS max_connections,
        count(*) FILTER (WHERE datname = current_database() AND pid <> pg_backend_pid())::integer AS sessions,
        count(*) FILTER (WHERE datname = current_database() AND state = 'active' AND pid <> pg_backend_pid())::integer AS active_sessions,
        count(*) FILTER (WHERE datname = current_database() AND wait_event IS NOT NULL AND pid <> pg_backend_pid())::integer AS waiting_sessions
      FROM pg_stat_activity
    `);
    snapshot.aggregates = aggregates.rows[0] ?? null;
  } catch (error) {
    snapshot.status = 'PARTIAL';
    snapshot.errors.push({
      query: 'pg_stat_activity.aggregate',
      error: error?.code ?? error?.message
    });
  }

  try {
    const waits = await pool.query(`
      SELECT
        coalesce(wait_event_type, 'none') AS wait_event_type,
        coalesce(wait_event, 'none') AS wait_event,
        coalesce(state, 'unknown') AS state,
        count(*)::integer AS count
      FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid()
      GROUP BY wait_event_type, wait_event, state
      ORDER BY count DESC, wait_event_type, wait_event, state
    `);
    snapshot.waits = waits.rows;
  } catch (error) {
    snapshot.status = 'PARTIAL';
    snapshot.errors.push({ query: 'pg_stat_activity.waits', error: error?.code ?? error?.message });
  }

  try {
    const database = await pool.query(`
      SELECT
        datname AS database_name,
        numbackends,
        xact_commit,
        xact_rollback,
        blks_read,
        blks_hit,
        temp_files,
        temp_bytes,
        deadlocks
      FROM pg_stat_database
      WHERE datname = current_database()
    `);
    snapshot.database = database.rows[0] ?? null;
  } catch (error) {
    snapshot.status = 'PARTIAL';
    snapshot.errors.push({ query: 'pg_stat_database', error: error?.code ?? error?.message });
  } finally {
    await pool.end().catch(() => undefined);
  }

  return snapshot;
}

export async function collectPerformanceSnapshot({
  rootDir = process.cwd(),
  env = process.env,
  phase = 'sample',
  now = new Date(),
  detailed = phase === 'watch' || phase.startsWith('watch-')
} = {}) {
  const connectionString = env.DATABASE_URL ?? env.DATABASE_URL_TEST ?? null;
  const database = await databaseSnapshot(connectionString);
  return {
    captured_at: now.toISOString(),
    phase,
    commit_sha: currentCommit(rootDir),
    api_pid: env.API_PID ? Number(env.API_PID) || null : null,
    workload: {
      profile: env.LOAD_PROFILE ?? null,
      target_origin: safeOrigin(env.TARGET),
      postgres_pool_min: env.POSTGRES_POOL_MIN ?? null,
      postgres_max_connections: env.POSTGRES_MAX_CONNECTIONS ?? null
    },
    database,
    system: systemSnapshot({ detailed })
  };
}

function writeAtomic(path, value) {
  mkdirSync(resolve(path, '..'), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
}

export async function capturePerformanceDiagnostics({
  rootDir = process.cwd(),
  outputPath = resolve(rootDir, argument('--output', DEFAULT_OUTPUT)),
  env = process.env,
  phase = argument('--phase', hasFlag('--watch') ? 'watch' : 'single'),
  intervalMs = Number(argument('--interval-ms', DEFAULT_INTERVAL_MS)),
  watch = hasFlag('--watch')
} = {}) {
  const report = {
    schema_version: 1,
    evidence_type: 'cvg-his-performance-diagnostics',
    status: 'PARTIAL',
    captured_at: new Date().toISOString(),
    commit_sha: currentCommit(rootDir),
    ci: {
      provider: env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local',
      workflow: env.GITHUB_WORKFLOW ?? null,
      run_id: env.GITHUB_RUN_ID ?? null,
      run_attempt: env.GITHUB_RUN_ATTEMPT ?? null,
      runner_name: env.RUNNER_NAME ?? null,
      runner_os: env.RUNNER_OS ?? null,
      runner_arch: env.RUNNER_ARCH ?? null
    },
    samples: []
  };

  let writing = false;
  const append = async (samplePhase) => {
    if (writing) return;
    writing = true;
    try {
      const sample = await collectPerformanceSnapshot({ rootDir, env, phase: samplePhase });
      report.samples.push(sample);
      report.captured_at = sample.captured_at;
      report.status = report.samples.some((item) => item.database.status === 'PASS')
        ? 'PASS'
        : 'PARTIAL';
      writeAtomic(outputPath, report);
    } finally {
      writing = false;
    }
  };

  await append(phase);
  if (!watch) return report;

  const interval = Math.max(1_000, Number.isFinite(intervalMs) ? intervalMs : DEFAULT_INTERVAL_MS);
  let stopping = false;
  let timer;
  let resolveWatch;
  const watchCompletion = new Promise((resolve) => {
    resolveWatch = resolve;
  });
  const stop = async (signal) => {
    if (stopping) return;
    stopping = true;
    if (timer) clearInterval(timer);
    await append(`watch-${signal.toLowerCase()}`);
    process.exitCode = 0;
    resolveWatch(report);
  };

  process.once('SIGINT', () => void stop('SIGINT'));
  process.once('SIGTERM', () => void stop('SIGTERM'));
  timer = setInterval(() => void append('interval'), interval);
  await watchCompletion;
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const report = await capturePerformanceDiagnostics();
    console.log(
      `Performance diagnostics: ${argument('--output', DEFAULT_OUTPUT)}; status=${report.status}; samples=${report.samples.length}`
    );
  } catch (error) {
    console.error(`Performance diagnostics failed unexpectedly: ${error?.message ?? error}`);
    if (process.env.PERFORMANCE_DIAGNOSTICS_FAIL_CLOSED === '1') process.exitCode = 1;
  }
}
