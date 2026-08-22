import { randomUUID } from 'node:crypto';

import type { Pool } from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';

import { EncounterCashReceiptCommand } from '../../../apps/api/src/commands/encounter-cash-receipt.js';
import { DatabaseEncounterCashReceiptRepository } from '../../../apps/api/src/encounter-cash-receipt-repository.js';
import { assertEncounterHasNoCashReceipt } from '../../../apps/api/src/routes/encounter-cash-receipt-routes.js';
import { DatabaseCashRepository } from '../../../packages/modules/cash/src/index.js';
import {
  createTenantUnitOfWork,
  type JsonValue
} from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import { getTestPool } from '../../db/db-admin.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const AMOUNT = 125.5;

interface Fixture {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly billingRecordId: string;
  readonly cashRegisterId: string;
  readonly encounterId: string;
}

async function createFixture(pool: Pool): Promise<Fixture> {
  const accountId = randomUUID();
  const actorUserId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const cashRegisterId = randomUUID();
  const billingRecordId = `cash-billing-${randomUUID()}`;
  const suffix = accountId.replaceAll('-', '');

  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Cash receipt command account')`,
    [accountId, TENANT_ID, `cash-command-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'Cash receipt command operator')`,
    [actorUserId, accountId, `cash_command_${suffix}`, `cash-command-${suffix}@example.com`]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Cash receipt command owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Cash receipt command patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (
       id, account_id, patient_id, owner_id, status, opened_by_user_id, closed_by_user_id, closed_at
     ) VALUES ($1, $2, $3, $4, 'closed', $5, $5, clock_timestamp())`,
    [encounterId, accountId, patientId, ownerId, actorUserId]
  );
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, 'open', $6, 'BRL')`,
    [billingRecordId, accountId, encounterId, patientId, ownerId, AMOUNT]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type, description,
       quantity, unit_price_amount, total_amount, created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'service', 'Consulta', 1, $5, $5, $6)`,
    [`cash-item-${randomUUID()}`, accountId, billingRecordId, encounterId, AMOUNT, actorUserId]
  );
  await pool.query(
    `INSERT INTO cash_registers (
       id, account_id, opened_by_user_id, opening_amount, status
     ) VALUES ($1, $2, $3, 50, 'open')`,
    [cashRegisterId, accountId, actorUserId]
  );

  return { accountId, actorUserId, billingRecordId, cashRegisterId, encounterId };
}

function context(fixture: Fixture, idempotencyKey: string) {
  return {
    accountId: fixture.accountId,
    actorUserId: fixture.actorUserId,
    correlationId: randomUUID(),
    operation: 'POST /encounters/:id/cash-receipts',
    idempotencyKey
  };
}

function input(fixture: Fixture) {
  return {
    accountId: fixture.accountId,
    encounterId: fixture.encounterId,
    actorUserId: fixture.actorUserId,
    cashRegisterId: fixture.cashRegisterId,
    expectedAmount: AMOUNT,
    notes: 'Pagamento integral em dinheiro'
  };
}

async function artifactCounts(pool: Pool, fixture: Fixture) {
  const result = await pool.query<{
    readonly audits: number;
    readonly journal_entries: number;
    readonly movements: number;
    readonly outbox_events: number;
    readonly payments: number;
    readonly receipts: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM encounter_cash_receipts WHERE account_id = $1 AND encounter_id = $2) AS receipts,
       (SELECT COUNT(*)::int FROM encounter_receivable_payments WHERE account_id = $1 AND encounter_id = $2) AS payments,
       (SELECT COUNT(*)::int FROM cash_movements WHERE account_id = $1 AND cash_register_id = $3 AND movement_type = 'payment') AS movements,
       (SELECT COUNT(*)::int FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt') AS journal_entries,
       (SELECT COUNT(*)::int FROM audit_events WHERE account_id = $1 AND entity_type = 'encounter_cash_receipt') AS audits,
       (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'encounter.cash-receipt.created') AS outbox_events`,
    [fixture.accountId, fixture.encounterId, fixture.cashRegisterId]
  );
  return result.rows[0];
}

describe('atomic encounter cash receipt command', () => {
  let pool: Pool;

  beforeEach(() => {
    pool = getTestPool();
  });

  it('commits receipt, settlement, drawer, balanced journal, audit and outbox exactly once', async () => {
    const fixture = await createFixture(pool);
    const unitOfWork = createTenantUnitOfWork(pool);
    const command = new EncounterCashReceiptCommand(new DatabaseEncounterCashReceiptRepository());
    const executionContext = context(fixture, randomUUID());
    const payload = input(fixture);

    const first = await unitOfWork.execute(
      executionContext,
      payload,
      async () => command.execute(payload) as unknown as JsonValue
    );
    const replay = await unitOfWork.execute(
      executionContext,
      payload,
      async () => command.execute(payload) as unknown as JsonValue
    );

    expect(first.replayed).toBe(false);
    expect(replay).toEqual({ value: first.value, replayed: true });
    expect(await artifactCounts(pool, fixture)).toEqual({
      receipts: 1,
      payments: 1,
      movements: 1,
      journal_entries: 1,
      audits: 1,
      outbox_events: 1
    });

    const state = await pool.query(
      `SELECT billing.status AS billing_status,
              financial.financial_status,
              financial.paid_amount,
              financial.balance_due,
              receivable.status AS receivable_status,
              receivable.amount_paid,
              receivable.amount_outstanding,
              movement.running_balance
         FROM billing_records AS billing
         JOIN encounter_financial_accounts AS financial
           ON financial.account_id = billing.account_id AND financial.encounter_id = billing.encounter_id
         JOIN encounter_receivables AS receivable
           ON receivable.account_id = financial.account_id AND receivable.financial_account_id = financial.id
         JOIN cash_movements AS movement
           ON movement.account_id = billing.account_id AND movement.cash_register_id = $3
        WHERE billing.account_id = $1 AND billing.encounter_id = $2`,
      [fixture.accountId, fixture.encounterId, fixture.cashRegisterId]
    );
    expect(state.rows[0]).toMatchObject({
      billing_status: 'settled',
      financial_status: 'paid',
      paid_amount: '125.50',
      balance_due: '0.00',
      receivable_status: 'settled',
      amount_paid: '125.50',
      amount_outstanding: '0.00',
      running_balance: '175.50'
    });
  });

  it('rolls every artifact back when a later command stage fails', async () => {
    const fixture = await createFixture(pool);
    const unitOfWork = createTenantUnitOfWork(pool);
    const command = new EncounterCashReceiptCommand(new DatabaseEncounterCashReceiptRepository());
    const payload = input(fixture);

    await expect(
      unitOfWork.execute(
        context(fixture, randomUUID()),
        payload,
        async () => {
          await command.execute(payload);
          throw new Error('injected failure after receipt');
        }
      )
    ).rejects.toThrow('injected failure after receipt');

    expect(await artifactCounts(pool, fixture)).toEqual({
      receipts: 0,
      payments: 0,
      movements: 0,
      journal_entries: 0,
      audits: 0,
      outbox_events: 0
    });
    const billing = await pool.query(
      'SELECT status FROM billing_records WHERE account_id = $1 AND encounter_id = $2',
      [fixture.accountId, fixture.encounterId]
    );
    expect(billing.rows[0]?.status).toBe('open');
  });

  it('serializes concurrent retries of the same request into one committed receipt', async () => {
    const fixture = await createFixture(pool);
    const unitOfWork = createTenantUnitOfWork(pool);
    const command = new EncounterCashReceiptCommand(new DatabaseEncounterCashReceiptRepository());
    const executionContext = context(fixture, randomUUID());
    const payload = input(fixture);
    const execute = () => unitOfWork.execute(
      executionContext,
      payload,
      async () => command.execute(payload) as unknown as JsonValue
    );

    const results = await Promise.all([execute(), execute()]);

    expect(results.map((result) => result.replayed).sort()).toEqual([false, true]);
    expect(results[0]?.value).toEqual(results[1]?.value);
    expect(await artifactCounts(pool, fixture)).toEqual({
      receipts: 1,
      payments: 1,
      movements: 1,
      journal_entries: 1,
      audits: 1,
      outbox_events: 1
    });
  });

  it('closes the drawer with the receipt balance derived under the same register lock', async () => {
    const fixture = await createFixture(pool);
    const unitOfWork = createTenantUnitOfWork(pool);
    const command = new EncounterCashReceiptCommand(new DatabaseEncounterCashReceiptRepository());
    const payload = input(fixture);
    let releaseReceipt!: () => void;
    const receiptCanCommit = new Promise<void>((resolve) => {
      releaseReceipt = resolve;
    });
    let receiptHasRegisterLock!: () => void;
    const registerLocked = new Promise<void>((resolve) => {
      receiptHasRegisterLock = resolve;
    });
    const receiptExecution = unitOfWork.execute(
      context(fixture, randomUUID()),
      payload,
      async () => {
        const created = await command.execute(payload);
        receiptHasRegisterLock();
        await receiptCanCommit;
        return created as unknown as JsonValue;
      }
    );
    await registerLocked;

    const now = new Date().toISOString();
    const closeExecution = new DatabaseCashRepository(pool).closeRegisterWithMovement(
      fixture.accountId as never,
      fixture.cashRegisterId,
      175.5,
      fixture.actorUserId as never,
      now,
      now,
      {
        id: randomUUID(),
        cashRegisterId: fixture.cashRegisterId,
        accountId: fixture.accountId as never,
        movementType: 'closing',
        amount: 175.5,
        runningBalance: 50,
        reference: null,
        notes: null,
        createdByUserId: fixture.actorUserId as never,
        createdAt: now
      }
    );
    releaseReceipt();

    const [, closed] = await Promise.all([receiptExecution, closeExecution]);

    expect(closed.expectedClosingAmount).toBe(175.5);
    expect(closed.difference).toBe(0);
    expect(closed.movement.runningBalance).toBe(175.5);
    const register = await pool.query(
      `SELECT status, expected_closing_amount, difference
         FROM cash_registers
        WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, fixture.cashRegisterId]
    );
    expect(register.rows[0]).toMatchObject({
      status: 'closed',
      expected_closing_amount: '175.50',
      difference: '0.00'
    });
  });

  it('serializes reopen against receipt creation and returns a stable reversal conflict', async () => {
    const fixture = await createFixture(pool);
    const repository = new DatabaseEncounterCashReceiptRepository();
    const unitOfWork = createTenantUnitOfWork(pool);
    const command = new EncounterCashReceiptCommand(repository);
    const payload = input(fixture);
    let releaseReceipt!: () => void;
    const receiptCanCommit = new Promise<void>((resolve) => {
      releaseReceipt = resolve;
    });
    let receiptHasEncounterLock!: () => void;
    const encounterLocked = new Promise<void>((resolve) => {
      receiptHasEncounterLock = resolve;
    });
    const receiptExecution = unitOfWork.execute(
      context(fixture, randomUUID()),
      payload,
      async () => {
        const created = await command.execute(payload);
        receiptHasEncounterLock();
        await receiptCanCommit;
        return created as unknown as JsonValue;
      }
    );
    await encounterLocked;

    const reopenExecution = unitOfWork.execute(
      {
        ...context(fixture, randomUUID()),
        operation: 'POST /encounters/:id/reopen'
      },
      { reason: 'Correção clínica' },
      async () => {
        await assertEncounterHasNoCashReceipt(repository, fixture.accountId, fixture.encounterId);
        await pool.query(
          `UPDATE encounters SET status = 'open' WHERE account_id = $1 AND id = $2`,
          [fixture.accountId, fixture.encounterId]
        );
        return null;
      }
    );
    releaseReceipt();

    await receiptExecution;
    await expect(reopenExecution).rejects.toMatchObject<AppError>({
      code: 'CASH_RECEIPT_REVERSAL_REQUIRED',
      statusCode: 409
    });
    const encounter = await pool.query(
      'SELECT status FROM encounters WHERE account_id = $1 AND id = $2',
      [fixture.accountId, fixture.encounterId]
    );
    expect(encounter.rows[0]?.status).toBe('closed');
  });

  it('serializes encounter deletion in receipt lock order and returns a reversal conflict', async () => {
    const fixture = await createFixture(pool);
    const repository = new DatabaseEncounterCashReceiptRepository();
    const unitOfWork = createTenantUnitOfWork(pool);
    const command = new EncounterCashReceiptCommand(repository);
    const payload = input(fixture);
    let releaseReceipt!: () => void;
    const receiptCanCommit = new Promise<void>((resolve) => {
      releaseReceipt = resolve;
    });
    let receiptHasLocks!: () => void;
    const receiptLocked = new Promise<void>((resolve) => {
      receiptHasLocks = resolve;
    });
    const receiptExecution = unitOfWork.execute(
      context(fixture, randomUUID()),
      payload,
      async () => {
        const created = await command.execute(payload);
        receiptHasLocks();
        await receiptCanCommit;
        return created as unknown as JsonValue;
      }
    );
    await receiptLocked;

    const deleteExecution = unitOfWork.execute(
      {
        ...context(fixture, randomUUID()),
        operation: 'DELETE /encounters/:id'
      },
      {},
      async (transaction) => {
        await assertEncounterHasNoCashReceipt(repository, fixture.accountId, fixture.encounterId);
        await transaction.client.query(
          'DELETE FROM encounters WHERE account_id = $1 AND id = $2',
          [fixture.accountId, fixture.encounterId]
        );
        return null;
      }
    );
    releaseReceipt();

    await receiptExecution;
    await expect(deleteExecution).rejects.toMatchObject<AppError>({
      code: 'CASH_RECEIPT_REVERSAL_REQUIRED',
      statusCode: 409
    });
    const encounter = await pool.query(
      'SELECT status FROM encounters WHERE account_id = $1 AND id = $2',
      [fixture.accountId, fixture.encounterId]
    );
    expect(encounter.rows[0]?.status).toBe('closed');
  });

  it('rejects an open encounter with a stable conflict before creating financial artifacts', async () => {
    const fixture = await createFixture(pool);
    await pool.query(
      `UPDATE encounters
          SET status = 'open', closed_by_user_id = NULL, closed_at = NULL
        WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, fixture.encounterId]
    );
    const unitOfWork = createTenantUnitOfWork(pool);
    const command = new EncounterCashReceiptCommand(new DatabaseEncounterCashReceiptRepository());
    const payload = input(fixture);

    await expect(
      unitOfWork.execute(
        context(fixture, randomUUID()),
        payload,
        async () => command.execute(payload) as unknown as JsonValue
      )
    ).rejects.toMatchObject<AppError>({
      code: 'ENCOUNTER_NOT_CLOSED',
      statusCode: 409
    });

    expect(await artifactCounts(pool, fixture)).toEqual({
      receipts: 0,
      payments: 0,
      movements: 0,
      journal_entries: 0,
      audits: 0,
      outbox_events: 0
    });
  });

  it('rejects an unconfirmed billing estimate before creating financial artifacts', async () => {
    const fixture = await createFixture(pool);
    await pool.query(
      `UPDATE billing_records
          SET status = 'estimated'
        WHERE account_id = $1 AND encounter_id = $2`,
      [fixture.accountId, fixture.encounterId]
    );
    const unitOfWork = createTenantUnitOfWork(pool);
    const command = new EncounterCashReceiptCommand(new DatabaseEncounterCashReceiptRepository());
    const payload = input(fixture);

    await expect(
      unitOfWork.execute(
        context(fixture, randomUUID()),
        payload,
        async () => command.execute(payload) as unknown as JsonValue
      )
    ).rejects.toMatchObject<AppError>({
      code: 'BILLING_NOT_RECEIVABLE',
      statusCode: 409
    });

    expect(await artifactCounts(pool, fixture)).toEqual({
      receipts: 0,
      payments: 0,
      movements: 0,
      journal_entries: 0,
      audits: 0,
      outbox_events: 0
    });
  });
});
