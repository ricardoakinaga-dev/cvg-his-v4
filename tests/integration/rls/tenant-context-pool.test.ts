import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';

import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import { TEST_DB_URL } from '../../setup/env.js';
import { activateRlsRole } from '../../helpers/rls-helpers.js';

const ACCOUNT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ACCOUNT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
const OWNER_A = '91111111-1111-4111-8111-111111111111';
const OWNER_B = '92222222-2222-4222-8222-222222222222';

describe('tenant context on a reused PostgreSQL pool connection', () => {
  let adminPool: Pool;
  let runtimePool: Pool;

  beforeAll(async () => {
    adminPool = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    runtimePool = new Pool({ connectionString: TEST_DB_URL, max: 1 });

    await adminPool.query(
      `INSERT INTO tenants (id, slug, name, status)
       VALUES ($1, 'pool-test-tenant', 'Pool Test Tenant', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [DEFAULT_TENANT]
    );
    await adminPool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $3, 'pool-account-a', 'Pool Account A'),
              ($2, $3, 'pool-account-b', 'Pool Account B')
       ON CONFLICT (id) DO NOTHING`,
      [ACCOUNT_A, ACCOUNT_B, DEFAULT_TENANT]
    );
    await adminPool.query(
      `INSERT INTO owners (id, account_id, full_name)
       VALUES ($1, $3, 'Pool Owner A'), ($2, $4, 'Pool Owner B')
       ON CONFLICT (id) DO NOTHING`,
      [OWNER_A, OWNER_B, ACCOUNT_A, ACCOUNT_B]
    );
  });

  afterAll(async () => {
    await runtimePool.end();
    await adminPool.end();
  });

  async function listVisibleOwners(accountId: string): Promise<readonly string[]> {
    return withTenantQueryExplicit(runtimePool, accountId, async (client) => {
      await activateRlsRole(client);
      const result = await client.query<{ id: string }>(
        'SELECT id FROM owners WHERE id = ANY($1::uuid[]) ORDER BY id',
        [[OWNER_A, OWNER_B]]
      );
      return result.rows.map((row) => row.id);
    });
  }

  it('alternates tenants on one connection without retaining transaction-local context', async () => {
    expect(await listVisibleOwners(ACCOUNT_A)).toEqual([OWNER_A]);

    const contextAfterCommit = await runtimePool.query<{ account_id: string | null }>(
      "SELECT NULLIF(current_setting('app.current_account_id', true), '') AS account_id"
    );
    expect(contextAfterCommit.rows[0]?.account_id).toBeNull();

    expect(await listVisibleOwners(ACCOUNT_B)).toEqual([OWNER_B]);
    expect(await listVisibleOwners(ACCOUNT_A)).toEqual([OWNER_A]);
  });

  it('clears tenant context after rollback and does not leak data into the next checkout', async () => {
    await expect(
      withTenantQueryExplicit(runtimePool, ACCOUNT_A, async (client) => {
        await activateRlsRole(client);
        const result = await client.query('SELECT id FROM owners ORDER BY id');
        expect(result.rows.map((row) => row.id)).toContain(OWNER_A);
        throw new Error('forced rollback');
      })
    ).rejects.toThrow('forced rollback');

    const contextAfterRollback = await runtimePool.query<{ account_id: string | null }>(
      "SELECT NULLIF(current_setting('app.current_account_id', true), '') AS account_id"
    );
    expect(contextAfterRollback.rows[0]?.account_id).toBeNull();
    expect(await listVisibleOwners(ACCOUNT_B)).toEqual([OWNER_B]);
  });
});
