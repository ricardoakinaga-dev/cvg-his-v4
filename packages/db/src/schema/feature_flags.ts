import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { accounts } from './accounts.js';

export const flagScopeEnum = pgEnum('flag_scope', [
  'global',
  'environment',
  'tenant',
  'account',
  'user'
]);

export const featureFlags = pgTable(
  'feature_flags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 128 }).notNull(),
    owner: varchar('owner', { length: 64 }).notNull(),
    description: text('description').notNull(),
    defaultValue: jsonb('default_value').$type<boolean>().notNull().default(sql`'false'::jsonb`),
    enabled: jsonb('enabled').$type<boolean>().notNull().default(sql`'true'::jsonb`),
    scopes: jsonb('scopes').$type<string[]>().notNull().default(sql`'["environment"]'::jsonb`),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    auditRequired: jsonb('audit_required').$type<boolean>().notNull().default(sql`'false'::jsonb`),
    tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    metadata: jsonb('metadata').$type<Record<string, string | number | boolean>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountKeyIdx: index('idx_feature_flags_account_key').on(table.accountId, table.key),
    accountEnabledIdx: index('idx_feature_flags_account_enabled').on(table.accountId, table.enabled)
  })
);

export const featureFlagOverrides = pgTable(
  'feature_flag_overrides',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    flagId: uuid('flag_id')
      .notNull()
      .references(() => featureFlags.id, { onDelete: 'cascade' }),
    environment: varchar('environment', { length: 32 }),
    accountIdOverride: uuid('account_id_override'),
    userId: uuid('user_id'),
    percentage: jsonb('percentage').$type<number | null>(),
    allowedUsers: jsonb('allowed_users').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    enabled: jsonb('enabled').$type<boolean>().notNull().default(sql`'true'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    flagEnvironmentIdx: index('idx_flag_overrides_flag_env').on(table.flagId, table.environment),
    flagAccountIdx: index('idx_flag_overrides_flag_account').on(table.flagId, table.accountIdOverride),
    flagUserIdx: index('idx_flag_overrides_flag_user').on(table.flagId, table.userId)
  })
);
