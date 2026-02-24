import { boolean, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
// Service groups for billing items
export const SERVICE_GROUPS = ['consulta', 'procedimento', 'internacao', 'lab', 'imagem', 'outros'];
// Service sectors
export const SERVICE_SECTORS = ['clinica', 'internacao', 'laboratorio', 'imagem', 'financeiro'];
export const services = pgTable('services', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    group: text('group').notNull(),
    sector: text('sector').notNull(),
    basePrice: numeric('base_price', { precision: 12, scale: 2 }).notNull().default('0'),
    durationMinutes: integer('duration_minutes'),
    requiresReport: boolean('requires_report').notNull().default(false),
    consumesStock: boolean('consumes_stock').notNull().default(false),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountCodeUnique: uniqueIndex('services_account_code_unique').on(table.accountId, table.code),
    accountNameIdx: index('services_account_name_idx').on(table.accountId, table.name),
    accountGroupIdx: index('services_account_group_idx').on(table.accountId, table.group),
    accountSectorIdx: index('services_account_sector_idx').on(table.accountId, table.sector),
    accountActiveIdx: index('services_account_active_idx').on(table.accountId, table.active)
}));
//# sourceMappingURL=services.js.map