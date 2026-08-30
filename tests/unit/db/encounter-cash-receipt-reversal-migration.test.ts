import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0150_encounter_cash_receipt_reversals.sql'),
  'utf8'
);

describe('encounter cash receipt reversal migration', () => {
  it('creates a tenant-owned append-only compensation graph with forced RLS', () => {
    const normalized = migration.replace(/\s+/g, ' ');

    expect(normalized).toContain('CREATE TABLE encounter_cash_receipt_reversals');
    expect(normalized).toContain('UNIQUE (account_id, receipt_id)');
    expect(migration).toContain(
      'FOREIGN KEY (account_id, receipt_id)\n    REFERENCES encounter_cash_receipts(account_id, id)'
    );
    expect(migration).toContain(
      'FOREIGN KEY (account_id, reversal_cash_movement_id)\n    REFERENCES cash_movements(account_id, id)'
    );
    expect(migration).toContain(
      'ALTER TABLE encounter_cash_receipt_reversals ENABLE ROW LEVEL SECURITY'
    );
    expect(migration).toContain(
      'ALTER TABLE encounter_cash_receipt_reversals FORCE ROW LEVEL SECURITY'
    );
    expect(migration).toContain('encounter_cash_receipt_reversals_tenant_isolation');
    expect(migration).toContain('guard_encounter_cash_receipt_reversal_immutability');
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON encounter_cash_receipt_reversals');
    expect(migration).toContain('guard_encounter_cash_receipt_reversal_artifacts');
    expect(migration).toContain(
      'CREATE TRIGGER encounter_cash_receipt_reversal_movement_guard_trigger'
    );
    expect(migration).toContain(
      'CREATE TRIGGER encounter_cash_receipt_reversal_journal_line_guard_trigger'
    );
    expect(migration).toContain('BEFORE INSERT OR UPDATE OR DELETE ON financial_journal_lines');
    expect(migration).toContain('SET search_path = pg_catalog, public, app, pg_temp');
  });

  it('retains original proof, adds inverse consistency and permits only an active replacement', () => {
    expect(migration).toContain('cash_movements_account_register_fk');
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION app.assert_encounter_cash_receipt_consistent'
    );
    expect(migration).toContain('reversal_journal_totals.clinical_revenue_debit = reversal.amount');
    expect(migration).toContain('reversal_journal_totals.cash_credit = reversal.amount');
    expect(migration).toContain('reversal.reversed_at >= receipt.received_at');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('replacement_reversal');
    expect(migration).toContain(
      'CREATE CONSTRAINT TRIGGER encounter_cash_receipt_reversals_consistency_trigger'
    );
    expect(migration).toContain(
      'CREATE CONSTRAINT TRIGGER encounter_cash_receipts_active_unique_trigger'
    );
    expect(migration).toContain(
      'CREATE CONSTRAINT TRIGGER encounter_cash_receipt_reversals_register_recheck_trigger'
    );
  });
});
