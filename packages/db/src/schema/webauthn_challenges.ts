import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { users } from './users.js';

export const webauthnChallenges = pgTable(
  'auth_webauthn_challenges',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    purpose: varchar('purpose', { length: 32 })
      .$type<'registration' | 'authentication'>()
      .notNull(),
    challenge: text('challenge').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.accountId, table.userId, table.purpose],
      name: 'auth_webauthn_challenges_pk'
    }),
    accountUserFk: foreignKey({
      columns: [table.accountId, table.userId],
      foreignColumns: [users.accountId, users.id],
      name: 'auth_webauthn_challenges_account_user_fk'
    }).onDelete('cascade'),
    expiryIdx: index('idx_auth_webauthn_challenges_expires_at').on(table.expiresAt),
    accountUserIdx: index('idx_auth_webauthn_challenges_account_user').on(
      table.accountId,
      table.userId
    ),
    purposeValid: check(
      'auth_webauthn_challenges_purpose_valid',
      sql`${table.purpose} in ('registration', 'authentication')`
    ),
    challengeNonempty: check(
      'auth_webauthn_challenges_challenge_nonempty',
      sql`length(${table.challenge}) > 0`
    )
  })
);
