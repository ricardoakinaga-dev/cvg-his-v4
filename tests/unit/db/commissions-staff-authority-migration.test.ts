import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test } from 'vitest';

const migrationPath = resolve(process.cwd(), 'packages/db/migrations/0131_commissions_staff_authority.sql');

test('migration 0131 protects commission authority, source idempotency and payable state', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  expect(sql).toMatch(/commission_lines[\s\S]*profession_id/i);
  expect(sql).toMatch(/commission_lines_staff_account_fk/i);
  expect(sql).toMatch(/commission_lines.*source.*unique|unique.*commission_lines.*source/is);
  expect(sql).toMatch(/commission_lines_authority_guard/i);
  expect(sql).toMatch(/commission_calculations_paid_payable_chk/i);
  expect(sql).toMatch(/billing_records.*settled|status.*settled/is);
});

test('migration 0131 adds named constraints only when absent for safe replay', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const guardedConstraints = [
    ['commission_rules', 'commission_rules_account_staff_fk'],
    ['commission_lines', 'commission_lines_staff_account_fk'],
    ['commission_lines', 'commission_lines_profession_account_fk'],
    ['commission_calculations', 'commission_calculations_paid_payable_chk']
  ] as const;

  for (const [tableName, constraintName] of guardedConstraints) {
    const addIndex = sql.indexOf(`ADD CONSTRAINT ${constraintName}`);
    expect(addIndex, `${constraintName} must be added`).toBeGreaterThanOrEqual(0);

    const blockStart = sql.lastIndexOf('DO $$', addIndex);
    const blockEnd = sql.indexOf('$$;', addIndex);
    const block = sql.slice(blockStart, blockEnd + 3);

    expect(block, `${constraintName} must be inside an idempotent DO block`).toMatch(
      /IF\s+NOT\s+EXISTS/i
    );
    expect(block).toMatch(new RegExp(`conname\\s*=\\s*'${constraintName}'`, 'i'));
    expect(block).toMatch(new RegExp(`conrelid\\s*=\\s*'${tableName}'::regclass`, 'i'));
  }
});
