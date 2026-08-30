import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { users } from './users.js';

export const webauthnCredentials = pgTable(
  'auth_webauthn_credentials',
  {
    credentialId: text('credential_id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    publicKey: text('public_key').notNull(),
    counter: bigint('counter', { mode: 'number' }).notNull().default(0),
    deviceType: varchar('device_type', { length: 16 })
      .$type<'platform' | 'cross-platform'>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    nickname: varchar('nickname', { length: 255 })
  },
  (table) => ({
    accountUserFk: foreignKey({
      columns: [table.accountId, table.userId],
      foreignColumns: [users.accountId, users.id],
      name: 'auth_webauthn_credentials_account_user_fk'
    }).onDelete('cascade'),
    accountUserIdx: index('idx_auth_webauthn_credentials_account_user').on(
      table.accountId,
      table.userId
    ),
    counterNonnegative: check(
      'auth_webauthn_credentials_counter_nonnegative',
      sql`${table.counter} >= 0`
    ),
    deviceTypeValid: check(
      'auth_webauthn_credentials_device_type_valid',
      sql`${table.deviceType} in ('platform', 'cross-platform')`
    )
  })
);
