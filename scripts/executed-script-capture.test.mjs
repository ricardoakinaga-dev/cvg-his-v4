import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { convertNativeScript } from './lib/native-v8-conversion.mjs';

const captureUrl = new URL('./lib/executed-script-capture.mjs', import.meta.url).href;
const root = fileURLToPath(new URL('../', import.meta.url));

for (const limited of [false, true]) test(`captures actual tsx execution source; byte limit=${limited}`, async () => {
  const directory = mkdtempSync(join(tmpdir(), 'cvg-executed-source-'));
  const raw = join(directory, 'v8'); mkdirSync(raw);
  const source = 'export function choose(value: boolean): number { return value ? 1 : 2; }\n';
  const original = join(directory, 'choice.mts'); writeFileSync(original, source, { flag: 'wx' });
  const originalUrl = pathToFileURL(original).href;
  const snapshot = join(directory, 'captured.json');
  const program = `import { startExecutedScriptCapture } from ${JSON.stringify(captureUrl)};
import { writeFileSync } from 'node:fs';
import { takeCoverage } from 'node:v8';
import { url } from 'node:inspector';
const capture = await startExecutedScriptCapture({acceptUrl: candidate => candidate === ${JSON.stringify(originalUrl)}, maxBytes: ${limited ? 1 : 1000000}});
try {
  const {choose} = await import(${JSON.stringify(originalUrl)});
  if (choose(true) !== 1) throw new Error('fixture behavior changed');
  writeFileSync(${JSON.stringify(snapshot)}, JSON.stringify({scripts:capture.snapshot(), debuggerUrl:url() ?? null}), {flag:'wx'});
  takeCoverage();
} finally { capture.close(); }
`;
  const child = spawnSync(process.execPath, ['--import', 'tsx/esm', '--input-type=module', '-e', program], {
    cwd: root, env: { PATH: process.env.PATH, NODE_ENV: 'test', NODE_V8_COVERAGE: raw }, encoding: 'utf8', timeout: 10000
  });
  if (limited) {
    assert.equal(child.status, 1);
    assert.match(child.stderr, /capture is closed, failed or incomplete/);
    return;
  }
  assert.equal(child.status, 0, child.stderr);
  const captured = JSON.parse(readFileSync(snapshot));
  assert.equal(captured.debuggerUrl, null, 'capture must not open a network inspector');
  assert.equal(captured.scripts.length, 1);
  const script = captured.scripts[0];
  assert.equal(script.url, originalUrl);
  assert.equal(script.code.includes(': boolean'), false);
  assert.equal(script.sha256, createHash('sha256').update(script.code).digest('hex'));
  const reports = readdirSync(raw).filter((name) => name.endsWith('-0.json')).map((name) => JSON.parse(readFileSync(join(raw, name))));
  const report = reports.find((report) => report.result.some((entry) => entry.scriptId === script.scriptId && entry.url === originalUrl));
  assert.ok(report);
  const coverage = report.result.find((entry) => entry.scriptId === script.scriptId && entry.url === originalUrl);
  const sourceMap = report['source-map-cache'][originalUrl].data;
  const mapped = await convertNativeScript({ coverage, code: script.code, sourceMap, sources: { [originalUrl]: source } });
  assert.ok(mapped[original]);
  assert.ok(Object.values(mapped[original].b).flat().includes(0), 'unexecuted branch must remain uncovered');
});

test('empty scripts and metadata consume the capture budget', () => {
  const program = `import {startExecutedScriptCapture} from ${JSON.stringify(captureUrl)};
    import vm from 'node:vm';
    const capture = await startExecutedScriptCapture({acceptUrl: url => url.startsWith('file:///budget/'), maxBytes:200});
    for(let i=0;i<10;i++)new vm.Script('',{filename:'file:///budget/'+i+'.js'}).runInThisContext();
    try { capture.snapshot(); process.exitCode=3; } catch { process.exitCode=0; } finally { capture.close(); }
  `;
  const child=spawnSync(process.execPath,['--input-type=module','-e',program],{env:{PATH:process.env.PATH},encoding:'utf8',timeout:10000});
  assert.equal(child.status,0,child.stderr);
});

test('record count is bounded independently of byte budget', () => {
  const program = `import {startExecutedScriptCapture} from ${JSON.stringify(captureUrl)};
    import vm from 'node:vm';
    const capture=await startExecutedScriptCapture({acceptUrl:url=>url.startsWith('file:///count/'),maxScripts:2,maxBytes:1000000});
    new vm.Script('',{filename:'file:///count/1.js'}).runInThisContext();
    new vm.Script('',{filename:'file:///count/2.js'}).runInThisContext();
    if(capture.snapshot().length!==2)throw Error('valid count rejected');
    new vm.Script('',{filename:'file:///count/3.js'}).runInThisContext();
    try{capture.snapshot();process.exitCode=3;}catch{process.exitCode=0;}finally{capture.close();}
  `;
  const child=spawnSync(process.execPath,['--input-type=module','-e',program],{env:{PATH:process.env.PATH},encoding:'utf8',timeout:10000});
  assert.equal(child.status,0,child.stderr);
});
