import { sql } from 'drizzle-orm';
import { check, index, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { protocols } from './protocols.js';
import { users } from './users.js';

export const protocolReferences = pgTable(
  'protocol_references',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    protocolId: uuid('protocol_id')
      .notNull()
      .references(() => protocols.id, { onDelete: 'cascade' }),
    refType: text('ref_type').notNull(),
    title: text('title'),
    url: text('url'),
    sourceId: text('source_id'),
    score: numeric('score', { precision: 10, scale: 6 }),
    metadataJson: jsonb('metadata_json').$type<Record<string, unknown> | null>(),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    protocolIdx: index('idx_protocol_references_protocol_id').on(table.protocolId),
    refTypeChk: check(
      'protocol_references_ref_type_chk',
      sql`${table.refType} in ('qdrant_chunk', 'url', 'pdf', 'doi', 'book')`
    )
  })
);
