import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { users } from './users.js';

export const dsrTypeEnum = pgEnum('dsr_type', [
  'data_export',
  'data_deletion',
  'data_anonymization',
  'data_rectification',
  'data_access',
  'data_portability',
  'consent_revocation'
]);

export const dsrStatusEnum = pgEnum('dsr_status', [
  'pending',
  'in_progress',
  'completed',
  'rejected',
  'cancelled'
]);

export const dataSubjectRequests = pgTable(
  'data_subject_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').notNull(),
    subjectType: text('subject_type').notNull(),
    requestType: dsrTypeEnum('request_type').notNull(),
    status: dsrStatusEnum('status').notNull().default('pending'),
    requestedBy: uuid('requested_by')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedBy: uuid('completed_by').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    rejectionReason: text('rejection_reason'),
    resultJson: jsonb('result_json').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountSubjectIdx: index('idx_dsr_account_subject').on(
      table.accountId,
      table.subjectId,
      table.subjectType
    ),
    accountStatusIdx: index('idx_dsr_account_status').on(table.accountId, table.status),
    accountRequestedAtIdx: index('idx_dsr_account_requested_at').on(
      table.accountId,
      table.requestedAt
    )
  })
);
