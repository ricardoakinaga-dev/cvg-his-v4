import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { patients } from './patients.js';
import { owners } from './owners.js';
import { users } from './users.js';

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
]);

export const appointmentTypeEnum = pgEnum('appointment_type', [
  'consultation',
  'vaccination',
  'surgery',
  'exam',
  'return',
  'other'
]);

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id, { onDelete: 'cascade' }),
    professionalUserId: uuid('professional_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    status: appointmentStatusEnum('status').notNull().default('scheduled'),
    type: appointmentTypeEnum('type').notNull().default('consultation'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountStartIdx: index('idx_appointments_account_start').on(table.accountId, table.startAt),
    accountProfessionalIdx: index('idx_appointments_account_professional').on(
      table.accountId,
      table.professionalUserId,
      table.startAt
    ),
    accountPatientIdx: index('idx_appointments_account_patient').on(table.accountId, table.patientId),
    accountStatusIdx: index('idx_appointments_account_status').on(table.accountId, table.status)
  })
);
