import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createDatabaseClient,
  createTenantUnitOfWork,
  getPool,
  getTenantTransactionContext,
  withTenantTransaction,
  type TenantTransactionContext
} from '../../../packages/shared/database/src/index.js';
import { createApiRuntime } from '../../../apps/api/src/runtime.js';
import {
  CounterSalesService,
  type CounterSaleCancellationExecution,
  type CounterSaleCancellationTransactionInput
} from '../../../packages/modules/counter-sales/src/index.js';
import {
  DatabaseCounterSalesRepository,
  type CounterSaleRecord
} from '../../../packages/modules/counter-sales/src/repositories/database-counter-sales.repository.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

const TENANT_ID = randomUUID();
const ACCOUNT_A = randomUUID() as AccountId;
const ACCOUNT_B = randomUUID() as AccountId;
const USER_A = randomUUID() as UserId;
const USER_B = randomUUID() as UserId;

function tenantContext(accountId: AccountId, correlationId = randomUUID()) {
  return { tenantId: TENANT_ID, accountId, correlationId };
}

async function asAccount<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> {
  return runWithTenantContext(tenantContext(accountId), operation);
}

function createSale(accountId: AccountId, userId: UserId, id = randomUUID()): CounterSaleRecord {
  const now = new Date().toISOString();
  return {
    id,
    accountId,
    number: `CS-${id.slice(0, 8)}`,
    ownerId: null,
    patientId: null,
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
    openedByUserId: userId,
    closedByUserId: null,
    closedAt: null,
    createdAt: now,
    updatedAt: now
  };
}

function createTransactionalCancellation(failAfterAudit = false, keySuffix = '') {
  const unitOfWork = createTenantUnitOfWork(getPool());
  return async function cancelTransaction(
    input: CounterSaleCancellationTransactionInput,
    execute: () => Promise<CounterSaleCancellationExecution>
  ): Promise<CounterSaleCancellationExecution> {
    const appendAudit = async (
      transaction: TenantTransactionContext
    ): Promise<CounterSaleCancellationExecution> => {
      const execution = await execute();
      if (execution.transitioned) {
        await transaction.audit.append({
          entityType: 'counter-sale',
          entityId: execution.sale.id,
          action: 'cancelled',
          before: { ...execution.before },
          after: { ...execution.sale },
          metadata: { module: 'counter-sales', riskLevel: 'high' },
          reason: input.reason
        });
      }
      if (failAfterAudit) throw new Error('simulated audit failure');
      return execution;
    };

    const ambient = getTenantTransactionContext();
    if (ambient) return appendAudit(ambient);

    const result = await unitOfWork.execute(
      {
        accountId: input.sale.accountId,
        actorUserId: input.cancelledByUserId,
        correlationId: input.correlationId,
        operation: 'counter_sale.cancel',
        idempotencyKey: `counter-sale-cancel:${input.sale.id}${keySuffix ? `:${keySuffix}` : ''}`
      },
      {
        accountId: input.sale.accountId,
        saleId: input.sale.id,
        reason: input.reason
      },
      async (transaction) => appendAudit(transaction)
    );
    return result.value as unknown as CounterSaleCancellationExecution;
  };
}

describe('counter-sale cancellation history on PostgreSQL', () => {
  const pool = getTestPool();
  const repository = new DatabaseCounterSalesRepository();

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Counter cancellation tenant', 'active', now())`,
      [TENANT_ID, `counter-cancel-${TENANT_ID.slice(0, 8)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $3, $4, 'Counter cancellation account A'),
              ($2, $3, $5, 'Counter cancellation account B')`,
      [
        ACCOUNT_A,
        ACCOUNT_B,
        TENANT_ID,
        `counter-cancel-a-${ACCOUNT_A.slice(0, 8)}`,
        `counter-cancel-b-${ACCOUNT_B.slice(0, 8)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $3, $4, $5, 'hash', 'Cancellation operator A'),
              ($2, $6, $7, $8, 'hash', 'Cancellation operator B')`,
      [
        USER_A,
        USER_B,
        ACCOUNT_A,
        `cancel-a-${USER_A.slice(0, 8)}`,
        `cancel-a-${USER_A.slice(0, 8)}@example.test`,
        ACCOUNT_B,
        `cancel-b-${USER_B.slice(0, 8)}`,
        `cancel-b-${USER_B.slice(0, 8)}@example.test`
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM audit_events WHERE account_id IN ($1, $2)', [
      ACCOUNT_A,
      ACCOUNT_B
    ]);
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_A, ACCOUNT_B]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
  });

  it('persists one actor/reason/before-after audit event atomically and reads it by tenant', async () => {
    const sale = createSale(ACCOUNT_A, USER_A);
    await asAccount(ACCOUNT_A, () => repository.create(sale));
    const service = new CounterSalesService({
      repository,
      cancelTransaction: createTransactionalCancellation()
    });
    await asAccount(ACCOUNT_A, () => service.hydrateFromDatabase(ACCOUNT_A));

    const cancelled = await asAccount(ACCOUNT_A, () =>
      service.cancel(sale.id, {
        accountId: ACCOUNT_A,
        cancelledByUserId: USER_A,
        reason: 'Cliente desistiu da compra',
        correlationId: 'corr-cancel-postgres-1'
      })
    );

    expect(cancelled.status).toBe('cancelled');
    const state = await pool.query(
      `SELECT status FROM counter_sales WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_A, sale.id]
    );
    expect(state.rows[0]?.status).toBe('cancelled');

    const audit = await pool.query(
      `SELECT account_id, actor_user_id, entity_type, entity_id, action, reason,
              correlation_id, before_json->>'status' AS before_status,
              after_json->>'status' AS after_status
         FROM audit_events
        WHERE account_id = $1 AND entity_type = 'counter-sale' AND entity_id = $2
          AND action = 'cancelled'`,
      [ACCOUNT_A, sale.id]
    );
    expect(audit.rows).toEqual([
      {
        account_id: ACCOUNT_A,
        actor_user_id: USER_A,
        entity_type: 'counter-sale',
        entity_id: sale.id,
        action: 'cancelled',
        reason: 'Cliente desistiu da compra',
        correlation_id: 'corr-cancel-postgres-1',
        before_status: 'open',
        after_status: 'cancelled'
      }
    ]);

    const history = await asAccount(ACCOUNT_A, () =>
      service.listCancellationHistory(ACCOUNT_A, sale.id)
    );
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      accountId: ACCOUNT_A,
      counterSaleId: sale.id,
      cancelledByUserId: USER_A,
      reason: 'Cliente desistiu da compra',
      correlationId: 'corr-cancel-postgres-1'
    });
    await expect(
      asAccount(ACCOUNT_B, () => service.listCancellationHistory(ACCOUNT_B, sale.id))
    ).rejects.toThrow(/not found|account/i);
  });

  it('rolls back both status and audit when the audit boundary fails', async () => {
    const sale = createSale(ACCOUNT_A, USER_A);
    await asAccount(ACCOUNT_A, () => repository.create(sale));
    const service = new CounterSalesService({
      repository,
      cancelTransaction: createTransactionalCancellation(true)
    });
    await asAccount(ACCOUNT_A, () => service.hydrateFromDatabase(ACCOUNT_A));

    await expect(
      asAccount(ACCOUNT_A, () =>
        service.cancel(sale.id, {
          accountId: ACCOUNT_A,
          cancelledByUserId: USER_A,
          reason: 'Falha controlada de auditoria',
          correlationId: 'corr-cancel-postgres-rollback'
        })
      )
    ).rejects.toThrow('simulated audit failure');

    const state = await pool.query(
      `SELECT status FROM counter_sales WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_A, sale.id]
    );
    const audits = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM audit_events
        WHERE account_id = $1 AND entity_type = 'counter-sale' AND entity_id = $2
          AND action = 'cancelled'`,
      [ACCOUNT_A, sale.id]
    );
    expect(state.rows[0]?.status).toBe('open');
    expect(audits.rows[0]?.count).toBe(0);
  });

  it('uses the runtime tenant transaction fallback when idempotency UoW is unavailable', async () => {
    const sale = createSale(ACCOUNT_A, USER_A);
    await asAccount(ACCOUNT_A, () => repository.create(sale));
    const runtime = createApiRuntime({
      authSecret: 'counter-sale-test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3600,
      repositories: { counterSales: repository },
      tenantTransaction: async <T>(
        accountId: string,
        command: () => Promise<T>,
        metadata?: { readonly actorUserId: string; readonly correlationId: string }
      ) => withTenantTransaction(accountId, command, metadata)
    });
    await asAccount(ACCOUNT_A, () => runtime.counterSales.hydrateFromDatabase(ACCOUNT_A));

    const cancelled = await asAccount(ACCOUNT_A, () =>
      runtime.counterSales.cancel(sale.id, {
        accountId: ACCOUNT_A,
        cancelledByUserId: USER_A,
        reason: 'Fallback transacional do runtime',
        correlationId: 'corr-cancel-runtime-fallback'
      })
    );

    expect(cancelled.status).toBe('cancelled');
    const audit = await pool.query(
      `SELECT actor_user_id, reason, correlation_id
         FROM audit_events
        WHERE account_id = $1 AND entity_type = 'counter-sale' AND entity_id = $2
          AND action = 'cancelled'`,
      [ACCOUNT_A, sale.id]
    );
    expect(audit.rows).toEqual([
      {
        actor_user_id: USER_A,
        reason: 'Fallback transacional do runtime',
        correlation_id: 'corr-cancel-runtime-fallback'
      }
    ]);
  });

  it('allows concurrent cancellation attempts to produce one durable event', async () => {
    const sale = createSale(ACCOUNT_A, USER_A);
    await asAccount(ACCOUNT_A, () => repository.create(sale));
    const serviceA = new CounterSalesService({
      repository,
      cancelTransaction: createTransactionalCancellation(false, 'a')
    });
    const serviceB = new CounterSalesService({
      repository,
      cancelTransaction: createTransactionalCancellation(false, 'b')
    });
    await Promise.all([
      asAccount(ACCOUNT_A, () => serviceA.hydrateFromDatabase(ACCOUNT_A)),
      asAccount(ACCOUNT_A, () => serviceB.hydrateFromDatabase(ACCOUNT_A))
    ]);

    const results = await Promise.all([
      asAccount(ACCOUNT_A, () =>
        serviceA.cancel(sale.id, {
          accountId: ACCOUNT_A,
          cancelledByUserId: USER_A,
          reason: 'Cancelamento concorrente A',
          correlationId: 'corr-cancel-concurrent-a'
        })
      ),
      asAccount(ACCOUNT_A, () =>
        serviceB.cancel(sale.id, {
          accountId: ACCOUNT_A,
          cancelledByUserId: USER_A,
          reason: 'Cancelamento concorrente B',
          correlationId: 'corr-cancel-concurrent-b'
        })
      )
    ]);

    expect(results.every((result) => result.status === 'cancelled')).toBe(true);
    const audits = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM audit_events
        WHERE account_id = $1 AND entity_type = 'counter-sale' AND entity_id = $2
          AND action = 'cancelled'`,
      [ACCOUNT_A, sale.id]
    );
    expect(audits.rows[0]?.count).toBe(1);
  });

  it('keeps cancellation audit history isolated under the restricted RLS role', async () => {
    const eventId = randomUUID();
    const saleId = randomUUID();
    await pool.query(
      `INSERT INTO audit_events
        (id, account_id, actor_user_id, entity_type, entity_id, action,
         correlation_id, occurred_at, reason, created_at)
       VALUES ($1, $2, $3, 'counter-sale', $4, 'cancelled', $5, now(), $6, now())`,
      [eventId, ACCOUNT_A, USER_A, saleId, 'corr-cancel-rls', 'RLS isolation proof']
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_A);
      const accountA = await client.query(
        `SELECT id FROM audit_events
          WHERE entity_type = 'counter-sale' AND entity_id = $1 AND action = 'cancelled'`,
        [saleId]
      );
      await setAccountContext(client, ACCOUNT_B);
      const accountB = await client.query(
        `SELECT id FROM audit_events
          WHERE entity_type = 'counter-sale' AND entity_id = $1 AND action = 'cancelled'`,
        [saleId]
      );

      expect(accountA.rows.map((row) => row.id)).toEqual([eventId]);
      expect(accountB.rows).toEqual([]);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
