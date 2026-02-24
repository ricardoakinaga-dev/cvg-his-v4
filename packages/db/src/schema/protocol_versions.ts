import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { protocols } from './protocols.js';
import { users } from './users.js';

export const protocolVersions = pgTable(
  'protocol_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    protocolId: uuid('protocol_id')
      .notNull()
      .references(() => protocols.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    status: text('status').notNull().default('draft'),
    contentJson: jsonb('content_json').$type<Record<string, unknown>>().notNull(),
    changeReason: text('change_reason'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    publishedByUserId: uuid('published_by_user_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    buildError: text('build_error'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    protocolVersionIdx: index('idx_protocol_versions_protocol_version').on(
      table.protocolId,
      table.versionNumber
    ),
    protocolVersionUnique: uniqueIndex('uq_protocol_versions_protocol_version_number').on(
      table.protocolId,
      table.versionNumber
    ),
    statusChk: check(
      'protocol_versions_status_chk',
      sql`${table.status} in ('draft', 'publishing', 'published', 'failed')`
    ),
    versionPositiveChk: check(
      'protocol_versions_version_number_positive_chk',
      sql`${table.versionNumber} > 0`
    )
  })
);
