import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const governance = JSON.parse(readFileSync(join(repositoryRoot, 'docs/document-governance.json'), 'utf8'));
const roadmapPath = governance.current_documents.roadmap.path;
const backlogPath = governance.current_documents.backlog.path;
const requiredFiles = [
  'infra/scripts/backup-v2.sh',
  'infra/scripts/restore-drill-v2.sh',
  'infra/scripts/validate-backup-restore.mjs',
  'package.json',
  'docs/document-governance.json',
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

test('backup/restore gate uses the W3 roadmap and REM-024 recovery contract', () => {
  const fixtureRoot = createFixture();

  try {
    const result = runChecker(fixtureRoot);

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(
      result.stdout,
      /repository\/documentation consistency passed; no real restore, rollback, target certification, or RPO\/RTO measurement was executed; those operations remain M-14 work/
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('backup/restore gate rejects a W3 roadmap without the restore/RPO/RTO step', () => {
  const fixtureRoot = createFixture();

  try {
    const fixtureRoadmap = join(fixtureRoot, roadmapPath);
    const roadmap = readFileSync(fixtureRoadmap, 'utf8');
    const withoutRestoreProof = roadmap.replace(
      '5. Restaurar backup representativo e medir RPO/RTO.',
      '5. Planejar a restauração representativa para uma execução futura.'
    );
    assert.notEqual(withoutRestoreProof, roadmap);
    writeFileSync(fixtureRoadmap, withoutRestoreProof);

    const result = runChecker(fixtureRoot);

    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /FAIL roadmap W3 e backlog REM-024 mantem o contrato de recovery/);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

for (const [name, transform] of [
  [
    'representative backup/restore/rollback requirement',
    (text) =>
      text.replace(
        'backup/restore/rollback representativo',
        'planejar rotina de recuperação'
      )
  ],
  [
    'hash/count/RLS verification requirement',
    (text) => text.replace('hashes/contagens/RLS', 'hashes/contagens')
  ],
  [
    'approved RPO/RTO limits requirement',
    (text) =>
      text.replace(
        'medir RPO/RTO contra limites previamente aprovados',
        'preparar uma medição futura de RPO/RTO'
      )
  ]
]) {
  test(`backup/restore gate rejects missing REM-024 ${name}`, () => {
    const fixtureRoot = createFixture();
    try {
      const target = join(fixtureRoot, backlogPath);
      const original = readFileSync(target, 'utf8');
      const changed = transform(original);
      assert.notEqual(changed, original);
      writeFileSync(target, changed);
      const result = runChecker(fixtureRoot);
      assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
      assert.match(result.stderr, /FAIL roadmap W3 e backlog REM-024 mantem o contrato de recovery/);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
}

test('backup/restore gate rejects a missing documentation manifest', () => {
  const fixtureRoot = createFixture();
  try {
    writeFileSync(join(fixtureRoot, 'docs/document-governance.json'), '{}');
    const result = runChecker(fixtureRoot);
    assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /FAIL roadmap W3 e backlog REM-024 mantem o contrato de recovery/);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
