#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = process.cwd();
const emitJsonOnly = process.argv.includes('--json');

function read(relativePath) {
  const fullPath = resolve(rootDir, relativePath);
  if (!existsSync(fullPath)) {
    return undefined;
  }
  return readFileSync(fullPath, 'utf8');
}

const files = {
  backup: read('infra/scripts/backup-v2.sh'),
  restoreDrill: read('infra/scripts/restore-drill-v2.sh'),
  packageJson: read('package.json'),
  cutoverChecklist: read('docs/131-checklist-cutover-servidor.md'),
  deploySurface: read('docs/132-superficie-canonica-deploy-e-migracao.md'),
  roadmap: read('docs/construcoes-futuras/2026-05-28-plano-executivo-backlog-roadmap-premium-enterprise.md')
};

const checks = [
  {
    label: 'backup-v2.sh existe e falha em erro de shell',
    ok: files.backup?.includes('set -Eeuo pipefail')
  },
  {
    label: 'backup cria bundle com database, storage e meta',
    ok:
      files.backup?.includes('mkdir -p "$BACKUP_DIR/database" "$BACKUP_DIR/storage" "$BACKUP_DIR/meta"') &&
      files.backup?.includes('capture_metadata') &&
      files.backup?.includes('write_manifest')
  },
  {
    label: 'backup usa pg_dump custom comprimido e captura globals',
    ok:
      files.backup?.includes('pg_dump') &&
      files.backup?.includes('--format=custom') &&
      files.backup?.includes('--compress=9') &&
      files.backup?.includes('pg_dumpall') &&
      files.backup?.includes('--globals-only')
  },
  {
    label: 'backup gera manifest, restore hints e SHA256SUMS',
    ok:
      files.backup?.includes('meta/manifest.json') &&
      files.backup?.includes('restore-hints.txt') &&
      files.backup?.includes('SHA256SUMS') &&
      files.backup?.includes('sha256sum')
  },
  {
    label: 'backup aplica politica de retencao configuravel',
    ok:
      files.backup?.includes('BACKUP_RETENTION_DAYS') &&
      files.backup?.includes('find "$BACKUP_BASE_DIR"') &&
      files.backup?.includes('-mtime +"$BACKUP_RETENTION_DAYS"')
  },
  {
    label: 'restore-drill existe e nao toca a stack viva',
    ok:
      files.restoreDrill?.includes('set -Eeuo pipefail') &&
      files.restoreDrill?.includes('disposable postgres') &&
      files.restoreDrill?.includes('docker run -d --rm') &&
      files.restoreDrill?.includes('PG_CONTAINER=')
  },
  {
    label: 'restore-drill valida checksums e TOC do dump antes de restaurar',
    ok:
      files.restoreDrill?.includes('sha256sum -c SHA256SUMS') &&
      files.restoreDrill?.includes('pg_restore -l') &&
      files.restoreDrill?.includes('dump-toc.txt')
  },
  {
    label: 'restore-drill restaura globals, database e storage com evidencia',
    ok:
      files.restoreDrill?.includes('restore_globals') &&
      files.restoreDrill?.includes('restore_database') &&
      files.restoreDrill?.includes('restore_storage') &&
      files.restoreDrill?.includes('restore-drill-report.json')
  },
  {
    label: 'package.json expõe backup, restore drill e check estatico',
    ok:
      files.packageJson?.includes('"ops:backup:v2"') &&
      files.packageJson?.includes('"ops:restore:drill:v2"') &&
      files.packageJson?.includes('"ops:backup:check"')
  },
  {
    label: 'documentacao viva de cutover menciona registro de evidencias',
    ok:
      files.cutoverChecklist?.includes('registrar evidencias do cutover') &&
      files.deploySurface?.includes('pnpm deploy:check')
  },
  {
    label: 'roadmap F3 mantem backup/restore como criterio de saida',
    ok:
      files.roadmap?.includes('Plano de backup, restauração e operação') &&
      files.roadmap?.includes('| F3-08 | Definir backup e restore testado |')
  }
];

let failures = 0;
const results = [];

for (const check of checks) {
  if (check.ok) {
    results.push({ label: check.label, status: 'pass' });
    if (!emitJsonOnly) {
      console.log(`[backup-restore-check] PASS ${check.label}`);
    }
  } else {
    failures += 1;
    results.push({ label: check.label, status: 'fail' });
    if (!emitJsonOnly) {
      console.error(`[backup-restore-check] FAIL ${check.label}`);
    }
  }
}

if (emitJsonOnly) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        failures,
        results
      },
      null,
      2
    )
  );
}

if (failures > 0) {
  if (!emitJsonOnly) {
    console.error(`[backup-restore-check] ${failures} check(s) failed`);
  }
  process.exit(1);
}

if (!emitJsonOnly) {
  console.log('[backup-restore-check] backup and restore drill surface is consistent');
}
