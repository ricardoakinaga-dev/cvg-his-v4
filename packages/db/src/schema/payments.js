import { index, integer, numeric, pgTable, text, timestamp, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { encounterFinancialAccounts } from './encounter_financial_accounts.js';
// =====================
// Enums
// =====================
export const paymentMethodEnum = pgEnum('payment_method', [
    'cash', // Dinheiro
    'credit_card', // Cartão de crédito
    'debit_card', // Cartão de débito
    'pix', // PIX
    'bank_transfer', // Transferência bancária
    'check', // Cheque
    'insurance', // Convênio/Seguro
    'other' // Outro
]);
export const paymentStatusEnum = pgEnum('payment_status', [
    'pending', // Pendente
    'completed', // Concluído
    'refunded', // Estornado
    'cancelled' // Cancelado
]);
// =====================
// Payments (Pagamentos)
// =====================
export const payments = pgTable('payments', {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
        .notNull()
        .references(() => accounts.id, { onDelete: 'cascade' }),
    financialAccountId: uuid('financial_account_id')
        .notNull()
        .references(() => encounterFinancialAccounts.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    method: paymentMethodEnum('method').notNull(),
    status: paymentStatusEnum('status').notNull().default('completed'),
    installments: integer('installments').notNull().default(1), // Parcelas
    installmentNumber: integer('installment_number').notNull().default(1), // Qual parcela
    reference: text('reference'), // NSU, código PIX, etc.
    notes: text('notes'),
    processedByUserId: uuid('processed_by_user_id'), // Quem processou
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    accountIdx: index('idx_payments_account').on(table.accountId),
    financialAccountIdx: index('idx_payments_financial_account').on(table.financialAccountId),
    methodIdx: index('idx_payments_method').on(table.accountId, table.method),
    statusIdx: index('idx_payments_status').on(table.accountId, table.status),
    createdAtIdx: index('idx_payments_created_at').on(table.accountId, table.createdAt)
}));
//# sourceMappingURL=payments.js.map