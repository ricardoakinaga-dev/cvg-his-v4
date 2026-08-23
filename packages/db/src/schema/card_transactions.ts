import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  numeric,
  primaryKey,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { billingRecords } from './billing_records.js';

export const cardTransactions = pgTable(
  'card_transactions',
  {
    transactionId: varchar('transaction_id', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 32 }).notNull(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    billingRecordId: text('billing_record_id'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    description: varchar('description', { length: 255 }).notNull(),
    installments: integer('installments').notNull().default(1),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    capturedAt: timestamp('captured_at', { withTimezone: true }),
    lastProviderSyncAt: timestamp('last_provider_sync_at', { withTimezone: true }),
    providerOrderId: varchar('provider_order_id', { length: 255 }),
    providerChargeId: varchar('provider_charge_id', { length: 255 }),
    providerAuthorizationCode: varchar('provider_authorization_code', { length: 255 }),
    providerReferenceId: varchar('provider_reference_id', { length: 255 }),
    failureReason: text('failure_reason'),
    cardHolderName: varchar('card_holder_name', { length: 255 }),
    cardBrand: varchar('card_brand', { length: 64 }),
    cardLast4: varchar('card_last4', { length: 4 }),
    billingSettlementStatus: varchar('billing_settlement_status', { length: 32 })
      .notNull()
      .default('not_applicable'),
    billingSettledAt: timestamp('billing_settled_at', { withTimezone: true }),
    billingSettlementError: text('billing_settlement_error')
  },
  (table) => ({
    primaryKey: primaryKey({
      name: 'card_transactions_pkey',
      columns: [table.accountId, table.transactionId]
    }),
    accountStatusIdx: index('idx_card_transactions_account_status').on(
      table.accountId,
      table.status
    ),
    providerReferenceIdx: index('idx_card_transactions_provider_reference').on(
      table.provider,
      table.providerReferenceId
    ),
    billingRecordIdx: index('idx_card_transactions_billing_record').on(
      table.accountId,
      table.billingRecordId
    ),
    billingRecordFk: foreignKey({
      name: 'card_transactions_account_billing_record_fk',
      columns: [table.accountId, table.billingRecordId],
      foreignColumns: [billingRecords.accountId, billingRecords.id]
    }).onDelete('restrict'),
    currencyChk: check('card_transactions_currency_chk', sql`${table.currency} = 'BRL'`),
    installmentsChk: check(
      'card_transactions_installments_chk',
      sql`${table.installments} BETWEEN 1 AND 24`
    ),
    amountChk: check('card_transactions_amount_chk', sql`${table.amount} >= 0`),
    cardLast4Chk: check(
      'card_transactions_last4_chk',
      sql`${table.cardLast4} IS NULL OR ${table.cardLast4} ~ '^[0-9]{4}$'`
    )
  })
);
