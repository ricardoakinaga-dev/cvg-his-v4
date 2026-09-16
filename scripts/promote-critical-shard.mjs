#!/usr/bin/env node
/**
 * Promote a verified candidate shard to the published top-level slot.
 *
 * The coverage runners only ever write candidates inside
 * `artifacts/consolidacao-2026-09-05/coverage-scope/<shard>/<runId>/` (except
 * the Vitest runner, which also publishes directly). The critical checker reads
 * the top-level `shard.json`. Promotion is an explicit integration act: it
 * re-verifies the candidate against the current manifest, HEAD and every
 * execution input before copying anything, and it preserves the previous
 * publication for history.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveContainedPath } from './lib/root-contained-path.mjs';
import { resolveEvidenceHeadCompatibility } from './lib/candidate-binding.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function resolveNonSymbolicContainedPath(parent, candidate) {
  const resolved = resolveContainedPath(parent, candidate);
  if (!resolved.ok) return resolved;

  let current = resolve(parent);
  const relativePath = relative(current, resolved.absolute);
  for (const part of relativePath.split(sep)) {
    if (!part) continue;
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        return { ...resolved, ok: false, reason: 'path contains symlink' };
      }
    } catch (error) {
      return { ...resolved, ok: false, reason: `path cannot be inspected: ${error.message}` };
    }
  }
  return resolved;
}

function resolveNonSymbolicContainedFile(parent, candidate) {
  const resolved = resolveNonSymbolicContainedPath(parent, candidate);
  if (!resolved.ok) return resolved;
  try {
    if (!lstatSync(resolved.absolute).isFile()) {
      return { ...resolved, ok: false, reason: 'path is not a regular file' };
    }
  } catch (error) {
    return { ...resolved, ok: false, reason: `path cannot be inspected: ${error.message}` };
  }
  return resolved;
}

export function verifyCandidate({
  root,
  shard,
  runId,
  manifestBytes,
  head,
  readInput,
}) {
  const errors = [];
  const shardRoot = resolveNonSymbolicContainedPath(root, `artifacts/consolidacao-2026-09-05/coverage-scope/${shard}`);
  if (!shardRoot.ok) return [`invalid shard directory: ${shardRoot.reason}`];
  const runPath = resolveNonSymbolicContainedPath(shardRoot.absolute, runId);
  if (!runPath.ok) return [`invalid candidate directory: ${runPath.reason}`];
  const shardPath = resolveNonSymbolicContainedFile(runPath.absolute, 'shard.json');
  if (!shardPath.ok) return [`missing candidate shard.json: ${shardPath.reason}`];
  let metadata;
  try {
    metadata = JSON.parse(readFileSync(shardPath.realpath, 'utf8'));
  } catch (error) {
    return [`invalid candidate shard.json: ${error.message}`];
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return ['invalid candidate shard.json: metadata must be an object'];
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch (error) {
    return [`invalid manifest JSON: ${error.message}`];
  }
  const candidateBinding = resolveEvidenceHeadCompatibility({
    root,
    collectionHead: manifest.head,
    evidenceHead: metadata.head,
    candidateHead: head,
  });
  if (
    metadata.schemaVersion !== 2 ||
    metadata.finalizedAfterExit !== true ||
    metadata.exitCode !== 0 ||
    metadata.signal ||
    metadata.status !== 'passed' ||
    (Array.isArray(metadata.errors) && metadata.errors.length) ||
    metadata.runId !== runId ||
    metadata.shard !== shard
  )
    errors.push('candidate is not a finalized passing shard');
  if (candidateBinding.status === 'INVALID')
    errors.push(`candidate HEAD differs from the current candidate: ${candidateBinding.reason}`);
  if (metadata.manifestSha256 !== sha256(manifestBytes))
    errors.push('candidate was bound to a different manifest revision');
  let inputs;
  try {
    inputs = metadata.executionInputHashes ?? {};
    if (JSON.stringify(Object.keys(inputs).sort()) !== JSON.stringify([...manifest.executionInputs].sort()))
      errors.push('candidate execution inputs differ from the frozen manifest inputs');
    for (const path of manifest.executionInputs) {
      const bytes = readInput(path);
      if (bytes === null) {
        errors.push(`execution input unavailable: ${path}`);
        continue;
      }
      if (inputs[path] !== sha256(bytes)) errors.push(`execution input hash mismatch: ${path}`);
    }
  } catch (error) {
    errors.push(`execution input verification failed: ${error.message}`);
  }
  const resultPath = resolveNonSymbolicContainedFile(runPath.absolute, 'test-result.json');
  const coveragePath = resolveNonSymbolicContainedFile(runPath.absolute, 'coverage-final.json');
  if (!resultPath.ok) errors.push(`missing test result: ${resultPath.reason}`);
  if (!coveragePath.ok) errors.push(`missing coverage output: ${coveragePath.reason}`);

  const referencedArtifacts = [
    {
      field: 'coverageFile',
      digestField: 'coverageSha256',
      canonicalPath: coveragePath,
      label: 'coverage',
    },
    {
      field: 'testResultFile',
      digestField: 'testResultSha256',
      canonicalPath: resultPath,
      label: 'test result',
    },
  ];
  for (const artifact of referencedArtifacts) {
    const reference = resolveNonSymbolicContainedFile(
      shardRoot.absolute,
      metadata[artifact.field] ?? 'missing'
    );
    if (!reference.ok) {
      errors.push(`invalid ${artifact.field} reference: ${reference.reason}`);
      continue;
    }
    if (
      !artifact.canonicalPath.ok ||
      reference.absolute !== artifact.canonicalPath.absolute ||
      reference.realpath !== artifact.canonicalPath.realpath
    ) {
      errors.push(`invalid ${artifact.field} reference: does not point to the canonical ${artifact.label} file`);
      continue;
    }

    let bytes;
    try {
      // The reference and the candidate's canonical path are the same regular
      // non-symbolic path. Read that source once and use this buffer for every
      // digest and JSON validation below.
      bytes = readFileSync(reference.realpath);
    } catch (error) {
      errors.push(`unreadable ${artifact.label} output: ${error.message}`);
      continue;
    }
    if (metadata[artifact.digestField] !== sha256(bytes))
      errors.push(`${artifact.label} digest mismatch`);
    try {
      const parsed = JSON.parse(bytes.toString('utf8'));
      if (
        artifact.field === 'testResultFile' &&
        (parsed.runId !== runId || parsed.shard !== shard || parsed.status !== 'passed')
      ) {
        errors.push('test result identity or status mismatch');
      }
    } catch (error) {
      errors.push(`invalid ${artifact.label} JSON: ${error.message}`);
    }
  }
  return errors;
}

function parseArgs(argv) {
  const args = { shard: null, runId: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--shard') args.shard = argv[++index] ?? null;
    else if (argv[index] === '--run-id') args.runId = argv[++index] ?? null;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return args;
}

function newestPassingCandidate(root, shard) {
  const directory = join(root, 'artifacts/consolidacao-2026-09-05/coverage-scope', shard);
  if (!existsSync(directory)) throw new Error(`shard directory does not exist: ${shard}`);
  const candidates = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const shardPath = join(directory, entry.name, 'shard.json');
    if (!existsSync(shardPath)) continue;
    try {
      const metadata = JSON.parse(readFileSync(shardPath, 'utf8'));
      if (metadata.status === 'passed')
        candidates.push({ runId: entry.name, stamp: lstatSync(shardPath).mtimeMs });
    } catch {
      // ignore malformed candidates
    }
  }
  candidates.sort((a, b) => b.stamp - a.stamp || a.runId.localeCompare(b.runId));
  if (!candidates.length) throw new Error(`no passing candidate found for ${shard}`);
  return candidates[0].runId;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.shard) throw new Error('--shard is required');
  const manifestPath = resolve(root, 'docs/engineering/critical-coverage-scope.json');
  const manifestBytes = readFileSync(manifestPath);
  const runId =
    args.runId ??
    newestPassingCandidate(root, args.shard);
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const errors = verifyCandidate({
    root,
    shard: args.shard,
    runId,
    manifestBytes,
    head,
    readInput(path) {
      const resolved = resolveContainedPath(root, path);
      return resolved.ok ? readFileSync(resolved.realpath) : null;
    },
  });
  if (errors.length) {
    process.exitCode = 1;
    console.log(JSON.stringify({ status: 'FAIL', shard: args.shard, runId, errors }, null, 2));
    return;
  }
  const shardDirectory = resolve(root, 'artifacts/consolidacao-2026-09-05/coverage-scope', args.shard);
  const publicationPath = join(shardDirectory, 'shard.json');
  if (existsSync(publicationPath)) {
    const previous = readFileSync(publicationPath);
    const previousName = `previous-shard-${sha256(previous).slice(0, 12)}.json`;
    writeFileSync(join(shardDirectory, previousName), previous);
  }
  const candidateBytes = readFileSync(join(shardDirectory, runId, 'shard.json'));
  mkdirSync(shardDirectory, { recursive: true });
  writeFileSync(publicationPath, candidateBytes);
  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        shard: args.shard,
        runId,
        published: relative(root, publicationPath).split('\\').join('/'),
        manifestSha256: sha256(manifestBytes),
        head,
      },
      null,
      2
    )
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(`critical shard promotion failed: ${error.stack ?? error.message}`);
    process.exitCode = 1;
  }
}
