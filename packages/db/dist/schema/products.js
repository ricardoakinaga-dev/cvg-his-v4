import { boolean, index, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
export const products = pgTable('products', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    category: text('category'),
    uom: text('uom'),
    cost: numeric('cost', { precision: 12, scale: 2 }).notNull().default('0'),
    price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
    isControlled: boolean('is_controlled').notNull().default(false),
    trackLot: boolean('track_lot').notNull().default(false),
    trackExpiry: boolean('track_expiry').notNull().default(false),
    minStock: numeric('min_stock', { precision: 12, scale: 2 }).notNull().default('0'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountSkuUnique: uniqueIndex('products_account_sku_unique').on(table.accountId, table.sku),
    accountNameIdx: index('products_account_name_idx').on(table.accountId, table.name)
}));
//# sourceMappingURL=products.js.map