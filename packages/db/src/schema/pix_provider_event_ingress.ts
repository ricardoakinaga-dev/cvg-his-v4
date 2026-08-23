import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { encounterPaymentAttempts } from './encounter_payment_attempts.js';

export const pixProviderEvents = pgTable(
  'pix_provider_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 32 }).notNull().default('local-pix'),
    providerEventId: varchar('provider_event_id', { length: 255 }).notNull(),
    eventType: varchar('event_type', { length: 128 }).notNull(),
    paymentAttemptId: uuid('payment_attempt_id').notNull(),
    providerTransactionId: varchar('provider_transaction_id', { length: 255 }).notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull(),
    bodyFingerprint: char('body_fingerprint', { length: 64 }).notNull(),
    claimsFingerprint: char('claims_fingerprint', { length: 64 }).notNull(),
    correlationId: varchar('correlation_id', { length: 255 }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdUnique: uniqueIndex('pix_provider_events_account_id_unique').on(
      table.accountId,
      table.id
    ),
    accountProviderEventUnique: uniqueIndex('pix_provider_events_account_provider_event_unique').on(
      table.accountId,
      table.provider,
      table.providerEventId
    ),
    accountAttemptFk: foreignKey({
      name: 'pix_provider_events_account_attempt_fk',
      columns: [table.accountId, table.paymentAttemptId],
      foreignColumns: [encounterPaymentAttempts.accountId, encounterPaymentAttempts.id]
    }).onDelete('restrict'),
    accountReceivedIdx: index('pix_provider_events_account_received_idx').on(
      table.accountId,
      table.receivedAt.desc()
    ),
    accountAttemptIdx: index('pix_provider_events_account_attempt_idx').on(
      table.accountId,
      table.paymentAttemptId,
      table.receivedAt.desc()
    ),
    providerChk: check('pix_provider_events_provider_chk', sql`${table.provider} = 'local-pix'`),
    providerEventIdChk: check(
      'pix_provider_events_provider_event_id_chk',
      sql`${table.providerEventId} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$'`
    ),
    eventTypeChk: check(
      'pix_provider_events_type_chk',
      sql`${table.eventType} = 'pix.payment.confirmed.v1'`
    ),
    providerTransactionIdChk: check(
      'pix_provider_events_provider_transaction_id_chk',
      sql`${table.providerTransactionId} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$'`
    ),
    amountCentsChk: check(
      'pix_provider_events_amount_cents_chk',
      sql`${table.amountCents} between 1 and 999999999999`
    ),
    currencyChk: check('pix_provider_events_currency_chk', sql`${table.currency} = 'BRL'`),
    bodyFingerprintChk: check(
      'pix_provider_events_body_fingerprint_chk',
      sql`${table.bodyFingerprint} ~ '^[a-f0-9]{64}$'`
    ),
    claimsFingerprintChk: check(
      'pix_provider_events_claims_fingerprint_chk',
      sql`${table.claimsFingerprint} ~ '^[a-f0-9]{64}$'`
    ),
    correlationIdChk: check(
      'pix_provider_events_correlation_id_chk',
      sql`btrim(${table.correlationId}) <> ''`
    )
  })
);

export const pixProviderEventDeliveries = pgTable(
  'pix_provider_event_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id').notNull(),
    state: varchar('state', { length: 32 }).notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(8),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow(),
    leaseOwner: varchar('lease_owner', { length: 160 }),
    leaseToken: uuid('lease_token'),
    leaseVersion: bigint('lease_version', { mode: 'number' }).notNull().default(0),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    lastErrorCode: varchar('last_error_code', { length: 64 }),
    lastErrorClass: varchar('last_error_class', { length: 32 }),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountEventUnique: uniqueIndex('pix_provider_event_deliveries_account_event_unique').on(
      table.accountId,
      table.eventId
    ),
    accountEventFk: foreignKey({
      name: 'pix_provider_event_deliveries_account_event_fk',
      columns: [table.accountId, table.eventId],
      foreignColumns: [pixProviderEvents.accountId, pixProviderEvents.id]
    }).onDelete('restrict'),
    claimIdx: index('pix_provider_event_deliveries_claim_idx').on(
      table.accountId,
      table.state,
      table.nextAttemptAt,
      table.leaseExpiresAt
    ),
    eventIdx: index('pix_provider_event_deliveries_event_idx').on(table.accountId, table.eventId),
    stateChk: check(
      'pix_provider_event_deliveries_state_chk',
      sql`${table.state} in ('pending', 'processing', 'applied', 'reconciliation_required')`
    ),
    attemptsChk: check(
      'pix_provider_event_deliveries_attempts_chk',
      sql`${table.attempts} >= 0 and ${table.maxAttempts} > 0 and ${table.attempts} <= ${table.maxAttempts}`
    ),
    leaseVersionChk: check(
      'pix_provider_event_deliveries_lease_version_chk',
      sql`${table.leaseVersion} >= 0`
    ),
    leaseStateChk: check(
      'pix_provider_event_deliveries_lease_state_chk',
      sql`(
        ${table.state} = 'processing'
        and ${table.leaseOwner} is not null
        and btrim(${table.leaseOwner}) <> ''
        and ${table.leaseToken} is not null
        and ${table.leaseExpiresAt} is not null
      ) or (
        ${table.state} <> 'processing'
        and ${table.leaseOwner} is null
        and ${table.leaseToken} is null
        and ${table.leaseExpiresAt} is null
      )`
    ),
    nextAttemptChk: check(
      'pix_provider_event_deliveries_next_attempt_chk',
      sql`(${table.state} = 'pending' and ${table.nextAttemptAt} is not null) or (${table.state} <> 'pending' and ${table.nextAttemptAt} is null)`
    ),
    errorCodeChk: check(
      'pix_provider_event_deliveries_error_code_chk',
      sql`${table.lastErrorCode} is null or ${table.lastErrorCode} ~ '^[A-Z0-9_]{1,64}$'`
    ),
    errorClassChk: check(
      'pix_provider_event_deliveries_error_class_chk',
      sql`${table.lastErrorClass} is null or ${table.lastErrorClass} in ('retryable', 'terminal')`
    ),
    appliedAtChk: check(
      'pix_provider_event_deliveries_applied_at_chk',
      sql`${table.appliedAt} is null or ${table.state} = 'applied'`
    )
  })
);
