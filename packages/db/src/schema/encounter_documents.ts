import { index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { documents } from './documents.js';
import { encounters } from './encounters.js';
import { users } from './users.js';

// TODO(PR-SEC-03): add account_id to prevent cross-tenant linkage between encounters and documents.
export const encounterDocuments = pgTable(
  'encounter_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    attachedByUserId: uuid('attached_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    encounterIdIdx: index('idx_encounter_documents_encounter_id').on(table.encounterId),
    encounterDocumentUnique: uniqueIndex('encounter_documents_encounter_document_unique').on(
      table.encounterId,
      table.documentId
    )
  })
);
