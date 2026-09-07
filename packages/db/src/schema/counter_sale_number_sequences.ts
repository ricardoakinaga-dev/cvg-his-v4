import { sql } from 'drizzle-orm';
import { check, numeric, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const counterSaleNumberSequences = pgTable(
  'counter_sale_number_sequences',
  {
    accountId: uuid('account_id')
      .primaryKey()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    nextNumber: numeric('next_number', { precision: 20, scale: 0 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    nextNumberCheck: check(
      'counter_sale_number_sequences_next_number_chk',
      sql`${table.nextNumber} >= 0 AND ${table.nextNumber} <= 9007199254740991`
    )
  })
);
