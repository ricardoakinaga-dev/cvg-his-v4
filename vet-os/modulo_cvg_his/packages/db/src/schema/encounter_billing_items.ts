import { index, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { encounters } from './encounters.js';
import { users } from './users.js';

export const billingItemTypeEnum = pgEnum('billing_item_type', ['service', 'product']);

export const encounterBillingItems = pgTable(
  'encounter_billing_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    itemType: billingItemTypeEnum('item_type').notNull(),
    catalogItemId: uuid('catalog_item_id'),
    nameSnapshot: text('name_snapshot').notNull(),
    codeSnapshot: text('code_snapshot'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull().default(1),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
    notes: text('notes'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    updatedByUserId: uuid('updated_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    encounterIdx: index('idx_ebi_account_encounter').on(table.accountId, table.encounterId),
    typeIdx: index('idx_ebi_account_type').on(table.accountId, table.itemType)
  })
);
