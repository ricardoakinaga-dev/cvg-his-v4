import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { inspectSupplyChain } from './validate-supply-chain.mjs';

const DIGEST = 'sha256:' + 'a'.repeat(64);

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'cvg-supply-chain-'));
  mkdirSync(join(directory, '.github/workflows'), { recursive: true });
  mkdirSync(join(directory, 'infra/helm/chart/templates'), { recursive: true });
  mkdirSync(join(directory, 'infra/scripts'), { recursive: true });
  writeFileSync(
    join(directory, '.github/workflows/ci.yml'),
    `jobs:\n  test:\n    uses: acme/test@${'b'.repeat(40)}\n    services:\n      postgres:\n        image: postgres@${DIGEST}\n`
  );
  writeFileSync(
    join(directory, 'docker-compose.test.yml'),
    `services:\n  db:\n    image: postgres@${DIGEST}\n  app:\n    image: cvg-his-v2-local:dev\n`
  );
  writeFileSync(
    join(directory, 'infra/helm/chart/templates/pod.yaml'),
    `apiVersion: v1\nspec:\n  containers:\n    - name: db\n      image: postgres@${DIGEST}\n`
  );
  writeFileSync(join(directory, 'Dockerfile'), `FROM node@${DIGEST}\n`);
  writeFileSync(
    join(directory, 'infra/scripts/restore.sh'),
    `docker run --rm postgres@${DIGEST} pg_restore -l /backup/database.dump\n`
  );
  return directory;
}

test('supply-chain validator covers workflow services, Compose, Helm and Docker bases', () => {
  const directory = fixture();
  try {
    const result = inspectSupplyChain({ rootDirectory: directory });
    assert.deepEqual(result.findings, []);
    assert.equal(result.counts.workflowImageCount, 1);
    assert.equal(result.counts.composeImageCount, 2);
    assert.equal(result.counts.helmImageCount, 1);
    assert.equal(result.counts.dockerBaseCount, 1);
    assert.equal(result.counts.runtimeImageCount, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('mutable workflow service images fail closed', () => {
  const directory = fixture();
  try {
    writeFileSync(
      join(directory, '.github/workflows/ci.yml'),
      'jobs:\n  test:\n    services:\n      postgres:\n        image: postgres:16\n'
    );
    const result = inspectSupplyChain({ rootDirectory: directory });
    assert.equal(
      result.findings.some((finding) => finding.includes('workflow image postgres:16')),
      true
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('mutable Helm static images fail closed while local Compose images remain explicit exceptions', () => {
  const directory = fixture();
  try {
    writeFileSync(
      join(directory, 'infra/helm/chart/templates/pod.yaml'),
      'apiVersion: v1\nspec:\n  containers:\n    - name: db\n      image: redis:7-alpine\n'
    );
    const result = inspectSupplyChain({ rootDirectory: directory });
    assert.equal(
      result.findings.some((finding) => finding.includes('Helm image redis:7-alpine')),
      true
    );
    assert.equal(
      result.findings.some((finding) => finding.includes('cvg-his-v2-local:dev')),
      false
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('mutable runtime script images fail closed', () => {
  const directory = fixture();
  try {
    writeFileSync(
      join(directory, 'infra/scripts/restore.sh'),
      'docker run --rm postgres:16-alpine pg_restore -l /backup/database.dump\n'
    );
    const result = inspectSupplyChain({ rootDirectory: directory });
    assert.equal(
      result.findings.some((finding) =>
        finding.includes('runtime script image postgres:16-alpine')
      ),
      true
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
