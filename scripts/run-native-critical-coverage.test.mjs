import test from 'node:test';
import assert from 'node:assert/strict';
import fs, { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, delimiter } from 'node:path';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { sha256 } from './run-critical-coverage-shard.mjs';
import { runNativeCriticalCoverage } from './run-native-critical-coverage.mjs';
const require = createRequire(import.meta.url);

for (const mode of ['pass', 'test-failure', 'source-drift', 'build-failure', 'code-symlink', 'map-symlink', 'output-symlink', 'internal-code-symlink', 'internal-map-symlink', 'output-replaced', 'build-map-symlink', 'raw-symlink']) test(`native wrapper ${mode} with real compilation, subprocess tests and V8`, async () => {
  const root = mkdtempSync(join(tmpdir(), 'native-wrapper-'));
  const outside = mkdtempSync(join(tmpdir(), 'native-wrapper-outside-'));
  const previousPath = process.env.PATH;
  const originalRead = fs.readFileSync;
  try {
    for (const path of ['bin', 'apps/worker/src', 'apps/worker/dist', 'packages', 'scripts/lib', 'docs/engineering']) mkdirSync(join(root, path), { recursive: true });
    writeFileSync(join(root, 'apps/worker/package.json'), '{"type":"module"}');
    const sourcePath = 'apps/worker/src/choice.ts';
    const testPath = 'apps/worker/src/choice.test.ts';
    const source = 'export function choose(value: boolean) { return value ? 1 : 2; }\n';
    writeFileSync(join(root, sourcePath), source);
    writeFileSync(join(outside, 'sentinel'), 'outside-content-must-not-be-read');
    const substitution = mode === 'raw-symlink'
      ? `fs.writeFileSync('raw.preserved',JSON.stringify({result:[]}));fs.symlinkSync(fs.realpathSync('.')+'/raw.preserved',process.env.NODE_V8_COVERAGE+'/substituted.json');`
      : mode.startsWith('internal-')
      ? `const target='apps/worker/dist/choice.js${mode === 'internal-map-symlink' ? '.map' : ''}'; fs.copyFileSync(target,target+'.preserved'); fs.unlinkSync(target); fs.symlinkSync('choice.js${mode === 'internal-map-symlink' ? '.map' : ''}.preserved',target);`
      : mode === 'code-symlink' || mode === 'map-symlink'
      ? `const target='apps/worker/dist/choice.js${mode === 'map-symlink' ? '.map' : ''}'; fs.unlinkSync(target); fs.symlinkSync(${JSON.stringify(join(outside, 'sentinel'))},target);`
      : mode === 'output-symlink' ? `const output=dirname(fs.realpathSync(process.env.NODE_V8_COVERAGE)); fs.renameSync(output,output+'-preserved'); fs.symlinkSync(${JSON.stringify(outside)},output,'dir');`
      : mode === 'output-replaced' ? `const output=dirname(fs.realpathSync(process.env.NODE_V8_COVERAGE)); fs.renameSync(output,output+'-preserved'); fs.cpSync(output+'-preserved',output,{recursive:true});` : '';
    writeFileSync(join(root, testPath), `import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import {dirname} from 'node:path'; import {choose} from './choice.js'; test('choose', () => { assert.equal(choose(true), ${mode === 'test-failure' ? 9 : 1}); ${substitution} });\n`);
    const reporter = 'scripts/lib/native-test-evidence-reporter.mjs';
    writeFileSync(join(root, reporter), readFileSync(resolve(reporter)));
    writeFileSync(join(root, 'bin/git'), `#!${process.execPath}\nconsole.log('fixture');\n`, { mode: 0o700 });
    // Stub only package orchestration; transpilation and native execution are real.
    writeFileSync(join(root, 'bin/pnpm'), `#!${process.execPath}
const fs=require('node:fs');
const ts=require(${JSON.stringify(require.resolve('typescript'))});
if (${JSON.stringify(mode)} === 'build-failure') process.exit(1);
for(const name of ['choice','choice.test']) {
 const file='apps/worker/src/'+name+'.ts';
 const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:name+'.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,sourceMap:true}});
 const map=JSON.parse(out.sourceMapText);map.sources=['../src/'+name+'.ts'];
 fs.writeFileSync('apps/worker/dist/'+name+'.js',out.outputText);
 fs.writeFileSync('apps/worker/dist/'+name+'.js.map',JSON.stringify(map));
}
if (${JSON.stringify(mode)} === 'source-drift') fs.appendFileSync('apps/worker/src/choice.ts','// drift\\n');
if (${JSON.stringify(mode)} === 'build-map-symlink') { const target='apps/worker/dist/choice.test.js.map';fs.renameSync(target,target+'.preserved');fs.symlinkSync('choice.test.js.map.preserved',target); }
`, { mode: 0o700 });
    const manifest = { head: 'fixture', nativeTests: { 'native-worker': [testPath] }, executionInputs: [sourcePath, testPath, reporter], files: [{ path: sourcePath, sha256: sha256(source), applicability: 'javascript-metrics' }] };
    writeFileSync(join(root, 'docs/engineering/critical-coverage-scope.json'), JSON.stringify(manifest));
    process.env.PATH = join(root, 'bin') + delimiter + previousPath;
    if (mode === 'build-failure') {
      await assert.rejects(() => runNativeCriticalCoverage(root, 'native-worker'), /native build failed/);
      return;
    }
    if (mode === 'source-drift') {
      await assert.rejects(() => runNativeCriticalCoverage(root, 'native-worker'), /source inputs changed during build/);
      return;
    }
    if (mode.endsWith('-symlink') || mode === 'output-replaced') {
      const substitutedReads = [];
      fs.readFileSync = (path, ...args) => {
        if (String(path).endsWith('.preserved') || String(path) === join(outside, 'sentinel')) substitutedReads.push(String(path));
        return originalRead(path, ...args);
      };
      syncBuiltinESMExports();
      await assert.rejects(() => runNativeCriticalCoverage(root, 'native-worker'), /current artifact path invalid|output directory changed|generated tree contains symlink|invalid native raw report/);
      fs.readFileSync = originalRead;
      syncBuiltinESMExports();
      assert.deepEqual(substitutedReads, [], 'substituted content must never be read by the wrapper');
      assert.equal(readFileSync(join(outside, 'sentinel'), 'utf8'), 'outside-content-must-not-be-read');
      assert.equal(existsSync(join(outside, 'native-observation.json')), false);
      assert.equal(existsSync(join(outside, 'shard.json')), false);
      assert.deepEqual(readdirSync(outside), ['sentinel'], 'neither V8 nor the wrapper may write to the substituted outside directory');
      return;
    }
    const result = await runNativeCriticalCoverage(root, 'native-worker');
    assert.equal(result.status, mode === 'pass' ? 'passed' : 'failed', JSON.stringify(result));
    const metadata = JSON.parse(readFileSync(join(result.output, 'shard.json')));
    assert.equal(metadata.manifestSha256, sha256(JSON.stringify(manifest)));
    assert.equal(metadata.finalizedAfterExit, true);
    assert.equal(existsSync(join(root, 'artifacts/consolidacao-2026-09-05/coverage-scope/native-worker/shard.json')), false, 'candidate must not be published automatically');
    if (mode === 'pass') {
      const raw = JSON.parse(readFileSync(join(result.output, 'coverage-final.json')));
      assert.ok(Object.values(raw[join(root, sourcePath)].b).flat().includes(0));
    }
  } finally {
    fs.readFileSync = originalRead;
    syncBuiltinESMExports();
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
