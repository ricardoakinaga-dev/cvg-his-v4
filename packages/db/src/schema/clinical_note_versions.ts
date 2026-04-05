import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { clinicalNotes } from './clinical_notes.js';
import { users } from './users.js';

export const clinicalNoteVersions = pgTable(
  'clinical_note_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    noteId: uuid('note_id')
      .notNull()
      .references(() => clinicalNotes.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    soapJson: jsonb('soap_json').$type<Record<string, unknown>>().notNull(),
    reason: text('reason'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdIdx: index('idx_clinical_note_versions_account_id').on(table.accountId),
    noteIdIdx: index('idx_clinical_note_versions_note_id').on(table.noteId),
    noteVersionUnique: uniqueIndex('clinical_note_versions_note_version_unique').on(
      table.noteId,
      table.versionNumber
    )
  })
);
