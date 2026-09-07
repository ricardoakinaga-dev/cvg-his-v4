import { defineConfig } from 'vitest/config';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { createWorkspaceAliases } from './vitest.alias.js';

const root = resolve(__dirname);
const manifestBytes = readFileSync(resolve(root, 'docs/engineering/critical-coverage-scope.json'));
const manifest = JSON.parse(manifestBytes.toString());
const shard = process.env.CRITICAL_COVERAGE_SHARD ?? 'vitest-unit';
if (!['vitest-unit', 'vitest-integration'].includes(shard)) throw new Error('Unsupported critical Vitest shard');
const runId = process.env.CRITICAL_COVERAGE_RUN_ID;
if (!runId || !/^[a-zA-Z0-9-]+$/.test(runId)) throw new Error('Run via node scripts/run-critical-coverage-shard.mjs');
const output = resolve(root, 'artifacts/consolidacao-2026-09-05/coverage-scope', shard, runId);
const sources = manifest.files.filter((file: { applicability: string }) => file.applicability === 'javascript-metrics');
const include = manifest.vitestTests.filter((path: string) => path.startsWith('tests/integration/') === (shard === 'vitest-integration'));
// Native node:test and process suites require their own instrumented shards.
for (const path of include) {
  if (/['"]node:test['"]/.test(readFileSync(resolve(root, path), 'utf8'))) throw new Error(`Native suite in Vitest shard: ${path}`);
}
export default defineConfig({
  plugins: [{
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
  resolve: { alias: createWorkspaceAliases(root) },
  test: {
    environment: 'node', globals: true, include,
    exclude: ['**/node_modules/**', '**/dist/**'],
    fileParallelism: false, pool: 'forks', maxWorkers: 1,
    testTimeout: 30_000, hookTimeout: 120_000, teardownTimeout: 120_000,
    globalSetup: ['tests/setup/global-setup.ts'],
    reporters: ['default', {
      onFinished(files = [], errors = []) {
        mkdirSync(output, { recursive: true });
        const hasIncompleteTask = (task: any): boolean => ['skip', 'todo'].includes(task.mode) || task.result?.state === 'fail' || (task.tasks ?? []).some(hasIncompleteTask);
        const missingTests = include.filter((path: string) => !files.some((file) => file.filepath === resolve(root, path)));
        const failed = errors.length > 0 || files.length === 0 || missingTests.length > 0 || files.some((file) => file.result?.state !== 'pass' || hasIncompleteTask(file));
        writeFileSync(resolve(output, 'test-result.json'), JSON.stringify({
          schemaVersion: 2, runId, shard, status: failed ? 'failed' : 'passed',
          missingTests, coverageFile: 'coverage-final.json', testFiles: files.length, errors: errors.length,
        }, null, 2));
      },
    }],
    coverage: {
      provider: 'v8', enabled: true, all: true,
      // Map executed and zero-hit ranges through the parsed source. The legacy
      // converter emits invalid synthetic function locations for untouched TS.
      experimentalAstAwareRemapping: true,
      include: sources.map((file: { path: string }) => file.path),
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/node_modules/**', '**/dist/**'],
      reporter: [[resolve(root, 'scripts/lib/critical-coverage-json-reporter.cjs'), {}], 'json-summary', 'text-summary'],
      reportsDirectory: output, tempDirectory: resolve(output, '.tmp'),
      reportOnFailure: true,
    },
  },
});
