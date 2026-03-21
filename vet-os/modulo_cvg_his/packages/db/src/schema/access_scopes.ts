import { boolean, index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const accessScopes = pgTable(
  'access_scopes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    scopeType: varchar('scope_type', { length: 32 }).notNull(),
    scopeKey: varchar('scope_key', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 512 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountTypeKeyUnique: uniqueIndex('access_scopes_account_type_key_unique').on(
      table.accountId,
      table.scopeType,
      table.scopeKey
    ),
    accountTypeIdx: index('access_scopes_account_type_idx').on(table.accountId, table.scopeType)
  })
);
