import { pgTable, text, varchar, boolean, index } from 'drizzle-orm/pg-core';

/**
 * NFS-e Layouts — Configuracoes de emissao NFS-e por municipio
 * Cadastro de prestadores e layouts fiscais para emissao municipal.
 *
 * GAP-08: migrado de arrays in-memory (service.ts NFSE_LAYOUTS) para DB.
 */
export const nfseLayouts = pgTable(
  'nfse_layouts',
  {
    id: varchar('id', { length: 60 }).notNull().primaryKey(),
    city: text('city').notNull(),
    state: varchar('state', { length: 2 }).notNull(),
    municipalityCode: varchar('municipality_code', { length: 10 }),
    provider: text('provider').notNull(),
    version: text('version').notNull(),
    active: boolean('active').notNull().default(false),
    environment: varchar('environment', { length: 20 }).notNull().default('homologacao'), // 'producao' | 'homologacao'
    serviceCode: varchar('service_code', { length: 10 }),
    serviceFocus: text('service_focus'),
    createdAt: text('created_at').notNull().default('now'),
    updatedAt: text('updated_at').notNull().default('now')
  },
  (table) => ({
    stateIdx: index('nfse_layouts_state_idx').on(table.state),
    activeIdx: index('nfse_layouts_active_idx').on(table.active),
    municipalityIdx: index('nfse_layouts_municipality_idx').on(table.municipalityCode)
  })
);

export type NfseLayout = typeof nfseLayouts.$inferSelect;
export type NewNfseLayout = typeof nfseLayouts.$inferInsert;
