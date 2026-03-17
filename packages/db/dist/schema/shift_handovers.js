import { date, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { documents } from './documents.js';
import { users } from './users.js';
import { wards } from './wards.js';
export const shiftHandoverStatusEnum = pgEnum('shift_handover_status', ['draft', 'published']);
export const shiftPeriodEnum = pgEnum('shift_period', ['day', 'night', 'custom']);
export const shiftHandoverBuildStatusEnum = pgEnum('shift_handover_build_status', [
    'pending',
    'building',
    'ready',
    'failed'
]);
export const shiftHandovers = pgTable('shift_handovers', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    wardId: uuid('ward_id')
        .notNull()
        .references(() => wards.id),
    status: shiftHandoverStatusEnum('status').notNull().default('draft'),
    shiftDate: date('shift_date', { mode: 'date' }).notNull(),
    shiftPeriod: shiftPeriodEnum('shift_period').notNull().default('day'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    publishedByUserId: uuid('published_by_user_id').references(() => users.id, {
        onDelete: 'set null'
    }),
    buildStatus: shiftHandoverBuildStatusEnum('build_status').notNull().default('pending'),
    buildError: text('build_error'),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountWardShiftIdx: index('idx_shift_handovers_account_ward_shift').on(table.accountId, table.wardId, table.shiftDate, table.shiftPeriod)
}));
//# sourceMappingURL=shift_handovers.js.map