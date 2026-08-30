import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../../..');
const migration = readFileSync(
  resolve(repositoryRoot, 'packages/db/migrations/0155_service_principal_writer_linearization.sql'),
  'utf8'
);

describe('service-principal writer linearization migration', () => {
  it('keeps the privileged writer lock trigger additive and rerunnable', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION app.lock_service_principal_authorization_write()'
    );
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain('SET search_path = pg_catalog, pg_temp');
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION app.lock_service_principal_authorization_write() FROM PUBLIC;'
    );
    expect(migration.match(/DROP TRIGGER IF EXISTS/g)).toHaveLength(2);
    expect(migration).toContain('DROP TRIGGER IF EXISTS users_authorization_write_lock ON users;');
    expect(migration).toContain(
      'DROP TRIGGER IF EXISTS account_service_principals_authorization_write_lock'
    );
  });

  it('locks every account identity mutation and preserves deterministic multi-account order', () => {
    expect(migration).toContain(
      'BEFORE UPDATE OF account_id, principal_kind, interactive_login_enabled, is_active'
    );
    expect(migration).toContain('BEFORE INSERT OR UPDATE OR DELETE');
    expect(migration).toContain('old_account_id::text < new_account_id::text');
    expect(migration).toContain('hashtextextended(old_account_id::text, 0)');
    expect(migration).toContain('hashtextextended(new_account_id::text, 0)');
    expect(migration).toContain('pg_try_advisory_xact_lock');
    expect(migration).toContain('pg_catalog.hashtextextended');
    expect(migration).toContain('pg_catalog.pg_try_advisory_xact_lock');
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock');
    expect(migration).toContain('cvg-his-v2:service-principal-writer:');
    expect(migration).not.toContain('writer_mutex_key');
    expect(migration).toContain("ERRCODE = '40001'");
  });
});
