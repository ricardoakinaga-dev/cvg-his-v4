import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const fixtureScript = readFileSync(
  resolve(root, 'infra/scripts/create-restore-drill-fixture.mjs'),
  'utf8'
);
const runnerScript = readFileSync(
  resolve(root, 'infra/scripts/run-restore-drill-fixture.mjs'),
  'utf8'
);
const restoreScript = readFileSync(resolve(root, 'infra/scripts/restore-drill-v2.sh'), 'utf8');
const packageJson = readFileSync(resolve(root, 'package.json'), 'utf8');

describe('representative restore fixture contract', () => {
  it('keeps the representative profile explicit and applies canonical migrations', () => {
    expect(fixtureScript).toContain('RESTORE_FIXTURE_PROFILE');
    expect(fixtureScript).toContain("'representative'");
    expect(fixtureScript).toContain('packages/db/src/migrate.ts');
    expect(fixtureScript).toContain('Owner');
    expect(fixtureScript).toContain('billing_records');
    expect(fixtureScript).toContain('outbox_events');
    expect(fixtureScript).toContain("Object.prototype.hasOwnProperty.call(options, 'encoding')");
  });

  it('exposes an explicit representative runner and persists profile metadata', () => {
    expect(runnerScript).toContain('RESTORE_FIXTURE_PROFILE');
    expect(runnerScript).toContain('representative');
    expect(fixtureScript).toContain('profile=');
    expect(packageJson).toContain('ops:restore:drill:fixture:representative');
  });

  it('does not embed credential-shaped database URLs in the fixture source', () => {
    expect(fixtureScript).not.toMatch(/postgres(?:ql)?:\/\/[^\s'\"]+:[^\s'\"]+@/i);
  });

  it('redacts fixture credentials from command failures and role dumps', () => {
    expect(fixtureScript).toContain('redactSensitive');
    expect(fixtureScript).toContain('--no-role-passwords');
    expect(fixtureScript).toContain('POSTGRES_PASSWORD=');
    expect(fixtureScript).toContain('***');
  });

  it('keeps generated fixture artifacts private and removes failed partial bundles', () => {
    expect(fixtureScript).toContain('mode: 0o600');
    expect(fixtureScript).toContain('mode: 0o700');
    expect(fixtureScript).toContain('rmSync(bundleDir');
  });

  it('uses a per-run restore password instead of a static credential', () => {
    expect(restoreScript).not.toContain('restore_admin_pw');
    expect(restoreScript).toContain('openssl rand -hex');
  });

  it('confines storage archive extraction to regular files and directories', () => {
    expect(restoreScript).toContain('validate_storage_archive');
    expect(restoreScript).toContain('storage-archive.entries.txt');
    expect(restoreScript).toContain('storage-archive.verbose.txt');
    expect(restoreScript).toContain('..');
    expect(restoreScript).toContain('-|d)');
    expect(restoreScript).toContain('unsupported entry type');
    expect(restoreScript).toContain('type l');
    expect(restoreScript).toContain('links +1');
  });

  it('extracts storage without restoring archive ownership or permissions', () => {
    expect(restoreScript).toContain('--no-same-owner');
    expect(restoreScript).toContain('--no-same-permissions');
    expect(restoreScript).toContain('--keep-directory-symlink');
    expect(restoreScript).toContain('mktemp -d');
    expect(restoreScript).toContain('chmod 700');
    expect(restoreScript).toContain('STORAGE_RESTORE_WORKSPACE');
  });

  it('validates the restored representative graph and tenant context', () => {
    expect(restoreScript).toContain('RESTORE_DRILL_PROFILE');
    expect(restoreScript).toContain('validate_representative_restore');
    expect(restoreScript).toContain("set_config('app.current_account_id'");
    expect(restoreScript).toContain('representative-integrity');
    expect(restoreScript).toContain('restore_probe');
    expect(restoreScript).toContain('SET ROLE $REPRESENTATIVE_RUNTIME_ROLE');
    expect(restoreScript).toContain('representative-role.csv');
    expect(restoreScript).toContain('NOBYPASSRLS');
    expect(restoreScript).toContain('false,false');
    expect(restoreScript).toContain('restoreProfile');
    expect(restoreScript).toContain('stable_connections');
    expect(restoreScript).toContain('invalid restore database name');
    expect(restoreScript).toContain('docker exec "$PG_CONTAINER" pg_restore');
    expect(restoreScript).toContain('docker exec "$PG_CONTAINER" createdb');
    expect(restoreScript).not.toContain('pg_restore -v -U "$POSTGRES_USER"');
    expect(fixtureScript).toContain('stableConnections');
    expect(fixtureScript).toContain("'SELECT 1'");
  });
});
