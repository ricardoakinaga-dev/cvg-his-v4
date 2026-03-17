import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { users } from './users.js';

export const protocols = pgTable(
  'protocols',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    domain: text('domain'),
    specialty: text('specialty'),
    status: text('status').notNull().default('draft'),
    // FK to protocol_versions.id is created in SQL migration to avoid schema import cycle.
    currentPublishedVersionId: uuid('current_published_version_id'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountSlugUnique: uniqueIndex('uq_protocols_account_slug').on(table.accountId, table.slug),
    accountStatusIdx: index('idx_protocols_account_status').on(table.accountId, table.status),
    accountDomainSpecialtyIdx: index('idx_protocols_account_domain_specialty').on(
      table.accountId,
      table.domain,
      table.specialty
    ),
    statusChk: check(
      'protocols_status_chk',
      sql`${table.status} in ('draft', 'published')`
    )
  })
);
