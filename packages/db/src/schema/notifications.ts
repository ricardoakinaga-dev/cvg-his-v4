import { index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { encounters } from './encounters.js';
import { patients } from './patients.js';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    channel: varchar('channel', { length: 50 }).notNull().default('internal'),
    category: varchar('category', { length: 50 }).notNull(),
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
    recipientRoleCode: varchar('recipient_role_code', { length: 100 }),
    title: varchar('title', { length: 255 }).notNull(),
    message: varchar('message', { length: 2000 }).notNull(),
    severity: varchar('severity', { length: 20 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    createdByUserId: uuid('created_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true })
  },
  (table) => ({
    accountIdx: index('idx_notifications_account').on(table.accountId),
    statusIdx: index('idx_notifications_status').on(table.accountId, table.status),
    patientIdx: index('idx_notifications_patient').on(table.patientId),
    createdAtIdx: index('idx_notifications_created').on(table.accountId, table.createdAt)
  })
);

export const notificationJobs = pgTable(
  'notification_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true })
  },
  (table) => ({
    statusIdx: index('idx_notif_jobs_status').on(table.status),
    notificationIdx: index('idx_notif_jobs_notification').on(table.notificationId),
    scheduledIdx: index('idx_notif_jobs_scheduled').on(table.scheduledAt, table.status)
  })
);
