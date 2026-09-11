#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { hostname, cpus, freemem, arch, platform, release, totalmem } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const DEFAULT_OUTPUT = 'benchmarks/k6/results/performance-provenance.json';

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function commandVersion(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5_000,
    }).trim();
  } catch {
    return null;
  }
}

function currentCommit(rootDir) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    timeout: 5_000,
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function safeOrigin(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readExisting(outputPath) {
  if (!existsSync(outputPath)) return null;
  try {
    return JSON.parse(readFileSync(outputPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeAtomic(path, value) {
  const temporaryPath = `${path}.tmp-${process.pid}`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
}

export function collectPerformanceProvenance({
  rootDir = process.cwd(),
  env = process.env,
  now = new Date(),
  phase = 'before',
  benchmarkOutcome = null,
} = {}) {
  const commitSha = currentCommit(rootDir);
  const declaredSha = typeof env.GITHUB_SHA === 'string' && /^[0-9a-f]{40}$/i.test(env.GITHUB_SHA)
    ? env.GITHUB_SHA
    : null;
  const identityMatches = !declaredSha || !commitSha || declaredSha.toLowerCase() === commitSha.toLowerCase();
  const capturedAt = now.toISOString();
  const report = {
    schema_version: 1,
    evidence_type: 'cvg-his-performance-provenance',
    status: commitSha && identityMatches ? 'PASS' : 'PARTIAL',
    phase,
    captured_at: capturedAt,
    commit_sha: commitSha,
    declared_ci_sha: declaredSha,
    identity_matches: identityMatches,
    ci: {
      provider: env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local',
      workflow: env.GITHUB_WORKFLOW ?? null,
      run_id: env.GITHUB_RUN_ID ?? null,
      run_attempt: env.GITHUB_RUN_ATTEMPT ?? null,
      ref: env.GITHUB_REF_NAME ?? null,
      runner_name: env.RUNNER_NAME ?? null,
      runner_os: env.RUNNER_OS ?? null,
      runner_arch: env.RUNNER_ARCH ?? null,
    },
    runner: {
      hostname_hash: hash(hostname()),
      platform: platform(),
      release: release(),
      arch: arch(),
      cpu_count: cpus().length,
      total_memory_bytes: totalmem(),
      free_memory_bytes: freemem(),
    },
    toolchain: {
      node: commandVersion(process.execPath, ['--version']),
      pnpm: commandVersion('pnpm', ['--version']),
      k6: commandVersion('k6', ['version']),
    },
    workload: {
      profile: env.LOAD_PROFILE ?? null,
      target_origin: safeOrigin(env.TARGET),
      postgres_pool_min: env.POSTGRES_POOL_MIN ?? null,
      postgres_max_connections: env.POSTGRES_MAX_CONNECTIONS ?? null,
    },
    benchmark: {
      outcome: benchmarkOutcome,
    },
  };
  return report;
}

export function capturePerformanceProvenance({
  rootDir = process.cwd(),
  outputPath = resolve(rootDir, argument('--output', DEFAULT_OUTPUT)),
  phase = argument('--phase', 'before'),
  env = process.env,
  now = new Date(),
  benchmarkOutcome = env.BENCHMARK_OUTCOME ?? null,
} = {}) {
  const existing = phase === 'after' ? readExisting(outputPath) : null;
  const current = collectPerformanceProvenance({ rootDir, env, now, phase, benchmarkOutcome });
  const report = existing
    ? {
        ...existing,
        finished_at: current.captured_at,
        after: current,
        status: existing.status === 'PASS' && current.status === 'PASS' ? 'PASS' : 'PARTIAL',
      }
    : current;
  if (existing?.captured_at) {
    report.duration_ms = Math.max(0, Date.parse(report.finished_at) - Date.parse(existing.captured_at));
  }
  writeAtomic(outputPath, report);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const report = capturePerformanceProvenance();
  console.log(`Performance provenance: ${argument('--output', DEFAULT_OUTPUT)}; status=${report.status}; phase=${report.phase}`);
  if (report.status !== 'PASS' && process.env.PERFORMANCE_PROVENANCE_FAIL_CLOSED === '1') {
    process.exitCode = 1;
  }
}
