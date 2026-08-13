#!/usr/bin/env node

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { retryOperation } from './restore-drill-fixture-lib.mjs';

const root = process.cwd();
const baseDir = resolve(process.env.RESTORE_FIXTURE_BASE_DIR ?? '/tmp/cvg-his-v2-backup-fixtures');
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, 'Z');
const runId = `${timestamp}-${process.pid}`;
const bundleDir = join(baseDir, `fixture-${runId}`);
const payloadDir = join(bundleDir, '.storage-payload');
const containerName = `cvg-his-v2-backup-fixture-${runId.toLowerCase()}`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: options.encoding,
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const output = `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}`.trim();
    throw new Error(`${command} ${args.join(' ')} failed: ${output}`);
  }

  return result;
}

function docker(args, options = {}) {
  return run('docker', args, options);
}

function cleanup() {
  spawnSync('docker', ['rm', '-f', containerName], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'ignore', 'ignore'],
  });
}

function waitForPostgres() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = spawnSync(
      'docker',
      ['exec', containerName, 'pg_isready', '-U', 'postgres', '-d', 'postgres'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    if (result.status === 0) {
      return;
    }
    spawnSync('sleep', ['1']);
  }
  throw new Error('disposable postgres did not become ready in time');
}

function createDatabaseFixture() {
  docker([
    'run',
    '-d',
    '--rm',
    '--name',
    containerName,
    '-e',
    'POSTGRES_PASSWORD=postgres',
    '-e',
    'POSTGRES_DB=postgres',
    'postgres:16-alpine',
  ]);

  waitForPostgres();

  retryOperation(
    () => docker([
      'exec',
      containerName,
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-c',
      [
        'CREATE TABLE IF NOT EXISTS public.restore_drill_probe (',
        'id uuid PRIMARY KEY,',
        'account_id uuid NOT NULL,',
        'label text NOT NULL,',
        'created_at timestamptz NOT NULL DEFAULT now()',
        ');',
        "INSERT INTO public.restore_drill_probe (id, account_id, label) VALUES ('00000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'fixture restore drill') ON CONFLICT (id) DO NOTHING;",
        'CREATE TABLE IF NOT EXISTS public.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint);',
        "INSERT INTO public.__drizzle_migrations (hash, created_at) SELECT 'restore-drill-fixture', 20260528120000 WHERE NOT EXISTS (SELECT 1 FROM public.__drizzle_migrations WHERE hash = 'restore-drill-fixture');",
      ].join(' '),
    ]),
    {
      attempts: 60,
      pause: () => spawnSync('sleep', ['1']),
    },
  );

  const dump = docker(
    [
      'exec',
      containerName,
      'pg_dump',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '--format=custom',
      '--compress=9',
    ],
    { encoding: null },
  );
  writeFileSync(join(bundleDir, 'database', 'postgres.dump'), dump.stdout);

  const globals = docker([
    'exec',
    containerName,
    'pg_dumpall',
    '-U',
    'postgres',
    '--globals-only',
  ], { encoding: 'utf8' });
  writeFileSync(join(bundleDir, 'database', 'postgres-globals.sql'), globals.stdout);
}

function createStorageFixture() {
  mkdirSync(join(payloadDir, 'attachments', 'patients'), { recursive: true });
  writeFileSync(
    join(payloadDir, 'attachments', 'patients', 'restore-drill-note.txt'),
    'CVG HIS v4 restore drill fixture\n',
  );
  writeFileSync(join(payloadDir, 'README.txt'), 'Fixture storage payload for restore drill.\n');

  run('tar', ['-C', payloadDir, '-czf', join(bundleDir, 'storage', 'file-storage.tar.gz'), '.']);
  const listing = run('find', ['.', '-type', 'f'], { cwd: payloadDir, encoding: 'utf8' }).stdout
    .split('\n')
    .map((line) => line.replace(/^\.\//, '').trim())
    .filter(Boolean)
    .sort()
    .join('\n');
  writeFileSync(join(bundleDir, 'storage', 'file-storage.contents.txt'), `${listing}\n`);
  rmSync(payloadDir, { recursive: true, force: true });
}

function writeMetadata() {
  writeFileSync(
    join(bundleDir, 'database', 'backup.info'),
    'database=postgres\nuser=postgres\nformat=pg_dump_custom\nsource=restore-drill-fixture\n',
  );
  writeFileSync(
    join(bundleDir, 'meta', 'manifest.json'),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        backupDir: bundleDir,
        source: 'restore-drill-fixture',
        databaseDump: 'database/postgres.dump',
        globalsDump: 'database/postgres-globals.sql',
        storageIncluded: true,
        retentionDays: 1,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(bundleDir, 'meta', 'restore-hints.txt'),
    [
      'Restore drill fixture hints:',
      '1. Validate SHA256SUMS.',
      '2. Restore database/postgres-globals.sql.',
      '3. Restore database/postgres.dump with pg_restore.',
      '4. Restore storage/file-storage.tar.gz.',
      '',
    ].join('\n'),
  );
}

function writeChecksums() {
  const result = run('sh', ['-lc', 'find database storage meta -type f -print0 | sort -z | xargs -0 sha256sum'], {
    cwd: bundleDir,
    encoding: 'utf8',
  });
  writeFileSync(join(bundleDir, 'SHA256SUMS'), result.stdout);
}

try {
  mkdirSync(join(bundleDir, 'database'), { recursive: true });
  mkdirSync(join(bundleDir, 'storage'), { recursive: true });
  mkdirSync(join(bundleDir, 'meta'), { recursive: true });
  createDatabaseFixture();
  createStorageFixture();
  writeMetadata();
  writeChecksums();
  console.log(bundleDir);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  cleanup();
}
