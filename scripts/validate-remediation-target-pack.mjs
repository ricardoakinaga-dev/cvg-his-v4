#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_ROOT = resolve(fileURLToPath(import.meta.url), '../..');

export const REQUIRED_TARGET_PACK_FILES = Object.freeze([
  'docs/operations/REM_TARGET_CERTIFICATION_RUNBOOK.md',
  'scripts/validate-rls-coverage.ts',
  'tests/integration/rls/force-rls-catalog.test.ts',
  'tests/integration/rls/rls-isolation.test.ts',
  'tests/integration/rls/runtime-role-sensitive-acl.test.ts',
  'infra/scripts/run-critical-process-suite.mjs',
  'tests/integration/process/worker-runtime-entrypoint.test.ts',
  'tests/integration/process/worker-run-once-reports.test.ts',
  'tests/integration/process/workflow-task-sigkill.test.ts',
  'infra/scripts/validate-backup-restore.mjs',
  'infra/scripts/create-restore-drill-fixture.mjs',
  'infra/scripts/run-restore-drill-fixture.mjs',
  'infra/scripts/run-install-upgrade-drill.mjs',
  'scripts/run-rem016-migration-harness.mjs',
  'infra/scripts/run-critical-soak.mjs',
  'benchmarks/k6/api-benchmark.js',
  'benchmarks/k6/slos.json',
  'docs/operations/RPO_RTO_POLICY.md',
  'docs/operations/DISASTER_RECOVERY.md',
  'docs/engineering/SLO_AND_LOAD_PROFILE.md'
]);

const REQUIRED_RUNBOOK_MARKERS = Object.freeze([
  'REM-022',
  'REM-023',
  'REM-024',
  'REM-025',
  'REM-030',
  'FORCE RLS',
  'BYPASSRLS',
  'fencing',
  'RPO/RTO',
  'p50/p95/p99',
  'mixed-version',
  'NOT_RUN',
  '.agent/authority.jsonl',
  'não abre conexão',
  'candidate_sha'
]);

const REQUIRED_PACKAGE_SCRIPTS = Object.freeze([
  'validate:rls',
  'test:critical:process',
  'ops:backup:check',
  'ops:restore:drill:fixture:representative',
  'test:migration-harness',
  'ops:install-upgrade:drill',
  'test:critical:soak',
  'benchmark:k6:parse',
  'validate:migration-source'
]);

function read(rootDir, relativePath) {
  const path = resolve(rootDir, relativePath);
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
}

export function validateTargetPack(rootDir = DEFAULT_ROOT) {
  const failures = [];
  const runbook = read(rootDir, 'docs/operations/REM_TARGET_CERTIFICATION_RUNBOOK.md');
  const packageJsonText = read(rootDir, 'package.json');

  for (const relativePath of REQUIRED_TARGET_PACK_FILES) {
    if (!existsSync(resolve(rootDir, relativePath))) {
      failures.push(`missing required target-pack file: ${relativePath}`);
    }
  }

  for (const marker of REQUIRED_RUNBOOK_MARKERS) {
    if (!runbook?.includes(marker)) {
      failures.push(`runbook is missing required marker: ${marker}`);
    }
  }

  let packageJson;
  try {
    packageJson = JSON.parse(packageJsonText ?? '{}');
  } catch {
    failures.push('package.json is not valid JSON');
  }

  for (const scriptName of REQUIRED_PACKAGE_SCRIPTS) {
    if (typeof packageJson?.scripts?.[scriptName] !== 'string') {
      failures.push(`package.json is missing required script: ${scriptName}`);
    }
  }

  return {
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    failures,
    checked_files: REQUIRED_TARGET_PACK_FILES.length,
    checked_markers: REQUIRED_RUNBOOK_MARKERS.length,
    checked_package_scripts: REQUIRED_PACKAGE_SCRIPTS.length
  };
}

function isMain() {
  return process.argv[1] ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href : false;
}

if (isMain()) {
  const result = validateTargetPack();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.status === 'PASS') {
    console.log(
      `[remediation-target-pack] PASS ${result.checked_files} files, ${result.checked_markers} markers, ${result.checked_package_scripts} package scripts`
    );
  } else {
    for (const failure of result.failures)
      console.error(`[remediation-target-pack] FAIL ${failure}`);
  }
  process.exitCode = result.status === 'PASS' ? 0 : 1;
}
