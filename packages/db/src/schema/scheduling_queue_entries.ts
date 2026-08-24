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
    encounterId: uuid('encounter_id'),
    entryType: text('entry_type').notNull().default('standard'),
    reason: text('reason').notNull(),
    priority: text('priority').notNull().default('medium'),
    status: text('status').notNull().default('waiting'),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull(),
    calledAt: timestamp('called_at', { withTimezone: true }),
    currentSector: text('current_sector'),
    currentResponsibleUserId: text('current_responsible_user_id'),
    currentResponsibleStaffId: text('current_responsible_staff_id'),
    nextSector: text('next_sector'),
    operationalStatus: text('operational_status'),
    clinicalStatus: text('clinical_status'),
    billingStatus: text('billing_status'),
    handoffStatus: text('handoff_status'),
    lastTransferredAt: timestamp('last_transferred_at', { withTimezone: true }),
    lastTransferredByUserId: text('last_transferred_by_user_id'),
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

export const schedulingQueueTransfers = pgTable(
  'scheduling_queue_transfers',
  {
    id: text('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    queueEntryId: text('queue_entry_id')
      .notNull()
      .references(() => schedulingQueueEntries.id, { onDelete: 'cascade' }),
    encounterId: text('encounter_id'),
    fromSector: text('from_sector').notNull(),
    toSector: text('to_sector').notNull(),
    sentByUserId: text('sent_by_user_id').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
    receivedByUserId: text('received_by_user_id'),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    responsibleUserId: text('responsible_user_id'),
    responsibleStaffId: text('responsible_staff_id'),
    nextSector: text('next_sector'),
    reason: text('reason').notNull(),
    urgency: text('urgency').notNull().default('medium'),
    billingRecordId: text('billing_record_id'),
    counterSaleId: uuid('counter_sale_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountSentAtIdx: index('idx_scheduling_queue_transfers_account_sent_at').on(
      table.accountId,
      table.sentAt
    ),
    queueEntryIdx: index('idx_scheduling_queue_transfers_queue_entry').on(
      table.queueEntryId,
      table.sentAt
    )
  })
);
