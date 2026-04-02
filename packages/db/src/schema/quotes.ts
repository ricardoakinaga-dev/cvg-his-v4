import {
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

// =====================
// Enums
// =====================

export const quoteStatusEnum = pgEnum('quote_status', [
  'draft',
  'approved',
  'rejected',
  'expired',
  'cancelled'
]);

export const quoteItemTypeEnum = pgEnum('quote_item_type', ['product', 'service']);

// =====================
// Quotes
// =====================

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    number: text('number').notNull(),
    ownerId: uuid('owner_id'),
    status: quoteStatusEnum('status').notNull().default('draft'),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
    notes: text('notes'),
    createdByUserId: uuid('created_by_user_id').notNull(),
    convertedToSaleId: uuid('converted_to_sale_id'),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdx: index('idx_quotes_account').on(table.accountId),
    statusIdx: index('idx_quotes_status').on(table.accountId, table.status),
    numberIdx: index('idx_quotes_number').on(table.accountId, table.number),
    createdAtIdx: index('idx_quotes_created_at').on(table.accountId, table.createdAt)
  })
);

// =====================
// Quote Items
// =====================

export const quoteItems = pgTable(
  'quote_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quotes.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    itemType: quoteItemTypeEnum('item_type').notNull(),
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
    quoteIdx: index('idx_qi_quote').on(table.quoteId),
    accountIdx: index('idx_qi_account').on(table.accountId),
    itemTypeIdx: index('idx_qi_item_type').on(table.itemType)
  })
);
