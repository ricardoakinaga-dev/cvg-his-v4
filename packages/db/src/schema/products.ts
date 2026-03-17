import { sql } from 'drizzle-orm';
import { index, numeric, pgTable, text, timestamp, uniqueIndex, uuid, boolean } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code'),
    description: text('description'),
    basePrice: numeric('base_price', { precision: 12, scale: 2 }).notNull().default('0'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountNameIdx: index('idx_products_account_name').on(table.accountId, table.name),
    accountActiveIdx: index('idx_products_account_active').on(table.accountId, table.active),
    accountCodeUniqueIdx: uniqueIndex('uq_products_account_code')
      .on(table.accountId, table.code)
      .where(sql`${table.code} is not null`)
  })
);
