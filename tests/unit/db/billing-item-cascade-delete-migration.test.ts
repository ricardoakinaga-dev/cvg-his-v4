import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0164_allow_billing_item_cascade_delete.sql'),
  'utf8'
);

describe('billing item cascade delete migration', () => {
  it('allows only the cascade delete path to proceed after the parent is gone', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION app.guard_reserved_billing_item_mutation()'
    );
    expect(migration).toMatch(/IF NOT FOUND THEN\s+IF TG_OP = 'DELETE' THEN\s+RETURN OLD;/);
    expect(migration).toContain("MESSAGE = 'PIX_PAYMENT_RESERVATION_BILLING_MISMATCH'");
    expect(migration).toContain("MESSAGE = 'BILLING_PAYMENT_RESERVED'");
  });
});
