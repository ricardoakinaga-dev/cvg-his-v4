import { pgTable, uuid, varchar, text, decimal, boolean, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { accounts } from './accounts.js';
import { users } from './users.js';
import { patients } from './patients.js';

// =====================
// Partners Table
// =====================

export const partners = pgTable(
  'partners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull().default('pet_shop'),
    contactName: varchar('contact_name', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    address: text('address'),
    discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    active: boolean('active').notNull().default(true),
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id)
  },
  (table) => [
    index('idx_partners_account_id').on(table.accountId),
    index('idx_partners_active').on(table.active),
    index('idx_partners_type').on(table.type)
  ]
);

export const partnersRelations = relations(partners, ({ one, many }) => ({
  account: one(accounts, {
    fields: [partners.accountId],
    references: [accounts.id]
  }),
  createdByUser: one(users, {
    fields: [partners.createdByUserId],
    references: [users.id]
  }),
  partnerPatients: many(partnerPatients)
}));

// =====================
// Partner Patients Table
// =====================

export const partnerPatients = pgTable(
  'partner_patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partnerId: uuid('partner_id')
      .references(() => partners.id, { onDelete: 'cascade' })
      .notNull(),
    patientId: uuid('patient_id')
      .references(() => patients.id, { onDelete: 'cascade' })
      .notNull(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id)
  },
  (table) => [
    index('idx_partner_patients_partner_id').on(table.partnerId),
    index('idx_partner_patients_patient_id').on(table.patientId),
    index('idx_partner_patients_account_id').on(table.accountId),
    uniqueIndex('idx_partner_patients_unique').on(table.partnerId, table.patientId)
  ]
);

export const partnerPatientsRelations = relations(partnerPatients, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerPatients.partnerId],
    references: [partners.id]
  }),
  patient: one(patients, {
    fields: [partnerPatients.patientId],
    references: [patients.id]
  }),
  account: one(accounts, {
    fields: [partnerPatients.accountId],
    references: [accounts.id]
  }),
  createdByUser: one(users, {
    fields: [partnerPatients.createdByUserId],
    references: [users.id]
  })
}));

// =====================
// Types
// =====================

export type Partner = typeof partners.$inferSelect;
export type PartnerInsert = typeof partners.$inferInsert;
export type PartnerPatient = typeof partnerPatients.$inferSelect;
export type PartnerPatientInsert = typeof partnerPatients.$inferInsert;
