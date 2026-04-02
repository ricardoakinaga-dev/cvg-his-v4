import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const triageRecords = pgTable(
  'triage_records',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    encounterId: text('encounter_id').notNull(),
    patientId: text('patient_id').notNull(),
    priority: text('priority').notNull(),
    chiefComplaint: text('chief_complaint').notNull(),
    initialNotes: text('initial_notes'),
    alertsJson: text('alerts_json').notNull(),
    destination: text('destination').notNull(),
    triagedBy: text('triaged_by').notNull(),
    triagedAt: timestamp('triaged_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull()
  },
  (table) => ({
    accountCreatedIdx: index('idx_triage_records_account_created').on(
      table.accountId,
      table.createdAt
    ),
    encounterIdx: index('idx_triage_records_encounter').on(table.encounterId),
    patientIdx: index('idx_triage_records_patient').on(table.patientId)
  })
);
