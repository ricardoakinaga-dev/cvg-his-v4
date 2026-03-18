import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { beds } from './beds.js';
import { encounters } from './encounters.js';
import { owners } from './owners.js';
import { patients } from './patients.js';
import { users } from './users.js';
import { wards } from './wards.js';
export const inpatientStayStatusEnum = pgEnum('inpatient_stay_status', [
    'active',
    'discharged',
    'transferred'
]);
export const inpatientStays = pgTable('inpatient_stays', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
        .notNull()
        .references(() => patients.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id')
        .notNull()
        .references(() => owners.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    wardId: uuid('ward_id')
        .notNull()
        .references(() => wards.id),
    bedId: uuid('bed_id')
        .notNull()
        .references(() => beds.id),
    status: inpatientStayStatusEnum('status').notNull().default('active'),
    admittedAt: timestamp('admitted_at', { withTimezone: true }).notNull().defaultNow(),
    dischargedAt: timestamp('discharged_at', { withTimezone: true }),
    admittedByUserId: uuid('admitted_by_user_id')
        .notNull()
        .references(() => users.id),
    dischargedByUserId: uuid('discharged_by_user_id').references(() => users.id, {
        onDelete: 'set null'
    }),
    chiefComplaint: text('chief_complaint'),
    reason: text('reason'),
    planSummary: text('plan_summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountWardStatusIdx: index('idx_inpatient_stays_account_ward_status').on(table.accountId, table.wardId, table.status),
    accountBedStatusIdx: index('idx_inpatient_stays_account_bed_status').on(table.accountId, table.bedId, table.status),
    activeBedUnique: uniqueIndex('inpatient_stays_active_bed_unique')
        .on(table.bedId)
        .where(sql `${table.status} = 'active'`)
}));
//# sourceMappingURL=inpatient_stays.js.map