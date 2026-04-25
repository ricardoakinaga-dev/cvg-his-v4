import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const responsibilityTerms = pgTable(
  'responsibility_terms',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }).notNull(),
    code: varchar('code', { length: 80 }),
    usageContext: varchar('usage_context', { length: 32 }).notNull().default('atendimento'),
    content: text('content').notNull(),
    active: boolean('active').notNull().default(true),
    requiresOwnerSignature: boolean('requires_owner_signature').notNull().default(true),
    requiresWitnessSignature: boolean('requires_witness_signature').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountTitleIdx: index('idx_responsibility_terms_account_title').on(
      table.accountId,
      table.title
    ),
    accountActiveIdx: index('idx_responsibility_terms_account_active').on(
      table.accountId,
      table.active
    ),
    accountUsageIdx: index('idx_responsibility_terms_account_usage').on(
      table.accountId,
      table.usageContext
    ),
    accountCodeUniqueIdx: uniqueIndex('uq_responsibility_terms_account_code')
      .on(table.accountId, table.code)
      .where(sql`${table.code} is not null`)
  })
);
