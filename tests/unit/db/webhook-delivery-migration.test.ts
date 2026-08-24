import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'packages/db/migrations/0125_webhook_delivery_leases.sql'
);

describe('durable webhook delivery migration contract', () => {
  it('promotes both webhook tables to forced tenant RLS', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('ALTER TABLE webhooks FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;');
    expect(sql).toContain('webhook_deliveries_claim_idx');
  });

  it('preserves legacy attempt history before enforcing the new invariant', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('SET max_attempts = GREATEST(max_attempts, attempts)');
    expect(sql).toContain("status IN ('pending', 'processing', 'retrying', 'delivered', 'failed')");
    expect(sql).toContain('webhook_deliveries_lease_state_check');
  });
});
