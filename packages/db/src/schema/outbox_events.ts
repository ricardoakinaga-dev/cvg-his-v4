import { bigint, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    correlationId: varchar('correlation_id', { length: 255 }).notNull(),
    moduleName: varchar('module_name', { length: 100 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    error: text('error'),
    leaseOwner: varchar('lease_owner', { length: 160 }),
    leaseToken: uuid('lease_token'),
    leaseVersion: bigint('lease_version', { mode: 'number' }).notNull().default(0),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull()
  },
  (table) => ({
    deliveryClaimIdx: index('outbox_events_delivery_claim_idx').on(
      table.accountId,
      table.status,
      table.scheduledAt,
      table.leaseExpiresAt
    )
  })
);
