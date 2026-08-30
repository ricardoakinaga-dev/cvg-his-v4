import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { billingRecords } from './billing_records.js';
import { cashMovements, cashRegisters } from './cash.js';
import {
  encounterFinancialAccounts,
  encounterReceivablePayments,
  encounterReceivables
} from './encounter_financial_accounts.js';
import { encounterCashReceipts } from './encounter_cash_receipts.js';
import { encounters } from './encounters.js';
import { financialJournalEntries } from './financial_journal.js';
import { users } from './users.js';

export const encounterCashReceiptReversals = pgTable(
  'encounter_cash_receipt_reversals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    receiptId: uuid('receipt_id').notNull(),
    encounterId: uuid('encounter_id').notNull(),
    billingRecordId: text('billing_record_id').notNull(),
    financialAccountId: uuid('financial_account_id').notNull(),
    receivableId: uuid('receivable_id').notNull(),
    receivablePaymentId: uuid('receivable_payment_id').notNull(),
    originalCashRegisterId: uuid('original_cash_register_id').notNull(),
    reversalCashRegisterId: uuid('reversal_cash_register_id').notNull(),
    originalCashMovementId: uuid('original_cash_movement_id').notNull(),
    reversalCashMovementId: uuid('reversal_cash_movement_id').notNull(),
    originalJournalEntryId: uuid('original_journal_entry_id').notNull(),
    reversalJournalEntryId: uuid('reversal_journal_entry_id').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('BRL'),
    reason: text('reason').notNull(),
    reversedByUserId: uuid('reversed_by_user_id').notNull(),
    reversedAt: timestamp('reversed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdIdUnique: uniqueIndex('encounter_cash_receipt_reversals_account_id_id_unique').on(
      table.accountId,
      table.id
    ),
    accountReceiptUnique: uniqueIndex('encounter_cash_receipt_reversals_account_receipt_unique').on(
      table.accountId,
      table.receiptId
    ),
    accountReceiptFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_receipt_fk',
      columns: [table.accountId, table.receiptId],
      foreignColumns: [encounterCashReceipts.accountId, encounterCashReceipts.id]
    }).onDelete('restrict'),
    accountEncounterFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_encounter_fk',
      columns: [table.accountId, table.encounterId],
      foreignColumns: [encounters.accountId, encounters.id]
    }).onDelete('restrict'),
    accountBillingFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_billing_fk',
      columns: [table.accountId, table.billingRecordId],
      foreignColumns: [billingRecords.accountId, billingRecords.id]
    }).onDelete('restrict'),
    accountFinancialFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_financial_fk',
      columns: [table.accountId, table.financialAccountId],
      foreignColumns: [encounterFinancialAccounts.accountId, encounterFinancialAccounts.id]
    }).onDelete('restrict'),
    accountReceivableFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_receivable_fk',
      columns: [table.accountId, table.receivableId],
      foreignColumns: [encounterReceivables.accountId, encounterReceivables.id]
    }).onDelete('restrict'),
    accountPaymentFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_payment_fk',
      columns: [table.accountId, table.receivablePaymentId],
      foreignColumns: [encounterReceivablePayments.accountId, encounterReceivablePayments.id]
    }).onDelete('restrict'),
    accountOriginalRegisterFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_original_register_fk',
      columns: [table.accountId, table.originalCashRegisterId],
      foreignColumns: [cashRegisters.accountId, cashRegisters.id]
    }).onDelete('restrict'),
    accountReversalRegisterFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_reversal_register_fk',
      columns: [table.accountId, table.reversalCashRegisterId],
      foreignColumns: [cashRegisters.accountId, cashRegisters.id]
    }).onDelete('restrict'),
    accountOriginalMovementFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_original_movement_fk',
      columns: [table.accountId, table.originalCashMovementId],
      foreignColumns: [cashMovements.accountId, cashMovements.id]
    }).onDelete('restrict'),
    accountReversalMovementFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_reversal_movement_fk',
      columns: [table.accountId, table.reversalCashMovementId],
      foreignColumns: [cashMovements.accountId, cashMovements.id]
    }).onDelete('restrict'),
    accountOriginalJournalFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_original_journal_fk',
      columns: [table.accountId, table.originalJournalEntryId],
      foreignColumns: [financialJournalEntries.accountId, financialJournalEntries.id]
    }).onDelete('restrict'),
    accountReversalJournalFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_reversal_journal_fk',
      columns: [table.accountId, table.reversalJournalEntryId],
      foreignColumns: [financialJournalEntries.accountId, financialJournalEntries.id]
    }).onDelete('restrict'),
    accountUserFk: foreignKey({
      name: 'encounter_cash_receipt_reversals_account_user_fk',
      columns: [table.accountId, table.reversedByUserId],
      foreignColumns: [users.accountId, users.id]
    }).onDelete('restrict'),
    accountEncounterIdx: index('idx_encounter_cash_receipt_reversals_account_encounter').on(
      table.accountId,
      table.encounterId
    ),
    accountReversedAtIdx: index('idx_encounter_cash_receipt_reversals_account_reversed_at').on(
      table.accountId,
      table.reversedAt.desc()
    ),
    accountReceivableIdx: index('idx_encounter_cash_receipt_reversals_account_receivable').on(
      table.accountId,
      table.receivableId
    ),
    amountPositiveChk: check(
      'encounter_cash_receipt_reversals_amount_positive_chk',
      sql`${table.amount} > 0`
    ),
    currencyBrlChk: check(
      'encounter_cash_receipt_reversals_currency_brl_chk',
      sql`${table.currency} = 'BRL'`
    ),
    reasonChk: check(
      'encounter_cash_receipt_reversals_reason_chk',
      sql`char_length(btrim(${table.reason})) BETWEEN 1 AND 500`
    )
  })
);
