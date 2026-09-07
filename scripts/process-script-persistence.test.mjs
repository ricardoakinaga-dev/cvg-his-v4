import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { constants, closeSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readlinkSync, readdirSync, renameSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { convertNativeScript } from './lib/native-v8-conversion.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const persistenceUrl = new URL('./lib/process-script-persistence.mjs', import.meta.url).href;
const choiceSource = 'export function choose(value: boolean): number {\n  return value ? 1 : 2;\n}\n';

function createFixture(prefix = 'cvg-process-script-persistence-') {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const packages = join(root, 'packages');
  const ignoredDirectory = join(packages, 'node_modules');
  const raw = join(root, 'coverage');
  const outside = join(root, 'outside');
  mkdirSync(packages, { mode: 0o700 });
  mkdirSync(ignoredDirectory, { mode: 0o700 });
  mkdirSync(raw, { mode: 0o700 });
  mkdirSync(outside, { mode: 0o700 });

  const choice = join(packages, 'choice.mts');
  const ignored = join(ignoredDirectory, 'ignored.mjs');
  const late = join(packages, 'late.cjs');
  const outsideSentinel = join(outside, 'sentinel.txt');
  writeFileSync(choice, choiceSource, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  writeFileSync(ignored, 'export const ignored = true;\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  writeFileSync(late, 'module.exports = { late: true };\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  writeFileSync(outsideSentinel, 'do-not-overwrite\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });

  return {
    root,
    raw,
    outside,
    choice,
    choiceUrl: pathToFileURL(choice).href,
    choiceSource,
    ignored,
    late,
    outsideSentinel,
    moved: `${raw}-moved`
  };
}

function pinnedEnvironment(descriptor) {
  return {
    PATH: process.env.PATH ?? '',
    NODE_ENV: 'test',
    CVG_CRITICAL_PROCESS_COVERAGE: '1',
    NODE_V8_COVERAGE: `/proc/${process.pid}/fd/${descriptor}`
  };
}

function runChild(fixture, program, timeout = 15000) {
  const descriptor = openSync(fixture.raw, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    return spawnSync(process.execPath, ['--import', 'tsx/esm', '--input-type=module', '-e', program], {
      cwd: repoRoot,
      env: pinnedEnvironment(descriptor),
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout
    });
  } finally {
    closeSync(descriptor);
  }
}

function childJson(child) {
  assert.equal(child.error, undefined, child.error?.stack ?? child.error?.message);
  const output = child.stdout.trim();
  assert.notEqual(output, '', `child produced no JSON; stderr=${child.stderr}`);
  try {
    return JSON.parse(output.split('\n').at(-1));
  } catch (error) {
    assert.fail(`child output was not JSON: ${error.message}\nstdout=${child.stdout}\nstderr=${child.stderr}`);
  }
}

function observationNames(directory) {
  return readdirSync(directory)
    .filter((name) => /^executed-script-[0-9]+-[0-9]+-[0-9]+\.json$/.test(name))
    .filter((name) => lstatSync(join(directory, name)).isFile())
    .sort();
}

function observations(directory) {
  return observationNames(directory).map((name) => ({
    name,
    mode: lstatSync(join(directory, name)).mode & 0o777,
    value: JSON.parse(readFileSync(join(directory, name), 'utf8'))
  }));
}

function v8Reports(directory) {
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json') && !name.startsWith('executed-script-'))
    .map((name) => ({ name, report: JSON.parse(readFileSync(join(directory, name), 'utf8')) }))
    .filter(({ report }) => Array.isArray(report.result));
}

function assertBoundToV8(fixture, observation) {
  const match = v8Reports(fixture.raw)
    .flatMap(({ name, report }) => report.result.map((coverage) => ({ name, report, coverage })))
    .find(({ coverage }) => coverage.scriptId === observation.scriptId && coverage.url === observation.url);
  assert.ok(match, `no V8 entry bound to ${observation.url}#${observation.scriptId}`);
  assert.match(match.name, new RegExp(`^coverage-${observation.pid}-`), 'V8 report PID must match the persisted observation');
  const sourceMap = match.report['source-map-cache']?.[observation.url]?.data;
  assert.ok(sourceMap, `no source-map-cache entry for ${observation.url}`);
  return { coverage: match.coverage, sourceMap };
}

test('captures executed file URLs regardless of source suffix without crossing repository boundaries', { timeout: 20000 }, () => {
  const fixture = createFixture();
  const eligible = ['module.js', 'module.ts', 'module.jsx', 'module.tsx', 'Component.vue', 'generated', 'Component.vue?type=script'].map(name => `${pathToFileURL(join(fixture.root, 'packages')).href}/${name}`);
  const excluded = [
    pathToFileURL(join(fixture.root, 'outside', 'module.tsx')).href,
    pathToFileURL(join(fixture.root, 'packages', 'node_modules', 'module.tsx')).href,
    pathToFileURL(join(fixture.root, 'packages-other', 'module.tsx')).href,
    'https://example.invalid/module.tsx'
  ];
  const code = 'globalThis.cvgSuffixProbe = (globalThis.cvgSuffixProbe ?? 0) + 1;';
  const child = runChild(fixture, `
    import { Script } from 'node:vm';
    import { takeCoverage } from 'node:v8';
    import { startProcessScriptPersistence } from ${JSON.stringify(persistenceUrl)};
    const writer = await startProcessScriptPersistence({ root: ${JSON.stringify(fixture.root)} });
    for (const filename of ${JSON.stringify([...eligible, ...excluded])}) new Script(${JSON.stringify(code)}, {filename}).runInThisContext();
    writer.flush(); takeCoverage(); writer.close();
  `);
  assert.equal(child.status, 0, child.stderr);
  const records = observations(fixture.raw).map(item => item.value);
  assert.deepEqual(records.map(item => item.url).sort(), eligible.slice().sort());
  const entries = v8Reports(fixture.raw).flatMap(item => item.report.result);
  for (const record of records) {
    assert.equal(record.code, code);
    assert.equal(record.pid, child.pid);
    assert.equal(record.sha256, createHash('sha256').update(code).digest('hex'));
    assert.ok(entries.some(item => item.scriptId === record.scriptId && item.url === record.url));
  }
});

test('persists one eager runtime script with V8 identity, conversion and lifecycle guards', { timeout: 20000, concurrency: false }, async () => {
  const fixture = createFixture();
  const program = `
    import { url as inspectorUrl } from 'node:inspector';
    import { takeCoverage } from 'node:v8';
    import { startProcessScriptPersistence } from ${JSON.stringify(persistenceUrl)};
    const writer = await startProcessScriptPersistence({ root: ${JSON.stringify(fixture.root)}, maxScripts: 10000 });
    const { choose } = await import(${JSON.stringify(fixture.choiceUrl)});
    const { ignored } = await import(${JSON.stringify(pathToFileURL(fixture.ignored).href)});
    if (choose(true) !== 1 || ignored !== true) throw new Error('fixture behavior changed');
    writer.flush();
    writer.flush();
    const frozen = Object.isFrozen(writer);
    const debuggerUrl = inspectorUrl() ?? null;
    takeCoverage();
    writer.close();
    writer.close();
    let closedError = null;
    try { writer.flush(); } catch (error) { closedError = error.message; }
    process.stdout.write(JSON.stringify({ pid: process.pid, frozen, debuggerUrl, closedError }));
  `;
  const child = runChild(fixture, program);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.signal, null);
  const result = childJson(child);
  assert.equal(result.frozen, true);
  assert.equal(result.debuggerUrl, null, 'local inspector session must not expose an endpoint');
  assert.match(result.closedError, /closed/);

  const files = observations(fixture.raw);
  assert.equal(files.length, 1, 'multiple flushes must not duplicate a captured source');
  const [{ name, mode, value: observation }] = files;
  assert.equal(mode, 0o600);
  assert.deepEqual(Object.keys(observation).sort(), ['code', 'kind', 'pid', 'schemaVersion', 'scriptId', 'sha256', 'threadId', 'url']);
  assert.equal(observation.schemaVersion, 1);
  assert.equal(observation.kind, 'executed-script-observation');
  assert.equal(observation.pid, result.pid);
  assert.equal(observation.threadId, 0);
  assert.equal(observation.url, fixture.choiceUrl);
  assert.match(observation.scriptId, /^[0-9]+$/);
  assert.equal(observation.sha256, createHash('sha256').update(observation.code).digest('hex'));
  assert.equal(observation.code.includes(': boolean'), false, 'persisted source must be transformed runtime JS');
  assert.equal(observation.code.includes(': number'), false, 'persisted source must be transformed runtime JS');
  assert.match(observation.code, /return value\?1:2/);
  assert.equal(name, `executed-script-${observation.pid}-${observation.threadId}-${observation.scriptId}.json`);

  const { coverage, sourceMap } = assertBoundToV8(fixture, observation);
  const mapped = await convertNativeScript({
    coverage,
    code: observation.code,
    sourceMap,
    sources: { [fixture.choiceUrl]: fixture.choiceSource }
  });
  const original = mapped[fileURLToPath(fixture.choiceUrl)];
  assert.ok(original, 'native coverage must map back to the authenticated TS source');
  assert.ok(Object.values(original.b).flat().includes(0), 'the unexecuted branch must remain uncovered');
});

test('keeps the pinned FD sink after its pathname is renamed and replaced by a symlink', { timeout: 20000, concurrency: false }, () => {
  const fixture = createFixture('cvg-process-script-persistence-fd-');
  const program = `
    import { renameSync, symlinkSync } from 'node:fs';
    import { takeCoverage } from 'node:v8';
    import { url as inspectorUrl } from 'node:inspector';
    import { startProcessScriptPersistence } from ${JSON.stringify(persistenceUrl)};
    const writer = await startProcessScriptPersistence({ root: ${JSON.stringify(fixture.root)}, maxScripts: 10000 });
    renameSync(${JSON.stringify(fixture.raw)}, ${JSON.stringify(fixture.moved)});
    symlinkSync(${JSON.stringify(fixture.outside)}, ${JSON.stringify(fixture.raw)}, 'dir');
    const { choose } = await import(${JSON.stringify(fixture.choiceUrl)});
    if (choose(true) !== 1) throw new Error('fixture behavior changed');
    writer.flush();
    writer.flush();
    takeCoverage();
    const debuggerUrl = inspectorUrl() ?? null;
    writer.close();
    process.stdout.write(JSON.stringify({ pid: process.pid, debuggerUrl }));
  `;
  const child = runChild(fixture, program);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.signal, null);
  assert.equal(childJson(child).debuggerUrl, null);
  assert.equal(lstatSync(fixture.raw).isSymbolicLink(), true);
  assert.deepEqual(readdirSync(fixture.outside), ['sentinel.txt'], 'the replacement symlink target must stay untouched');
  assert.equal(readFileSync(fixture.outsideSentinel, 'utf8'), 'do-not-overwrite\n');
  assert.equal(observations(fixture.moved).length, 1, 'the observation must follow the pinned descriptor');
  assert.ok(v8Reports(fixture.moved).length >= 1, 'V8 must also write through the pinned directory');
});

test('rejects a one-byte capture and propagates the failure to the child exit status', { timeout: 20000, concurrency: false }, () => {
  const fixture = createFixture('cvg-process-script-persistence-limit-');
  const program = `
    import { startProcessScriptPersistence } from ${JSON.stringify(persistenceUrl)};
    const writer = await startProcessScriptPersistence({ root: ${JSON.stringify(fixture.root)}, maxBytes: 1, maxScripts: 10000 });
    const { choose } = await import(${JSON.stringify(fixture.choiceUrl)});
    if (choose(true) !== 1) throw new Error('fixture behavior changed');
    await new Promise((resolve) => setImmediate(resolve));
    let flushError = null;
    try { writer.flush(); } catch (error) { flushError = error.message; }
    writer.close();
    await new Promise((resolve) => setImmediate(resolve));
    process.stdout.write(JSON.stringify({ flushError, exitCode: process.exitCode ?? 0 }));
  `;
  const child = runChild(fixture, program);
  assert.equal(child.status, 1, child.stderr);
  assert.equal(child.signal, null);
  const result = childJson(child);
  assert.match(result.flushError, /closed, failed or incomplete/);
  assert.equal(result.exitCode, 1, 'observed capture failure must set process.exitCode');
  assert.deepEqual(observationNames(fixture.raw), []);
});

test('leaves the writer open for a late synchronous exit listener to require a custom-root CJS source', { timeout: 20000, concurrency: false }, () => {
  const fixture = createFixture('cvg-process-script-persistence-late-');
  const program = `
    import { createRequire } from 'node:module';
    import { startProcessScriptPersistence } from ${JSON.stringify(persistenceUrl)};
    const writer = await startProcessScriptPersistence({ root: ${JSON.stringify(fixture.root)}, maxScripts: 10000 });
    const require = createRequire(import.meta.url);
    process.once('exit', () => {
      try { writer.flush(); } catch (error) { process.exitCode = 1; }
    });
    process.once('exit', () => {
      require(${JSON.stringify(fixture.late)});
    });
    process.exit(0);
  `;
  const child = runChild(fixture, program);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.signal, null);
  const files = observations(fixture.raw);
  assert.equal(files.length, 1, 'the late exit listener must be observed without closing the writer');
  const [observation] = files;
  assert.equal(observation.value.url, pathToFileURL(fixture.late).href);
  assert.equal(observation.value.code.includes('module.exports'), true);
});

test('does not overwrite an existing destination symlink when its script ID is observed first', { timeout: 20000, concurrency: false }, () => {
  const fixture = createFixture('cvg-process-script-persistence-symlink-');
  const program = `
    import { Session } from 'node:inspector';
    import { symlinkSync } from 'node:fs';
    import { startProcessScriptPersistence } from ${JSON.stringify(persistenceUrl)};
    const probe = new Session();
    probe.connect();
    let knownScriptId = null;
    let probeError = null;
    probe.on('Debugger.scriptParsed', ({ params }) => {
      if (params.url !== ${JSON.stringify(fixture.choiceUrl)} || knownScriptId !== null) return;
      knownScriptId = params.scriptId;
      try {
        symlinkSync(
          ${JSON.stringify(fixture.outsideSentinel)},
          ${JSON.stringify(fixture.raw)} + '/executed-script-' + process.pid + '-0-' + params.scriptId + '.json'
        );
      } catch (error) { probeError = error.message; }
    });
    await new Promise((resolve, reject) => probe.post('Debugger.enable', {}, (error) => error ? reject(error) : resolve()));
    const writer = await startProcessScriptPersistence({ root: ${JSON.stringify(fixture.root)}, maxScripts: 10000 });
    const { choose } = await import(${JSON.stringify(fixture.choiceUrl)});
    if (choose(true) !== 1) throw new Error('fixture behavior changed');
    await new Promise((resolve) => setImmediate(resolve));
    let flushError = null;
    try { writer.flush(); } catch (error) { flushError = error.message; }
    writer.close();
    probe.disconnect();
    process.stdout.write(JSON.stringify({ knownScriptId, probeError, flushError, exitCode: process.exitCode ?? 0 }));
  `;
  const child = runChild(fixture, program);
  assert.equal(child.status, 1, child.stderr);
  assert.equal(child.signal, null);
  const result = childJson(child);
  assert.match(result.knownScriptId, /^[0-9]+$/);
  assert.equal(result.probeError, null);
  assert.match(result.flushError, /closed, failed or incomplete/);
  assert.equal(result.exitCode, 1);
  const symlinkName = readdirSync(fixture.raw).find((name) => name.endsWith(`-${result.knownScriptId}.json`));
  assert.ok(symlinkName, 'the known destination symlink must remain present');
  assert.equal(lstatSync(join(fixture.raw, symlinkName)).isSymbolicLink(), true);
  assert.equal(readlinkSync(join(fixture.raw, symlinkName)), fixture.outsideSentinel);
  assert.equal(readFileSync(fixture.outsideSentinel, 'utf8'), 'do-not-overwrite\n');
  assert.equal(observationNames(fixture.raw).length, 0);
});
