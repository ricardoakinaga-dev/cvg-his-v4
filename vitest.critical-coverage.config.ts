import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname, isAbsolute } from 'node:path';
import { createWorkspaceAliases } from './vitest.alias.js';
import { buildCriticalCoverageInclude } from './scripts/lib/critical-coverage-include.mjs';
import { CRITICAL_VITEST_SHARDS, isCriticalIntegrationTest } from './scripts/lib/critical-shard-classification.mjs';

const root = resolve(__dirname);
const spaRequire = createRequire(resolve(root, 'apps/spa/package.json'));
const vueEntry = spaRequire.resolve('vue/dist/vue.runtime.esm-bundler.js');
const vueRouterEntry = spaRequire.resolve('vue-router/dist/vue-router.mjs');
const manifestBytes = readFileSync(resolve(root, 'docs/engineering/critical-coverage-scope.json'));
const manifest = JSON.parse(manifestBytes.toString());
const shard = process.env.CRITICAL_COVERAGE_SHARD ?? 'vitest-unit';
if (!CRITICAL_VITEST_SHARDS.includes(shard)) throw new Error('Unsupported critical Vitest shard');
const runId = process.env.CRITICAL_COVERAGE_RUN_ID;
if (!runId || !/^[a-zA-Z0-9-]+$/.test(runId)) throw new Error('Run via node scripts/run-critical-coverage-shard.mjs');
const output = resolve(root, 'artifacts/consolidacao-2026-09-05/coverage-scope', shard, runId);
const sources = manifest.files.filter((file: { applicability: string }) => file.applicability === 'javascript-metrics');
const coverageSources = sources.map((file: { path: string }) => file.path);
const coverageInclude = buildCriticalCoverageInclude(coverageSources);
// Database-backed suites are integration by contract even when they live beside
// a package (`*.integration.test.ts`); the unit shard must not silently skip
// them, and the integration shard runs them fail-closed with REQUIRE_TEST_DB=1.
const include = manifest.vitestTests.filter(
  (path: string) => isCriticalIntegrationTest(path) === (shard === 'vitest-integration')
);
// Native node:test and process suites require their own instrumented shards.
for (const path of include) {
  if (/['"]node:test['"]/.test(readFileSync(resolve(root, path), 'utf8'))) throw new Error(`Native suite in Vitest shard: ${path}`);
}
export default defineConfig({
  plugins: [vue(), {
    name: 'critical-original-db-source',
    enforce: 'pre',
    resolveId(id, importer) {
      // Legacy emitted JS beside DB sources otherwise shadows the current TS
      // and maps compiled line numbers onto the wrong source during coverage.
      if (!id.endsWith('.js') || (!isAbsolute(id) && (!importer || !id.startsWith('.')))) return;
      const source = resolve(importer ? dirname(importer) : root, id.slice(0, -3) + '.ts');
      if (source.startsWith(resolve(root, 'packages/db/src') + '/') && existsSync(source)) return source;
    },
  }],
  resolve: {
    // Frontend inventory tests import `vue`; resolve framework entries from the
    // workspace because the config root is the repository root.
    dedupe: ['vue', 'vue-router'],
    alias: {
      ...createWorkspaceAliases(root),
      vue: vueEntry,
      'vue-router': vueRouterEntry,
      '@cvg-his-v2/design-system/vue': resolve(root, 'packages/design-system/src/vue'),
      '@cvg-his-v2/design-system/src/vue': resolve(root, 'packages/design-system/src/vue'),
    },
  },
  test: {
    // Server suites keep the node environment (jsdom changes import.meta.url).
    // Frontend inventory suites declare `// @vitest-environment jsdom` in the
    // test file itself, matching the product SPA configuration per file.
    environment: 'node', globals: true, include,
    setupFiles: [resolve(root, 'apps/spa/src/test/setup.ts')],
    exclude: ['**/node_modules/**', '**/dist/**'],
    fileParallelism: false, pool: 'forks', maxWorkers: 1,
    testTimeout: 30_000, hookTimeout: 120_000, teardownTimeout: 120_000,
    globalSetup: ['tests/setup/global-setup.ts'],
    reporters: ['default', {
      onTestRunEnd(testModules = [], unhandledErrors = []) {
        mkdirSync(output, { recursive: true });
        const hasIncompleteTask = (task: any): boolean =>
          ['skip', 'todo'].includes(task?.options?.mode) ||
          (task?.type === 'test' && ['skipped', 'failed'].includes(task.result?.().state)) ||
          ((task?.type === 'suite' || task?.type === 'module') && task.state?.() === 'skipped') ||
          (task?.children?.array?.() ?? []).some(hasIncompleteTask);
        const missingTests = include.filter((path: string) => !testModules.some((file) => file.moduleId === resolve(root, path)));
        const failed = unhandledErrors.length > 0 || testModules.length === 0 || missingTests.length > 0 ||
          testModules.some((file) => file.state() !== 'passed' || hasIncompleteTask(file));
        writeFileSync(resolve(output, 'test-result.json'), JSON.stringify({
          schemaVersion: 2, runId, shard, status: failed ? 'failed' : 'passed',
          missingTests, coverageFile: 'coverage-final.json', testFiles: testModules.length, errors: unhandledErrors.length,
        }, null, 2));
      },
    }],
    coverage: {
      provider: 'v8', enabled: true,
      include: coverageInclude,
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/node_modules/**', '**/dist/**'],
      reporter: [[resolve(root, 'scripts/lib/critical-coverage-json-reporter.cjs'), {}], 'json-summary', 'text-summary'],
      reportsDirectory: output, tempDirectory: resolve(output, '.tmp'),
      reportOnFailure: true,
    },
  },
});
