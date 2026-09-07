import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

export const hash = (value) =>
  createHash('sha256')
    .update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value))
    .digest('hex');
export const VIEWPORTS = Object.freeze({
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 }
});
const requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};
export function exact(actual, expected, label) {
  requireThat(new Set(actual).size === actual.length, `${label}: duplicates`);
  requireThat(
    actual.length === expected.length && actual.every((v) => expected.includes(v)),
    `${label}: missing or extra entries`
  );
}
export function cases(report) {
  const found = [];
  function visit(suites, parents = []) {
    for (const suite of suites ?? []) {
      const titles = [...parents, suite.title];
      for (const spec of suite.specs ?? [])
        for (const test of spec.tests ?? []) {
          const identity = {
            id: spec.id,
            file: spec.file,
            line: spec.line,
            column: spec.column,
            titles: [...titles, spec.title],
            project: test.projectId
          };
          found.push({ identity, spec, test });
        }
      visit(suite.suites, titles);
    }
  }
  visit(report.suites);
  return found;
}
const key = (entry) => JSON.stringify(entry);
export function configFingerprint(config) {
  const volatileKeys = new Set(['reporter', 'metadata', 'actualWorkers']);
  const normalize = (value) => {
    if (Array.isArray(value)) return value.map(normalize);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !volatileKeys.has(key))
        .map(([key, nested]) => [key, normalize(nested)])
    );
  };
  return hash(normalize(config));
}
export async function sourceState(root) {
  const generatedPrefixes = ['tmp/', 'artifacts/', 'playwright-report/', 'test-results/', 'coverage/', 'coverage-boundary/', 'legado/'];
  const paths = execFileSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '-z',
      '--',
      'apps',
      'packages',
      'e2e',
      'scripts',
      'infra',
      '*.json',
      '*.yaml',
      '*.yml',
      '*.ts',
      '.github'
    ],
    { cwd: root }
  )
    .toString()
    .split('\0')
    .filter(Boolean)
    // Evidence is generated while a run is being frozen and must not alter
    // the source fingerprint used to bind discovery, execution and audit.
    .filter((path) => !generatedPrefixes.some((prefix) => path.startsWith(prefix)))
    .sort();
  const files = {};
  const deleted = new Set(
    execFileSync('git', ['ls-files', '--deleted', '-z'], { cwd: root })
      .toString()
      .split('\0')
      .filter(Boolean)
  );
  for (const path of [...new Set(paths)]) {
    try {
      files[path] = hash(await readFile(resolve(root, path)));
      requireThat(!deleted.has(path), `source restored during fingerprint: ${path}`);
    } catch (error) {
      // Only a deletion already reported by Git gets an explicit tombstone.
      // Null cannot collide with a present file's SHA-256. Other read errors,
      // dangling symlinks and unexpected disappearances must still fail.
      if (error.code !== 'ENOENT' || !deleted.has(path)) throw error;
      files[path] = null;
    }
  }
  const deletedAfter = new Set(
    execFileSync('git', ['ls-files', '--deleted', '-z'], { cwd: root })
      .toString()
      .split('\0')
      .filter(Boolean)
  );
  requireThat(
    paths.every((path) => deleted.has(path) === deletedAfter.has(path)),
    'tracked deletion changed during fingerprint'
  );
  return {
    sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(),
    files,
    digest: hash(files)
  };
}
export async function navigation(root) {
  const source = await readFile(resolve(root, 'apps/spa/src/navigation.ts'), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  const routes = [
    ...new Map(
      module.flattenAllNavItems().map((item) => [item.path, { path: item.path, title: item.label }])
    ).values()
  ];
  requireThat(
    routes.length > 0 && routes.every((r) => r.path.startsWith('/')),
    'invalid complete navigation'
  );
  return routes;
}
export function routePairs(routes) {
  return Object.keys(VIEWPORTS).flatMap((mode) => routes.map(({ path }) => ({ mode, path })));
}
function assertDiscovery(report, routes) {
  requireThat(!report.errors?.length, 'discovery has errors');
  const entries = cases(report);
  requireThat(entries.length > 0, 'empty discovery');
  exact(
    entries.map((e) => key(e.identity)),
    entries.map((e) => key(e.identity)),
    'discovery identities'
  );
  requireThat(
    entries.every(
      ({ test }) =>
        test.expectedStatus === 'passed' &&
        !test.results?.length &&
        !(test.annotations ?? []).some((a) => ['skip', 'fixme', 'fail'].includes(a.type))
    ),
    'discovery must be unexecuted, without skip/fixme/fail'
  );
  requireThat(
    report.config?.projects?.length === 1 &&
      report.config.projects[0].retries === 0 &&
      report.config.projects[0].repeatEach === 1 &&
      !report.config.shard,
    'inventory requires one project, no retries/repeats/shard'
  );
  const master = entries.filter(
    (e) =>
      e.identity.file === 'master-usability-audit.spec.ts' &&
      e.identity.titles.some((t) => t.startsWith('Auditoria master de usabilidade - '))
  );
  const expected = Object.keys(VIEWPORTS).flatMap((mode) =>
    routes.map((r) => key([`Auditoria master de usabilidade - ${mode}`, `${r.title} (${r.path})`]))
  );
  exact(
    master.map((e) => key(e.identity.titles.slice(-2))),
    expected,
    'complete navigation discovery'
  );
  return entries.map((e) => e.identity);
}
export function createInventory(report, routes, source, frozenAt = new Date().toISOString()) {
  const inventory = {
    schemaVersion: 1,
    frozenAt,
    source,
    discoveryDigest: hash(report),
    configDigest: configFingerprint(report.config),
    cases: assertDiscovery(report, routes),
    routes,
    pairs: routePairs(routes),
    viewports: VIEWPORTS
  };
  return { ...inventory, digest: hash(inventory) };
}
export function validateEvidence({
  results,
  audit,
  inventory,
  discovery,
  source,
  expectedSha,
  routes
}) {
  const { digest, ...payload } = inventory;
  requireThat(
    inventory.schemaVersion === 1 && digest === hash(payload),
    'inventory integrity mismatch'
  );
  requireThat(
    /^[a-f0-9]{40}$/.test(source.sha) &&
      inventory.source.sha === source.sha &&
      (!expectedSha || expectedSha === source.sha),
    'source SHA mismatch'
  );
  requireThat(
    inventory.source.digest === source.digest && hash(inventory.source.files) === source.digest,
    'source fingerprint drift'
  );
  requireThat(inventory.discoveryDigest === hash(discovery), 'discovery fingerprint mismatch');
  exact(inventory.cases.map(key), assertDiscovery(discovery, routes).map(key), 'frozen discovery');
  requireThat(
    key(inventory.routes) === key(routes) && key(inventory.viewports) === key(VIEWPORTS),
    'navigation or viewport drift'
  );
  exact(inventory.pairs.map(key), routePairs(routes).map(key), 'inventory pairs');
  requireThat(
    inventory.configDigest === configFingerprint(results.config) &&
      inventory.configDigest === configFingerprint(discovery.config),
    'configuration drift'
  );
  const frozen = Date.parse(inventory.frozenAt),
    started = Date.parse(results.stats?.startTime),
    generated = Date.parse(audit.generatedAt);
  requireThat(
    Number.isFinite(frozen) &&
      Number.isFinite(started) &&
      Number.isFinite(generated) &&
      frozen <= started &&
      generated >= started,
    'inventory must be frozen before run; audit must be from this run'
  );
  requireThat(!results.errors?.length, 'report errors');
  const entries = cases(results);
  exact(
    entries.map((e) => key(e.identity)),
    inventory.cases.map(key),
    'result identities'
  );
  requireThat(
    results.stats?.expected === inventory.cases.length &&
      ['skipped', 'unexpected', 'flaky'].every((k) => results.stats[k] === 0),
    'invalid result totals'
  );
  for (const { test, spec } of entries) {
    requireThat(
      spec.ok === true &&
        test.expectedStatus === 'passed' &&
        test.status === 'expected' &&
        test.results?.length === 1,
      `non-passing/retried case ${spec.id}`
    );
    const result = test.results[0];
    requireThat(
      result.status === 'passed' && result.retry === 0 && !result.error && !result.errors?.length,
      `failed/retried/error result ${spec.id}`
    );
  }
  requireThat(
    results.config?.metadata?.usabilityInventoryDigest === digest &&
      audit.metadata?.inventoryDigest === digest,
    'run inventory binding mismatch'
  );
  requireThat(audit.metadata?.sha === source.sha, 'audit SHA mismatch');
  requireThat(key(audit.metadata?.viewports) === key(VIEWPORTS), 'audit viewport mismatch');
  requireThat(
    audit.routeCount === routes.length && audit.navigationCount === inventory.pairs.length,
    'audit totals mismatch'
  );
  exact(
    (audit.records ?? []).map((r) => key({ mode: r.mode, path: r.path })),
    inventory.pairs.map(key),
    'audit pairs'
  );
  requireThat(
    audit.records.every(
      (r) =>
        r.status === 'passed' &&
        ['issues', 'httpErrors', 'pageErrors'].every(
          (k) => Array.isArray(r[k]) && r[k].length === 0
        )
    ),
    'audit contains failures/errors'
  );
  return {
    tests: entries.length,
    routes: routes.length,
    navigations: inventory.pairs.length,
    sha: source.sha,
    inventoryDigest: digest
  };
}
