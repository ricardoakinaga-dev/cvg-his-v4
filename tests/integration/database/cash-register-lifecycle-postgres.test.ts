import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CashService, DatabaseCashRepository } from '../../../packages/modules/cash/src/index.js';
import {
  createDatabaseClient,
  getPool,
  runInTenantTransactionContext
} from '../../../packages/shared/database/src/index.js';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID() as AccountId;
const FOREIGN_ACCOUNT_ID = randomUUID() as AccountId;
const USER_ID = randomUUID() as UserId;
const FOREIGN_USER_ID = randomUUID() as UserId;

describe('cash register lifecycle persistence on PostgreSQL', () => {
  const pool = getTestPool();

  async function command<T>(
    accountId: AccountId,
    userId: UserId,
    operation: () => Promise<T> | T
  ): Promise<T> {
    const correlationId = `cash-lifecycle-${randomUUID()}`;
    return runWithTenantContext(
      { tenantId: TENANT_ID, accountId, correlationId },
      () =>
        runInTenantTransactionContext(
          getPool(),
          { accountId, actorUserId: userId, correlationId },
          async () => operation()
        )
    );
  }

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Cash lifecycle tenant', 'active', now())`,
      [TENANT_ID, `cash-lifecycle-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Cash lifecycle account', true),
              ($4, $2, $5, 'Foreign cash lifecycle account', true)`,
      [
        ACCOUNT_ID,
        TENANT_ID,
        `cash-lifecycle-${ACCOUNT_ID.slice(0, 12)}`,
        FOREIGN_ACCOUNT_ID,
        `cash-lifecycle-f-${FOREIGN_ACCOUNT_ID.slice(0, 10)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Cash operator'),
              ($5, $6, $7, $8, 'test-hash', 'Foreign cash operator')`,
      [
        USER_ID,
        ACCOUNT_ID,
        `cash-${USER_ID}`,
        `cash-${USER_ID}@example.test`,
        FOREIGN_USER_ID,
        FOREIGN_ACCOUNT_ID,
        `cash-${FOREIGN_USER_ID}`,
        `cash-${FOREIGN_USER_ID}@example.test`
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_ID, FOREIGN_ACCOUNT_ID]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
  });

  it('persists opening, supply, withdrawal, deposit, close and reconciliation atomically', async () => {
    const cash = new CashService({ repository: new DatabaseCashRepository() });
    const register = await command(ACCOUNT_ID, USER_ID, () =>
      cash.openRegister(ACCOUNT_ID, USER_ID, { openingAmount: 100, notes: 'Turno manhã' })
    );
    await command(ACCOUNT_ID, USER_ID, () =>
      cash.recordMovement(
        register.id,
        ACCOUNT_ID,
        { movementType: 'supply', amount: 50, reference: 'SUP-001' },
        USER_ID
      )
    );
    await command(ACCOUNT_ID, USER_ID, () =>
      cash.recordMovement(
        register.id,
        ACCOUNT_ID,
        { movementType: 'withdrawal', amount: 20, reference: 'SANG-001' },
        USER_ID
      )
    );
    await command(ACCOUNT_ID, USER_ID, () =>
      cash.recordMovement(
        register.id,
        ACCOUNT_ID,
        { movementType: 'deposit', amount: 30, reference: 'DEP-001' },
        USER_ID
      )
    );
    const closed = await command(ACCOUNT_ID, USER_ID, () =>
      cash.closeRegister(register.id, USER_ID, { closingAmount: 100, notes: 'Conferido' })
    );

    expect(closed.difference).toBe(0);
    expect(closed.register.status).toBe('closed');

    const reconciliation = await command(ACCOUNT_ID, USER_ID, () =>
      cash.getReconciliation(register.id, ACCOUNT_ID)
    );
    expect(reconciliation).toMatchObject({
      status: 'closed',
      openingAmount: 100,
      expectedAmount: 100,
      declaredAmount: 100,
      difference: 0,
      totalIn: 150,
      totalOut: 50,
      movementCount: 5
    });

    const persisted = await pool.query(
      `SELECT r.status, r.closing_amount, r.expected_closing_amount, r.difference,
              COUNT(m.id)::int AS movement_count
         FROM cash_registers r
         JOIN cash_movements m ON m.account_id = r.account_id AND m.cash_register_id = r.id
        WHERE r.account_id = $1 AND r.id = $2
        GROUP BY r.id`,
      [ACCOUNT_ID, register.id]
    );
    expect(persisted.rows).toEqual([
      {
        status: 'closed',
        closing_amount: '100.00',
        expected_closing_amount: '100.00',
        difference: '0.00',
        movement_count: 5
      }
    ]);

    const foreignRows = await runWithTenantContext(
      { tenantId: TENANT_ID, accountId: FOREIGN_ACCOUNT_ID, correlationId: `cash-foreign-${randomUUID()}` },
      () => new DatabaseCashRepository().findRegistersByAccount(FOREIGN_ACCOUNT_ID)
    );
    expect(foreignRows).toEqual([]);
  });
});
