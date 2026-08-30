import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { owners } from './owners.js';
import { users } from './users.js';

/**
 * Immutable advance-payment facts. Balance is derived from allocations; it is
 * deliberately not stored here so a report cannot drift from its ledger.
 */
export const advancePayments = pgTable(
  'advance_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id').notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    sourceType: varchar('source_type', { length: 80 }).notNull(),
    sourceId: varchar('source_id', { length: 255 }).notNull(),
    reference: varchar('reference', { length: 255 }),
    notes: text('notes'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').notNull(),
    idempotencyKeyHash: varchar('idempotency_key_hash', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdIdUnique: uniqueIndex('advance_payments_account_id_id_unique').on(
      table.accountId,
      table.id
    ),
    accountOwnerIssuedAtIdx: index('idx_advance_payments_account_owner_issued_at').on(
      table.accountId,
      table.ownerId,
      table.issuedAt
    ),
    accountIssuedAtIdx: index('idx_advance_payments_account_issued_at').on(
      table.accountId,
      table.issuedAt
    ),
    accountIdempotencyUnique: uniqueIndex('advance_payments_account_idempotency_unique')
      .on(table.accountId, table.idempotencyKeyHash)
      .where(sql`${table.idempotencyKeyHash} is not null`),
    amountPositiveChk: check(
      'advance_payments_amount_cents_positive_chk',
      sql`${table.amountCents} > 0`
    ),
    currencyBrlChk: check(
      'advance_payments_currency_brl_chk',
      sql`${table.currency} = 'BRL'`
    ),
    accountOwnerFk: foreignKey({
      name: 'advance_payments_account_owner_fk',
      columns: [table.accountId, table.ownerId],
      foreignColumns: [owners.accountId, owners.id]
    }).onDelete('restrict'),
    accountCreatorFk: foreignKey({
      name: 'advance_payments_account_creator_fk',
      columns: [table.accountId, table.createdByUserId],
      foreignColumns: [users.accountId, users.id]
    }).onDelete('restrict')
  })
);

/** Append-only allocations reduce an advance balance without mutating its fact. */
export const advancePaymentAllocations = pgTable(
  'advance_payment_allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    advancePaymentId: uuid('advance_payment_id').notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    allocationType: varchar('allocation_type', { length: 32 }).notNull().default('compensation'),
    reference: varchar('reference', { length: 255 }),
    notes: text('notes'),
    allocatedAt: timestamp('allocated_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').notNull(),
    idempotencyKeyHash: varchar('idempotency_key_hash', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdIdUnique: uniqueIndex('advance_payment_allocations_account_id_id_unique').on(
      table.accountId,
      table.id
    ),
    accountPaymentIdx: index('idx_advance_payment_allocations_account_payment').on(
      table.accountId,
      table.advancePaymentId,
      table.allocatedAt
    ),
    accountIdempotencyUnique: uniqueIndex(
      'advance_payment_allocations_account_idempotency_unique'
    )
      .on(table.accountId, table.idempotencyKeyHash)
      .where(sql`${table.idempotencyKeyHash} is not null`),
    amountPositiveChk: check(
      'advance_payment_allocations_amount_cents_positive_chk',
      sql`${table.amountCents} > 0`
    ),
    allocationTypeChk: check(
      'advance_payment_allocations_type_chk',
      sql`${table.allocationType} = 'compensation'`
    ),
    accountPaymentFk: foreignKey({
      name: 'advance_payment_allocations_account_payment_fk',
      columns: [table.accountId, table.advancePaymentId],
      foreignColumns: [advancePayments.accountId, advancePayments.id]
    }).onDelete('restrict'),
    accountCreatorFk: foreignKey({
      name: 'advance_payment_allocations_account_creator_fk',
      columns: [table.accountId, table.createdByUserId],
      foreignColumns: [users.accountId, users.id]
    }).onDelete('restrict')
  })
);
