#!/usr/bin/env node
/** Read-only inventory: never executes tests or treats their presence as coverage. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve('vitest/package.json'));
const picomatch = vitestRequire('picomatch');
const { loadConfigFromFile } = await import(pathToFileURL(vitestRequire.resolve('vite')).href);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const paths = [...new Set(git('ls-files', '-c', '-o', '--exclude-standard', '-z').split('\0'))]
  .filter((path) => path && existsSync(resolve(root, path)))
  .filter((path) => !/(^|\/)(dist|node_modules|coverage[^/]*|artifacts|legado|\.gauntlet)\//.test(path)).sort();
const matching = (path, patterns = []) => patterns.filter((pattern) => picomatch(pattern, { dot: true })(path));
const configs = {};
for (const name of ['vitest.config.ts', 'vitest.unit.config.ts', 'vitest.integration.config.ts']) {
  const loaded = await loadConfigFromFile({ command: 'serve', mode: 'test' }, resolve(root, name));
  if (!loaded?.config?.test) throw new Error(`Cannot resolve ${name}`);
  configs[name] = loaded.config.test;
}
const coverage = configs['vitest.config.ts'].coverage;
const testPattern = /\.(test|spec)\.[cm]?[jt]sx?$/;
const categories = {
  auth: /(?:\/auth(?:\/|-)|\/mfa\/|auth-helpers|interactive-principal|setup-token)/,
  'roles-rls': /(?:access-control|\/rbac\/|\/security\/|tenant-context|\/rls\/|rls-|runtime-role|role-grants|\/db\/.*(?:schema|migration)|\/migrations\/)/,
  'billing-cash': /(?:billing|\/cash\/|cash-|financial|payments|counter-sales|commercial|commissions)/,
  inpatient: /(?:inpatient|discharges|triage)/,
  records: /(?:medical-record|clinical-record|encounter)/,
  prescriptions: /prescription/,
  pix: /pix|payment-gateway/,
  webhooks: /webhook|provider-ingress/,
  'http-routes': /apps\/api\/src\/(?:routes\/|http\/|server\.ts|helpers\/auth-helpers)/,
  repositories: /repositor/,
};
const tags = (path) => Object.entries(categories).filter(([, regex]) => regex.test(path)).map(([key]) => key);
const sourcePaths = paths.filter((path) => !testPattern.test(path) && !/\.d\.ts$/.test(path) &&
  (/^(apps|packages)\/.*\/src\/.*\.(?:[cm]?[jt]sx?|vue)$/.test(path) || /\.sql$/.test(path)));
const files = sourcePaths.map((path) => {
  const includedBy = matching(path, coverage.include);
  const excludedBy = matching(path, coverage.exclude);
  return { path, sha256: hash(read(path)), status: includedBy.length ? (excludedBy.length ? 'excluded' : 'included') : 'outside-include', includedBy, excludedBy, critical: tags(path), measuredCoverage: null };
});
const apiTestCommand = JSON.parse(read('apps/api/package.json')).scripts.test;
const apiTestPatterns = [...apiTestCommand.matchAll(/\bdist\/[^\s]+\.test\.js/g)].map(([path]) => `apps/api/${path.replace(/^dist\//, 'src/').replace(/\.js$/, '.ts')}`);
const tests = paths.filter((path) => testPattern.test(path)).map((path) => {
  const text = read(path);
  const runners = [/['"]node:test['"]/.test(text) && 'node:test', /['"]vitest['"]/.test(text) && 'vitest', /['"]@playwright\/test['"]/.test(text) && 'playwright'].filter(Boolean);
  const selectedBy = Object.entries(configs).filter(([, config]) => matching(path, config.include).length && !matching(path, config.exclude).length).map(([name]) => name);
  const layer = path.startsWith('e2e/') ? 'e2e' : path.startsWith('tests/integration/process/') ? 'integration-process' : path.startsWith('tests/integration/') ? 'integration' : path.startsWith('apps/api/') ? 'api' : path.startsWith('apps/spa/') ? 'frontend-unit' : path.startsWith('apps/worker/') ? 'worker' : path.startsWith('tests/unit/') ? 'unit' : path.startsWith('packages/') ? 'package' : 'tooling';
  return { path, sha256: hash(text), layer, declaredRunners: runners, selectedBy, critical: tags(path), apiPackageTestSelected: matching(path, apiTestPatterns).length > 0, executionStatus: 'not-run', measuredCoverage: null, incompatibleSelection: runners.includes('node:test') && selectedBy.length > 0 };
});
const count = (items, key) => Object.fromEntries([...new Set(items.map((item) => item[key]))].sort().map((value) => [value, items.filter((item) => item[key] === value).length]));
const critical = Object.keys(categories).map((name) => ({ name, selectionRule: categories[name].source, files: files.filter((file) => file.critical.includes(name)).map((file) => file.path), candidateTests: tests.filter((test) => test.critical.includes(name)).map((test) => test.path), statusCounts: count(files.filter((file) => file.critical.includes(name)), 'status'), requiredMetrics: { lines: 85, statements: 85, functions: 85, branches: 85 }, measuredCoverage: null }));
const provenancePaths = ['scripts/report-coverage-scope.mjs', 'vitest.config.ts', 'vitest.unit.config.ts', 'vitest.integration.config.ts', 'vitest.alias.ts', 'package.json', 'apps/api/package.json', 'playwright.config.ts', 'playwright-spa.config.ts', 'infra/scripts/run-critical-process-suite.mjs'];
const report = {
  schemaVersion: 1, ticket: 'R05-009', head: git('rev-parse', 'HEAD'),
  provenance: provenancePaths.map((path) => ({ path, sha256: hash(read(path)) })),
  limitations: ['Snapshot of existing tracked and nonignored untracked files; source hashes bind dirty worktree content.', 'Inventory only: no tests executed, no measured coverage claimed, existing coverage output not authenticated to this snapshot.', 'Critical tags and candidate tests use published path rules, not verified runtime traceability; cross-cutting dependencies may extend scope after review.', 'Vitest selection is resolved from config; CLI overrides, package scripts and Playwright environment-specific filtering are not claimed as test execution.', 'Integration inherits coverage exclusions from base config; enabling coverage alone does not measure excluded critical files.', 'API node:test suites are outside root Vitest selection: widening selection is not a runner migration; use native-runner instrumentation/source-map merge or a reviewed migration. Any actually incompatible selections are listed separately.'],
  resolvedConfigs: Object.fromEntries(Object.entries(configs).map(([name, config]) => [name, { include: config.include, exclude: config.exclude, environment: config.environment, coverageInclude: config.coverage?.include ?? null, coverageExclude: config.coverage?.exclude ?? null }])),
  apiPackageTestPatterns: apiTestPatterns, nativeApiRunnerCoverageGap: tests.filter((test) => test.layer === 'api' && test.declaredRunners.includes('node:test')).map((test) => test.path), globalThresholds: coverage.thresholds, sourceCounts: count(files, 'status'), testLayerCounts: count(tests, 'layer'),
  runnerIncompatibilities: tests.filter((test) => test.incompatibleSelection).map((test) => ({ path: test.path, selectedBy: test.selectedBy })),
  critical, files, tests,
};
const outputArg = process.argv[2] ?? 'artifacts/consolidacao-2026-09-05/coverage-scope';
if (process.argv.length > 3) throw new Error('Usage: node scripts/report-coverage-scope.mjs [output-directory]');
const output = resolve(root, outputArg);
mkdirSync(output, { recursive: true });
const serialized = `${JSON.stringify(report, null, 2)}\n`;
writeFileSync(resolve(output, 'scope.json'), serialized);
const summary = ['# Current coverage scope (inventory, not measurement)', '', `HEAD: ${report.head}`, `scope.json SHA-256: ${hash(serialized)}`, '', `Sources: ${JSON.stringify(report.sourceCounts)}`, `Test files by layer: ${JSON.stringify(report.testLayerCounts)}`, `node:test files selected by Vitest: ${report.runnerIncompatibilities.length}`, '', '| Critical scope | Included | Excluded | Outside include | Candidate test files |', '|---|---:|---:|---:|---:|', ...critical.map((item) => `| ${item.name} | ${item.statusCounts.included ?? 0} | ${item.statusCounts.excluded ?? 0} | ${item.statusCounts['outside-include'] ?? 0} | ${item.candidateTests.length} |`), '', ...report.limitations.map((item) => `- ${item}`), ''].join('\n');
writeFileSync(resolve(output, 'README.md'), summary);
console.log(JSON.stringify({ output: relative(root, output), sha256: hash(serialized), sourceCounts: report.sourceCounts, testLayerCounts: report.testLayerCounts, runnerIncompatibilities: report.runnerIncompatibilities.length }, null, 2));
