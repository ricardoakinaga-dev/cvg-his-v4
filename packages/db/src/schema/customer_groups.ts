import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const customerGroups = pgTable(
  'customer_groups',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    code: varchar('code', { length: 80 }),
    segment: varchar('segment', { length: 80 }),
    discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    paymentTermDays: integer('payment_term_days').notNull().default(0),
    creditLimitAmount: numeric('credit_limit_amount', { precision: 12, scale: 2 }),
    description: text('description'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountNameIdx: index('idx_customer_groups_account_name').on(table.accountId, table.name),
    accountSegmentIdx: index('idx_customer_groups_account_segment').on(table.accountId, table.segment),
    accountActiveIdx: index('idx_customer_groups_account_active').on(table.accountId, table.active),
    accountCodeUniqueIdx: uniqueIndex('uq_customer_groups_account_code')
      .on(table.accountId, table.code)
      .where(sql`${table.code} is not null`)
  })
);
