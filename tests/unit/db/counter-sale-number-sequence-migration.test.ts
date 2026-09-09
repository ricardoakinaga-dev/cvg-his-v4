import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0162_counter_sale_number_sequences.sql'),
  'utf8'
);

describe('counter-sale number sequence migration', () => {
  it('fails closed before seeding when a legacy sale number is malformed or oversized', () => {
    expect(migration).toMatch(/number IS NULL/);
    expect(migration).toMatch(/number ~ '\^CS-\[0-9\]\+\$'/);
    expect(migration).toMatch(/SUBSTRING\(number FROM 4\)::numeric > 9007199254740991/);
    expect(migration).toMatch(/RAISE EXCEPTION[\s\S]*malformed or oversized legacy number/);
    expect(migration).not.toMatch(/WHEN number ~ '\^CS-\[0-9\]\+\$' THEN[\s\S]*ELSE 0/);
  });

  it('seeds only the canonical numeric suffix and keeps tenant-local RLS', () => {
    expect(migration).toMatch(/MAX\(\s*SUBSTRING\(number FROM 4\)::numeric\s*\)/);
    expect(migration).toContain(
      'ALTER TABLE counter_sale_number_sequences ENABLE ROW LEVEL SECURITY;'
    );
    expect(migration).toContain(
      'ALTER TABLE counter_sale_number_sequences FORCE ROW LEVEL SECURITY;'
    );
    expect(migration).toContain('account_id = app.current_account_id()');
  });
});
