import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const restoreScript = resolve(root, 'infra/scripts/restore-drill-v2.sh');

function createBundle(manifest: string) {
  const workDir = mkdtempSync(join(tmpdir(), 'cvg-his-restore-storage-mode-'));
  const bundleDir = join(workDir, 'bundle');
  const databaseDir = join(bundleDir, 'database');
  const metaDir = join(bundleDir, 'meta');
  const storageDir = join(bundleDir, 'storage');
  const reportDir = join(workDir, 'report');
  const stubBin = join(workDir, 'bin');

  for (const directory of [databaseDir, metaDir, storageDir, reportDir, stubBin]) {
    mkdirSync(directory, { recursive: true });
  }
  writeFileSync(join(databaseDir, 'backup.info'), 'profile=minimal\n', 'utf8');
  writeFileSync(join(databaseDir, 'postgres.dump'), 'fixture dump\n', 'utf8');
  writeFileSync(join(databaseDir, 'postgres-globals.sql'), '-- fixture globals\n', 'utf8');
  writeFileSync(join(metaDir, 'manifest.json'), `${manifest}\n`, 'utf8');
  writeFileSync(join(metaDir, 'restore-hints.txt'), 'fixture hints\n', 'utf8');

  writeFileSync(
    join(bundleDir, 'SHA256SUMS'),
    execFileSync(
      'sha256sum',
      [
        'database/backup.info',
        'database/postgres.dump',
        'database/postgres-globals.sql',
        'meta/manifest.json',
        'meta/restore-hints.txt'
      ],
      { cwd: bundleDir, encoding: 'utf8' }
    ),
    'utf8'
  );

  const dockerStub = join(stubBin, 'docker');
  writeFileSync(
    dockerStub,
    '#!/usr/bin/env bash\nif [[ "$*" == *"COUNT(*) FROM pg_tables"* ]]; then echo 1; fi\nexit 0\n',
    'utf8'
  );
  chmodSync(dockerStub, 0o755);

  return { bundleDir, reportDir, pathEnv: `${stubBin}:${process.env.PATH ?? ''}` };
}

describe('restore drill storage mode contract', () => {
  it('restores a database-only bundle without requiring storage artifacts', () => {
    const fixture = createBundle('{"storageIncluded":false}');

    execFileSync('bash', [restoreScript, fixture.bundleDir, '--report-dir', fixture.reportDir], {
      cwd: root,
      env: { ...process.env, PATH: fixture.pathEnv },
      stdio: 'pipe'
    });

    const report = JSON.parse(
      readFileSync(join(fixture.reportDir, 'restore-drill-report.json'), 'utf8')
    );
    expect(report.storageIncluded).toBe(false);
    expect(report.storageRestoreStatus).toBe('skipped');
    expect(report.storageArchive).toBeNull();
    expect(report.storageListingMatch).toBeNull();
    expect(report.restoredStorageFiles).toBe(0);
    expect(existsSync(join(fixture.reportDir, 'storage-archive.entries.txt'))).toBe(false);
  });

  it('fails closed when storageIncluded is not an exact boolean', () => {
    const fixture = createBundle('{"storageIncluded":"false"}');
    let failure: { readonly status?: number; readonly stderr?: Buffer } | undefined;

    try {
      execFileSync('bash', [restoreScript, fixture.bundleDir, '--report-dir', fixture.reportDir], {
        cwd: root,
        env: { ...process.env, PATH: fixture.pathEnv },
        stdio: 'pipe'
      });
    } catch (error) {
      failure = error as { readonly status?: number; readonly stderr?: Buffer };
    }

    expect(failure?.status).toBe(1);
    expect(failure?.stderr?.toString()).toContain('invalid storage inclusion declaration');
  });
});
