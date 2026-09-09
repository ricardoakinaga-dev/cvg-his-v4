import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const historicalMigration = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0048_report_engine.sql'),
  'utf8'
);
const forceRlsMigration = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0163_force_report_runtime_rls.sql'),
  'utf8'
);

describe('report engine migration', () => {
  it('keeps the historical report migration immutable', () => {
    expect(historicalMigration).not.toContain('FORCE ROW LEVEL SECURITY');
  });

  it('forces tenant isolation for every persistent report table incrementally', () => {
    for (const table of [
      'report_executions',
      'report_exports',
      'report_schedules',
      'report_schedule_deliveries'
    ]) {
      expect(forceRlsMigration).toContain(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
    }
  });

  it('binds each report policy to the active account context', () => {
    expect(historicalMigration).toMatch(
      /CREATE POLICY report_executions_tenant_isolation[\s\S]*app\.current_account_id\(\)/
    );
    expect(historicalMigration).toMatch(
      /CREATE POLICY report_exports_tenant_isolation[\s\S]*app\.current_account_id\(\)/
    );
    expect(historicalMigration).toMatch(
      /CREATE POLICY report_schedules_tenant_isolation[\s\S]*app\.current_account_id\(\)/
    );
    expect(historicalMigration).toMatch(
      /CREATE POLICY report_schedule_deliveries_tenant_isolation[\s\S]*app\.current_account_id\(\)/
    );
  });
});
