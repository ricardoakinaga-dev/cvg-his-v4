import { boolean, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
export const appointmentTypes = pgTable('appointment_types', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    code: text('code').notNull(), // e.g. CONSULTA, RETORNO, CIRURGIA
    name: text('name').notNull(),
    sector: text('sector').notNull(), // geral|clinica|internacao|imagem|laboratorio|cirurgia
    defaultDurationMinutes: integer('default_duration_minutes').notNull().default(30),
    requiresResource: boolean('requires_resource').default(false).notNull(),
    requiresTeam: boolean('requires_team').default(false).notNull(),
    active: boolean('active').default(true).notNull()
}, (table) => ({
    codeIdx: uniqueIndex('idx_appointment_types_code').on(table.accountId, table.code)
}));
//# sourceMappingURL=appointment_types.js.map