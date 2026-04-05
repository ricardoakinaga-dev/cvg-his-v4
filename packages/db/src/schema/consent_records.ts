import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { users } from './users.js';

export const consentPurposeEnum = pgEnum('consent_purpose', [
  'marketing',
  'analytics',
  'clinical',
  'financial',
  'operational',
  'notifications'
]);

export const consentStatusEnum = pgEnum('consent_status', ['granted', 'revoked', 'expired']);

export const consentOriginEnum = pgEnum('consent_origin', [
  'web_portal',
  'api',
  'mobile_app',
  'in_person',
  'phone',
  'email',
  'system_default'
]);

export const consentRecords = pgTable(
  'consent_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').notNull(),
    subjectType: text('subject_type').notNull(),
    purpose: consentPurposeEnum('purpose').notNull(),
    status: consentStatusEnum('status').notNull().default('granted'),
    origin: consentOriginEnum('origin').notNull().default('api'),
    grantedBy: uuid('granted_by')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    revokedBy: uuid('revoked_by').references(() => users.id, { onDelete: 'set null' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountSubjectIdx: index('idx_consent_account_subject').on(
      table.accountId,
      table.subjectId,
      table.subjectType
    ),
    accountPurposeStatusIdx: index('idx_consent_account_purpose_status').on(
      table.accountId,
      table.purpose,
      table.status
    ),
    subjectPurposeIdx: index('idx_consent_subject_purpose').on(
      table.subjectId,
      table.subjectType,
      table.purpose
    )
  })
);
