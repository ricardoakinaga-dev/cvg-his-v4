import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: text('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    unit: varchar('unit', { length: 50 }).notNull(),
    onHandQuantity: numeric('on_hand_quantity', { precision: 12, scale: 2 }).notNull().default('0'),
    reorderLevel: numeric('reorder_level', { precision: 12, scale: 2 }).notNull().default('0'),
    unitCostAmount: numeric('unit_cost_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountSkuUnique: uniqueIndex('inventory_items_account_sku_unique').on(
      table.accountId,
      table.sku
    ),
    accountIdIdUnique: uniqueIndex('inventory_items_account_id_id_unique').on(
      table.accountId,
      table.id
    ),
    accountNameIdx: index('idx_inventory_items_account_name').on(table.accountId, table.name),
    balancesChk: check(
      'inventory_items_balances_chk',
      sql`${table.onHandQuantity} >= 0 AND ${table.reorderLevel} >= 0`
    ),
    costChk: check('inventory_items_cost_chk', sql`${table.unitCostAmount} >= 0`)
  })
);

export const inventoryLots = pgTable(
  'inventory_lots',
  {
    id: text('id').primaryKey(),
    accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    inventoryItemId: text('inventory_item_id').notNull(),
    lotNumber: text('lot_number').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull().default('0'),
    reservedQuantity: numeric('reserved_quantity', { precision: 12, scale: 2 }).notNull().default('0'),
    unit: varchar('unit', { length: 50 }).notNull(),
    location: text('location'),
    supplier: text('supplier'),
    manufactureDate: timestamp('manufacture_date', { withTimezone: true }),
    expiryDate: timestamp('expiry_date', { withTimezone: true }),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountItemFk: foreignKey({
      name: 'inventory_lots_account_item_fk',
      columns: [table.accountId, table.inventoryItemId],
      foreignColumns: [inventoryItems.accountId, inventoryItems.id]
    }).onDelete('cascade'),
    accountItemLotUnique: uniqueIndex('inventory_lots_identity_unique').on(
      table.accountId,
      table.inventoryItemId,
      table.lotNumber
    ),
    accountIdIdUnique: uniqueIndex('inventory_lots_account_id_id_unique').on(
      table.accountId,
      table.id
    ),
    accountExpiryIdx: index('idx_inventory_lots_account_expiry').on(
      table.accountId,
      table.expiryDate
    ),
    accountItemExpiryIdx: index('idx_inventory_lots_account_item_expiry').on(
      table.accountId,
      table.inventoryItemId,
      table.expiryDate
    ),
    quantityChk: check('inventory_lots_quantity_chk', sql`${table.quantity} >= 0`),
    reservedChk: check(
      'inventory_lots_reserved_quantity_chk',
      sql`${table.reservedQuantity} >= 0 AND ${table.reservedQuantity} <= ${table.quantity}`
    )
  })
);

export const inventoryReservations = pgTable(
  'inventory_reservations',
  {
    id: text('id').primaryKey(),
    accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    inventoryItemId: text('inventory_item_id').notNull(),
    inventoryLotId: text('inventory_lot_id').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
    unit: varchar('unit', { length: 50 }).notNull(),
    unitCostAmount: numeric('unit_cost_amount', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    sourceEntityType: varchar('source_entity_type', { length: 32 }).notNull(),
    sourceEntityId: text('source_entity_id'),
    reference: text('reference'),
    reservedByUserId: text('reserved_by_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    returnedAt: timestamp('returned_at', { withTimezone: true })
  },
  (table) => ({
    accountItemFk: foreignKey({
      name: 'inventory_reservations_account_item_fk',
      columns: [table.accountId, table.inventoryItemId],
      foreignColumns: [inventoryItems.accountId, inventoryItems.id]
    }).onDelete('restrict'),
    accountLotFk: foreignKey({
      name: 'inventory_reservations_account_lot_fk',
      columns: [table.accountId, table.inventoryLotId],
      foreignColumns: [inventoryLots.accountId, inventoryLots.id]
    }).onDelete('restrict'),
    accountStatusIdx: index('idx_inventory_reservations_account_status').on(
      table.accountId,
      table.status,
      table.createdAt
    ),
    accountItemIdx: index('idx_inventory_reservations_account_item').on(
      table.accountId,
      table.inventoryItemId,
      table.createdAt
    ),
    accountLotIdx: index('idx_inventory_reservations_account_lot').on(
      table.accountId,
      table.inventoryLotId,
      table.status
    ),
    quantityChk: check(
      'inventory_reservations_quantity_chk',
      sql`${table.quantity} > 0 AND ${table.unitCostAmount} >= 0`
    ),
    statusChk: check(
      'inventory_reservations_status_chk',
      sql`${table.status} IN ('reserved', 'released', 'consumed', 'returned')`
    ),
    sourceTypeChk: check(
      'inventory_reservations_source_type_chk',
      sql`${table.sourceEntityType} IN ('encounter', 'diagnostic_order', 'surgery_case', 'inpatient_stay', 'prescription', 'other')`
    )
  })
);

export const inventoryConsumptions = pgTable(
  'inventory_consumptions',
  {
    id: text('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    inventoryItemId: text('inventory_item_id').notNull(),
    encounterId: text('encounter_id').notNull(),
    patientId: text('patient_id').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
    unit: varchar('unit', { length: 50 }).notNull(),
    costAmount: numeric('cost_amount', { precision: 12, scale: 2 }).notNull(),
    sourceEntityType: varchar('source_entity_type', { length: 32 }).notNull(),
    sourceEntityId: text('source_entity_id'),
    recordedByUserId: text('recorded_by_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountCreatedIdx: index('idx_inventory_consumptions_account_created').on(
      table.accountId,
      table.createdAt
    ),
    accountItemIdx: index('idx_inventory_consumptions_account_item').on(
      table.accountId,
      table.inventoryItemId,
      table.createdAt
    ),
    accountItemFk: foreignKey({
      name: 'inventory_consumptions_account_item_fk',
      columns: [table.accountId, table.inventoryItemId],
      foreignColumns: [inventoryItems.accountId, inventoryItems.id]
    }).onDelete('restrict'),
    quantityChk: check('inventory_consumptions_quantity_chk', sql`${table.quantity} > 0`),
    costChk: check('inventory_consumptions_cost_chk', sql`${table.costAmount} >= 0`),
    sourceTypeChk: check(
      'inventory_consumptions_source_type_chk',
      sql`${table.sourceEntityType} IN ('encounter', 'diagnostic_order', 'surgery_case', 'inpatient_stay', 'prescription', 'other')`
    )
  })
);

export const inventoryStockMovements = pgTable(
  'inventory_stock_movements',
  {
    id: text('id').primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    inventoryItemId: text('inventory_item_id').notNull(),
    movementType: text('movement_type').notNull(),
    quantityDelta: numeric('quantity_delta', { precision: 12, scale: 2 }).notNull(),
    balanceBefore: numeric('balance_before', { precision: 12, scale: 2 }).notNull(),
    balanceAfter: numeric('balance_after', { precision: 12, scale: 2 }).notNull(),
    unitCostAmount: numeric('unit_cost_amount', { precision: 12, scale: 2 }).notNull(),
    reason: text('reason').notNull(),
    reference: text('reference'),
    recordedByUserId: text('recorded_by_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountItemIdx: index('idx_inventory_stock_movements_account_item').on(
      table.accountId,
      table.inventoryItemId,
      table.createdAt
    ),
    accountTypeIdx: index('idx_inventory_stock_movements_account_type').on(
      table.accountId,
      table.movementType,
      table.createdAt
    ),
    accountItemFk: foreignKey({
      name: 'inventory_stock_movements_account_item_fk',
      columns: [table.accountId, table.inventoryItemId],
      foreignColumns: [inventoryItems.accountId, inventoryItems.id]
    }).onDelete('restrict'),
    typeChk: check(
      'inventory_stock_movements_type_chk',
      sql`${table.movementType} IN ('adjustment', 'inbound', 'outbound', 'transfer', 'consumption')`
    ),
    deltaChk: check('inventory_stock_movements_delta_chk', sql`${table.quantityDelta} <> 0`),
    balancesChk: check(
      'inventory_stock_movements_balances_chk',
      sql`${table.balanceBefore} >= 0 AND ${table.balanceAfter} >= 0`
    )
  })
);
