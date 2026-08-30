import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DatabaseInventoryRepository,
  InventoryService
} from '../../../packages/modules/inventory/src/index.js';
import { createDatabaseClient } from '../../../packages/shared/database/src/index.js';
import type { AccountId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_A = randomUUID() as AccountId;
const ACCOUNT_B = randomUUID() as AccountId;
const ITEM_A_ALPHA = `inventory-report-alpha-${randomUUID()}`;
const ITEM_A_ZULU = `inventory-report-zulu-${randomUUID()}`;
const ITEM_A_OUTSIDE = `inventory-report-outside-${randomUUID()}`;
const ITEM_B_FOREIGN = `inventory-report-foreign-${randomUUID()}`;

describe('inventory-products persisted report source on PostgreSQL', () => {
  const pool = getTestPool();
  let inventory: InventoryService;

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Inventory products report tenant', 'active', now())`,
      [TENANT_ID, `inventory-products-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $3, $4, 'Inventory products account A', true),
              ($2, $3, $5, 'Inventory products account B', true)`,
      [
        ACCOUNT_A,
        ACCOUNT_B,
        TENANT_ID,
        `inventory-products-a-${ACCOUNT_A.slice(0, 12)}`,
        `inventory-products-b-${ACCOUNT_B.slice(0, 12)}`
      ]
    );
    await pool.query(
      `INSERT INTO inventory_items (
         id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
         unit_cost_amount, created_at, updated_at
       ) VALUES
         ($1, $5, 'MED-A-001', 'Zeta Med', 'un', 8, 2, 12.50, '2026-05-31T23:59:59.000Z', '2026-06-01T00:00:00.000Z'),
         ($2, $5, 'MED-A-002', 'Alpha Med', 'un', 4, 5, 8.25, '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
         ($3, $5, 'MED-A-003', 'Outside Med', 'un', 1, 1, 3.10, '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z'),
         ($4, $6, 'MED-B-001', 'Foreign Med', 'un', 9, 2, 4.40, '2026-05-10T00:00:00.000Z', '2026-05-10T00:00:00.000Z')`,
      [ITEM_A_ZULU, ITEM_A_ALPHA, ITEM_A_OUTSIDE, ITEM_B_FOREIGN, ACCOUNT_A, ACCOUNT_B]
    );

    inventory = new InventoryService({ getOrThrow() {} } as never, [], {
      repository: new DatabaseInventoryRepository()
    });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_A, ACCOUNT_B]);
  });

  it('filters by account, inclusive createdAt period, literal search and deterministic name order', async () => {
    const items = await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        correlationId: `inventory-products-report-${randomUUID()}`
      },
      () =>
        inventory.listPersistedItems(ACCOUNT_A, {
          search: 'med-a',
          dateFrom: '2026-05-01',
          dateTo: '2026-05-31',
          limit: 10_001
        })
    );

    expect(items.map((item) => item.name)).toEqual(['Alpha Med', 'Zeta Med']);
    expect(items.every((item) => item.accountId === ACCOUNT_A)).toBe(true);
    expect(items[1]?.createdAt).toBe('2026-05-31T23:59:59.000Z');

    const escapedWildcard = await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        correlationId: `inventory-products-report-wildcard-${randomUUID()}`
      },
      () => inventory.listPersistedItems(ACCOUNT_A, { search: 'MED-%', limit: 10_001 })
    );
    expect(escapedWildcard).toEqual([]);
  });

  it('does not cross account context and enforces the source read limit', async () => {
    const accountBItems = await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_B,
        correlationId: `inventory-products-report-account-b-${randomUUID()}`
      },
      () => inventory.listPersistedItems(ACCOUNT_B, { limit: 1 })
    );
    expect(accountBItems).toHaveLength(1);
    expect(accountBItems[0]?.sku).toBe('MED-B-001');

    await expect(
      runWithTenantContext(
        {
          tenantId: TENANT_ID,
          accountId: ACCOUNT_A,
          correlationId: `inventory-products-report-cross-account-${randomUUID()}`
        },
        () => inventory.listPersistedItems(ACCOUNT_B, { limit: 10_001 })
      )
    ).rejects.toThrow(/does not match tenant context/);

    await expect(
      runWithTenantContext(
        {
          tenantId: TENANT_ID,
          accountId: ACCOUNT_A,
          correlationId: `inventory-products-report-invalid-limit-${randomUUID()}`
        },
        () => inventory.listPersistedItems(ACCOUNT_A, { limit: 10_002 })
      )
    ).rejects.toThrow(/between 1 and 10001/);
  });

  it('returns the real source overflow sentinel of 10001 rows for API rejection', async () => {
    const overflowPrefix = `OVR${randomUUID().slice(0, 8)}`;
    await pool.query(
      `INSERT INTO inventory_items (
         id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
         unit_cost_amount, created_at, updated_at
       )
       SELECT 'inventory-report-overflow-' || $1 || '-' || sequence::text,
              $2,
              $1 || '-' || lpad(sequence::text, 5, '0'),
              'Overflow Product ' || lpad(sequence::text, 5, '0'),
              'un', 1, 1, 1,
              '2026-05-15T00:00:00.000Z',
              '2026-05-15T00:00:00.000Z'
         FROM generate_series(1, 10001) AS generated(sequence)`,
      [overflowPrefix, ACCOUNT_A]
    );

    try {
      const items = await runWithTenantContext(
        {
          tenantId: TENANT_ID,
          accountId: ACCOUNT_A,
          correlationId: `inventory-products-report-overflow-${randomUUID()}`
        },
        () => inventory.listPersistedItems(ACCOUNT_A, { search: overflowPrefix, limit: 10_001 })
      );

      expect(items).toHaveLength(10_001);
      expect(items[0]?.sku).toBe(`${overflowPrefix}-00001`);
      expect(items.at(-1)?.sku).toBe(`${overflowPrefix}-10001`);
    } finally {
      await pool.query('DELETE FROM inventory_items WHERE account_id = $1 AND sku LIKE $2', [
        ACCOUNT_A,
        `${overflowPrefix}%`
      ]);
    }
  });
});
