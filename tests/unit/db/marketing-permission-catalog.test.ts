import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');

describe('marketing permission catalog migration', () => {
  it('adds both marketing permissions and grants them only through the admin role', () => {
    const migration = readFileSync(
      resolve(root, 'packages/db/migrations/0136_marketing_permission_catalog.sql'),
      'utf8'
    );

    expect(migration).toContain("'marketing.read'");
    expect(migration).toContain("'marketing.manage'");
    expect(migration).toContain("WHERE role.name = 'admin'");
    expect(migration).not.toMatch(/WHERE role\.name\s+<>\s+'admin'/i);
  });

  it('keeps the local seed catalog aligned with the migration', () => {
    const seed = readFileSync(resolve(root, 'packages/db/src/seed.ts'), 'utf8');

    expect(seed).toContain("key: 'marketing.read'");
    expect(seed).toContain("key: 'marketing.manage'");
  });
});
