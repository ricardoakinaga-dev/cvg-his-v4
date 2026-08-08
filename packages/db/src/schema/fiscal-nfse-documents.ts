import {
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const fiscalNfseDocuments = pgTable(
  'fiscal_nfse_documents',
  {
    id: varchar('id', { length: 120 }).primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    serie: varchar('serie', { length: 20 }).notNull(),
    numero: numeric('numero', { precision: 10, scale: 0 }).notNull(),
    competencia: date('competencia').notNull(),
    provider: varchar('provider', { length: 20 }).notNull(),
    municipalityCode: varchar('municipality_code', { length: 10 }).notNull(),
    apiUrl: text('api_url').notNull(),
    environment: varchar('environment', { length: 20 }).notNull(),
    issuer: jsonb('issuer').notNull(),
    customer: jsonb('customer').notNull(),
    services: jsonb('services').notNull(),
    subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
    totalIss: numeric('total_iss', { precision: 14, scale: 2 }).notNull(),
    totalPis: numeric('total_pis', { precision: 14, scale: 2 }).notNull(),
    totalCofins: numeric('total_cofins', { precision: 14, scale: 2 }).notNull(),
    totalCsll: numeric('total_csll', { precision: 14, scale: 2 }).notNull(),
    totalIrrf: numeric('total_irrf', { precision: 14, scale: 2 }).notNull(),
    totalInss: numeric('total_inss', { precision: 14, scale: 2 }).notNull(),
    totalDocument: numeric('total_document', { precision: 14, scale: 2 }).notNull(),
    observations: text('observations'),
    status: varchar('status', { length: 20 }).notNull(),
    authorizationCode: varchar('authorization_code', { length: 255 }),
    verificationUrl: text('verification_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
  },
  (table) => ({
    accountStatusIdx: index('idx_fiscal_nfse_documents_account_status').on(
      table.accountId,
      table.status,
      table.createdAt
    ),
    accountCompetenciaIdx: index('idx_fiscal_nfse_documents_account_competencia').on(
      table.accountId,
      table.competencia
    ),
    accountNumberUnique: uniqueIndex('fiscal_nfse_documents_account_number_unique').on(
      table.accountId,
      table.serie,
      table.numero
    )
  })
);

export type FiscalNfseDocument = typeof fiscalNfseDocuments.$inferSelect;
export type NewFiscalNfseDocument = typeof fiscalNfseDocuments.$inferInsert;
