import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { users } from './users.js';

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorRole: varchar('actor_role', { length: 64 }),
    actorRoles: jsonb('actor_roles').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: varchar('entity_id', { length: 128 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    correlationId: varchar('correlation_id', { length: 255 }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    beforeJson: jsonb('before_json').$type<Record<string, unknown> | null>(),
    afterJson: jsonb('after_json').$type<Record<string, unknown> | null>(),
    reason: text('reason'),
    requestId: varchar('request_id', { length: 128 })
  },
  (table) => ({
    createdAtIdx: index('audit_events_created_at_idx').on(table.createdAt),
    occurredAtIdx: index('audit_events_occurred_at_idx').on(table.occurredAt),
    entityIdx: index('audit_events_entity_idx').on(table.entityType, table.entityId),
    accountCreatedAtIdx: index('audit_events_account_created_at_idx').on(table.accountId, table.createdAt),
    correlationIdx: index('audit_events_correlation_id_idx').on(table.correlationId)
  })
);
