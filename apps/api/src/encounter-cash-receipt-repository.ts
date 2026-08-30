import { randomUUID } from 'node:crypto';

import { getPool, type TenantTransactionContext } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

export interface EncounterCashReceiptRecord {
  readonly id: string;
  readonly accountId: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
  readonly financialAccountId: string;
  readonly receivableId: string;
  readonly receivablePaymentId: string;
  readonly cashRegisterId: string;
  readonly cashMovementId: string;
  readonly journalEntryId: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly receivedAt: string;
  readonly receivedByUserId: string;
  readonly notes?: string;
  readonly reversalId?: string;
  readonly reversalCashMovementId?: string;
  readonly reversalJournalEntryId?: string;
  readonly reversalReason?: string;
  readonly reversedByUserId?: string;
  readonly reversedAt?: string;
}

export interface CreateEncounterCashReceiptInput {
  readonly accountId: string;
  readonly encounterId: string;
  readonly actorUserId: string;
  readonly cashRegisterId: string;
  readonly expectedAmount: number;
  readonly notes?: string;
}

export interface EncounterCashReceiptRepository {
  create(
    transaction: TenantTransactionContext,
    input: CreateEncounterCashReceiptInput
  ): Promise<EncounterCashReceiptRecord>;
  findById(
    accountId: string,
    encounterId: string,
    receiptId: string
  ): Promise<EncounterCashReceiptRecord | null>;
  findByEncounter(
    accountId: string,
    encounterId: string
  ): Promise<EncounterCashReceiptRecord | null>;
}

interface BillingRow {
  readonly id: string;
  readonly status: string;
  readonly subtotal_amount: string;
  readonly currency: string;
  readonly active_payment_attempt_id: string | null;
}

interface FinancialAccountRow {
  readonly id: string;
  readonly financial_status: string;
  readonly total_snapshot: string;
  readonly paid_amount: string;
  readonly balance_due: string;
}

interface ReceivableRow {
  readonly id: string;
  readonly status: string;
  readonly amount_original: string;
  readonly amount_paid: string;
  readonly amount_outstanding: string;
}

interface CashRegisterRow {
  readonly id: string;
  readonly status: string;
  readonly opening_amount: string;
}

type ReceiptRow = Readonly<Record<string, unknown>>;

const CASH_ACCOUNT_CODE = '1.1.01-caixa';
const CLINICAL_REVENUE_ACCOUNT_CODE = '3.1.01-receita-clinica';

function money(value: string | number): number {
  return Number(Number(value).toFixed(2));
}

function sameMoney(left: string | number, right: string | number): boolean {
  return Math.round(Number(left) * 100) === Math.round(Number(right) * 100);
}

function mapReceipt(row: ReceiptRow): EncounterCashReceiptRecord {
  const notes = (row.notes as string | null) ?? undefined;
  const reversalId = (row.reversal_id as string | null) ?? undefined;
  const reversalCashMovementId = (row.reversal_cash_movement_id as string | null) ?? undefined;
  const reversalJournalEntryId = (row.reversal_journal_entry_id as string | null) ?? undefined;
  const reversalReason = (row.reversal_reason as string | null) ?? undefined;
  const reversedByUserId = (row.reversed_by_user_id as string | null) ?? undefined;
  const reversedAt = row.reversed_at
    ? new Date(row.reversed_at as string | Date).toISOString()
    : undefined;
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    encounterId: row.encounter_id as string,
    billingRecordId: row.billing_record_id as string,
    financialAccountId: row.financial_account_id as string,
    receivableId: row.receivable_id as string,
    receivablePaymentId: row.receivable_payment_id as string,
    cashRegisterId: row.cash_register_id as string,
    cashMovementId: row.cash_movement_id as string,
    journalEntryId: row.journal_entry_id as string,
    amount: money(row.amount as string),
    currency: 'BRL',
    receivedAt: new Date(row.received_at as string | Date).toISOString(),
    receivedByUserId: row.received_by_user_id as string,
    ...(notes ? { notes } : {}),
    ...(reversalId ? { reversalId } : {}),
    ...(reversalCashMovementId ? { reversalCashMovementId } : {}),
    ...(reversalJournalEntryId ? { reversalJournalEntryId } : {}),
    ...(reversalReason ? { reversalReason } : {}),
    ...(reversedByUserId ? { reversedByUserId } : {}),
    ...(reversedAt ? { reversedAt } : {})
  };
}

function fail(code: string, message: string, statusCode: number): never {
  throw new AppError(code, message, statusCode);
}

export class DatabaseEncounterCashReceiptRepository implements EncounterCashReceiptRepository {
  async create(
    transaction: TenantTransactionContext,
    input: CreateEncounterCashReceiptInput
  ): Promise<EncounterCashReceiptRecord> {
    if (
      transaction.accountId !== input.accountId ||
      transaction.actorUserId !== input.actorUserId
    ) {
      fail(
        'CASH_RECEIPT_CONTEXT_MISMATCH',
        'Receipt context does not match the active transaction',
        403
      );
    }

    const client = transaction.client;
    const existingReceipt = await client.query<Pick<ReceiptRow, 'id'>>(
      `SELECT receipt.id
         FROM encounter_cash_receipts AS receipt
        WHERE receipt.account_id = $1 AND receipt.encounter_id = $2
          AND NOT EXISTS (
            SELECT 1
              FROM encounter_cash_receipt_reversals AS reversal
             WHERE reversal.account_id = receipt.account_id
               AND reversal.receipt_id = receipt.id
          )
        FOR UPDATE`,
      [input.accountId, input.encounterId]
    );
    if (existingReceipt.rows[0]) {
      fail('CASH_RECEIPT_ALREADY_EXISTS', 'A cash receipt already exists for this encounter', 409);
    }

    const billingResult = await client.query<BillingRow>(
      `SELECT id, status, subtotal_amount, currency, active_payment_attempt_id::text
         FROM billing_records
        WHERE account_id = $1 AND encounter_id = $2
        FOR UPDATE`,
      [input.accountId, input.encounterId]
    );
    const billing = billingResult.rows[0];
    if (!billing) fail('BILLING_RECORD_NOT_FOUND', 'Billing record not found', 404);
    if (billing.status !== 'open') {
      fail('BILLING_NOT_RECEIVABLE', 'Billing record is not eligible for cash receipt', 409);
    }
    if (billing.active_payment_attempt_id !== null) {
      fail('BILLING_PAYMENT_RESERVED', 'Billing record already has a payment in progress', 409);
    }
    if (billing.currency !== 'BRL' || money(billing.subtotal_amount) <= 0) {
      fail('BILLING_NOT_RECEIVABLE', 'Billing must contain a positive BRL balance', 409);
    }
    if (!sameMoney(billing.subtotal_amount, input.expectedAmount)) {
      fail(
        'CASH_RECEIPT_AMOUNT_MISMATCH',
        'Expected amount no longer matches the billing total',
        409
      );
    }

    const itemCount = await client.query<{ readonly count: string }>(
      `SELECT COUNT(*)::TEXT AS count
         FROM billing_items
        WHERE account_id = $1 AND billing_record_id = $2`,
      [input.accountId, billing.id]
    );
    if (Number(itemCount.rows[0]?.count ?? 0) < 1) {
      fail('BILLING_ITEMS_REQUIRED', 'Billing must contain at least one item before receipt', 409);
    }

    const encounterResult = await client.query<{ readonly status: string }>(
      `SELECT status
         FROM encounters
        WHERE account_id = $1 AND id = $2
        FOR SHARE`,
      [input.accountId, input.encounterId]
    );
    if (encounterResult.rows[0]?.status !== 'closed') {
      fail('ENCOUNTER_NOT_CLOSED', 'Encounter must be closed before recording a cash receipt', 409);
    }

    const amount = money(input.expectedAmount);
    const financialAccount = await this.#lockOrCreateFinancialAccount(transaction, input, amount);
    const receivable = await this.#lockOrCreateReceivable(
      transaction,
      input,
      financialAccount,
      amount
    );

    const registerResult = await client.query<CashRegisterRow>(
      `SELECT id, status, opening_amount
         FROM cash_registers
        WHERE account_id = $1 AND id = $2
        FOR UPDATE`,
      [input.accountId, input.cashRegisterId]
    );
    const cashRegister = registerResult.rows[0];
    if (!cashRegister || cashRegister.status !== 'open') {
      fail('CASH_REGISTER_NOT_OPEN', 'Cash register is not open for this account', 409);
    }

    const latestBalance = await client.query<{ readonly running_balance: string }>(
      `SELECT running_balance
         FROM cash_movements
        WHERE account_id = $1 AND cash_register_id = $2
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [input.accountId, input.cashRegisterId]
    );
    const runningBalance = money(
      Number(latestBalance.rows[0]?.running_balance ?? cashRegister.opening_amount) + amount
    );

    const receiptId = randomUUID();
    const receivablePaymentId = randomUUID();
    const cashMovementId = randomUUID();
    const journalEntryId = randomUUID();

    await client.query(
      `UPDATE encounter_receivables
          SET status = 'settled', amount_paid = $4, amount_outstanding = 0,
              settled_at = clock_timestamp(), updated_at = clock_timestamp()
        WHERE account_id = $1 AND encounter_id = $2 AND id = $3`,
      [input.accountId, input.encounterId, receivable.id, amount]
    );
    await client.query(
      `INSERT INTO encounter_receivable_payments (
         id, account_id, encounter_id, financial_account_id, receivable_id,
         amount_paid, paid_at, paid_by_user_id, notes,
         external_reference_type, external_reference_id
       ) VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp(), $7, $8, 'cash_movement', $9)`,
      [
        receivablePaymentId,
        input.accountId,
        input.encounterId,
        financialAccount.id,
        receivable.id,
        amount,
        input.actorUserId,
        input.notes ?? null,
        cashMovementId
      ]
    );
    await client.query(
      `UPDATE encounter_financial_accounts
          SET financial_status = 'paid', paid_amount = $4, balance_due = 0,
              closed_by_user_id = $5, closed_at = clock_timestamp(), updated_at = clock_timestamp()
        WHERE account_id = $1 AND encounter_id = $2 AND id = $3`,
      [input.accountId, input.encounterId, financialAccount.id, amount, input.actorUserId]
    );
    await client.query(
      `INSERT INTO cash_movements (
         id, cash_register_id, account_id, movement_type, amount, running_balance,
         reference, notes, created_by_user_id, created_at
       ) VALUES ($1, $2, $3, 'payment', $4, $5, $6, $7, $8, clock_timestamp())`,
      [
        cashMovementId,
        input.cashRegisterId,
        input.accountId,
        amount,
        runningBalance,
        `encounter_cash_receipt:${receiptId}`,
        input.notes ?? null,
        input.actorUserId
      ]
    );
    await client.query(
      `INSERT INTO financial_journal_entries (
         id, account_id, source_type, source_id, description, occurred_at, created_by_user_id
       ) VALUES ($1, $2, 'encounter_cash_receipt', $3, $4, clock_timestamp(), $5)`,
      [
        journalEntryId,
        input.accountId,
        receiptId,
        `Recebimento integral em dinheiro do atendimento ${input.encounterId}`,
        input.actorUserId
      ]
    );
    await client.query(
      `INSERT INTO financial_journal_lines (
         id, account_id, entry_id, account_code, debit, credit, memo
       ) VALUES
         ($1, $2, $3, $4, $6, 0, $7),
         ($5, $2, $3, $8, 0, $6, $7)`,
      [
        randomUUID(),
        input.accountId,
        journalEntryId,
        CASH_ACCOUNT_CODE,
        randomUUID(),
        amount,
        `Receipt ${receiptId}`,
        CLINICAL_REVENUE_ACCOUNT_CODE
      ]
    );
    await client.query(
      `UPDATE billing_records
          SET status = 'settled', updated_at = clock_timestamp()
        WHERE account_id = $1 AND encounter_id = $2 AND id = $3`,
      [input.accountId, input.encounterId, billing.id]
    );

    const receiptResult = await client.query<ReceiptRow>(
      `INSERT INTO encounter_cash_receipts (
         id, account_id, encounter_id, billing_record_id, financial_account_id,
         receivable_id, receivable_payment_id, cash_register_id, cash_movement_id,
         journal_entry_id, received_by_user_id, amount, currency, received_at, notes
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'BRL', clock_timestamp(), $13
       ) RETURNING *`,
      [
        receiptId,
        input.accountId,
        input.encounterId,
        billing.id,
        financialAccount.id,
        receivable.id,
        receivablePaymentId,
        input.cashRegisterId,
        cashMovementId,
        journalEntryId,
        input.actorUserId,
        amount,
        input.notes ?? null
      ]
    );

    await transaction.audit.append({
      entityType: 'encounter_cash_receipt',
      entityId: receiptId,
      action: 'cash_received',
      metadata: {
        encounterId: input.encounterId,
        billingRecordId: billing.id,
        cashRegisterId: input.cashRegisterId,
        amount,
        currency: 'BRL'
      }
    });
    await transaction.outbox.append({
      moduleName: 'financial',
      eventType: 'encounter.cash-receipt.created',
      payload: {
        receiptId,
        encounterId: input.encounterId,
        billingRecordId: billing.id,
        financialAccountId: financialAccount.id,
        receivableId: receivable.id,
        receivablePaymentId,
        cashRegisterId: input.cashRegisterId,
        cashMovementId,
        journalEntryId,
        amount,
        currency: 'BRL'
      }
    });

    const created = receiptResult.rows[0];
    if (!created) fail('CASH_RECEIPT_PERSISTENCE_FAILED', 'Cash receipt was not persisted', 500);
    return mapReceipt(created);
  }

  async findById(
    accountId: string,
    encounterId: string,
    receiptId: string
  ): Promise<EncounterCashReceiptRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query<ReceiptRow>(
        `SELECT receipt.*,
                reversal.id AS reversal_id,
                reversal.reversal_cash_movement_id,
                reversal.reversal_journal_entry_id,
                reversal.reason AS reversal_reason,
                reversal.reversed_by_user_id,
                reversal.reversed_at
           FROM encounter_cash_receipts AS receipt
           LEFT JOIN encounter_cash_receipt_reversals AS reversal
             ON reversal.account_id = receipt.account_id
            AND reversal.receipt_id = receipt.id
          WHERE receipt.account_id = $1 AND receipt.encounter_id = $2 AND receipt.id = $3
          LIMIT 1`,
        [accountId, encounterId, receiptId]
      );
      return result.rows[0] ? mapReceipt(result.rows[0]) : null;
    });
  }

  async findByEncounter(
    accountId: string,
    encounterId: string
  ): Promise<EncounterCashReceiptRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query<ReceiptRow>(
        `SELECT receipt.*
           FROM encounter_cash_receipts AS receipt
          WHERE receipt.account_id = $1 AND receipt.encounter_id = $2
            AND NOT EXISTS (
              SELECT 1
                FROM encounter_cash_receipt_reversals AS reversal
               WHERE reversal.account_id = receipt.account_id
                 AND reversal.receipt_id = receipt.id
            )
          LIMIT 1`,
        [accountId, encounterId]
      );
      return result.rows[0] ? mapReceipt(result.rows[0]) : null;
    });
  }

  async #lockOrCreateFinancialAccount(
    transaction: TenantTransactionContext,
    input: CreateEncounterCashReceiptInput,
    amount: number
  ): Promise<FinancialAccountRow> {
    const result = await transaction.client.query<FinancialAccountRow>(
      `SELECT id, financial_status, total_snapshot, paid_amount, balance_due
         FROM encounter_financial_accounts
        WHERE account_id = $1 AND encounter_id = $2
        FOR UPDATE`,
      [input.accountId, input.encounterId]
    );
    const existing = result.rows[0];
    if (existing) {
      if (
        existing.financial_status !== 'pending' ||
        !sameMoney(existing.total_snapshot, amount) ||
        !sameMoney(existing.paid_amount, 0) ||
        !sameMoney(existing.balance_due, amount)
      ) {
        fail(
          'FINANCIAL_ACCOUNT_NOT_RECEIVABLE',
          'Financial account cannot be settled by this receipt',
          409
        );
      }
      return existing;
    }

    const id = randomUUID();
    const inserted = await transaction.client.query<FinancialAccountRow>(
      `INSERT INTO encounter_financial_accounts (
         id, account_id, encounter_id, financial_status, subtotal_snapshot,
         discount_total_snapshot, total_snapshot, paid_amount, balance_due,
         snapshot_json, created_at, updated_at
       ) VALUES ($1, $2, $3, 'pending', $4, 0, $4, 0, $4, $5, clock_timestamp(), clock_timestamp())
       RETURNING id, financial_status, total_snapshot, paid_amount, balance_due`,
      [
        id,
        input.accountId,
        input.encounterId,
        amount,
        JSON.stringify({ source: 'encounter_cash_receipt', capturedAmount: amount })
      ]
    );
    return inserted.rows[0] as FinancialAccountRow;
  }

  async #lockOrCreateReceivable(
    transaction: TenantTransactionContext,
    input: CreateEncounterCashReceiptInput,
    financialAccount: FinancialAccountRow,
    amount: number
  ): Promise<ReceivableRow> {
    const result = await transaction.client.query<ReceivableRow>(
      `SELECT id, status, amount_original, amount_paid, amount_outstanding
         FROM encounter_receivables
        WHERE account_id = $1 AND encounter_id = $2 AND financial_account_id = $3
        ORDER BY installment_number
        FOR UPDATE`,
      [input.accountId, input.encounterId, financialAccount.id]
    );
    if (result.rows.length > 1) {
      fail(
        'RECEIVABLE_NOT_ELIGIBLE',
        'Installment receivables require a dedicated payment flow',
        409
      );
    }
    const existing = result.rows[0];
    if (existing) {
      if (
        existing.status !== 'open' ||
        !sameMoney(existing.amount_original, amount) ||
        !sameMoney(existing.amount_paid, 0) ||
        !sameMoney(existing.amount_outstanding, amount)
      ) {
        fail('RECEIVABLE_NOT_ELIGIBLE', 'Receivable cannot be settled by this receipt', 409);
      }
      return existing;
    }

    const id = randomUUID();
    const inserted = await transaction.client.query<ReceivableRow>(
      `INSERT INTO encounter_receivables (
         id, account_id, encounter_id, financial_account_id, installment_number,
         installment_label, status, amount_original, amount_paid, amount_outstanding,
         issued_at, notes, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, 1, 'Parcela 1/1', 'open', $5, 0, $5,
         clock_timestamp(), $6, clock_timestamp(), clock_timestamp()
       ) RETURNING id, status, amount_original, amount_paid, amount_outstanding`,
      [id, input.accountId, input.encounterId, financialAccount.id, amount, input.notes ?? null]
    );
    return inserted.rows[0] as ReceivableRow;
  }
}
