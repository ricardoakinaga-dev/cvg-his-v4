import { pgTable, text, numeric, varchar, index } from 'drizzle-orm/pg-core';

/**
 * NCM Entries — Cadastro de NCM (Nomenclatura Comum do Mercosul)
 * Catalogo de NCMs ativos para produtos farmaceuticos e equipamentos medicos.
 *
 * GAP-08: migrado de arrays in-memory (service.ts NCM_ENTRIES) para DB.
 */
export const ncmEntries = pgTable(
  'ncm_entries',
  {
    id: varchar('id', { length: 60 }).notNull().primaryKey(),
    ncm: varchar('ncm', { length: 10 }).notNull(),
    category: text('category').notNull(),
    ipiRate: numeric('ipi_rate', { precision: 5, scale: 2 }).notNull().default('0'),
    source: text('source').notNull(),
    notes: text('notes'),
    active: text('active').notNull().default('true'),
    createdAt: text('created_at').notNull().default('now'),
    updatedAt: text('updated_at').notNull().default('now')
  },
  (table) => ({
    ncmIdx: index('ncm_entries_ncm_idx').on(table.ncm),
    categoryIdx: index('ncm_entries_category_idx').on(table.category)
  })
);

export type NcmEntry = typeof ncmEntries.$inferSelect;
export type NewNcmEntry = typeof ncmEntries.$inferInsert;
