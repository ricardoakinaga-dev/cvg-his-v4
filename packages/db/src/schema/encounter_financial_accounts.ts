import { index, integer, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { encounters } from './encounters.js';
import { users } from './users.js';

export const encounterFinancialStatusEnum = pgEnum('encounter_financial_status', ['pending', 'partial', 'paid']);

export const encounterFinancialAccounts = pgTable(
  'encounter_financial_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    financialStatus: encounterFinancialStatusEnum('financial_status').notNull().default('pending'),
    subtotalSnapshot: numeric('subtotal_snapshot', { precision: 12, scale: 2 }).notNull().default('0'),
    discountTotalSnapshot: numeric('discount_total_snapshot', { precision: 12, scale: 2 }).notNull().default('0'),
    totalSnapshot: numeric('total_snapshot', { precision: 12, scale: 2 }).notNull().default('0'),
    paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    balanceDue: numeric('balance_due', { precision: 12, scale: 2 }).notNull().default('0'),
    closedByUserId: uuid('closed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    notes: text('notes'),
    snapshotJson: text('snapshot_json').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    encounterUniqueIdx: uniqueIndex('uidx_efa_encounter').on(table.encounterId),
    accountStatusIdx: index('idx_efa_account_status').on(table.accountId, table.financialStatus)
  })
);

export const encounterReceivableStatusEnum = pgEnum('encounter_receivable_status', ['open', 'settled']);

export const encounterReceivables = pgTable(
  'encounter_receivables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    financialAccountId: uuid('financial_account_id')
      .notNull()
      .references(() => encounterFinancialAccounts.id, { onDelete: 'cascade' }),
    installmentNumber: integer('installment_number').notNull().default(1),
    installmentLabel: text('installment_label').notNull().default('Parcela 1/1'),
    dueAt: timestamp('due_at', { withTimezone: true }),
    status: encounterReceivableStatusEnum('status').notNull().default('open'),
    amountOriginal: numeric('amount_original', { precision: 12, scale: 2 }).notNull(),
    amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).notNull().default('0'),
    amountOutstanding: numeric('amount_outstanding', { precision: 12, scale: 2 }).notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp('settled_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    financialInstallmentUniqueIdx: uniqueIndex('uidx_er_financial_installment').on(table.financialAccountId, table.installmentNumber),
    accountStatusIdx: index('idx_er_account_status').on(table.accountId, table.status),
    accountEncounterStatusIdx: index('idx_er_account_encounter_status').on(table.accountId, table.encounterId, table.status),
    accountDueAtIdx: index('idx_er_account_due_at').on(table.accountId, table.dueAt)
  })
);

export const encounterReceivablePayments = pgTable(
  'encounter_receivable_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    financialAccountId: uuid('financial_account_id')
      .notNull()
      .references(() => encounterFinancialAccounts.id, { onDelete: 'cascade' }),
    receivableId: uuid('receivable_id')
      .notNull()
      .references(() => encounterReceivables.id, { onDelete: 'cascade' }),
    amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
    paidByUserId: uuid('paid_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountReceivablePaidAtIdx: index('idx_erp_account_receivable_paid_at').on(table.accountId, table.receivableId, table.paidAt),
    accountFinancialPaidAtIdx: index('idx_erp_account_financial_paid_at').on(table.accountId, table.financialAccountId, table.paidAt)
  })
);
