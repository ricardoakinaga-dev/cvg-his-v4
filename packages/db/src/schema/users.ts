import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { units } from './units.js';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id').references(() => units.id, { onDelete: 'set null' }),
    username: varchar('username', { length: 128 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    principalKind: varchar('principal_kind', { length: 16 })
      .$type<'human' | 'service'>()
      .notNull()
      .default('human'),
    interactiveLoginEnabled: boolean('interactive_login_enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountEmailUnique: uniqueIndex('users_account_email_unique').on(table.accountId, table.email),
    accountUsernameUnique: uniqueIndex('users_account_username_unique').on(
      table.accountId,
      table.username
    ),
    accountIdIdUnique: uniqueIndex('idx_users_account_id_id_unique').on(table.accountId, table.id),
    principalKindChk: check(
      'users_principal_kind_chk',
      sql`${table.principalKind} in ('human', 'service')`
    ),
    servicePrincipalInteractiveLoginChk: check(
      'users_service_principal_interactive_login_chk',
      sql`${table.principalKind} <> 'service' or ${table.interactiveLoginEnabled} = false`
    )
  })
);
