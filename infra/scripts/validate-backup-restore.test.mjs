import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const roadmapPath = 'docs/2026-09-02-roadmap-melhorias-cvg-his-v4.md';
const backlogPath = 'docs/2026-09-02-backlog-priorizado-cvg-his-v4.md';
const requiredFiles = [
  'infra/scripts/backup-v2.sh',
  'infra/scripts/restore-drill-v2.sh',
  'infra/scripts/validate-backup-restore.mjs',
  'package.json',
  'docs/131-checklist-cutover-servidor.md',
  'docs/132-superficie-canonica-deploy-e-migracao.md',
  roadmapPath,
  backlogPath
];

function createFixture() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-backup-check-'));
  for (const relativePath of requiredFiles) {
    const destination = join(fixtureRoot, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(repositoryRoot, relativePath), destination);
  }
  return fixtureRoot;
}

function runChecker(fixtureRoot) {
  return spawnSync(
    process.execPath,
    [join(fixtureRoot, 'infra/scripts/validate-backup-restore.mjs')],
    { cwd: fixtureRoot, encoding: 'utf8' }
  );
}

test('backup/restore gate uses the current September roadmap and backlog', () => {
  const fixtureRoot = createFixture();

  try {
    const result = runChecker(fixtureRoot);

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /backup and restore drill surface is consistent/);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('backup/restore gate fails when the current roadmap loses a required exit criterion', () => {
  const fixtureRoot = createFixture();

  try {
    const fixtureRoadmap = join(fixtureRoot, roadmapPath);
    const withoutRestoreProof = readFileSync(fixtureRoadmap, 'utf8').replace(
      'restore atende aos objetivos aprovados',
      'restore ainda não comprovado'
    );
    writeFileSync(fixtureRoadmap, withoutRestoreProof);

    const result = runChecker(fixtureRoot);

    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /FAIL roadmap e backlog vigentes mantem backup\/restore/);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
