import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { billingRecords } from './billing_records.js';
import {
  encounterFinancialAccounts,
  encounterReceivablePayments,
  encounterReceivables
} from './encounter_financial_accounts.js';
import { encounters } from './encounters.js';
import { financialJournalEntries } from './financial_journal.js';
import { pixTransactions } from './pix_transactions.js';
import { users } from './users.js';

export const encounterNonCashReceipts = pgTable(
  'encounter_non_cash_receipts',
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
    journalEntryId: uuid('journal_entry_id').notNull(),
    provider: varchar('provider', { length: 32 }).notNull(),
    providerEventId: varchar('provider_event_id', { length: 255 }).notNull(),
    inboxEventId: varchar('inbox_event_id', { length: 64 }).notNull(),
    transactionId: varchar('transaction_id', { length: 255 }).notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull(),
    processedByUserId: uuid('processed_by_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountProviderEventUnique: uniqueIndex(
      'encounter_non_cash_receipts_account_provider_event_unique'
    ).on(table.accountId, table.provider, table.providerEventId),
    accountTransactionUnique: uniqueIndex(
      'encounter_non_cash_receipts_account_transaction_unique'
    ).on(table.accountId, table.transactionId),
    accountBillingUnique: uniqueIndex('encounter_non_cash_receipts_account_billing_unique').on(
      table.accountId,
      table.billingRecordId
    ),
    receivablePaymentUnique: uniqueIndex(
      'encounter_non_cash_receipts_receivable_payment_unique'
    ).on(table.receivablePaymentId),
    journalEntryUnique: uniqueIndex('encounter_non_cash_receipts_journal_entry_unique').on(
      table.journalEntryId
    ),
    accountEncounterFk: foreignKey({
      name: 'encounter_non_cash_receipts_account_encounter_fk',
      columns: [table.accountId, table.encounterId],
      foreignColumns: [encounters.accountId, encounters.id]
    }).onDelete('restrict'),
    accountBillingFk: foreignKey({
      name: 'encounter_non_cash_receipts_account_billing_fk',
      columns: [table.accountId, table.billingRecordId],
      foreignColumns: [billingRecords.accountId, billingRecords.id]
    }).onDelete('restrict'),
    accountFinancialFk: foreignKey({
      name: 'encounter_non_cash_receipts_account_financial_fk',
      columns: [table.accountId, table.financialAccountId],
      foreignColumns: [encounterFinancialAccounts.accountId, encounterFinancialAccounts.id]
    }).onDelete('restrict'),
    accountReceivableFk: foreignKey({
      name: 'encounter_non_cash_receipts_account_receivable_fk',
      columns: [table.accountId, table.receivableId],
      foreignColumns: [encounterReceivables.accountId, encounterReceivables.id]
    }).onDelete('restrict'),
    accountReceivablePaymentFk: foreignKey({
      name: 'encounter_non_cash_receipts_account_receivable_payment_fk',
      columns: [table.accountId, table.receivablePaymentId],
      foreignColumns: [encounterReceivablePayments.accountId, encounterReceivablePayments.id]
    }).onDelete('restrict'),
    accountJournalFk: foreignKey({
      name: 'encounter_non_cash_receipts_account_journal_fk',
      columns: [table.accountId, table.journalEntryId],
      foreignColumns: [financialJournalEntries.accountId, financialJournalEntries.id]
    }).onDelete('restrict'),
    accountPixTransactionFk: foreignKey({
      name: 'encounter_non_cash_receipts_account_pix_transaction_fk',
      columns: [table.accountId, table.transactionId],
      foreignColumns: [pixTransactions.accountId, pixTransactions.transactionId]
    }).onDelete('restrict'),
    accountUserFk: foreignKey({
      name: 'encounter_non_cash_receipts_account_user_fk',
      columns: [table.accountId, table.processedByUserId],
      foreignColumns: [users.accountId, users.id]
    }).onDelete('restrict'),
    accountConfirmedAtIdx: index('idx_encounter_non_cash_receipts_account_confirmed_at').on(
      table.accountId,
      table.confirmedAt.desc()
    ),
    accountEncounterIdx: index('idx_encounter_non_cash_receipts_account_encounter').on(
      table.accountId,
      table.encounterId
    ),
    accountFinancialIdx: index('idx_encounter_non_cash_receipts_account_financial').on(
      table.accountId,
      table.financialAccountId
    ),
    accountReceivableIdx: index('idx_encounter_non_cash_receipts_account_receivable').on(
      table.accountId,
      table.receivableId
    ),
    amountPositiveChk: check(
      'encounter_non_cash_receipts_amount_cents_positive_chk',
      sql`${table.amountCents} > 0`
    ),
    currencyBrlChk: check(
      'encounter_non_cash_receipts_currency_brl_chk',
      sql`${table.currency} = 'BRL'`
    ),
    providerChk: check(
      'encounter_non_cash_receipts_provider_chk',
      sql`${table.provider} in ('local-pix', 'mock', 'pagarme')`
    ),
    inboxEventIdChk: check(
      'encounter_non_cash_receipts_inbox_event_id_chk',
      sql`${table.inboxEventId} ~ '^[a-f0-9]{64}$'`
    )
  })
);
