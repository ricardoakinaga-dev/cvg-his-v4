import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0133_counter_sales_authority.sql'),
  'utf8'
);

describe('counter-sale payment authority migration', () => {
  it('adds tenant-scoped payment idempotency without storing the opaque key', () => {
    const normalized = migration.replace(/\s+/g, ' ');

    expect(normalized).toContain(
      'ADD COLUMN IF NOT EXISTS idempotency_key_hash CHAR(64)'
    );
    expect(normalized).toContain(
      'counter_sale_payments_account_idempotency_unique'
    );
    expect(normalized).toContain('idempotency_key_hash ~');
  });

  it('fails closed on catalog and transfer references that cross account boundaries', () => {
    expect(migration).toContain('assert_counter_sale_item_catalog_tenant');
    expect(migration).toContain('Counter sale catalog item is missing or belongs to another tenant');
    expect(migration).toContain('scheduling_queue_transfers_account_counter_sale_fk');
    expect(migration).toContain('scheduling_queue_transfers_account_queue_entry_fk');
    expect(migration).toContain('missing or belongs to another tenant');
  });
});
