import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  openSync,
  closeSync,
  constants
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import {
  convertProcessSourceMapChain,
  prepareProcessSourceMapChain
} from './lib/process-source-map-chain.mjs';
import { convertNativeScript } from './lib/native-v8-conversion.mjs';
import { collectProcessCoverage } from './lib/process-coverage-collection.mjs';
import {
  prepareObservedOriginalScript,
  convertObservedOriginalScript
} from './lib/process-original-source.mjs';
import {
  prepareObservedProcessScript,
  convertObservedProcessScript
} from './lib/process-v8-conversion.mjs';

const hash = (text) => createHash('sha256').update(text).digest('hex');
const persistence = new URL('./lib/process-script-persistence.mjs', import.meta.url).href;

for (const mode of ['chain', 'single-map', 'original'])
  for (const form of mode === 'original'
    ? ['star', 'named', 'namespace']
    : [
        'star',
        'named',
        'namespace',
        'mixed-type',
        'mixed-specifier',
        'resolution-import',
        'resolution-require'
      ])
    test(`real ESM reexport retains empty entry and dependency counters: ${mode}/${form}`, async (t) => {
      const root = mkdtempSync(join(tmpdir(), 'cvg-reexports-'));
      t.after(() => rmSync(root, { recursive: true, force: true }));
      const dir = join(root, 'packages');
      const rawDir = join(root, 'raw');
      mkdirSync(dir);
      mkdirSync(rawDir);
      writeFileSync(join(root, 'package.json'), '{"type":"module"}');
      const originals = {
        dependency:
          (mode === 'original' ? '' : 'export type Value = number;\n') +
          'export function live() { return 7; }\nexport function never() { return 9; }\n',
        barrel: {
          star: "export * from './dependency.js';\n",
          named: "export { live, never } from './dependency.js';\n",
          namespace: "export * as values from './dependency.js';\n",
          'mixed-type':
            "export type { Value } from './dependency.js';\nexport { live, never } from './dependency.js';\n",
          'mixed-specifier': "export { type Value, live, never } from './dependency.js';\n",
          'resolution-import':
            "export type { Value } from './dependency.js' with { 'resolution-mode': 'import' };\nexport { live, never } from './dependency.js';\n",
          'resolution-require':
            "export type { Value } from './dependency.js' with { 'resolution-mode': 'require' };\nexport { live, never } from './dependency.js';\n"
        }[form]
      };
      const files = {},
        frozenHashes = {},
        terminalHashes = {},
        urls = {};
      for (const [name, source] of Object.entries(originals)) {
        const original = join(dir, name + (mode === 'original' ? '.js' : '.ts'));
        const generated = join(dir, name + '.js');
        const originalUrl = pathToFileURL(original).href;
        const url = pathToFileURL(generated).href;
        const emitted = ts.transpileModule(source, {
          fileName: original,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            sourceMap: true,
            inlineSources: true
          }
        });
        const map = JSON.parse(emitted.sourceMapText);
        map.sources = [originalUrl];
        const code =
          mode === 'original'
            ? source
            : emitted.outputText.replace(
                /sourceMappingURL=[^\s]+/,
                'sourceMappingURL=data:application/json;base64,' +
                  Buffer.from(JSON.stringify(map)).toString('base64')
              );
        writeFileSync(original, source);
        writeFileSync(generated, code);
        files[originalUrl] = source;
        files[url] = code;
        frozenHashes[originalUrl] = hash(source);
        frozenHashes[url] = hash(code);
        terminalHashes[originalUrl] = hash(source);
        urls[name] = { original, originalUrl, url };
      }
      const driver = join(root, 'driver.mjs');
      writeFileSync(
        driver,
        `import{takeCoverage}from'node:v8';import{startProcessScriptPersistence}from${JSON.stringify(persistence)};const c=await startProcessScriptPersistence({root:${JSON.stringify(root)}});const b=await import(${JSON.stringify(urls.barrel.url)});if((b.values??b).live()!==7)throw Error('wrong reexport');c.flush();takeCoverage();process.on('exit',()=>c.flush());`
      );
      const fd = openSync(rawDir, constants.O_RDONLY | constants.O_DIRECTORY);
      let child;
      try {
        child = spawnSync(process.execPath, [driver], {
          env: {
            PATH: process.env.PATH,
            NODE_ENV: 'test',
            CVG_CRITICAL_PROCESS_COVERAGE: '1',
            NODE_V8_COVERAGE: `/proc/${process.pid}/fd/${fd}`
          },
          encoding: 'utf8',
          timeout: 15000,
          maxBuffer: 1024 * 1024
        });
      } finally {
        closeSync(fd);
      }
      assert.equal(child.status, 0, child.stderr);
      for (const [url, text] of Object.entries(files))
        assert.equal(readFileSync(new URL(url), 'utf8'), text);
      const records = readdirSync(rawDir).map((name) => ({
        name,
        text: readFileSync(join(rawDir, name), 'utf8')
      }));
      const raw = records.map((record) => JSON.parse(record.text));
      const inputs = {};
      for (const [name, identity] of Object.entries(urls)) {
        const observation = raw.find(
          (r) => r.kind === 'executed-script-observation' && r.url === identity.url
        );
        assert.ok(observation);
        assert.equal(observation.code, files[identity.url]);
        const report = raw.find((r) =>
          r.result?.some(
            (s) =>
              s.scriptId === observation.scriptId &&
              s.url === identity.url &&
              s.functions.some((f) => f.ranges.some((r) => r.count > 0))
          )
        );
        assert.ok(report, 'actual imported module must have a positive V8 range');
        inputs[name] = {
          observation,
          coverage: report.result.find(
            (s) => s.scriptId === observation.scriptId && s.url === identity.url
          ),
          pid: observation.pid,
          threadId: observation.threadId,
          files,
          frozenHashes,
          cachedMap: report['source-map-cache']?.[identity.url]?.data
        };
      }
      const before = JSON.stringify(inputs);
      const originalInput = (name) => ({
        ...inputs[name],
        terminalHashes,
        originalUrl: urls[name].originalUrl
      });
      const convert = (name) =>
        mode === 'original'
          ? convertObservedOriginalScript(originalInput(name))
          : mode === 'single-map'
            ? convertObservedProcessScript(inputs[name])
            : convertProcessSourceMapChain(inputs[name], { terminalHashes });
      const prepared =
        mode === 'original'
          ? prepareObservedOriginalScript(originalInput('barrel'))
          : mode === 'single-map'
            ? prepareObservedProcessScript(inputs.barrel)
            : prepareProcessSourceMapChain(inputs.barrel, { terminalHashes });
      const native = await convertNativeScript(prepared);
      assert.deepEqual(Object.keys(native), [urls.barrel.original]);
      assert.deepEqual(native[urls.barrel.original].s, {});
      assert.deepEqual(native[urls.barrel.original].f, {});
      assert.deepEqual(native[urls.barrel.original].b, {});
      const dependency = await convert('dependency');
      const entry = dependency[urls.dependency.original];
      const functionId = (name) =>
        Object.keys(entry.fnMap).find((id) => entry.fnMap[id].name === name);
      assert.equal(entry.f[functionId('live')], 1);
      assert.equal(entry.f[functionId('never')], 0);
      const barrel = await convert('barrel');
      assert.deepEqual(
        barrel,
        native,
        'retain original empty entry; do not invent hits or omit its identity'
      );
      assert.equal(JSON.stringify(inputs), before);
      const collected = await collectProcessCoverage({
        root,
        files,
        frozenHashes,
        terminalHashes,
        reports: records.filter((record) => record.name.startsWith('coverage-')),
        observations: records.filter((record) => record.name.startsWith('executed-script-'))
      });
      assert.deepEqual(
        Object.keys(collected.coverage).sort(),
        [urls.barrel.original, urls.dependency.original].sort()
      );
      for (const metric of ['s', 'f', 'b'])
        assert.deepEqual(collected.coverage[urls.barrel.original][metric], {});
      const collectedDependency = collected.coverage[urls.dependency.original];
      const collectedId = (name) =>
        Object.keys(collectedDependency.fnMap).find(
          (id) => collectedDependency.fnMap[id].name === name
        );
      assert.equal(collectedDependency.f[collectedId('live')], 1);
      assert.equal(collectedDependency.f[collectedId('never')], 0);
      assert.equal(JSON.stringify(inputs), before);
    });
