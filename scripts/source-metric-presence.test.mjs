import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isRuntimeReexportOnly,
  assertSourceMetricPresence
} from './lib/source-metric-presence.mjs';

test('empty metric eligibility parses only actual runtime reexports', () => {
  for (const source of [
    "export * from './a.js';",
    "export { live, never as other } from './a.js';",
    "export * as values from './a.js';",
    "/* comment */ export * from './a.js';\nexport * from './b.js';",
    "export type { Value } from './a.js'; export { live } from './a.js';",
    "export { type Value, live } from './a.js';",
    'export type { T as A, T as B } from "a"; export { f } from "b";',
    'export type * as Types from "a"; export * as values from "a";',
    'export { f as "first", f as "second" } from "a";',
    'export { type T as "\\uD83D\\uDE00", f } from "a";',
    'export type { T } from "a" with { "resolution-mode": "import" }; export * from "b";',
    'export type { T } from "a" with { "resolution-mode": "require" }; export * from "b";',
    'export type { T } from "a" assert { "resolution-mode": "import" }; export * from "b";'
  ])
    assert.equal(isRuntimeReexportOnly(source), true, source);
  for (const source of [
    undefined,
    '',
    '// export * from "a";',
    '"export * from a";',
    'export {};',
    'export type { A } from "a";',
    'export { type A } from "a";',
    'export * from "";',
    'export * from ;',
    'export const value = 1;',
    'export function live() {}',
    'export class A {}',
    'interface A {}',
    'type A = string;',
    'import "./effect.js"; export * from "./a.js";',
    'effect(); export * from "./a.js";',
    'export * from "./a.js"; export default 3;',
    'declare export * from "a";',
    'export { x } from "a"; export { x } from "b";',
    'export * from "a" with { type: effect() };',
    'export type { T } from "a" with { type: effect() }; export * from "b";',
    'export type { T } from "a" with { type: "json" }; export * from "b";',
    'export type { type T } from "./example.js"; export * from "./example.js";',
    'export type { T, T } from "./example.js"; export * from "./example.js";',
    'export { type T, type T, f } from "./example.js";',
    'export type { T } from "a"; export type { T } from "b"; export * from "c";',
    'export type * as T from "a"; export { f as T } from "b";',
    'export { type T as "\\uD800", f } from "./example.js";',
    'export type { "\\uDC00" as T } from "a"; export * from "b";',
    'export type { T } from "a" with { "resolution-mode": "unknown" }; export * from "b";',
    'export type { T } from "a" with { "resolution-mode": "import", type: "json" }; export * from "b";',
    'export type { T } from "a" with { "resolution-mode": "import", "resolution-mode": "require" }; export * from "b";',
    'export * from "a" with { "resolution-mode": "import" };'
  ])
    assert.equal(isRuntimeReexportOnly(source), false, String(source));
});

test('empty metrics require the exact authenticated original while measured zero hits remain valid', () => {
  const entry = { path: '/packages/barrel.ts', s: {}, f: {}, b: {} };
  assert.doesNotThrow(() =>
    assertSourceMetricPresence(entry, {
      'file:///packages/barrel.ts': 'export * from "./dependency.js";'
    })
  );
  assert.throws(() => assertSourceMetricPresence(entry, {}), /empty executable/);
  assert.throws(
    () =>
      assertSourceMetricPresence(entry, {
        'file:///packages/barrel.ts': 'export function never() {}'
      }),
    /empty executable/
  );
  assert.doesNotThrow(() => assertSourceMetricPresence({ ...entry, f: { 0: 0 } }, {}));
});
