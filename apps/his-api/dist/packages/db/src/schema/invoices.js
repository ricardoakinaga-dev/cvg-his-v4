import { index, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { encounters } from './encounters.js';
import { users } from './users.js';
// Invoice status enum
export const invoiceStatusEnum = pgEnum('invoice_status', ['open', 'paid', 'partial', 'cancelled']);
// Payment method enum
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card', 'pix']);
// Invoices table
export const invoices = pgTable('invoices', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    encounterId: uuid('encounter_id')
        .notNull()
        .references(() => encounters.id, { onDelete: 'cascade' }),
    invoiceNumber: text('invoice_number').notNull(),
    status: invoiceStatusEnum('status').notNull().default('open'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    discount: numeric('discount', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
    paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    dueAmount: numeric('due_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    notes: text('notes'),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledReason: text('cancelled_reason'),
    createdByUserId: uuid('created_by_user_id')
        .notNull()
        .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountNumberIdx: index('invoices_account_number_unique').on(table.accountId, table.invoiceNumber),
    encounterIdx: index('invoices_encounter_id_idx').on(table.encounterId),
    accountStatusIdx: index('invoices_account_status_idx').on(table.accountId, table.status),
    accountCreatedIdx: index('invoices_account_created_idx').on(table.accountId, table.createdAt)
}));
// Payments table
export const payments = pgTable('payments', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    invoiceId: uuid('invoice_id')
        .notNull()
        .references(() => invoices.id, { onDelete: 'cascade' }),
    paymentNumber: text('payment_number').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    method: paymentMethodEnum('method').notNull().default('cash'),
    reference: text('reference'),
    notes: text('notes'),
    receivedByUserId: uuid('received_by_user_id')
        .notNull()
        .references(() => users.id),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountNumberIdx: index('payments_account_number_unique').on(table.accountId, table.paymentNumber),
    invoiceIdx: index('payments_invoice_id_idx').on(table.invoiceId),
    accountReceivedIdx: index('payments_account_received_idx').on(table.accountId, table.receivedAt),
    accountMethodIdx: index('payments_account_method_idx').on(table.accountId, table.method)
}));
//# sourceMappingURL=invoices.js.map