import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const vetusImportBatches = pgTable(
  'vetus_import_batches',
  {
    id: varchar('id', { length: 120 }).primaryKey(),
    accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    sourceSystem: varchar('source_system', { length: 80 }).notNull(),
    sourceReference: varchar('source_reference', { length: 255 }),
    requestHash: varchar('request_hash', { length: 64 }),
    status: varchar('status', { length: 20 }).notNull(),
    totalCount: integer('total_count').notNull(),
    importedCount: integer('imported_count').notNull(),
    linkedCount: integer('linked_count').notNull(),
    rejectedCount: integer('rejected_count').notNull(),
    rolledBackCount: integer('rolled_back_count').notNull(),
    createdByUserId: uuid('created_by_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
  },
  (table) => ({
    accountUpdatedAtIdx: index('idx_vetus_import_batches_account_updated_at').on(
      table.accountId,
      table.updatedAt
    ),
    sourceReferenceUnique: uniqueIndex('vetus_import_batches_account_source_reference_unique').on(
      table.accountId,
      table.sourceSystem,
      table.sourceReference
    )
  })
);

export const vetusImportBatchItems = pgTable(
  'vetus_import_batch_items',
  {
    id: varchar('id', { length: 120 }).primaryKey(),
    accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    batchId: varchar('batch_id', { length: 120 }).notNull(),
    rowNumber: integer('row_number').notNull(),
    sourceReference: varchar('source_reference', { length: 255 }),
    status: varchar('status', { length: 20 }).notNull(),
    importLogId: varchar('import_log_id', { length: 120 }),
    ownerId: uuid('owner_id'),
    patientId: uuid('patient_id'),
    ownerCreated: boolean('owner_created').notNull().default(false),
    patientCreated: boolean('patient_created').notNull().default(false),
    reason: varchar('reason', { length: 1000 }),
    payloadJson: jsonb('payload_json').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
  },
  (table) => ({
    accountBatchRowIdx: index('idx_vetus_import_batch_items_account_batch').on(
      table.accountId,
      table.batchId,
      table.rowNumber
    ),
    accountStatusIdx: index('idx_vetus_import_batch_items_account_status').on(
      table.accountId,
      table.status,
      table.updatedAt
    )
  })
);

export type VetusImportBatch = typeof vetusImportBatches.$inferSelect;
export type NewVetusImportBatch = typeof vetusImportBatches.$inferInsert;
export type VetusImportBatchItem = typeof vetusImportBatchItems.$inferSelect;
export type NewVetusImportBatchItem = typeof vetusImportBatchItems.$inferInsert;
