import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'packages/db/migrations/0130_staff_professions.sql'
);

describe('staff professions migration contract', () => {
  it('defines tenant-scoped profession authority and active-link protection', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS professions');
    expect(sql).toContain('professions_tenant_isolation');
    expect(sql).toContain('FOREIGN KEY (account_id, profession_id)');
    expect(sql).toContain('enforce_active_staff_profession');
    expect(sql).toContain('staff_profession_active_guard');
    expect(sql).toContain('p.is_active = TRUE');
  });
});
