import { test } from 'node:test';
import assert from 'node:assert/strict';
import reporter from './lib/critical-coverage-json-reporter.cjs';
import { validateRawCoverageEntry } from './check-critical-coverage.mjs';
const { canonicalizeLineEnds } = reporter;
const source = 'const π = 1;\r\nπ;';
const loc = () => ({ start: { line: 1, column: 0 }, end: { line: 1, column: Infinity } });
const entry = () => ({ path: '/fixture.ts', statementMap: { 0: loc() }, s: { 0: 0 }, fnMap: { 0: { name: 'f', decl: loc(), loc: loc() } }, f: { 0: 0 }, branchMap: { 0: { type: 'branch', loc: loc(), locations: [loc()] } }, b: { 0: [0] } });
test('serializes in-memory Infinity line ends without losing zero-hit instrumentation', () => {
  const raw = entry(); const result = canonicalizeLineEnds(raw, source);
  assert.equal(raw.statementMap[0].end.column, Infinity);
  assert.equal(result.statementMap[0].end.column, 12);
  assert.deepEqual(validateRawCoverageEntry(JSON.parse(JSON.stringify(result)), source), []);
  for (const key of ['s', 'f', 'b']) assert.deepEqual(result[key], raw[key]);
});
test('does not repair null, negative, out-of-bounds or start sentinels', () => {
  for (const value of [null, -1, 1000, NaN]) {
    const raw = entry(); raw.statementMap[0].end.column = value;
    assert.ok(validateRawCoverageEntry(canonicalizeLineEnds(raw, source), source).length);
  }
  const raw = entry(); raw.statementMap[0].start.column = Infinity;
  assert.ok(validateRawCoverageEntry(canonicalizeLineEnds(raw, source), source).length);
});
test('rejects line-end sentinels outside the original source', () => {
  const raw = entry(); raw.statementMap[0].end.line = 9999;
  assert.throws(() => canonicalizeLineEnds(raw, source), /nonexistent source line/);
});
test('preserves finite ranges and nonzero counters exactly', () => {
  const raw = entry(); raw.statementMap[0].end.column = 5; raw.s[0] = 7;
  const result = canonicalizeLineEnds(raw, source);
  assert.deepEqual(result.statementMap, raw.statementMap); assert.deepEqual(result.s, raw.s);
});
test('retains implicit else counters and anchors only source-verified absent syntax', () => {
  const text = 'if (ready) { run(); }';
  const raw = entry();
  raw.branchMap[0] = { type: 'if', loc: loc(), locations: [loc(), { start: {}, end: {} }] };
  raw.b[0] = [0, 3];
  const result = canonicalizeLineEnds(raw, text);
  assert.deepEqual(result.b[0], [0, 3]);
  assert.deepEqual(result.branchMap[0].locations[1], { start: { line: 1, column: text.length }, end: { line: 1, column: text.length } });
  assert.deepEqual(validateRawCoverageEntry(result, text), []);
  for (const other of ['run();', 'if (ready) { run(); } else { stop(); }']) {
    assert.ok(validateRawCoverageEntry(canonicalizeLineEnds(raw, other), other).length);
  }
});
test('anchors a remapped else-if at its exact original AST end', () => {
  const text = 'if (a) run();\nelse if (b) stop();';
  const raw = entry();
  const mapped = { start: { line: 1, column: 13 }, end: { line: 2, column: 19 } };
  raw.branchMap[0] = { type: 'if', loc: mapped, locations: [mapped, { start: {}, end: {} }] };
  raw.b[0] = [0, 0];
  const result = canonicalizeLineEnds(raw, text);
  assert.deepEqual(result.branchMap[0].locations[1].end, { line: 2, column: 19 });
  assert.deepEqual(validateRawCoverageEntry(result, text), []);
});
test('never normalizes malformed implicit-else points into valid source evidence', () => {
  for (const point of [[], '', null, 0, { bogus: undefined }, { line: null }, { column: -1 }]) {
    const raw = entry();
    raw.branchMap[0] = { type: 'if', loc: loc(), locations: [loc(), { start: point, end: point }] };
    raw.b[0] = [0, 0];
    assert.ok(validateRawCoverageEntry(canonicalizeLineEnds(raw, 'if (a) run();'), 'if (a) run();').length);
  }
});

for (const ending of ['\n', '\r\n', '\r', '\u2028', '\u2029']) {
  test(`reporter and validator agree on line ending ${JSON.stringify(ending)}`, () => {
    const text = `const π = 1;${ending}π;`;
    const result = canonicalizeLineEnds(entry(), text);
    assert.equal(result.statementMap[0].end.column, 12);
    assert.deepEqual(validateRawCoverageEntry(result, text), []);
    result.statementMap[0] = { start: { line: 2, column: 0 }, end: { line: 2, column: 2 } };
    assert.deepEqual(validateRawCoverageEntry(result, text), []);
    result.statementMap[0].end = { line: 1, column: 13 };
    result.statementMap[0].start.line = 1;
    assert.ok(validateRawCoverageEntry(result, text).some((error) => error.includes('source location')));
    assert.equal(result.s[0], 0);
  });
}
