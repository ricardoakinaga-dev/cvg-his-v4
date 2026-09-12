import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { withTenantQueryExplicit } from './tenant-db.js';

function createPoolDouble(verificationMatches: boolean) {
  const queries: string[] = [];
  const query = vi.fn(async (text: string) => {
    queries.push(text);
    if (text.includes("current_setting('app.current_account_id'")) {
      return { rows: [{ matches: verificationMatches }] };
    }
    return { rows: [] };
  });
  const release = vi.fn();
  const client = { query, release } as unknown as PoolClient;
  const pool = { connect: vi.fn(async () => client) } as unknown as Pool;
  return { pool, client, query, release, queries };
}

describe('tenant-scoped query helper', () => {
  it('verifies the database session tenant before invoking the callback', async () => {
    const { pool, query, release } = createPoolDouble(true);
    const callback = vi.fn(async () => 'ok');

    await expect(withTenantQueryExplicit(pool, 'account-a', callback)).resolves.toBe('ok');
    expect(callback).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledWith(
      "SELECT current_setting('app.current_account_id', true) = $1 AS matches",
      ['account-a']
    );
    expect(release).toHaveBeenCalledOnce();
  });

  it('fails closed when PostgreSQL does not confirm the tenant session', async () => {
    const { pool, release, queries } = createPoolDouble(false);
    const callback = vi.fn(async () => 'must-not-run');

    await expect(withTenantQueryExplicit(pool, 'account-a', callback)).rejects.toThrow(
      'Failed to establish tenant database context'
    );
    expect(callback).not.toHaveBeenCalled();
    expect(queries).toContain('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });
});
