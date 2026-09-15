import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { resolveContainedPath } from './root-contained-path.mjs';

export const VUE_SPECIALIZED_SCHEMA_VERSION = 1;
export const VUE_SPECIALIZED_KIND = 'vue-specialized-evidence';
export const VUE_SPECIALIZED_BUILD_KIND = 'vue-specialized-build-evidence';
export const VUE_SPECIALIZED_BROWSER_RENDERER = 'Playwright browser renderer';
export const VUE_SPECIALIZED_VITEST_RENDERER = '@vue/test-utils.mount';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function sourceSetDigest(sources) {
  return sha256(
    (Array.isArray(sources) ? sources : [])
      .filter((source) => source && typeof source.path === 'string')
      .map((source) => `${source.path}:${source.sha256 ?? source.sourceSha256 ?? ''}`)
      .sort()
      .join('\n')
  );
}

export function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function isRegularFile(filePath) {
  try {
    return lstatSync(filePath).isFile() && statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function normalizePath(value) {
  return value.split(sep).join('/');
}

function sourceEntryMap(manifest) {
  return new Map(
    (Array.isArray(manifest?.files) ? manifest.files : [])
      .filter(
        (file) =>
          file &&
          typeof file.path === 'string' &&
          file.path.endsWith('.vue') &&
          file.applicability === 'pending-specialized-instrumentation'
      )
      .map((file) => [file.path, file])
  );
}

function contractEntryMap(contract) {
  return new Map(
    (Array.isArray(contract?.sources) ? contract.sources : [])
      .filter((source) => source && typeof source.path === 'string')
      .map((source) => [source.path, source])
  );
}

export function loadVueSpecializedScope({ root, manifest, contract }) {
  const errors = [];
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return { errors: ['Vue specialized contract must be an object'], sources: [] };
  }
  if (contract.schemaVersion !== VUE_SPECIALIZED_SCHEMA_VERSION)
    errors.push('unsupported Vue specialized contract schema');
  if (contract.kind !== 'vue-specialized-evidence-scope')
    errors.push('invalid Vue specialized contract kind');

  const manifestSources = sourceEntryMap(manifest);
  const contractSources = contractEntryMap(contract);
  if (manifestSources.size !== contractSources.size) {
    errors.push(
      `Vue specialized source count differs from the manifest: manifest=${manifestSources.size} contract=${contractSources.size}`
    );
  }
  for (const path of manifestSources.keys()) {
    if (!contractSources.has(path))
      errors.push(`Vue source missing from specialized contract: ${path}`);
  }
  for (const path of contractSources.keys()) {
    if (!manifestSources.has(path))
      errors.push(`specialized contract contains non-pending Vue source: ${path}`);
  }

  const sources = [];
  for (const [path, manifestEntry] of manifestSources) {
    const contractEntry = contractSources.get(path);
    const resolved = resolveContainedPath(root, path);
    if (!resolved.ok) {
      errors.push(`Vue source path invalid: ${path}: ${resolved.reason}`);
      continue;
    }
    if (!isRegularFile(resolved.realpath)) {
      errors.push(`Vue source is not a regular file: ${path}`);
      continue;
    }
    const sourceSha256 = sha256(readFileSync(resolved.realpath));
    if (sourceSha256 !== manifestEntry.sha256) errors.push(`Vue source hash mismatch: ${path}`);
    if (!contractEntry) continue;
    if (contractEntry.route === undefined || typeof contractEntry.route !== 'string')
      errors.push(`Vue specialized route is missing: ${path}`);
    if (!contractEntry.behavior || typeof contractEntry.behavior !== 'object')
      errors.push(`Vue specialized behavior contract is missing: ${path}`);
    if (!Array.isArray(contractEntry.testFiles))
      errors.push(`Vue specialized testFiles must be a list: ${path}`);
    else {
      if (contractEntry.testFiles.length === 0)
        errors.push(`Vue specialized testFiles cannot be empty: ${path}`);
      for (const testPath of contractEntry.testFiles) {
        if (typeof testPath !== 'string' || !testPath.endsWith('.test.ts')) {
          errors.push(`Vue specialized test file is invalid: ${path}:${testPath}`);
          continue;
        }
        const testFile = resolveContainedPath(root, testPath);
        if (!testFile.ok || !isRegularFile(testFile.realpath))
          errors.push(`Vue specialized test file is unavailable: ${path}:${testPath}`);
      }
    }
    sources.push({
      path,
      sha256: manifestEntry.sha256,
      manifestEntry,
      contractEntry,
      absolute: resolved.realpath
    });
  }
  return { errors, sources, manifestSources, contractSources };
}

function resolveArtifactFile(parent, reference, label, errors) {
  if (typeof reference !== 'string' || !reference || reference.includes('\\')) {
    errors.push(`${label} reference is invalid`);
    return null;
  }
  const resolved = resolveContainedPath(parent, reference);
  if (!resolved.ok || !isRegularFile(resolved.realpath)) {
    errors.push(`${label} is unavailable: ${reference}`);
    return null;
  }
  return resolved;
}

function validSha(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function verifyArtifactDigest({ parent, reference, digest, label, errors }) {
  const file = resolveArtifactFile(parent, reference, label, errors);
  if (!file) return null;
  const bytes = readFileSync(file.realpath);
  if (!validSha(digest) || digest !== sha256(bytes)) errors.push(`${label} digest mismatch`);
  return { file, bytes };
}

function parseJson(bytes, label, errors) {
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    errors.push(`invalid ${label} JSON: ${error.message}`);
    return null;
  }
}

function collectPlaywrightStatuses(node, result = []) {
  if (!node || typeof node !== 'object') return result;
  if (Array.isArray(node.tests)) {
    for (const test of node.tests) {
      for (const resultEntry of test.results ?? []) {
        if (resultEntry?.status) result.push(resultEntry.status);
      }
      if (test.status) result.push(test.status);
    }
  }
  for (const suite of node.suites ?? []) collectPlaywrightStatuses(suite, result);
  return result;
}

function verifyVitestResult(result, expectedTestFiles, errors) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    errors.push('Vitest result must be an object');
    return;
  }
  if (result.success !== true) errors.push('Vitest result is not successful');
  if (!Number.isSafeInteger(result.numTotalTests) || result.numTotalTests < 1)
    errors.push('Vitest result has no executed tests');
  if (result.numFailedTests !== 0) errors.push('Vitest result contains failed tests');
  if (result.numPendingTests !== 0) errors.push('Vitest result contains skipped or pending tests');
  if (!Array.isArray(result.testResults) || result.testResults.length === 0)
    errors.push('Vitest result has no test files');
  const resultPaths = new Set(
    (result.testResults ?? [])
      .map((item) => item?.testFilePath ?? item?.name)
      .filter((path) => typeof path === 'string')
      .map(normalizePath)
  );
  for (const testPath of expectedTestFiles) {
    if (!resultPaths.has(normalizePath(resolve(testPath)))) {
      // Vitest can emit a repository-relative path depending on its cwd.
      const relativePath = normalizePath(testPath);
      if (![...resultPaths].some((path) => path.endsWith(`/${relativePath}`)))
        errors.push(`Vitest result did not execute declared test file: ${testPath}`);
    }
  }
}

function verifyBrowserResult(result, errors) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    errors.push('Playwright result must be an object');
    return;
  }
  if (!result.stats || !Number.isSafeInteger(result.stats.expected) || result.stats.expected < 1)
    errors.push('Playwright result has no expected tests');
  if (result.status !== 'passed') errors.push('Playwright result is not passing');
  if ((result.stats?.unexpected ?? 0) !== 0)
    errors.push('Playwright result contains unexpected tests');
  if ((result.stats?.flaky ?? 0) !== 0) errors.push('Playwright result contains flaky tests');
  if ((result.stats?.skipped ?? 0) !== 0) errors.push('Playwright result contains skipped tests');
  const statuses = collectPlaywrightStatuses(result);
  if (!statuses.length || statuses.some((status) => !['passed', 'expected'].includes(status)))
    errors.push('Playwright result does not prove a passing browser test');
}

function verifyBuildEvidence({ root, buildRoot, buildEvidence, source, errors }) {
  if (!buildEvidence || typeof buildEvidence !== 'object') {
    errors.push(`missing build evidence: ${source.path}`);
    return null;
  }
  if (buildEvidence.schemaVersion !== VUE_SPECIALIZED_SCHEMA_VERSION)
    errors.push(`invalid build evidence schema: ${source.path}`);
  if (buildEvidence.kind !== VUE_SPECIALIZED_BUILD_KIND)
    errors.push(`invalid build evidence kind: ${source.path}`);
  if (buildEvidence.sourceSetSha256 === undefined)
    errors.push(`build evidence has no source-set digest: ${source.path}`);
  const record = buildEvidence.sources?.[source.path];
  if (!record) {
    errors.push(`build did not transform Vue source: ${source.path}`);
    return null;
  }
  if (record.sourceSha256 !== source.sha256)
    errors.push(`build source hash mismatch: ${source.path}`);
  if (!Array.isArray(record.transformedModules) || record.transformedModules.length === 0)
    errors.push(`build has no transformed SFC modules: ${source.path}`);
  if (!Array.isArray(record.outputFiles) || record.outputFiles.length === 0)
    errors.push(`build has no emitted bundle for Vue source: ${source.path}`);
  for (const module of record.transformedModules ?? []) {
    if (!validSha(module.codeSha256))
      errors.push(`invalid transformed module digest: ${source.path}`);
  }
  for (const output of record.outputFiles ?? []) {
    if (!output || typeof output.file !== 'string' || !validSha(output.sha256)) {
      errors.push(`invalid emitted bundle identity: ${source.path}`);
      continue;
    }
    const artifact = resolveArtifactFile(
      buildRoot,
      output.file,
      `SPA bundle for ${source.path}`,
      errors
    );
    if (artifact && sha256(readFileSync(artifact.realpath)) !== output.sha256)
      errors.push(`SPA bundle digest mismatch: ${source.path}:${output.file}`);
  }
  return record;
}

function verifyVitestEvidence({ root, vitestEvidence, source, errors }) {
  const records = Array.isArray(vitestEvidence?.events)
    ? vitestEvidence.events.filter((event) => event?.sourcePath === source.path)
    : [];
  if (!records.length) {
    errors.push(`Vitest did not mount the real Vue source: ${source.path}`);
    return [];
  }
  for (const record of records) {
    if (record.sourceSha256 !== source.sha256)
      errors.push(`Vue test source hash mismatch: ${source.path}`);
    if (record.renderer !== VUE_SPECIALIZED_VITEST_RENDERER)
      errors.push(`unrecognized Vue test renderer: ${source.path}`);
    if (record.mounted !== true) errors.push(`Vue test render was not mounted: ${source.path}`);
    if (record.domFabricated !== false || record.domMutations !== 0)
      errors.push(`fabricated or mutated DOM cannot certify Vue source: ${source.path}`);
    if (!validSha(record.renderedHtmlSha256))
      errors.push(`Vue test render has no DOM digest: ${source.path}`);
    if (
      typeof record.testFile !== 'string' ||
      typeof record.testName !== 'string' ||
      !record.testName
    )
      errors.push(`Vue test render has no test identity: ${source.path}`);
    if (typeof record.testFile === 'string') {
      const testFile = resolveContainedPath(root, record.testFile);
      if (!testFile.ok || !isRegularFile(testFile.realpath))
        errors.push(`Vue test evidence references unavailable test file: ${source.path}`);
      if (!validSha(record.testFileSha256))
        errors.push(`Vue test evidence has no test file digest: ${source.path}`);
      else if (testFile.ok && sha256(readFileSync(testFile.realpath)) !== record.testFileSha256)
        errors.push(`Vue test file hash mismatch: ${source.path}`);
    }
  }
  return records;
}

function verifyBrowserEvidence({ source, browserEvidence, errors }) {
  const records = Array.isArray(browserEvidence?.events)
    ? browserEvidence.events.filter((event) => event?.sourcePath === source.path)
    : [];
  if (!records.length) {
    errors.push(`browser did not observe the real Vue source: ${source.path}`);
    return [];
  }
  for (const record of records) {
    if (record.sourceSha256 !== source.sha256)
      errors.push(`browser source hash mismatch: ${source.path}`);
    if (record.renderer !== VUE_SPECIALIZED_BROWSER_RENDERER)
      errors.push(`unrecognized browser renderer: ${source.path}`);
    if (record.rendered !== true || ![200, 304].includes(record.responseStatus))
      errors.push(`browser evidence is not a successful real render: ${source.path}`);
    if (record.domFabricated !== false || record.domMutations !== 0)
      errors.push(`browser DOM mutation cannot certify Vue source: ${source.path}`);
    if (!validSha(record.renderedHtmlSha256))
      errors.push(`browser render has no DOM digest: ${source.path}`);
    if (!record.route || typeof record.route !== 'string')
      errors.push(`browser evidence has no route: ${source.path}`);
    if (!record.action || typeof record.action !== 'string')
      errors.push(`browser evidence has no real action: ${source.path}`);
    if (
      record.observation !== 'vite-source-request' &&
      record.observation !== 'runtime-component-hook' &&
      record.observation !== 'emitted-bundle-request'
    )
      errors.push(`browser source observation is not real: ${source.path}`);
  }
  return records;
}

/**
 * Consume the specialized Vue candidate published by the producer.
 *
 * This verifier intentionally does not merge Vue into Istanbul coverage. A
 * Vue source is accepted only when the same current source identity is present
 * in an actual SPA build, a real Vue Test Utils mount, and a real browser
 * render/action. Any missing, stale, fabricated, or partial record fails.
 */
export function checkVueSpecializedEvidence({
  root,
  manifest,
  contract,
  manifestBytes,
  contractBytes,
  evidencePath,
  buildRoot,
  artifactRoot,
  head
}) {
  const scope = loadVueSpecializedScope({ root, manifest, contract });
  const errors = [...scope.errors];
  if (scope.sources.length === 0) {
    return { status: errors.length ? 'FAIL' : 'PASS', errors, acceptedPaths: [] };
  }
  const evidenceFile = resolveContainedPath(root, evidencePath);
  if (!evidenceFile.ok || !isRegularFile(evidenceFile.realpath)) {
    errors.push(`missing specialized Vue evidence: ${evidencePath}`);
    return { status: 'FAIL', errors, acceptedPaths: [] };
  }
  const evidenceBytes = readFileSync(evidenceFile.realpath);
  let evidence;
  try {
    evidence = JSON.parse(evidenceBytes.toString('utf8'));
  } catch (error) {
    errors.push(`invalid specialized Vue evidence JSON: ${error.message}`);
    return { status: 'FAIL', errors, acceptedPaths: [] };
  }
  if (evidence.schemaVersion !== VUE_SPECIALIZED_SCHEMA_VERSION)
    errors.push('invalid specialized Vue evidence schema');
  if (evidence.kind !== VUE_SPECIALIZED_KIND) errors.push('invalid specialized Vue evidence kind');
  if (evidence.status !== 'passed')
    errors.push('specialized Vue evidence is not complete and passing');
  if (evidence.head !== head) errors.push('specialized Vue evidence HEAD mismatch');
  if (!validSha(evidence.manifestSha256) || evidence.manifestSha256 !== sha256(manifestBytes))
    errors.push('specialized Vue evidence manifest digest mismatch');
  if (!validSha(evidence.contractSha256) || evidence.contractSha256 !== sha256(contractBytes))
    errors.push('specialized Vue evidence contract digest mismatch');
  if (evidence.sourceSetSha256 !== sourceSetDigest(scope.sources))
    errors.push('specialized Vue evidence source-set digest mismatch');
  if (evidence.scope?.complete !== true) errors.push('specialized Vue evidence scope is partial');

  const evidenceSources = new Map(
    (Array.isArray(evidence.sources) ? evidence.sources : []).map((source) => [
      source?.path,
      source
    ])
  );
  if (evidenceSources.size !== scope.sources.length)
    errors.push('specialized Vue evidence source inventory is incomplete or duplicated');
  for (const source of scope.sources)
    if (!evidenceSources.has(source.path))
      errors.push(`missing specialized Vue record: ${source.path}`);
  for (const path of evidenceSources.keys())
    if (!scope.manifestSources.has(path)) errors.push(`unexpected specialized Vue record: ${path}`);

  const artifactDirectory = artifactRoot
    ? resolveContainedPath(root, artifactRoot, { allowRoot: true })
    : { ok: true, realpath: dirname(evidenceFile.realpath) };
  if (!artifactDirectory.ok)
    errors.push(`specialized Vue artifact root is unavailable: ${artifactDirectory.reason}`);
  const evidenceDirectory = artifactDirectory.ok
    ? artifactDirectory.realpath
    : dirname(evidenceFile.realpath);
  const buildArtifact = verifyArtifactDigest({
    parent: evidenceDirectory,
    reference: evidence.build?.file,
    digest: evidence.build?.sha256,
    label: 'specialized Vue build evidence',
    errors
  });
  const vitestArtifact = verifyArtifactDigest({
    parent: evidenceDirectory,
    reference: evidence.vitest?.file,
    digest: evidence.vitest?.sha256,
    label: 'specialized Vue Vitest evidence',
    errors
  });
  const browserArtifact = verifyArtifactDigest({
    parent: evidenceDirectory,
    reference: evidence.browser?.file,
    digest: evidence.browser?.sha256,
    label: 'specialized Vue browser evidence',
    errors
  });
  const buildEvidence = buildArtifact
    ? parseJson(buildArtifact.bytes, 'build evidence', errors)
    : null;
  const vitestEvidence = vitestArtifact
    ? parseJson(vitestArtifact.bytes, 'Vitest evidence', errors)
    : null;
  const browserEvidence = browserArtifact
    ? parseJson(browserArtifact.bytes, 'browser evidence', errors)
    : null;

  if (buildEvidence && typeof buildEvidence === 'object') {
    if (buildEvidence.head !== head) errors.push('specialized Vue build HEAD mismatch');
    if (buildEvidence.sourceSetSha256 !== sourceSetDigest(scope.sources))
      errors.push('specialized Vue build source-set digest mismatch');
  }

  const vitestResultArtifact = verifyArtifactDigest({
    parent: evidenceDirectory,
    reference: evidence.vitest?.resultFile,
    digest: evidence.vitest?.resultSha256,
    label: 'Vitest result',
    errors
  });
  const browserResultArtifact = verifyArtifactDigest({
    parent: evidenceDirectory,
    reference: evidence.browser?.resultFile,
    digest: evidence.browser?.resultSha256,
    label: 'Playwright result',
    errors
  });
  if (vitestResultArtifact) {
    const result = parseJson(vitestResultArtifact.bytes, 'Vitest result', errors);
    const expected = scope.sources.flatMap((source) => source.contractEntry.testFiles ?? []);
    verifyVitestResult(result, expected, errors);
  }
  if (browserResultArtifact)
    verifyBrowserResult(
      parseJson(browserResultArtifact.bytes, 'Playwright result', errors),
      errors
    );

  const acceptedPaths = [];
  for (const source of scope.sources) {
    const record = evidenceSources.get(source.path);
    if (!record) continue;
    const sourceErrorsBefore = errors.length;
    if (record.sourceSha256 !== source.sha256)
      errors.push(`specialized Vue source hash mismatch: ${source.path}`);
    verifyBuildEvidence({ root, buildRoot, buildEvidence, source, errors });
    verifyVitestEvidence({ root, vitestEvidence, source, errors });
    verifyBrowserEvidence({ source, browserEvidence, errors });
    if (errors.length === sourceErrorsBefore) acceptedPaths.push(source.path);
  }
  return {
    status: errors.length ? 'FAIL' : 'PASS',
    errors,
    acceptedPaths,
    sources: scope.sources.map((source) => ({ path: source.path, sourceSha256: source.sha256 })),
    evidencePath: normalizePath(relative(root, evidenceFile.realpath))
  };
}

export function defaultVueSpecializedPaths(root) {
  return {
    manifestPath: resolve(root, 'docs/engineering/critical-coverage-scope.json'),
    contractPath: resolve(root, 'docs/engineering/vue-specialized-evidence.json'),
    artifactsPath: resolve(root, 'artifacts/consolidacao-2026-09-05/coverage-scope'),
    evidencePath: resolve(
      root,
      'artifacts/consolidacao-2026-09-05/coverage-scope/vue-specialized/evidence.json'
    ),
    buildRoot: resolve(root, 'apps/spa/dist')
  };
}
