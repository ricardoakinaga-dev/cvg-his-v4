import { index, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { encounters } from './encounters.js';
import { inpatientStays } from './inpatient_stays.js';
import { patients } from './patients.js';
import { users } from './users.js';
export const medicationOrderStatusEnum = pgEnum('medication_order_status', ['active', 'stopped']);
export const medicationOrders = pgTable('medication_orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    stayId: uuid('stay_id').references(() => inpatientStays.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id')
        .notNull()
        .references(() => patients.id, { onDelete: 'cascade' }),
    medicationName: text('medication_name').notNull(),
    doseValue: numeric('dose_value', { precision: 12, scale: 4 }).notNull(),
    doseUnit: text('dose_unit').notNull(),
    route: text('route').notNull(),
    frequencyType: text('frequency_type').notNull(),
    durationValue: integer('duration_value'),
    durationUnit: text('duration_unit'),
    prescriptionText: text('prescription_text'),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }),
    status: medicationOrderStatusEnum('status').notNull().default('active'),
    stopReason: text('stop_reason'),
    createdByUserId: uuid('created_by_user_id')
        .notNull()
        .references(() => users.id),
    stoppedByUserId: uuid('stopped_by_user_id').references(() => users.id, {
        onDelete: 'set null'
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountStayStatusIdx: index('idx_medication_orders_account_stay_status').on(table.accountId, table.stayId, table.status),
    accountEncounterStatusIdx: index('idx_medication_orders_account_encounter_status').on(table.accountId, table.encounterId, table.status),
    patientStatusIdx: index('idx_medication_orders_patient_status').on(table.patientId, table.status)
}));
//# sourceMappingURL=medication_orders.js.map