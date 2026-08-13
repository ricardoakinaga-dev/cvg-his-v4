import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

/**
 * NCM Entries — Cadastro de NCM (Nomenclatura Comum do Mercosul)
 * Catalogo de NCMs ativos para produtos farmaceuticos e equipamentos medicos.
 *
 * GAP-08: migrado de arrays in-memory (service.ts NCM_ENTRIES) para DB.
 */
export const ncmEntries = pgTable(
  'ncm_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ncm: varchar('ncm', { length: 10 }).notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    ipiRate: numeric('ipi_rate', { precision: 5, scale: 2 }),
    source: varchar('source', { length: 128 }),
    notes: text('notes'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    ncmIdx: index('ncm_entries_ncm_idx').on(table.ncm),
    categoryIdx: index('ncm_entries_category_idx').on(table.category)
  })
);

export type NcmEntry = typeof ncmEntries.$inferSelect;
export type NewNcmEntry = typeof ncmEntries.$inferInsert;
