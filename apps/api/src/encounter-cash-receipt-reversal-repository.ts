import { randomUUID } from 'node:crypto';

import { getPool, type TenantTransactionContext } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

export interface EncounterCashReceiptReversal {
  readonly id: string;
  readonly accountId: string;
  readonly receiptId: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
  readonly financialAccountId: string;
  readonly receivableId: string;
  readonly receivablePaymentId: string;
  readonly originalCashRegisterId: string;
  readonly reversalCashRegisterId: string;
  readonly originalCashMovementId: string;
  readonly reversalCashMovementId: string;
  readonly originalJournalEntryId: string;
  readonly reversalJournalEntryId: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly reason: string;
  readonly reversedByUserId: string;
  readonly reversedAt: string;
}

export interface CreateEncounterCashReceiptReversalInput {
  readonly accountId: string;
  readonly encounterId: string;
  readonly receiptId: string;
  readonly actorUserId: string;
  readonly reason: string;
}

export interface EncounterCashReceiptReversalRepository {
  reverse(
    transaction: TenantTransactionContext,
    input: CreateEncounterCashReceiptReversalInput
  ): Promise<EncounterCashReceiptReversal>;
  findByReceipt(accountId: string, receiptId: string): Promise<EncounterCashReceiptReversal | null>;
}

interface ReceiptSourceRow {
  readonly id: string;
  readonly account_id: string;
  readonly encounter_id: string;
  readonly billing_record_id: string;
  readonly financial_account_id: string;
  readonly receivable_id: string;
  readonly receivable_payment_id: string;
  readonly cash_register_id: string;
  readonly cash_movement_id: string;
  readonly journal_entry_id: string;
  readonly received_by_user_id: string;
  readonly amount: string;
  readonly currency: string;
  readonly received_at: string | Date;
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

interface PaymentRow {
  readonly id: string;
  readonly amount_paid: string;
  readonly paid_by_user_id: string | null;
  readonly external_reference_type: string | null;
  readonly external_reference_id: string | null;
}

interface CashRegisterRow {
  readonly id: string;
  readonly status: string;
  readonly opening_amount: string;
  readonly opened_at: string | Date;
  readonly closed_at: string | Date | null;
}

interface CashMovementRow {
  readonly id: string;
  readonly cash_register_id: string;
  readonly movement_type: string;
  readonly amount: string;
  readonly created_by_user_id: string | null;
}

interface JournalEntryRow {
  readonly id: string;
  readonly source_type: string;
  readonly source_id: string;
  readonly created_by_user_id: string | null;
}

interface JournalLineRow {
  readonly account_code: string;
  readonly debit: string;
  readonly credit: string;
}

type ReversalRow = Readonly<Record<string, unknown>>;

const CASH_ACCOUNT_CODE = '1.1.01-caixa';
const CLINICAL_REVENUE_ACCOUNT_CODE = '3.1.01-receita-clinica';

function money(value: string | number): number {
  return Number(Number(value).toFixed(2));
}

function cents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

function sameMoney(left: string | number, right: string | number): boolean {
  return cents(left) === cents(right);
}

function fail(code: string, message: string, statusCode: number): never {
  throw new AppError(code, message, statusCode);
}

function mapReversal(row: ReversalRow): EncounterCashReceiptReversal {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    receiptId: row.receipt_id as string,
    encounterId: row.encounter_id as string,
    billingRecordId: row.billing_record_id as string,
    financialAccountId: row.financial_account_id as string,
    receivableId: row.receivable_id as string,
    receivablePaymentId: row.receivable_payment_id as string,
    originalCashRegisterId: row.original_cash_register_id as string,
    reversalCashRegisterId: row.reversal_cash_register_id as string,
    originalCashMovementId: row.original_cash_movement_id as string,
    reversalCashMovementId: row.reversal_cash_movement_id as string,
    originalJournalEntryId: row.original_journal_entry_id as string,
    reversalJournalEntryId: row.reversal_journal_entry_id as string,
    amount: money(row.amount as string),
    currency: 'BRL',
    reason: row.reason as string,
    reversedByUserId: row.reversed_by_user_id as string,
    reversedAt: new Date(row.reversed_at as string | Date).toISOString()
  };
}

function assertJournalLines(
  rows: readonly JournalLineRow[],
  amount: number,
  errorCode: string
): void {
  const totalDebit = rows.reduce((sum, row) => sum + cents(row.debit), 0);
  const totalCredit = rows.reduce((sum, row) => sum + cents(row.credit), 0);
  const cashDebit = rows
    .filter((row) => row.account_code === CASH_ACCOUNT_CODE)
    .reduce((sum, row) => sum + cents(row.debit), 0);
  const revenueCredit = rows
    .filter((row) => row.account_code === CLINICAL_REVENUE_ACCOUNT_CODE)
    .reduce((sum, row) => sum + cents(row.credit), 0);
  if (
    rows.length < 2 ||
    totalDebit !== cents(amount) ||
    totalCredit !== cents(amount) ||
    cashDebit !== cents(amount) ||
    revenueCredit !== cents(amount)
  ) {
    fail(errorCode, 'Cash receipt journal is not a balanced full-settlement proof', 409);
  }
}

export class DatabaseEncounterCashReceiptReversalRepository implements EncounterCashReceiptReversalRepository {
  async reverse(
    transaction: TenantTransactionContext,
    input: CreateEncounterCashReceiptReversalInput
  ): Promise<EncounterCashReceiptReversal> {
    if (
      transaction.accountId !== input.accountId ||
      transaction.actorUserId !== input.actorUserId
    ) {
      fail(
        'CASH_RECEIPT_REVERSAL_CONTEXT_MISMATCH',
        'Reversal context does not match the active transaction',
        403
      );
    }

    const client = transaction.client;
    const sourceResult = await client.query<ReceiptSourceRow>(
      `SELECT id, account_id, encounter_id, billing_record_id, financial_account_id,
              receivable_id, receivable_payment_id, cash_register_id, cash_movement_id,
              journal_entry_id, received_by_user_id, amount, currency, received_at
         FROM encounter_cash_receipts
        WHERE account_id = $1 AND id = $2
        FOR UPDATE`,
      [input.accountId, input.receiptId]
    );
    const source = sourceResult.rows[0];
    if (!source || source.encounter_id !== input.encounterId) {
      fail('CASH_RECEIPT_NOT_FOUND', 'Cash receipt not found', 404);
    }

    const existingReversal = await client.query<ReversalRow>(
      `SELECT *
         FROM encounter_cash_receipt_reversals
        WHERE account_id = $1 AND receipt_id = $2
        FOR UPDATE`,
      [input.accountId, input.receiptId]
    );
    if (existingReversal.rows[0]) {
      fail(
        'CASH_RECEIPT_ALREADY_REVERSED',
        'Cash receipt already has an immutable financial reversal',
        409
      );
    }

    const billingResult = await client.query<BillingRow>(
      `SELECT id, status, subtotal_amount, currency, active_payment_attempt_id::text
         FROM billing_records
        WHERE account_id = $1 AND id = $2 AND encounter_id = $3
        FOR UPDATE`,
      [input.accountId, source.billing_record_id, input.encounterId]
    );
    const billing = billingResult.rows[0];
    if (!billing) fail('BILLING_RECORD_NOT_FOUND', 'Billing record not found', 404);
    const amount = money(source.amount);
    if (
      billing.status !== 'settled' ||
      billing.currency !== 'BRL' ||
      !sameMoney(billing.subtotal_amount, amount) ||
      billing.active_payment_attempt_id !== null
    ) {
      fail(
        'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE',
        'Billing is no longer an eligible settled cash receipt',
        409
      );
    }

    const encounterResult = await client.query<{ readonly status: string }>(
      `SELECT status
         FROM encounters
        WHERE account_id = $1 AND id = $2
        FOR UPDATE`,
      [input.accountId, input.encounterId]
    );
    if (encounterResult.rows[0]?.status !== 'closed') {
      fail(
        'CASH_RECEIPT_REVERSAL_ENCOUNTER_NOT_CLOSED',
        'Encounter must remain closed while its cash receipt is reversed',
        409
      );
    }

    const financialResult = await client.query<FinancialAccountRow>(
      `SELECT id, financial_status, total_snapshot, paid_amount, balance_due
         FROM encounter_financial_accounts
        WHERE account_id = $1 AND id = $2 AND encounter_id = $3
        FOR UPDATE`,
      [input.accountId, source.financial_account_id, input.encounterId]
    );
    const financialAccount = financialResult.rows[0];
    if (
      !financialAccount ||
      financialAccount.financial_status !== 'paid' ||
      !sameMoney(financialAccount.total_snapshot, amount) ||
      !sameMoney(financialAccount.paid_amount, amount) ||
      !sameMoney(financialAccount.balance_due, 0)
    ) {
      fail(
        'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE',
        'Financial account is no longer an eligible settled cash receipt',
        409
      );
    }

    const receivableResult = await client.query<ReceivableRow>(
      `SELECT id, status, amount_original, amount_paid, amount_outstanding
         FROM encounter_receivables
        WHERE account_id = $1 AND id = $2 AND encounter_id = $3
          AND financial_account_id = $4
        FOR UPDATE`,
      [input.accountId, source.receivable_id, input.encounterId, source.financial_account_id]
    );
    const receivable = receivableResult.rows[0];
    if (
      !receivable ||
      receivable.status !== 'settled' ||
      !sameMoney(receivable.amount_original, amount) ||
      !sameMoney(receivable.amount_paid, amount) ||
      !sameMoney(receivable.amount_outstanding, 0)
    ) {
      fail(
        'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE',
        'Receivable is no longer an eligible settled cash receipt',
        409
      );
    }

    const paymentResult = await client.query<PaymentRow>(
      `SELECT id, amount_paid, paid_by_user_id, external_reference_type,
              external_reference_id
         FROM encounter_receivable_payments
        WHERE account_id = $1 AND id = $2 AND encounter_id = $3
          AND financial_account_id = $4 AND receivable_id = $5
        FOR UPDATE`,
      [
        input.accountId,
        source.receivable_payment_id,
        input.encounterId,
        source.financial_account_id,
        source.receivable_id
      ]
    );
    const payment = paymentResult.rows[0];
    if (
      !payment ||
      !sameMoney(payment.amount_paid, amount) ||
      payment.paid_by_user_id !== source.received_by_user_id ||
      payment.external_reference_type !== 'cash_movement' ||
      payment.external_reference_id !== source.cash_movement_id
    ) {
      fail(
        'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE',
        'Receipt payment artifact is no longer consistent',
        409
      );
    }

    const originalRegisterResult = await client.query<CashRegisterRow>(
      `SELECT id, status, opening_amount, opened_at, closed_at
         FROM cash_registers
        WHERE account_id = $1 AND id = $2
        FOR UPDATE`,
      [input.accountId, source.cash_register_id]
    );
    const originalRegister = originalRegisterResult.rows[0];
    const receivedAt = new Date(source.received_at);
    if (
      !originalRegister ||
      new Date(originalRegister.opened_at) > receivedAt ||
      (originalRegister.status === 'closed' &&
        (!originalRegister.closed_at || new Date(originalRegister.closed_at) < receivedAt)) ||
      (originalRegister.status === 'open' && originalRegister.closed_at !== null) ||
      (originalRegister.status !== 'open' && originalRegister.status !== 'closed')
    ) {
      fail(
        'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE',
        'Original cash register is no longer a consistent receipt artifact',
        409
      );
    }

    const originalMovementResult = await client.query<CashMovementRow>(
      `SELECT id, cash_register_id, movement_type, amount, created_by_user_id
         FROM cash_movements
        WHERE account_id = $1 AND id = $2
          AND cash_register_id = $3
        FOR UPDATE`,
      [input.accountId, source.cash_movement_id, source.cash_register_id]
    );
    const originalMovement = originalMovementResult.rows[0];
    if (
      !originalMovement ||
      originalMovement.movement_type !== 'payment' ||
      !sameMoney(originalMovement.amount, amount) ||
      originalMovement.created_by_user_id !== source.received_by_user_id
    ) {
      fail(
        'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE',
        'Original cash movement is no longer a consistent receipt artifact',
        409
      );
    }

    const originalJournalResult = await client.query<JournalEntryRow>(
      `SELECT id, source_type, source_id, created_by_user_id
         FROM financial_journal_entries
        WHERE account_id = $1 AND id = $2
        FOR UPDATE`,
      [input.accountId, source.journal_entry_id]
    );
    const originalJournal = originalJournalResult.rows[0];
    if (
      !originalJournal ||
      originalJournal.source_type !== 'encounter_cash_receipt' ||
      originalJournal.source_id !== source.id ||
      originalJournal.created_by_user_id !== source.received_by_user_id
    ) {
      fail(
        'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE',
        'Original journal entry is no longer a consistent receipt artifact',
        409
      );
    }
    const originalLinesResult = await client.query<JournalLineRow>(
      `SELECT account_code, debit, credit
         FROM financial_journal_lines
        WHERE account_id = $1 AND entry_id = $2
        FOR UPDATE`,
      [input.accountId, source.journal_entry_id]
    );
    assertJournalLines(originalLinesResult.rows, amount, 'CASH_RECEIPT_REVERSAL_NOT_ELIGIBLE');

    const reversalRegisterResult = await client.query<CashRegisterRow>(
      `SELECT id, status, opening_amount, opened_at, closed_at
         FROM cash_registers
        WHERE account_id = $1 AND status = 'open'
        ORDER BY opened_at DESC
        LIMIT 1
        FOR UPDATE`,
      [input.accountId]
    );
    const reversalRegister = reversalRegisterResult.rows[0];
    if (!reversalRegister) {
      fail(
        'CASH_RECEIPT_REVERSAL_REGISTER_NOT_OPEN',
        'An open cash register is required to reverse a cash receipt',
        409
      );
    }

    const latestBalanceResult = await client.query<{ readonly running_balance: string }>(
      `SELECT running_balance
         FROM cash_movements
        WHERE account_id = $1 AND cash_register_id = $2
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [input.accountId, reversalRegister.id]
    );
    const currentBalance = money(
      latestBalanceResult.rows[0]?.running_balance ?? reversalRegister.opening_amount
    );
    if (cents(currentBalance) < cents(amount)) {
      fail(
        'CASH_RECEIPT_REVERSAL_INSUFFICIENT_BALANCE',
        'Cash register does not have enough balance for this reversal',
        409
      );
    }

    const reversalId = randomUUID();
    const reversalCashMovementId = randomUUID();
    const reversalJournalEntryId = randomUUID();
    const reversalLineDebitId = randomUUID();
    const reversalLineCreditId = randomUUID();
    const reversalBalance = money(currentBalance - amount);

    await client.query(
      `INSERT INTO cash_movements (
         id, cash_register_id, account_id, movement_type, amount, running_balance,
         reference, notes, created_by_user_id, created_at
       ) VALUES ($1, $2, $3, 'withdrawal', $4, $5, $6, $7, $8, clock_timestamp())`,
      [
        reversalCashMovementId,
        reversalRegister.id,
        input.accountId,
        amount,
        reversalBalance,
        `encounter_cash_receipt_reversal:${reversalId}`,
        input.reason,
        input.actorUserId
      ]
    );
    await client.query(
      `INSERT INTO financial_journal_entries (
         id, account_id, source_type, source_id, description, occurred_at, created_by_user_id
       ) VALUES ($1, $2, 'encounter_cash_receipt_reversal', $3, $4, clock_timestamp(), $5)`,
      [
        reversalJournalEntryId,
        input.accountId,
        reversalId,
        `Estorno do recebimento em dinheiro do atendimento ${input.encounterId}`,
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
        reversalLineDebitId,
        input.accountId,
        reversalJournalEntryId,
        CLINICAL_REVENUE_ACCOUNT_CODE,
        reversalLineCreditId,
        amount,
        `Reversal ${reversalId}`,
        CASH_ACCOUNT_CODE
      ]
    );

    await client.query(
      `UPDATE encounter_receivables
          SET status = 'open', amount_paid = 0, amount_outstanding = $4,
              settled_at = NULL, updated_at = clock_timestamp()
        WHERE account_id = $1 AND encounter_id = $2 AND id = $3
          AND status = 'settled'`,
      [input.accountId, input.encounterId, source.receivable_id, amount]
    );
    await client.query(
      `UPDATE encounter_financial_accounts
          SET financial_status = 'pending', paid_amount = 0, balance_due = $4,
              closed_by_user_id = NULL, closed_at = NULL, updated_at = clock_timestamp()
        WHERE account_id = $1 AND encounter_id = $2 AND id = $3
          AND financial_status = 'paid'`,
      [input.accountId, input.encounterId, source.financial_account_id, amount]
    );
    await client.query(
      `UPDATE billing_records
          SET status = 'open', updated_at = clock_timestamp()
        WHERE account_id = $1 AND encounter_id = $2 AND id = $3 AND status = 'settled'`,
      [input.accountId, input.encounterId, source.billing_record_id]
    );

    const reversalResult = await client.query<ReversalRow>(
      `INSERT INTO encounter_cash_receipt_reversals (
         id, account_id, receipt_id, encounter_id, billing_record_id,
         financial_account_id, receivable_id, receivable_payment_id,
         original_cash_register_id, reversal_cash_register_id,
         original_cash_movement_id, reversal_cash_movement_id,
         original_journal_entry_id, reversal_journal_entry_id,
         amount, currency, reason, reversed_by_user_id, reversed_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
         $15, 'BRL', $16, $17, clock_timestamp()
       ) RETURNING *`,
      [
        reversalId,
        input.accountId,
        source.id,
        input.encounterId,
        source.billing_record_id,
        source.financial_account_id,
        source.receivable_id,
        source.receivable_payment_id,
        source.cash_register_id,
        reversalRegister.id,
        source.cash_movement_id,
        reversalCashMovementId,
        source.journal_entry_id,
        reversalJournalEntryId,
        amount,
        input.reason,
        input.actorUserId
      ]
    );

    await transaction.audit.append({
      entityType: 'encounter_cash_receipt_reversal',
      entityId: reversalId,
      action: 'cash_receipt_reversed',
      reason: input.reason,
      metadata: {
        encounterId: input.encounterId,
        receiptId: source.id,
        billingRecordId: source.billing_record_id,
        financialAccountId: source.financial_account_id,
        receivableId: source.receivable_id,
        originalCashRegisterId: source.cash_register_id,
        reversalCashRegisterId: reversalRegister.id,
        originalCashMovementId: source.cash_movement_id,
        reversalCashMovementId,
        originalJournalEntryId: source.journal_entry_id,
        reversalJournalEntryId,
        amount,
        currency: 'BRL'
      }
    });
    await transaction.outbox.append({
      moduleName: 'financial',
      eventType: 'encounter.cash-receipt.reversed',
      payload: {
        reversalId,
        receiptId: source.id,
        encounterId: input.encounterId,
        billingRecordId: source.billing_record_id,
        financialAccountId: source.financial_account_id,
        receivableId: source.receivable_id,
        receivablePaymentId: source.receivable_payment_id,
        originalCashRegisterId: source.cash_register_id,
        reversalCashRegisterId: reversalRegister.id,
        originalCashMovementId: source.cash_movement_id,
        reversalCashMovementId,
        originalJournalEntryId: source.journal_entry_id,
        reversalJournalEntryId,
        amount,
        currency: 'BRL',
        reason: input.reason,
        reversedByUserId: input.actorUserId
      }
    });

    const created = reversalResult.rows[0];
    if (!created) {
      fail(
        'CASH_RECEIPT_REVERSAL_PERSISTENCE_FAILED',
        'Cash receipt reversal was not persisted',
        500
      );
    }
    return mapReversal(created);
  }

  async findByReceipt(
    accountId: string,
    receiptId: string
  ): Promise<EncounterCashReceiptReversal | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query<ReversalRow>(
        `SELECT *
           FROM encounter_cash_receipt_reversals
          WHERE account_id = $1 AND receipt_id = $2
          LIMIT 1`,
        [accountId, receiptId]
      );
      return result.rows[0] ? mapReversal(result.rows[0]) : null;
    });
  }
}
