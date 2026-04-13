import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';

import {
  checkRlsEnabled,
  getRlsSummary,
  setSessionAccountId,
  verifyCrossTenantIsolation,
  withTenantContext
} from './rls.js';

function createMockClient() {
  return {
    query: vi.fn(),
    release: vi.fn()
  } as unknown as PoolClient & {
    query: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };
}

function createMockPool(client: PoolClient) {
  return {
    connect: vi.fn().mockResolvedValue(client)
  } as unknown as Pool & {
    connect: ReturnType<typeof vi.fn>;
  };
}

describe('rls helpers', () => {
  it('sets the current account id in the postgres session', async () => {
    const client = createMockClient();
    client.query.mockResolvedValue({ rows: [] });

    await setSessionAccountId(client, 'account-1');

    expect(client.query).toHaveBeenCalledWith(
      "SELECT set_config('app.current_account_id', $1, true)",
      ['account-1']
    );
  });

  it('wraps a callback in transaction-scoped tenant context', async () => {
    const client = createMockClient();
    const pool = createMockPool(client);
    client.query.mockResolvedValue({ rows: [] });

    const result = await withTenantContext(pool, 'account-2', async () => 'ok');

    expect(result).toBe('ok');
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      "SELECT set_config('app.current_account_id', $1, true)",
      ['account-2']
    );
    expect(client.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back the transaction when the tenant-scoped callback fails', async () => {
    const client = createMockClient();
    const pool = createMockPool(client);
    client.query.mockResolvedValue({ rows: [] });

    await expect(
      withTenantContext(pool, 'account-3', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      "SELECT set_config('app.current_account_id', $1, true)",
      ['account-3']
    );
    expect(client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('reports whether row-level security is enabled for a table', async () => {
    const client = createMockClient();
    client.query.mockResolvedValue({ rows: [{ rowsecurity: true }] });

    await expect(checkRlsEnabled(client, 'owners')).resolves.toBe(true);
    expect(client.query).toHaveBeenCalledWith(
      "SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = $1",
      ['owners']
    );
  });

  it('summarizes RLS coverage across the public schema', async () => {
    const client = createMockClient();
    client.query
      .mockResolvedValueOnce({
        rows: [{ total_tables: '12', rls_enabled: '9', rls_disabled: '3' }]
      })
      .mockResolvedValueOnce({
        rows: [{ tables_with_policies: '8' }]
      });

    await expect(getRlsSummary(client)).resolves.toEqual({
      totalTables: 12,
      rlsEnabled: 9,
      rlsDisabled: 3,
      tablesWithPolicies: 8
    });
  });

  it('detects cross-tenant visibility attempts through tenant-scoped reads', async () => {
    const client = createMockClient();
    const pool = createMockPool(client);
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      verifyCrossTenantIsolation(pool, 'owners', 'account-a', 'account-b')
    ).resolves.toEqual({
      accountASeesB: true,
      accountBSeesA: false
    });
  });
});
