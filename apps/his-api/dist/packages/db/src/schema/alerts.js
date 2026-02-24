import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { inpatientStays } from './inpatient_stays.js';
import { medicationOrders } from './medication_orders.js';
export const alertTypeEnum = pgEnum('alert_type', [
    'medication_delay',
    'dose_refused_needs_review'
]);
export const alertSeverityEnum = pgEnum('alert_severity', ['low', 'medium', 'high']);
export const alertStatusEnum = pgEnum('alert_status', ['active', 'acknowledged', 'resolved']);
export const alerts = pgTable('alerts', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    type: alertTypeEnum('type').notNull(),
    stayId: uuid('stay_id')
        .notNull()
        .references(() => inpatientStays.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
        .notNull()
        .references(() => medicationOrders.id, { onDelete: 'cascade' }),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    severity: alertSeverityEnum('severity').notNull(),
    message: text('message').notNull(),
    status: alertStatusEnum('status').notNull().default('active'),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    acknowledgedByUserId: uuid('acknowledged_by_user_id'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedByUserId: uuid('resolved_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountTypeCreatedIdx: index('idx_alerts_account_type_created').on(table.accountId, table.type, table.createdAt),
    accountStayTypeCreatedIdx: index('idx_alerts_account_stay_type_created').on(table.accountId, table.stayId, table.type, table.createdAt),
    orderSlotTypeActiveUnique: uniqueIndex('uq_alerts_order_slot_type_active')
        .on(table.orderId, table.scheduledFor, table.type)
        .where(sql `${table.status} != 'resolved'`)
}));
//# sourceMappingURL=alerts.js.map