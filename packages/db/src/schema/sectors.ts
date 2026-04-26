import { boolean, index, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const sectors = pgTable(
  'sectors',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: varchar('account_id', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    name: text('name').notNull(),
    kind: varchar('kind', { length: 50 }).notNull().default('other'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountActiveIdx: index('idx_sectors_account_active').on(table.accountId, table.active),
    accountCodeUnique: uniqueIndex('idx_sectors_account_code_unique').on(
      table.accountId,
      table.code
    )
  })
);
