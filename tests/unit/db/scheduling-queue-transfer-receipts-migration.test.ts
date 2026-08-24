import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0128_scheduling_queue_transfer_receipts.sql'),
  'utf8'
);

describe('scheduling queue transfer receipt migration', () => {
  it('backfills explicit sent/received state without guessing duplicate pending handoffs', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS status TEXT');
    expect(migration).toContain("received_at IS NULL THEN 'sent'");
    expect(migration).toContain('RAISE EXCEPTION');
    expect(migration).toContain('scheduling_queue_transfers_one_pending_per_entry');
  });

  it('keeps the receipt state constrained and tenant isolated', () => {
    const normalized = migration.replace(/\s+/g, ' ');
    expect(normalized).toContain("CHECK ( status IN ('sent', 'received')");
    expect(migration).toContain('ALTER TABLE scheduling_queue_transfers ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('received_by_user_id IS NOT NULL');
  });

  it('proves every clinical and financial transfer reference belongs to the same tenant', () => {
    expect(migration).toContain('scheduling_queue_transfers_account_queue_entry_fk');
    expect(migration).toContain('scheduling_queue_transfers_account_encounter_fk');
    expect(migration).toContain('scheduling_queue_transfers_account_billing_record_fk');
    expect(migration).toContain('scheduling_queue_transfers_account_counter_sale_fk');
    expect(migration).toContain('ALTER COLUMN encounter_id TYPE UUID');
    expect(migration).toContain('ALTER COLUMN counter_sale_id TYPE UUID');
    expect(migration).toContain('missing or belongs to another tenant');
  });
});
