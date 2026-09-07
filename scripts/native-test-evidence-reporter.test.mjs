import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { collectNativeTestEvidence } from './lib/native-test-evidence-reporter.mjs';

for (const [name, body, expected] of [
  ['pass', "test('runs', () => { console.log('untrusted stdout'); });", 'passed'],
  ['fail', "test('fails', () => { throw Error('failure'); });", 'failed'],
  ['cancel', "const controller = new AbortController(); test('cancelled', { signal: controller.signal }, async () => { controller.abort(); });", 'failed'],
  ['skip', "test.skip('skipped', () => {});", 'failed'],
  ['todo', "test.todo('unfinished');", 'failed'],
  ['empty', '', 'failed'],
  ['nested', "test('parent', async (t) => { await t.test('child', () => {}); });", 'passed'],
]) test(`real native ${name} run produces ${expected} evidence and raw V8`, () => {
  const root = mkdtempSync(join(tmpdir(), 'native-evidence-'));
  try {
    const file = join(root, 'fixture.test.mjs');
    writeFileSync(file, `import test from 'node:test';\n${body}\n`);
    const raw = join(root, 'v8');
    const env = { ...process.env, NODE_V8_COVERAGE: raw };
    // Launch an independent runner, not a child participating in this test's IPC.
    delete env.NODE_TEST_CONTEXT;
    const child = spawnSync(process.execPath, ['--test', '--test-reporter', fileURLToPath(new URL('./lib/native-test-evidence-reporter.mjs', import.meta.url)), file], {
      cwd: root, encoding: 'utf8', env, timeout: 15000,
    });
    assert.equal(child.error, undefined);
    assert.equal(child.signal, null);
    assert.equal(child.status, ['fail', 'cancel'].includes(name) ? 1 : 0);
    const result = JSON.parse(child.stdout);
    assert.equal(result.kind, 'native-test-observation');
    assert.equal(result.status, expected, JSON.stringify(result));
    // Node can classify child cancellation as failure in the global summary.
    if (name === 'cancel') assert.ok(result.files.some(({ counts }) => counts.cancelled > 0), JSON.stringify(result));
    if (name === 'empty') assert.equal(result.files.length, 0);
    else assert.equal(result.files[0].file, file);
    assert.ok(readdirSync(raw).some((path) => JSON.parse(readFileSync(join(raw, path))).result.some((entry) => entry.url.endsWith('/fixture.test.mjs'))));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('truncated event stream fails closed', async () => {
  assert.equal((await collectNativeTestEvidence([])).status, 'failed');
});

test('duplicate, invalid and inconsistent summaries cannot certify completion', async () => {
  const counts = { tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0, suites: 0, topLevel: 1 };
  const file = { type: 'test:summary', data: { file: '/fixture.test.mjs', success: true, counts } };
  const global = { type: 'test:summary', data: { success: true, counts } };
  for (const events of [
    [file],
    [file, global, global],
    [file, file, global],
    [file, { ...global, data: { success: true, counts: { ...counts, tests: 2, passed: 2 } } }],
    [file, { ...global, data: { success: true, counts: { ...counts, topLevel: 99 } } }],
    [file, { ...global, data: { success: true, counts: { ...counts, passed: 0.5 } } }],
    [file, global, { type: 'test:fail' }],
  ]) assert.equal((await collectNativeTestEvidence(events)).status, 'failed');
  const impossible = { ...counts, topLevel: 0 };
  assert.equal((await collectNativeTestEvidence([
    { ...file, data: { ...file.data, counts: impossible } },
    { ...global, data: { ...global.data, counts: impossible } },
  ])).status, 'failed');
});
