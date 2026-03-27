import { index, integer, pgTable, text, uuid, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
export const appointmentTypeConfigs = pgTable('appointment_type_configs', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    defaultDurationMinutes: integer('default_duration_minutes').notNull().default(30),
    color: text('color'), // hex color for UI
    active: boolean('active').notNull().default(true)
}, (table) => ({
    accountCodeIdx: uniqueIndex('uq_appt_type_config_account_code').on(table.accountId, table.code),
    accountNameIdx: index('idx_appt_type_config_account_name').on(table.accountId, table.name),
    accountActiveIdx: index('idx_appt_type_config_account_active').on(table.accountId, table.active)
}));
//# sourceMappingURL=appointment_type_configs.js.map