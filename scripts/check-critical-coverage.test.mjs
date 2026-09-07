import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { checkCriticalCoverage, validateRawCoverageEntry } from './check-critical-coverage.mjs';
const hash = (x) => createHash('sha256').update(x).digest('hex');
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'critical-gate-'));
  const path = 'example.ts';
  const source = 'export function f(a) { return a ? 1 : 2; }\n';
  writeFileSync(join(root, path), source);
  const manifest = {
    head: 'fixture',
    executionInputs: [path],
    requiredShards: ['unit'],
    components: ['auth'],
    thresholds: { lines: 85, statements: 85, functions: 85, branches: 85 },
    files: [
      { path, sha256: hash(source), components: ['auth'], applicability: 'javascript-metrics' }
    ]
  };
  const bytes = JSON.stringify(manifest);
  writeFileSync(join(root, 'manifest.json'), bytes);
  mkdirSync(join(root, 'unit'));
  const metadata = {
    schemaVersion: 2,
    finalizedAfterExit: true,
    exitCode: 0,
    signal: null,
    runId: 'fixture-run',
    executionInputHashes: { [path]: hash(source) },
    testResultFile: 'result.json',
    shard: 'unit',
    status: 'passed',
    head: 'fixture',
    manifestSha256: hash(bytes),
    sourceHashes: { [path]: hash(source) },
    coverageFile: 'coverage.json'
  };
  const loc = { start: { line: 1, column: 0 }, end: { line: 1, column: source.trimEnd().length } };
  const coverage = {
    [path]: {
      path,
      statementMap: { 0: loc },
      fnMap: { 0: { name: 'f', decl: loc, loc, line: 1 } },
      branchMap: { 0: { type: 'cond-expr', line: 1, loc, locations: [loc, loc] } },
      s: { 0: 2 },
      f: { 0: 2 },
      b: { 0: [1, 1] }
    }
  };
  const resultBytes = JSON.stringify({ runId: 'fixture-run', shard: 'unit', status: 'passed' });
  writeFileSync(join(root, 'unit/result.json'), resultBytes);
  metadata.testResultSha256 = hash(resultBytes);
  const save = () => {
    metadata.coverageSha256 = hash(JSON.stringify(coverage));
    writeFileSync(join(root, 'unit/shard.json'), JSON.stringify(metadata));
    writeFileSync(join(root, 'unit/coverage.json'), JSON.stringify(coverage));
  };
  save();
  return {
    root,
    metadata,
    coverage,
    save,
    check: () =>
      checkCriticalCoverage({
        root,
        manifestPath: join(root, 'manifest.json'),
        artifactsPath: root,
        head: 'fixture'
      }),
    cleanup: () => rmSync(root, { recursive: true, force: true })
  };
}
for (const [name, mutate, expected] of [
  ['complete fixture validates harness only', () => {}, null],
  ['missing shard fails', (x) => rmSync(join(x.root, 'unit/shard.json')), 'missing shard'],
  [
    'missing source coverage fails',
    (x) => {
      delete x.coverage['example.ts'];
      x.save();
    },
    'missing instrumented file'
  ],
  [
    'changed source fails',
    (x) => writeFileSync(join(x.root, 'example.ts'), 'changed'),
    'source hash mismatch'
  ],
  [
    'stale shard source hash fails',
    (x) => {
      x.metadata.sourceHashes['example.ts'] = 'stale';
      x.save();
    },
    'shard source hash mismatch'
  ],
  [
    'uncovered branch fails despite covered lines',
    (x) => {
      x.coverage['example.ts'].b[0] = [1, 0];
      x.save();
    },
    'auth:branches=50'
  ],
  [
    'zero hits retained and fail',
    (x) => {
      x.coverage['example.ts'].s[0] = 0;
      x.coverage['example.ts'].f[0] = 0;
      x.coverage['example.ts'].b[0] = [0, 0];
      x.save();
    },
    'auth:lines=0'
  ],
  [
    'swapped raw bytes cannot reuse sidecar',
    (x) => {
      const stale = readFileSync(join(x.root, 'unit/shard.json'));
      x.coverage['example.ts'].b[0] = [99, 99];
      x.save();
      writeFileSync(join(x.root, 'unit/shard.json'), stale);
    },
    'coverage digest mismatch'
  ],
  [
    'changed test config input fails',
    (x) => {
      x.metadata.executionInputHashes['example.ts'] = 'stale';
      x.save();
    },
    'execution input hash mismatch'
  ],
  [
    'unmapped branch counters cannot inflate coverage',
    (x) => {
      x.coverage['example.ts'].b[0] = [1, 0];
      x.coverage['example.ts'].b[99] = Array(8).fill(1);
      x.save();
    },
    'map/counter key mismatch'
  ],
  [
    'fractional hit counts fail',
    (x) => {
      x.coverage['example.ts'].s[0] = 0.5;
      x.save();
    },
    'invalid hit count'
  ],
  [
    'out-of-range source lines fail',
    (x) => {
      x.coverage['example.ts'].statementMap[0].end.line = 9999;
      x.save();
    },
    'invalid source location'
  ],
  [
    'missing metrics fail closed',
    (x) => {
      delete x.coverage['example.ts'].b;
      x.save();
    },
    'invalid metric schema'
  ],
  [
    'failed run cannot certify',
    (x) => {
      x.metadata.status = 'failed';
      x.save();
    },
    'invalid shard provenance/status'
  ]
])
  test(name, () => {
    const x = fixture();
    try {
      mutate(x);
      const result = x.check();
      assert.equal(result.status, expected ? 'FAIL' : 'PASS');
      if (expected)
        assert.ok(
          result.errors.some((error) => error.includes(expected)),
          result.errors.join('\n')
        );
    } finally {
      x.cleanup();
    }
  });

for (const body of [
  'export * from "./example.js";\n',
  'export type { T } from "./types.js" with { "resolution-mode": "import" }; export * from "./example.js";',
  'export type { T } from "./types.js" with { "resolution-mode": "require" }; export * from "./example.js";',
  'export type { T } from "./types.js" assert { "resolution-mode": "import" }; export * from "./example.js";'
])
  test(`valid reexport keeps a required empty entry without changing measured peer totals: ${body}`, () => {
    const x = fixture();
    try {
      const baseline = x.check().components;
      writeFileSync(join(x.root, 'barrel.ts'), body);
      const manifest = JSON.parse(readFileSync(join(x.root, 'manifest.json')));
      manifest.files.push({
        path: 'barrel.ts',
        sha256: hash(body),
        components: ['auth'],
        applicability: 'javascript-metrics'
      });
      manifest.executionInputs.push('barrel.ts');
      const bytes = JSON.stringify(manifest);
      writeFileSync(join(x.root, 'manifest.json'), bytes);
      x.metadata.manifestSha256 = hash(bytes);
      x.metadata.sourceHashes['barrel.ts'] = hash(body);
      x.metadata.executionInputHashes['barrel.ts'] = hash(body);
      x.coverage['barrel.ts'] = {
        path: 'barrel.ts',
        statementMap: {},
        fnMap: {},
        branchMap: {},
        s: {},
        f: {},
        b: {}
      };
      x.save();
      const result = x.check();
      assert.equal(result.status, 'PASS', result.errors.join('\n'));
      assert.deepEqual(result.components, baseline);
      assert.deepEqual(result.metriclessReexports, [
        { path: 'barrel.ts', sourceSha256: hash(body), reason: 'runtime-reexports-only' }
      ]);
      delete x.coverage['barrel.ts'];
      x.save();
      assert.ok(
        x.check().errors.some((error) => error.includes('missing instrumented file: barrel.ts'))
      );
      delete x.coverage['example.ts'];
      x.save();
      assert.ok(
        x
          .check()
          .errors.some((error) => error.includes('critical metric below threshold or unmeasured'))
      );
    } finally {
      x.cleanup();
    }
  });

test('covered peer cannot hide a second executable file with empty maps', () => {
  const x = fixture();
  try {
    const body = 'export function criticalAuth() { throw new Error("uncovered"); }\n';
    writeFileSync(join(x.root, 'uncovered.ts'), body);
    const manifest = JSON.parse(readFileSync(join(x.root, 'manifest.json')));
    manifest.files.push({
      path: 'uncovered.ts',
      sha256: hash(body),
      components: ['auth'],
      applicability: 'javascript-metrics'
    });
    manifest.executionInputs.push('uncovered.ts');
    const bytes = JSON.stringify(manifest);
    writeFileSync(join(x.root, 'manifest.json'), bytes);
    x.metadata.manifestSha256 = hash(bytes);
    x.metadata.sourceHashes['uncovered.ts'] = hash(body);
    x.metadata.executionInputHashes['uncovered.ts'] = hash(body);
    x.coverage['uncovered.ts'] = {
      path: 'uncovered.ts',
      statementMap: {},
      fnMap: {},
      branchMap: {},
      s: {},
      f: {},
      b: {}
    };
    x.save();
    const result = x.check();
    assert.equal(result.status, 'FAIL');
    assert.ok(
      result.errors.some((error) =>
        error.includes('empty instrumentation requires review: uncovered.ts')
      )
    );
    assert.ok(
      result.errors.some((error) =>
        error.includes('executable functions lack instrumentation: uncovered.ts')
      )
    );
  } finally {
    x.cleanup();
  }
});

for (const body of [
  'declare export * from "a";',
  'export { x } from "a"; export { x } from "b";',
  'export * from "a" with { type: effect() };',
  'export { type A } from "a";',
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
  test(`invalid or wholly type-only original cannot qualify as metricless reexport: ${body}`, () => {
    const x = fixture();
    try {
      writeFileSync(join(x.root, 'invalid.ts'), body);
      const manifest = JSON.parse(readFileSync(join(x.root, 'manifest.json')));
      manifest.files.push({
        path: 'invalid.ts',
        sha256: hash(body),
        components: ['auth'],
        applicability: 'javascript-metrics'
      });
      manifest.executionInputs.push('invalid.ts');
      const bytes = JSON.stringify(manifest);
      writeFileSync(join(x.root, 'manifest.json'), bytes);
      x.metadata.manifestSha256 = hash(bytes);
      x.metadata.sourceHashes['invalid.ts'] = hash(body);
      x.metadata.executionInputHashes['invalid.ts'] = hash(body);
      x.coverage['invalid.ts'] = {
        path: 'invalid.ts',
        statementMap: {},
        fnMap: {},
        branchMap: {},
        s: {},
        f: {},
        b: {}
      };
      x.save();
      const result = x.check();
      assert.equal(result.status, 'FAIL');
      assert.ok(
        result.errors.some((error) =>
          error.includes('empty instrumentation requires review: invalid.ts')
        )
      );
      assert.deepEqual(result.metriclessReexports, []);
    } finally {
      x.cleanup();
    }
  });

test('absolute-inside manifest identities aggregate against relative coverage with original provenance', () => {
  const x = fixture();
  try {
    const manifestPath = join(x.root, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath));
    const absolute = join(x.root, 'example.ts');
    manifest.files[0].path = absolute;
    const bytes = JSON.stringify(manifest);
    writeFileSync(manifestPath, bytes);
    x.metadata.manifestSha256 = hash(bytes);
    x.metadata.sourceHashes = { [absolute]: manifest.files[0].sha256 };
    x.save();
    assert.equal(x.check().status, 'PASS');
    x.metadata.sourceHashes = { 'example.ts': manifest.files[0].sha256 };
    x.save();
    assert.ok(x.check().errors.some((error) => error.includes('shard source hash mismatch')));
  } finally {
    x.cleanup();
  }
});

for (const metric of ['s', 'f', 'b'])
  test(`merged ${metric} counters reject multishard integer overflow`, () => {
    const x = fixture();
    try {
      const manifestPath = join(x.root, 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath));
      manifest.requiredShards.push('second');
      const bytes = JSON.stringify(manifest);
      writeFileSync(manifestPath, bytes);
      x.metadata.manifestSha256 = hash(bytes);
      x.coverage['example.ts'][metric][0] =
        metric === 'b' ? [Number.MAX_SAFE_INTEGER, 1] : Number.MAX_SAFE_INTEGER;
      x.save();
      mkdirSync(join(x.root, 'second'));
      const resultBytes = JSON.stringify({
        runId: 'fixture-run',
        shard: 'second',
        status: 'passed'
      });
      writeFileSync(join(x.root, 'second/result.json'), resultBytes);
      writeFileSync(join(x.root, 'second/coverage.json'), JSON.stringify(x.coverage));
      writeFileSync(
        join(x.root, 'second/shard.json'),
        JSON.stringify({ ...x.metadata, shard: 'second', testResultSha256: hash(resultBytes) })
      );
      const result = x.check();
      assert.equal(result.status, 'FAIL');
      assert.ok(
        result.errors.some((error) =>
          error.includes(`unsafe merged coverage counters: example.ts:${metric}`)
        )
      );
    } finally {
      x.cleanup();
    }
  });

test('checker rejects an artifacts root outside the repository including a symlinked ancestor', () => {
  const x = fixture();
  const outside = fixture();
  try {
    symlinkSync(outside.root, join(x.root, 'external'), 'dir');
    for (const artifactsPath of [outside.root, join(x.root, 'external')]) {
      const result = checkCriticalCoverage({
        root: x.root,
        manifestPath: join(x.root, 'manifest.json'),
        artifactsPath,
        head: 'fixture'
      });
      assert.equal(result.status, 'FAIL');
      assert.ok(result.errors.some((error) => error.startsWith('artifacts root invalid:')));
      assert.ok(
        !result.errors.some((error) => error.startsWith('invalid coverage shard')),
        'external shard processing must not start'
      );
    }
  } finally {
    x.cleanup();
    outside.cleanup();
  }
});

test('raw schema checks all metrics before any Istanbul normalization', () => {
  const x = fixture();
  try {
    const source = readFileSync(join(x.root, 'example.ts'), 'utf8');
    for (const mutate of [
      (d) => {
        d.s[99] = 1;
      },
      (d) => {
        d.f[99] = 1;
      },
      (d) => {
        d.b[99] = [1];
      },
      (d) => {
        delete d.s[0];
      },
      (d) => {
        d.f[0] = -1;
      },
      (d) => {
        d.b[0] = [1, Infinity];
      },
      (d) => {
        d.s[0] = '1';
      },
      (d) => {
        d.f[0] = 0.5;
      },
      (d) => {
        d.b[0] = [0.5, 1];
      },
      (d) => {
        d.b[0] = [1];
      },
      (d) => {
        d.fnMap[0].loc.start.column = 9999;
      },
      (d) => {
        d.branchMap[0].locations[0].start.line = 9999;
      },
      (d) => {
        d.statementMap[0] = { start: { line: 1, column: 10 }, end: { line: 1, column: 0 } };
      },
      (d) => {
        d.fnMap = [];
      },
      (d) => {
        d.branchMap[0].type = null;
      }
    ]) {
      const entry = structuredClone(x.coverage['example.ts']);
      mutate(entry);
      assert.ok(validateRawCoverageEntry(entry, source).length > 0);
    }
  } finally {
    x.cleanup();
  }
});

// Captured from real PostgreSQL foundational V8 baseline cd6b97a4-e0f4-4e7f-b225-7f3aa349b095.
// Keep original sparse IDs, one-location V8 branches and TS function declaration ranges.
test('accepts captured real V8 source-map conventions', () => {
  const source =
    "export type DatabaseMutationPrivilege = 'INSERT' | 'UPDATE' | 'DELETE';\nexport type DatabaseRuntimeCapability = readonly [name: string, detail: string];\n\nexport interface DatabaseRuntimeTableGrant {\n  readonly tableName: string;\n  readonly privileges: string;\n}\n\nfunction immutableCapability<const Detail extends string>(\n  name: string,\n  detail: Detail\n): readonly [string, Detail] {\n  return Object.freeze([name, detail] as const);\n}\n\nexport const DATABASE_RUNTIME_ROLE_CONTRACT = Object.freeze({\n  login: Object.freeze({\n    inherit: false,\n    superuser: false,\n    bypassRls: false,\n    createDatabase: false,\n    createRole: false,\n    replication: false\n  }),\n  installerMembership: Object.freeze({\n    adminOption: false,\n    inheritOption: false,\n    setOption: true\n  }),\n  securityDefinerSearchPath: 'search_path=pg_catalog, public'\n});\n\n/** API-only direct DML required by global setup/governance repositories. */\nexport const DATABASE_RUNTIME_INSTALLER_TABLE_GRANTS: readonly DatabaseRuntimeTableGrant[] =\n  Object.freeze([\n    Object.freeze({ tableName: 'roles', privileges: 'INSERT' }),\n    Object.freeze({ tableName: 'permissions', privileges: 'INSERT' }),\n    Object.freeze({ tableName: 'role_permissions', privileges: 'INSERT, DELETE' }),\n    Object.freeze({ tableName: 'user_roles', privileges: 'INSERT, DELETE' }),\n    Object.freeze({ tableName: 'cfop_entries', privileges: 'INSERT, UPDATE' }),\n    Object.freeze({ tableName: 'icms_tables', privileges: 'INSERT, UPDATE' }),\n    Object.freeze({ tableName: 'ipi_tables', privileges: 'INSERT, UPDATE' }),\n    Object.freeze({ tableName: 'pis_tables', privileges: 'INSERT, UPDATE' }),\n    Object.freeze({ tableName: 'cofins_tables', privileges: 'INSERT, UPDATE' }),\n    Object.freeze({ tableName: 'ibs_cbs_tables', privileges: 'INSERT, UPDATE' }),\n    Object.freeze({ tableName: 'icms_rules', privileges: 'INSERT' }),\n    Object.freeze({ tableName: 'nfse_layouts', privileges: 'INSERT, UPDATE' })\n  ] satisfies readonly DatabaseRuntimeTableGrant[]);\n\nexport const DATABASE_RUNTIME_INSTALLER_MUTATIONS: readonly DatabaseRuntimeCapability[] =\n  Object.freeze(\n    DATABASE_RUNTIME_INSTALLER_TABLE_GRANTS.flatMap((grant) =>\n      grant.privileges\n        .split(', ')\n        .map((privilege) => immutableCapability(grant.tableName, privilege))\n    )\n  );\n\nexport const DATABASE_RUNTIME_INSTALLER_FUNCTIONS: readonly DatabaseRuntimeCapability[] =\n  Object.freeze([\n    immutableCapability('is_initial_setup_required', ''),\n    immutableCapability(\n      'provision_initial_installation',\n      'text, text, text, text, text, text, text, text, text, jsonb, jsonb, jsonb, text'\n    )\n  ]);\n\n/** API-only SECURITY DEFINER entrypoints accepted by the runtime guard. */\nexport const DATABASE_RUNTIME_API_FUNCTIONS: readonly DatabaseRuntimeCapability[] = Object.freeze([\n  immutableCapability('resolve_active_api_key', 'text, text'),\n  immutableCapability('is_pix_transaction_owned_by', 'text, uuid'),\n  immutableCapability('redrive_pix_provider_event_delivery', 'uuid, uuid, uuid, text, text')\n]);\n";
  const entry = {
    path: 'packages/security/src/database-runtime-role-policy.ts',
    all: false,
    statementMap: {
      8: { start: { line: 9, column: 0 }, end: { line: 9, column: 58 } },
      9: { start: { line: 10, column: 0 }, end: { line: 10, column: 15 } },
      10: { start: { line: 11, column: 0 }, end: { line: 11, column: 16 } },
      11: { start: { line: 12, column: 0 }, end: { line: 12, column: 30 } },
      12: { start: { line: 13, column: 0 }, end: { line: 13, column: 48 } },
      13: { start: { line: 14, column: 0 }, end: { line: 14, column: 1 } },
      15: { start: { line: 16, column: 0 }, end: { line: 16, column: 61 } },
      16: { start: { line: 17, column: 0 }, end: { line: 17, column: 24 } },
      17: { start: { line: 18, column: 0 }, end: { line: 18, column: 19 } },
      18: { start: { line: 19, column: 0 }, end: { line: 19, column: 21 } },
      19: { start: { line: 20, column: 0 }, end: { line: 20, column: 21 } },
      20: { start: { line: 21, column: 0 }, end: { line: 21, column: 26 } },
      21: { start: { line: 22, column: 0 }, end: { line: 22, column: 22 } },
      22: { start: { line: 23, column: 0 }, end: { line: 23, column: 22 } },
      23: { start: { line: 24, column: 0 }, end: { line: 24, column: 5 } },
      24: { start: { line: 25, column: 0 }, end: { line: 25, column: 38 } },
      25: { start: { line: 26, column: 0 }, end: { line: 26, column: 23 } },
      26: { start: { line: 27, column: 0 }, end: { line: 27, column: 25 } },
      27: { start: { line: 28, column: 0 }, end: { line: 28, column: 19 } },
      28: { start: { line: 29, column: 0 }, end: { line: 29, column: 5 } },
      29: { start: { line: 30, column: 0 }, end: { line: 30, column: 61 } },
      30: { start: { line: 31, column: 0 }, end: { line: 31, column: 3 } },
      33: { start: { line: 34, column: 0 }, end: { line: 34, column: 92 } },
      34: { start: { line: 35, column: 0 }, end: { line: 35, column: 17 } },
      35: { start: { line: 36, column: 0 }, end: { line: 36, column: 64 } },
      36: { start: { line: 37, column: 0 }, end: { line: 37, column: 70 } },
      37: { start: { line: 38, column: 0 }, end: { line: 38, column: 83 } },
      38: { start: { line: 39, column: 0 }, end: { line: 39, column: 77 } },
      39: { start: { line: 40, column: 0 }, end: { line: 40, column: 79 } },
      40: { start: { line: 41, column: 0 }, end: { line: 41, column: 78 } },
      41: { start: { line: 42, column: 0 }, end: { line: 42, column: 77 } },
      42: { start: { line: 43, column: 0 }, end: { line: 43, column: 77 } },
      43: { start: { line: 44, column: 0 }, end: { line: 44, column: 80 } },
      44: { start: { line: 45, column: 0 }, end: { line: 45, column: 81 } },
      45: { start: { line: 46, column: 0 }, end: { line: 46, column: 69 } },
      46: { start: { line: 47, column: 0 }, end: { line: 47, column: 78 } },
      47: { start: { line: 48, column: 0 }, end: { line: 48, column: 52 } },
      49: { start: { line: 50, column: 0 }, end: { line: 50, column: 89 } },
      50: { start: { line: 51, column: 0 }, end: { line: 51, column: 16 } },
      51: { start: { line: 52, column: 0 }, end: { line: 52, column: 62 } },
      52: { start: { line: 53, column: 0 }, end: { line: 53, column: 22 } },
      53: { start: { line: 54, column: 0 }, end: { line: 54, column: 20 } },
      54: { start: { line: 55, column: 0 }, end: { line: 55, column: 76 } },
      55: { start: { line: 56, column: 0 }, end: { line: 56, column: 5 } },
      56: { start: { line: 57, column: 0 }, end: { line: 57, column: 4 } },
      58: { start: { line: 59, column: 0 }, end: { line: 59, column: 89 } },
      59: { start: { line: 60, column: 0 }, end: { line: 60, column: 17 } },
      60: { start: { line: 61, column: 0 }, end: { line: 61, column: 57 } },
      61: { start: { line: 62, column: 0 }, end: { line: 62, column: 24 } },
      62: { start: { line: 63, column: 0 }, end: { line: 63, column: 39 } },
      63: { start: { line: 64, column: 0 }, end: { line: 64, column: 87 } },
      64: { start: { line: 65, column: 0 }, end: { line: 65, column: 5 } },
      65: { start: { line: 66, column: 0 }, end: { line: 66, column: 5 } },
      68: { start: { line: 69, column: 0 }, end: { line: 69, column: 99 } },
      69: { start: { line: 70, column: 0 }, end: { line: 70, column: 62 } },
      70: { start: { line: 71, column: 0 }, end: { line: 71, column: 67 } },
      71: { start: { line: 72, column: 0 }, end: { line: 72, column: 92 } },
      72: { start: { line: 73, column: 0 }, end: { line: 73, column: 3 } }
    },
    s: {
      8: 26,
      9: 26,
      10: 26,
      11: 26,
      12: 26,
      13: 26,
      15: 1,
      16: 1,
      17: 1,
      18: 1,
      19: 1,
      20: 1,
      21: 1,
      22: 1,
      23: 1,
      24: 1,
      25: 1,
      26: 1,
      27: 1,
      28: 1,
      29: 1,
      30: 1,
      33: 1,
      34: 1,
      35: 1,
      36: 1,
      37: 1,
      38: 1,
      39: 1,
      40: 1,
      41: 1,
      42: 1,
      43: 1,
      44: 1,
      45: 1,
      46: 1,
      47: 1,
      49: 1,
      50: 1,
      51: 1,
      52: 12,
      53: 12,
      54: 12,
      55: 1,
      56: 1,
      58: 1,
      59: 1,
      60: 1,
      61: 1,
      62: 1,
      63: 1,
      64: 1,
      65: 1,
      68: 1,
      69: 1,
      70: 1,
      71: 1,
      72: 1
    },
    branchMap: {
      0: {
        type: 'branch',
        line: 9,
        loc: { start: { line: 9, column: 0 }, end: { line: 14, column: 1 } },
        locations: [{ start: { line: 9, column: 0 }, end: { line: 14, column: 1 } }]
      },
      1: {
        type: 'branch',
        line: 52,
        loc: { start: { line: 52, column: 52 }, end: { line: 55, column: 76 } },
        locations: [{ start: { line: 52, column: 52 }, end: { line: 55, column: 76 } }]
      },
      2: {
        type: 'branch',
        line: 55,
        loc: { start: { line: 55, column: 13 }, end: { line: 55, column: 75 } },
        locations: [{ start: { line: 55, column: 13 }, end: { line: 55, column: 75 } }]
      }
    },
    b: { 0: [26], 1: [12], 2: [21] },
    fnMap: {
      0: {
        name: 'immutableCapability',
        decl: { start: { line: 9, column: 0 }, end: { line: 14, column: 1 } },
        loc: { start: { line: 9, column: 0 }, end: { line: 14, column: 1 } },
        line: 9
      }
    },
    f: { 0: 26 }
  };
  assert.deepEqual(validateRawCoverageEntry(entry, source), []);
});
