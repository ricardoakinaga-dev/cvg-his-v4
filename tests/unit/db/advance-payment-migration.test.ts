import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('advance-payment canonical migration', () => {
  it('declares immutable minor-unit tables with tenant ownership and RLS', async () => {
    const sql = await readFile(
      resolve(process.cwd(), 'packages/db/migrations/0148_advance_payments.sql'),
      'utf8'
    );

    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS advance_payments/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS advance_payment_allocations/i);
    expect(sql).toMatch(/amount_cents\s+bigint\s+NOT NULL/i);
    expect(sql).toMatch(/currency\s+varchar\(3\).*'BRL'/is);
    expect(sql).toMatch(/advance_payment_allocations_account_payment_fk/i);
    expect(sql).toMatch(/advance_payment_allocations_account_idempotency_unique/i);
    expect(sql).toMatch(/prevent_advance_payment_overallocation/i);
    expect(sql).toMatch(/allocation exceeds original amount/i);
    expect(sql).toMatch(/guard_advance_payment_immutability/i);
    expect(sql).toMatch(/advance_payments_immutability_trigger/i);
    expect(sql).toMatch(/advance_payment_allocations_immutability_trigger/i);
    expect(sql).toMatch(/advance payments are append-only and cannot be deleted/i);
    expect(sql).toMatch(/advance payment facts are immutable/i);
    expect(sql).toMatch(/ALTER TABLE advance_payments ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/ALTER TABLE advance_payments FORCE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/ALTER TABLE advance_payment_allocations ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/ALTER TABLE advance_payment_allocations FORCE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/CREATE POLICY advance_payments_tenant_select/i);
    expect(sql).toMatch(/CREATE POLICY advance_payments_tenant_insert/i);
    expect(sql).toMatch(/CREATE POLICY advance_payment_allocations_tenant_select/i);
    expect(sql).toMatch(/CREATE POLICY advance_payment_allocations_tenant_insert/i);
    expect(sql).not.toMatch(/DROP TABLE/i);
  });
});
