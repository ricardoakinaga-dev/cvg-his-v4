import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

import { users } from './users.js';
import { accounts } from './accounts.js';

export const mfaCredentials = pgTable(
  'mfa_credentials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    secretEncrypted: text('secret_encrypted').notNull(),
    isActive: boolean('is_active').notNull().default(false),
    recoveryCodesHash: jsonb('recovery_codes_hash').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    lastTotpCounter: integer('last_totp_counter'),
    setupExpiresAt: timestamp('setup_expires_at', { withTimezone: true }),
    secretKeyVersion: text('secret_key_version'),
    lastRecoveryCodesRegeneratedAt: timestamp('last_recovery_codes_regenerated_at', {
      withTimezone: true
    })
  },
  (table) => ({
    userIdUnique: uniqueIndex('mfa_credentials_user_id_unique').on(table.userId),
    userIdIdx: index('idx_mfa_credentials_user_id').on(table.userId),
    accountUserIdx: index('idx_mfa_credentials_account_user').on(table.accountId, table.userId)
  })
);
