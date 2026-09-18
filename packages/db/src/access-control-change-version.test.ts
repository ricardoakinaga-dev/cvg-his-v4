import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('access-control change-version migration', () => {
  it('keeps the freshness token exact, tenant-bound and trigger-backed', () => {
    const migration = readFileSync(
      resolve(repositoryRoot, 'packages/db/migrations/0175_access_control_change_versions.sql'),
      'utf8'
    );

    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION app\.access_control_change_token\(target_account_id uuid\)[\s\S]*SECURITY DEFINER/
    );
    expect(migration).toContain('target_account_id <> current_account_id');
    expect(migration).toContain('access_control_account_versions_tenant_isolation');
    expect(migration).toContain('REVOKE ALL ON TABLE access_control_account_versions');

    for (const table of [
      'access_teams',
      'access_sectors',
      'access_team_memberships',
      'access_sector_memberships',
      'access_user_permissions',
      'access_team_permissions',
      'access_sector_permissions',
      'users',
      'user_roles',
      'roles',
      'permissions',
      'role_permissions'
    ]) {
      expect(migration).toMatch(new RegExp(`${table}_(?:change|access_control_change)_version`));
    }
  });
});
