#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { validateRawCoverageEntry } from './lib/raw-coverage-validation.mjs';
import { resolveContainedPath } from './lib/root-contained-path.mjs';
import { isRuntimeReexportOnly } from './lib/source-metric-presence.mjs';
export { validateRawCoverageEntry } from './lib/raw-coverage-validation.mjs';
const require = createRequire(import.meta.url);
const coverageRequire = createRequire(require.resolve('@vitest/coverage-v8/package.json'));
const ts = require('typescript');
const { createCoverageMap, createCoverageSummary } = coverageRequire('istanbul-lib-coverage');
const hash = (value) => createHash('sha256').update(value).digest('hex');
export function checkCriticalCoverage({ root, manifestPath, artifactsPath, head }) {
  const errors = [];
  const metriclessReexports = [];
  const manifestFile = resolveContainedPath(root, manifestPath);
  if (!manifestFile.ok) throw new Error(`manifest path ${manifestFile.reason}`);
  const bytes = readFileSync(manifestFile.realpath);
  const manifest = JSON.parse(bytes);
  if (!manifest.files?.length || !manifest.components?.length || !manifest.requiredShards?.length) throw new Error('Critical manifest must contain files, components and required shards');
  if (new Set(manifest.files.map((file) => file.path)).size !== manifest.files.length) errors.push('duplicate manifest source paths');
  const applicable = manifest.files.filter((file) => file.applicability === 'javascript-metrics');
  const expectedCoveragePaths = new Set();
  const sourceIdentities = new Map();
  const merged = createCoverageMap({});
  if (manifest.head !== head) errors.push('manifest HEAD mismatch');
  for (const file of manifest.files) {
    const sourcePath = resolveContainedPath(root, file.path);
    if (!sourcePath.ok) {
      errors.push(`source path escapes root: ${file.path}`);
    } else if (hash(readFileSync(sourcePath.realpath)) !== file.sha256) {
      errors.push(`source hash mismatch: ${file.path}`);
    }
    if (file.applicability === 'javascript-metrics' && sourcePath.ok) {
      if (expectedCoveragePaths.has(sourcePath.path)) errors.push(`duplicate normalized source path: ${file.path}`);
      expectedCoveragePaths.add(sourcePath.path);
      sourceIdentities.set(file.path, sourcePath.path);
    }
    if (file.applicability !== 'javascript-metrics') errors.push(`unresolved applicability requires specialized evidence and independent review: ${file.path}`);
  }
  const artifactsRoot = resolveContainedPath(root, artifactsPath, { allowRoot: true });
  if (!artifactsRoot.ok) errors.push(`artifacts root invalid: ${artifactsRoot.reason}`);
  for (const shard of artifactsRoot.ok ? manifest.requiredShards : []) {
      const shardPath = resolveContainedPath(artifactsRoot.absolute, shard);
      const metadataPath = shardPath.ok ? resolveContainedPath(shardPath.absolute, 'shard.json') : shardPath;
      if (!metadataPath.ok) {
        errors.push(metadataPath.reason.includes('escapes root') ? `shard path escapes artifacts root: ${shard}` : `missing shard: ${shard}`);
        continue;
      }
      try {
      const metadata = JSON.parse(readFileSync(metadataPath.realpath));
      if (metadata.shard !== shard || metadata.status !== 'passed' || metadata.head !== head || metadata.manifestSha256 !== hash(bytes)) errors.push(`invalid shard provenance/status: ${shard}`);
      if (metadata.schemaVersion !== 2 || metadata.finalizedAfterExit !== true || metadata.exitCode !== 0 || metadata.signal) errors.push(`shard not finalized after successful exit: ${shard}`);
      if (!manifest.executionInputs?.length) errors.push('missing frozen execution inputs');
      for (const path of manifest.executionInputs ?? []) {
        const inputPath = resolveContainedPath(root, path);
        if (!inputPath.ok) {
          errors.push(inputPath.reason.includes('escapes root') ? `execution input path escapes root: ${shard}:${path}` : `execution input unavailable: ${shard}:${path}`);
          continue;
        }
        if (metadata.executionInputHashes?.[path] !== hash(readFileSync(inputPath.realpath))) errors.push(`execution input hash mismatch: ${shard}:${path}`);
      }
      for (const file of applicable) if (metadata.sourceHashes?.[file.path] !== file.sha256) errors.push(`shard source hash mismatch: ${shard}:${file.path}`);
      const coveragePath = resolveContainedPath(shardPath.absolute, metadata.coverageFile);
      if (!coveragePath.ok) throw new Error(`coverage ${coveragePath.reason}`);
      const coverageBytes = readFileSync(coveragePath.realpath);
      if (metadata.coverageSha256 !== hash(coverageBytes)) errors.push(`coverage digest mismatch: ${shard}`);
      const testResultPath = resolveContainedPath(shardPath.absolute, metadata.testResultFile ?? 'missing-test-result');
      if (!testResultPath.ok) throw new Error(`test result ${testResultPath.reason}`);
      const testResultBytes = readFileSync(testResultPath.realpath);
      if (metadata.testResultSha256 !== hash(testResultBytes)) errors.push(`test result digest mismatch: ${shard}`);
      const testResult = JSON.parse(testResultBytes);
      if (testResult.runId !== metadata.runId || testResult.shard !== shard || testResult.status !== 'passed') errors.push(`invalid test result: ${shard}`);
      const raw = JSON.parse(coverageBytes);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid coverage report schema');
      const normalized = {};
      let malformed = false;
      const seenCoveragePaths = new Set();
      for (const [path, entry] of Object.entries(raw)) {
        const sourcePath = resolveContainedPath(root, path);
        if (!sourcePath.ok) { errors.push(`${sourcePath.reason.includes('escapes root') ? 'raw coverage path escapes root' : 'raw coverage source unavailable'}: ${shard}:${path}`); malformed = true; continue; }
        const key = sourcePath.path;
        if (!expectedCoveragePaths.has(key)) { errors.push(`unexpected raw coverage source: ${shard}:${key}`); malformed = true; continue; }
        if (seenCoveragePaths.has(key)) { errors.push(`duplicate raw coverage source: ${shard}:${key}`); malformed = true; continue; }
        seenCoveragePaths.add(key);
        const rawErrors = validateRawCoverageEntry(entry, readFileSync(sourcePath.realpath, 'utf8'));
        if (typeof entry?.path !== 'string') rawErrors.push('coverage path/key mismatch');
        else {
          const entryPath = resolveContainedPath(root, entry.path);
          if (!entryPath.ok) rawErrors.push(entryPath.reason.includes('escapes root') ? 'coverage source path escapes root' : 'coverage source path unavailable');
          else if (entryPath.path !== key) rawErrors.push('coverage path/key mismatch');
        }
        if (rawErrors.length) { malformed = true; errors.push(...rawErrors.map((error) => `malformed raw coverage ${shard}:${key}: ${error}`)); }
        normalized[key] = { ...entry, path: key };
      }
      // Reject the entire malformed shard before Istanbul can normalize or drop bad data.
      if (!malformed) merged.merge(normalized);
    } catch (error) { errors.push(`invalid coverage shard ${shard}: ${error.message}`); }
  }
  for (const file of applicable) if (!merged.files().includes(sourceIdentities.get(file.path))) errors.push(`missing instrumented file: ${file.path}`);
  for (const file of applicable) {
    const identity = sourceIdentities.get(file.path);
    if (!merged.files().includes(identity)) continue;
    const data = merged.fileCoverageFor(identity).data;
    for (const metric of ['s', 'f', 'b']) {
      const counts = Object.values(data[metric]).flat();
      if (counts.some((count) => !Number.isSafeInteger(count) || count < 0)) errors.push(`unsafe merged coverage counters: ${file.path}:${metric}`);
    }
    for (const [map, counts] of [['statementMap', 's'], ['fnMap', 'f'], ['branchMap', 'b']]) {
      if (Object.keys(data[map]).some((key) => !(key in data[counts]))) errors.push(`incomplete instrumentation counters: ${file.path}:${map}`);
    }
    const sourcePath = resolveContainedPath(root, file.path);
    if (!sourcePath.ok) continue;
    const source = readFileSync(sourcePath.realpath, 'utf8');
    if (!Object.keys(data.statementMap).length) {
      if (![data.s, data.f, data.b].some(metric => Object.keys(metric).length) && isRuntimeReexportOnly(source))
        metriclessReexports.push({ path: file.path, sourceSha256: hash(source), reason: 'runtime-reexports-only' });
      else errors.push(`empty instrumentation requires review: ${file.path}`);
    }
    const ast = ts.createSourceFile(file.path, source, ts.ScriptTarget.Latest, true);
    let hasFunction = false;
    let hasBranch = false;
    const visit = (node) => {
      if (ts.isFunctionLike(node) && node.body) hasFunction = true;
      if (ts.isIfStatement(node) || ts.isConditionalExpression(node) || ts.isSwitchStatement(node)) hasBranch = true;
      ts.forEachChild(node, visit);
    };
    visit(ast);
    if (hasBranch && !Object.keys(data.branchMap).length) errors.push(`executable branches lack instrumentation: ${file.path}`);
    for (const [key, branch] of Object.entries(data.branchMap)) {
      if (!Array.isArray(data.b[key]) || data.b[key].length !== branch.locations.length) errors.push(`incomplete branch instrumentation: ${file.path}:${key}`);
    }
    if (hasFunction && !Object.keys(data.fnMap).length) errors.push(`executable functions lack instrumentation: ${file.path}`);
  }
  const components = {};
  for (const component of manifest.components) {
    const summary = createCoverageSummary();
    for (const file of applicable.filter((file) => file.components.includes(component))) {
      const identity = sourceIdentities.get(file.path);
      if (merged.files().includes(identity)) summary.merge(merged.fileCoverageFor(identity).toSummary());
    }
    components[component] = summary.toJSON();
    for (const metric of ['lines', 'statements', 'functions', 'branches']) {
      const value = summary[metric];
      if (!Number.isFinite(manifest.thresholds[metric]) || manifest.thresholds[metric] < 85) errors.push(`invalid frozen threshold: ${metric}`);
      if (!value.total || !Number.isFinite(value.pct) || value.pct < Math.max(85, manifest.thresholds[metric])) errors.push(`critical metric below threshold or unmeasured: ${component}:${metric}=${value.pct}`);
    }
  }
  return { ticket: 'R05-010', status: errors.length ? 'FAIL' : 'PASS', measuredOnly: true, errors, components, metriclessReexports };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.cwd();
  const result = checkCriticalCoverage({ root, manifestPath: resolve(root, 'docs/engineering/critical-coverage-scope.json'), artifactsPath: resolve(root, 'artifacts/consolidacao-2026-09-05/coverage-scope'), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'PASS' ? 0 : 1;
}
