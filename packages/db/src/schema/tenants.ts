import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    legalName: text('legal_name'),
    taxId: varchar('tax_id', { length: 18 }),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    settingsJson: jsonb('settings_json').$type<Record<string, unknown>>().notNull().default({}),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    subscriptionTier: varchar('subscription_tier', { length: 30 }).default('standard'),
    subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
    maxUsers: varchar('max_users', { length: 10 }).default('50'),
    maxBranches: varchar('max_branches', { length: 10 }).default('5'),
    featuresJson: jsonb('features_json').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true })
  },
  (table) => ({
    slugUnique: uniqueIndex('tenants_slug_unique').on(table.slug),
    statusIdx: index('idx_tenants_status').on(table.status),
    createdAtIdx: index('idx_tenants_created_at').on(table.createdAt)
  })
);
