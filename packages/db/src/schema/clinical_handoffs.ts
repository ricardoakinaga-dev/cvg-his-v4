import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { encounters } from './encounters.js';
import { owners } from './owners.js';
import { patients } from './patients.js';
import { users } from './users.js';

export const clinicalHandoffs = pgTable(
  'clinical_handoffs',
  {
    id: text('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    queueEntryId: text('queue_entry_id'),
    appointmentId: text('appointment_id'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => owners.id),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    originChannel: text('origin_channel').notNull(),
    fromSector: text('from_sector').notNull().default('clinic'),
    toSector: text('to_sector').notNull().default('reception'),
    fromResponsibleId: uuid('from_responsible_id')
      .notNull()
      .references(() => users.id),
    toResponsibleType: text('to_responsible_type').notNull().default('sector'),
    toResponsibleId: text('to_responsible_id'),
    clinicalSummary: text('clinical_summary').notNull(),
    receptionInstructions: text('reception_instructions').notNull(),
    priority: text('priority').notNull().default('medium'),
    handoffStatus: text('handoff_status').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    sentBy: uuid('sent_by')
      .notNull()
      .references(() => users.id),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
    acknowledgedBy: uuid('acknowledged_by').references(() => users.id),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    acknowledgeNote: text('acknowledge_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountEncounterUnique: uniqueIndex('uidx_clinical_handoffs_account_encounter').on(
      table.accountId,
      table.encounterId
    ),
    accountStatusIdx: index('idx_clinical_handoffs_account_status').on(
      table.accountId,
      table.handoffStatus
    ),
    accountUpdatedIdx: index('idx_clinical_handoffs_account_updated').on(
      table.accountId,
      table.updatedAt
    ),
    accountPatientIdx: index('idx_clinical_handoffs_account_patient').on(
      table.accountId,
      table.patientId
    ),
    accountOwnerIdx: index('idx_clinical_handoffs_account_owner').on(
      table.accountId,
      table.ownerId
    ),
    originChannelChk: check(
      'clinical_handoffs_origin_channel_chk',
      sql`${table.originChannel} in ('reception', 'schedule', 'return')`
    ),
    sectorChk: check(
      'clinical_handoffs_sector_chk',
      sql`${table.fromSector} = 'clinic' and ${table.toSector} = 'reception'`
    ),
    responsibleTypeChk: check(
      'clinical_handoffs_responsible_type_chk',
      sql`${table.toResponsibleType} in ('sector', 'person', 'team')`
    ),
    priorityChk: check(
      'clinical_handoffs_priority_chk',
      sql`${table.priority} in ('low', 'medium', 'high', 'critical')`
    ),
    statusChk: check(
      'clinical_handoffs_status_chk',
      sql`${table.handoffStatus} in ('ready_to_send', 'sent_to_reception', 'acknowledged_by_reception')`
    ),
    summaryNonEmptyChk: check(
      'clinical_handoffs_summary_non_empty_chk',
      sql`length(trim(${table.clinicalSummary})) > 0`
    ),
    instructionsNonEmptyChk: check(
      'clinical_handoffs_instructions_non_empty_chk',
      sql`length(trim(${table.receptionInstructions})) > 0`
    )
  })
);
