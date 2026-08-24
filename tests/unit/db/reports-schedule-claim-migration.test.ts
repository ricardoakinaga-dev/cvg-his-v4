import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(process.cwd(), 'packages/db/migrations/0142_reports_schedule_claims.sql');

describe('report schedule claim migration', () => {
  it('adds a tenant-scoped lease to prevent duplicate worker selection', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/claim_token\s+TEXT/i);
    expect(sql).toMatch(/claim_until\s+TIMESTAMPTZ/i);
    expect(sql).toMatch(/claim_worker_id\s+TEXT/i);
    expect(sql).toMatch(/report_schedules\s*\([\s\S]*account_id/i);
  });

  it('keeps the lease columns replay-safe', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS claim_token/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS claim_until/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS claim_worker_id/i);
  });
});
