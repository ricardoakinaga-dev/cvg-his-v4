import { sql } from 'drizzle-orm';
import {
  char,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { billingRecords } from './billing_records.js';
import { cashMovements, cashRegisters } from './cash.js';
import { encounters } from './encounters.js';
import { financialJournalEntries } from './financial_journal.js';
import { owners } from './owners.js';
import { patients } from './patients.js';
import { schedulingQueueEntries } from './scheduling_queue_entries.js';
import { users } from './users.js';

// =====================
// Enums
// =====================

export const counterSaleStatusEnum = pgEnum('counter_sale_status', ['open', 'closed', 'cancelled']);

export const counterSaleItemTypeEnum = pgEnum('counter_sale_item_type', ['product', 'service']);

export const counterSalePaymentMethodEnum = pgEnum('counter_sale_payment_method', [
  'cash',
  'credit_card',
  'debit_card',
  'pix',
  'bank_transfer',
  'check',
  'insurance',
  'other'
]);

// =====================
// Counter Sales
// =====================

export const counterSales = pgTable(
  'counter_sales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    number: text('number').notNull(),
    ownerId: uuid('owner_id'),
    patientId: uuid('patient_id'),
    encounterId: uuid('encounter_id'),
    queueEntryId: text('queue_entry_id'),
    billingRecordId: text('billing_record_id'),
    status: counterSaleStatusEnum('status').notNull().default('open'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
    paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    balanceDue: numeric('balance_due', { precision: 12, scale: 2 }).notNull().default('0'),
    notes: text('notes'),
    openedByUserId: uuid('opened_by_user_id').notNull(),
    closedByUserId: uuid('closed_by_user_id'),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdx: index('idx_counter_sales_account').on(table.accountId),
    statusIdx: index('idx_counter_sales_status').on(table.accountId, table.status),
    numberIdx: index('idx_counter_sales_number').on(table.accountId, table.number),
    createdAtIdx: index('idx_counter_sales_created_at').on(table.accountId, table.createdAt),
    accountIdIdUnique: uniqueIndex('counter_sales_account_id_unique').on(table.accountId, table.id),
    accountOwnerFk: foreignKey({
      name: 'counter_sales_account_owner_fk',
      columns: [table.accountId, table.ownerId],
      foreignColumns: [owners.accountId, owners.id]
    }).onDelete('restrict'),
    accountPatientFk: foreignKey({
      name: 'counter_sales_account_patient_fk',
      columns: [table.accountId, table.patientId],
      foreignColumns: [patients.accountId, patients.id]
    }).onDelete('restrict'),
    accountEncounterFk: foreignKey({
      name: 'counter_sales_account_encounter_fk',
      columns: [table.accountId, table.encounterId],
      foreignColumns: [encounters.accountId, encounters.id]
    }).onDelete('restrict'),
    accountQueueEntryFk: foreignKey({
      name: 'counter_sales_account_queue_entry_fk',
      columns: [table.accountId, table.queueEntryId],
      foreignColumns: [schedulingQueueEntries.accountId, schedulingQueueEntries.id]
    }).onDelete('restrict'),
    accountBillingRecordFk: foreignKey({
      name: 'counter_sales_account_billing_record_fk',
      columns: [table.accountId, table.billingRecordId],
      foreignColumns: [billingRecords.accountId, billingRecords.id]
    }).onDelete('restrict'),
    accountOpenedByFk: foreignKey({
      name: 'counter_sales_account_opened_by_fk',
      columns: [table.accountId, table.openedByUserId],
      foreignColumns: [users.accountId, users.id]
    }).onDelete('restrict'),
    accountClosedByFk: foreignKey({
      name: 'counter_sales_account_closed_by_fk',
      columns: [table.accountId, table.closedByUserId],
      foreignColumns: [users.accountId, users.id]
    }).onDelete('restrict')
  })
);

// =====================
// Counter Sale Items
// =====================

export const counterSaleItems = pgTable(
  'counter_sale_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    counterSaleId: uuid('counter_sale_id').notNull(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    itemType: counterSaleItemTypeEnum('item_type').notNull(),
    catalogItemId: uuid('catalog_item_id'),
    nameSnapshot: text('name_snapshot').notNull(),
    codeSnapshot: text('code_snapshot'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull().default(1),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    saleIdx: index('idx_csi_counter_sale').on(table.counterSaleId),
    accountIdx: index('idx_csi_account').on(table.accountId),
    itemTypeIdx: index('idx_csi_item_type').on(table.itemType),
    accountSaleFk: foreignKey({
      name: 'counter_sale_items_account_sale_fk',
      columns: [table.accountId, table.counterSaleId],
      foreignColumns: [counterSales.accountId, counterSales.id]
    }).onDelete('cascade')
  })
);

// =====================
// Counter Sale Payments
// =====================

export const counterSalePayments = pgTable(
  'counter_sale_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    counterSaleId: uuid('counter_sale_id').notNull(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    method: counterSalePaymentMethodEnum('method').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    installments: integer('installments').notNull().default(1),
    reference: text('reference'),
    notes: text('notes'),
    idempotencyKeyHash: char('idempotency_key_hash', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    saleIdx: index('idx_csp_counter_sale').on(table.counterSaleId),
    accountIdx: index('idx_csp_account').on(table.accountId),
    methodIdx: index('idx_csp_method').on(table.accountId, table.method),
    accountSaleFk: foreignKey({
      name: 'counter_sale_payments_account_sale_fk',
      columns: [table.accountId, table.counterSaleId],
      foreignColumns: [counterSales.accountId, counterSales.id]
    }).onDelete('cascade'),
    idempotencyKeyHashChk: check(
      'counter_sale_payments_idempotency_key_hash_chk',
      sql`${table.idempotencyKeyHash} is null or ${table.idempotencyKeyHash} ~ '^[0-9a-f]{64}$'`
    ),
    accountIdempotencyUnique: uniqueIndex('counter_sale_payments_account_idempotency_unique')
      .on(table.accountId, table.idempotencyKeyHash)
      .where(sql`${table.idempotencyKeyHash} is not null`)
  })
);

// Immutable financial proof emitted exactly once when a counter sale closes.
export const counterSaleReceipts = pgTable(
  'counter_sale_receipts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    counterSaleId: uuid('counter_sale_id').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('BRL'),
    receivedByUserId: uuid('received_by_user_id').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    cashRegisterId: uuid('cash_register_id'),
    cashMovementId: uuid('cash_movement_id'),
    journalEntryId: uuid('journal_entry_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountSaleUnique: uniqueIndex('counter_sale_receipts_account_sale_unique').on(
      table.accountId,
      table.counterSaleId
    ),
    receivedAtIdx: index('counter_sale_receipts_account_received_at_idx').on(
      table.accountId,
      table.receivedAt
    ),
    accountSaleFk: foreignKey({
      name: 'counter_sale_receipts_account_sale_fk',
      columns: [table.accountId, table.counterSaleId],
      foreignColumns: [counterSales.accountId, counterSales.id]
    }).onDelete('restrict'),
    accountUserFk: foreignKey({
      name: 'counter_sale_receipts_account_user_fk',
      columns: [table.accountId, table.receivedByUserId],
      foreignColumns: [users.accountId, users.id]
    }).onDelete('restrict'),
    accountRegisterFk: foreignKey({
      name: 'counter_sale_receipts_account_register_fk',
      columns: [table.accountId, table.cashRegisterId],
      foreignColumns: [cashRegisters.accountId, cashRegisters.id]
    }).onDelete('restrict'),
    accountMovementFk: foreignKey({
      name: 'counter_sale_receipts_account_movement_fk',
      columns: [table.accountId, table.cashMovementId],
      foreignColumns: [cashMovements.accountId, cashMovements.id]
    }).onDelete('restrict'),
    accountJournalFk: foreignKey({
      name: 'counter_sale_receipts_account_journal_fk',
      columns: [table.accountId, table.journalEntryId],
      foreignColumns: [financialJournalEntries.accountId, financialJournalEntries.id]
    }).onDelete('restrict')
  })
);
