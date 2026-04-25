import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const breeds = pgTable(
  'breeds',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    code: varchar('code', { length: 80 }),
    species: varchar('species', { length: 32 }).notNull().default('canine'),
    description: text('description'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountNameIdx: index('idx_breeds_account_name').on(table.accountId, table.name),
    accountSpeciesIdx: index('idx_breeds_account_species').on(table.accountId, table.species),
    accountActiveIdx: index('idx_breeds_account_active').on(table.accountId, table.active),
    accountCodeUniqueIdx: uniqueIndex('uq_breeds_account_code')
      .on(table.accountId, table.code)
      .where(sql`${table.code} is not null`)
  })
);
