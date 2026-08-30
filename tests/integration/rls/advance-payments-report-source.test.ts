import { randomUUID } from 'node:crypto';

import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseAdvancePaymentsReportRepository } from '../../../apps/api/src/repositories/database-advance-payments-report.repository.js';
import {
  closeDatabaseClient,
  createDatabaseClient,
  createTenantUnitOfWork,
  getPool
} from '@cvg-his-v2/shared-database';
import { AppError, ConflictError } from '@cvg-his-v2/shared-errors';
import { DatabaseAdvancePaymentsReportSource } from '@cvg-his-v2/module-financial';

import { TEST_DB_URL } from '../../setup/env.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

describe('advance-payment report source RLS and ledger contract', () => {
  let pool: Pool;
  let adminClient: PoolClient;
  const tenantId = randomUUID();
  const accountA = randomUUID();
  const accountB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const paymentA = randomUUID();
  const paymentB = randomUUID();
  const paymentAtDateTo = randomUUID();
  const paymentWithUnsafeAmount = randomUUID();
  const allocationA = randomUUID();
  const createdPaymentIds: string[] = [];
  const writeIdempotencyKeys: string[] = [];
  const writeOperations: string[] = [];

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DB_URL });
    adminClient = await pool.connect();
    await createDatabaseClient(TEST_DB_URL);

    await adminClient.query(
      `INSERT INTO tenants (id, slug, name, status)
       VALUES ($1, $2, 'Advance payment RLS tenant', 'active')`,
      [tenantId, `advance-payment-${tenantId}`]
    );
    await adminClient.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $3, $4, 'Advance payment account A'),
              ($2, $3, $5, 'Advance payment account B')`,
      [
        accountA,
        accountB,
        tenantId,
        `advance-payment-a-${accountA}`,
        `advance-payment-b-${accountB}`
      ]
    );
    await adminClient.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $3, $5, $7, 'hash', 'Advance payment user A'),
              ($2, $4, $6, $8, 'hash', 'Advance payment user B')`,
      [
        userA,
        userB,
        accountA,
        accountB,
        `advance-payment-user-a-${userA}`,
        `advance-payment-user-b-${userB}`,
        `advance-payment-user-a-${userA}@example.com`,
        `advance-payment-user-b-${userB}@example.com`
      ]
    );
    await adminClient.query(
      `INSERT INTO owners (id, account_id, full_name, document)
       VALUES ($1, $3, 'Advance payment owner A', '111.111.111-11'),
              ($2, $4, 'Advance payment owner B', '222.222.222-22')`,
      [ownerA, ownerB, accountA, accountB]
    );
    await adminClient.query(
      `INSERT INTO advance_payments
         (id, account_id, owner_id, amount_cents, source_type, source_id, created_by_user_id, issued_at)
       VALUES ($1, $3, $5, 25000, 'cash_receipt', 'receipt-a', $7, '2026-05-10T12:00:00Z'),
              ($2, $4, $6, 9000, 'cash_receipt', 'receipt-b', $8, '2026-05-11T12:00:00Z')`,
      [paymentA, paymentB, accountA, accountB, ownerA, ownerB, userA, userB]
    );
    await adminClient.query(
      `INSERT INTO advance_payments
         (id, account_id, owner_id, amount_cents, source_type, source_id, created_by_user_id, issued_at)
       VALUES ($1, $2, $3, $4, 'cash_receipt', 'receipt-unsafe-amount', $5, '2026-06-10T12:00:00Z')`,
      [paymentWithUnsafeAmount, accountA, ownerA, '9007199254740992', userA]
    );
    await adminClient.query(
      `INSERT INTO advance_payments
         (id, account_id, owner_id, amount_cents, source_type, source_id, created_by_user_id, issued_at)
       VALUES ($1, $2, $3, 12000, 'cash_receipt', 'receipt-date-to', $4, '2026-05-31T23:59:59.999Z')`,
      [paymentAtDateTo, accountA, ownerA, userA]
    );
    await adminClient.query(
      `INSERT INTO advance_payment_allocations
         (id, account_id, advance_payment_id, amount_cents, created_by_user_id, allocated_at)
       VALUES ($1, $2, $3, 10000, $4, '2026-05-12T12:00:00Z')`,
      [allocationA, accountA, paymentA, userA]
    );
  });

  afterAll(async () => {
    // The fixture is disposable, but the ledger triggers intentionally protect
    // even administrative sessions. Disable only those triggers for teardown,
    // then always restore them before releasing the connection.
    await adminClient.query(
      'ALTER TABLE advance_payment_allocations DISABLE TRIGGER advance_payment_allocations_immutability_trigger'
    );
    await adminClient.query(
      'ALTER TABLE advance_payments DISABLE TRIGGER advance_payments_immutability_trigger'
    );
    try {
      if (createdPaymentIds.length > 0) {
        await adminClient.query(
          'DELETE FROM advance_payment_allocations WHERE advance_payment_id = ANY($1::uuid[])',
          [createdPaymentIds]
        );
      }
      if (writeIdempotencyKeys.length > 0) {
        await adminClient.query(
          `DELETE FROM idempotency_requests
            WHERE account_id = $1 AND idempotency_key = ANY($2::text[])`,
          [accountA, writeIdempotencyKeys]
        );
      }
      await adminClient.query(
        `DELETE FROM outbox_events
          WHERE account_id = $1 AND correlation_id LIKE $2`,
        [accountA, `advance-write-${tenantId}-%`]
      );
      await adminClient.query(
        `DELETE FROM audit_events
          WHERE account_id = $1 AND correlation_id LIKE $2`,
        [accountA, `advance-write-${tenantId}-%`]
      );
      if (createdPaymentIds.length > 0) {
        await adminClient.query('DELETE FROM advance_payments WHERE id = ANY($1::uuid[])', [
          createdPaymentIds
        ]);
      }
      if (writeOperations.length > 0) {
        await adminClient.query(
          `DELETE FROM idempotency_requests
            WHERE account_id = $1 AND operation = ANY($2::text[])`,
          [accountA, writeOperations]
        );
      }
      await adminClient.query('DELETE FROM advance_payment_allocations WHERE id = $1', [
        allocationA
      ]);
      await adminClient.query('DELETE FROM advance_payments WHERE id = ANY($1::uuid[])', [
        [paymentA, paymentB, paymentAtDateTo, paymentWithUnsafeAmount]
      ]);
      await adminClient.query('DELETE FROM owners WHERE id = ANY($1::uuid[])', [[ownerA, ownerB]]);
      await adminClient.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[userA, userB]]);
      await adminClient.query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [
        [accountA, accountB]
      ]);
      await adminClient.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    } finally {
      await adminClient.query(
        'ALTER TABLE advance_payments ENABLE TRIGGER advance_payments_immutability_trigger'
      );
      await adminClient.query(
        'ALTER TABLE advance_payment_allocations ENABLE TRIGGER advance_payment_allocations_immutability_trigger'
      );
    }
    adminClient.release();
    await pool.end();
    await closeDatabaseClient();
  });

  it('exposes only persisted balances and applies account/date/search filters', async () => {
    const repository = new DatabaseAdvancePaymentsReportRepository();
    const rows = await repository.list(accountA, {
      search: 'owner A',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      status: 'partially_compensated'
    });

    expect(rows).toEqual([
      {
        paymentId: paymentA,
        ownerName: 'Advance payment owner A',
        documentId: '111.111.111-11',
        issuedAt: '2026-05-10T12:00:00.000Z',
        originalAmount: 250,
        compensatedAmount: 100,
        balance: 150,
        origin: 'cash_receipt',
        status: 'partially_compensated',
        notes: ''
      }
    ]);
  });

  it('fails closed when a persisted bigint amount cannot be represented exactly as cents', async () => {
    const repository = new DatabaseAdvancePaymentsReportRepository();

    await expect(
      repository.listSummaries(accountA, {
        dateFrom: '2026-06-01',
        dateTo: '2026-06-30'
      })
    ).rejects.toMatchObject<AppError>({
      code: 'ADVANCE_PAYMENT_UNSAFE_AMOUNT',
      statusCode: 500
    });
  });

  it('includes timestamps through the inclusive dateTo boundary', async () => {
    const repository = new DatabaseAdvancePaymentsReportRepository();

    await expect(
      repository.list(accountA, {
        search: 'owner A',
        dateFrom: '2026-05-31',
        dateTo: '2026-05-31',
        status: 'available'
      })
    ).resolves.toEqual([
      {
        paymentId: paymentAtDateTo,
        ownerName: 'Advance payment owner A',
        documentId: '111.111.111-11',
        issuedAt: '2026-05-31T23:59:59.999Z',
        originalAmount: 120,
        compensatedAmount: 0,
        balance: 120,
        origin: 'cash_receipt',
        status: 'available',
        notes: ''
      }
    ]);
  });

  it('executes the canonical source through a NOBYPASSRLS connection', async () => {
    const restrictedUrl = new URL(TEST_DB_URL);
    restrictedUrl.searchParams.set('options', '-c role=cvg_test_rls');
    const restrictedPool = new Pool({ connectionString: restrictedUrl.toString(), max: 1 });

    try {
      const source = new DatabaseAdvancePaymentsReportSource(restrictedPool);
      await expect(
        source.list(accountA, {
          search: 'owner A',
          dateFrom: '2026-05-01',
          dateTo: '2026-05-31',
          status: 'partially_compensated'
        })
      ).resolves.toEqual([
        {
          paymentId: paymentA,
          ownerName: 'Advance payment owner A',
          documentId: '111.111.111-11',
          issuedAt: '2026-05-10T12:00:00.000Z',
          originalAmount: 250,
          compensatedAmount: 100,
          balance: 150,
          origin: 'cash_receipt',
          status: 'partially_compensated',
          notes: ''
        }
      ]);
    } finally {
      await restrictedPool.end();
    }
  });

  it('forces tenant RLS on both append-only source tables', async () => {
    const metadata = await adminClient.query<{
      readonly tablename: string;
      readonly rowsecurity: boolean;
      readonly relforcerowsecurity: boolean;
    }>(
      `SELECT c.relname AS tablename,
              c.relrowsecurity AS rowsecurity,
              c.relforcerowsecurity
         FROM pg_class AS c
         JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = ANY($1::text[])
        ORDER BY c.relname`,
      [['advance_payment_allocations', 'advance_payments']]
    );

    expect(metadata.rows).toEqual([
      {
        tablename: 'advance_payment_allocations',
        rowsecurity: true,
        relforcerowsecurity: true
      },
      { tablename: 'advance_payments', rowsecurity: true, relforcerowsecurity: true }
    ]);

    const policies = await adminClient.query<{
      readonly tablename: string;
      readonly policyname: string;
    }>(
      `SELECT tablename, policyname
         FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = ANY($1::text[])
        ORDER BY tablename, policyname`,
      [['advance_payment_allocations', 'advance_payments']]
    );
    expect(policies.rows.map((row) => row.policyname)).toEqual([
      'advance_payment_allocations_tenant_insert',
      'advance_payment_allocations_tenant_select',
      'advance_payments_tenant_insert',
      'advance_payments_tenant_select'
    ]);
  });

  it('rejects an allocation that would make the derived balance negative', async () => {
    await expect(
      adminClient.query(
        `INSERT INTO advance_payment_allocations
           (id, account_id, advance_payment_id, amount_cents, created_by_user_id)
         VALUES ($1, $2, $3, 15001, $4)`,
        [randomUUID(), accountA, paymentA, userA]
      )
    ).rejects.toThrow(/allocation exceeds original amount/iu);
  });

  it('rejects updates and deletes of the advance-payment ledger facts', async () => {
    await expect(
      adminClient.query('UPDATE advance_payments SET notes = $1 WHERE id = $2', [
        'attempted mutation',
        paymentA
      ])
    ).rejects.toThrow(/advance payment facts are immutable/iu);

    await expect(
      adminClient.query('UPDATE advance_payment_allocations SET notes = $1 WHERE id = $2', [
        'attempted mutation',
        allocationA
      ])
    ).rejects.toThrow(/advance payment allocation facts are immutable/iu);

    await expect(
      adminClient.query('DELETE FROM advance_payment_allocations WHERE id = $1', [allocationA])
    ).rejects.toThrow(/append-only and cannot be deleted/iu);

    await expect(
      adminClient.query('DELETE FROM advance_payments WHERE id = $1', [paymentA])
    ).rejects.toThrow(/append-only and cannot be deleted/iu);
  });

  it('issues and compensates through the tenant UoW with replay, derived balance, audit and outbox', async () => {
    const repository = new DatabaseAdvancePaymentsReportRepository();
    const unitOfWork = createTenantUnitOfWork(getPool());
    const issueKey = `advance-issue-${randomUUID()}`;
    const compensateKey = `advance-compensate-${randomUUID()}`;
    const issueOperation = `finance.advance-payment.issue.${randomUUID()}`;
    const compensateOperation = `finance.advance-payment.compensate.${randomUUID()}`;
    writeIdempotencyKeys.push(issueKey, compensateKey);
    writeOperations.push(issueOperation, compensateOperation);

    const issuePayload = {
      ownerId: ownerA,
      amountCents: 18000,
      sourceType: 'manual',
      sourceId: 'receipt-write-001',
      reference: 'Caixa 1'
    } as const;
    const issueContext = {
      accountId: accountA,
      actorUserId: userA,
      correlationId: `advance-write-${tenantId}-issue`,
      operation: issueOperation,
      idempotencyKey: issueKey
    };

    const issued = await unitOfWork.execute(issueContext, issuePayload, async () =>
      repository.create({
        accountId: accountA,
        actorUserId: userA,
        ownerId: ownerA,
        amountCents: 18000,
        sourceType: 'manual',
        sourceId: 'receipt-write-001',
        reference: 'Caixa 1',
        idempotencyKey: issueKey
      })
    );
    createdPaymentIds.push(issued.value.id);

    const replay = await unitOfWork.execute(
      issueContext,
      {
        reference: 'Caixa 1',
        sourceId: 'receipt-write-001',
        sourceType: 'manual',
        ownerId: ownerA,
        amountCents: 18000
      },
      async () => {
        throw new Error('idempotent issue command executed twice');
      }
    );
    expect(replay).toEqual({ value: issued.value, replayed: true });

    const compensated = await unitOfWork.execute(
      {
        accountId: accountA,
        actorUserId: userA,
        correlationId: `advance-write-${tenantId}-compensate`,
        operation: compensateOperation,
        idempotencyKey: compensateKey
      },
      { advancePaymentId: issued.value.id, amountCents: 5000, reference: 'billing-001' },
      async () =>
        repository.allocate({
          accountId: accountA,
          actorUserId: userA,
          advancePaymentId: issued.value.id,
          amountCents: 5000,
          reference: 'billing-001',
          idempotencyKey: compensateKey
        })
    );

    expect(issued.value).toMatchObject({
      ownerId: ownerA,
      amountCents: 18000,
      compensatedAmountCents: 0,
      balanceCents: 18000,
      status: 'available',
      currency: 'BRL',
      sourceType: 'manual'
    });
    expect(compensated.value).toMatchObject({
      id: issued.value.id,
      compensatedAmountCents: 5000,
      balanceCents: 13000,
      status: 'partially_compensated'
    });

    const overAllocationKey = `advance-over-${randomUUID()}`;
    const overAllocationOperation = `finance.advance-payment.compensate.${randomUUID()}`;
    writeIdempotencyKeys.push(overAllocationKey);
    writeOperations.push(overAllocationOperation);
    await expect(
      unitOfWork.execute(
        {
          accountId: accountA,
          actorUserId: userA,
          correlationId: `advance-write-${tenantId}-over`,
          operation: overAllocationOperation,
          idempotencyKey: overAllocationKey
        },
        { advancePaymentId: issued.value.id, amountCents: 14001, reference: 'billing-over' },
        async () =>
          repository.allocate({
            accountId: accountA,
            actorUserId: userA,
            advancePaymentId: issued.value.id,
            amountCents: 14001,
            reference: 'billing-over',
            idempotencyKey: overAllocationKey
          })
      )
    ).rejects.toBeInstanceOf(ConflictError);

    const summaries = await repository.listSummaries(accountA, {
      search: 'owner A',
      status: 'partially_compensated'
    });
    expect(summaries).toContainEqual(compensated.value);

    const durableEvents = await adminClient.query<{
      readonly action: string;
      readonly event_type: string | null;
    }>(
      `SELECT audit.action, outbox.event_type
         FROM audit_events AS audit
         LEFT JOIN outbox_events AS outbox
           ON outbox.correlation_id = audit.correlation_id
        WHERE audit.account_id = $1
          AND audit.correlation_id LIKE $2
        ORDER BY audit.occurred_at ASC`,
      [accountA, `advance-write-${tenantId}-%`]
    );
    expect(durableEvents.rows).toEqual([
      { action: 'advance_payment_issued', event_type: 'finance.advance-payment.issued.v1' },
      {
        action: 'advance_payment_compensated',
        event_type: 'finance.advance-payment.compensated.v1'
      }
    ]);
  });

  it('hides another account and rejects cross-account writes under the restricted role', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, accountA);

      const visiblePayments = await client.query<{ readonly id: string }>(
        `SELECT id::text FROM advance_payments
          WHERE id = ANY($1::uuid[]) ORDER BY id`,
        [[paymentA, paymentB]]
      );
      const visibleAllocations = await client.query<{ readonly id: string }>(
        `SELECT id::text FROM advance_payment_allocations
          WHERE id = $1`,
        [allocationA]
      );

      expect(visiblePayments.rows).toEqual([{ id: paymentA }]);
      expect(visibleAllocations.rows).toEqual([{ id: allocationA }]);

      await client.query('SAVEPOINT cross_account_payment_insert');
      await expect(
        client.query(
          `INSERT INTO advance_payments
             (id, account_id, owner_id, amount_cents, source_type, source_id, created_by_user_id)
           VALUES ($1, $2, $3, 1000, 'cash_receipt', 'cross-account', $4)`,
          [randomUUID(), accountB, ownerB, userB]
        )
      ).rejects.toThrow(/row-level security policy/iu);
      await client.query('ROLLBACK TO SAVEPOINT cross_account_payment_insert');

      await client.query('SAVEPOINT cross_account_allocation_insert');
      await expect(
        client.query(
          `INSERT INTO advance_payment_allocations
             (id, account_id, advance_payment_id, amount_cents, created_by_user_id)
           VALUES ($1, $2, $3, 1000, $4)`,
          [randomUUID(), accountB, paymentB, userB]
        )
      ).rejects.toThrow(/row-level security policy/iu);
      await client.query('ROLLBACK TO SAVEPOINT cross_account_allocation_insert');
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});
