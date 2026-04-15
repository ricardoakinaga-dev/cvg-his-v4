import { pgTable, text, numeric, varchar, index } from 'drizzle-orm/pg-core';

/**
 * ICMS Rules — Regras de ICMS interestadual e interno
 * Tax rules per UF origin/destination + NCM.
 *
 * GAP-08: migrado de arrays in-memory (service.ts ICMS_RULES) para DB.
 */
export const icmsRules = pgTable(
  'icms_rules',
  {
    id: varchar('id', { length: 60 }).notNull().primaryKey(),
    ufOrigin: varchar('uf_origin', { length: 2 }).notNull(),
    ufDestination: varchar('uf_destination', { length: 2 }).notNull(),
    ncm: varchar('ncm', { length: 10 }).notNull(),
    rate: numeric('rate', { precision: 5, scale: 2 }).notNull(),
    cst: varchar('cst', { length: 4 }).notNull(),
    operationType: varchar('operation_type', { length: 20 }).notNull(), // 'interna' | 'interestadual'
    createdAt: text('created_at').notNull().default('now'),
    updatedAt: text('updated_at').notNull().default('now')
  },
  (table) => ({
    ufIdx: index('icms_rules_uf_idx').on(table.ufOrigin, table.ufDestination),
    ncmIdx: index('icms_rules_ncm_idx').on(table.ncm),
    operationTypeIdx: index('icms_rules_operation_type_idx').on(table.operationType)
  })
);

export type IcmsRule = typeof icmsRules.$inferSelect;
export type NewIcmsRule = typeof icmsRules.$inferInsert;
