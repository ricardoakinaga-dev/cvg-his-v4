import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { owners } from './owners.js';
import { patients } from './patients.js';
// Tags table
export const tags = pgTable('tags', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').default('#6B7280'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountIdx: index('idx_tags_account').on(table.accountId),
    accountNameUnique: uniqueIndex('uq_tags_account_name').on(table.accountId, table.name)
}));
// Owner-Tags junction table
export const ownerTags = pgTable('owner_tags', {
    ownerId: uuid('owner_id')
        .notNull()
        .references(() => owners.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
        .notNull()
        .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    pk: uniqueIndex('pk_owner_tags').on(table.ownerId, table.tagId),
    tagIdx: index('idx_owner_tags_tag').on(table.tagId)
}));
// Patient-Tags junction table
export const patientTags = pgTable('patient_tags', {
    patientId: uuid('patient_id')
        .notNull()
        .references(() => patients.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
        .notNull()
        .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    pk: uniqueIndex('pk_patient_tags').on(table.patientId, table.tagId),
    tagIdx: index('idx_patient_tags_tag').on(table.tagId)
}));
//# sourceMappingURL=tags.js.map