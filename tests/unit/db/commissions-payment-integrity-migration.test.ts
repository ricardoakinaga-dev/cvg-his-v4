import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'packages/db/migrations/0138_commissions_payment_integrity.sql'
);

test('0138 makes commission payables idempotent and tenant-scoped', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  expect(sql).toMatch(/CREATE UNIQUE INDEX[\s\S]*financial_payables_account_source_expense_unique/i);
  expect(sql).toMatch(/financial_payables[\s\S]*account_id[\s\S]*source_expense_id/i);
  expect(sql).toMatch(/commission_lines[\s\S]*commission_calculations[\s\S]*account_id[\s\S]*calculation_id/i);
  expect(sql).toMatch(/commission_lines[\s\S]*commission_rules[\s\S]*account_id[\s\S]*rule_id/i);
  expect(sql).toMatch(/commission_calculations[\s\S]*financial_payables[\s\S]*account_id[\s\S]*payable_id/i);
  expect(sql).toMatch(/VALIDATE CONSTRAINT/i);
});
