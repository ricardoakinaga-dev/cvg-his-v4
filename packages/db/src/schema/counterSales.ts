import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { products } from './products.js';
import { services } from './services.js';

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
    ownerId: uuid('owner_id').references(() => accounts.id),
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
    createdAtIdx: index('idx_counter_sales_created_at').on(table.accountId, table.createdAt)
  })
);

// =====================
// Counter Sale Items
// =====================

export const counterSaleItems = pgTable(
  'counter_sale_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    counterSaleId: uuid('counter_sale_id')
      .notNull()
      .references(() => counterSales.id, { onDelete: 'cascade' }),
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
    itemTypeIdx: index('idx_csi_item_type').on(table.itemType)
  })
);

// =====================
// Counter Sale Payments
// =====================

export const counterSalePayments = pgTable(
  'counter_sale_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    counterSaleId: uuid('counter_sale_id')
      .notNull()
      .references(() => counterSales.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    method: counterSalePaymentMethodEnum('method').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    installments: integer('installments').notNull().default(1),
    reference: text('reference'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    saleIdx: index('idx_csp_counter_sale').on(table.counterSaleId),
    accountIdx: index('idx_csp_account').on(table.accountId),
    methodIdx: index('idx_csp_method').on(table.accountId, table.method)
  })
);
