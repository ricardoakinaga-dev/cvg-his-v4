import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const validatorPath = resolve(repositoryRoot, 'infra/scripts/validate-helm.mjs');

test('Helm render validation loads overlay values inside the render loop', () => {
  const source = readFileSync(validatorPath, 'utf8');
  const renderedValidation = source.slice(source.indexOf('if (!helmVersion)'));

  assert.match(
    renderedValidation,
    /for \(const environment of environments\) \{\s*const values = readYamlFile\(environment\.values\);/s,
    'rendered Helm assertions must use the values loaded for the current overlay'
  );
});

test('Helm-present validation runs static chart checks before rendering', () => {
  const source = readFileSync(validatorPath, 'utf8');
  const requiredMode = source.indexOf('const helmVersion = getHelmVersion();');
  const staticChecks = source.indexOf('validateStaticChart();', requiredMode);
  const fallbackBranch = source.indexOf('if (!helmVersion)', requiredMode);
  const renderLoop = source.indexOf('for (const environment of environments)', requiredMode);

  assert.ok(requiredMode >= 0, 'the validator must detect the Helm executable before branching');
  assert.ok(staticChecks > requiredMode, 'static checks must run after tool detection');
  assert.ok(staticChecks < fallbackBranch, 'static checks must run before the missing-Helm branch');
  assert.ok(staticChecks < renderLoop, 'static checks must run before Helm render assertions');
  assert.doesNotMatch(
    source.slice(staticChecks, renderLoop),
    /if \(!helmVersion\) \{[\s\S]*validateStaticChart\(\);/,
    'static checks must not be exclusive to the missing-Helm fallback'
  );
});

test('production-like worker identity is wired as a required Secret value', () => {
  const deployment = readFileSync(
    resolve(repositoryRoot, 'infra/helm/cvg-his-v2/templates/worker-deployment.yaml'),
    'utf8'
  );
  const values = readFileSync(resolve(repositoryRoot, 'infra/helm/cvg-his-v2/values.yaml'), 'utf8');

  assert.match(deployment, /name: WORKER_REPORTS_USER_ID/);
  assert.match(deployment, /worker\.reportsUser\.secretKey/);
  assert.match(deployment, /optional: false/);
  assert.doesNotMatch(
    deployment,
    /worker\.env\.WORKER_REPORTS_USER_ID/,
    'report actor must not be rendered from plaintext worker env values'
  );
  assert.match(values, /reportsUser:/);
  assert.match(values, /secretKey: WORKER_REPORTS_USER_ID/);
});

test('REQUIRE_HELM fails closed when the Helm executable is unavailable', () => {
  const emptyPath = mkdtempSync('/tmp/cvg-his-empty-helm-');

  try {
    const result = spawnSync(process.execPath, [validatorPath], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PATH: emptyPath,
        REQUIRE_HELM: '1'
      },
      encoding: 'utf8'
    });

    assert.notEqual(
      result.status,
      0,
      'required Helm validation must not fall back to static checks'
    );
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /Helm executable is required/i,
      'the failure must explain that executable Helm validation is required'
    );
  } finally {
    rmSync(emptyPath, { recursive: true, force: true });
  }
});

test('REQUIRE_HELM rejects a near-match Helm version', () => {
  const fakeToolPath = mkdtempSync('/tmp/cvg-his-fake-helm-');
  const fakeHelmPath = resolve(fakeToolPath, 'helm');

  try {
    writeFileSync(
      fakeHelmPath,
      '#!/bin/sh\nif [ "$1" = "version" ]; then\n  echo "v3.15.40"\n  exit 0\nfi\nexit 0\n'
    );
    chmodSync(fakeHelmPath, 0o755);

    const result = spawnSync(process.execPath, [validatorPath], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PATH: '/tmp',
        HELM_BIN: fakeHelmPath,
        REQUIRE_HELM: '1'
      },
      encoding: 'utf8'
    });

    assert.notEqual(result.status, 0, 'near-match Helm versions must be rejected');
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /required for this validation; found v3\.15\.40/i
    );
  } finally {
    rmSync(fakeToolPath, { recursive: true, force: true });
  }
});

test('REQUIRE_HELM rejects malformed build metadata', () => {
  const fakeToolPath = mkdtempSync('/tmp/cvg-his-fake-helm-metadata-');
  const fakeHelmPath = resolve(fakeToolPath, 'helm');

  try {
    writeFileSync(
      fakeHelmPath,
      '#!/bin/sh\nif [ "$1" = "version" ]; then\n  echo "v3.15.4+."\n  exit 0\nfi\nexit 0\n'
    );
    chmodSync(fakeHelmPath, 0o755);

    const result = spawnSync(process.execPath, [validatorPath], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PATH: '/tmp',
        HELM_BIN: fakeHelmPath,
        REQUIRE_HELM: '1'
      },
      encoding: 'utf8'
    });

    assert.notEqual(result.status, 0, 'malformed build metadata must be rejected');
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /required for this validation; found v3\.15\.4\+\./i
    );
  } finally {
    rmSync(fakeToolPath, { recursive: true, force: true });
  }
});
