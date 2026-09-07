import { pgTable, uuid, text, char, jsonb, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';

/** Dispatch journal: stores a fingerprint and sanitized results, never card credentials. */
export const cardCreationAttempts = pgTable('card_creation_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  creationKey: text('creation_key').notNull(),
  fingerprint: char('fingerprint', { length: 64 }).notNull(),
  billingRecordId: text('billing_record_id'),
  providerResult: jsonb('provider_result'),
  response: jsonb('response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  accountKey: unique().on(table.accountId, table.creationKey),
  billingIdx: index('card_creation_billing_idx').on(table.accountId, table.billingRecordId)
}));
