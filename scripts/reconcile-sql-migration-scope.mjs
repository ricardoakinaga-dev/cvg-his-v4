#!/usr/bin/env node
/**
 * One-way, auditable reconciliation for PROD-011's SQL scope.
 *
 * The manifest keeps every SQL byte visible, while the specialized consumer
 * distinguishes the top-level active runner set from historical revert/seed
 * and hidden drift/backup artifacts. It never edits migration contents.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  discoverSqlArtifacts,
  discoverSqlMigrations,
  validateSqlManifest
} from './lib/sql-migration-evidence.mjs';
import { executionInputDigest, sourceSetDigest } from './lib/critical-source-identity.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = resolve(ROOT, 'docs/engineering/critical-coverage-scope.json');
const PRODUCER_PATH = 'scripts/run-sql-migration-evidence.mjs';
const VERIFIER_PATH = 'scripts/lib/sql-migration-evidence.mjs';
const RECONCILER_PATH = 'scripts/reconcile-sql-migration-scope.mjs';
const REQUIRED_PHASES = ['cleanApply', 'upgrade', 'reexecution', 'failureRecovery', 'invariants'];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function currentHead() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
}

function countBefore(manifest) {
  const sql = manifest.files.filter((file) => file.path.endsWith('.sql'));
  const rootPrefix = 'packages/db/migrations/';
  const root = sql.filter((file) => {
    const suffix = file.path.slice(rootPrefix.length);
    return file.path.startsWith(rootPrefix) && !suffix.includes('/');
  });
  return {
    manifestSqlCount: sql.length,
    rootSqlCount: root.length,
    rootActiveCount: root.filter((file) => !file.path.endsWith('.revert.sql') && !file.path.endsWith('.seed.sql')).length,
    rootHistoricalCount: root.filter((file) => file.path.endsWith('.revert.sql') || file.path.endsWith('.seed.sql')).length,
    hiddenHistoricalCount: sql.length - root.length
  };
}

function buildNextManifest(manifest, { artifacts, migrations, previousManifestSha256, preservedManifest, observedAt }) {
  const before = countBefore(manifest);
  const existingByPath = new Map(manifest.files.filter((file) => file.path.endsWith('.sql')).map((file) => [file.path, file]));
  const activePaths = new Set(migrations.map((migration) => migration.path));
  const sqlFiles = artifacts.map((artifact) => {
    const previous = existingByPath.get(artifact.path);
    return {
      ...(previous ?? {
        path: artifact.path,
        components: ['roles-rls'],
        justification: null,
        review: null
      }),
      path: artifact.path,
      sha256: artifact.sha256,
      components: previous?.components?.length ? previous.components : ['roles-rls'],
      applicability: activePaths.has(artifact.path)
        ? 'sql-migration-evidence'
        : 'historical-sql-artifact',
      justification: activePaths.has(artifact.path)
        ? 'Executable SQL migration consumed by packages/db/src/migrate.ts and verified by PROD-011 SQL evidence.'
        : 'Historical SQL artifact retained for byte-level accountability; excluded from the executable migration rail.'
    };
  });
  const nonSqlFiles = manifest.files.filter((file) => !file.path.endsWith('.sql'));
  const files = [...nonSqlFiles, ...sqlFiles].sort((left, right) => left.path.localeCompare(right.path));
  const next = JSON.parse(JSON.stringify(manifest));
  next.files = files;
  const previousInputs = Array.isArray(next.executionInputs) ? next.executionInputs : [];
  const executionInputs = [...new Set([...previousInputs, PRODUCER_PATH, VERIFIER_PATH, RECONCILER_PATH])];
  next.executionInputs = executionInputs;
  next.executionInputsSha256 = executionInputDigest(executionInputs);
  next.specializedEvidence = {
    ...(next.specializedEvidence ?? {}),
    sql: {
      schemaVersion: 1,
      sourceDirectory: 'packages/db/migrations',
      expectedMigrationCount: migrations.length,
      contractualMigrationCount: 169,
      forwardOnlyAdditions: migrations.slice(169).map((migration) => migration.path),
      expectedArtifactCount: artifacts.length,
      historicalArtifactCount: artifacts.filter((artifact) => artifact.kind === 'historical-sql-artifact').length,
      acceptedArtifactPath: 'artifacts/remediation/PROD-011/sql-migration-evidence/accepted/evidence.json',
      requiredPhases: REQUIRED_PHASES,
      producerPath: PRODUCER_PATH,
      verifierPath: VERIFIER_PATH,
      scopeReconciliation: {
        previousObservedScope: before,
        previousHistoricalPaths: manifest.files
          .filter((file) => file.path.endsWith('.sql') && !activePaths.has(file.path))
          .map((file) => file.path)
          .sort(),
        addedCanonicalActivePaths: migrations
          .map((migration) => migration.path)
          .filter((path) => !existingByPath.has(path)),
        excludedFromRunner: 'revert, seed, hidden drift and backup SQL remain byte-accountable historical artifacts'
      }
    }
  };
  next.manifestRevision = (Number.isInteger(next.manifestRevision) ? next.manifestRevision : 0) + 1;
  next.head = currentHead();
  next.sourceSetSha256 = sourceSetDigest(files);
  next.scopeHistory = Array.isArray(next.scopeHistory) ? [...next.scopeHistory] : [];
  next.scopeHistory.push({
    manifestRevision: next.manifestRevision,
    observedAt,
    collectionCommit: next.head,
    previousManifestSha256,
    preservedManifest,
    previousSourceSetSha256: manifest.sourceSetSha256,
    sourceSetSha256: next.sourceSetSha256,
    reason: 'Reconcile PROD-011 SQL active runner inventory while retaining historical SQL bytes',
    added: migrations.map((migration) => migration.path).filter((path) => !existingByPath.has(path)),
    removed: [],
    changed: [],
    sqlScopeBefore: before,
    sqlScopeAfter: {
      manifestSqlCount: artifacts.length,
      canonicalActiveCount: migrations.length,
      historicalArtifactCount: artifacts.filter((artifact) => artifact.kind === 'historical-sql-artifact').length
    },
    executionInputsAdded: [PRODUCER_PATH, VERIFIER_PATH, RECONCILER_PATH].filter((path) => !previousInputs.includes(path)),
    executionInputsSha256: next.executionInputsSha256
  });
  return next;
}

function main(argv = process.argv.slice(2)) {
  const apply = argv.includes('--apply');
  const beforeBytes = readFileSync(MANIFEST_PATH);
  const manifest = JSON.parse(beforeBytes.toString('utf8'));
  const artifacts = discoverSqlArtifacts(ROOT, { sourceDirectory: 'packages/db/migrations' });
  const migrations = discoverSqlMigrations(ROOT, { sourceDirectory: 'packages/db/migrations' });
  if (!apply) {
    const scope = validateSqlManifest({ root: ROOT, manifest });
    console.log(JSON.stringify({ status: scope.errors.length ? 'FAIL' : 'PASS', mode: 'check', ...scope.sqlScope, errors: scope.errors }, null, 2));
    process.exitCode = scope.errors.length ? 1 : 0;
    return;
  }
  const previousManifestSha256 = sha256(beforeBytes);
  const preserveDirectory = resolve(ROOT, 'artifacts/remediation/PROD-011/manifest-refresh');
  mkdirSync(preserveDirectory, { recursive: true });
  const preservedManifest = relative(ROOT, resolve(preserveDirectory, `critical-scope-before-${previousManifestSha256}.json`)).split('\\').join('/');
  writeFileSync(resolve(ROOT, preservedManifest), beforeBytes, { flag: 'wx', mode: 0o600 });
  const next = buildNextManifest(manifest, {
    artifacts,
    migrations,
    previousManifestSha256,
    preservedManifest,
    observedAt: new Date().toISOString()
  });
  const scope = validateSqlManifest({ root: ROOT, manifest: next });
  if (scope.errors.length) throw new Error(`refusing inconsistent SQL manifest: ${scope.errors.join('; ')}`);
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'PASS', mode: 'apply', manifestRevision: next.manifestRevision, ...scope.sqlScope, preservedManifest }, null, 2));
}

export { buildNextManifest, countBefore };

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(`SQL scope reconciliation failed: ${error.stack ?? error.message}`);
    process.exitCode = 1;
  }
}

