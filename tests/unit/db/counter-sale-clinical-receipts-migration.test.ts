import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'packages/db/migrations/0129_counter_sale_clinical_context_receipts.sql'
);

describe('counter-sale clinical context and receipt migration', () => {
  it('links a counter sale to the tenant-scoped clinical episode', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    const normalized = sql.replace(/\s+/g, ' ');

    expect(normalized).toContain('ALTER TABLE counter_sales ADD COLUMN IF NOT EXISTS patient_id UUID');
    expect(normalized).toContain('ADD COLUMN IF NOT EXISTS encounter_id UUID');
    expect(normalized).toContain('ADD COLUMN IF NOT EXISTS queue_entry_id TEXT');
    expect(normalized).toContain('ADD COLUMN IF NOT EXISTS billing_record_id TEXT');
    expect(normalized).toContain('FOREIGN KEY (account_id, patient_id)');
    expect(normalized).toContain('FOREIGN KEY (account_id, encounter_id)');
    expect(normalized).toContain('FOREIGN KEY (account_id, queue_entry_id)');
    expect(normalized).toContain('FOREIGN KEY (account_id, billing_record_id)');
    expect(normalized).toContain('counter_sales_clinical_context_consistency');
    expect(normalized).toContain('counter_sales_encounter_requires_patient_chk');
    expect(normalized).toContain('SET search_path = pg_catalog, public, app, pg_temp');
    expect(normalized).toContain('conname = \'counter_sales_account_patient_fk\'');
  });

  it('creates an append-only, tenant-isolated receipt with one receipt per sale', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    const normalized = sql.replace(/\s+/g, ' ');

    expect(normalized).toContain('CREATE TABLE IF NOT EXISTS counter_sale_receipts');
    expect(normalized).toContain('UNIQUE (account_id, counter_sale_id)');
    expect(normalized).toContain('ALTER TABLE counter_sale_receipts ENABLE ROW LEVEL SECURITY');
    expect(normalized).toContain('ALTER TABLE counter_sale_receipts FORCE ROW LEVEL SECURITY');
    expect(normalized).toContain('counter_sale_receipts_tenant_isolation');
    expect(normalized).toContain('guard_counter_sale_receipt_immutability');
    expect(normalized).toContain('BEFORE UPDATE OR DELETE ON counter_sale_receipts');
    expect(normalized).toContain('counter_sale_receipts_account_sale_fk');
  });
});
