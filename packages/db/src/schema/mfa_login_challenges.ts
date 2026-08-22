import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  pgTable,
  smallint,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { users } from './users.js';

export const mfaLoginChallenges = pgTable(
  'auth_mfa_login_challenges',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    generation: uuid('generation').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attemptWindowStartedAt: timestamp('attempt_window_started_at', {
      withTimezone: true
    }).notNull().defaultNow(),
    attemptCount: smallint('attempt_count').notNull().default(0),
    maxAttempts: smallint('max_attempts').notNull(),
    trackingWindowSeconds: integer('tracking_window_seconds').notNull(),
    lockoutDurationSeconds: integer('lockout_duration_seconds').notNull(),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.accountId, table.userId],
      name: 'auth_mfa_login_challenges_pk'
    }),
    accountUserFk: foreignKey({
      columns: [table.accountId, table.userId],
      foreignColumns: [users.accountId, users.id],
      name: 'auth_mfa_login_challenges_account_user_fk'
    }).onDelete('cascade'),
    expiresAtIdx: index('idx_auth_mfa_login_challenges_expires_at').on(table.expiresAt),
    attemptCountNonnegative: check(
      'auth_mfa_login_challenges_attempt_count_nonnegative',
      sql`${table.attemptCount} >= 0`
    ),
    maxAttemptsPositive: check(
      'auth_mfa_login_challenges_max_attempts_positive',
      sql`${table.maxAttempts} > 0`
    ),
    trackingWindowPositive: check(
      'auth_mfa_login_challenges_tracking_window_positive',
      sql`${table.trackingWindowSeconds} > 0`
    ),
    lockoutDurationPositive: check(
      'auth_mfa_login_challenges_lockout_duration_positive',
      sql`${table.lockoutDurationSeconds} > 0`
    ),
    attemptLimit: check(
      'auth_mfa_login_challenges_attempt_limit',
      sql`${table.attemptCount} <= ${table.maxAttempts}`
    )
  })
);
