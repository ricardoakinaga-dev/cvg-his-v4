import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'packages/db/migrations/0143_reports_delivery_leases.sql'
);

describe('report delivery lease migration', () => {
  it('adds a tenant-scoped retry lease and a fencing token', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/ALTER TABLE report_schedule_deliveries/i);
    expect(sql).toMatch(/claim_token\s+TEXT/i);
    expect(sql).toMatch(/claim_until\s+TIMESTAMPTZ/i);
    expect(sql).toMatch(/claim_worker_id\s+TEXT/i);
    expect(sql).toMatch(/report_schedule_deliveries\s*\(/i);
  });

  it('indexes only failed rows eligible for retry', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/CREATE INDEX[\s\S]*report_schedule_deliveries_failed_claim_idx/i);
    expect(sql).toMatch(/WHERE status = 'failed'/i);
  });
});
