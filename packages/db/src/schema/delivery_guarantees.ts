import { sql } from 'drizzle-orm';
import {
  char,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const idempotencyRequests = pgTable(
  'idempotency_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    operation: varchar('operation', { length: 128 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    requestHash: char('request_hash', { length: 64 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('processing'),
    responseBody: jsonb('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull().default(sql`now() + interval '24 hours'`)
  },
  (table) => ({
    scopeUnique: uniqueIndex('idempotency_requests_scope_unique').on(
      table.accountId,
      table.operation,
      table.idempotencyKey
    ),
    expiryIdx: index('idempotency_requests_expiry_idx').on(table.expiresAt)
  })
);

export const inboxEvents = pgTable(
  'inbox_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    consumerName: varchar('consumer_name', { length: 128 }).notNull(),
    eventId: varchar('event_id', { length: 255 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    deliveryUnique: uniqueIndex('inbox_events_delivery_unique').on(
      table.accountId,
      table.consumerName,
      table.eventId
    ),
    processedIdx: index('inbox_events_account_processed_idx').on(
      table.accountId,
      table.processedAt
    )
  })
);
