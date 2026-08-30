import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const vetusImportLogs = pgTable(
  'vetus_import_logs',
  {
    id: varchar('id', { length: 120 }).primaryKey(),
    accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    sourceSystem: varchar('source_system', { length: 80 }).notNull(),
    sourceReference: varchar('source_reference', { length: 255 }),
    requestHash: varchar('request_hash', { length: 64 }),
    status: varchar('status', { length: 20 }).notNull(),
    ownerId: uuid('owner_id').notNull(),
    ownerName: varchar('owner_name', { length: 255 }).notNull(),
    patientId: uuid('patient_id').notNull(),
    patientName: varchar('patient_name', { length: 255 }).notNull(),
    importedByUserId: uuid('imported_by_user_id').notNull(),
    reviewedBy: varchar('reviewed_by', { length: 255 }),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull(),
    summary: varchar('summary', { length: 1000 }).notNull()
  },
  (table) => ({
    accountImportedAtIdx: index('idx_vetus_import_logs_account_imported_at').on(
      table.accountId,
      table.importedAt
    ),
    sourceReferenceUnique: uniqueIndex('vetus_import_logs_account_source_reference_unique').on(
      table.accountId,
      table.sourceSystem,
      table.sourceReference
    )
  })
);

export type VetusImportLog = typeof vetusImportLogs.$inferSelect;
export type NewVetusImportLog = typeof vetusImportLogs.$inferInsert;
