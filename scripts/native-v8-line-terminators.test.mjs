import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from 'node:inspector';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { convertNativeScript } from './lib/native-v8-conversion.mjs';

for (const ending of ['\n', '\r\n', '\r', '\u2028', '\u2029', 'mixed']) {
  test(`real generated line ending ${JSON.stringify(ending)} retains original function locations`, async () => {
    const session = new Session();
    session.connect();
    const post = (method, params = {}) =>
      new Promise((resolve, reject) =>
        session.post(method, params, (error, value) => (error ? reject(error) : resolve(value)))
      );
    try {
      await post('Profiler.enable');
      await post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
      const original =
        'function probeChoice(v: boolean) { const emoji = "😀"; return v ? 1 : 2; }\nfunction probeNever() { return 3; }\nprobeChoice(true);\n';
      const output = ts.transpileModule(original, {
        fileName: 'original.ts',
        compilerOptions: { target: ts.ScriptTarget.ES2022, sourceMap: true }
      });
      // Change only line separators after compilation; generated line/column
      // mappings remain valid ECMAScript coordinates. Execute these exact bytes.
      let line = 0;
      const code = output.outputText.replaceAll('\n', () =>
        ending === 'mixed' ? ['\r', '\n', '\u2028', '\r\n', '\u2029'][line++ % 5] : ending
      );
      assert.ok(code.includes('😀'), 'exercise real UTF16 surrogate-pair offsets');
      const url = `file:///virtual/line-ending-${ending.codePointAt(0)}-${ending.length}.js`;
      runInNewContext(code, {}, { filename: url });
      const report = await post('Profiler.takePreciseCoverage');
      const coverage = report.result.find((entry) => entry.url === url);
      assert.ok(coverage);
      const sourceUrl = 'file:///virtual/original.ts';
      const sourceMap = {
        ...JSON.parse(output.sourceMapText),
        sources: [sourceUrl],
        sourceRoot: ''
      };
      const input = { coverage, code, sourceMap, sources: { [sourceUrl]: original } };
      const before = JSON.stringify(input);
      const result = (await convertNativeScript(input))['/virtual/original.ts'];
      const id = (name) => Object.keys(result.fnMap).find((id) => result.fnMap[id].name === name);
      assert.equal(result.f[id('probeChoice')], 1);
      assert.equal(result.f[id('probeNever')], 0);
      assert.equal(result.fnMap[id('probeNever')].decl.start.line, 2);
      assert.equal(result.fnMap[id('probeNever')].loc.start.line, 2);
      assert.ok(
        result.fnMap[id('probeNever')].loc.end.column >
          result.fnMap[id('probeNever')].loc.start.column
      );
      assert.ok(Object.values(result.statementMap).some((loc) => loc.start.line === 3));
      assert.ok(Object.values(result.b).flat().includes(0));
      assert.equal(JSON.stringify(input), before);
    } finally {
      session.disconnect();
    }
  });
}

test('dense unmapped compatibility points have a pre-allocation budget', async () => {
  const code = ' '.repeat(1_000_001) + '\rx();';
  const url = 'file:///virtual/large.js';
  const input = {
    code,
    coverage: {
      url,
      functions: [
        {
          functionName: '',
          isBlockCoverage: true,
          ranges: [{ startOffset: 0, endOffset: code.length, count: 1 }]
        }
      ]
    },
    sourceMap: { version: 3, names: [], sources: [url], mappings: ';AAAA' },
    sources: { [url]: 'x();' }
  };
  // Synthetic resource boundary: not a claim that these counters were observed.
  await assert.rejects(convertNativeScript(input), /unmapped coordinate budget/);
});
