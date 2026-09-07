#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, lstatSync, openSync, closeSync, constants } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { ensureContainedDirectory, snapshotInputs, sha256, finalizeShard } from './run-critical-coverage-shard.mjs';
import { resolveContainedPath } from './lib/root-contained-path.mjs';
import { snapshotNativeInventory, validateNativeObservation } from './lib/native-test-inventory.mjs';
import { convertNativeScript } from './lib/native-v8-conversion.mjs';
import { validateRawCoverageEntry } from './lib/raw-coverage-validation.mjs';
import { withPrivatePostgres } from './lib/private-postgres.mjs';
import { preparePrivateApiDatabase } from './lib/private-api-database.mjs';
import { snapshotGeneratedArtifacts } from './lib/generated-artifact-snapshot.mjs';
const require = createRequire(import.meta.url);
const coverageRequire = createRequire(require.resolve('@vitest/coverage-v8/package.json'));
const { createCoverageMap } = coverageRequire('istanbul-lib-coverage');

export async function runNativeCriticalCoverage(root, shard) {
  if (process.platform !== 'linux') throw new Error('native coverage directory pinning currently requires Linux procfs');
  if (!['native-worker', 'native-api'].includes(shard)) throw new Error('Only native-worker and native-api are integrated; process shard remains required');
  const app = shard === 'native-api' ? 'api' : 'worker';
  if (app === 'api' && (!process.env.NATIVE_POSTGRES_BIN || !process.env.NATIVE_POSTGRES_SHARE)) throw new Error('native-api requires explicit private PostgreSQL tools');
  const manifestPath = resolveContainedPath(root, 'docs/engineering/critical-coverage-scope.json');
  if (!manifestPath.ok) throw new Error('invalid manifest path');
  const manifestBytes = readFileSync(manifestPath.realpath);
  const manifest = JSON.parse(manifestBytes);
  const expectedTests = manifest.nativeTests?.[shard];
  if (!expectedTests?.length) throw new Error('missing frozen native test inventory');
  const beforeInputs = snapshotInputs(root, manifest);
  const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const headBefore = head();
  const runId = randomUUID();
  const output = ensureContainedDirectory(root, resolve(root, 'artifacts/consolidacao-2026-09-05/coverage-scope', shard, runId)).realpath;
  const outputIdentity = lstatSync(output);
  const save = (name, data) => {
    const currentOutput = resolveContainedPath(root, output);
    const identity = currentOutput.ok ? lstatSync(currentOutput.realpath) : null;
    if (!currentOutput.ok || currentOutput.realpath !== output || !identity.isDirectory() || identity.dev !== outputIdentity.dev || identity.ino !== outputIdentity.ino) throw new Error('candidate output directory changed or escapes repository');
    writeFileSync(resolve(currentOutput.realpath, name), JSON.stringify(data, null, 2), { flag: 'wx' });
  };
  const readCurrentFile = (path) => {
    const current = resolveContainedPath(root, path);
    if (!current.ok || current.realpath !== current.absolute || !lstatSync(current.absolute).isFile()) throw new Error(`current artifact path invalid: ${path}`);
    return readFileSync(current.realpath);
  };
  const errors = [];
  const buildArgs = app === 'api' ? ['--filter', '@cvg-his-v2/api...', '--filter', '@cvg-his-v2/worker...', 'build'] : ['--filter', '@cvg-his-v2/worker...', 'build'];
  const build = spawnSync('pnpm', buildArgs, { cwd: root, encoding: 'utf8', timeout: 300000, maxBuffer: 20 * 1024 * 1024 });
  save('build-result.json', { exitCode: build.status, signal: build.signal, stdout: build.stdout, stderr: build.stderr });
  if (build.status !== 0 || build.signal) throw new Error(`native build failed; evidence: ${output}`);
  const generatedBefore = snapshotGeneratedArtifacts(root).pathHashes;
  const inventory = snapshotNativeInventory(root, app, expectedTests);
  save('invocation.json', { runId, shard, headBefore, beforeInputs, inventory, generatedBefore });
  if (JSON.stringify(beforeInputs) !== JSON.stringify(snapshotInputs(root, manifest))) throw new Error(`source inputs changed during build; evidence: ${output}`);
  const rawDirectory = ensureContainedDirectory(root, resolve(output, 'v8')).realpath;
  const rawIdentity = lstatSync(rawDirectory);
  const rawDescriptor = openSync(rawDirectory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  // All descendants address the parent's pinned directory, not a replaceable
  // pathname. The descriptor remains open until the native runner exits.
  const env = { ...process.env, NODE_V8_COVERAGE: `/proc/${process.pid}/fd/${rawDescriptor}` };
  delete env.NODE_TEST_CONTEXT;
  let child;
  try {
    const execute = (testEnv) => spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter', resolve(root, 'scripts/lib/native-test-evidence-reporter.mjs'), ...inventory.map((file) => file.executedFile)], { cwd: root, env: testEnv, encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 });
    if (app === 'api') {
      const privateRun = await withPrivatePostgres({
        binDir: process.env.NATIVE_POSTGRES_BIN, shareDir: process.env.NATIVE_POSTGRES_SHARE, libraryDir: process.env.NATIVE_POSTGRES_LIB,
        run: async (context) => {
          const prepared = await preparePrivateApiDatabase({ root, ...context });
          save('database-preparation.json', prepared.evidence);
          return execute({ ...prepared.environment, NODE_V8_COVERAGE: env.NODE_V8_COVERAGE });
        }
      });
      child = privateRun.value;
      save('database-lifecycle.json', privateRun.evidence);
    } else child = execute(env);
  } finally { closeSync(rawDescriptor); }
  const observation = JSON.parse(child.stdout || 'null');
  const validation = await validateNativeObservation(observation, inventory, { exitCode: child.status, signal: child.signal });
  errors.push(...validation.errors);
  const merged = createCoverageMap({});
  const expectedSources = new Set(manifest.files.filter((file) => file.applicability === 'javascript-metrics').map((file) => resolve(root, file.path)));
  const rawHashes = {};
  const currentRawDirectory = resolveContainedPath(root, rawDirectory);
  const currentRawIdentity = currentRawDirectory.ok ? lstatSync(currentRawDirectory.realpath) : null;
  if (!currentRawDirectory.ok || currentRawDirectory.realpath !== rawDirectory || currentRawIdentity.dev !== rawIdentity.dev || currentRawIdentity.ino !== rawIdentity.ino) throw new Error('raw output directory changed or escapes repository');
  for (const filename of readdirSync(currentRawDirectory.realpath)) {
    const path = resolveContainedPath(root, resolve(rawDirectory, filename));
    if (!path.ok || path.realpath !== path.absolute || !lstatSync(path.absolute).isFile()) throw new Error('invalid native raw report');
    const bytes = readFileSync(path.realpath);
    rawHashes[filename] = sha256(bytes);
    const report = JSON.parse(bytes);
    for (const coverage of report.result ?? []) {
      if (!coverage.url.startsWith('file:')) continue;
      const codePath = fileURLToPath(coverage.url);
      if (!Object.hasOwn(generatedBefore, codePath)) continue;
      const sourceMap = report['source-map-cache']?.[coverage.url]?.data;
      if (!sourceMap?.sources?.some((url) => url.startsWith('file:') && expectedSources.has(fileURLToPath(url)))) continue;
      const code = readCurrentFile(codePath).toString('utf8');
      if (sha256(code) !== generatedBefore[codePath]) throw new Error('generated code changed before conversion');
      const mapPath = `${codePath}.map`;
      const mapBytes = readCurrentFile(mapPath);
      if (sha256(mapBytes) !== generatedBefore[mapPath]) throw new Error('source map is not bound to generated snapshot');
      const diskMap = JSON.parse(mapBytes);
      diskMap.sources = diskMap.sources.map((source) => pathToFileURL(resolve(dirname(codePath), diskMap.sourceRoot ?? '', source)).href);
      diskMap.sourceRoot = '';
      if (JSON.stringify(diskMap) !== JSON.stringify(sourceMap)) throw new Error('cached map differs from executed artifact');
      const sources = {};
      for (const url of sourceMap.sources) {
        const original = resolveContainedPath(root, fileURLToPath(url));
        if (!original.ok) throw new Error('original source escapes repository');
        const source = readFileSync(original.realpath, 'utf8');
        if (sha256(source) !== beforeInputs[relative(root, original.absolute).replaceAll('\\', '/')]) throw new Error('original source not authenticated by frozen inputs');
        sources[url] = source;
      }
      const converted = await convertNativeScript({ coverage, code, sourceMap, sources });
      merged.merge(Object.fromEntries(Object.entries(converted).filter(([path]) => expectedSources.has(path))));
    }
  }
  for (const path of merged.files()) {
    const entry = merged.fileCoverageFor(path).data;
    errors.push(...validateRawCoverageEntry(entry, readCurrentFile(path).toString('utf8')));
  }
  if (!Object.keys(rawHashes).length || !merged.files().length) errors.push('native coverage collection is empty');
  if (JSON.stringify(generatedBefore) !== JSON.stringify(snapshotGeneratedArtifacts(root).pathHashes)) errors.push('generated artifacts changed during execution');
  if (JSON.stringify(inventory) !== JSON.stringify(snapshotNativeInventory(root, app, expectedTests))) errors.push('native test inventory changed during execution');
  save('native-observation.json', { observation, errors, rawHashes });
  save('coverage-final.json', merged.toJSON());
  save('test-result.json', { schemaVersion: 2, runId, shard, status: errors.length ? 'failed' : 'passed', errors, inventory });
  const metadata = finalizeShard({ root, manifestBytes, beforeInputs, afterInputs: snapshotInputs(root, manifest), headBefore, headAfter: head(), shard, runId, output, exitCode: child.status, signal: child.signal });
  save('shard.json', metadata);
  // Candidate only: top-level shard publication requires independent review.
  return { output, status: metadata.status, errors: metadata.errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await runNativeCriticalCoverage(process.cwd(), process.argv[2]);
  console.log(JSON.stringify(result));
  process.exitCode = result.status === 'passed' ? 0 : 1;
}
