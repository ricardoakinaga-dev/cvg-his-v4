import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { createInventory, sourceState, VIEWPORTS } from './lib/usability-test-inventory.mjs';
import { prepareUsabilityEvidenceRun } from './prepare-usability-evidence-run.mjs';
const repo = resolve(import.meta.dirname, '..');
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'usability-archive-'));
  for (const dir of ['scripts/lib', 'apps/spa/src', 'tmp', 'playwright-report/usability'])
    await mkdir(resolve(root, dir), { recursive: true });
  for (const script of [
    'archive-playwright-evidence.mjs',
    'validate-usability-playwright-evidence.mjs',
    'lib/usability-test-inventory.mjs'
  ])
    await cp(resolve(repo, 'scripts', script), resolve(root, 'scripts', script));
  await symlink(resolve(repo, 'node_modules'), resolve(root, 'node_modules'));
  await writeFile(resolve(root, '.gitignore'), 'node_modules\nartifacts\ntmp\nplaywright-report\n');
  await writeFile(
    resolve(root, 'apps/spa/src/navigation.ts'),
    "export function flattenAllNavItems() { return [{path: '/webhooks', label: 'Webhooks'}]; }\n"
  );
  await writeFile(
    resolve(root, 'apps/spa/src/navigation-permission-catalog.ts'),
    'export const permissionCatalog = {};\n'
  );
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.test',
      'commit',
      '--allow-empty',
      '-qm',
      'fixture'
    ],
    { cwd: root }
  );
  const source = await sourceState(root);
  const routes = [{ path: '/webhooks', title: 'Webhooks' }];
  const discovery = {
    errors: [],
    config: { projects: [{ name: 'chromium', retries: 0, repeatEach: 1 }], shard: null },
    suites: [
      {
        title: 'master-usability-audit.spec.ts',
        suites: Object.keys(VIEWPORTS).map((mode) => ({
          title: `Auditoria master de usabilidade - ${mode}`,
          specs: [
            {
              id: mode,
              file: 'master-usability-audit.spec.ts',
              line: 1,
              column: 1,
              title: 'Webhooks (/webhooks)',
              ok: true,
              tests: [
                { projectId: 'chromium', expectedStatus: 'passed', status: 'skipped', results: [] }
              ]
            }
          ]
        }))
      }
    ]
  };
  const inventory = createInventory(discovery, routes, source, '2026-09-05T10:00:00Z');
  const results = structuredClone(discovery);
  results.config.metadata = { usabilityInventoryDigest: inventory.digest };
  results.stats = {
    startTime: '2026-09-05T10:01:00Z',
    expected: 2,
    skipped: 0,
    flaky: 0,
    unexpected: 0
  };
  for (const suite of results.suites[0].suites)
    Object.assign(suite.specs[0].tests[0], {
      status: 'expected',
      results: [{ status: 'passed', retry: 0, errors: [] }]
    });
  const audit = {
    generatedAt: '2026-09-05T10:02:00Z',
    metadata: { sha: source.sha, inventoryDigest: inventory.digest, viewports: VIEWPORTS },
    routeCount: 1,
    navigationCount: 2,
    records: inventory.pairs.map((pair) => ({
      ...pair,
      status: 'passed',
      issues: [],
      pageErrors: [],
      httpErrors: []
    }))
  };
  const files = {
    'tmp/usability-test-inventory.json': inventory,
    'tmp/playwright-discovery.json': discovery,
    'tmp/master-usability-audit.json': audit,
    'playwright-report/usability/results.json': results
  };
  for (const [path, data] of Object.entries(files))
    await writeFile(resolve(root, path), JSON.stringify(data));
  const env = {
    ...process.env,
    GITHUB_SHA: source.sha,
    E2E_EVIDENCE_RUN_ID: 'fixture',
    E2E_INCLUDE_MASTER_AUDIT: '1'
  };
  delete env.E2E_EXPECTED_TESTS;
  const run = () =>
    execFileSync(process.execPath, [resolve(root, 'scripts/archive-playwright-evidence.mjs')], {
      cwd: root,
      env,
      stdio: 'pipe'
    });
  return {
    root,
    run,
    env,
    files,
    destination: resolve(root, 'artifacts/playwright', source.sha, 'fixture')
  };
}
test('archives known-good raw evidence and runs real validator against archive paths', async () => {
  const f = await fixture();
  f.run();
  const metadata = JSON.parse(await readFile(resolve(f.destination, 'metadata.json')));
  assert.equal(metadata.inventoryValidation.valid, true);
  for (const path of Object.keys(f.files))
    assert.deepEqual(
      JSON.parse(await readFile(resolve(f.destination, path.split('/').at(-1)))),
      f.files[path]
    );
  assert.throws(f.run, /EEXIST/);
});
test('old count-only 404 report is preserved but cannot certify', async () => {
  const f = await fixture();
  await writeFile(
    resolve(f.root, 'playwright-report/usability/results.json'),
    JSON.stringify({ stats: { expected: 404, unexpected: 0, skipped: 0, flaky: 0 } })
  );
  assert.throws(f.run);
  const metadata = JSON.parse(await readFile(resolve(f.destination, 'metadata.json')));
  assert.equal(metadata.inventoryValidation.valid, false);
});
test('source drift after freeze rejects archived evidence', async () => {
  const f = await fixture();
  await writeFile(
    resolve(f.root, 'apps/spa/src/navigation.ts'),
    "export function flattenAllNavItems() { return [{path:'/webhooks',label:'Changed'}]; }\n"
  );
  assert.throws(f.run, /source fingerprint drift/);
});
test('preparing repeated runs preserves preceding evidence in distinct directories', async () => {
  const f = await fixture();
  const first = await prepareUsabilityEvidenceRun(f.root);
  assert.deepEqual(
    JSON.parse(await readFile(resolve(first, 'usability-test-inventory.json'))),
    f.files['tmp/usability-test-inventory.json']
  );
  await writeFile(resolve(f.root, 'tmp/usability-test-inventory.json'), '{"next":true}');
  const second = await prepareUsabilityEvidenceRun(f.root);
  assert.notEqual(first, second);
  assert.deepEqual(JSON.parse(await readFile(resolve(second, 'usability-test-inventory.json'))), {
    next: true
  });
  assert.deepEqual(
    JSON.parse(await readFile(resolve(first, 'usability-test-inventory.json'))),
    f.files['tmp/usability-test-inventory.json']
  );
});

for (const exitCode of [0, 19]) {
  test(`targeted runner exit ${exitCode} leaves exactly one archive owner to the always-run workflow step`, async () => {
    const f = await fixture();
    f.env.E2E_INCLUDE_MASTER_AUDIT = '0';
    if (exitCode !== 0) await unlink(resolve(f.root, 'playwright-report/usability/results.json'));
    const runner = await readFile(resolve(repo, 'infra/scripts/run-e2e-spa.sh'), 'utf8');
    const workflow = await readFile(
      resolve(repo, '.github/workflows/usability-certification.yml'),
      'utf8'
    );
    const cleanup = runner.match(/^cleanup\(\) \{[\s\S]*?^\}/m)?.[0];
    assert.ok(cleanup, 'execute the actual runner cleanup function');
    const targetBlock = workflow.match(/E2E_PLAYWRIGHT_TARGET: >-\n([\s\S]*?)\n    steps:/)?.[1];
    assert.ok(targetBlock, 'use actual workflow target selection');
    const targets = targetBlock.trim().split(/\s+/);
    assert.ok(targets.length > 0);
    const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
    const shell = `${cleanup}\nROOT_DIR=${quote(f.root)}\nCLEANUP=false\nPLAYWRIGHT_TARGET_ARGS=(${targets.map(quote).join(' ')})\ntrap cleanup EXIT\nexit ${exitCode}\n`;
    if (exitCode === 0)
      execFileSync('bash', ['-c', shell], { cwd: f.root, env: f.env, stdio: 'pipe' });
    else
      assert.throws(
        () => execFileSync('bash', ['-c', shell], { cwd: f.root, env: f.env, stdio: 'pipe' }),
        (error) => error.status === exitCode
      );
    await assert.rejects(readFile(resolve(f.destination, 'metadata.json')), { code: 'ENOENT' });
    // The workflow's if: always() archive step runs after success OR setup failure.
    f.run();
    const metadata = JSON.parse(await readFile(resolve(f.destination, 'metadata.json')));
    assert.deepEqual(metadata.inventoryValidation, { valid: false, scope: 'targeted-only' });
    if (exitCode !== 0) assert.equal(metadata.stats, null);
    // An actual duplicate remains forbidden, rather than silently overwriting evidence.
    assert.throws(f.run, /EEXIST/);
  });
}
