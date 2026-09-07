import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectEnterpriseCi } from './lib/enterprise-ci-evidence.mjs';

const specs = ['e2e/spa/master-search-360-reception.spec.ts', 'e2e/spa/master-search-360-mobile.spec.ts', 'e2e/spa/enterprise-surfaces-gate.spec.ts'];
const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const config = readFileSync(new URL('../playwright-spa.config.ts', import.meta.url), 'utf8');
const command = 'npx playwright test --config playwright-spa.config.ts';
const inspect = (workflow = ci, source = config) => inspectEnterpriseCi(workflow, source, specs);

test('actual CI schedules the full required suite without literal spec names', () => {
  assert.deepEqual(inspect(), { blocking: true, specs: [true, true, true] });
});
for (const suffix of [' --list', ' -g Visual', ' --project chromium', ' e2e/spa/other.spec.ts', ' || true']) {
  test(`does not accept filtered/non-executing invocation ${suffix}`, () => {
    assert.deepEqual(inspect(ci.replaceAll(command, command + suffix)).specs, [false, false, false]);
  });
}
test('a required spec excluded in config stays unproven', () => {
  const result = inspect(ci, config.replace('**/tenant-isolation-db.spec.ts', '**/master-search-360-mobile.spec.ts'));
  assert.deepEqual(result.specs, [true, false, true]);
});
test('unknown ignores, testMatch, and wrong testDir fail closed', () => {
  for (const changed of [config.replace('**/tenant-isolation-db.spec.ts', '**/*360*'), config.replace("testDir: './e2e/spa',", "testDir: './e2e/spa', testMatch: /other/,"), config.replace("testDir: './e2e/spa'", "testDir: './other'")]) {
    assert.deepEqual(inspect(ci, changed).specs, [false, false, false]);
  }
});
test('missing or duplicate named step does not certify blocking', () => {
  assert.equal(inspect(ci.replace('name: Run SPA E2E tests', 'name: Other')).blocking, false);
  assert.equal(inspect(ci.replace('name: Run SPA E2E tests', 'name: Run SPA E2E tests\n      - name: Run SPA E2E tests')).blocking, false);
});
test('root and project filters cannot silently remove required tests', () => {
  for (const changed of [config.replace("testDir: './e2e/spa',", "testDir: './e2e/spa', grep: /Visual/,"), config.replace("name: 'chromium',", "name: 'chromium', testIgnore: ['**/master-search-360-mobile.spec.ts'],")]) {
    assert.deepEqual(inspect(ci, changed).specs, [false, false, false]);
  }
});
test('step and job continue-on-error are evaluated as YAML booleans', () => {
  assert.equal(inspect(ci.replace('name: Run SPA E2E tests', 'name: Run SPA E2E tests\n        continue-on-error: true')).blocking, false);
  assert.equal(inspect(ci.replace('name: Run SPA E2E tests', 'name: Run SPA E2E tests\n        continue-on-error: false')).blocking, true);
  const workflow = `jobs:\n  e2e:\n    continue-on-error: true\n    steps:\n      - name: Run SPA E2E tests\n        run: ${command}\n`;
  assert.equal(inspect(workflow).blocking, false);
});
