import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('resolved scope preserves excluded critical code and native runner gaps without claiming measurement', () => {
  const out = mkdtempSync(join(tmpdir(), 'cvg-coverage-scope-'));
  try {
    const run = () => {
      execFileSync(process.execPath, ['scripts/report-coverage-scope.mjs', out], { stdio: 'pipe' });
      return readFileSync(join(out, 'scope.json'), 'utf8');
    };
    const first = run();
    assert.equal(run(), first, 'identical worktree must produce byte-identical JSON');
    const report = JSON.parse(first);
    const byPath = new Map(report.files.map((file) => [file.path, file]));
    assert.equal(byPath.get('apps/api/src/routes/auth-routes.ts').status, 'excluded');
    assert.equal(byPath.get('apps/api/src/routes/auth-routes.ts').measuredCoverage, null);
    assert.ok(report.critical.find((item) => item.name === 'prescriptions').files.length > 0);
    assert.deepEqual(report.resolvedConfigs['vitest.integration.config.ts'].coverageExclude, report.resolvedConfigs['vitest.config.ts'].coverageExclude);
    const authTest = report.tests.find((item) => item.path === 'apps/api/src/routes/auth-routes.test.ts');
    assert.deepEqual(authTest.declaredRunners, ['node:test']);
    assert.deepEqual(authTest.selectedBy, []);
    assert.equal(authTest.apiPackageTestSelected, true);
    assert.ok(report.files.every((file) => file.sha256.length === 64 && file.measuredCoverage === null));
    assert.ok(report.tests.every((file) => file.executionStatus === 'not-run'));
    assert.deepEqual(report.globalThresholds, { lines: 82, functions: 82, branches: 82, statements: 82 });
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
