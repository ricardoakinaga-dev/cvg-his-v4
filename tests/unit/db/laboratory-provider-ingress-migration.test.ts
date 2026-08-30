import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0154_laboratory_provider_ingress.sql'),
  'utf8'
);

describe('laboratory provider ingress migration', () => {
  it('preserves the tenant ledger and adds immutable signed-ingress facts', () => {
    expect(migration).toMatch(/ALTER TABLE laboratory_result_imports/i);
    expect(migration).toMatch(/provider_code VARCHAR\(64\) NOT NULL/i);
    expect(migration).toMatch(/schema_version VARCHAR\(32\) NOT NULL/i);
    expect(migration).toMatch(/signature_key_id VARCHAR\(128\) NOT NULL/i);
    expect(migration).toMatch(/payload_fingerprint VARCHAR\(64\) NOT NULL/i);
    expect(migration).toMatch(/observed_at TIMESTAMPTZ/i);
    expect(migration).toMatch(/pending_human_review/i);
    expect(migration).toMatch(/payload_fingerprint ~ '\^\[0-9a-f\]\{64\}\$'/i);
    expect(migration).toMatch(/laboratory_result_imports_account_provider_time/i);
    expect(migration).toMatch(/laboratory\.results\.write/i);
    expect(migration).toMatch(/guard_laboratory_provider_ingress_immutability/i);
    expect(migration).toMatch(/BEFORE UPDATE ON laboratory_result_imports/i);
    expect(migration).toMatch(/Laboratory provider ingress facts are immutable/i);
    expect(migration).toMatch(/SET search_path = pg_catalog, public, app, pg_temp/i);
    expect(migration).not.toMatch(/DROP TABLE/i);
  });

  it('defines a durable workflow ledger whose provider facts cannot be removed', () => {
    expect(migration).toMatch(/BEFORE UPDATE ON laboratory_result_imports/i);
    expect(migration).toMatch(/imported_at IS DISTINCT FROM OLD\.imported_at/i);
    expect(migration).toMatch(/result_summary IS DISTINCT FROM OLD\.result_summary/i);
  });
});
