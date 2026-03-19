import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { wards } from './wards.js';

export const beds = pgTable(
  'beds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    wardId: uuid('ward_id')
      .notNull()
      .references(() => wards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountWardActiveIdx: index('idx_beds_account_ward_active').on(
      table.accountId,
      table.wardId,
      table.isActive
    )
  })
);
