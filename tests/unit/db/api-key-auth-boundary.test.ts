import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0113_api_key_auth_boundary.sql'),
  'utf8'
);
const pixDlqMigration = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0114_pix_settlement_dlq_operator.sql'),
  'utf8'
);

describe('API-key pre-context projection contract', () => {
  it('does not grant or return non-authentication columns to the capability', () => {
    expect(migration).toMatch(
      /GRANT SELECT \(\s*id, account_id, key_hash, permissions, rate_limit, rate_limit_window,\s*expires_at, is_active\s*\) ON TABLE api_keys TO cvg_api_key_auth;/s
    );
    expect(migration).toContain(
      'id VARCHAR,\n  account_id VARCHAR,\n  key_hash VARCHAR,\n  permissions JSONB,\n  rate_limit INTEGER,\n  rate_limit_window INTEGER,\n  expires_at TIMESTAMPTZ,\n  is_active BOOLEAN'
    );
    for (const forbiddenColumn of [
      'name VARCHAR',
      'key_prefix VARCHAR',
      'last_used_at TIMESTAMPTZ',
      'created_by VARCHAR',
      'created_at TIMESTAMPTZ',
      'updated_at TIMESTAMPTZ'
    ]) {
      expect(migration).not.toContain(forbiddenColumn);
    }
  });

  it('keeps optional installer-role revocations portable on fresh clusters', () => {
    for (const migrationSql of [migration, pixDlqMigration]) {
      expect(migrationSql).toMatch(
        /IF EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'cvg_installer'\)/
      );
      expect(migrationSql).not.toMatch(/FROM PUBLIC, cvg_installer/);
    }
  });
});
