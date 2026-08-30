import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { users } from './users.js';

// =====================
// Enums
// =====================

export const cashRegisterStatusEnum = pgEnum('cash_register_status', [
  'open', // Aberto
  'closed' // Fechado
]);

export const cashMovementTypeEnum = pgEnum('cash_movement_type', [
  'opening', // Abertura (saldo inicial)
  'closing', // Fechamento (saldo final informado)
  'payment', // Entrada por pagamento
  'supply', // Suprimento (entrada de dinheiro)
  'deposit', // Depósito bancário (saída da gaveta)
  'withdrawal', // Sangria (saída de dinheiro)
  'adjustment' // Ajuste
]);

// =====================
// Cash Registers (Caixas)
// =====================

export const cashRegisters = pgTable(
  'cash_registers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    openedByUserId: uuid('opened_by_user_id')
      .notNull()
      .references(() => users.id),
    closedByUserId: uuid('closed_by_user_id').references(() => users.id),
    openingAmount: numeric('opening_amount', { precision: 12, scale: 2 }).notNull(),
    closingAmount: numeric('closing_amount', { precision: 12, scale: 2 }),
    expectedClosingAmount: numeric('expected_closing_amount', { precision: 12, scale: 2 }),
    difference: numeric('difference', { precision: 12, scale: 2 }),
    status: cashRegisterStatusEnum('status').notNull().default('open'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    oneOpenPerAccountUnique: uniqueIndex('uidx_cash_registers_one_open_per_account')
      .on(table.accountId)
      .where(sql`${table.status} = 'open'`),
    accountIdIdUnique: uniqueIndex('idx_cash_registers_account_id_id_unique').on(
      table.accountId,
      table.id
    ),
    accountStatusIdx: index('idx_cash_registers_account_status').on(table.accountId, table.status),
    openedAtIdx: index('idx_cash_registers_opened_at').on(table.accountId, table.openedAt),
    openedByIdx: index('idx_cash_registers_opened_by').on(table.openedByUserId)
  })
);

// =====================
// Cash Movements (Movimentações do Caixa)
// =====================

export const cashMovements = pgTable(
  'cash_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    cashRegisterId: uuid('cash_register_id')
      .notNull()
      .references(() => cashRegisters.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    movementType: cashMovementTypeEnum('movement_type').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    runningBalance: numeric('running_balance', { precision: 12, scale: 2 }).notNull(),
    reference: text('reference'),
    notes: text('notes'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdIdUnique: uniqueIndex('idx_cash_movements_account_id_id_unique').on(
      table.accountId,
      table.id
    ),
    accountRegisterFk: foreignKey({
      name: 'cash_movements_account_register_fk',
      columns: [table.accountId, table.cashRegisterId],
      foreignColumns: [cashRegisters.accountId, cashRegisters.id]
    }).onDelete('cascade'),
    cashRegisterIdx: index('idx_cash_movements_register').on(table.cashRegisterId),
    accountTypeIdx: index('idx_cash_movements_account_type').on(
      table.accountId,
      table.movementType
    ),
    createdAtIdx: index('idx_cash_movements_created_at').on(table.accountId, table.createdAt)
  })
);
