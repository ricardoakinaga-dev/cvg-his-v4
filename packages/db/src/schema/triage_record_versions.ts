import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const triageRecordVersions = pgTable(
  'triage_record_versions',
  {
    id: text('id').primaryKey(),
    triageId: text('triage_id').notNull(),
    accountId: text('account_id').notNull(),
    encounterId: text('encounter_id').notNull(),
    changedFieldsJson: text('changed_fields_json').notNull(),
    previousSnapshotJson: text('previous_snapshot_json').notNull(),
    nextSnapshotJson: text('next_snapshot_json').notNull(),
    changedByUserId: text('changed_by_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull()
  },
  (table) => ({
    triageCreatedIdx: index('idx_triage_versions_triage_created').on(
      table.triageId,
      table.createdAt
    ),
    accountCreatedIdx: index('idx_triage_versions_account_created').on(
      table.accountId,
      table.createdAt
    ),
    encounterIdx: index('idx_triage_versions_encounter').on(table.encounterId)
  })
);
