import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(import.meta.dirname, '../../../packages/db/migrations/0104_user_roles_rls.sql'),
  'utf8'
);

describe('user_roles tenant isolation', () => {
  it('enforces tenant membership through the parent user account', () => {
    expect(migration).toContain('ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY user_roles_tenant_isolation');
    expect(migration).toMatch(/users\.account_id\s*=\s*app\.current_account_id\(\)/);
    expect(migration).toContain('WITH CHECK');
  });
});
