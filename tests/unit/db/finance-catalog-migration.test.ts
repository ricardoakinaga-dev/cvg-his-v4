import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('finance catalog canonical migration', () => {
  it('is additive and declares the catalog integrity constraints', async () => {
    const sql = await readFile(
      resolve(process.cwd(), 'packages/db/migrations/0146_finance_catalogs.sql'),
      'utf8'
    );

    expect(sql).not.toMatch(/\bDROP\s+POLICY\b/i);
    expect(sql).toMatch(/finance_cost_centers_kind_chk/);
    expect(sql).toMatch(/finance_expense_catalog_items_cost_center_fk/);
    expect(sql).toMatch(/FORCE ROW LEVEL SECURITY/);
  });
});
