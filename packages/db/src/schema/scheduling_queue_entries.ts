import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const schedulingQueueEntries = pgTable(
  'scheduling_queue_entries',
  {
    id: text('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    patientId: text('patient_id').notNull(),
    ownerId: text('owner_id').notNull(),
    appointmentId: text('appointment_id'),
    encounterId: text('encounter_id'),
    reason: text('reason').notNull(),
    priority: text('priority').notNull().default('medium'),
    status: text('status').notNull().default('waiting'),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull(),
    calledAt: timestamp('called_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountCheckedInIdx: index('idx_scheduling_queue_account_checked_in').on(
      table.accountId,
      table.checkedInAt
    ),
    accountStatusIdx: index('idx_scheduling_queue_account_status').on(
      table.accountId,
      table.status
    ),
    accountPriorityIdx: index('idx_scheduling_queue_account_priority').on(
      table.accountId,
      table.priority,
      table.checkedInAt
    ),
    encounterIdx: index('idx_scheduling_queue_encounter').on(table.encounterId)
  })
);
