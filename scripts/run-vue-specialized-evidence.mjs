#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  checkVueSpecializedEvidence,
  defaultVueSpecializedPaths,
  loadVueSpecializedScope,
  sha256,
  sourceSetDigest
} from './lib/vue-specialized-evidence.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paths = defaultVueSpecializedPaths(root);
const pendingArtifactRoot = resolve(paths.artifactsPath, 'vue-specialized');

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const args = { sources: [], all: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--source') {
      const source = argv[++index];
      if (!source) fail('--source requires a manifest Vue path');
      args.sources.push(source);
    } else if (argument === '--all') {
      args.all = true;
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }
  if ((args.all && args.sources.length > 0) || (!args.all && args.sources.length === 0))
    fail('choose exactly one of --all or one or more --source arguments');
  return args;
}

function currentHead() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}

function ensureDirectory(directory) {
  mkdirSync(directory, { recursive: true });
  const stats = lstatSync(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink())
    fail(`invalid evidence directory: ${directory}`);
}

function readLines(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function spawnChecked(command, argumentsList, environment, label, { inherit = true } = {}) {
  const child = spawnSync(command, argumentsList, {
    cwd: root,
    env: environment,
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'inherit']
  });
  if (child.error) fail(`${label} could not start: ${child.error.message}`);
  if (child.status !== 0 || child.signal)
    fail(`${label} failed (status=${child.status}, signal=${child.signal || 'none'})`);
  return child;
}

function fileHash(path) {
  return sha256(readFileSync(path));
}

function snapshotBuildEvidence(candidate) {
  const buildEvidenceSource = resolve(root, 'apps/spa/dist/vue-specialized-build-evidence.json');
  if (!existsSync(buildEvidenceSource))
    fail('SPA build did not emit vue-specialized-build-evidence.json');
  copyFileSync(buildEvidenceSource, join(candidate, 'build-evidence.json'));
}

function validateSelectedSources(scope, args) {
  const known = new Map(scope.sources.map((source) => [source.path, source]));
  const selectedPaths = args.all ? [...known.keys()] : [...new Set(args.sources)];
  if (!selectedPaths.length) fail('no Vue sources selected');
  for (const path of selectedPaths)
    if (!known.has(path)) fail(`source is not pending in the manifest: ${path}`);
  return selectedPaths.map((path) => known.get(path));
}

function buildEvidenceRecord({
  runId,
  head,
  manifestBytes,
  contractBytes,
  scope,
  selected,
  candidate
}) {
  if (!existsSync(join(candidate, 'build-evidence.json')))
    fail('specialized SPA build evidence snapshot is missing');

  const vitestEventPath = join(candidate, 'vitest-events.jsonl');
  const vitestEvents = readLines(vitestEventPath);
  writeFileSync(
    join(candidate, 'vitest-evidence.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        kind: 'vue-specialized-vitest-evidence',
        runId,
        events: vitestEvents
      },
      null,
      2
    )}\n`
  );

  const browserEvidencePath = join(candidate, 'browser-evidence.json');
  if (!existsSync(browserEvidencePath))
    fail('browser evidence test did not emit browser-evidence.json');

  const buildEvidence = JSON.parse(readFileSync(join(candidate, 'build-evidence.json'), 'utf8'));
  const vitestEvidence = JSON.parse(readFileSync(join(candidate, 'vitest-evidence.json'), 'utf8'));
  const browserEvidence = JSON.parse(readFileSync(browserEvidencePath, 'utf8'));
  const selectedPaths = new Set(selected.map((source) => source.path));
  const sourceRecords = selected.map((source) => ({
    path: source.path,
    sourceSha256: source.sha256,
    build: buildEvidence.sources?.[source.path] ?? null,
    vitest: {
      events: (vitestEvidence.events ?? []).filter(
        (event) => selectedPaths.has(event.sourcePath) && event.sourcePath === source.path
      )
    },
    browser: {
      events: (browserEvidence.events ?? []).filter((event) => event.sourcePath === source.path)
    }
  }));
  const complete = selected.length === scope.sources.length;
  const evidence = {
    schemaVersion: 1,
    kind: 'vue-specialized-evidence',
    status: complete ? 'passed' : 'partial',
    runId,
    head,
    manifestSha256: sha256(manifestBytes),
    contractSha256: sha256(contractBytes),
    sourceSetSha256: sourceSetDigest(scope.sources),
    scope: {
      complete,
      requestedPaths: selected.map((source) => source.path)
    },
    build: {
      file: `${runId}/build-evidence.json`,
      sha256: fileHash(join(candidate, 'build-evidence.json'))
    },
    vitest: {
      file: `${runId}/vitest-evidence.json`,
      sha256: fileHash(join(candidate, 'vitest-evidence.json')),
      resultFile: `${runId}/vitest-result.json`,
      resultSha256: fileHash(join(candidate, 'vitest-result.json'))
    },
    browser: {
      file: `${runId}/browser-evidence.json`,
      sha256: fileHash(browserEvidencePath),
      resultFile: `${runId}/playwright-result.json`,
      resultSha256: fileHash(join(candidate, 'playwright-result.json'))
    },
    sources: sourceRecords
  };
  writeFileSync(join(candidate, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

function publishCompleteEvidence(evidence, candidate, publication) {
  if (evidence.status !== 'passed') return false;
  if (existsSync(publication)) {
    const previous = readFileSync(publication);
    writeFileSync(
      join(dirname(publication), `previous-evidence-${sha256(previous).slice(0, 12)}.json`),
      previous
    );
  }
  writeFileSync(publication, readFileSync(join(candidate, 'evidence.json')));
  return true;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestBytes = readFileSync(paths.manifestPath);
  const contractBytes = readFileSync(paths.contractPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const contract = JSON.parse(contractBytes.toString('utf8'));
  const scope = loadVueSpecializedScope({ root, manifest, contract });
  if (scope.errors.length) fail(scope.errors.join('; '));
  const selected = validateSelectedSources(scope, args);
  const runId = randomUUID();
  const head = currentHead();
  ensureDirectory(pendingArtifactRoot);
  const candidate = resolve(pendingArtifactRoot, runId);
  ensureDirectory(candidate);
  const beforeHashes = Object.fromEntries(
    scope.sources.map((source) => [source.path, fileHash(source.absolute)])
  );

  const commonEnvironment = {
    ...process.env,
    CVG_REPO_ROOT: root,
    CVG_VUE_SPECIALIZED_BUILD: '1',
    CVG_VUE_SPECIALIZED_HEAD: head,
    CVG_VUE_SPECIALIZED_RUN_ID: runId
  };
  spawnChecked(
    'pnpm',
    ['--filter', '@cvg-his-v2/spa', 'run', 'build'],
    commonEnvironment,
    'specialized SPA build'
  );
  snapshotBuildEvidence(candidate);

  const selectedPaths = selected.map((source) => source.path).join(',');
  const vitestEnvironment = {
    ...commonEnvironment,
    CVG_VUE_SPECIALIZED_SOURCES: selectedPaths,
    CVG_VUE_SPECIALIZED_VITEST_OUTPUT: join(candidate, 'vitest-events.jsonl')
  };
  const testFiles = [
    ...new Set(selected.flatMap((source) => source.contractEntry.testFiles ?? []))
  ];
  if (!testFiles.length) fail('selected Vue sources have no real Vitest test file');
  spawnChecked(
    'pnpm',
    [
      '--filter',
      '@cvg-his-v2/spa',
      'exec',
      'vitest',
      'run',
      ...testFiles.map((path) => path.replace(/^apps\/spa\//, '')),
      '--config',
      'vitest.specialized.config.ts',
      '--reporter=json',
      `--outputFile=${join(candidate, 'vitest-result.json')}`
    ],
    vitestEnvironment,
    'specialized Vue Vitest render suite'
  );

  const browserEnvironment = {
    ...commonEnvironment,
    SPA_URL: process.env.SPA_URL || 'http://127.0.0.1:3112',
    API_URL: process.env.API_URL || 'http://127.0.0.1:3111',
    CVG_VUE_SPECIALIZED_BROWSER_OUTPUT: join(candidate, 'browser-evidence.json'),
    CVG_VUE_SPECIALIZED_PLAYWRIGHT_RESULT: join(candidate, 'playwright-result.json')
  };
  spawnChecked(
    'pnpm',
    [
      'exec',
      'playwright',
      'test',
      'e2e/spa/visual/visual-regression.spec.ts',
      '--config',
      'playwright-spa.config.ts',
      '--grep',
      'specialized Vue evidence',
      '--reporter',
      './scripts/lib/vue-specialized-playwright-reporter.mjs'
    ],
    browserEnvironment,
    'specialized Vue browser suite'
  );

  const afterHashes = Object.fromEntries(
    scope.sources.map((source) => [source.path, fileHash(source.absolute)])
  );
  if (JSON.stringify(beforeHashes) !== JSON.stringify(afterHashes) || currentHead() !== head)
    fail('Vue source or HEAD changed during specialized evidence collection');

  const evidence = buildEvidenceRecord({
    runId,
    head,
    manifestBytes,
    contractBytes,
    scope,
    selected,
    candidate
  });
  const candidateResult = checkVueSpecializedEvidence({
    root,
    manifest,
    contract,
    manifestBytes,
    contractBytes,
    evidencePath: join(candidate, 'evidence.json'),
    buildRoot: paths.buildRoot,
    artifactRoot: pendingArtifactRoot,
    head
  });
  if (candidateResult.status !== 'PASS' && evidence.status === 'passed')
    fail(`specialized Vue candidate failed its own consumer: ${candidateResult.errors.join('; ')}`);

  const published = publishCompleteEvidence(evidence, candidate, paths.evidencePath);
  console.log(
    JSON.stringify(
      {
        status: evidence.status === 'passed' && published ? 'PASS' : 'PARTIAL',
        runId,
        selected: selected.map((source) => source.path),
        published,
        consumer: candidateResult.status,
        consumerErrors: candidateResult.errors
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (error) {
  console.error(`specialized Vue evidence failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
}
