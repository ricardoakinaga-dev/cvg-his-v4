import { index, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { encounters } from './encounters.js';
import { inpatientStays } from './inpatient_stays.js';
import { products } from './products.js';
import { stockLots } from './stockLots.js';
import { users } from './users.js';
export const movementTypeEnum = pgEnum('stock_movement_type', [
    'entrada', // Purchase/receipt
    'saida', // Sale/dispensing
    'ajuste', // Inventory adjustment
    'consumo', // Internal consumption (encounter/inpatient)
    'devolucao', // Return
    'transferencia' // Transfer between locations
]);
export const stockMovements = pgTable('stock_movements', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'restrict' }),
    lotId: uuid('lot_id')
        .references(() => stockLots.id, { onDelete: 'set null' }),
    movementType: movementTypeEnum('movement_type').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 4 }).notNull(),
    unitCost: numeric('unit_cost', { precision: 12, scale: 4 }),
    totalCost: numeric('total_cost', { precision: 12, scale: 4 }),
    balanceAfter: numeric('balance_after', { precision: 12, scale: 4 }),
    lotBalanceAfter: numeric('lot_balance_after', { precision: 12, scale: 4 }),
    encounterId: uuid('encounter_id')
        .references(() => encounters.id, { onDelete: 'set null' }),
    inpatientStayId: uuid('inpatient_stay_id')
        .references(() => inpatientStays.id, { onDelete: 'set null' }),
    performedByUserId: uuid('performed_by_user_id')
        .notNull()
        .references(() => users.id),
    reason: text('reason'),
    notes: text('notes'),
    documentRef: text('document_ref'), // Reference to invoice, prescription, etc.
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountProductIdx: index('stock_movements_account_product_idx').on(table.accountId, table.productId),
    accountLotIdx: index('stock_movements_account_lot_idx').on(table.accountId, table.lotId),
    accountTypeIdx: index('stock_movements_account_type_idx').on(table.accountId, table.movementType),
    encounterIdx: index('stock_movements_encounter_idx').on(table.encounterId),
    inpatientStayIdx: index('stock_movements_inpatient_stay_idx').on(table.inpatientStayId),
    createdAtIdx: index('stock_movements_created_at_idx').on(table.accountId, table.createdAt)
}));
//# sourceMappingURL=stockMovements.js.map