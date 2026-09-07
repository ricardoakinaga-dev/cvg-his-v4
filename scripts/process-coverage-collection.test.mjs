import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Session } from 'node:inspector/promises';
import { runInNewContext } from 'node:vm';
import { mkdtempSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { collectProcessCoverage } from './lib/process-coverage-collection.mjs';
import { readPinnedProcessRecords } from './lib/pinned-process-records.mjs';

const hash = (text) => createHash('sha256').update(text).digest('hex');
for (const anonymous of [false, true])
  for (const trailingNewline of [false, true])
    test(`script wrapper and sole function preserve separate counts; newline=${trailingNewline}, anonymous=${anonymous}`, async () => {
      const root = '/virtual/wrapper-function';
      const url = `file://${root}/apps/api/src/only.js`;
      const code =
        (anonymous ? 'x=>{if(x)return 1;return 2;}' : 'function f(x){if(x)return 1;return 2;}') +
        (trailingNewline ? '\n' : '');
      const session = new Session();
      session.connect();
      try {
        await session.post('Debugger.enable');
        await session.post('Profiler.enable');
        await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
        const context = {};
        const returned = runInNewContext(code, context, { filename: url });
        const reports = [await session.post('Profiler.takePreciseCoverage')];
        const script = reports[0].result.find((x) => x.url === url);
        assert.ok(script);
        const [wrapper, fn] = script.functions;
        assert.equal(wrapper.functionName, '');
        assert.equal(fn.functionName, anonymous ? '' : 'f');
        assert.equal(wrapper.ranges[0].count, 1);
        assert.equal(fn.ranges[0].count, 0);
        assert.equal(wrapper.ranges[0].endOffset - fn.ranges[0].endOffset, trailingNewline ? 1 : 0);
        for (const arg of [true, false]) {
          assert.equal((context.f ?? returned)(arg), arg ? 1 : 2);
          reports.push(await session.post('Profiler.takePreciseCoverage'));
        }
        const observed = (
          await session.post('Debugger.getScriptSource', { scriptId: script.scriptId })
        ).scriptSource;
        assert.equal(observed, code);
        const input = {
          root,
          files: { [url]: code },
          frozenHashes: { [url]: hash(code) },
          terminalHashes: { [url]: hash(code) },
          observations: [
            {
              name: `executed-script-${process.pid}-0-${script.scriptId}.json`,
              text: JSON.stringify({
                schemaVersion: 1,
                kind: 'executed-script-observation',
                pid: process.pid,
                threadId: 0,
                scriptId: script.scriptId,
                url,
                code,
                sha256: hash(code)
              })
            }
          ],
          reports: reports.map((r, i) => ({
            name: `coverage-${process.pid}-${400 + i}-0.json`,
            text: JSON.stringify(r)
          }))
        };
        const before = JSON.stringify(input);
        const initial = await collectProcessCoverage({
          ...input,
          reports: input.reports.slice(0, 1)
        });
        assert.deepEqual(Object.values(initial.coverage[url.slice(7)].f), [0]);
        for (const records of [input.reports, [...input.reports].reverse()]) {
          const result = await collectProcessCoverage({ ...input, reports: records });
          const entry = result.coverage[url.slice(7)];
          assert.deepEqual(Object.values(entry.f), [2]);
          assert.deepEqual(Object.values(entry.b), [[1, 1]]);
        }
        assert.equal(JSON.stringify(input), before);
        const duplicate = structuredClone(reports[0]);
        duplicate.result.find((x) => x.url === url).functions.push(structuredClone(fn));
        await assert.rejects(
          collectProcessCoverage({
            ...input,
            reports: [{ ...input.reports[0], text: JSON.stringify(duplicate) }]
          }),
          /duplicate V8 function range/
        );
        const invaded = structuredClone(reports[0]);
        invaded.result
          .find((x) => x.url === url)
          .functions[0].ranges.push({
            startOffset: code.indexOf('return'),
            endOffset: code.indexOf('return') + 6,
            count: 9
          });
        await assert.rejects(
          collectProcessCoverage({
            ...input,
            reports: [{ ...input.reports[0], text: JSON.stringify(invaded) }]
          }),
          /V8 parent block/
        );
      } finally {
        session.disconnect();
      }
    });

for (const mutation of [
  'root-counter-replacement',
  'crossing-functions',
  'parent-block-prefix',
  'parent-block-crossing'
])
  test(`collection rejects malformed real-capture mutation: ${mutation}`, async () => {
    const root = '/virtual/invalid-intervals';
    const url = `file://${root}/apps/api/src/example.js`;
    const code = 'function f(){return 1;} f();';
    const session = new Session();
    session.connect();
    try {
      await session.post('Debugger.enable');
      await session.post('Profiler.enable');
      await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
      runInNewContext(code, {}, { filename: url });
      const report = await session.post('Profiler.takePreciseCoverage');
      const script = report.result.find((x) => x.url === url);
      assert.ok(script);
      const observed = (
        await session.post('Debugger.getScriptSource', { scriptId: script.scriptId })
      ).scriptSource;
      assert.equal(observed, code);
      const input = {
        root,
        files: { [url]: code },
        frozenHashes: { [url]: hash(code) },
        terminalHashes: { [url]: hash(code) },
        observations: [
          {
            name: `executed-script-${process.pid}-0-${script.scriptId}.json`,
            text: JSON.stringify({
              schemaVersion: 1,
              kind: 'executed-script-observation',
              pid: process.pid,
              threadId: 0,
              scriptId: script.scriptId,
              url,
              code,
              sha256: hash(code)
            })
          }
        ],
        reports: [{ name: `coverage-${process.pid}-100-0.json`, text: JSON.stringify(report) }]
      };
      const baseline = await collectProcessCoverage(input);
      assert.deepEqual(Object.values(baseline.coverage[url.slice(7)].f), [1]);
      const changed = structuredClone(report);
      const target = changed.result.find((x) => x.url === url);
      const fn = target.functions.find((x) => x.functionName === 'f');
      const range = fn.ranges[0],
        middle = Math.floor((range.startOffset + range.endOffset) / 2);
      if (mutation === 'root-counter-replacement')
        fn.ranges.push(
          { startOffset: range.startOffset, endOffset: middle, count: 2 },
          { startOffset: middle, endOffset: range.endOffset, count: 2 }
        );
      else if (mutation === 'crossing-functions')
        target.functions.push({
          functionName: 'fake',
          isBlockCoverage: true,
          ranges: [{ startOffset: middle, endOffset: range.endOffset + 2, count: 9 }]
        });
      else {
        const parent = target.functions.find(
          (x) =>
            x.ranges[0].startOffset <= range.startOffset && x.ranges[0].endOffset > range.endOffset
        );
        assert.ok(parent);
        parent.ranges.push({
          startOffset: mutation === 'parent-block-prefix' ? range.startOffset : range.endOffset - 2,
          endOffset:
            mutation === 'parent-block-prefix' ? range.endOffset - 1 : parent.ranges[0].endOffset,
          count: 9
        });
      }
      const bad = { ...input, reports: [{ ...input.reports[0], text: JSON.stringify(changed) }] };
      await assert.rejects(collectProcessCoverage(bad), /V8 .*root|V8 .*function/);
    } finally {
      session.disconnect();
    }
  });

for (const mapped of [false, true])
  for (const form of ['property-anonymous', 'property-named', 'static-method', 'static-getter'])
    for (const calls of [0, 2])
      test(`real member function preserves ${calls} entry hits across captures; mapped=${mapped}, form=${form}`, async () => {
        const root = '/virtual/property-function';
        const sourceUrl = `file://${root}/apps/api/src/property.${mapped ? 'ts' : 'js'}`;
        const named = form === 'property-named';
        const isStatic = form.startsWith('static-');
        const getter = form === 'static-getter';
        const original = isStatic
          ? `class C{static ${getter ? 'get ' : ''}f(){return 1;}} globalThis.C=C;`
          : `var o={f:function${named ? ' named' : ''}(){return 1;}};`;
        const compiled = mapped
          ? ts.transpileModule(original, {
              fileName: 'property.ts',
              compilerOptions: { target: ts.ScriptTarget.ES2022, sourceMap: true }
            })
          : null;
        const map = compiled
          ? { ...JSON.parse(compiled.sourceMapText), sourceRoot: '', sources: [sourceUrl] }
          : null;
        const code = compiled
          ? compiled.outputText.replace(/\/\/# sourceMappingURL=.*\n?$/, '') +
            '\n//# sourceMappingURL=data:application/json;base64,' +
            Buffer.from(JSON.stringify(map)).toString('base64')
          : original;
        const url = mapped ? `file://${root}/apps/api/dist/property.js` : sourceUrl;
        const session = new Session();
        session.connect();
        try {
          await session.post('Debugger.enable');
          await session.post('Profiler.enable');
          await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
          const context = {};
          runInNewContext(code, context, { filename: url });
          const reports = [await session.post('Profiler.takePreciseCoverage')];
          const script = reports[0].result.find((x) => x.url === url);
          assert.ok(script);
          for (let i = 0; i < calls; i++) {
            assert.equal(isStatic ? (getter ? context.C.f : context.C.f()) : context.o.f(), 1);
            reports.push(await session.post('Profiler.takePreciseCoverage'));
          }
          const rawHits = reports.map(
            (r) =>
              r.result
                .find((x) => x.url === url)
                ?.functions.find(
                  (x) => x.functionName === (getter ? 'get f' : named ? 'named' : 'f')
                )?.ranges[0].count ?? 0
          );
          assert.deepEqual(rawHits, calls ? [0, 1, 1] : [0]);
          const observed = (
            await session.post('Debugger.getScriptSource', { scriptId: script.scriptId })
          ).scriptSource;
          assert.equal(observed, code);
          const input = {
            root,
            files: { [sourceUrl]: original },
            frozenHashes: { [sourceUrl]: hash(original) },
            terminalHashes: { [sourceUrl]: hash(original) },
            observations: [
              {
                name: `executed-script-${process.pid}-0-${script.scriptId}.json`,
                text: JSON.stringify({
                  schemaVersion: 1,
                  kind: 'executed-script-observation',
                  pid: process.pid,
                  threadId: 0,
                  scriptId: script.scriptId,
                  url,
                  code: observed,
                  sha256: hash(observed)
                })
              }
            ],
            reports: reports.map((r, i) => ({
              name: `coverage-${process.pid}-${200 + i}-0.json`,
              text: JSON.stringify(r)
            }))
          };
          const before = JSON.stringify(input);
          for (const records of [input.reports, [...input.reports].reverse()]) {
            const result = await collectProcessCoverage({ ...input, reports: records });
            assert.deepEqual(Object.values(result.coverage[sourceUrl.slice(7)].f), [calls]);
          }
          assert.equal(JSON.stringify(input), before);
        } finally {
          session.disconnect();
        }
      });

for (const mapped of [false, true])
  test(`async checkpoint intervals are combined before implicit branch conversion; mapped=${mapped}`, async () => {
    const root = '/virtual/async-collection';
    const sourceUrl = `file://${root}/apps/api/src/async.${mapped ? 'ts' : 'js'}`;
    const original =
      'async function work(){ await before; mark(); if (flag) await checkpoint(); return 7; }\nfunction never(){return 0;}';
    const compiled = mapped
      ? ts.transpileModule(original, {
          fileName: 'async.ts',
          compilerOptions: { target: ts.ScriptTarget.ES2022, sourceMap: true }
        })
      : null;
    const map = compiled
      ? { ...JSON.parse(compiled.sourceMapText), sourceRoot: '', sources: [sourceUrl] }
      : null;
    const code = compiled
      ? compiled.outputText.replace(/\/\/# sourceMappingURL=.*\n?$/, '') +
        '\n//# sourceMappingURL=data:application/json;base64,' +
        Buffer.from(JSON.stringify(map)).toString('base64')
      : original;
    const url = mapped ? `file://${root}/apps/api/dist/async.js` : sourceUrl;
    const files = { [sourceUrl]: original },
      hashes = { [sourceUrl]: hash(original) };
    let releaseGate, releaseCheckpoint;
    const gate = new Promise((r) => {
      releaseGate = r;
    });
    const captured = new Promise((r) => {
      releaseCheckpoint = r;
    });
    let firstPromise;
    const context = {
      flag: true,
      before: Promise.resolve(),
      mark: () => {
        firstPromise = session.post('Profiler.takePreciseCoverage');
      },
      checkpoint: async () => {
        releaseCheckpoint();
        await gate;
        return 7;
      }
    };
    const session = new Session();
    session.connect();
    try {
      await session.post('Debugger.enable');
      await session.post('Profiler.enable');
      await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
      runInNewContext(code, context, { filename: url });
      const pending = context.work();
      await captured;
      const first = await firstPromise;
      const script = first.result.find((x) => x.url === url);
      assert.ok(script);
      await new Promise((r) => setImmediate(r));
      const second = await session.post('Profiler.takePreciseCoverage');
      const resumed = second.result
        .find((x) => x.url === url)
        ?.functions.find((x) => x.functionName === 'work');
      assert.equal(resumed?.ranges[0].count, 0, 'real interval resets the function entry count');
      assert.ok(
        resumed.ranges.some((x) => x.count === 1),
        'real continuation has executed hits'
      );
      releaseGate();
      assert.equal(await pending, 7);
      const third = await session.post('Profiler.takePreciseCoverage');
      const observed = (
        await session.post('Debugger.getScriptSource', { scriptId: script.scriptId })
      ).scriptSource;
      assert.equal(observed, code);
      const input = {
        root,
        files,
        frozenHashes: hashes,
        terminalHashes: hashes,
        observations: [
          {
            name: `executed-script-${process.pid}-0-${script.scriptId}.json`,
            text: JSON.stringify({
              schemaVersion: 1,
              kind: 'executed-script-observation',
              pid: process.pid,
              threadId: 0,
              scriptId: script.scriptId,
              url,
              code: observed,
              sha256: hash(observed)
            })
          }
        ],
        reports: [first, second, third].map((r, i) => ({
          name: `coverage-${process.pid}-${9000 + i}-0.json`,
          text: JSON.stringify(r)
        }))
      };
      const before = JSON.stringify(input);
      const result = await collectProcessCoverage(input);
      const entry = result.coverage[sourceUrl.slice('file://'.length)];
      const fn = (name) => Object.keys(entry.fnMap).find((k) => entry.fnMap[k].name === name);
      assert.equal(entry.f[fn('work')], 1);
      assert.equal(entry.f[fn('never')], 0);
      assert.deepEqual(Object.values(entry.b), [[1, 0]]);
      assert.equal(JSON.stringify(input), before);
      assert.deepEqual(
        await collectProcessCoverage({ ...input, reports: [...input.reports].reverse() }),
        result
      );
      for (const field of ['pid', 'threadId', 'scriptId']) {
        const split = structuredClone(input);
        const o = JSON.parse(split.observations[0].text);
        o[field] = field === 'scriptId' ? o.scriptId + '0' : o[field] + 1;
        split.observations.push({
          name: `executed-script-${o.pid}-${o.threadId}-${o.scriptId}.json`,
          text: JSON.stringify(o)
        });
        for (let i = 1; i < split.reports.length; i++) {
          const r = JSON.parse(split.reports[i].text);
          const s = r.result.find((x) => x.url === url);
          if (s) s.scriptId = o.scriptId;
          split.reports[i] = {
            name: `coverage-${o.pid}-${9000 + i}-${o.threadId}.json`,
            text: JSON.stringify(r)
          };
        }
        await assert.rejects(collectProcessCoverage(split), /invalid hit count/);
      }
    } finally {
      releaseGate();
      releaseCheckpoint();
      session.disconnect();
    }
  });

for (const mapped of [false, true])
  test(`collection binds real report/observation identity and preserves original zeros; mapped=${mapped}`, async () => {
    const root = '/virtual/collection';
    const url = `${root}/apps/api/src/original.${mapped ? 'ts' : 'js'}`;
    const fileUrl = `file://${url}`;
    const original = 'function live(){return 1;} function never(){return 0;} live();';
    const compiled = mapped
      ? ts.transpileModule(original, {
          fileName: 'original.ts',
          compilerOptions: { target: ts.ScriptTarget.ES2022, sourceMap: true }
        })
      : null;
    const sourceMap = compiled
      ? { ...JSON.parse(compiled.sourceMapText), sourceRoot: '', sources: [fileUrl] }
      : null;
    const code = compiled
      ? compiled.outputText.replace(/\/\/# sourceMappingURL=.*\n?$/, '') +
        '\n//# sourceMappingURL=data:application/json;base64,' +
        Buffer.from(JSON.stringify(sourceMap)).toString('base64')
      : original;
    const runtimeUrl = mapped ? `file://${root}/apps/api/dist/generated.js` : fileUrl;
    const files = Object.freeze({ [fileUrl]: original });
    const frozenHashes = Object.freeze({ [fileUrl]: hash(original) });
    const session = new Session();
    session.connect();
    let rawDescriptor;
    try {
      const rawDirectory = mkdtempSync(join(tmpdir(), 'cvg-collection-reader-'));
      rawDescriptor = openSync(rawDirectory, 'r');
      await session.post('Debugger.enable');
      await session.post('Profiler.enable');
      await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
      const context = {};
      runInNewContext(code, context, { filename: runtimeUrl });
      const report = await session.post('Profiler.takePreciseCoverage');
      const coverage = report.result.find((x) => x.url === runtimeUrl);
      assert.ok(coverage);
      const observed = (
        await session.post('Debugger.getScriptSource', { scriptId: coverage.scriptId })
      ).scriptSource;
      assert.equal(observed, code);
      const observation = {
        schemaVersion: 1,
        kind: 'executed-script-observation',
        pid: process.pid,
        threadId: 0,
        scriptId: coverage.scriptId,
        url: runtimeUrl,
        code: observed,
        sha256: hash(observed)
      };
      const input = {
        root,
        files,
        frozenHashes,
        terminalHashes: frozenHashes,
        observations: [
          {
            name: `executed-script-${process.pid}-0-${coverage.scriptId}.json`,
            text: JSON.stringify(observation)
          }
        ],
        reports: [{ name: `coverage-${process.pid}-123456-0.json`, text: JSON.stringify(report) }]
      };
      const before = JSON.stringify(input);
      const result = await collectProcessCoverage(input);
      const entry = result.coverage[url];
      assert.deepEqual(Object.values(entry.f), [1, 0]);
      assert.ok(Object.values(entry.s).includes(0));
      assert.equal(result.convertedScripts, 1);
      assert.equal(JSON.stringify(input), before);
      for (const record of [...input.observations, ...input.reports])
        writeFileSync(`/proc/self/fd/${rawDescriptor}/${record.name}`, record.text, {
          flag: 'wx',
          mode: 0o600
        });
      assert.deepEqual(
        await collectProcessCoverage({
          ...input,
          observations: readPinnedProcessRecords(rawDescriptor, 'observations'),
          reports: readPinnedProcessRecords(rawDescriptor, 'reports')
        }),
        result
      );
      async function* stream(records) {
        for (const record of records) yield record;
      }
      assert.deepEqual(
        await collectProcessCoverage({
          ...input,
          reports: stream(input.reports),
          observations: stream(input.observations)
        }),
        result
      );
      await assert.rejects(
        collectProcessCoverage(
          { ...input, reports: stream(input.reports), observations: stream(input.observations) },
          { maxRecords: 1 }
        ),
        /record budget/
      );
      await assert.rejects(
        collectProcessCoverage(input, { maxObservationBytes: 2 }),
        /observation byte budget/
      );
      // Two actual snapshots are not duplicates merely because a function
      // executes once in each interval. Only the same snapshot is rejected.
      context.live();
      const secondReport = await session.post('Profiler.takePreciseCoverage');
      assert.notEqual(secondReport.timestamp, report.timestamp);
      const repeated = await collectProcessCoverage({
        ...input,
        reports: [
          ...input.reports,
          { name: `coverage-${process.pid}-123457-0.json`, text: JSON.stringify(secondReport) }
        ]
      });
      assert.deepEqual(Object.values(repeated.coverage[url].f), [2, 0]);
      const mixed = structuredClone(input);
      const mixedReport = JSON.parse(mixed.reports[0].text);
      mixedReport.result
        .find((x) => x.url === runtimeUrl)
        .functions.find((x) => x.functionName === 'live').isBlockCoverage = false;
      mixed.reports[0].text = JSON.stringify(mixedReport);
      mixed.reports.push({
        name: `coverage-${process.pid}-123457-0.json`,
        text: JSON.stringify(secondReport)
      });
      assert.deepEqual(
        Object.values((await collectProcessCoverage(mixed)).coverage[url].f),
        [2, 0],
        'function-level counts are not discarded in favor of another block-level interval'
      );
      const badLater = structuredClone(mixed);
      const badLaterReport = JSON.parse(badLater.reports[1].text);
      badLaterReport['source-map-cache'] = { [runtimeUrl]: { data: {} } };
      badLater.reports[1].text = JSON.stringify(badLaterReport);
      await assert.rejects(collectProcessCoverage(badLater));
      await assert.rejects(
        collectProcessCoverage(input, { maxAggregateBytes: 1 }),
        /aggregate byte budget/
      );
      // Mutations are negatives of real V8 input, not positive runtime proof.
      for (const mutate of [
        (fn) => {
          fn.ranges[0].count = -1;
        },
        (fn) => {
          fn.ranges[0].count = 0x100000000;
        },
        (fn) => {
          fn.ranges.push({ ...fn.ranges[0] });
        },
        (fn) => {
          fn.ranges.push({
            startOffset: fn.ranges[0].endOffset,
            endOffset: code.length + 1,
            count: 0
          });
        },
        (fn) => {
          fn.ranges.push({ ...fn.ranges[0], startOffset: fn.ranges[0].startOffset + 1 });
          fn.isBlockCoverage = false;
        }
      ]) {
        const changed = structuredClone(input);
        const r = JSON.parse(changed.reports[0].text);
        mutate(r.result.find((x) => x.url === runtimeUrl).functions[0]);
        changed.reports[0].text = JSON.stringify(r);
        await assert.rejects(collectProcessCoverage(changed), /V8/);
      }
      const overflow = structuredClone(input);
      const overflowReport = JSON.parse(overflow.reports[0].text);
      overflowReport.result
        .find((x) => x.url === runtimeUrl)
        .functions.find((x) => x.functionName === 'live').ranges[0].count = 0xffffffff;
      overflow.reports[0].text = JSON.stringify(overflowReport);
      overflow.reports.push({
        name: `coverage-${process.pid}-123457-0.json`,
        text: JSON.stringify(secondReport)
      });
      await assert.rejects(collectProcessCoverage(overflow), /V8 counter/);
      for (const mutate of [
        (x) => {
          x.observations = [];
        },
        (x) => {
          x.observations[0].name = x.observations[0].name.replace(`${process.pid}`, '1');
        },
        (x) => {
          const o = JSON.parse(x.observations[0].text);
          o.code += ' ';
          x.observations[0].text = JSON.stringify(o);
        },
        (x) => {
          x.reports.push(x.reports[0]);
        },
        (x) => {
          x.observations.push(x.observations[0]);
        },
        (x) => {
          x.terminalHashes = {};
        },
        (x) => {
          const r = JSON.parse(x.reports[0].text);
          r.result.push(coverage);
          x.reports[0].text = JSON.stringify(r);
        },
        (x) => {
          x.reports[0].name = '../coverage-1-1-0.json';
        },
        (x) => {
          x.reports.push({ ...x.reports[0], name: x.reports[0].name.replace('123456', '123457') });
        },
        (x) => {
          const r = JSON.parse(x.reports[0].text);
          r['source-map-cache'] = 42;
          x.reports[0].text = JSON.stringify(r);
        },
        (x) => {
          const r = JSON.parse(x.reports[0].text);
          r['source-map-cache'] = { [runtimeUrl]: {} };
          x.reports[0].text = JSON.stringify(r);
        },
        (x) => {
          const o = JSON.parse(x.observations[0].text);
          o.scriptId += '0';
          x.observations.push({
            name: `executed-script-${process.pid}-0-${o.scriptId}.json`,
            text: JSON.stringify(o)
          });
        }
      ]) {
        const changed = structuredClone(input);
        mutate(changed);
        await assert.rejects(collectProcessCoverage(changed));
      }
      await assert.rejects(collectProcessCoverage(input, { maxBytes: 2 }), /budget/);
    } finally {
      if (rawDescriptor !== undefined) closeSync(rawDescriptor);
      session.disconnect();
    }
  });
