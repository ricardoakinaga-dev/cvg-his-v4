import { index, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { encounters } from './encounters.js';
import { services } from './services.js';
import { users } from './users.js';
export const billingItemStatusEnum = pgEnum('billing_item_status', ['draft', 'confirmed', 'cancelled']);
export const billingItems = pgTable('billing_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id')
        .notNull()
        .references(() => encounters.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
        .references(() => services.id, { onDelete: 'set null' }),
    description: text('description').notNull(),
    qty: numeric('qty', { precision: 10, scale: 2 }).notNull().default('1'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
    totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull().default('0'),
    status: billingItemStatusEnum('status').notNull().default('draft'),
    createdByUserId: uuid('created_by_user_id')
        .notNull()
        .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    encounterIdx: index('idx_billing_items_encounter_id').on(table.encounterId),
    accountStatusIdx: index('idx_billing_items_account_status').on(table.accountId, table.status),
    serviceIdx: index('idx_billing_items_service_id').on(table.serviceId)
}));
//# sourceMappingURL=billingItems.js.map