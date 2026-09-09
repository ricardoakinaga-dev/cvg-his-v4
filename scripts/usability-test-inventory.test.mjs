import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, unlink, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createInventory,
  configFingerprint,
  hash,
  navigation,
  sourceState,
  validateEvidence,
  VIEWPORTS
} from './lib/usability-test-inventory.mjs';

function fixture() {
  const routes = [
    { path: '/access-control/webhooks', title: 'Webhooks' },
    { path: '/administration/settings', title: 'Settings' }
  ];
  const discovery = {
    errors: [],
    config: { projects: [{ name: 'chromium', retries: 0, repeatEach: 1 }], shard: null },
    suites: [
      {
        title: 'master-usability-audit.spec.ts',
        suites: Object.keys(VIEWPORTS).map((mode) => ({
          title: `Auditoria master de usabilidade - ${mode}`,
          specs: routes.map((r, i) => ({
            id: `${mode}-${i}`,
            file: 'master-usability-audit.spec.ts',
            line: i + 1,
            column: 1,
            title: `${r.title} (${r.path})`,
            ok: true,
            tests: [
              { projectId: 'chromium', expectedStatus: 'passed', status: 'skipped', results: [] }
            ]
          }))
        }))
      }
    ]
  };
  const files = { 'apps/source.ts': hash('source') };
  const source = { sha: 'a'.repeat(40), files, digest: hash(files) };
  const inventory = createInventory(discovery, routes, source, '2026-09-05T10:00:00.000Z');
  const results = structuredClone(discovery);
  results.config.metadata = { usabilityInventoryDigest: inventory.digest };
  results.stats = {
    startTime: '2026-09-05T10:01:00.000Z',
    expected: 4,
    skipped: 0,
    flaky: 0,
    unexpected: 0
  };
  for (const suite of results.suites[0].suites)
    for (const spec of suite.specs)
      Object.assign(spec.tests[0], {
        status: 'expected',
        results: [{ status: 'passed', retry: 0, errors: [] }]
      });
  const audit = {
    generatedAt: '2026-09-05T10:02:00.000Z',
    metadata: { sha: source.sha, inventoryDigest: inventory.digest, viewports: VIEWPORTS },
    routeCount: 2,
    navigationCount: 4,
    records: inventory.pairs.map((p) => ({
      ...p,
      status: 'passed',
      issues: [],
      httpErrors: [],
      pageErrors: []
    }))
  };
  return { results, audit, inventory, discovery, source, routes };
}
const firstTest = (f) => f.results.suites[0].suites[0].specs[0].tests[0];
test('accepts exactly the pre-run discovery and complete route/viewport evidence', () =>
  assert.equal(validateEvidence(fixture()).tests, 4));
const bad = {
  'missing test': (f) => f.results.suites[0].suites[0].specs.pop(),
  'extra test': (f) =>
    f.results.suites[0].suites[0].specs.push({
      ...f.results.suites[0].suites[0].specs[0],
      id: 'extra'
    }),
  'duplicate test': (f) =>
    f.results.suites[0].suites[0].specs.push(f.results.suites[0].suites[0].specs[0]),
  'skipped case with passing totals': (f) => {
    firstTest(f).status = 'skipped';
  },
  'flaky case with passing totals': (f) => {
    firstTest(f).status = 'flaky';
  },
  'flaky totals': (f) => {
    f.results.stats.flaky = 1;
  },
  'successful retry': (f) => {
    firstTest(f).results[0].retry = 1;
  },
  'multiple attempts': (f) => {
    firstTest(f).results.push({ status: 'passed', retry: 1 });
  },
  'report error': (f) => {
    f.results.errors = [{ message: 'global teardown failed' }];
  },
  'result error': (f) => {
    firstTest(f).results[0].errors.push({ message: 'error' });
  },
  'expected failure': (f) => {
    firstTest(f).expectedStatus = 'failed';
  },
  'missing pair': (f) => f.audit.records.pop(),
  'duplicate pair with same totals': (f) => {
    f.audit.records[1] = f.audit.records[0];
  },
  'extra unknown route': (f) => {
    f.audit.records[0].path = '/unlisted';
  },
  'audit issues': (f) => f.audit.records[0].issues.push('overflow'),
  'missing run inventory binding': (f) => {
    delete f.results.config.metadata.usabilityInventoryDigest;
  },
  'wrong audit inventory binding': (f) => {
    f.audit.metadata.inventoryDigest = hash('other-run');
  },
  'missing audit SHA': (f) => {
    delete f.audit.metadata.sha;
  },
  'wrong audit SHA': (f) => {
    f.audit.metadata.sha = 'b'.repeat(40);
  },
  'wrong CI SHA': (f) => {
    f.expectedSha = 'b'.repeat(40);
  },
  'source drift': (f) => {
    f.source = { ...f.source, digest: hash('changed') };
  },
  'config drift': (f) => {
    f.results.config.projects[0].retries = 1;
  },
  'navigation drift': (f) => {
    f.routes.push({ path: '/new', title: 'New' });
  },
  'post-run freeze': (f) => {
    f.inventory.frozenAt = '2026-09-05T10:03:00.000Z';
    const { digest, ...payload } = f.inventory;
    f.inventory.digest = hash(payload);
  },
  'stale audit': (f) => {
    f.audit.generatedAt = '2026-09-04T10:02:00.000Z';
  },
  'lower frozen denominator': (f) => {
    f.inventory.cases.pop();
    const { digest, ...payload } = f.inventory;
    f.inventory.digest = hash(payload);
  },
  'tampered discovery': (f) => {
    f.discovery.suites[0].suites[0].specs.pop();
  }
};
for (const [label, mutate] of Object.entries(bad))
  test(`rejects ${label}`, () => {
    const f = fixture();
    mutate(f);
    assert.throws(() => validateEvidence(f));
  });
test('generator refuses omitted enterprise route cases before any execution', () => {
  const f = fixture();
  f.discovery.suites[0].suites[0].specs.pop();
  assert.throws(
    () => createInventory(f.discovery, f.routes, f.source),
    /complete navigation discovery/
  );
});
test('navigation inventory loads the permission catalog from the source tree', async () => {
  const routes = await navigation(process.cwd());
  assert.ok(routes.length > 0);
  assert.deepEqual(routes.find(({ path }) => path === '/access-control'), {
    path: '/access-control',
    title: 'Grupos de Acesso'
  });
});
test('environment expected count cannot bypass frozen inventory', () => {
  assert.throws(
    () =>
      execFileSync(process.execPath, ['scripts/validate-usability-playwright-evidence.mjs'], {
        env: { ...process.env, E2E_EXPECTED_TESTS: '1' },
        stdio: 'pipe'
      }),
    (error) => /E2E_EXPECTED_TESTS is unsupported/.test(error.stderr.toString())
  );
});

test('source fingerprint excludes generated evidence trees', async () => {
  const state = await sourceState(process.cwd());
  assert.equal(
    Object.keys(state.files).some((path) =>
      /^(tmp|artifacts|playwright-report|test-results|coverage|coverage-boundary|legado)\//.test(path) ||
        path.startsWith('docs/frontend/implementation/evidence/')
    ),
    false
  );
});

test('source fingerprint retains tracked deletions and detects restoration', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'usability-source-deletion-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync(
      'git',
      [
        '-c',
        'core.hooksPath=/dev/null',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'user.name=Fixture',
        '-c',
        'user.email=fixture@example.invalid',
        ...args
      ],
      { cwd: root }
    );
  git('init', '-q');
  await mkdir(join(root, 'apps'));
  const path = 'apps/source.ts';
  const body = 'export const value = 1;\n';
  await writeFile(join(root, path), body);
  git('add', '--', path);
  git('commit', '-qm', 'fixture');
  const present = await sourceState(root);
  assert.equal(present.files[path], hash(body));
  await unlink(join(root, path));
  const absent = await sourceState(root);
  assert.equal(absent.files[path], null);
  assert.notEqual(absent.digest, present.digest);
  assert.deepEqual(await sourceState(root), absent);
  const evidence = fixture();
  evidence.source = absent;
  evidence.inventory = createInventory(
    evidence.discovery,
    evidence.routes,
    absent,
    evidence.inventory.frozenAt
  );
  evidence.audit.metadata.sha = absent.sha;
  evidence.audit.metadata.inventoryDigest = evidence.inventory.digest;
  evidence.results.config.metadata.usabilityInventoryDigest = evidence.inventory.digest;
  assert.doesNotThrow(() => validateEvidence(evidence));
  await writeFile(join(root, path), body);
  assert.deepEqual(await sourceState(root), present);
  assert.throws(
    () => validateEvidence({ ...evidence, source: present }),
    /source fingerprint drift/
  );
  await unlink(join(root, path));
  git('add', '--', path);
  const staged = await sourceState(root);
  assert.equal(Object.hasOwn(staged.files, path), false);
  assert.notEqual(staged.digest, absent.digest);
  await symlink('missing-target.ts', join(root, 'apps/broken.ts'));
  git('add', '--', 'apps/broken.ts');
  await assert.rejects(sourceState(root), { code: 'ENOENT' });
});

test('configuration fingerprint ignores Playwright runtime metadata and reporters', () => {
  const discovery = {
    projects: [{ name: 'chromium', metadata: { usabilityInventoryDigest: '' } }],
    metadata: { usabilityInventoryDigest: '' },
    reporter: [['json']],
    workers: 1
  };
  const executed = {
    ...structuredClone(discovery),
    projects: [{ name: 'chromium', metadata: { usabilityInventoryDigest: 'bound' } }],
    metadata: { usabilityInventoryDigest: 'bound', actualWorkers: 1 },
    reporter: [['list'], ['html'], ['json']]
  };
  assert.equal(configFingerprint(discovery), configFingerprint(executed));
});
