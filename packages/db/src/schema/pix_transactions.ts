import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { encounterPaymentAttempts } from './encounter_payment_attempts.js';

export const pixTransactions = pgTable(
  'pix_transactions',
  {
    transactionId: varchar('transaction_id', { length: 255 }).primaryKey(),
    provider: varchar('provider', { length: 32 }).notNull(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    billingRecordId: varchar('billing_record_id', { length: 255 }),
    paymentAttemptId: uuid('payment_attempt_id'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    description: varchar('description', { length: 255 }).notNull(),
    qrCodePayload: text('qr_code_payload').notNull(),
    qrCodeBase64: text('qr_code_base64').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    providerTransactionId: varchar('provider_transaction_id', { length: 255 }),
    providerConfirmationId: varchar('provider_confirmation_id', { length: 255 }),
    providerWebhookEventId: varchar('provider_webhook_event_id', { length: 255 }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    lastProviderSyncAt: timestamp('last_provider_sync_at', { withTimezone: true }),
    billingSettlementStatus: varchar('billing_settlement_status', { length: 32 })
      .notNull()
      .default('not_applicable'),
    billingSettledAt: timestamp('billing_settled_at', { withTimezone: true }),
    billingSettlementError: text('billing_settlement_error'),
    cashReconciliationStatus: varchar('cash_reconciliation_status', { length: 32 })
      .notNull()
      .default('pending'),
    cashReconciledAt: timestamp('cash_reconciled_at', { withTimezone: true }),
    cashReconciliationError: text('cash_reconciliation_error'),
    cashRegisterId: varchar('cash_register_id', { length: 255 }),
    cashMovementId: varchar('cash_movement_id', { length: 255 })
  },
  (table) => ({
    accountTransactionUnique: uniqueIndex('idx_pix_transactions_account_transaction_unique').on(
      table.accountId,
      table.transactionId
    ),
    accountProviderEventUnique: uniqueIndex('uidx_pix_transactions_account_provider_event')
      .on(table.accountId, table.provider, table.providerWebhookEventId)
      .where(sql`${table.providerWebhookEventId} IS NOT NULL`),
    accountPaymentAttemptUnique: uniqueIndex(
      'uidx_pix_transactions_account_payment_attempt'
    )
      .on(table.accountId, table.paymentAttemptId)
      .where(sql`${table.paymentAttemptId} IS NOT NULL`),
    accountPaymentAttemptFk: foreignKey({
      name: 'pix_transactions_account_payment_attempt_fk',
      columns: [table.accountId, table.paymentAttemptId],
      foreignColumns: [encounterPaymentAttempts.accountId, encounterPaymentAttempts.id]
    }).onDelete('restrict'),
    providerTransactionIdx: index('idx_pix_transactions_provider_tx').on(
      table.provider,
      table.providerTransactionId
    ),
    accountStatusIdx: index('idx_pix_transactions_account_status').on(
      table.accountId,
      table.status
    ),
    billingRecordIdx: index('idx_pix_transactions_billing_record').on(table.billingRecordId)
  })
);
