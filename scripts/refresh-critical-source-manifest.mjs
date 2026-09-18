#!/usr/bin/env node
/**
 * Reproducible refresh/check process for the frozen critical-source identity.
 *
 * Modes:
 *   node scripts/refresh-critical-source-manifest.mjs --check
 *     Recomputes every recorded source identity and validates the manifest
 *     without writing anything. Exits non-zero on any divergence.
 *
 *   node scripts/refresh-critical-source-manifest.mjs --reason "<why>" \
 *     [--preserve-dir artifacts/remediation/MA-02/attempt-1] [--source <path> ...] [--head <sha>]
 *     Recomputes the recorded identities, preserves the previous manifest
 *     byte-for-byte, appends a scopeHistory entry and rewrites the manifest.
 *   --add-sql-migration <canonical path> expands the SQL evidence scope only
 *     after validating the complete inventory and its forward-only suffix.
 *
 * The previous manifest is always preserved before mutation; a refresh never
 * rewrites prior scopeHistory entries and never promotes prior coverage.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  applyExecutionInputChanges,
  applyNativeInventoryChanges,
  executionInputDigest,
  sourceSetDigest,
  validateCriticalSourceIdentity,
} from './lib/critical-source-identity.mjs';
import { resolveContainedPath } from './lib/root-contained-path.mjs';
import { validateSqlManifest } from './lib/sql-migration-evidence.mjs';
import { NATIVE_TEST_SHARDS, discoverNativeTestSources } from './lib/native-test-inventory.mjs';
import {
  applyVitestInventoryChanges,
  discoverCriticalVitestTests,
} from './lib/vitest-test-inventory.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'docs/engineering/critical-coverage-scope.json');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * Pure refresh transaction: increments the manifest revision, updates only the
 * recorded source identities that changed and appends one scopeHistory entry.
 * Prior history entries are never rewritten. Returns a new manifest object.
 */
export function applyRefresh({
  manifest,
  previousManifestSha256,
  preservedManifest,
  collectionCommit,
  reason,
  changed,
  inputChanges = { replaced: [], added: [], removed: [] },
  nativeChanges = [],
  vitestChanges = [],
  sqlAdditions = [],
  observedAt = new Date().toISOString(),
}) {
  const next = JSON.parse(JSON.stringify(manifest));
  const previousRevision = Number.isInteger(next.manifestRevision) ? next.manifestRevision : 0;
  const previousSourceSetSha256 =
    typeof next.sourceSetSha256 === 'string' ? next.sourceSetSha256 : null;
  if (sqlAdditions.length) {
    const sql = next.specializedEvidence?.sql;
    if (!sql || !Number.isSafeInteger(sql.expectedMigrationCount)
        || !Number.isSafeInteger(sql.expectedArtifactCount)
        || !Array.isArray(sql.forwardOnlyAdditions)) {
      throw new Error('SQL source expansion requires the existing specialized evidence contract');
    }
    for (const entry of sqlAdditions) {
      if (!/^packages\/db\/migrations\/\d{4}_[a-z0-9_]+\.sql$/.test(entry.path ?? '')
          || !/^[0-9a-f]{64}$/.test(entry.sha256 ?? '')
          || entry.applicability !== 'sql-migration-evidence'
          || next.files.some((file) => file.path === entry.path)
          || sql.forwardOnlyAdditions.includes(entry.path)) {
        throw new Error(`Invalid or duplicate SQL source addition: ${entry.path}`);
      }
      next.files.push(structuredClone(entry));
      sql.forwardOnlyAdditions.push(entry.path);
      sql.expectedMigrationCount += 1;
      sql.expectedArtifactCount += 1;
    }
  }
  for (const entry of changed) {
    const file = (next.files ?? []).find((candidate) => candidate.path === entry.path);
    if (!file) throw new Error(`Cannot refresh an unknown source: ${entry.path}`);
    file.sha256 = entry.after;
  }
  const replaced = Array.isArray(inputChanges?.replaced) ? inputChanges.replaced : [];
  const added = Array.isArray(inputChanges?.added) ? inputChanges.added : [];
  const removed = Array.isArray(inputChanges?.removed) ? inputChanges.removed : [];
  const hasInputChanges = replaced.length + added.length + removed.length > 0;
  const previousExecutionInputsSha256 =
    typeof next.executionInputsSha256 === 'string' ? next.executionInputsSha256 : null;
  if (hasInputChanges) {
    if (!Array.isArray(next.executionInputs)) {
      throw new Error('Cannot reconcile execution inputs without an executionInputs list');
    }
    next.executionInputs = applyExecutionInputChanges({
      inputs: next.executionInputs,
      replaced,
      added,
      removed,
    });
    next.executionInputsSha256 = executionInputDigest(next.executionInputs);
  }
  const nativeShards = Array.isArray(nativeChanges) ? nativeChanges : [];
  for (const change of nativeShards) {
    next.nativeTests = applyNativeInventoryChanges({
      nativeTests: next.nativeTests,
      shard: change.shard,
      added: change.added ?? [],
      removed: change.removed ?? [],
    });
  }
  const hasNativeChanges = nativeShards.length > 0;
  const vitestDelta = (Array.isArray(vitestChanges) ? vitestChanges : []).reduce(
    (accumulator, change) => {
      accumulator.added.push(...(change?.added ?? []));
      accumulator.removed.push(...(change?.removed ?? []));
      return accumulator;
    },
    { added: [], removed: [] }
  );
  const hasVitestChanges = vitestDelta.added.length + vitestDelta.removed.length > 0;
  if (hasVitestChanges) {
    next.vitestTests = applyVitestInventoryChanges({
      vitestTests: next.vitestTests,
      added: vitestDelta.added,
      removed: vitestDelta.removed,
    });
  }
  next.manifestRevision = previousRevision + 1;
  next.head = collectionCommit;
  next.sourceSetSha256 = sourceSetDigest(next.files ?? []);
  next.scopeHistory = Array.isArray(next.scopeHistory) ? next.scopeHistory : [];
  const historyEntry = {
    manifestRevision: next.manifestRevision,
    observedAt,
    collectionCommit,
    previousManifestSha256,
    preservedManifest,
    previousSourceSetSha256,
    sourceSetSha256: next.sourceSetSha256,
    reason,
    added: sqlAdditions.map((entry) => entry.path),
    removed: [],
    changed: changed.map(({ path, before, after }) => ({ path, before, after })),
  };
  if (hasInputChanges) {
    historyEntry.inputsReplaced = replaced.map(({ from, to }) => ({ from, to }));
    historyEntry.inputsAdded = [...added];
    historyEntry.inputsRemoved = [...removed];
    historyEntry.previousExecutionInputsSha256 = previousExecutionInputsSha256;
    historyEntry.executionInputsSha256 = next.executionInputsSha256;
  }
  if (hasNativeChanges) {
    historyEntry.nativeChanged = nativeShards.map(({ shard, added: shardAdded = [], removed: shardRemoved = [] }) => ({
      shard,
      added: [...shardAdded],
      removed: [...shardRemoved],
    }));
  }
  if (hasVitestChanges) {
    historyEntry.vitestAdded = [...vitestDelta.added];
    historyEntry.vitestRemoved = [...vitestDelta.removed];
  }
  next.scopeHistory.push(historyEntry);
  return next;
}

export function assertExecutionInputTargets({ root, inputChanges }) {
  const targets = [
    ...(Array.isArray(inputChanges?.replaced) ? inputChanges.replaced.map((change) => change?.to) : []),
    ...(Array.isArray(inputChanges?.added) ? inputChanges.added : []),
  ];
  for (const target of targets) {
    if (typeof target !== 'string' || !target) throw new Error('invalid execution input replacement');
    const resolved = resolveContainedPath(root, target);
    if (!resolved.ok) throw new Error(`execution input successor unavailable: ${target}: ${resolved.reason}`);
    if (!statSync(resolved.realpath).isFile()) {
      throw new Error(`execution input successor is not a regular file: ${target}`);
    }
  }
}

function parseArgs(argv) {
  const args = { check: false, reason: null, preserveDir: null, sources: [], head: null, replaced: [], added: [], removed: [], reconcileNative: [], reconcileVitest: false, vitestAdded: [], vitestRemoved: [], sqlAdded: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--check') args.check = true;
    else if (value === '--reason') args.reason = argv[++index] ?? null;
    else if (value === '--preserve-dir') args.preserveDir = argv[++index] ?? null;
    else if (value === '--source') args.sources.push(argv[++index]);
    else if (value === '--add-sql-migration') args.sqlAdded.push(argv[++index]);
    else if (value === '--head') args.head = argv[++index] ?? null;
    else if (value === '--replace-input') {
      const pair = argv[++index] ?? '';
      const separator = pair.indexOf('=');
      args.replaced.push({ from: pair.slice(0, separator), to: pair.slice(separator + 1) });
    } else if (value === '--add-input') args.added.push(argv[++index] ?? null);
    else if (value === '--remove-input') args.removed.push(argv[++index] ?? null);
    else if (value === '--reconcile-native') args.reconcileNative.push(argv[++index] ?? null);
    else if (value === '--reconcile-vitest') args.reconcileVitest = true;
    else if (value === '--add-vitest-test') args.vitestAdded.push(argv[++index] ?? null);
    else if (value === '--remove-vitest-test') args.vitestRemoved.push(argv[++index] ?? null);
    else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

function currentCollectionCommit() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}

function report(result) {
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'PASS' ? 0 : 1;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));

  if (args.check) {
    const errors = validateCriticalSourceIdentity({ root, manifest });
    report({
      status: errors.length === 0 ? 'PASS' : 'FAIL',
      mode: 'check',
      manifest: relative(root, manifestPath),
      manifestRevision: manifest.manifestRevision ?? null,
      sourceSetSha256: manifest.sourceSetSha256 ?? null,
      collectionCommit: manifest.head ?? null,
      errors,
    });
    return;
  }

  const previousManifestSha256 = sha256(manifestBytes);
  const sqlAdditions = args.sqlAdded.map((path) => {
    if (!/^packages\/db\/migrations\/\d{4}_[a-z0-9_]+\.sql$/.test(path ?? '')) {
      throw new Error(`Not a canonical forward SQL migration: ${path}`);
    }
    const target = resolveContainedPath(root, path);
    if (!target.ok || !statSync(target.realpath).isFile()) {
      throw new Error(`SQL migration source unavailable: ${path}`);
    }
    return {
      path, components: ['roles-rls'],
      justification: 'Forward SQL migration executed and verified by the specialized migration evidence producer.',
      review: null, sha256: sha256(readFileSync(target.realpath)),
      applicability: 'sql-migration-evidence',
    };
  });
  const selected = new Set(args.sources);
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const changed = [];
  for (const file of files) {
    if (selected.size > 0 && !selected.has(file.path)) continue;
    const absolute = resolve(root, file.path);
    if (!existsSync(absolute)) {
      changed.push({ path: file.path, before: file.sha256, after: null, reason: 'missing' });
      continue;
    }
    const actual = sha256(readFileSync(absolute));
    if (actual !== file.sha256) changed.push({ path: file.path, before: file.sha256, after: actual });
  }
  const refreshed = changed.filter((entry) => entry.after !== null);
  const nativeChanges = [];
  for (const shard of args.reconcileNative) {
    const app = NATIVE_TEST_SHARDS[shard];
    if (!app) throw new Error(`Unsupported native shard: ${shard}`);
    const discovered = discoverNativeTestSources(root, app);
    const current = Array.isArray(manifest.nativeTests?.[shard]) ? [...manifest.nativeTests[shard]].sort() : [];
    const added = discovered.filter((path) => !current.includes(path));
    const removed = current.filter((path) => !discovered.includes(path));
    if (added.length || removed.length) nativeChanges.push({ shard, added, removed });
  }
  const nativeInputAdditions = [...new Set(nativeChanges.flatMap((change) => change.added))].filter(
    (path) => !(manifest.executionInputs ?? []).includes(path)
  );
  const vitestChanges = [];
  if (args.reconcileVitest) {
    const discovered = discoverCriticalVitestTests(root, manifest);
    const current = new Set(Array.isArray(manifest.vitestTests) ? manifest.vitestTests : []);
    const added = discovered.filter((path) => !current.has(path));
    if (added.length) vitestChanges.push({ added, removed: [] });
  }
  if (args.vitestAdded.length || args.vitestRemoved.length) {
    vitestChanges.push({ added: args.vitestAdded, removed: args.vitestRemoved });
  }
  const vitestInputAdditions = [...new Set(vitestChanges.flatMap((change) => change.added))].filter(
    (path) => !(manifest.executionInputs ?? []).includes(path)
  );
  const inputChanges = {
    replaced: args.replaced,
    added: [...new Set([...args.added, ...nativeInputAdditions, ...vitestInputAdditions])],
    removed: args.removed,
  };
  const hasInputChanges =
    inputChanges.replaced.length + inputChanges.added.length + inputChanges.removed.length > 0;
  const hasNativeChanges = nativeChanges.length > 0;
  const hasVitestChanges = vitestChanges.length > 0;

  if (refreshed.length === 0 && !hasInputChanges && !hasNativeChanges && !hasVitestChanges && !sqlAdditions.length && !args.head) {
    const errors = validateCriticalSourceIdentity({ root, manifest });
    report({
      status: errors.length === 0 ? 'PASS' : 'FAIL',
      mode: 'noop',
      previousManifestSha256,
      message: 'No recorded source identity, execution input, native or Vitest inventory diverged; the manifest was not modified.',
      errors,
    });
    return;
  }
  if (!args.reason) throw new Error('--reason is required when refreshing identities');
  if (hasInputChanges) assertExecutionInputTargets({ root, inputChanges });

  const preserveDir = resolve(root, args.preserveDir ?? 'artifacts/remediation/MA-02/refresh');
  mkdirSync(preserveDir, { recursive: true });
  const preservedPath = resolve(preserveDir, `critical-scope-before-${previousManifestSha256}.json`);
  writeFileSync(preservedPath, manifestBytes);

  const nextManifest = applyRefresh({
    manifest,
    previousManifestSha256,
    preservedManifest: relative(root, preservedPath).split('\\').join('/'),
    collectionCommit: args.head ?? currentCollectionCommit(),
    reason: args.reason,
    changed: refreshed,
    inputChanges,
    nativeChanges,
    vitestChanges,
    sqlAdditions,
  });
  const preWriteErrors = validateCriticalSourceIdentity({ root, manifest: nextManifest });
  if (sqlAdditions.length) preWriteErrors.push(...validateSqlManifest({ root, manifest: nextManifest }).errors);
  if (preWriteErrors.length) {
    throw new Error(`refusing to write an inconsistent manifest: ${preWriteErrors.join('; ')}`);
  }

  writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
  const errors = validateCriticalSourceIdentity({ root, manifest: nextManifest });
  report({
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    mode: 'refresh',
    manifest: relative(root, manifestPath),
    manifestRevision: nextManifest.manifestRevision,
    sourceSetSha256: nextManifest.sourceSetSha256,
    collectionCommit: nextManifest.head,
    preservedManifest: relative(root, preservedPath).split('\\').join('/'),
    changed: refreshed,
    sqlAdditions: sqlAdditions.map((entry) => entry.path),
    inputChanges: hasInputChanges ? inputChanges : undefined,
    nativeChanges: hasNativeChanges ? nativeChanges : undefined,
    vitestChanges: hasVitestChanges ? vitestChanges : undefined,
    unchangedCount: files.length - refreshed.length,
    errors,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(`critical-source-identity refresh failed: ${error.stack ?? error.message}`);
    process.exitCode = 1;
  }
}
