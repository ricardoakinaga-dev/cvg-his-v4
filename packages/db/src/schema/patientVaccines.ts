import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { patients } from './patients.js';

export const patientVaccines = pgTable(
  'patient_vaccines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    vaccineName: text('vaccine_name').notNull(),
    manufacturer: text('manufacturer'),
    batchNumber: text('batch_number'),
    administrationDate: date('administration_date', { mode: 'date' }).notNull(),
    nextDoseDate: date('next_dose_date', { mode: 'date' }),
    veterinarianName: text('veterinarian_name'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountPatientIdx: index('idx_patient_vaccines_account_patient').on(table.accountId, table.patientId),
    patientIdx: index('idx_patient_vaccines_patient').on(table.patientId),
    nextDoseIdx: index('idx_patient_vaccines_next_dose').on(table.accountId, table.nextDoseDate)
  })
);
