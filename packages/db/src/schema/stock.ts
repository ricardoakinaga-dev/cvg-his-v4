import { sql } from 'drizzle-orm';
import { index, integer, numeric, pgTable, text, timestamp, uuid, boolean, pgEnum } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { products } from './products.js';

// =====================
// Enums
// =====================

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'purchase',      // Entrada por compra
  'sale',          // Saída por venda
  'adjustment_in', // Ajuste positivo
  'adjustment_out',// Ajuste negativo
  'transfer',      // Transferência entre unidades
  'return',        // Devolução
  'loss',          // Perda/avaria
  'initial'        // Saldo inicial
]);

export const stockLotStatusEnum = pgEnum('stock_lot_status', [
  'active',    // Ativo
  'expired',   // Vencido
  'recalled',  // Recolhido
  'depleted'   // Esgotado
]);

// =====================
// Stock Items (Saldo por produto)
// =====================

export const stockItems = pgTable(
  'stock_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(0),
    minQuantity: integer('min_quantity').notNull().default(0),   // Estoque mínimo para alerta
    maxQuantity: integer('max_quantity'),                          // Estoque máximo (opcional)
    location: text('location'),                                    // Localização física (ex: "Prateleira A3")
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountProductIdx: index('idx_stock_items_account_product').on(table.accountId, table.productId),
    accountActiveIdx: index('idx_stock_items_account_active').on(table.accountId, table.active),
    lowStockIdx: index('idx_stock_items_low_stock').on(table.accountId, table.quantity, table.minQuantity)
  })
);

// =====================
// Stock Lots (Lotes com validade)
// =====================

export const stockLots = pgTable(
  'stock_lots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    lotNumber: text('lot_number').notNull(),               // Número do lote
    quantity: integer('quantity').notNull().default(0),     // Quantidade disponível no lote
    manufactureDate: timestamp('manufacture_date', { withTimezone: true }),
    expiryDate: timestamp('expiry_date', { withTimezone: true }),
    supplier: text('supplier'),                             // Fornecedor
    status: stockLotStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountProductIdx: index('idx_stock_lots_account_product').on(table.accountId, table.productId),
    expiryIdx: index('idx_stock_lots_expiry').on(table.accountId, table.expiryDate),
    lotNumberIdx: index('idx_stock_lots_number').on(table.accountId, table.lotNumber),
    statusIdx: index('idx_stock_lots_status').on(table.accountId, table.status)
  })
);

// =====================
// Stock Movements (Histórico de movimentações)
// =====================

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    lotId: uuid('lot_id')
      .references(() => stockLots.id, { onDelete: 'set null' }),
    movementType: stockMovementTypeEnum('movement_type').notNull(),
    quantity: integer('quantity').notNull(),                  // Sempre positivo; direção vem do type
    previousQuantity: integer('previous_quantity').notNull(), // Saldo antes
    newQuantity: integer('new_quantity').notNull(),           // Saldo depois
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }),  // Custo unitário (para compras)
    reference: text('reference'),                              // Referência (ex: nota fiscal, pedido)
    notes: text('notes'),
    createdByUserId: uuid('created_by_user_id'),              // Quem fez a movimentação
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountProductIdx: index('idx_stock_movements_account_product').on(table.accountId, table.productId),
    accountTypeIdx: index('idx_stock_movements_account_type').on(table.accountId, table.movementType),
    createdAtIdx: index('idx_stock_movements_created_at').on(table.accountId, table.createdAt),
    lotIdx: index('idx_stock_movements_lot').on(table.lotId)
  })
);
