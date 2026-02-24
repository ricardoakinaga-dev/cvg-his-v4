import { boolean, date, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { patients } from './patients.js';
export const patientAllergies = pgTable('patient_allergies', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
        .notNull()
        .references(() => patients.id, { onDelete: 'cascade' }),
    allergen: text('allergen').notNull(),
    reaction: text('reaction'),
    severity: text('severity').$type(),
    diagnosedDate: date('diagnosed_date', { mode: 'date' }),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountPatientIdx: index('idx_patient_allergies_account_patient').on(table.accountId, table.patientId),
    patientIdx: index('idx_patient_allergies_patient').on(table.patientId)
}));
//# sourceMappingURL=patientAllergies.js.map