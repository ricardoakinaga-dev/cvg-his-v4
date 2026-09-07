import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, openSync, closeSync, readdirSync, readFileSync, statSync, constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { acquireCriticalProcessCoverage } from '../infra/scripts/critical-process-coverage.mjs';

const root = resolve(import.meta.dirname, '..');
const typesModule = pathToFileURL(join(root, 'packages/shared/types/dist/index.js')).href;
const commonModule = pathToFileURL(join(root, 'apps/api/src/helpers/common.ts')).href;
const checkpoint = pathToFileURL(join(root, 'tests/helpers/process-coverage-checkpoint.mts')).href;

for (const mode of ['main', 'worker', 'late-exit', 'late-exit-write-failure']) test(`canonical preload captures ${mode} isolate code`, { timeout: 20000, skip: mode === 'late-exit-write-failure' && process.getuid?.() === 0 }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'cvg-source-preload-test-'));
  const raw = join(directory, 'raw');
  mkdirSync(raw);
  const descriptor = openSync(raw, constants.O_RDONLY | constants.O_DIRECTORY);
  let session;
  try {
    session = acquireCriticalProcessCoverage({ NODE_ENV: 'test', CVG_CRITICAL_PROCESS_COVERAGE: '1', NODE_V8_COVERAGE: `/proc/${process.pid}/fd/${descriptor}`, NODE_OPTIONS: '--require=untrusted-parent-option' });
  } finally { closeSync(descriptor); }
  try {
    assert.equal(session.environment.NODE_OPTIONS, `--import=${new URL('./lib/critical-process-source-preload.mjs', import.meta.url).href}`);
    const programs = {
      main: `import {validateRequestBody} from ${JSON.stringify(commonModule)}; import {flushProcessCoverageCheckpoint} from ${JSON.stringify(checkpoint)}; validateRequestBody({name:'ok'},{name:{type:'string',required:true}},'fixture'); flushProcessCoverageCheckpoint();`,
      worker: `import {Worker} from 'node:worker_threads'; import {once} from 'node:events'; const worker = new Worker(new URL('data:text/javascript,'+encodeURIComponent(${JSON.stringify(`import ${JSON.stringify(typesModule)};`)})), {execArgv:[]}); const [code]=await once(worker,'exit'); if(code!==0) throw Error('worker failed');`,
      'late-exit': `import {createRequire} from 'node:module'; const require=createRequire(${JSON.stringify(import.meta.url)}); process.on('exit',()=>require(${JSON.stringify(fileURLToPath(typesModule))}));`,
      'late-exit-write-failure': `import {createRequire} from 'node:module'; import {chmodSync} from 'node:fs'; const require=createRequire(${JSON.stringify(import.meta.url)}); process.on('exit',()=>{chmodSync(process.env.NODE_V8_COVERAGE,0o500); require(${JSON.stringify(fileURLToPath(typesModule))});});`
    };
    const child = spawnSync(process.execPath, ['--import', 'tsx/esm', '--input-type=module', '-e', programs[mode]], {
      cwd: root, env: { PATH: process.env.PATH, NODE_ENV: 'test', ...session.environment }, encoding: 'utf8', timeout: 15000
    });
    if (mode === 'late-exit-write-failure') {
      assert.equal(child.status, 1, child.stderr);
      assert.equal(readdirSync(raw).filter(name => name.startsWith('executed-script-')).length, 0);
      return;
    }
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.signal, null);
    const names = readdirSync(raw);
    const records = names.filter(name => name.startsWith('executed-script-')).map(name => {
      const path = join(raw, name);
      assert.equal(statSync(path).mode & 0o777, 0o600);
      const record = JSON.parse(readFileSync(path));
      assert.equal(record.kind, 'executed-script-observation');
      assert.equal(record.sha256, createHash('sha256').update(record.code).digest('hex'));
      return record;
    });
    const source = records.find(record => record.url === (mode === 'main' ? commonModule : typesModule));
    assert.ok(source, 'actual module must have an executed-source observation');
    assert.equal(source.pid, child.pid);
    if (mode === 'worker') assert.ok(source.threadId > 0); else assert.equal(source.threadId, 0);
    const reports = names.filter(name => name.startsWith(`coverage-${child.pid}-`) && name.endsWith(`-${source.threadId}.json`)).map(name => JSON.parse(readFileSync(join(raw, name))));
    assert.ok(reports.some(report => report.result.some(script => script.scriptId === source.scriptId && script.url === source.url)));
  } finally { chmodSync(raw, 0o700); session.close(); }
});
