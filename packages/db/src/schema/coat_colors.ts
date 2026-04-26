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

export const coatColors = pgTable(
  'coat_colors',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    code: varchar('code', { length: 80 }),
    colorGroup: varchar('color_group', { length: 80 }),
    hexColor: varchar('hex_color', { length: 16 }),
    description: text('description'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountNameIdx: index('idx_coat_colors_account_name').on(table.accountId, table.name),
    accountGroupIdx: index('idx_coat_colors_account_group').on(table.accountId, table.colorGroup),
    accountActiveIdx: index('idx_coat_colors_account_active').on(table.accountId, table.active),
    accountCodeUniqueIdx: uniqueIndex('uq_coat_colors_account_code')
      .on(table.accountId, table.code)
      .where(sql`${table.code} is not null`)
  })
);
