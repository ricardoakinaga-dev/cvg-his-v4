import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0159_finance_operational_catalogs.sql'),
  'utf8'
);

describe('finance operational catalogs migration', () => {
  it('supports exactly the four required catalog domains with tenant-local uniqueness', () => {
    expect(sql).toMatch(/'banks', 'payment-methods', 'card-machines', 'split-rules'/);
    expect(sql).toMatch(/UNIQUE \(account_id, catalog_type, code\)/);
    expect(sql).toMatch(/FOREIGN KEY \(account_id, created_by_user_id\)/);
    expect(sql).toMatch(/FOREIGN KEY \(account_id, updated_by_user_id\)/);
  });

  it('forces RLS and optimistic concurrency metadata', () => {
    expect(sql).toMatch(/version INTEGER NOT NULL DEFAULT 1/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/FORCE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/USING \(account_id = app\.current_account_id\(\)\)/);
    expect(sql).toMatch(/WITH CHECK \(account_id = app\.current_account_id\(\)\)/);
  });
});
