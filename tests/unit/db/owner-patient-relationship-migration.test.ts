import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'packages/db/migrations/0126_owner_patient_authorized_relationship.sql'
);

describe('owner-patient authorized relationship migration contract', () => {
  it('extends the relationship check without weakening primary-link invariants', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('DROP CONSTRAINT IF EXISTS owner_patient_links_relationship_chk');
    expect(sql).toContain("'authorized'");
    expect(sql).toContain('owner_patient_links_primary_consistency_chk');
    expect(sql).toContain('ALTER TABLE owner_patient_links FORCE ROW LEVEL SECURITY');
  });
});
