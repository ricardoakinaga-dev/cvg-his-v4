import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const harness = readFileSync(resolve(root, 'scripts/run-rem016-migration-harness.mjs'), 'utf8');
const packageManifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const workflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');

describe('REM-016 migration harness contract', () => {
  it('owns a disposable PostgreSQL boundary and never consumes ambient database URLs', () => {
    expect(harness).toContain('postgres@sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685');
    expect(harness).toContain("'DATABASE_URL'");
    expect(harness).toContain("'DATABASE_URL_TEST'");
    expect(harness).toContain('for (const key of TEST_DB_ENV_KEYS) delete env[key]');
    expect(harness).toContain("if (argv[index] === '--') continue;");
    expect(harness).toContain("env.CVG_CRITICAL_PROCESS_RUNNER = '1'");
    expect(harness).toContain('docker');
    expect(harness).toContain('DROP DATABASE IF EXISTS');
  });

  it('covers install, upgrade, mixed-version, lock duration, rollback and failure recovery', () => {
    for (const marker of [
      'runInstall',
      'runMixedVersion',
      'runLockProbe',
      'runRollback',
      'runFailureRecovery',
      'pg_advisory_lock',
      'pg_dump',
      'pg_restore',
      'SYNTHETIC_ACCOUNT_COUNT'
    ]) {
      expect(harness, marker).toContain(marker);
    }
  });

  it('runs as a named package command and is required by CI with persisted evidence', () => {
    expect(packageManifest.scripts?.['test:migration-harness']).toBe(
      'node scripts/run-rem016-migration-harness.mjs'
    );
    expect(workflow).toContain('name: Run REM-016 migration harness');
    expect(workflow).toContain(
      'pnpm test:migration-harness -- --output artifacts/operations/rem-016-migration-harness.json'
    );
    expect(workflow).toContain('artifacts/operations/rem-016-migration-harness.json');
  });
});
