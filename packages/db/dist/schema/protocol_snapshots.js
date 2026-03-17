import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { protocols } from './protocols.js';
import { protocolVersions } from './protocol_versions.js';
export const protocolSnapshots = pgTable('protocol_snapshots', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    protocolId: uuid('protocol_id')
        .notNull()
        .references(() => protocols.id, { onDelete: 'cascade' }),
    versionId: uuid('version_id')
        .notNull()
        .references(() => protocolVersions.id, { onDelete: 'cascade' }),
    snapshotJson: jsonb('snapshot_json').$type().notNull(),
    snapshotHash: text('snapshot_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    protocolVersionIdx: index('idx_protocol_snapshots_protocol_version').on(table.protocolId, table.versionId)
}));
//# sourceMappingURL=protocol_snapshots.js.map