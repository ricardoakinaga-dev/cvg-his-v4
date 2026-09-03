#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.cwd();

export function parseCriticalSoakRuns(value) {
  const runs = Number(value ?? 20);
  if (!Number.isInteger(runs) || runs < 1 || runs > 100) {
    throw new Error('CRITICAL_SOAK_RUNS must be an integer between 1 and 100');
  }
  return runs;
}

export function redactCriticalOutput(value) {
  return String(value)
    .replace(/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s]+@/gi, '$1***@')
    .replace(/((?:PASSWORD|SECRET|TOKEN)=)[^\s]+/gi, '$1***');
}

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  return result.stdout.trim();
}

function pnpmInvocation() {
  const execPath = process.env.npm_execpath;
  if (execPath && /pnpm(?:\.c?js)?$/i.test(execPath)) {
    return { command: process.execPath, args: [execPath, 'test:critical'] };
  }
  return { command: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args: ['test:critical'] };
}

function databaseEndpoint() {
  const raw = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
  if (!raw) return 'default-test-database';
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.hostname}:${url.port || 'default'}/${url.pathname.replace(/^\//, '')}`;
  } catch {
    return 'configured-invalid-url';
  }
}

export function criticalSoakFingerprint(values) {
  return createHash('sha256').update(JSON.stringify(values)).digest('hex');
}

function executeCriticalSoak() {
  const runs = parseCriticalSoakRuns(process.env.CRITICAL_SOAK_RUNS);
  if (process.env.CRITICAL_SOAK_REQUIRE_20 === '1' && runs !== 20) {
    throw new Error('strict release soak requires exactly 20 runs');
  }
  const commitSha = git(['rev-parse', 'HEAD']);
  const dirtyEntries = git(['status', '--porcelain']).split('\n').filter(Boolean);
  if (process.env.CRITICAL_SOAK_REQUIRE_CLEAN === '1' && dirtyEntries.length > 0) {
    throw new Error('strict release soak requires a clean checkout');
  }

  const runId = `${commitSha.slice(0, 12)}-${Date.now()}-${process.pid}`;
  const outputDir = resolve(
    process.env.CRITICAL_SOAK_OUTPUT_DIR ?? `/tmp/cvg-his-v4-critical-soak/${runId}`
  );
  mkdirSync(outputDir, { recursive: true });

  const environment = {
    commit_sha: commitSha,
    clean_worktree: dirtyEntries.length === 0,
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    database_endpoint: databaseEndpoint(),
    redis_server_binary: process.env.REDIS_SERVER_BIN ?? 'auto-discovery',
  };
  const report = {
    schema_version: 1,
    status: 'RUNNING',
    started_at: new Date().toISOString(),
    completed_at: null,
    requested_runs: runs,
    completed_runs: 0,
    environment,
    environment_fingerprint: criticalSoakFingerprint(environment),
    attempts: [],
  };
  const reportPath = resolve(outputDir, 'critical-soak-report.json');
  const persistReport = () =>
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  persistReport();

  const invocation = pnpmInvocation();
  for (let index = 1; index <= runs; index += 1) {
    const started = Date.now();
    console.log(`[critical-soak] starting run ${index}/${runs}`);
    const result = spawnSync(invocation.command, invocation.args, {
      cwd: root,
      encoding: 'utf8',
      shell: false,
      env: process.env,
    });
    const logName = `run-${String(index).padStart(2, '0')}.log`;
    writeFileSync(
      resolve(outputDir, logName),
      redactCriticalOutput(`${result.stdout ?? ''}${result.stderr ?? ''}`),
      { mode: 0o600 }
    );
    const attempt = {
      run: index,
      status: result.status === 0 ? 'PASS' : 'FAIL',
      exit_code: result.status,
      signal: result.signal,
      duration_ms: Date.now() - started,
      log: logName,
    };
    report.attempts.push(attempt);
    if (result.status !== 0) {
      report.status = 'FAIL';
      report.completed_at = new Date().toISOString();
      persistReport();
      throw new Error(`critical gate failed on run ${index}/${runs}; no retry was attempted`);
    }
    report.completed_runs = index;
    persistReport();
    console.log(`[critical-soak] run ${index}/${runs} passed in ${attempt.duration_ms}ms`);
  }

  report.status = 'PASS';
  report.completed_at = new Date().toISOString();
  persistReport();
  console.log(`CRITICAL_SOAK_REPORT=${reportPath}`);
}

const invokedAsScript = process.argv[1]
  ? import.meta.url === pathToFileURL(isAbsolute(process.argv[1]) ? process.argv[1] : resolve(process.argv[1])).href
  : false;

if (invokedAsScript) {
  try {
    executeCriticalSoak();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
