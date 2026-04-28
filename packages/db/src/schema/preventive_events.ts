import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const preventiveEvents = pgTable(
  'preventive_events',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    patientId: varchar('patient_id', { length: 255 }),
    ownerId: varchar('owner_id', { length: 255 }),
    clientName: varchar('client_name', { length: 160 }).notNull(),
    animalName: varchar('animal_name', { length: 160 }).notNull(),
    eventDate: date('event_date').notNull(),
    itemType: varchar('item_type', { length: 32 }).notNull().default('vaccine'),
    description: varchar('description', { length: 255 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('scheduled'),
    observation: text('observation'),
    executedAt: timestamp('executed_at', { withTimezone: true }),
    executedObservation: text('executed_observation'),
    rescheduledFromId: varchar('rescheduled_from_id', { length: 255 }),
    reminderEmailPreparedAt: timestamp('reminder_email_prepared_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountDateIdx: index('idx_preventive_events_account_date').on(table.accountId, table.eventDate),
    accountStatusIdx: index('idx_preventive_events_account_status').on(table.accountId, table.status),
    accountClientIdx: index('idx_preventive_events_account_client').on(table.accountId, table.clientName),
    accountAnimalIdx: index('idx_preventive_events_account_animal').on(table.accountId, table.animalName),
    accountPatientIdx: index('idx_preventive_events_account_patient').on(table.accountId, table.patientId),
    accountOwnerIdx: index('idx_preventive_events_account_owner').on(table.accountId, table.ownerId)
  })
);
