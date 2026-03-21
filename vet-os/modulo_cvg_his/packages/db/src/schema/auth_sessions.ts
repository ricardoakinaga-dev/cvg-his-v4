import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { units } from './units.js';
import { users } from './users.js';

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id').references(() => units.id, { onDelete: 'set null' }),
    authMethod: varchar('auth_method', { length: 32 }).notNull().default('password'),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: varchar('user_agent', { length: 512 }),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: varchar('revoked_reason', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdx: index('auth_sessions_account_idx').on(table.accountId, table.createdAt),
    userIdx: index('auth_sessions_user_idx').on(table.userId, table.createdAt),
    activeIdx: index('auth_sessions_active_idx').on(table.userId, table.revokedAt, table.expiresAt)
  })
);
