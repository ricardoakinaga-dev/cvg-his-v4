import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { patients } from './patients.js';
export const patientAlerts = pgTable('patient_alerts', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
        .notNull()
        .references(() => patients.id, { onDelete: 'cascade' }),
    severity: text('severity').notNull().default('info').$type(),
    title: text('title').notNull(),
    message: text('message'),
    isActive: boolean('is_active').notNull().default(true),
    createdByUserId: uuid('created_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedByUserId: uuid('resolved_by_user_id')
}, (table) => ({
    accountPatientIdx: index('idx_patient_alerts_account_patient').on(table.accountId, table.patientId),
    patientIdx: index('idx_patient_alerts_patient').on(table.patientId),
    activeIdx: index('idx_patient_alerts_active').on(table.accountId, table.isActive)
}));
//# sourceMappingURL=patientAlerts.js.map