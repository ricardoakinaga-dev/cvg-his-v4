import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { patients } from './patients.js';
import { examOrders } from './exam_orders.js';
import { users } from './users.js';
export const examResultStatusEnum = pgEnum('exam_result_status', [
    'draft',
    'review_required',
    'approved',
    'released',
    'cancelled'
]);
export const examResults = pgTable('exam_results', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
        .notNull()
        .references(() => patients.id, { onDelete: 'cascade' }),
    examOrderId: uuid('exam_order_id')
        .notNull()
        .references(() => examOrders.id, { onDelete: 'cascade' }),
    category: text('category').notNull(), // matches exam_orders.category
    examName: text('exam_name').notNull(),
    examCode: text('exam_code'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull(),
    status: examResultStatusEnum('status').notNull().default('draft'),
    findings: text('findings'),
    interpretation: text('interpretation'),
    resultValues: text('result_values'), // JSON string with structured results
    normalRange: text('normal_range'), // JSON string with reference values
    performedByUserId: uuid('performed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    performedAt: timestamp('performed_at', { withTimezone: true }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountPatientIdx: index('idx_exam_results_account_patient').on(table.accountId, table.patientId),
    accountExamOrderIdx: index('idx_exam_results_account_exam_order').on(table.accountId, table.examOrderId),
    accountCategoryIdx: index('idx_exam_results_account_category').on(table.accountId, table.category),
    accountStatusIdx: index('idx_exam_results_account_status').on(table.accountId, table.status)
}));
//# sourceMappingURL=exam_results.js.map