#!/usr/bin/env node

import 'dotenv/config';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = resolve(root, process.env.TRIPLE_A_LOCAL_EVIDENCE_DIR ?? 'artifacts/release');
const currentCommitResult = run('git', ['rev-parse', 'HEAD'], { capture: true });
if (currentCommitResult.status !== 0) {
  throw new Error(`Unable to determine current commit: ${redact(currentCommitResult.stderr)}`);
}
const commitSha = process.env.TRIPLE_A_EVIDENCE_COMMIT_SHA
  ?? currentCommitResult.stdout.trim();
const observedAt = new Date().toISOString();
const runId = `local-workflow-${process.pid}-${Date.now()}`;
const logPath = resolve(outputDir, `workflow-postgres-${commitSha}.log`);
const envelopePath = resolve(outputDir, 'workflow-postgres-evidence.json');

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    env: options.env ?? process.env,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    timeout: options.timeout ?? 15 * 60 * 1000,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function redact(value) {
  return String(value ?? '')
    .replace(/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s]+@/gi, '$1***@')
    .replace(/(PASSWORD=)[^\s]+/gi, '$1***')
    .replace(/(TOKEN=)[^\s]+/gi, '$1***');
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function testDatabaseUrl() {
  const source = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!source) throw new Error('MIGRATION_DATABASE_URL or DATABASE_URL is required.');
  const url = new URL(source);
  const suffix = `${process.pid}_${Date.now()}`;
  url.pathname = `/cvg_his_v2_workflow_evidence_${suffix}`;
  return url.toString();
}

function execute(label, file, databaseUrl) {
  const command = 'pnpm';
  const args = [
    'exec', 'vitest', 'run', file,
    '--config', 'vitest.integration.config.ts',
    '--reporter=verbose',
    '--no-file-parallelism',
    '--hookTimeout=120000',
    '--teardownTimeout=120000',
  ];
  const result = run(command, args, {
    capture: true,
    env: {
      ...process.env,
      DATABASE_URL_TEST: databaseUrl,
      DATABASE_URL: databaseUrl,
      TEST_DB_EPHEMERAL: '1',
      REQUIRE_TEST_DB: '1',
    },
  });
  appendFileSync(logPath, [
    `## ${label}`,
    `$ ${command} ${args.join(' ')}`,
    `exit=${result.status ?? 'unknown'} signal=${result.signal ?? 'none'}`,
    redact(result.stdout),
    redact(result.stderr),
    '',
  ].join('\n'));
  return {
    label,
    command: `${command} ${args.join(' ')}`,
    status: result.status === 0 ? 'PASS' : 'FAIL',
    exit_code: result.status,
    signal: result.signal ?? null,
  };
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(logPath, `# Local workflow evidence\ncommit_sha=${commitSha}\nobserved_at=${observedAt}\n`);

let databaseUrl;
let results;
try {
  databaseUrl = testDatabaseUrl();
  results = [
    execute('clinical workflow PostgreSQL assurance', 'tests/integration/database/clinical-workflow-postgres.test.ts', databaseUrl),
    execute('workflow SIGKILL lease/fencing assurance', 'tests/integration/process/workflow-task-sigkill.test.ts', databaseUrl),
  ];
} catch (error) {
  appendFileSync(logPath, `runner_error=${redact(error.stack ?? error.message)}\n`);
  results = [{ label: 'runner setup', command: 'local workflow evidence runner', status: 'FAIL', exit_code: null, signal: null }];
}

const passed = results.length === 2 && results.every((result) => result.status === 'PASS');
const envelope = {
  schema_version: 1,
  evidence_type: 'cvg-his-external-evidence',
  status: passed ? 'PASS' : 'FAIL',
  commit_sha: commitSha,
  observed_at: observedAt,
  producer: { kind: 'local-disposable-postgres-runner', run_id: runId },
  verification: {
    verified: true,
    method: 'local-command-capture',
    verifier_id: 'local-workflow-evidence-runner',
    verified_at: new Date().toISOString(),
  },
  artifacts: [{ path: logPath.replace(`${root}/`, ''), sha256: `sha256:${sha256(logPath)}` }],
  scope: 'clinical workflow PostgreSQL, concurrency, lease/fencing, retry/DLQ, replay, audit and SIGKILL reclaim',
  environment: 'disposable PostgreSQL database requested through TEST_DB_EPHEMERAL=1',
  results,
  limitations: [
    'Local evidence is intentionally downgraded to PARTIAL by the release gate until an independent CI or target verifier confirms it.',
    'This envelope does not prove global RLS coverage, target deployment, human UAT or release authority.',
  ],
};
writeFileSync(envelopePath, `${JSON.stringify(envelope, null, 2)}\n`);
console.log(`Workflow evidence: ${envelopePath}`);
console.log(`Status: ${envelope.status}; commit=${commitSha}; results=${results.map((result) => `${result.label}:${result.status}`).join(', ')}`);
if (!passed) process.exitCode = 1;
