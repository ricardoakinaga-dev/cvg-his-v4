import { index, pgTable, text, timestamp, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { patients } from './patients.js';
import { encounters } from './encounters.js';
import { users } from './users.js';
import { labTests } from './labTests.js';
import { labTestPanels } from './labTests.js';
// Lab order status enum
export const labOrderStatusEnum = pgEnum('lab_order_status', [
    'pending', // aguardando coleta
    'partial', // coleta parcial
    'collected', // coletado
    'processing', // em processamento
    'partial_result', // resultados parciais
    'completed', // concluído
    'cancelled' // cancelado
]);
// Lab orders (pedidos de exame)
export const labOrders = pgTable('lab_orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    orderNumber: text('order_number').notNull(),
    patientId: uuid('patient_id')
        .notNull()
        .references(() => patients.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    requesterUserId: uuid('requester_user_id').references(() => users.id, { onDelete: 'set null' }),
    status: labOrderStatusEnum('status').notNull().default('pending'),
    priority: text('priority').default('routine'), // 'stat', 'asap', 'routine', 'timed'
    clinicalNotes: text('clinical_notes'),
    diagnosis: text('diagnosis'),
    fastingStatus: text('fasting_status'),
    orderedAt: timestamp('ordered_at', { withTimezone: true }).notNull().defaultNow(),
    collectedAt: timestamp('collected_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledReason: text('cancelled_reason'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountUnique: index('lab_orders_account_number_unique').on(table.accountId, table.orderNumber),
    accountIdx: index('idx_lab_orders_account').on(table.accountId),
    patientIdx: index('idx_lab_orders_patient').on(table.patientId),
    encounterIdx: index('idx_lab_orders_encounter').on(table.encounterId),
    statusIdx: index('idx_lab_orders_status').on(table.accountId, table.status),
    orderedIdx: index('idx_lab_orders_ordered').on(table.accountId, table.orderedAt),
    numberIdx: index('idx_lab_orders_number').on(table.orderNumber)
}));
// Lab order items (exames solicitados no pedido)
export const labOrderItems = pgTable('lab_order_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
        .notNull()
        .references(() => labOrders.id, { onDelete: 'cascade' }),
    testId: uuid('test_id')
        .notNull()
        .references(() => labTests.id, { onDelete: 'cascade' }),
    panelId: uuid('panel_id').references(() => labTestPanels.id, { onDelete: 'set null' }),
    status: labOrderStatusEnum('status').notNull().default('pending'),
    priority: text('priority').default('routine'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountIdx: index('idx_lab_order_items_account').on(table.accountId),
    orderIdx: index('idx_lab_order_items_order').on(table.orderId),
    testIdx: index('idx_lab_order_items_test').on(table.testId),
    statusIdx: index('idx_lab_order_items_status').on(table.orderId, table.status)
}));
//# sourceMappingURL=labOrders.js.map