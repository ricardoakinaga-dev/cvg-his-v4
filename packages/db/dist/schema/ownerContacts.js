import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { owners } from './owners.js';
export const ownerContacts = pgTable('owner_contacts', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
        .notNull()
        .references(() => owners.id, { onDelete: 'cascade' }),
    type: text('type').notNull().$type(),
    label: text('label'),
    value: text('value').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountOwnerIdx: index('idx_owner_contacts_account_owner').on(table.accountId, table.ownerId),
    ownerIdx: index('idx_owner_contacts_owner').on(table.ownerId)
}));
//# sourceMappingURL=ownerContacts.js.map