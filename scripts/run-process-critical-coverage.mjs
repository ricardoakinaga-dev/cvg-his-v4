#!/usr/bin/env node
import {
  constants,
  openSync,
  closeSync,
  readSync,
  fstatSync,
  lstatSync,
  writeFileSync,
  readdirSync,
  realpathSync
} from 'node:fs';
import { resolve, basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import {
  snapshotInputs,
  ensureContainedDirectory,
  sha256,
  finalizeShard
} from './run-critical-coverage-shard.mjs';
import { resolveContainedPath } from './lib/root-contained-path.mjs';
import { snapshotGeneratedArtifacts } from './lib/generated-artifact-snapshot.mjs';
import { withPrivatePostgres } from './lib/private-postgres.mjs';
import { collectProcessCoverage } from './lib/process-coverage-collection.mjs';
import { readPinnedProcessRecords } from './lib/pinned-process-records.mjs';
import { resolvePrivateToolPaths } from './lib/private-tool-paths.mjs';
import { acquireCriticalProcessCoverage } from '../infra/scripts/critical-process-coverage.mjs';
import { runOwnedProcess } from '../infra/scripts/critical-process-suite-runtime.mjs';
import { validateTestReport } from '../infra/scripts/run-critical-process-suite.mjs';

const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
const version = (a, b) =>
  a.dev === b.dev &&
  a.ino === b.ino &&
  a.size === b.size &&
  a.mtimeNs === b.mtimeNs &&
  a.ctimeNs === b.ctimeNs;

export function readControllerInput(root, path, maxBytes = 64 * 1024 * 1024) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 64 * 1024 * 1024)
    throw new Error('invalid controller input budget');
  const location = resolveContainedPath(root, path);
  if (!location.ok || location.realpath !== location.absolute)
    throw new Error('controller input is not contained');
  const before = lstatSync(location.realpath, { bigint: true });
  if (!before.isFile() || before.size > BigInt(maxBytes))
    throw new Error('invalid or oversized controller input');
  const fd = openSync(
    location.realpath,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
  );
  try {
    const opened = fstatSync(fd, { bigint: true });
    if (!opened.isFile() || !version(before, opened))
      throw new Error('controller input changed before reading');
    const bytes = Buffer.alloc(Number(opened.size) + 1);
    let size = 0;
    while (size < bytes.length) {
      const read = readSync(fd, bytes, size, bytes.length - size, null);
      if (!read) break;
      size += read;
    }
    const after = resolveContainedPath(root, path);
    if (
      BigInt(size) !== opened.size ||
      !after.ok ||
      after.realpath !== location.realpath ||
      !version(opened, fstatSync(fd, { bigint: true })) ||
      !version(opened, lstatSync(location.realpath, { bigint: true }))
    )
      throw new Error('controller input changed while reading');
    return bytes.subarray(0, size);
  } finally {
    closeSync(fd);
  }
}

export function validateProcessInventory(manifest, actual) {
  const expected = manifest.processTests;
  if (
    !Array.isArray(expected) ||
    !expected.length ||
    new Set(expected).size !== expected.length ||
    expected.some(
      (path) =>
        typeof path !== 'string' ||
        !/^tests\/integration\/process\/[a-z0-9-]+\.test\.ts$/.test(path) ||
        !manifest.executionInputs?.includes(path)
    ) ||
    !isDeepStrictEqual(expected, actual)
  )
    throw new Error('process inventory differs from frozen manifest');
  return expected;
}

export async function runProcessCriticalCoverage(root, tools = {}) {
  if (process.platform !== 'linux') throw new Error('critical process coverage requires Linux');
  const toolPaths = resolvePrivateToolPaths(tools);
  root = resolve(root);
  if (realpathSync(root) !== root) throw new Error('canonical controller root required');
  const manifestBytes = readControllerInput(root, 'docs/engineering/critical-coverage-scope.json');
  const manifest = JSON.parse(manifestBytes);
  const assertManifest = () => {
    if (
      !manifestBytes.equals(
        readControllerInput(root, 'docs/engineering/critical-coverage-scope.json')
      )
    )
      throw new Error('coverage manifest changed during execution');
  };
  const beforeInputs = snapshotInputs(root, manifest);
  const head = () =>
    execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const headBefore = head();
  const suite = 'infra/scripts/run-critical-process-suite.mjs';
  const actual = execFileSync(process.execPath, [suite, '--list'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000
  })
    .trim()
    .split('\n');
  const inventory = validateProcessInventory(manifest, actual);
  const files = {},
    terminalHashes = {};
  let originalBytes = 0;
  for (const [path, digest] of Object.entries(beforeInputs)) {
    if (!/^(apps|packages)\//.test(path)) continue;
    const bytes = readControllerInput(root, path);
    originalBytes += bytes.length;
    if (originalBytes > 128 * 1024 * 1024)
      throw new Error('original input retention budget exceeded');
    if (sha256(bytes) !== digest) throw new Error('original input changed before execution');
    const url = pathToFileURL(resolve(root, path)).href;
    files[url] = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    terminalHashes[url] = digest;
  }
  const runId = randomUUID(),
    shard = 'critical-process';
  const output = ensureContainedDirectory(
    root,
    resolve(root, 'artifacts/consolidacao-2026-09-05/coverage-scope', shard, runId)
  ).realpath;
  const outputFd = openSync(output, directoryFlags);
  let outputIdentity, rawFd, capture;
  const abort = new AbortController();
  const onSignal = (signal) => abort.abort(signal);
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) =>
        typeof value === 'string' &&
        ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR', 'PNPM_HOME', 'COREPACK_HOME'].includes(key)
    )
  );
  const assertOutput = () => {
    const current = resolveContainedPath(root, output);
    if (!current.ok || current.realpath !== output)
      throw new Error('candidate output path changed');
    const identity = lstatSync(output);
    if (
      !identity.isDirectory() ||
      identity.dev !== outputIdentity.dev ||
      identity.ino !== outputIdentity.ino
    )
      throw new Error('candidate output directory changed');
  };
  const save = (name, data) => {
    assertOutput();
    writeFileSync(`/proc/self/fd/${outputFd}/${name}`, JSON.stringify(data, null, 2), {
      flag: 'wx',
      mode: 0o600
    });
  };
  try {
    outputIdentity = fstatSync(outputFd);
    console.error(`[critical-process-coverage] build; candidate=${output}`);
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
    const controllerArtifacts = ensureContainedDirectory(
      root,
      resolve(output, 'controller')
    ).realpath;
    const build = await runOwnedProcess({
      command: 'pnpm',
      args: ['--filter', '@cvg-his-v2/api...', '--filter', '@cvg-his-v2/worker...', 'build'],
      cwd: root,
      env: { ...inherited, NODE_ENV: 'test', DOTENV_CONFIG_PATH: '/dev/null' },
      timeoutMs: 300000,
      artifactDirectory: controllerArtifacts,
      label: 'critical process build',
      abortSignal: abort.signal
    });
    save('build-result.json', build);
    if (
      build.kind !== 'success' ||
      build.status !== 0 ||
      build.signal ||
      build.cleanupComplete !== true ||
      abort.signal.aborted
    )
      throw new Error('critical process build failed');
    const generated = snapshotGeneratedArtifacts(root);
    for (const [url, code] of Object.entries(generated.files)) {
      if (Object.hasOwn(files, url) && files[url] !== code)
        throw new Error('generated artifact replaced terminal original');
      files[url] = code;
    }
    const frozenHashes = { ...generated.frozenHashes, ...terminalHashes };
    assertManifest();
    if (!isDeepStrictEqual(beforeInputs, snapshotInputs(root, manifest)))
      throw new Error('inputs changed during build');
    save('invocation.json', {
      runId,
      shard,
      headBefore,
      beforeInputs,
      generatedBefore: generated.pathHashes,
      inventory,
      toolPaths,
      originalBytes
    });
    const rawDirectory = ensureContainedDirectory(root, resolve(output, 'v8')).realpath;
    rawFd = openSync(rawDirectory, directoryFlags);
    const rawIdentity = fstatSync(rawFd);
    capture = acquireCriticalProcessCoverage({
      NODE_ENV: 'test',
      CVG_CRITICAL_PROCESS_COVERAGE: '1',
      NODE_V8_COVERAGE: `/proc/${process.pid}/fd/${rawFd}`
    });
    const suiteArtifacts = ensureContainedDirectory(
      root,
      resolve(output, 'suite-artifacts')
    ).realpath;
    const privateRun = await withPrivatePostgres({
      binDir: toolPaths.postgresBin,
      shareDir: toolPaths.postgresShare,
      libraryDir: toolPaths.postgresLib,
      run: async (context) => {
        console.error(
          `[critical-process-coverage] running ${inventory.length} suites; private database=${context.directory}`
        );
        return runOwnedProcess({
          command: process.execPath,
          args: [suite],
          cwd: root,
          timeoutMs: 900000,
          artifactDirectory: controllerArtifacts,
          label: 'critical-process coverage controller',
          abortSignal: abort.signal,
          env: {
            ...inherited,
            ...context.environment,
            ...capture.environment,
            CVG_CRITICAL_PROCESS_RUNNER: '1',
            CRITICAL_PROCESS_ARTIFACT_DIR: suiteArtifacts,
            REDIS_SERVER_BIN: toolPaths.redisServer,
            REDIS_CLI_BIN: toolPaths.redisCli,
            ...(toolPaths.redisLib ? { REDIS_SERVER_LIBRARY_PATH: toolPaths.redisLib } : {})
          },
          onChildSpawn: (child) => save('child.json', { pid: child.pid })
        });
      }
    });
    save('database-lifecycle.json', privateRun.evidence);
    const child = privateRun.value;
    save('suite-outcome.json', child);
    if (
      child.kind !== 'success' ||
      child.status !== 0 ||
      child.signal ||
      child.cleanupComplete !== true ||
      abort.signal.aborted
    )
      throw new Error('critical process suite did not terminate successfully');
    capture.close();
    capture = null;
    assertManifest();
    assertOutput();
    const currentRaw = lstatSync(rawDirectory);
    if (
      currentRaw.dev !== rawIdentity.dev ||
      currentRaw.ino !== rawIdentity.ino ||
      currentRaw.isSymbolicLink()
    )
      throw new Error('raw directory changed');
    if (
      !isDeepStrictEqual(beforeInputs, snapshotInputs(root, manifest)) ||
      headBefore !== head() ||
      !isDeepStrictEqual(generated.pathHashes, snapshotGeneratedArtifacts(root).pathHashes)
    )
      throw new Error('candidate changed during process execution');
    const directories = readdirSync(suiteArtifacts);
    if (directories.length !== inventory.length)
      throw new Error('incomplete or unexpected suite artifact inventory');
    const reports = [];
    for (const test of inventory) {
      const prefix = basename(test, '.test.ts').replaceAll('-', '_') + '-';
      const matches = directories.filter((name) => name.startsWith(prefix));
      if (matches.length !== 1) throw new Error('missing or duplicate successful suite report');
      const directory = join(suiteArtifacts, matches[0]);
      const location = resolveContainedPath(root, directory);
      if (!location.ok || location.realpath !== directory || !lstatSync(directory).isDirectory())
        throw new Error('invalid suite artifact directory');
      const text = validateTestReport(join(directory, 'success-report.json'), test, directory);
      reports.push({ test, sha256: sha256(text), passed: JSON.parse(text).numPassedTests });
    }
    save('suite-report-verification.json', { reports });
    console.error(
      `[critical-process-coverage] ${reports.length} suite reports verified; collecting V8`
    );
    const collected = await collectProcessCoverage({
      root,
      files,
      frozenHashes,
      terminalHashes,
      observations: readPinnedProcessRecords(rawFd, 'observations'),
      reports: readPinnedProcessRecords(rawFd, 'reports')
    });
    if (abort.signal.aborted) throw new Error('critical process controller interrupted');
    const expected = new Set(
      manifest.files
        .filter((file) => file.applicability === 'javascript-metrics')
        .map((file) => resolve(root, file.path))
    );
    const coverage = Object.fromEntries(
      Object.entries(collected.coverage).filter(([path]) => expected.has(path))
    );
    if (!Object.keys(coverage).length) throw new Error('no critical original coverage collected');
    if (!isDeepStrictEqual(generated.pathHashes, snapshotGeneratedArtifacts(root).pathHashes))
      throw new Error('generated artifacts changed during conversion');
    save('collection-verification.json', {
      convertedScripts: collected.convertedScripts,
      rawHashes: collected.rawHashes
    });
    save('coverage-final.json', coverage);
    save('test-result.json', {
      schemaVersion: 2,
      runId,
      shard,
      status: 'passed',
      inventory,
      reports
    });
    assertManifest();
    const metadata = finalizeShard({
      root,
      manifestBytes,
      beforeInputs,
      afterInputs: snapshotInputs(root, manifest),
      headBefore,
      headAfter: head(),
      shard,
      runId,
      output,
      exitCode: child.status,
      signal: child.signal
    });
    save('shard.json', metadata);
    return { output, status: metadata.status, errors: metadata.errors };
  } catch (error) {
    if (outputIdentity) {
      try {
        save('controller-failure.json', { message: error.message });
      } catch {
        /* Never write through an output path whose ownership changed. */
      }
    }
    throw new Error(`critical process controller failed; evidence: ${output}`, { cause: error });
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    try {
      capture?.close();
    } finally {
      try {
        if (rawFd !== undefined) closeSync(rawFd);
      } finally {
        closeSync(outputFd);
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await runProcessCriticalCoverage(process.cwd(), {
    postgresBin: process.env.NATIVE_POSTGRES_BIN,
    postgresShare: process.env.NATIVE_POSTGRES_SHARE,
    postgresLib: process.env.NATIVE_POSTGRES_LIB,
    redisServer: process.env.REDIS_SERVER_BIN,
    redisCli: process.env.REDIS_CLI_BIN,
    redisLib: process.env.REDIS_SERVER_LIBRARY_PATH
  });
  console.log(JSON.stringify(result));
  process.exitCode = result.status === 'passed' ? 0 : 1;
}
