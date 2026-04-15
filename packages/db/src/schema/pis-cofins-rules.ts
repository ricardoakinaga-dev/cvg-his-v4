import { pgTable, text, numeric, varchar, index } from 'drizzle-orm/pg-core';

/**
 * PIS/COFINS Rules — Regras de PIS e COFINS por regime tributario
 * Suporta Simples Nacional, Lucro Presumido e Lucro Real.
 *
 * GAP-08: migrado de arrays in-memory (service.ts PIS_COFINS_RULES) para DB.
 */
export const pisCofinsRules = pgTable(
  'pis_cofins_rules',
  {
    id: varchar('id', { length: 60 }).notNull().primaryKey(),
    regime: varchar('regime', { length: 20 }).notNull(), // 'simples_nacional' | 'lucro_presumido' | 'lucro_real'
    appliesTo: varchar('applies_to', { length: 20 }).notNull(), // 'mercadoria' | 'servico' | 'ambos'
    pisRate: numeric('pis_rate', { precision: 5, scale: 2 }).notNull(),
    cofinsRate: numeric('cofins_rate', { precision: 5, scale: 2 }).notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull().default('now'),
    updatedAt: text('updated_at').notNull().default('now')
  },
  (table) => ({
    regimeIdx: index('pis_cofins_rules_regime_idx').on(table.regime),
    appliesToIdx: index('pis_cofins_rules_applies_to_idx').on(table.appliesTo)
  })
);

export type PisCofinsRule = typeof pisCofinsRules.$inferSelect;
export type NewPisCofinsRule = typeof pisCofinsRules.$inferInsert;
