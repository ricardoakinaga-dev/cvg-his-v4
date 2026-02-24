import { index, numeric, pgTable, text, timestamp, uniqueIndex, uuid, date } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { products } from './products.js';
export const stockLots = pgTable('stock_lots', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'restrict' }),
    lotNumber: text('lot_number').notNull(),
    expiryDate: date('expiry_date'),
    quantity: numeric('quantity', { precision: 12, scale: 4 }).notNull().default('0'),
    cost: numeric('cost', { precision: 12, scale: 4 }),
    location: text('location'),
    supplier: text('supplier'),
    notes: text('notes'),
    active: numeric('active', { precision: 12, scale: 4 }).notNull().default('1'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountProductLotUnique: uniqueIndex('stock_lots_account_product_lot_unique').on(table.accountId, table.productId, table.lotNumber),
    accountProductIdx: index('stock_lots_account_product_idx').on(table.accountId, table.productId),
    expiryIdx: index('stock_lots_expiry_idx').on(table.accountId, table.expiryDate)
}));
//# sourceMappingURL=stockLots.js.map