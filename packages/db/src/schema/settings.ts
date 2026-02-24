import { jsonb, pgTable, timestamp, uuid, text, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { users } from './users.js';

export const settings = pgTable(
  'settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    namespace: text('namespace').notNull(),
    key: text('key').notNull(),
    valueJson: jsonb('value_json').notNull().default({}),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountNamespaceKeyUnique: uniqueIndex('settings_account_namespace_key_unique').on(
      table.accountId,
      table.namespace,
      table.key
    ),
    accountNamespaceIdx: index('settings_account_namespace_idx').on(table.accountId, table.namespace)
  })
);

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
