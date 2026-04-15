import { pgTable, text, boolean, varchar, index } from 'drizzle-orm/pg-core';

/**
 * CFOP — Código Fiscal de Operações e Prestações
 * Tabela fiscal para operações de entrada e saída.
 *
 * GAP-08: migrado de arrays in-memory (cfop-table.ts) para DB.
 */
export const cfopEntries = pgTable(
  'cfop_entries',
  {
    code: varchar('code', { length: 10 }).notNull().primaryKey(),
    description: text('description').notNull(),
    section: varchar('section', { length: 10 }).notNull(), // 'entrada' | 'saida'
    category: varchar('category', { length: 30 }).notNull(),
    applicableTo: text('applicable_to').notNull(), // JSON: ['nfe','nfce','nfse','cte']
    icmsRelevant: boolean('icms_relevant').notNull().default(false),
    pisCofinsRelevant: boolean('pis_cofins_relevant').notNull().default(false),
    ipiRelevant: boolean('ipi_relevant').notNull().default(false),
    createdAt: text('created_at').notNull().default('now')
  },
  (table) => ({
    sectionIdx: index('cfop_entries_section_idx').on(table.section),
    categoryIdx: index('cfop_entries_category_idx').on(table.category)
  })
);

export type CfopEntry = typeof cfopEntries.$inferSelect;
export type NewCfopEntry = typeof cfopEntries.$inferInsert;
