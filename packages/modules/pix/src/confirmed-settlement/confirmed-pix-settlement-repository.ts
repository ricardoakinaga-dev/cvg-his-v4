import { createHash, randomUUID } from 'node:crypto';

import type { TenantTransactionContext } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';

export type ConfirmedPixProvider = 'local-pix' | 'mock' | 'pagarme';

export interface ApplyConfirmedPixSettlementInput {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly attemptId?: string;
  readonly provider: ConfirmedPixProvider;
  readonly providerEventId: string;
  readonly transactionId: string;
  readonly billingRecordId: string;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly confirmedAt: string;
}

export interface ConfirmedPixSettlementRecord {
  readonly id: string;
  readonly accountId: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
  readonly financialAccountId: string;
  readonly receivableId: string;
  readonly receivablePaymentId: string;
  readonly journalEntryId: string;
  readonly provider: ConfirmedPixProvider;
  readonly providerEventId: string;
  readonly transactionId: string;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly confirmedAt: string;
  readonly processedByUserId: string;
}

export interface ConfirmedPixSettlementRepository {
  apply(
    transaction: TenantTransactionContext,
    input: ApplyConfirmedPixSettlementInput
  ): Promise<ConfirmedPixSettlementRecord>;
}

export type ConfirmedPixSettlementCheckpoint =
  | 'after_inbox_claim'
  | 'after_financial_account_insert'
  | 'after_receivable_insert'
  | 'after_receivable_settlement'
  | 'after_receivable_payment_insert'
  | 'after_financial_account_settlement'
  | 'after_billing_settlement'
  | 'after_pix_settlement'
  | 'after_pix_staging'
  | 'after_attempt_confirmed_pending_apply'
  | 'after_attempt_settlement'
  | 'after_journal_entry_insert'
  | 'after_journal_lines_insert'
  | 'after_proof_insert'
  | 'after_audit_append'
  | 'after_outbox_append';

export interface DatabaseConfirmedPixSettlementRepositoryOptions {
  readonly onCheckpoint?: (
    checkpoint: ConfirmedPixSettlementCheckpoint
  ) => void | Promise<void>;
}

interface PixRow {
  readonly transaction_id: string;
  readonly provider: string;
  readonly billing_record_id: string | null;
  readonly amount: string;
  readonly currency: string;
  readonly status: string;
  readonly completed_at: string | Date | null;
  readonly provider_webhook_event_id: string | null;
  readonly billing_settlement_status: string;
  readonly cash_reconciliation_status: string;
  readonly cash_register_id: string | null;
  readonly cash_movement_id: string | null;
  readonly payment_attempt_id: string | null;
}

interface PaymentAttemptRow {
  readonly id: string;
  readonly account_id: string;
  readonly encounter_id: string;
  readonly billing_record_id: string;
  readonly provider_key: string;
  readonly state: string;
  readonly amount_cents: string;
  readonly currency: string;
}

interface BillingRow {
  readonly id: string;
  readonly encounter_id: string;
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

type ProofRow = Readonly<Record<string, unknown>>;

const INBOX_CONSUMER = 'confirmed-pix-settlement';
const PIX_BANK_ACCOUNT_CODE = '1.1.02-bancos-pix';
const CLINICAL_REVENUE_ACCOUNT_CODE = '3.1.01-receita-clinica';

function fail(code: string, message: string, statusCode: number): never {
  throw new AppError(code, message, statusCode);
}

function asIso(value: unknown): string {
  return new Date(value as string | Date).toISOString();
}

function moneyToCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

function providerInboxEventId(input: ApplyConfirmedPixSettlementInput): string {
  return createHash('sha256')
    .update(`${input.provider}\0${input.providerEventId}`)
    .digest('hex');
}

function mapProof(row: ProofRow): ConfirmedPixSettlementRecord {
  return Object.freeze({
    id: row.id as string,
    accountId: row.account_id as string,
    encounterId: row.encounter_id as string,
    billingRecordId: row.billing_record_id as string,
    financialAccountId: row.financial_account_id as string,
    receivableId: row.receivable_id as string,
    receivablePaymentId: row.receivable_payment_id as string,
    journalEntryId: row.journal_entry_id as string,
    provider: row.provider as ConfirmedPixProvider,
    providerEventId: row.provider_event_id as string,
    transactionId: row.transaction_id as string,
    amountCents: Number(row.amount_cents),
    currency: 'BRL',
    confirmedAt: asIso(row.confirmed_at),
    processedByUserId: row.processed_by_user_id as string
  });
}

function isSameConfirmation(
  record: ConfirmedPixSettlementRecord,
  input: ApplyConfirmedPixSettlementInput
): boolean {
  return record.accountId === input.accountId
    && record.provider === input.provider
    && record.providerEventId === input.providerEventId
    && record.transactionId === input.transactionId
    && record.billingRecordId === input.billingRecordId
    && record.amountCents === input.amountCents
    && record.currency === input.currency
    && record.confirmedAt === input.confirmedAt;
}

function assertPixMatches(pix: PixRow, input: ApplyConfirmedPixSettlementInput): void {
  const isAttemptSettlement = input.attemptId !== undefined;
  if (pix.provider !== input.provider) {
    fail('PIX_CONFIRMATION_PROVIDER_MISMATCH', 'PIX confirmation provider does not match', 409);
  }
  if (pix.billing_record_id !== input.billingRecordId) {
    fail('PIX_CONFIRMATION_BILLING_MISMATCH', 'PIX confirmation billing record does not match', 409);
  }
  if (
    (pix.status !== 'completed' || pix.completed_at === null)
    && !(isAttemptSettlement && pix.status === 'pending' && pix.completed_at === null)
  ) {
    fail('PIX_TRANSACTION_NOT_COMPLETED', 'PIX transaction is not completed', 409);
  }
  if (pix.currency !== input.currency) {
    fail('PIX_CONFIRMATION_CURRENCY_MISMATCH', 'PIX confirmation currency does not match', 409);
  }
  if (moneyToCents(pix.amount) !== input.amountCents) {
    fail('PIX_CONFIRMATION_AMOUNT_MISMATCH', 'PIX confirmation amount does not match', 409);
  }
  if (
    (!isAttemptSettlement || pix.status === 'completed')
    && asIso(pix.completed_at) !== input.confirmedAt
  ) {
    fail('PIX_CONFIRMATION_TIME_MISMATCH', 'PIX confirmation time does not match', 409);
  }
  if (isAttemptSettlement && pix.payment_attempt_id !== input.attemptId) {
    fail('PIX_PAYMENT_ATTEMPT_MISMATCH', 'PIX transaction is not linked to the payment attempt', 409);
  }
  if (
    pix.provider_webhook_event_id !== null
    && pix.provider_webhook_event_id !== input.providerEventId
  ) {
    fail('CONFIRMED_PIX_EVENT_CONFLICT', 'PIX transaction belongs to another provider event', 409);
  }
  if (!['pending', 'pending_billing', 'awaiting_payment'].includes(pix.billing_settlement_status)) {
    fail('PIX_TRANSACTION_ALREADY_RECONCILED', 'PIX transaction is not awaiting settlement', 409);
  }
  if (pix.cash_reconciliation_status !== 'pending') {
    fail('PIX_CASH_RECONCILIATION_CONFLICT', 'PIX transaction has an incompatible cash state', 409);
  }
  if (pix.cash_register_id !== null || pix.cash_movement_id !== null) {
    fail('PIX_CASH_RECONCILIATION_CONFLICT', 'PIX transaction cannot be linked to physical cash', 409);
  }
}

export class DatabaseConfirmedPixSettlementRepository
implements ConfirmedPixSettlementRepository {
  public constructor(
    private readonly options: DatabaseConfirmedPixSettlementRepositoryOptions = {}
  ) {}

  async apply(
    transaction: TenantTransactionContext,
    input: ApplyConfirmedPixSettlementInput
  ): Promise<ConfirmedPixSettlementRecord> {
    const inboxEventId = providerInboxEventId(input);
    const claimed = await transaction.inbox.claim(INBOX_CONSUMER, inboxEventId);
    if (!claimed) return this.#canonicalReplay(transaction, input);
    await this.#checkpoint('after_inbox_claim');

    const pixSnapshot = await this.#findPix(transaction, input, false);
    assertPixMatches(pixSnapshot, input);

    const billing = await this.#lockBilling(transaction, input);
    const encounter = await transaction.client.query<{ readonly status: string }>(
      `SELECT status
         FROM encounters
        WHERE account_id = $1 AND id = $2
        FOR SHARE`,
      [input.accountId, billing.encounter_id]
    );
    if (encounter.rows[0]?.status !== 'closed') {
      fail('ENCOUNTER_NOT_CLOSED', 'Encounter must be closed before PIX settlement', 409);
    }

    // Keep monetary values on the integer-cents path until PostgreSQL parses
    // the exact NUMERIC representation; never hand a binary float to SQL.
    const amount = (input.amountCents / 100).toFixed(2);
    const financialAccount = await this.#lockOrCreateFinancialAccount(
      transaction,
      input,
      billing.encounter_id,
      amount
    );
    const receivable = await this.#lockOrCreateReceivable(
      transaction,
      input,
      billing.encounter_id,
      financialAccount,
      amount
    );

    const lockedPix = await this.#findPix(transaction, input, true);
    assertPixMatches(lockedPix, input);
    // Persist the database value, including microseconds. JavaScript Date is
    // used only to compare the provider payload at millisecond precision.
    const settledAt = input.attemptId !== undefined && lockedPix.status === 'pending'
      ? input.confirmedAt
      : lockedPix.completed_at as string;

    if (input.attemptId !== undefined) {
      const attempt = await this.#lockPaymentAttempt(transaction, input, lockedPix, billing);
      await transaction.client.query(
        `UPDATE pix_transactions
            SET status = 'completed',
                completed_at = $3,
                provider_webhook_event_id = $4,
                billing_settlement_status = 'applied',
                billing_settled_at = $3,
                billing_settlement_error = NULL,
                cash_reconciliation_status = 'not_applicable',
                cash_reconciled_at = NULL,
                cash_reconciliation_error = NULL,
                cash_register_id = NULL,
                cash_movement_id = NULL,
                last_provider_sync_at = $3,
                updated_at = clock_timestamp()
          WHERE account_id = $1 AND transaction_id = $2`,
        [input.accountId, input.transactionId, settledAt, input.providerEventId]
      );
      await this.#checkpoint('after_pix_staging');
      await transaction.client.query(
        `UPDATE encounter_payment_attempts
            SET state = 'confirmed_pending_apply',
                version = version + 1,
                updated_at = clock_timestamp()
          WHERE account_id = $1 AND id = $2
            AND state IN ('pending_dispatch', 'awaiting_confirmation', 'confirmed_pending_apply')`,
        [input.accountId, attempt.id]
      );
      await this.#checkpoint('after_attempt_confirmed_pending_apply');
      await transaction.client.query(
        `UPDATE encounter_payment_attempts
            SET state = 'settled',
                version = version + 1,
                updated_at = clock_timestamp()
          WHERE account_id = $1 AND id = $2 AND state = 'confirmed_pending_apply'`,
        [input.accountId, attempt.id]
      );
      await this.#checkpoint('after_attempt_settlement');
    }

    const receiptId = randomUUID();
    const receivablePaymentId = randomUUID();
    const journalEntryId = randomUUID();

    await transaction.client.query(
      `UPDATE encounter_receivables
          SET status = 'settled', amount_paid = $4, amount_outstanding = 0,
              settled_at = $5, updated_at = clock_timestamp()
        WHERE account_id = $1 AND encounter_id = $2 AND id = $3`,
      [input.accountId, billing.encounter_id, receivable.id, amount, settledAt]
    );
    await this.#checkpoint('after_receivable_settlement');
    await transaction.client.query(
      `INSERT INTO encounter_receivable_payments (
         id, account_id, encounter_id, financial_account_id, receivable_id,
         amount_paid, paid_at, paid_by_user_id, notes,
         external_reference_type, external_reference_id
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8,
         'PIX settlement confirmed', 'pix_transaction', $9
       )`,
      [
        receivablePaymentId,
        input.accountId,
        billing.encounter_id,
        financialAccount.id,
        receivable.id,
        amount,
        settledAt,
        input.actorUserId,
        input.transactionId
      ]
    );
    await this.#checkpoint('after_receivable_payment_insert');
    await transaction.client.query(
      `UPDATE encounter_financial_accounts
          SET financial_status = 'paid', paid_amount = $4, balance_due = 0,
              closed_by_user_id = $5, closed_at = $6, updated_at = clock_timestamp()
        WHERE account_id = $1 AND encounter_id = $2 AND id = $3`,
      [
        input.accountId,
        billing.encounter_id,
        financialAccount.id,
        amount,
        input.actorUserId,
        settledAt
      ]
    );
    await this.#checkpoint('after_financial_account_settlement');
    await transaction.client.query(
      `UPDATE billing_records
          SET status = 'settled', updated_at = clock_timestamp()
        WHERE account_id = $1 AND encounter_id = $2 AND id = $3`,
      [input.accountId, billing.encounter_id, billing.id]
    );
    await this.#checkpoint('after_billing_settlement');
    if (input.attemptId === undefined) {
      await transaction.client.query(
        `UPDATE pix_transactions
            SET provider_webhook_event_id = $3,
                billing_settlement_status = 'applied',
                billing_settled_at = $4,
                billing_settlement_error = NULL,
                cash_reconciliation_status = 'not_applicable',
                cash_reconciled_at = NULL,
                cash_reconciliation_error = NULL,
                cash_register_id = NULL,
                cash_movement_id = NULL,
                last_provider_sync_at = $4,
                updated_at = clock_timestamp()
          WHERE account_id = $1 AND transaction_id = $2`,
        [input.accountId, input.transactionId, input.providerEventId, settledAt]
      );
    }
    await this.#checkpoint('after_pix_settlement');
    await transaction.client.query(
      `INSERT INTO financial_journal_entries (
         id, account_id, source_type, source_id, description, occurred_at, created_by_user_id
       ) VALUES (
         $1, $2, 'encounter_non_cash_receipt', $3, $4, $5, $6
       )`,
      [
        journalEntryId,
        input.accountId,
        receiptId,
        `Recebimento integral via PIX do atendimento ${billing.encounter_id}`,
        settledAt,
        input.actorUserId
      ]
    );
    await this.#checkpoint('after_journal_entry_insert');
    await transaction.client.query(
      `INSERT INTO financial_journal_lines (
         id, account_id, entry_id, account_code, debit, credit, memo
       ) VALUES
         ($1, $2, $3, $4, $6, 0, $7),
         ($5, $2, $3, $8, 0, $6, $7)`,
      [
        randomUUID(),
        input.accountId,
        journalEntryId,
        PIX_BANK_ACCOUNT_CODE,
        randomUUID(),
        amount,
        `PIX receipt ${receiptId}`,
        CLINICAL_REVENUE_ACCOUNT_CODE
      ]
    );
    await this.#checkpoint('after_journal_lines_insert');

    const proof = await transaction.client.query<ProofRow>(
      `INSERT INTO encounter_non_cash_receipts (
         id, account_id, encounter_id, billing_record_id, financial_account_id,
         receivable_id, receivable_payment_id, journal_entry_id, provider,
         provider_event_id, inbox_event_id, transaction_id, amount_cents, currency, confirmed_at,
         processed_by_user_id
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'BRL', $14, $15
       ) RETURNING *`,
      [
        receiptId,
        input.accountId,
        billing.encounter_id,
        billing.id,
        financialAccount.id,
        receivable.id,
        receivablePaymentId,
        journalEntryId,
        input.provider,
        input.providerEventId,
        inboxEventId,
        input.transactionId,
        input.amountCents,
        settledAt,
        input.actorUserId
      ]
    );
    await this.#checkpoint('after_proof_insert');

    await transaction.audit.append({
      entityType: 'encounter_non_cash_receipt',
      entityId: receiptId,
      action: 'non_cash_received',
      metadata: {
        encounterId: billing.encounter_id,
        billingRecordId: billing.id,
        provider: input.provider,
        providerEventId: input.providerEventId,
        transactionId: input.transactionId,
        amountCents: input.amountCents,
        currency: input.currency
      }
    });
    await this.#checkpoint('after_audit_append');
    await transaction.outbox.append({
      moduleName: 'financial',
      eventType: 'encounter.non-cash-receipt.created',
      payload: {
        receiptId,
        encounterId: billing.encounter_id,
        billingRecordId: billing.id,
        financialAccountId: financialAccount.id,
        receivableId: receivable.id,
        receivablePaymentId,
        journalEntryId,
        provider: input.provider,
        providerEventId: input.providerEventId,
        transactionId: input.transactionId,
        amountCents: input.amountCents,
        currency: input.currency,
        confirmedAt: asIso(settledAt)
      }
    });
    await this.#checkpoint('after_outbox_append');

    const created = proof.rows[0];
    if (!created) {
      fail('CONFIRMED_PIX_PERSISTENCE_FAILED', 'Confirmed PIX settlement was not persisted', 500);
    }
    return mapProof(created);
  }

  async #canonicalReplay(
    transaction: TenantTransactionContext,
    input: ApplyConfirmedPixSettlementInput
  ): Promise<ConfirmedPixSettlementRecord> {
    const result = await transaction.client.query<ProofRow>(
      `SELECT proof.*, pix.payment_attempt_id
         FROM encounter_non_cash_receipts AS proof
         JOIN pix_transactions AS pix
           ON pix.account_id = proof.account_id
          AND pix.transaction_id = proof.transaction_id
        WHERE proof.account_id = $1 AND proof.provider = $2 AND proof.provider_event_id = $3
        LIMIT 1`,
      [input.accountId, input.provider, input.providerEventId]
    );
    const row = result.rows[0];
    if (!row) {
      fail('CONFIRMED_PIX_EVENT_CONFLICT', 'PIX provider event was already claimed', 409);
    }
    const record = mapProof(row);
    if (!isSameConfirmation(record, input)) {
      fail('CONFIRMED_PIX_EVENT_CONFLICT', 'PIX provider event payload does not match', 409);
    }
    const storedAttemptId = row['payment_attempt_id'] as string | null | undefined;
    if ((input.attemptId ?? null) !== (storedAttemptId ?? null)) {
      fail('CONFIRMED_PIX_EVENT_CONFLICT', 'PIX provider event attempt binding does not match', 409);
    }
    return record;
  }

  async #checkpoint(checkpoint: ConfirmedPixSettlementCheckpoint): Promise<void> {
    await this.options.onCheckpoint?.(checkpoint);
  }

  async #findPix(
    transaction: TenantTransactionContext,
    input: ApplyConfirmedPixSettlementInput,
    lock: boolean
  ): Promise<PixRow> {
    const result = await transaction.client.query<PixRow>(
      `SELECT transaction_id, provider, billing_record_id, amount, currency, status,
              completed_at::TEXT AS completed_at, provider_webhook_event_id, billing_settlement_status,
              cash_reconciliation_status, cash_register_id, cash_movement_id, payment_attempt_id
         FROM pix_transactions
        WHERE account_id = $1 AND transaction_id = $2
        ${lock ? 'FOR UPDATE' : ''}`,
      [input.accountId, input.transactionId]
    );
    const pix = result.rows[0];
    if (!pix) fail('PIX_TRANSACTION_NOT_FOUND', 'PIX transaction not found', 404);
    return pix;
  }

  async #lockPaymentAttempt(
    transaction: TenantTransactionContext,
    input: ApplyConfirmedPixSettlementInput,
    pix: PixRow,
    billing: BillingRow
  ): Promise<PaymentAttemptRow> {
    if (!input.attemptId || pix.payment_attempt_id !== input.attemptId) {
      fail('PIX_PAYMENT_ATTEMPT_MISMATCH', 'PIX transaction is not linked to the payment attempt', 409);
    }
    const result = await transaction.client.query<PaymentAttemptRow>(
      `SELECT id, account_id, encounter_id, billing_record_id, provider_key, state,
              amount_cents::TEXT AS amount_cents, currency
         FROM encounter_payment_attempts
        WHERE account_id = $1 AND id = $2
        FOR UPDATE`,
      [input.accountId, input.attemptId]
    );
    const attempt = result.rows[0];
    if (!attempt) fail('PIX_PAYMENT_ATTEMPT_NOT_FOUND', 'PIX payment attempt not found', 404);
    if (
      attempt.encounter_id !== billing.encounter_id
      || attempt.billing_record_id !== input.billingRecordId
      || attempt.provider_key !== input.provider
      || Number(attempt.amount_cents) !== input.amountCents
      || attempt.currency !== input.currency
      || billing.active_payment_attempt_id !== input.attemptId
      || !['pending_dispatch', 'awaiting_confirmation', 'confirmed_pending_apply'].includes(attempt.state)
    ) {
      if (attempt.provider_key !== input.provider) {
        fail(
          'PIX_PAYMENT_ATTEMPT_PROVIDER_MISMATCH',
          'PIX payment attempt provider does not match',
          409
        );
      }
      if (billing.active_payment_attempt_id !== input.attemptId) {
        fail(
          'PIX_PAYMENT_ATTEMPT_RESERVATION_MISMATCH',
          'PIX payment attempt is not the active billing reservation',
          409
        );
      }
      fail('PIX_PAYMENT_ATTEMPT_NOT_ELIGIBLE', 'PIX payment attempt is not eligible for settlement', 409);
    }
    return attempt;
  }

  async #lockBilling(
    transaction: TenantTransactionContext,
    input: ApplyConfirmedPixSettlementInput
  ): Promise<BillingRow> {
    const result = await transaction.client.query<BillingRow>(
      `SELECT id, encounter_id, status, subtotal_amount, currency, active_payment_attempt_id
         FROM billing_records
        WHERE account_id = $1 AND id = $2
        FOR UPDATE`,
      [input.accountId, input.billingRecordId]
    );
    const billing = result.rows[0];
    if (!billing) fail('BILLING_RECORD_NOT_FOUND', 'Billing record not found', 404);
    if (billing.status !== 'open') {
      fail('BILLING_NOT_RECEIVABLE', 'Billing record is not eligible for PIX settlement', 409);
    }
    if (billing.currency !== input.currency || moneyToCents(billing.subtotal_amount) <= 0) {
      fail('BILLING_NOT_RECEIVABLE', 'Billing must contain a positive BRL balance', 409);
    }
    if (moneyToCents(billing.subtotal_amount) !== input.amountCents) {
      fail('PIX_CONFIRMATION_AMOUNT_MISMATCH', 'PIX confirmation does not match billing total', 409);
    }
    const items = await transaction.client.query<{ readonly count: string }>(
      `SELECT COUNT(*)::TEXT AS count
         FROM billing_items
        WHERE account_id = $1 AND billing_record_id = $2`,
      [input.accountId, billing.id]
    );
    if (Number(items.rows[0]?.count ?? 0) < 1) {
      fail('BILLING_ITEMS_REQUIRED', 'Billing must contain at least one item before settlement', 409);
    }
    return billing;
  }

  async #lockOrCreateFinancialAccount(
    transaction: TenantTransactionContext,
    input: ApplyConfirmedPixSettlementInput,
    encounterId: string,
    amount: string
  ): Promise<FinancialAccountRow> {
    const result = await transaction.client.query<FinancialAccountRow>(
      `SELECT id, financial_status, total_snapshot, paid_amount, balance_due
         FROM encounter_financial_accounts
        WHERE account_id = $1 AND encounter_id = $2
        FOR UPDATE`,
      [input.accountId, encounterId]
    );
    const existing = result.rows[0];
    if (existing) {
      if (
        existing.financial_status !== 'pending'
        || moneyToCents(existing.total_snapshot) !== input.amountCents
        || moneyToCents(existing.paid_amount) !== 0
        || moneyToCents(existing.balance_due) !== input.amountCents
      ) {
        fail('FINANCIAL_ACCOUNT_NOT_RECEIVABLE', 'Financial account cannot be settled by PIX', 409);
      }
      return existing;
    }

    const inserted = await transaction.client.query<FinancialAccountRow>(
      `INSERT INTO encounter_financial_accounts (
         id, account_id, encounter_id, financial_status, subtotal_snapshot,
         discount_total_snapshot, total_snapshot, paid_amount, balance_due,
         snapshot_json, created_at, updated_at
       ) VALUES (
         $1, $2, $3, 'pending', $4, 0, $4, 0, $4, $5, clock_timestamp(), clock_timestamp()
       ) RETURNING id, financial_status, total_snapshot, paid_amount, balance_due`,
      [
        randomUUID(),
        input.accountId,
        encounterId,
        amount,
        JSON.stringify({ source: 'confirmed_pix_settlement', amountCents: input.amountCents })
      ]
    );
    await this.#checkpoint('after_financial_account_insert');
    return inserted.rows[0] as FinancialAccountRow;
  }

  async #lockOrCreateReceivable(
    transaction: TenantTransactionContext,
    input: ApplyConfirmedPixSettlementInput,
    encounterId: string,
    financialAccount: FinancialAccountRow,
    amount: string
  ): Promise<ReceivableRow> {
    const result = await transaction.client.query<ReceivableRow>(
      `SELECT id, status, amount_original, amount_paid, amount_outstanding
         FROM encounter_receivables
        WHERE account_id = $1 AND encounter_id = $2 AND financial_account_id = $3
        ORDER BY installment_number
        FOR UPDATE`,
      [input.accountId, encounterId, financialAccount.id]
    );
    if (result.rows.length > 1) {
      fail('RECEIVABLE_NOT_ELIGIBLE', 'Installment receivables require a dedicated payment flow', 409);
    }
    const existing = result.rows[0];
    if (existing) {
      if (
        existing.status !== 'open'
        || moneyToCents(existing.amount_original) !== input.amountCents
        || moneyToCents(existing.amount_paid) !== 0
        || moneyToCents(existing.amount_outstanding) !== input.amountCents
      ) {
        fail('RECEIVABLE_NOT_ELIGIBLE', 'Receivable cannot be settled by PIX', 409);
      }
      return existing;
    }

    const inserted = await transaction.client.query<ReceivableRow>(
      `INSERT INTO encounter_receivables (
         id, account_id, encounter_id, financial_account_id, installment_number,
         installment_label, status, amount_original, amount_paid, amount_outstanding,
         issued_at, notes, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, 1, 'Parcela 1/1', 'open', $5, 0, $5,
         $6, 'PIX settlement confirmed', clock_timestamp(), clock_timestamp()
       ) RETURNING id, status, amount_original, amount_paid, amount_outstanding`,
      [randomUUID(), input.accountId, encounterId, financialAccount.id, amount, input.confirmedAt]
    );
    await this.#checkpoint('after_receivable_insert');
    return inserted.rows[0] as ReceivableRow;
  }
}
