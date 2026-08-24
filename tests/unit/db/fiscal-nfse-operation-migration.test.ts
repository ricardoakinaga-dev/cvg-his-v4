import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(process.cwd(), 'packages/db/migrations/0141_fiscal_nfse_operation_leases.sql');

describe('fiscal NFS-e operation lease migration', () => {
  it('persists operation claims and the stable provider request key', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/operation_key\s+TEXT/i);
    expect(sql).toMatch(/operation_kind\s+VARCHAR/i);
    expect(sql).toMatch(/operation_lease_until\s+TIMESTAMPTZ/i);
    expect(sql).toMatch(/last_operation_kind\s+VARCHAR/i);
    expect(sql).toMatch(/last_provider_request_key\s+TEXT/i);
    expect(sql).toMatch(/UNIQUE INDEX[\s\S]*account_id[\s\S]*operation_kind[\s\S]*operation_key/i);
  });

  it('is replay safe and restricts operation kinds', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS operation_key/i);
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS fiscal_nfse_documents_operation_kind_chk/i);
    expect(sql).toMatch(/operation_kind IN \('issue', 'cancel'\)/i);
    expect(sql).toMatch(/last_operation_kind IN \('issue', 'cancel'\)/i);
  });
});
