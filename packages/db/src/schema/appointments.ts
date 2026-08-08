import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { patients } from './patients.js';
import { owners } from './owners.js';
import { users } from './users.js';
import { staff } from './staff.js';
import { services } from './services.js';

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'scheduled',
  'checked_in',
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
      .references(() => users.id, { onDelete: 'restrict' }),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    status: appointmentStatusEnum('status').notNull().default('scheduled'),
    type: appointmentTypeEnum('type').notNull().default('consultation'),
    notes: text('notes'),
    visitType: varchar('visit_type', { length: 16 }).notNull().default('scheduled'),
    reason: text('reason').notNull(),
    practitionerStaffId: uuid('practitioner_staff_id').references(() => staff.id, {
      onDelete: 'restrict'
    }),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'restrict' }),
    unit: varchar('unit', { length: 120 }),
    specialty: varchar('specialty', { length: 120 }),
    resourceLabel: varchar('resource_label', { length: 120 }),
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
    accountStatusIdx: index('idx_appointments_account_status').on(table.accountId, table.status),
    accountPractitionerIdx: index('idx_appointments_account_practitioner_start').on(
      table.accountId,
      table.practitionerStaffId,
      table.startAt
    ),
    accountServiceIdx: index('idx_appointments_account_service_start').on(
      table.accountId,
      table.serviceId,
      table.startAt
    ),
    accountPatientFk: foreignKey({
      name: 'appointments_account_patient_fk',
      columns: [table.accountId, table.patientId],
      foreignColumns: [patients.accountId, patients.id]
    }).onDelete('cascade'),
    accountPatientOwnerFk: foreignKey({
      name: 'appointments_account_patient_owner_fk',
      columns: [table.accountId, table.patientId, table.ownerId],
      foreignColumns: [patients.accountId, patients.id, patients.ownerId]
    }).onDelete('cascade'),
    accountOwnerFk: foreignKey({
      name: 'appointments_account_owner_fk',
      columns: [table.accountId, table.ownerId],
      foreignColumns: [owners.accountId, owners.id]
    }).onDelete('cascade'),
    accountProfessionalUserFk: foreignKey({
      name: 'appointments_account_professional_user_fk',
      columns: [table.accountId, table.professionalUserId],
      foreignColumns: [users.accountId, users.id]
    }).onDelete('restrict'),
    accountPractitionerStaffFk: foreignKey({
      name: 'appointments_account_practitioner_staff_fk',
      columns: [table.accountId, table.practitionerStaffId],
      foreignColumns: [staff.accountId, staff.id]
    }).onDelete('restrict'),
    accountServiceFk: foreignKey({
      name: 'appointments_account_service_fk',
      columns: [table.accountId, table.serviceId],
      foreignColumns: [services.accountId, services.id]
    }).onDelete('restrict'),
    timeRangeChk: check('appointments_time_range_chk', sql`${table.endAt} > ${table.startAt}`),
    visitTypeChk: check(
      'appointments_visit_type_chk',
      sql`${table.visitType} IN ('walk_in', 'scheduled', 'return')`
    )
  })
);
