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
import { encounters } from './encounters.js';
import { financialJournalEntries } from './financial_journal.js';
import { users } from './users.js';

export const encounterCashReceipts = pgTable(
  'encounter_cash_receipts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id').notNull(),
    billingRecordId: text('billing_record_id').notNull(),
    financialAccountId: uuid('financial_account_id').notNull(),
    receivableId: uuid('receivable_id').notNull(),
    receivablePaymentId: uuid('receivable_payment_id').notNull(),
    cashRegisterId: uuid('cash_register_id').notNull(),
    cashMovementId: uuid('cash_movement_id').notNull(),
    journalEntryId: uuid('journal_entry_id').notNull(),
    receivedByUserId: uuid('received_by_user_id').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('BRL'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountEncounterUnique: uniqueIndex('encounter_cash_receipts_account_encounter_unique').on(
      table.accountId,
      table.encounterId
    ),
    receivablePaymentUnique: uniqueIndex('encounter_cash_receipts_receivable_payment_unique').on(
      table.receivablePaymentId
    ),
    cashMovementUnique: uniqueIndex('encounter_cash_receipts_cash_movement_unique').on(
      table.cashMovementId
    ),
    journalEntryUnique: uniqueIndex('encounter_cash_receipts_journal_entry_unique').on(
      table.journalEntryId
    ),
    accountEncounterFk: foreignKey({
      name: 'encounter_cash_receipts_account_encounter_fk',
      columns: [table.accountId, table.encounterId],
      foreignColumns: [encounters.accountId, encounters.id]
    }).onDelete('restrict'),
    accountBillingFk: foreignKey({
      name: 'encounter_cash_receipts_account_billing_fk',
      columns: [table.accountId, table.billingRecordId],
      foreignColumns: [billingRecords.accountId, billingRecords.id]
    }).onDelete('restrict'),
    accountFinancialFk: foreignKey({
      name: 'encounter_cash_receipts_account_financial_fk',
      columns: [table.accountId, table.financialAccountId],
      foreignColumns: [encounterFinancialAccounts.accountId, encounterFinancialAccounts.id]
    }).onDelete('restrict'),
    accountReceivableFk: foreignKey({
      name: 'encounter_cash_receipts_account_receivable_fk',
      columns: [table.accountId, table.receivableId],
      foreignColumns: [encounterReceivables.accountId, encounterReceivables.id]
    }).onDelete('restrict'),
    accountReceivablePaymentFk: foreignKey({
      name: 'encounter_cash_receipts_account_receivable_payment_fk',
      columns: [table.accountId, table.receivablePaymentId],
      foreignColumns: [encounterReceivablePayments.accountId, encounterReceivablePayments.id]
    }).onDelete('restrict'),
    accountRegisterFk: foreignKey({
      name: 'encounter_cash_receipts_account_register_fk',
      columns: [table.accountId, table.cashRegisterId],
      foreignColumns: [cashRegisters.accountId, cashRegisters.id]
    }).onDelete('restrict'),
    accountMovementFk: foreignKey({
      name: 'encounter_cash_receipts_account_movement_fk',
      columns: [table.accountId, table.cashMovementId],
      foreignColumns: [cashMovements.accountId, cashMovements.id]
    }).onDelete('restrict'),
    accountJournalFk: foreignKey({
      name: 'encounter_cash_receipts_account_journal_fk',
      columns: [table.accountId, table.journalEntryId],
      foreignColumns: [financialJournalEntries.accountId, financialJournalEntries.id]
    }).onDelete('restrict'),
    accountUserFk: foreignKey({
      name: 'encounter_cash_receipts_account_user_fk',
      columns: [table.accountId, table.receivedByUserId],
      foreignColumns: [users.accountId, users.id]
    }).onDelete('restrict'),
    accountReceivedAtIdx: index('idx_encounter_cash_receipts_account_received_at').on(
      table.accountId,
      table.receivedAt.desc()
    ),
    accountBillingIdx: index('idx_encounter_cash_receipts_account_billing').on(
      table.accountId,
      table.billingRecordId
    ),
    accountFinancialIdx: index('idx_encounter_cash_receipts_account_financial').on(
      table.accountId,
      table.financialAccountId
    ),
    amountPositiveChk: check(
      'encounter_cash_receipts_amount_positive_chk',
      sql`${table.amount} > 0`
    ),
    currencyBrlChk: check(
      'encounter_cash_receipts_currency_brl_chk',
      sql`${table.currency} = 'BRL'`
    )
  })
);
