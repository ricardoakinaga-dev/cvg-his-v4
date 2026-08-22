import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { users } from './users.js';

export const financialJournalEntries = pgTable(
  'financial_journal_entries',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    sourceType: varchar('source_type', { length: 80 }).notNull(),
    sourceId: varchar('source_id', { length: 255 }).notNull(),
    description: varchar('description', { length: 500 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdIdUnique: uniqueIndex('financial_journal_entries_account_id_unique').on(
      table.accountId,
      table.id
    ),
    sourceUnique: uniqueIndex('financial_journal_entries_source_unique').on(
      table.accountId,
      table.sourceType,
      table.sourceId
    ),
    accountDateIdx: index('idx_financial_journal_entries_account_date').on(
      table.accountId,
      table.occurredAt.desc()
    ),
    accountSourceIdx: index('idx_financial_journal_entries_account_source').on(
      table.accountId,
      table.sourceType,
      table.sourceId
    )
  })
);

export const financialJournalLines = pgTable(
  'financial_journal_lines',
  {
    id: uuid('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    entryId: uuid('entry_id').notNull(),
    accountCode: varchar('account_code', { length: 80 }).notNull(),
    debit: numeric('debit', { precision: 14, scale: 2 }).notNull().default('0'),
    credit: numeric('credit', { precision: 14, scale: 2 }).notNull().default('0'),
    memo: varchar('memo', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountEntryFk: foreignKey({
      name: 'financial_journal_lines_entry_fk',
      columns: [table.accountId, table.entryId],
      foreignColumns: [financialJournalEntries.accountId, financialJournalEntries.id]
    }).onDelete('cascade'),
    accountCodeIdx: index('idx_financial_journal_lines_account_code').on(
      table.accountId,
      table.accountCode,
      table.createdAt.desc()
    ),
    amountsChk: check(
      'financial_journal_lines_amounts_chk',
      sql`${table.debit} >= 0 AND ${table.credit} >= 0 AND ((${table.debit} > 0 AND ${table.credit} = 0) OR (${table.credit} > 0 AND ${table.debit} = 0))`
    )
  })
);
