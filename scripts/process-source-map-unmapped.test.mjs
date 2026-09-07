import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { Session } from 'node:inspector/promises';
import { runInNewContext } from 'node:vm';
import { convertNativeScript } from './lib/native-v8-conversion.mjs';
import {
  convertProcessSourceMapChain,
  prepareProcessSourceMapChain
} from './lib/process-source-map-chain.mjs';

const require = createRequire(import.meta.url);
const coverageRequire = createRequire(require.resolve('@vitest/coverage-v8/package.json'));
const { TraceMap, encodedMappings, traceSegment } = coverageRequire('@jridgewell/trace-mapping');
const hash = (text) => createHash('sha256').update(text).digest('hex');
const endings = ['\n', '\r\n', '\r', '\u2028', '\u2029', null];
const joinLines = (lines, ending) =>
  lines
    .map(
      (line, i) =>
        line +
        (i === lines.length - 1 ? '' : (ending ?? ['\r', '\n', '\u2028', '\r\n', '\u2029'][i % 5]))
    )
    .join('');
const encode = (sources, mappings) => ({
  version: 3,
  names: [],
  sources,
  mappings: encodedMappings(new TraceMap({ version: 3, names: [], sources, mappings }))
});
const inline = (map) =>
  '\n//# sourceMappingURL=data:application/json;base64,' +
  Buffer.from(JSON.stringify(map)).toString('base64');

test('three-stage multi-source composition matches pointwise GLB oracle with names', () => {
  // Deterministic synthetic algebra, not an executed-coverage claim.
  const terminalA = 'file:///virtual/algebra-A.js',
    terminalB = 'file:///virtual/algebra-B.js';
  const childUrl = 'file:///virtual/algebra-C.js',
    middleUrl = 'file:///virtual/algebra-D.js',
    runtimeUrl = 'file:///virtual/algebra-runtime.js';
  const body = Array(3).fill(' '.repeat(30)).join('\n');
  for (let seed = 1; seed <= 100; seed++) {
    let state = seed;
    const random = (limit) => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state % limit;
    };
    const make = (sources) => {
      const names = ['alpha', 'beta', ''];
      const segment = (column) =>
        random(4) === 0
          ? [column]
          : [
              column,
              random(sources.length),
              random(3),
              random(31),
              ...(random(2) ? [random(names.length)] : [])
            ];
      const mappings = Array.from({ length: 3 }, (_, line) => {
        const values = [];
        for (let column = 0; column <= 30; column += 5) {
          values.push(line === 0 && column === 0 ? [0, sources.length - 1, 0, 0] : segment(column));
          if (random(3) === 0) values.push(segment(column));
        }
        return values;
      });
      return {
        version: 3,
        sources,
        names,
        mappings: encodedMappings(new TraceMap({ version: 3, sources, names, mappings }))
      };
    };
    const child = make([terminalA, terminalB]),
      middle = make([childUrl, terminalB]),
      root = make([middleUrl, childUrl, terminalA]);
    const rawMaps = new Map([
      [childUrl, new TraceMap(child)],
      [middleUrl, new TraceMap(middle)]
    ]);
    const files = {
      [terminalA]: body,
      [terminalB]: body,
      [childUrl]: body + inline(child),
      [middleUrl]: body + inline(middle)
    };
    const frozenHashes = Object.fromEntries(
      Object.entries(files).map(([url, text]) => [url, hash(text)])
    );
    const code = body + inline(root);
    const input = {
      pid: 1,
      threadId: 0,
      files,
      frozenHashes,
      coverage: { url: runtimeUrl, scriptId: '1' },
      observation: {
        schemaVersion: 1,
        kind: 'executed-script-observation',
        pid: 1,
        threadId: 0,
        scriptId: '1',
        url: runtimeUrl,
        code,
        sha256: hash(code)
      }
    };
    const output = new TraceMap(
      prepareProcessSourceMapChain(input, {
        terminalHashes: { [terminalA]: hash(body), [terminalB]: hash(body) }
      }).sourceMap
    );
    const trace = (map, line, column, inheritedName) => {
      const segment = traceSegment(map, line, column);
      if (!segment || segment.length === 1) return null;
      const source = map.sources[segment[1]],
        name = segment.length === 5 ? map.names[segment[4]] : inheritedName;
      return rawMaps.has(source)
        ? trace(rawMaps.get(source), segment[2], segment[3], name)
        : [source, segment[2], segment[3], name];
    };
    const rootTrace = new TraceMap(root);
    for (let line = 0; line < 3; line++)
      for (let column = 0; column <= 30; column++)
        assert.deepEqual(
          trace(output, line, column),
          trace(rootTrace, line, column),
          `seed=${seed} ${line}:${column}`
        );
  }
});

test('relocating an unmapped child prefix cannot inherit preceding original coverage', async () => {
  const sourceUrl = 'file:///virtual/relocation-original.js',
    childUrl = 'file:///virtual/relocation-child.js';
  const live = 'function live(){return 1;} live(); ',
    helper = 'function helper(){return 9;} helper(); ',
    never = 'function never(){return 0;}';
  const original = live + never,
    childBody = helper + original,
    body = live + helper + never;
  const childMap = encode(
    [sourceUrl],
    [
      [
        [0],
        ...Array.from({ length: original.length + 1 }, (_, col) => [helper.length + col, 0, 0, col])
      ]
    ]
  );
  const top = encode(
    [childUrl],
    [
      Array.from({ length: body.length + 1 }, (_, col) => [
        col,
        0,
        0,
        col < live.length
          ? helper.length + col
          : col < live.length + helper.length
            ? col - live.length
            : col
      ])
    ]
  );
  const explicit = encode(
    [sourceUrl],
    [
      Array.from({ length: body.length + 1 }, (_, col) =>
        col < live.length
          ? [col, 0, 0, col]
          : col < live.length + helper.length
            ? [col]
            : [col, 0, 0, col - helper.length]
      )
    ]
  );
  const code = body + inline(top),
    files = { [sourceUrl]: original, [childUrl]: childBody + inline(childMap) };
  const frozenHashes = Object.fromEntries(
    Object.entries(files).map(([url, text]) => [url, hash(text)])
  );
  const session = new Session();
  session.connect();
  try {
    await session.post('Debugger.enable');
    await session.post('Profiler.enable');
    await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    const url = 'file:///virtual/relocated-runtime.js';
    runInNewContext(code, {}, { filename: url });
    const coverage = (await session.post('Profiler.takePreciseCoverage')).result.find(
      (x) => x.url === url
    );
    const observed = (
      await session.post('Debugger.getScriptSource', { scriptId: coverage.scriptId })
    ).scriptSource;
    assert.equal(observed, code);
    const input = {
      pid: process.pid,
      threadId: 0,
      files,
      frozenHashes,
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
    const options = { terminalHashes: { [sourceUrl]: hash(original) } };
    const before = JSON.stringify(input);
    const actual = await convertProcessSourceMapChain(input, options);
    const expected = await convertNativeScript({
      code,
      coverage,
      sourceMap: explicit,
      sources: { [sourceUrl]: original }
    });
    assert.deepEqual(actual, expected);
    assert.deepEqual(
      Object.values(Object.values(actual)[0].fnMap).map((x) => x.name),
      ['live', 'never']
    );
    assert.equal(JSON.stringify(input), before);
  } finally {
    session.disconnect();
  }
});

test('native conversion agrees for equivalent duplicate and explicit GLB maps', async () => {
  const source = 'function live(){return 1;} function never(){return 0;} live();';
  const sourceUrl = 'file:///virtual/native-duplicate-original.js';
  const session = new Session();
  session.connect();
  let cases = 0;
  try {
    await session.post('Debugger.enable');
    await session.post('Profiler.enable');
    await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
    for (const ending of endings.filter(Boolean)) {
      const code = source + ending + '// end';
      const url = `file:///virtual/native-duplicate-${cases}.js`;
      runInNewContext(code, {}, { filename: url });
      const coverage = (await session.post('Profiler.takePreciseCoverage')).result.find(
        (x) => x.url === url
      );
      assert.equal(
        (await session.post('Debugger.getScriptSource', { scriptId: coverage.scriptId }))
          .scriptSource,
        code
      );
      for (const column of [0, 9, 16, 26, 35, 43, 53])
        for (const reverse of [false, true]) {
          const segments = Array.from({ length: source.length + 1 }, (_, col) => [
            col,
            0,
            0,
            col
          ]).filter((s) => s[0] < column || s[0] > column + 3);
          const group = [[column], [column, 0, 0, column]];
          segments.push(...(reverse ? group.reverse() : group));
          segments.sort((a, b) => a[0] - b[0]);
          const map = encode([sourceUrl], [segments]);
          const trace = new TraceMap(map);
          const dense = encode(
            [sourceUrl],
            [
              Array.from({ length: source.length + 1 }, (_, col) => {
                const segment = traceSegment(trace, 0, col);
                return segment ? [col, ...segment.slice(1)] : [col];
              })
            ]
          );
          const meaning = (s) => (!s || s.length === 1 ? null : s.slice(1));
          for (let col = 0; col <= source.length; col++)
            assert.deepEqual(
              meaning(traceSegment(new TraceMap(dense), 0, col)),
              meaning(traceSegment(trace, 0, col))
            );
          const base = { code, coverage, sources: { [sourceUrl]: source } };
          const before = JSON.stringify({ base, map, dense });
          assert.deepEqual(
            await convertNativeScript({ ...base, sourceMap: map }),
            await convertNativeScript({ ...base, sourceMap: dense }),
            `ending=${JSON.stringify(ending)} column=${column} reverse=${reverse}`
          );
          assert.equal(JSON.stringify({ base, map, dense }), before);
          cases++;
        }
    }
    assert.equal(cases, 70);
  } finally {
    session.disconnect();
  }
});

test('composition preserves exact-point AND between-column duplicate semantics', () => {
  // Synthetic map algebra only, not a claim of observed execution coverage.
  const sourceUrl = 'file:///virtual/algebra.js',
    url = 'file:///virtual/algebra-generated.js';
  const source = 'let value = 1;';
  for (const duplicate of [
    [[0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [0]],
    [
      [0, 0, 0, 0],
      [0, 0, 0, 2]
    ]
  ]) {
    const map = encode([sourceUrl], [[...duplicate, [8, 0, 0, 8]]]);
    const code = source + inline(map);
    const input = {
      pid: 1,
      threadId: 0,
      files: { [sourceUrl]: source },
      frozenHashes: { [sourceUrl]: hash(source) },
      coverage: { url, scriptId: '1' },
      observation: {
        schemaVersion: 1,
        kind: 'executed-script-observation',
        pid: 1,
        threadId: 0,
        scriptId: '1',
        url,
        code,
        sha256: hash(code)
      }
    };
    const composed = prepareProcessSourceMapChain(input, {
      terminalHashes: { [sourceUrl]: hash(source) }
    }).sourceMap;
    const before = new TraceMap(map),
      after = new TraceMap(composed);
    const meaning = (segment) => (!segment || segment.length === 1 ? null : segment.slice(1));
    for (let col = 0; col <= source.length; col++)
      assert.deepEqual(
        meaning(traceSegment(after, 0, col)),
        meaning(traceSegment(before, 0, col)),
        `column ${col}`
      );
  }
});

for (const stage of ['root', 'intermediate'])
  for (const position of ['prefix', 'middle', 'tail'])
    test(`duplicate-column GLB remains unmapped at ${stage}/${position}`, async () => {
      const original = 'function live(){ return 1; } function never(){ return 0; } live();';
      const helper = 'function helper(){ return 9; } helper(); ';
      const at =
        position === 'prefix'
          ? 0
          : position === 'tail'
            ? original.length
            : original.indexOf('function never');
      const body = original.slice(0, at) + helper + original.slice(at);
      const sourceUrl = 'file:///virtual/duplicate-original.js',
        intermediateUrl = 'file:///virtual/duplicate-stage.js';
      const segments = [];
      for (let col = 0; col <= body.length; col++) {
        if (col === at) segments.push([col], [col, 0, 0, at]);
        // Duplicate exact lookup is unmapped, but between columns GLB selects
        // the last duplicate. Explicitly keep the rest of the helper unmapped.
        else if (col === at + 1) segments.push([col]);
        else if (col < at || col >= at + helper.length)
          segments.push([col, 0, 0, col < at ? col : col - helper.length]);
      }
      const map = encode([sourceUrl], [segments]);
      assert.deepEqual(traceSegment(new TraceMap(map), 0, at), [at]);
      const intermediate = body + inline(map);
      const topMap =
        stage === 'root'
          ? map
          : encode(
              [intermediateUrl],
              [Array.from({ length: body.length + 1 }, (_, col) => [col, 0, 0, col])]
            );
      const code = body + inline(topMap);
      const files = Object.freeze({
        [sourceUrl]: original,
        ...(stage === 'intermediate' ? { [intermediateUrl]: intermediate } : {})
      });
      const frozenHashes = Object.freeze(
        Object.fromEntries(Object.entries(files).map(([url, text]) => [url, hash(text)]))
      );
      const session = new Session();
      session.connect();
      try {
        await session.post('Debugger.enable');
        await session.post('Profiler.enable');
        await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
        const url = `file:///virtual/duplicate-${stage}-${position}.js`;
        runInNewContext(code, {}, { filename: url });
        const coverage = (await session.post('Profiler.takePreciseCoverage')).result.find(
          (x) => x.url === url
        );
        const observed = (
          await session.post('Debugger.getScriptSource', { scriptId: coverage.scriptId })
        ).scriptSource;
        assert.equal(observed, code);
        const input = {
          pid: process.pid,
          threadId: 0,
          files,
          frozenHashes,
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
        const options = { terminalHashes: { [sourceUrl]: hash(original) } };
        const before = JSON.stringify(input);
        const prepared = prepareProcessSourceMapChain(input, options);
        const effective = traceSegment(new TraceMap(prepared.sourceMap), 0, at);
        assert.ok(!effective || effective.length === 1, 'composition must preserve unmapped GLB');
        const entry = Object.values(await convertProcessSourceMapChain(input, options))[0];
        assert.deepEqual(
          Object.values(entry.fnMap).map((x) => x.name),
          ['live', 'never']
        );
        assert.deepEqual(Object.values(entry.f), [1, 0]);
        assert.deepEqual(Object.values(entry.s), [1, 0, 1]);
        assert.equal(JSON.stringify(input), before);
      } finally {
        session.disconnect();
      }
    });

for (const mode of ['line', 'prefix', 'middle'])
  test(`36 real original/generated terminator combinations preserve unmapped ${mode} helpers`, async () => {
    const originalLines = [
      'function live(){ return "😀"; }',
      'function never(){ return 0; }',
      'live();',
      '// spacer A',
      '// spacer B',
      '// spacer C'
    ];
    const helper = 'function helper(){ return 9; }';
    const points = (line, originalLine, offset = 0) =>
      Array.from({ length: line.length + 1 }, (_, col) => [offset + col, 0, originalLine, col]);
    let generatedLines, originalMappings;
    if (mode === 'line') {
      generatedLines = [originalLines[0], helper, ...originalLines.slice(1)];
      originalMappings = [
        points(originalLines[0], 0),
        [],
        ...originalLines.slice(1).map((line, i) => points(line, i + 1))
      ];
    } else if (mode === 'prefix') {
      generatedLines = [helper + ' ' + originalLines[0], ...originalLines.slice(1)];
      originalMappings = [
        [[0], ...points(originalLines[0], 0, helper.length + 1)],
        ...originalLines.slice(1).map((line, i) => points(line, i + 1))
      ];
    } else {
      const second = originalLines[0].length + helper.length + 2;
      generatedLines = [
        originalLines[0] + ' ' + helper + ' ' + originalLines[1],
        ...originalLines.slice(2)
      ];
      originalMappings = [
        [
          ...points(originalLines[0], 0),
          [originalLines[0].length + 1],
          ...points(originalLines[1], 1, second)
        ],
        ...originalLines.slice(2).map((line, i) => points(line, i + 2))
      ];
    }
    generatedLines.push('helper();');
    originalMappings.push([]);
    const sourceUrl = 'file:///virtual/original.ts';
    const intermediateUrl = 'file:///virtual/intermediate.js';
    const session = new Session();
    session.connect();
    try {
      await session.post('Debugger.enable');
      await session.post('Profiler.enable');
      await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
      for (const [originalKind, originalEnding] of endings.entries()) {
        const original = joinLines(originalLines, originalEnding);
        const intermediateMap = encode([sourceUrl], originalMappings);
        const intermediate = generatedLines.join('\n') + inline(intermediateMap);
        const topMap = encode(
          [intermediateUrl],
          generatedLines.map((line, i) =>
            Array.from({ length: line.length + 1 }, (_, col) => [col, 0, i, col])
          )
        );
        const files = Object.freeze({ [sourceUrl]: original, [intermediateUrl]: intermediate });
        const frozenHashes = Object.freeze(
          Object.fromEntries(Object.entries(files).map(([url, text]) => [url, hash(text)]))
        );
        let baseline;
        for (const [generatedKind, generatedEnding] of endings.entries()) {
          const url = `file:///virtual/${mode}-${originalKind}-${generatedKind}.js`;
          const code = joinLines(generatedLines, generatedEnding) + inline(topMap);
          runInNewContext(code, {}, { filename: url });
          const { result } = await session.post('Profiler.takePreciseCoverage');
          const coverage = result.find((entry) => entry.url === url);
          assert.ok(coverage);
          const { scriptSource } = await session.post('Debugger.getScriptSource', {
            scriptId: coverage.scriptId
          });
          assert.equal(scriptSource, code);
          const input = {
            pid: process.pid,
            threadId: 0,
            files,
            frozenHashes,
            coverage,
            observation: {
              schemaVersion: 1,
              kind: 'executed-script-observation',
              pid: process.pid,
              threadId: 0,
              scriptId: coverage.scriptId,
              url,
              code: scriptSource,
              sha256: hash(scriptSource)
            }
          };
          const before = JSON.stringify(input);
          const entry = (
            await convertProcessSourceMapChain(input, {
              terminalHashes: { [sourceUrl]: hash(original) }
            })
          )['/virtual/original.ts'];
          assert.equal(JSON.stringify(input), before);
          assert.deepEqual(
            Object.values(entry.fnMap).map((fn) => fn.name),
            ['live', 'never']
          );
          assert.deepEqual(Object.values(entry.f), [1, 0]);
          assert.deepEqual(
            Object.values(entry.s),
            [1, 0, 1],
            JSON.stringify({ mode, originalKind, generatedKind, statementMap: entry.statementMap })
          );
          if (generatedKind === 0) baseline = entry;
          assert.deepEqual(entry, baseline, `original=${originalKind}, generated=${generatedKind}`);
        }
      }
    } finally {
      session.disconnect();
    }
  });
