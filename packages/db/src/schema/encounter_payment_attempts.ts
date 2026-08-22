import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { billingRecords } from './billing_records.js';
import { encounters } from './encounters.js';
import { users } from './users.js';

export const encounterPaymentAttempts = pgTable(
  'encounter_payment_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id').notNull(),
    billingRecordId: text('billing_record_id').notNull(),
    requestedByUserId: uuid('requested_by_user_id').notNull(),
    paymentMethod: varchar('payment_method', { length: 16 }).notNull().default('pix'),
    providerKey: varchar('provider_key', { length: 64 }).notNull(),
    state: varchar('state', { length: 40 }).notNull().default('pending_dispatch'),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    requestKeyHash: char('request_key_hash', { length: 64 }).notNull(),
    providerIdempotencyKey: varchar('provider_idempotency_key', { length: 128 }).notNull(),
    providerTransactionId: varchar('provider_transaction_id', { length: 255 }),
    qrCodePayload: text('qr_code_payload'),
    qrCodeBase64: text('qr_code_base64'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastErrorCode: varchar('last_error_code', { length: 64 }),
    lastErrorClass: varchar('last_error_class', { length: 32 }),
    lastErrorPublicMessage: varchar('last_error_public_message', { length: 512 }),
    dispatchAttempts: integer('dispatch_attempts').notNull().default(0),
    maxDispatchAttempts: integer('max_dispatch_attempts').notNull().default(5),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow(),
    leaseOwner: varchar('lease_owner', { length: 160 }),
    leaseToken: uuid('lease_token'),
    leaseVersion: bigint('lease_version', { mode: 'number' }).notNull().default(0),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    version: bigint('version', { mode: 'number' }).notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdIdUnique: uniqueIndex('encounter_payment_attempts_account_id_id_unique').on(
      table.accountId,
      table.id
    ),
    accountIdIdBillingUnique: uniqueIndex(
      'encounter_payment_attempts_account_id_id_billing_unique'
    ).on(table.accountId, table.id, table.billingRecordId),
    accountRequestKeyUnique: uniqueIndex(
      'encounter_payment_attempts_account_request_key_unique'
    ).on(table.accountId, table.requestKeyHash),
    accountBillingMethodUnique: uniqueIndex(
      'encounter_payment_attempts_account_billing_method_unique'
    ).on(table.accountId, table.billingRecordId, table.paymentMethod),
    providerIdempotencyKeyUnique: uniqueIndex(
      'encounter_payment_attempts_provider_idempotency_key_unique'
    ).on(table.providerKey, table.providerIdempotencyKey),
    providerTransactionUnique: uniqueIndex('uidx_encounter_payment_attempts_provider_transaction')
      .on(table.providerKey, table.providerTransactionId)
      .where(sql`${table.providerTransactionId} IS NOT NULL`),
    accountEncounterFk: foreignKey({
      name: 'encounter_payment_attempts_account_encounter_fk',
      columns: [table.accountId, table.encounterId],
      foreignColumns: [encounters.accountId, encounters.id]
    }).onDelete('restrict'),
    accountBillingFk: foreignKey({
      name: 'encounter_payment_attempts_account_billing_fk',
      columns: [table.accountId, table.billingRecordId, table.encounterId],
      foreignColumns: [billingRecords.accountId, billingRecords.id, billingRecords.encounterId]
    }).onDelete('restrict'),
    accountRequestedByUserFk: foreignKey({
      name: 'encounter_payment_attempts_account_requested_by_user_fk',
      columns: [table.accountId, table.requestedByUserId],
      foreignColumns: [users.accountId, users.id]
    }).onDelete('restrict'),
    dispatchClaimIdx: index('idx_encounter_payment_attempts_dispatch_claim').on(
      table.accountId,
      table.state,
      table.nextAttemptAt,
      table.leaseExpiresAt
    ),
    accountEncounterIdx: index('idx_encounter_payment_attempts_account_encounter').on(
      table.accountId,
      table.encounterId
    ),
    paymentMethodPixChk: check(
      'encounter_payment_attempts_payment_method_pix_chk',
      sql`${table.paymentMethod} = 'pix'`
    ),
    providerKeyNotBlankChk: check(
      'encounter_payment_attempts_provider_key_not_blank_chk',
      sql`btrim(${table.providerKey}) <> ''`
    ),
    stateChk: check(
      'encounter_payment_attempts_state_chk',
      sql`${table.state} in (
        'pending_dispatch',
        'awaiting_confirmation',
        'confirmed_pending_apply',
        'settled',
        'expired',
        'cancelled',
        'dispatch_failed',
        'reconciliation_required'
      )`
    ),
    amountCentsPositiveChk: check(
      'encounter_payment_attempts_amount_cents_positive_chk',
      sql`${table.amountCents} > 0`
    ),
    currencyBrlChk: check(
      'encounter_payment_attempts_currency_brl_chk',
      sql`${table.currency} = 'BRL'`
    ),
    requestKeyHashChk: check(
      'encounter_payment_attempts_request_key_hash_chk',
      sql`${table.requestKeyHash} ~ '^[a-f0-9]{64}$'`
    ),
    providerIdempotencyKeyChk: check(
      'encounter_payment_attempts_provider_idempotency_key_chk',
      sql`${table.providerIdempotencyKey} = 'cvg:pix:create:v1:' || ${table.id}::text`
    ),
    dispatchAttemptsChk: check(
      'encounter_payment_attempts_dispatch_attempts_chk',
      sql`${table.dispatchAttempts} >= 0
        and ${table.maxDispatchAttempts} > 0
        and ${table.dispatchAttempts} <= ${table.maxDispatchAttempts}`
    ),
    leaseVersionChk: check(
      'encounter_payment_attempts_lease_version_chk',
      sql`${table.leaseVersion} >= 0`
    ),
    versionChk: check('encounter_payment_attempts_version_chk', sql`${table.version} > 0`),
    nextAttemptStateChk: check(
      'encounter_payment_attempts_next_attempt_state_chk',
      sql`${table.nextAttemptAt} is null or ${table.state} = 'pending_dispatch'`
    ),
    leaseStateChk: check(
      'encounter_payment_attempts_lease_state_chk',
      sql`(
          ${table.leaseOwner} is null
          and ${table.leaseToken} is null
          and ${table.leaseExpiresAt} is null
        ) or (
          ${table.state} = 'pending_dispatch'
          and ${table.leaseOwner} is not null
          and btrim(${table.leaseOwner}) <> ''
          and ${table.leaseToken} is not null
          and ${table.leaseExpiresAt} is not null
        )`
    )
  })
);
