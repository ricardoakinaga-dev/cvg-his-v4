import { index, integer, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { encounters } from './encounters.js';
import { users } from './users.js';

export const clinicalNoteTypeEnum = pgEnum('clinical_note_type', ['SOAP']);
export const clinicalNoteStatusEnum = pgEnum('clinical_note_status', ['draft', 'signed']);

// TODO(PR-SEC-03): add account_id for direct tenant filtering and index support.
export const clinicalNotes = pgTable(
  'clinical_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    type: clinicalNoteTypeEnum('type').notNull().default('SOAP'),
    status: clinicalNoteStatusEnum('status').notNull().default('draft'),
    versionNumber: integer('version_number').notNull().default(1),
    signedAt: timestamp('signed_at', { withTimezone: true }),
    signedByUserId: uuid('signed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    updatedByUserId: uuid('updated_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    encounterIdIdx: index('idx_clinical_notes_encounter_id').on(table.encounterId)
  })
);
