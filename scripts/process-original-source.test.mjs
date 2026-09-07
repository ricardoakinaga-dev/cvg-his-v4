import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Session } from 'node:inspector/promises';
import { runInNewContext } from 'node:vm';
import {
  convertObservedOriginalScript,
  prepareObservedOriginalScript
} from './lib/process-original-source.mjs';

const hash = (code) => createHash('sha256').update(code).digest('hex');
for (const ending of ['\n', '\r\n', '\r', '\u2028', '\u2029', 'mixed']) {
  test(`authenticated original preserves real V8 zeros: ${JSON.stringify(ending)}`, async () => {
    const lines = [
      'function live(v){ const emoji="😀"; return v ? 1 : 2; }',
      'function never(){ return 3; }',
      'live(true);',
      '// end'
    ];
    const code = lines
      .map(
        (line, i) =>
          line +
          (i === lines.length - 1 ? '' : ending === 'mixed' ? ['\r', '\u2028', '\r\n'][i] : ending)
      )
      .join('');
    const url = `file:///virtual/original-${ending.codePointAt(0)}.js`;
    // Frozen before actual execution. No synthetic V8 counters in positives.
    const frozen = {
      files: { [url]: code },
      frozenHashes: { [url]: hash(code) },
      terminalHashes: { [url]: hash(code) }
    };
    const session = new Session();
    session.connect();
    try {
      await session.post('Debugger.enable');
      await session.post('Profiler.enable');
      await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
      runInNewContext(code, {}, { filename: url });
      const coverage = (await session.post('Profiler.takePreciseCoverage')).result.find(
        (x) => x.url === url
      );
      assert.ok(coverage);
      const observed = (
        await session.post('Debugger.getScriptSource', { scriptId: coverage.scriptId })
      ).scriptSource;
      assert.equal(observed, code);
      const input = {
        ...frozen,
        originalUrl: url,
        pid: process.pid,
        threadId: 0,
        coverage,
        observation: {
          schemaVersion: 1,
          kind: 'executed-script-observation',
          pid: process.pid,
          threadId: 0,
          scriptId: coverage.scriptId,
          url,
          code: observed,
          sha256: hash(observed)
        }
      };
      const before = JSON.stringify(input);
      const result = Object.values(await convertObservedOriginalScript(input))[0];
      const id = (name) => Object.keys(result.fnMap).find((id) => result.fnMap[id].name === name);
      assert.equal(result.f[id('live')], 1);
      assert.equal(result.f[id('never')], 0);
      assert.equal(result.fnMap[id('never')].loc.start.line, 2);
      assert.ok(Object.values(result.s).includes(0));
      assert.ok(Object.values(result.b).flat().includes(0));
      assert.equal(JSON.stringify(input), before);
      // Negative mutations of a real observation must never become evidence.
      for (const mutation of [
        (x) => {
          x.observation.pid++;
        },
        (x) => {
          x.observation.threadId++;
        },
        (x) => {
          x.observation.scriptId += '0';
        },
        (x) => {
          x.observation.code += ' ';
          x.observation.sha256 = hash(x.observation.code);
        },
        (x) => {
          x.terminalHashes = {};
        },
        (x) => {
          x.frozenHashes[url] = '0'.repeat(64);
        },
        (x) => {
          x.originalUrl = 'file:///virtual/other.js';
        },
        (x) => {
          x.cachedMap = {};
        }
      ]) {
        const changed = structuredClone(input);
        mutation(changed);
        assert.throws(() => prepareObservedOriginalScript(changed));
      }
      assert.throws(() => prepareObservedOriginalScript(input, { maxPoints: 2 }), /budget/);
    } finally {
      session.disconnect();
    }
  });
}

test('map directives cannot enter original-only route; text literals are not directives', () => {
  const url = 'file:///virtual/directive.js';
  const fixture = (code) => ({
    originalUrl: url,
    pid: 1,
    threadId: 0,
    files: { [url]: code },
    frozenHashes: { [url]: hash(code) },
    terminalHashes: { [url]: hash(code) },
    coverage: { url, scriptId: '1' },
    observation: {
      schemaVersion: 1,
      kind: 'executed-script-observation',
      pid: 1,
      threadId: 0,
      url,
      scriptId: '1',
      code,
      sha256: hash(code)
    }
  });
  // The budget must win before parser recursion/allocation on oversized input.
  assert.throws(
    () =>
      prepareObservedOriginalScript(fixture('('.repeat(5000) + '0' + ')'.repeat(5000)), {
        maxPoints: 2
      }),
    /identity map point budget/
  );
  for (const ending of ['\n', '\r\n', '\r', '\u2028', '\u2029']) {
    const code = `x();${ending}x();`;
    assert.ok(prepareObservedOriginalScript(fixture(code), { maxPoints: 10 }));
    assert.throws(
      () => prepareObservedOriginalScript(fixture(code), { maxPoints: 9 }),
      /identity map point budget/
    );
  }
  // Synthetic preparation-only boundary; never converted or certified.
  for (const directive of [
    '//# sourceMappingURL=x.map',
    '/*# sourceMappingURL=data:broken */',
    '//# sourceMappingURL='
  ])
    assert.throws(
      () => prepareObservedOriginalScript(fixture(`x();\n${directive}`)),
      /map directive/
    );
  assert.ok(
    prepareObservedOriginalScript(fixture('const x="//# sourceMappingURL=x.map";')).sourceMap
  );
});
