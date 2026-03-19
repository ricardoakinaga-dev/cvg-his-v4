import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { inpatientStays } from './inpatient_stays.js';
import { shiftHandovers } from './shift_handovers.js';
export const shiftHandoverItems = pgTable('shift_handover_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    handoverId: uuid('handover_id')
        .notNull()
        .references(() => shiftHandovers.id, { onDelete: 'cascade' }),
    stayId: uuid('stay_id')
        .notNull()
        .references(() => inpatientStays.id, { onDelete: 'cascade' }),
    patientSnapshotJson: jsonb('patient_snapshot_json')
        .$type()
        .notNull(),
    problemsJson: jsonb('problems_json').$type().notNull().default(sql `'[]'::jsonb`),
    planJson: jsonb('plan_json').$type().notNull().default(sql `'[]'::jsonb`),
    criticalMedsJson: jsonb('critical_meds_json').$type().notNull().default(sql `'[]'::jsonb`),
    alertsJson: jsonb('alerts_json').$type().notNull().default(sql `'{}'::jsonb`),
    pendingJson: jsonb('pending_json').$type().notNull().default(sql `'[]'::jsonb`),
    escalationJson: jsonb('escalation_json')
        .$type()
        .notNull()
        .default(sql `'{}'::jsonb`),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    handoverIdIdx: index('idx_shift_handover_items_handover_id').on(table.handoverId)
}));
//# sourceMappingURL=shift_handover_items.js.map