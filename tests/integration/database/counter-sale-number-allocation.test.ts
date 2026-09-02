import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabaseClient } from '../../../packages/shared/database/src/index.js';
import {
  CounterSalesService
} from '../../../packages/modules/counter-sales/src/index.js';
import { DatabaseCounterSalesRepository } from '../../../packages/modules/counter-sales/src/repositories/database-counter-sales.repository.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_A = randomUUID() as AccountId;
const ACCOUNT_B = randomUUID() as AccountId;
const USER_A = randomUUID() as UserId;
const USER_B = randomUUID() as UserId;

function tenantContext(accountId: AccountId, correlationId: string) {
  return { tenantId: TENANT_ID, accountId, correlationId };
}

async function asAccount<T>(
  accountId: AccountId,
  correlationId: string,
  operation: () => Promise<T>
): Promise<T> {
  return runWithTenantContext(tenantContext(accountId, correlationId), operation);
}

describe('counter-sale number allocation on PostgreSQL', () => {
  const pool = getTestPool();

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Counter allocation tenant', 'active', now())`,
      [TENANT_ID, `counter-allocation-${TENANT_ID.slice(0, 8)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $3, $4, 'Counter allocation account A'),
              ($2, $3, $5, 'Counter allocation account B')`,
      [
        ACCOUNT_A,
        ACCOUNT_B,
        TENANT_ID,
        `counter-allocation-a-${ACCOUNT_A.slice(0, 8)}`,
        `counter-allocation-b-${ACCOUNT_B.slice(0, 8)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $3, $4, $5, 'hash', 'Counter allocation operator A'),
              ($2, $6, $7, $8, 'hash', 'Counter allocation operator B')`,
      [
        USER_A,
        USER_B,
        ACCOUNT_A,
        `counter-allocation-a-${USER_A.slice(0, 8)}`,
        `counter-allocation-a-${USER_A.slice(0, 8)}@example.test`,
        ACCOUNT_B,
        `counter-allocation-b-${USER_B.slice(0, 8)}`,
        `counter-allocation-b-${USER_B.slice(0, 8)}@example.test`
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM counter_sales WHERE account_id IN ($1, $2)', [
      ACCOUNT_A,
      ACCOUNT_B
    ]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [USER_A, USER_B]);
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_A, ACCOUNT_B]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
  });

  it('serializes two repository instances and keeps numbering local to each account', async () => {
    const serviceA = new CounterSalesService({
      repository: new DatabaseCounterSalesRepository()
    });
    const serviceB = new CounterSalesService({
      repository: new DatabaseCounterSalesRepository()
    });

    const [saleA, saleB] = await Promise.all([
      asAccount(ACCOUNT_A, 'counter-allocation-a-1', () => serviceA.open(ACCOUNT_A, USER_A)),
      asAccount(ACCOUNT_A, 'counter-allocation-a-2', () => serviceB.open(ACCOUNT_A, USER_A))
    ]);

    expect([saleA.number, saleB.number].sort()).toEqual(['CS-000001', 'CS-000002']);

    const accountBSale = await asAccount(ACCOUNT_B, 'counter-allocation-b-1', () =>
      new CounterSalesService({
        repository: new DatabaseCounterSalesRepository()
      }).open(ACCOUNT_B, USER_B)
    );
    expect(accountBSale.number).toBe('CS-000001');

    const persisted = await pool.query<{ readonly number: string; readonly account_id: string }>(
      `SELECT number, account_id
         FROM counter_sales
        WHERE account_id IN ($1, $2)
        ORDER BY account_id, number`,
      [ACCOUNT_A, ACCOUNT_B]
    );
    const expectedRows = [
      { account_id: ACCOUNT_A, number: 'CS-000001' },
      { account_id: ACCOUNT_A, number: 'CS-000002' },
      { account_id: ACCOUNT_B, number: 'CS-000001' }
    ].sort((left, right) =>
      left.account_id === right.account_id
        ? left.number.localeCompare(right.number)
        : left.account_id.localeCompare(right.account_id)
    );
    expect(persisted.rows).toEqual(expectedRows);
  });
});
