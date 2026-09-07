#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, lstatSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, relative, sep, join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validateRawCoverageEntry } from './lib/raw-coverage-validation.mjs';
import { resolveContainedPath } from './lib/root-contained-path.mjs';
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function snapshotInputs(root, manifest) {
  if (!manifest.executionInputs?.length) throw new Error('Missing frozen execution inputs');
  return Object.fromEntries(manifest.executionInputs.map((path) => {
    const inputPath = resolveContainedPath(root, path);
    if (!inputPath.ok) throw new Error(`execution input ${path}: ${inputPath.reason}`);
    return [path, sha256(readFileSync(inputPath.realpath))];
  }));
}

const artifactError = (label, path, reason) => new Error(`${label} ${path}: ${reason}`);

export function ensureContainedDirectory(root, directory) {
  const existing = resolveContainedPath(root, directory, { allowRoot: true });
  if (existing.ok) return existing;
  if (existing.reason !== 'path does not exist') throw artifactError('artifact directory', directory, existing.reason);

  const rootPath = resolve(root);
  const directoryPath = resolve(directory);
  const relativePath = relative(rootPath, directoryPath);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${sep}`)) throw artifactError('artifact directory', directory, 'path escapes root');
  let current = rootPath;
  for (const part of relativePath.split(sep)) {
    current = join(current, part);
    try {
      const entry = lstatSync(current);
      if (entry.isSymbolicLink()) throw artifactError('artifact directory', current, 'path escapes root via symlink');
      if (!entry.isDirectory()) throw artifactError('artifact directory', current, 'path is not a directory');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      mkdirSync(current);
    }
  }
  const verified = resolveContainedPath(root, directory, { allowRoot: true });
  if (!verified.ok) throw artifactError('artifact directory', directory, verified.reason);
  return verified;
}

function existingContainedArtifact(root, name, label) {
  const candidate = resolve(root, name);
  let entry;
  try {
    entry = lstatSync(candidate);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  const resolved = resolveContainedPath(root, name);
  if (!resolved.ok) throw artifactError(label, name, resolved.reason);
  if (!entry.isFile()) throw artifactError(label, name, 'path is not a regular file');
  return resolved;
}

function writableContainedArtifact(root, name, label) {
  const resolved = resolveContainedPath(root, name);
  if (resolved.ok) return resolved;
  if (resolved.reason !== 'path does not exist') throw artifactError(label, name, resolved.reason);
  try {
    const entry = lstatSync(resolved.absolute);
    if (entry.isSymbolicLink()) throw artifactError(label, name, 'path escapes root via symlink');
    throw artifactError(label, name, resolved.reason);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { ...resolved, ok: true, realpath: resolved.absolute };
  }
}

const expectedCoveragePaths = (root, manifest, errors) => {
  const expected = new Set();
  if (!Array.isArray(manifest?.files)) {
    errors.push('invalid manifest schema: files');
    return expected;
  }
  for (const file of manifest.files) {
    if (file?.applicability !== 'javascript-metrics') continue;
    const sourcePath = resolveContainedPath(root, file.path);
    if (!sourcePath.ok) {
      errors.push(`manifest source path escapes root: ${file.path}`);
      continue;
    }
    if (expected.has(sourcePath.path)) errors.push(`duplicate manifest source path: ${sourcePath.path}`);
    expected.add(sourcePath.path);
  }
  return expected;
};

export function finalizeShard({ root, manifestBytes, beforeInputs, afterInputs, headBefore, headAfter, shard, runId, output, exitCode, signal }) {
  const errors = [];
  let manifest;
  try {
    manifest = JSON.parse(Buffer.from(manifestBytes).toString('utf8'));
  } catch (error) {
    manifest = {};
    errors.push(`invalid manifest JSON: ${error.message}`);
  }
  const manifestFiles = Array.isArray(manifest?.files) ? manifest.files : [];
  const expectedSources = expectedCoveragePaths(root, manifest, errors);
  const outputPath = resolveContainedPath(root, output, { allowRoot: true });
  const resultPath = outputPath.ok ? resolveContainedPath(outputPath.absolute, 'test-result.json') : outputPath;
  const coveragePath = outputPath.ok ? resolveContainedPath(outputPath.absolute, 'coverage-final.json') : outputPath;
  if (JSON.stringify(beforeInputs) !== JSON.stringify(afterInputs) || headBefore !== headAfter) errors.push('executed candidate changed during run');
  if (exitCode !== 0 || signal) errors.push('runner did not exit successfully');
  let resultBytes = null;
  if (resultPath.ok) {
    try {
      resultBytes = readFileSync(resultPath.realpath);
    } catch (error) {
      errors.push(`test result unreadable: ${error.message}`);
    }
  } else {
    errors.push(`test result path invalid: ${resultPath.reason}`);
  }
  let result = null;
  if (resultBytes) {
    try {
      result = JSON.parse(resultBytes.toString('utf8'));
    } catch (error) {
      errors.push(`invalid test result JSON: ${error.message}`);
    }
  }
  if (!result || result.runId !== runId || result.shard !== shard || result.status !== 'passed') errors.push('test result incomplete or missing');
  let coverageBytes = null;
  if (coveragePath.ok) {
    try {
      coverageBytes = readFileSync(coveragePath.realpath);
    } catch (error) {
      errors.push(`coverage output unreadable: ${error.message}`);
    }
  } else {
    errors.push(`coverage output path invalid: ${coveragePath.reason}`);
  }
  if (!coverageBytes) errors.push('coverage output missing after runner exit');
  if (coverageBytes) {
    try {
      const raw = JSON.parse(coverageBytes.toString('utf8'));
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        errors.push('invalid coverage report schema: expected object');
      } else if (!Object.keys(raw).length) {
        errors.push('invalid coverage report schema: empty report');
      } else {
        const seenSources = new Set();
        for (const [path, entry] of Object.entries(raw)) {
          const sourcePath = resolveContainedPath(root, path);
          if (!sourcePath.ok) {
            errors.push(`${sourcePath.reason.includes('escapes root') ? 'raw coverage path escapes root' : 'raw coverage source unavailable'}: ${shard}:${path}`);
            continue;
          }
          const key = sourcePath.path;
          if (!expectedSources.has(key)) {
            errors.push(`unexpected raw coverage source: ${shard}:${key}`);
            continue;
          }
          if (seenSources.has(key)) {
            errors.push(`duplicate raw coverage source: ${shard}:${key}`);
            continue;
          }
          seenSources.add(key);
          let source;
          try {
            source = readFileSync(sourcePath.realpath, 'utf8');
          } catch (error) {
            errors.push(`raw coverage source unreadable: ${shard}:${key}: ${error.message}`);
            continue;
          }
          const rawErrors = validateRawCoverageEntry(entry, source);
          if (typeof entry?.path !== 'string') rawErrors.push('coverage path/key mismatch');
          else {
            const entryPath = resolveContainedPath(root, entry.path);
            if (!entryPath.ok) rawErrors.push(entryPath.reason.includes('escapes root') ? 'coverage source path escapes root' : 'coverage source path unavailable');
            else if (entryPath.path !== key) rawErrors.push('coverage path/key mismatch');
          }
          if (rawErrors.length) errors.push(...rawErrors.map((error) => `malformed raw coverage ${shard}:${key}: ${error}`));
        }
      }
    } catch (error) {
      errors.push(`invalid coverage JSON: ${error.message}`);
    }
  }
  return { schemaVersion: 2, finalizedAfterExit: true, runId, shard, status: errors.length ? 'failed' : 'passed', errors, exitCode, signal,
    head: headBefore, manifestSha256: sha256(manifestBytes), executionInputHashes: beforeInputs,
    sourceHashes: Object.fromEntries(manifestFiles.filter((f) => f?.applicability === 'javascript-metrics').map((f) => [f.path, beforeInputs[f.path]])),
    coverageFile: `${runId}/coverage-final.json`, coverageSha256: coverageBytes ? sha256(coverageBytes) : null,
    testResultFile: `${runId}/test-result.json`, testResultSha256: resultBytes ? sha256(resultBytes) : null,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.cwd();
  const shard = process.argv[2];
  if (!['vitest-unit', 'vitest-integration'].includes(shard)) throw new Error('Usage: node scripts/run-critical-coverage-shard.mjs vitest-unit|vitest-integration [test filters]');
  const manifestBytes = readFileSync(resolve(root, 'docs/engineering/critical-coverage-scope.json'));
  const manifest = JSON.parse(manifestBytes);
  const beforeInputs = snapshotInputs(root, manifest);
  const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const headBefore = head();
  const runId = randomUUID();
  const parentPath = ensureContainedDirectory(root, resolve(root, 'artifacts/consolidacao-2026-09-05/coverage-scope', shard));
  const parent = parentPath.realpath;
  const outputPath = ensureContainedDirectory(root, resolve(parent, runId));
  const output = outputPath.realpath;
  const command = ['exec', 'vitest', 'run', '--config', 'vitest.critical-coverage.config.ts', ...process.argv.slice(3)];
  const invocationPath = writableContainedArtifact(output, 'invocation.json', 'invocation artifact');
  writeFileSync(invocationPath.realpath, JSON.stringify({ command: ['pnpm', ...command], head: headBefore, beforeInputs }, null, 2));
  const child = spawnSync('pnpm', command, { cwd: root, stdio: 'inherit', env: { ...process.env, CRITICAL_COVERAGE_SHARD: shard, CRITICAL_COVERAGE_RUN_ID: runId } });
  const metadata = finalizeShard({ root, manifestBytes, beforeInputs, afterInputs: snapshotInputs(root, manifest), headBefore, headAfter: head(), shard, runId, output, exitCode: child.status, signal: child.signal });
  const previousShard = existingContainedArtifact(parent, 'shard.json', 'previous shard');
  if (previousShard) {
    const previousCopy = writableContainedArtifact(output, 'previous-shard.json', 'previous shard copy');
    writeFileSync(previousCopy.realpath, readFileSync(previousShard.realpath));
  }
  const shardPublication = writableContainedArtifact(parent, 'shard.json', 'shard publication');
  writeFileSync(shardPublication.realpath, JSON.stringify(metadata, null, 2));
  console.log(JSON.stringify({ shard, runId, status: metadata.status, errors: metadata.errors }));
  process.exitCode = metadata.status === 'passed' ? 0 : 1;
}
