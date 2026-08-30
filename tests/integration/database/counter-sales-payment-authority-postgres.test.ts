import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabaseClient, getPool } from '../../../packages/shared/database/src/index.js';
import type {
  CounterSaleItemRecord,
  CounterSaleRecord,
  CounterSalePaymentRecord
} from '../../../packages/modules/counter-sales/src/repositories/database-counter-sales.repository.js';
import { CounterSalesService } from '../../../packages/modules/counter-sales/src/index.js';
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
const OWNER_A = randomUUID();
const OWNER_B = randomUUID();
const PATIENT_A = randomUUID();
const PATIENT_B = randomUUID();

function tenantContext(accountId: AccountId, correlationId = randomUUID()) {
  return { tenantId: TENANT_ID, accountId, correlationId };
}

async function asAccount<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> {
  return runWithTenantContext(tenantContext(accountId), operation);
}

async function createSale(
  repository: DatabaseCounterSalesRepository,
  accountId: AccountId,
  userId: UserId,
  id = randomUUID(),
  total = 100
): Promise<{ sale: CounterSaleRecord; item: CounterSaleItemRecord }> {
  const now = new Date().toISOString();
  const sale: CounterSaleRecord = {
    id,
    accountId,
    number: `CS-${id.slice(0, 8)}`,
    ownerId: null,
    patientId: null,
    encounterId: null,
    queueEntryId: null,
    billingRecordId: null,
    status: 'open',
    subtotal: total,
    discountAmount: 0,
    total,
    paidAmount: 0,
    balanceDue: total,
    notes: null,
    openedByUserId: userId,
    closedByUserId: null,
    closedAt: null,
    createdAt: now,
    updatedAt: now
  };
  const item: CounterSaleItemRecord = {
    id: randomUUID(),
    counterSaleId: sale.id,
    accountId,
    itemType: 'service',
    catalogItemId: null,
    nameSnapshot: 'Consulta autoritativa',
    codeSnapshot: null,
    unitPrice: total,
    quantity: 1,
    discountAmount: 0,
    lineTotal: total,
    notes: null,
    createdAt: now,
    updatedAt: now
  };

  await asAccount(accountId, () => repository.create(sale));
  await asAccount(accountId, () => repository.createItem(item));
  return { sale, item };
}

function payment(
  sale: CounterSaleRecord,
  amount: number,
  idempotencyKey?: string
): CounterSalePaymentRecord {
  return {
    id: randomUUID(),
    counterSaleId: sale.id,
    accountId: sale.accountId,
    method: 'pix',
    amount,
    installments: 1,
    reference: null,
    notes: null,
    createdAt: new Date().toISOString(),
    ...(idempotencyKey ? { idempotencyKey } : {})
  } as CounterSalePaymentRecord;
}

describe('counter-sale payment authority on PostgreSQL', () => {
  const pool = getTestPool();
  const repository = new DatabaseCounterSalesRepository();

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Counter sale authority tenant', 'active', now())`,
      [TENANT_ID, `counter-sale-authority-${TENANT_ID.slice(0, 8)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $3, $4, 'Counter sale account A'),
              ($2, $3, $5, 'Counter sale account B')`,
      [
        ACCOUNT_A,
        ACCOUNT_B,
        TENANT_ID,
        `counter-sale-a-${ACCOUNT_A.slice(0, 8)}`,
        `counter-sale-b-${ACCOUNT_B.slice(0, 8)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $3, $4, $5, 'hash', 'Counter sale A operator'),
              ($2, $6, $7, $8, 'hash', 'Counter sale B operator')`,
      [
        USER_A,
        USER_B,
        ACCOUNT_A,
        `counter-sale-a-${USER_A.slice(0, 8)}`,
        `counter-sale-a-${USER_A.slice(0, 8)}@example.test`,
        ACCOUNT_B,
        `counter-sale-b-${USER_B.slice(0, 8)}`,
        `counter-sale-b-${USER_B.slice(0, 8)}@example.test`
      ]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name)
       VALUES ($1, $3, 'Counter sale owner A'), ($2, $4, 'Counter sale owner B')`,
      [OWNER_A, OWNER_B, ACCOUNT_A, ACCOUNT_B]
    );
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species)
       VALUES ($1, $3, $5, 'Counter sale patient A', 'canine'),
              ($2, $4, $6, 'Counter sale patient B', 'feline')`,
      [PATIENT_A, PATIENT_B, ACCOUNT_A, ACCOUNT_B, OWNER_A, OWNER_B]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_A, ACCOUNT_B]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
  });

  it('reads a bounded cancelled-sales snapshot with SQL period and tenant filters', async () => {
    const firstInPeriod = await createSale(repository, ACCOUNT_A, USER_A, randomUUID(), 100);
    const lastMomentInPeriod = await createSale(repository, ACCOUNT_A, USER_A, randomUUID(), 125);
    const outsidePeriod = await createSale(repository, ACCOUNT_A, USER_A, randomUUID(), 150);
    const foreignAccount = await createSale(repository, ACCOUNT_B, USER_B, randomUUID(), 175);

    await pool.query(
      `UPDATE counter_sales
          SET status = 'cancelled', created_at = $3, updated_at = $4
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_A, firstInPeriod.sale.id, '2026-05-01T00:00:00.000Z', '2026-05-01T00:01:00.000Z']
    );
    await pool.query(
      `UPDATE counter_sales
          SET status = 'cancelled', created_at = $3, updated_at = $4
        WHERE account_id = $1 AND id = $2`,
      [
        ACCOUNT_A,
        lastMomentInPeriod.sale.id,
        '2026-05-31T23:59:59.999Z',
        '2026-05-31T23:59:59.999Z'
      ]
    );
    await pool.query(
      `UPDATE counter_sales
          SET status = 'cancelled', created_at = $3, updated_at = $4
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_A, outsidePeriod.sale.id, '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z']
    );
    await pool.query(
      `UPDATE counter_sales
          SET status = 'cancelled', created_at = $3, updated_at = $4
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_B, foreignAccount.sale.id, '2026-05-15T00:00:00.000Z', '2026-05-15T00:00:00.000Z']
    );

    const service = new CounterSalesService({ repository });
    const rows = await asAccount(ACCOUNT_A, () =>
      service.listPersisted(ACCOUNT_A, {
        status: 'cancelled',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      })
    );

    expect(rows.map((row) => row.id)).toEqual([lastMomentInPeriod.sale.id, firstInPeriod.sale.id]);
    expect(rows.every((row) => row.accountId === ACCOUNT_A && row.status === 'cancelled')).toBe(
      true
    );
  });

  it('recomputes total from committed items and rejects the concurrent excess payment', async () => {
    const { sale } = await createSale(repository, ACCOUNT_A, USER_A, randomUUID(), 100);
    await pool.query(
      `UPDATE counter_sales
          SET subtotal = 0, total = 0, balance_due = 0
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_A, sale.id]
    );

    const authoritativePayment = payment(sale, 100, 'payment-authority-001');
    const first = asAccount(ACCOUNT_A, () => repository.recordPayment!(authoritativePayment));
    const second = asAccount(ACCOUNT_A, () =>
      repository.recordPayment!(payment(sale, 100, 'payment-authority-002'))
    );
    const results = await Promise.allSettled([first, second]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const state = await pool.query(
      `SELECT total::float8 AS total, paid_amount::float8 AS paid_amount,
              balance_due::float8 AS balance_due,
              (SELECT COUNT(*)::int FROM counter_sale_payments payment
                WHERE payment.account_id = sale.account_id
                  AND payment.counter_sale_id = sale.id) AS payments
         FROM counter_sales sale
        WHERE sale.account_id = $1 AND sale.id = $2`,
      [ACCOUNT_A, sale.id]
    );
    expect(state.rows[0]).toEqual({ total: 100, paid_amount: 100, balance_due: 0, payments: 1 });
  });

  it('replays the same payment idempotently and rejects a changed payload', async () => {
    const { sale } = await createSale(repository, ACCOUNT_A, USER_A, randomUUID(), 50);
    const firstPayment = payment(sale, 50, 'payment-retry-001');
    const first = await asAccount(ACCOUNT_A, () => repository.recordPayment!(firstPayment));
    const replay = await asAccount(ACCOUNT_A, () =>
      repository.recordPayment!({ ...firstPayment, id: randomUUID() })
    );

    expect(replay.payment.id).toBe(first.payment.id);
    expect(replay.sale.paidAmount).toBe(50);
    await expect(
      asAccount(ACCOUNT_A, () =>
        repository.recordPayment!({ ...firstPayment, id: randomUUID(), amount: 49 })
      )
    ).rejects.toThrow(/idempotency|different|payload/i);

    const count = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM counter_sale_payments
        WHERE account_id = $1 AND counter_sale_id = $2`,
      [ACCOUNT_A, sale.id]
    );
    expect(count.rows[0]?.count).toBe(1);
  });

  it('rejects a clinical counter-sale reference owned by another account', async () => {
    const now = new Date().toISOString();
    const sale: CounterSaleRecord = {
      id: randomUUID(),
      accountId: ACCOUNT_A,
      number: `CS-CROSS-${randomUUID().slice(0, 8)}`,
      ownerId: null,
      patientId: PATIENT_B,
      encounterId: null,
      queueEntryId: null,
      billingRecordId: null,
      status: 'open',
      subtotal: 0,
      discountAmount: 0,
      total: 0,
      paidAmount: 0,
      balanceDue: 0,
      notes: null,
      openedByUserId: USER_A,
      closedByUserId: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now
    };

    await expect(asAccount(ACCOUNT_A, () => repository.create(sale))).rejects.toThrow();
  });
});
