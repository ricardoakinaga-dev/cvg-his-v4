import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  openSync,
  closeSync,
  constants
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  prepareObservedProcessScript,
  convertObservedProcessScript
} from './lib/process-v8-conversion.mjs';

const root = resolve(import.meta.dirname, '..');
const vitestUrl = import.meta.resolve('vitest');
const persistenceUrl = new URL('./lib/process-script-persistence.mjs', import.meta.url).href;
const hash = (text) => createHash('sha256').update(text).digest('hex');
const source =
  'export function choose(value: boolean): number { return value ? 1 : 2; }\nexport function neverCalled(): number { return 3; }\n';

function observe(kind) {
  const directory = mkdtempSync(
    join(tmpdir(), kind === 'tsx' ? 'cvg-process-map-' : 'cvg process map ç-')
  );
  const packages = join(directory, 'packages'),
    raw = join(directory, 'raw');
  mkdirSync(packages);
  mkdirSync(raw);
  const sourceName = kind.startsWith('external')
    ? 'choice space ç.ts'
    : kind === 'tsx' || kind === 'tsx-misbound'
      ? 'choice.mts'
      : 'choice.ts';
  const original = join(packages, sourceName);
  const sourceText =
    kind === 'vitest-first-line'
      ? 'function choose(value: boolean): number { return value ? 1 : 2; } function neverCalled(): number { return 3; } globalThis.__cvgFirstLineResult = choose(true);\n'
      : source;
  const files = {},
    frozenHashes = {};
  const save = (path, content, freeze = false) => {
    writeFileSync(path, content, { flag: 'wx', mode: 0o600 });
    if (freeze) {
      const url = pathToFileURL(path).href;
      files[url] = content;
      frozenHashes[url] = hash(content);
    }
  };
  save(original, sourceText, true);
  save(join(directory, 'package.json'), '{"type":"module"}');
  const preload = join(directory, 'preload.mjs');
  save(
    preload,
    `import {startProcessScriptPersistence} from ${JSON.stringify(persistenceUrl)}; const capture=await startProcessScriptPersistence({root:${JSON.stringify(directory)}}); process.on('exit',()=>capture.flush());`
  );
  let executed = original;
  if (kind.startsWith('external')) {
    const output = ts.transpileModule(sourceText, {
      fileName: original,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        sourceMap: true,
        inlineSources: true
      }
    });
    executed = join(packages, 'choice space ç.js');
    let code =
      kind === 'external-multiple'
        ? output.outputText.replace(
            '//# sourceMappingURL=',
            '//# sourceMappingURL=unavailable-inactive.map\n//# sourceMappingURL='
          )
        : output.outputText;
    if (kind === 'external-empty-final') code += '\n//# sourceMappingURL=';
    if (kind === 'external-spaced-final') code += '\n//# sourceMappingURL= invalid.map';
    save(executed, code, true);
    save(`${executed}.map`, output.sourceMapText, true);
  }
  const executedUrl = pathToFileURL(executed).href;
  const reportPath = join(directory, 'test-result.json');
  let args;
  if (kind.startsWith('vitest')) {
    save(
      join(directory, 'vitest.config.mjs'),
      `export default {root:${JSON.stringify(directory)},test:{include:['probe.test.ts'],environment:'node',setupFiles:[],fileParallelism:false}};`
    );
    const exercise =
      kind === 'vitest-first-line'
        ? "import './packages/choice.ts'; test('real first-line branch',()=>{expect(globalThis.__cvgFirstLineResult).toBe(1);takeCoverage();});"
        : "import {choose} from './packages/choice.ts'; test('real mapped branch',()=>{expect(choose(true)).toBe(1);takeCoverage();});";
    save(
      join(directory, 'probe.test.ts'),
      `import {test,expect} from ${JSON.stringify(vitestUrl)}; import {takeCoverage} from 'node:v8'; ${exercise}`
    );
    args = [
      join(root, 'node_modules/vitest/vitest.mjs'),
      'run',
      '--config',
      join(directory, 'vitest.config.mjs'),
      '--reporter=json',
      `--outputFile=${reportPath}`
    ];
  } else {
    args = [
      '--import',
      'tsx/esm',
      '--input-type=module',
      '-e',
      `import {choose} from ${JSON.stringify(executedUrl)}; import {takeCoverage} from 'node:v8'; if(choose(true)!==1)throw Error('wrong result');takeCoverage();`
    ];
  }
  const fd = openSync(raw, constants.O_RDONLY | constants.O_DIRECTORY);
  let child;
  try {
    child = spawnSync(process.execPath, args, {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'test',
        CVG_CRITICAL_PROCESS_COVERAGE: '1',
        NODE_V8_COVERAGE: `/proc/${process.pid}/fd/${fd}`,
        NODE_OPTIONS: `--import=${pathToFileURL(preload).href}`
      },
      encoding: 'utf8',
      timeout: 20000,
      maxBuffer: 4 * 1024 * 1024
    });
  } finally {
    closeSync(fd);
  }
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, `${directory}\n${child.stderr}\n${child.stdout}`);
  if (kind.startsWith('vitest')) {
    const report = JSON.parse(readFileSync(reportPath));
    assert.equal(report.success, true);
    assert.equal(report.numTotalTests, 1);
    assert.equal(report.numPassedTests, 1);
    assert.equal(report.numFailedTests, 0);
    assert.equal(report.numPendingTests, 0);
  }
  const names = readdirSync(raw);
  const observation = names
    .filter((name) => name.startsWith('executed-script-'))
    .map((name) => JSON.parse(readFileSync(join(raw, name))))
    .find((value) => value.url === executedUrl);
  assert.ok(observation, 'real executed code must be captured');
  const reports = names
    .filter(
      (name) =>
        name.startsWith(`coverage-${observation.pid}-`) &&
        name.endsWith(`-${observation.threadId}.json`)
    )
    .map((name) => JSON.parse(readFileSync(join(raw, name))));
  const report = reports.find((value) =>
    value.result.some(
      (script) =>
        script.url === executedUrl &&
        script.scriptId === observation.scriptId &&
        script.functions.some((fn) => fn.functionName === 'choose' && fn.ranges[0].count === 1)
    )
  );
  assert.ok(report, 'real V8 call interval must exist');
  const coverage = report.result.find(
    (value) => value.url === executedUrl && value.scriptId === observation.scriptId
  );
  return {
    original,
    input: {
      observation,
      coverage,
      pid: observation.pid,
      threadId: observation.threadId,
      files,
      frozenHashes,
      cachedMap: report['source-map-cache']?.[executedUrl]?.data
    }
  };
}

for (const kind of ['external-empty-final', 'external-spaced-final']) {
  test(`rejects real ${kind} without falling back to an earlier map`, () => {
    const { input } = observe(kind);
    for (const cachedMap of [undefined, input.cachedMap]) {
      assert.throws(
        () => prepareObservedProcessScript({ ...input, cachedMap }),
        /invalid final sourceMappingURL|unambiguous/
      );
    }
  });
}

for (const kind of [
  'tsx',
  'tsx-unicode',
  'vitest',
  'vitest-first-line',
  'external',
  'external-multiple'
]) {
  test(
    `authenticates and remaps real ${kind} execution without changing raw evidence`,
    { timeout: 30000 },
    async () => {
      const { original, input } = observe(kind);
      const before = JSON.stringify(input);
      const prepared = prepareObservedProcessScript(input);
      assert.equal(prepared.provenance.kind, kind.startsWith('external') ? 'external' : 'inline');
      if (kind === 'external-multiple') {
        assert.ok(input.cachedMap, 'runtime must identify the active map');
        assert.throws(
          () => prepareObservedProcessScript({ ...input, cachedMap: undefined }),
          /unambiguous/
        );
      }
      assert.equal(prepared.provenance.wrapperColumns > 0, kind.startsWith('vitest'));
      if (kind === 'vitest-first-line')
        assert.ok(
          prepared.sourceMap.mappings.startsWith('A,'),
          'first-line wrapper needs an unmapped prefix and shifted original mappings'
        );
      const converted = await convertObservedProcessScript(input);
      assert.deepEqual(Object.keys(converted), [original]);
      const entry = converted[original];
      const chooseId = Object.keys(entry.fnMap).find((id) => entry.fnMap[id].name === 'choose');
      const neverId = Object.keys(entry.fnMap).find((id) => entry.fnMap[id].name === 'neverCalled');
      assert.ok(chooseId);
      assert.ok(neverId);
      assert.equal(entry.f[chooseId], 1);
      assert.equal(entry.f[neverId], 0);
      assert.ok(Object.values(entry.b).flat().includes(0), 'unexecuted branch must remain zero');
      assert.equal(JSON.stringify(input), before);
      for (const change of [
        { pid: input.pid + 1 },
        { threadId: input.threadId + 1 },
        { frozenHashes: {} },
        { files: {} }
      ]) {
        await assert.rejects(
          convertObservedProcessScript({ ...input, ...change }),
          /identity|unbound|changed/
        );
      }
      await assert.rejects(
        convertObservedProcessScript({
          ...input,
          cachedMap: { ...prepared.sourceMap, mappings: 'AAAA' }
        }),
        /cached source map differs/
      );
      const badCode = { ...input.observation, code: input.observation.code + ' ' };
      await assert.rejects(
        convertObservedProcessScript({ ...input, observation: badCode }),
        /identity\/hash/
      );
      const stringOnly = `const fake = ${JSON.stringify('//# sourceMappingURL=data:application/json;base64,e30=')};`;
      assert.throws(
        () =>
          prepareObservedProcessScript({
            ...input,
            observation: { ...input.observation, code: stringOnly, sha256: hash(stringOnly) }
          }),
        /unambiguous/
      );
      const duplicate = `${input.observation.code}\n//# sourceMappingURL=data:application/json;base64,e30=`;
      assert.throws(
        () =>
          prepareObservedProcessScript({
            ...input,
            observation: { ...input.observation, code: duplicate, sha256: hash(duplicate) }
          }),
        /unambiguous|flat source map|cached source map/
      );
      if (kind.startsWith('external')) {
        const files = { ...input.files };
        delete files[`${input.observation.url}.map`];
        await assert.rejects(convertObservedProcessScript({ ...input, files }), /unbound/);
        const changed = { ...input.observation, code: input.observation.code + ' ' };
        changed.sha256 = hash(changed.code);
        await assert.rejects(
          convertObservedProcessScript({ ...input, observation: changed }),
          /differs from frozen generated/
        );
      } else {
        const match = /data:application\/json(?:;charset=utf-8)?;base64,([^\s]+)/i.exec(
          input.observation.code
        );
        const map = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
        map.sourcesContent[0] += '\nchanged embedded original';
        const changedCode = input.observation.code.replace(
          match[0],
          `data:application/json;base64,${Buffer.from(JSON.stringify(map)).toString('base64')}`
        );
        await assert.rejects(
          convertObservedProcessScript({
            ...input,
            cachedMap: undefined,
            observation: { ...input.observation, code: changedCode, sha256: hash(changedCode) }
          }),
          /embedded original source differs/
        );
        const emptyMap = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
        emptyMap.mappings = '';
        const emptyReference = `data:application/json;base64,${Buffer.from(JSON.stringify(emptyMap)).toString('base64')}`;
        const emptyCode = input.observation.code.replace(
          match[0],
          emptyReference.padEnd(match[0].length, ' ')
        );
        await assert.rejects(
          convertObservedProcessScript({
            ...input,
            cachedMap: undefined,
            observation: { ...input.observation, code: emptyCode, sha256: hash(emptyCode) }
          }),
          /empty|mapping/
        );
        // Loader URL variants are identities, not a reason to omit mapped code.
        const url = `${input.observation.url}?type=script`;
        const variant = await convertObservedProcessScript({
          ...input,
          observation: { ...input.observation, url },
          coverage: { ...input.coverage, url }
        });
        assert.deepEqual(variant, converted);
      }
    }
  );
}

test(
  'rejects the current tsx Unicode mts map whose declared original is not frozen',
  { timeout: 30000 },
  async () => {
    const { input, original } = observe('tsx-misbound');
    assert.ok(original.endsWith('.mts'));
    // The installed loader rewrites .mts to .ts before transforming; its textual
    // restoration misses esbuild's Unicode escapes. Do not guess a source alias.
    await assert.rejects(convertObservedProcessScript(input), /unbound or changed source artifact/);
  }
);

for (const sourceRoot of ['', 'sub%20dir/']) {
  test(`map source URLs authenticate decoded identity, sourceRoot=${sourceRoot}`, async () => {
    const source = 'const a = 1;';
    const originalUrl = `file:///virtual/${sourceRoot}a%20b.ts`;
    const wrongUrl = `file:///virtual/${sourceRoot.replaceAll('%', '%25')}a%2520b.ts`;
    const map = {
      version: 3,
      sourceRoot,
      sources: ['a%20b.ts'],
      names: [],
      mappings: 'AAAA',
      sourcesContent: [source]
    };
    const code = `${source}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(map)).toString('base64')}`;
    const url = 'file:///virtual/generated.js';
    const input = {
      pid: 123,
      threadId: 0,
      observation: {
        schemaVersion: 1,
        kind: 'executed-script-observation',
        pid: 123,
        threadId: 0,
        scriptId: '1',
        url,
        code,
        sha256: hash(code)
      },
      coverage: {
        scriptId: '1',
        url,
        functions: [
          {
            functionName: '',
            isBlockCoverage: true,
            ranges: [{ startOffset: 0, endOffset: code.length, count: 1 }]
          }
        ]
      },
      files: { [originalUrl]: source },
      frozenHashes: { [originalUrl]: hash(source) }
    };
    assert.deepEqual(prepareObservedProcessScript(input).sourceMap.sources, [originalUrl]);
    assert.deepEqual(Object.keys(await convertObservedProcessScript(input)), [
      fileURLToPath(originalUrl)
    ]);
    await assert.rejects(
      convertObservedProcessScript({
        ...input,
        files: { [wrongUrl]: source },
        frozenHashes: { [wrongUrl]: hash(source) }
      }),
      /unbound/
    );
  });
}
