import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const helper = new URL('../tests/helpers/process-coverage-checkpoint.mts', import.meta.url).href;
const root = fileURLToPath(new URL('../', import.meta.url));

for (const enabled of [true, false]) test(`checkpoint coverage before SIGKILL, enabled=${enabled}`, { timeout: 15000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), 'cvg-coverage-checkpoint-'));
  const raw = join(directory, 'v8');
  mkdirSync(raw);
  const script = join(directory, 'fixture.mjs');
  writeFileSync(script, `import { flushProcessCoverageCheckpoint } from ${JSON.stringify(helper)};
function exercised() { return 42; }
function untouched() { return 0; }
exercised();
flushProcessCoverageCheckpoint();
exercised();
exercised();
flushProcessCoverageCheckpoint();
process.stdout.write('CHECKPOINT\\n');
setInterval(() => {}, 1000);
`, { flag: 'wx' });
  const env = { PATH: process.env.PATH, NODE_ENV: 'test', NODE_V8_COVERAGE: raw };
  if (enabled) env.CVG_CRITICAL_PROCESS_COVERAGE = '1';
  const child = spawn(process.execPath, ['--import', 'tsx/esm', script], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let errorText = '';
  child.stderr.on('data', (bytes) => { errorText += bytes; });
  const terminal = new Promise((done, reject) => { child.once('error', reject); child.once('close', (code, signal) => done({ code, signal })); });
  const lines = createInterface({ input: child.stdout });
  let timer;
  try {
    const checkpoint = new Promise((done) => lines.on('line', (line) => { if (line === 'CHECKPOINT') done(); }));
    await Promise.race([checkpoint, terminal.then(() => { throw new Error(`fixture exited before checkpoint: ${errorText}`); }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('checkpoint timeout')), 10000); })]);
    clearTimeout(timer);
    // Inspect while the child is alive: no exit hook can create these reports.
    const mainReports = () => readdirSync(raw).filter((name) => new RegExp(`^coverage-${child.pid}-[0-9]+-0\\.json$`).test(name));
    const reportsBeforeKill = mainReports();
    assert.equal(reportsBeforeKill.length, enabled ? 2 : 0);
    child.kill('SIGKILL');
    assert.deepEqual(await terminal, { code: null, signal: 'SIGKILL' });
    assert.deepEqual(mainReports(), reportsBeforeKill);
    if (enabled) {
      const functions = reportsBeforeKill.flatMap((name) => JSON.parse(readFileSync(join(raw, name))).result)
        .filter((entry) => entry.url === pathToFileURL(script).href).flatMap((entry) => entry.functions);
      assert.equal(functions.filter((entry) => entry.functionName === 'exercised').reduce((sum, entry) => sum + entry.ranges[0].count, 0), 3);
      assert.ok(functions.some((entry) => entry.functionName === 'untouched'));
      assert.equal(functions.filter((entry) => entry.functionName === 'untouched').reduce((sum, entry) => sum + entry.ranges[0].count, 0), 0);
    }
  } finally {
    clearTimeout(timer);
    lines.close();
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await terminal;
  }
});

for (const mode of ['missing-coverage', 'not-test']) test(`checkpoint refuses invalid opt-in: ${mode}`, () => {
  const directory = mkdtempSync(join(tmpdir(), 'cvg-coverage-checkpoint-guard-'));
  const env = { PATH: process.env.PATH, CVG_CRITICAL_PROCESS_COVERAGE: '1' };
  if (mode === 'missing-coverage') env.NODE_ENV = 'test';
  else { env.NODE_ENV = 'production'; env.NODE_V8_COVERAGE = directory; }
  const child = spawnSync(process.execPath, ['--import', 'tsx/esm', '--input-type=module', '-e', `import { flushProcessCoverageCheckpoint } from ${JSON.stringify(helper)}; flushProcessCoverageCheckpoint();`], {
    cwd: root, env, encoding: 'utf8', timeout: 10000
  });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /requires NODE_ENV=test and NODE_V8_COVERAGE/);
});
