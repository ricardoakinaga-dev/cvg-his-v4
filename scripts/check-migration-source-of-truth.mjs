#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));
}

function fail(message) {
  console.error(`[migration-source] FAIL ${message}`);
  failures += 1;
}

function pass(message) {
  console.log(`[migration-source] PASS ${message}`);
}

let failures = 0;
const canonical = readJson('packages/db/package.json');
const runtimeDatabase = readJson('packages/shared/database/package.json');
const canonicalScripts = canonical.scripts ?? {};
const runtimeScripts = runtimeDatabase.scripts ?? {};
const blocker = 'reject-legacy-db-command.mjs';

if (canonicalScripts['db:migrate'] !== 'tsx src/migrate.ts') {
  fail('packages/db db:migrate must point to src/migrate.ts');
} else {
  pass('packages/db db:migrate points to the checksum-aware runner');
}

if (canonicalScripts['db:seed'] !== 'tsx src/seed.ts') {
  fail('packages/db db:seed must point to src/seed.ts');
} else {
  pass('packages/db db:seed points to the canonical seed entrypoint');
}

for (const [packageName, scripts] of [
  ['packages/db', canonicalScripts],
  ['packages/shared/database', runtimeScripts]
]) {
  for (const command of ['db:generate', 'db:push']) {
    const value = scripts[command];
    if (value !== undefined && !value.includes(blocker)) {
      fail(`${packageName} ${command} must be absent or fail closed through ${blocker}`);
    }
  }
}

for (const [command, value] of Object.entries(runtimeScripts)) {
  if (command.startsWith('db:') && !value.includes(blocker)) {
    fail(`packages/shared/database ${command} exposes an executable schema command`);
  }
}

for (const [packageName, manifest] of [
  ['packages/db', canonical],
  ['packages/shared/database', runtimeDatabase]
]) {
  const dependencyNames = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {})
  ];
  if (dependencyNames.includes('drizzle-kit')) {
    fail(`${packageName} must not depend on drizzle-kit for the canonical SQL migration rail`);
  }
}

const requiredCanonicalConsumers = [
  ['.github/workflows/ci.yml', 'pnpm exec tsx packages/db/src/migrate.ts'],
  ['docker-compose.v2.yml', 'packages/db/dist/migrate.js'],
  ['infra/scripts/prepare-test-db.mjs', 'packages/db/src/migrate.ts'],
  ['infra/scripts/cutover-v2.sh', 'packages/db/src/migrate.ts'],
  ['infra/helm/cvg-his-v2/templates/database-maintenance-jobs.yaml', 'packages/db/dist/migrate.js']
];

for (const [relativePath, expected] of requiredCanonicalConsumers) {
  const content = readFileSync(resolve(root, relativePath), 'utf8');
  if (!content.includes(expected)) {
    fail(`${relativePath} must invoke ${expected}`);
  } else {
    pass(`${relativePath} invokes the canonical migration rail`);
  }
}

const sharedMigrationDirectory = resolve(root, 'packages/shared/database/src/migrations');
if (existsSync(sharedMigrationDirectory)) {
  pass('shared-database migration SQL remains available as historical material only');
} else {
  fail('historical shared-database migration directory is unexpectedly missing');
}

for (const artifact of [
  'packages/db/src/migrate.js',
  'packages/db/src/migrate.d.ts',
  'packages/db/src/migrate.js.map',
  'packages/db/src/migrate.d.ts.map',
  'packages/db/drizzle.config.ts'
]) {
  if (existsSync(resolve(root, artifact))) {
    fail(`${artifact} is a stale source-level migration entrypoint and must be removed`);
  } else {
    pass(`${artifact} is absent; TypeScript runner and generated dist output remain canonical`);
  }
}

if (failures > 0) {
  console.error(`[migration-source] ${failures} contract(s) failed`);
  process.exitCode = 1;
} else {
  console.log('[migration-source] canonical migration source-of-truth is consistent');
}
