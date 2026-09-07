import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { Session } from 'node:inspector/promises';
import { runInNewContext } from 'node:vm';
import { convertNativeScript } from './lib/native-v8-conversion.mjs';
import { collectProcessCoverage } from './lib/process-coverage-collection.mjs';
import { createHash } from 'node:crypto';

test('real interleaved class initializers retain their independent statement counts', async () => {
  const code = 'class C { a=1; static b=2; c=3; static d=4; } globalThis.C=C;';
  const url = 'file:///virtual/interleaved-fields.js';
  const session = new Session();
  session.connect();
  try {
    await session.post('Debugger.enable');
    await session.post('Profiler.enable');
    await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    const context = {};
    runInNewContext(code, context, { filename: url });
    new context.C();
    new context.C();
    const report = await session.post('Profiler.takePreciseCoverage');
    const coverage = report.result.find((x) => x.url === url);
    assert.ok(coverage);
    assert.equal(
      (await session.post('Debugger.getScriptSource', { scriptId: coverage.scriptId }))
        .scriptSource,
      code
    );
    const initializerCounts = coverage.functions
      .filter((x) => x.functionName.includes('initializer'))
      .map((x) => x.ranges[0].count);
    assert.deepEqual(initializerCounts, [2, 1]);
    const result = await convertNativeScript({
      code,
      coverage,
      sources: { [url]: code },
      sourceMap: {
        version: 3,
        names: [],
        sources: [url],
        mappings: 'AAAA' + ',CAAC'.repeat(code.length - 1)
      }
    });
    const entry = result[fileURLToPath(url)];
    for (const [value, count] of [
      ['1', 2],
      ['2', 1],
      ['3', 2],
      ['4', 1]
    ]) {
      const statement = Object.entries(entry.statementMap).find(
        ([, loc]) => loc.start.column === code.indexOf('=' + value) + 1
      );
      assert.ok(statement);
      assert.equal(entry.s[statement[0]], count);
    }
  } finally {
    session.disconnect();
  }
});

test('default function creation needs evidence beyond indistinguishable V8 counters', async () => {
  const code = 'function f(x=()=>2){return x;} globalThis.f=f;';
  const session = new Session();
  session.connect();
  const captures = [];
  try {
    await session.post('Debugger.enable');
    await session.post('Profiler.enable');
    await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    for (const omitted of [true, false]) {
      const url = `file:///virtual/default-observability-${omitted}.js`,
        context = {};
      runInNewContext(code, context, { filename: url });
      const value = omitted ? context.f() : context.f(7);
      assert.equal(typeof value, omitted ? 'function' : 'number');
      const report = await session.post('Profiler.takePreciseCoverage');
      const coverage = report.result.find((x) => x.url === url);
      assert.ok(coverage);
      assert.equal(
        (await session.post('Debugger.getScriptSource', { scriptId: coverage.scriptId }))
          .scriptSource,
        code
      );
      captures.push({ omitted, url, coverage });
    }
    assert.deepEqual(
      captures[0].coverage.functions,
      captures[1].coverage.functions,
      'raw V8 cannot distinguish these default evaluation counts'
    );
    for (const { omitted, url, coverage } of captures) {
      const result = await convertNativeScript({
        code,
        coverage,
        sources: { [url]: code },
        sourceMap: {
          version: 3,
          names: [],
          sources: [url],
          mappings: 'AAAA' + ',CAAC'.repeat(code.length - 1)
        }
      });
      const entry = result[fileURLToPath(url)];
      const branch = Object.entries(entry.branchMap).find(([, x]) => x.type === 'default-arg');
      assert.ok(branch);
      assert.deepEqual(entry.b[branch[0]], [omitted ? 1 : 0]);
    }
  } finally {
    session.disconnect();
  }
});

for (const mutation of [
  'duplicate',
  'outside-root',
  'unordered',
  'function-level-blocks',
  'root-counter-replacement'
])
  test(`direct converter rejects real-capture malformed tree: ${mutation}`, async () => {
    const code = `function f(x){if(x)return 1;return 2;} f(true); // ${mutation}`;
    const url = 'file:///virtual/direct-invalid.js';
    const session = new Session();
    session.connect();
    try {
      await session.post('Debugger.enable');
      await session.post('Profiler.enable');
      await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
      runInNewContext(code, {}, { filename: url });
      const report = await session.post('Profiler.takePreciseCoverage');
      const coverage = report.result.find((x) => x.url === url);
      assert.ok(coverage);
      const input = {
        code,
        coverage,
        sources: { [url]: code },
        sourceMap: {
          version: 3,
          names: [],
          sources: [url],
          mappings: 'AAAA' + ',CAAC'.repeat(code.length - 1)
        }
      };
      const good = await convertNativeScript(input);
      assert.deepEqual(Object.values(good[fileURLToPath(url)].f), [1]);
      const changed = structuredClone(coverage);
      const fn = changed.functions.find((x) => x.functionName === 'f');
      assert.equal(fn.isBlockCoverage, true);
      assert.ok(fn.ranges.length > 1, 'real branch range required before mutation');
      if (mutation === 'duplicate') fn.ranges.push({ ...fn.ranges[0], count: 7 });
      if (mutation === 'outside-root')
        fn.ranges.push({ startOffset: fn.ranges[0].endOffset, endOffset: code.length, count: 7 });
      if (mutation === 'unordered') fn.ranges.reverse();
      if (mutation === 'function-level-blocks') fn.isBlockCoverage = false;
      if (mutation === 'root-counter-replacement') {
        const root = fn.ranges[0],
          middle = Math.floor((root.startOffset + root.endOffset) / 2);
        fn.ranges = [
          root,
          { startOffset: root.startOffset, endOffset: middle, count: 2 },
          { startOffset: middle, endOffset: root.endOffset, count: 2 }
        ];
      }
      const before = JSON.stringify(changed);
      await assert.rejects(convertNativeScript({ ...input, coverage: changed }), /V8/);
      assert.equal(JSON.stringify(changed), before);
    } finally {
      session.disconnect();
    }
  });

for (const mapped of [false, true])
  for (const isStatic of [false, true])
    for (const [instances, calls] of [
      [0, 0],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 2]
    ])
      test(`class field creation is distinct from function calls; mapped=${mapped}, static=${isStatic}, instances=${instances}, calls=${calls}`, async () => {
        const root = '/virtual/field-creation',
          url = `file://${root}/apps/api/src/field.${mapped ? 'ts' : 'js'}`;
        const source = `class C { ${isStatic ? 'static ' : ''}f=()=>1; } globalThis.C=C; // ${mapped}-${instances}-${calls}`;
        const compiled = mapped
          ? ts.transpileModule(source, {
              fileName: 'field.ts',
              compilerOptions: { target: ts.ScriptTarget.ES2022, sourceMap: true }
            })
          : null;
        let code = compiled
          ? compiled.outputText.replace(/\/\/# sourceMappingURL=.*\n?$/, '')
          : source;
        const map = compiled
          ? { ...JSON.parse(compiled.sourceMapText), sourceRoot: '', sources: [url] }
          : {
              version: 3,
              names: [],
              sources: [url],
              mappings: 'AAAA' + ',CAAC'.repeat(code.length - 1)
            };
        if (mapped)
          code +=
            '\n//# sourceMappingURL=data:application/json;base64,' +
            Buffer.from(JSON.stringify(map)).toString('base64');
        const generated = mapped ? `file://${root}/apps/api/dist/field.js` : url;
        const session = new Session();
        session.connect();
        try {
          await session.post('Debugger.enable');
          await session.post('Profiler.enable');
          await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
          const context = {};
          runInNewContext(code, context, { filename: generated });
          for (let i = 0; i < instances; i++) context.c = new context.C();
          for (let i = 0; i < calls; i++) assert.equal((isStatic ? context.C : context.c).f(), 1);
          const report = await session.post('Profiler.takePreciseCoverage');
          const coverage = report.result.find((x) => x.url === generated);
          assert.ok(coverage);
          const observed = (
            await session.post('Debugger.getScriptSource', { scriptId: coverage.scriptId })
          ).scriptSource;
          assert.equal(observed, code);
          const hash = (x) => createHash('sha256').update(x).digest('hex');
          const input = { code, coverage, sourceMap: map, sources: { [url]: source } };
          const collection = {
            root,
            files: { [url]: source },
            frozenHashes: { [url]: hash(source) },
            terminalHashes: { [url]: hash(source) },
            observations: [
              {
                name: `executed-script-${process.pid}-0-${coverage.scriptId}.json`,
                text: JSON.stringify({
                  schemaVersion: 1,
                  kind: 'executed-script-observation',
                  pid: process.pid,
                  threadId: 0,
                  scriptId: coverage.scriptId,
                  url: generated,
                  code,
                  sha256: hash(code)
                })
              }
            ],
            reports: [{ name: `coverage-${process.pid}-600-0.json`, text: JSON.stringify(report) }]
          };
          const before = JSON.stringify({ input, collection });
          for (const result of [
            await convertNativeScript(input),
            (await collectProcessCoverage(collection)).coverage
          ]) {
            const entry = result[fileURLToPath(url)];
            const statement = Object.entries(entry.statementMap).find(
              ([, loc]) => loc.start.line === 1 && loc.start.column === source.indexOf('()=>')
            );
            assert.ok(statement, 'field initializer statement retained');
            assert.equal(
              entry.s[statement[0]],
              isStatic ? 1 : instances,
              'field creation is independent of function calls'
            );
            assert.deepEqual(Object.values(entry.f), [calls]);
          }
          assert.equal(JSON.stringify({ input, collection }), before);
        } finally {
          session.disconnect();
        }
      });

test('exclusive V8 end offset does not erase the adjacent executed statement', async () => {
  const session = new Session();
  session.connect();
  try {
    const code = 'function f(){return 1;}f;';
    const url = 'file:///virtual/adjacent.js';
    await session.post('Profiler.enable');
    await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    await session.post('Runtime.evaluate', { expression: `${code}\n//# sourceURL=${url}` });
    const { result } = await session.post('Profiler.takePreciseCoverage');
    const coverage = result.find((entry) => entry.url === url);
    assert.ok(coverage);
    // The sourceURL comment belongs to the executed script's offset extent.
    const executed = `${code}\n//# sourceURL=${url}`;
    const source = 'file:///virtual/adjacent.ts';
    const converted = await convertNativeScript({
      code: executed,
      coverage,
      sources: { [source]: executed },
      sourceMap: {
        version: 3,
        names: [],
        sources: [source],
        mappings: 'AAAA' + ',CAAC'.repeat(code.length - 1)
      }
    });
    const entry = converted[fileURLToPath(source)];
    const trailing = Object.entries(entry.statementMap).find(
      ([, loc]) => loc.start.column === code.lastIndexOf('f;')
    );
    assert.ok(trailing, 'trailing expression must be instrumented');
    assert.equal(entry.s[trailing[0]], 1);
    assert.ok(Object.values(entry.f).includes(0), 'uncalled function must remain uncovered');
  } finally {
    await session.post('Profiler.stopPreciseCoverage');
    session.disconnect();
  }
});

test('real V8 compiled TypeScript remaps to original source without erasing uncovered branches', async () => {
  const root = mkdtempSync(join(tmpdir(), 'native-convert-'));
  try {
    const original = join(root, 'fixture.ts');
    const generated = join(root, 'fixture.mjs');
    const source =
      'export function choose(value: boolean) { return value ? 1 : 2; }\nchoose(true);\n';
    const output = ts.transpileModule(source, {
      fileName: original,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        sourceMap: true
      }
    });
    writeFileSync(generated, output.outputText);
    const child = spawnSync(process.execPath, [generated], {
      env: { ...process.env, NODE_V8_COVERAGE: join(root, 'raw') },
      encoding: 'utf8',
      timeout: 15000
    });
    assert.equal(child.status, 0, child.stderr);
    const report = JSON.parse(readFileSync(join(root, 'raw', readdirSync(join(root, 'raw'))[0])));
    const coverage = report.result.find((entry) => entry.url === pathToFileURL(generated).href);
    assert.ok(coverage);
    const sourceMap = {
      ...JSON.parse(output.sourceMapText),
      sources: [pathToFileURL(original).href]
    };
    const input = {
      coverage,
      code: output.outputText,
      sourceMap,
      sources: { [pathToFileURL(original).href]: source }
    };
    const before = JSON.stringify(input);
    const result = await convertNativeScript(input);
    assert.deepEqual(Object.keys(result), [original]);
    assert.ok(Object.values(result[original].b).flat().includes(0));
    assert.ok(Object.values(result[original].f).some((count) => count > 0));
    assert.equal(JSON.stringify(input), before, 'conversion must not mutate raw evidence');
    await assert.rejects(
      () => convertNativeScript({ ...input, sources: {} }),
      /missing authenticated/
    );
    await assert.rejects(
      () => convertNativeScript({ ...input, sourceMap: undefined }),
      /explicit flat/
    );
    for (const count of [-1, 0.5, 4294967296, 4294967297, Number.MAX_SAFE_INTEGER + 1]) {
      const bad = structuredClone(coverage);
      bad.functions[0].ranges[0].count = count;
      await assert.rejects(
        () => convertNativeScript({ ...input, coverage: bad }),
        /invalid V8 counter/
      );
    }
    await assert.rejects(
      () => convertNativeScript({ ...input, sourceMap: { ...sourceMap, mappings: 'AAAA;AADA' } }),
      /invalid source map coordinates/
    );
    for (const mappings of ['!AAA', 'ggggggEAAA', 'g', 'AAAA,', 'AA']) {
      await assert.rejects(
        () => convertNativeScript({ ...input, sourceMap: { ...sourceMap, mappings } }),
        /source map/
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
