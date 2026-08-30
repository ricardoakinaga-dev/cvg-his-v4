import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const restoreScript = resolve(root, 'infra/scripts/restore-drill-v2.sh');

type ArchiveVariant = 'traversal' | 'symlink' | 'hardlink' | 'destination-symlink';

function createFixture(variant: ArchiveVariant): {
  readonly bundleDir: string;
  readonly reportDir: string;
  readonly outsideSentinel: string;
  readonly outsideStoragePayload: string;
  readonly pathEnv: string;
} {
  const workDir = mkdtempSync(join(tmpdir(), `cvg-his-restore-security-${variant}-`));
  const bundleDir = join(workDir, 'bundle');
  const databaseDir = join(bundleDir, 'database');
  const metaDir = join(bundleDir, 'meta');
  const storageDir = join(bundleDir, 'storage');
  const archiveRoot = join(workDir, 'archive-root');
  const stubBin = join(workDir, 'bin');
  const reportDir = join(workDir, 'report');
  const outsideSentinel = join(workDir, 'outside-sentinel');
  const outsideStorageDir = join(workDir, 'outside-storage');
  const outsideStoragePayload = join(outsideStorageDir, 'payload.txt');

  for (const directory of [
    databaseDir,
    metaDir,
    storageDir,
    archiveRoot,
    stubBin,
    reportDir,
    ...(variant === 'destination-symlink' ? [outsideStorageDir] : [])
  ]) {
    mkdirSync(directory, { recursive: true });
  }
  writeFileSync(outsideSentinel, 'sentinel-intact\n', 'utf8');
  writeFileSync(join(databaseDir, 'backup.info'), 'profile=minimal\n', 'utf8');
  writeFileSync(join(databaseDir, 'postgres.dump'), 'not-used-by-stub\n', 'utf8');
  writeFileSync(join(databaseDir, 'postgres-globals.sql'), '', 'utf8');
  writeFileSync(join(metaDir, 'manifest.json'), '{}\n', 'utf8');
  writeFileSync(join(storageDir, 'file-storage.contents.txt'), 'payload.txt\n', 'utf8');

  if (variant === 'traversal') {
    writeFileSync(join(archiveRoot, 'payload.txt'), 'malicious traversal\n', 'utf8');
    execFileSync(
      'tar',
      [
        '-czf',
        join(storageDir, 'file-storage.tar.gz'),
        '--transform=s#payload.txt#../outside-sentinel#',
        '-C',
        archiveRoot,
        'payload.txt'
      ],
      { stdio: 'pipe' }
    );
  } else if (variant === 'symlink') {
    symlinkSync('../outside-sentinel', join(archiveRoot, 'link'));
    execFileSync(
      'tar',
      ['-czf', join(storageDir, 'file-storage.tar.gz'), '-C', archiveRoot, 'link'],
      {
        stdio: 'pipe'
      }
    );
  } else if (variant === 'hardlink') {
    writeFileSync(join(archiveRoot, 'file.txt'), 'hard-linked payload\n', 'utf8');
    linkSync(join(archiveRoot, 'file.txt'), join(archiveRoot, 'file-link.txt'));
    execFileSync(
      'tar',
      [
        '-czf',
        join(storageDir, 'file-storage.tar.gz'),
        '-C',
        archiveRoot,
        'file.txt',
        'file-link.txt'
      ],
      { stdio: 'pipe' }
    );
  } else {
    writeFileSync(join(archiveRoot, 'payload.txt'), 'destination symlink payload\n', 'utf8');
    symlinkSync(outsideStorageDir, join(reportDir, 'storage-restored'), 'dir');
    execFileSync(
      'tar',
      ['-czf', join(storageDir, 'file-storage.tar.gz'), '-C', archiveRoot, 'payload.txt'],
      { stdio: 'pipe' }
    );
  }

  const checksumPaths = [
    'database/backup.info',
    'database/postgres-globals.sql',
    'database/postgres.dump',
    'meta/manifest.json',
    'storage/file-storage.contents.txt',
    'storage/file-storage.tar.gz'
  ];
  writeFileSync(
    join(bundleDir, 'SHA256SUMS'),
    execFileSync('sha256sum', checksumPaths, { cwd: bundleDir, encoding: 'utf8' }),
    'utf8'
  );

  const dockerStub = join(stubBin, 'docker');
  writeFileSync(
    dockerStub,
    '#!/usr/bin/env bash\nif [[ "$*" == *"COUNT(*) FROM pg_tables"* ]]; then echo 1; fi\nexit 0\n',
    'utf8'
  );
  chmodSync(dockerStub, 0o755);

  return {
    bundleDir,
    reportDir,
    outsideSentinel,
    outsideStoragePayload,
    pathEnv: `${stubBin}:${process.env.PATH ?? ''}`
  };
}

describe('restore-drill storage archive boundary', () => {
  it.each(['traversal', 'symlink', 'hardlink', 'destination-symlink'] as const)(
    'rejects a %s archive entry before extraction',
    (variant) => {
      const fixture = createFixture(variant);
      let failure: { readonly status?: number; readonly stderr?: Buffer } | undefined;

      try {
        execFileSync(
          'bash',
          [restoreScript, fixture.bundleDir, '--report-dir', fixture.reportDir],
          {
            cwd: root,
            env: { ...process.env, PATH: fixture.pathEnv },
            stdio: 'pipe'
          }
        );
      } catch (error) {
        failure = error as { readonly status?: number };
      }

      expect(failure?.status).toBe(1);
      expect(readFileSync(fixture.outsideSentinel, 'utf8')).toBe('sentinel-intact\n');
      if (variant === 'destination-symlink') {
        expect(failure?.stderr?.toString()).toContain('restore destination');
        expect(existsSync(fixture.outsideStoragePayload)).toBe(false);
      } else {
        expect(existsSync(join(fixture.reportDir, 'storage-restored'))).toBe(false);
      }
    }
  );
});
