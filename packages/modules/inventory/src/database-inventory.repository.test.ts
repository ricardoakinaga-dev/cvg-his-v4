import { beforeEach, expect, test, vi } from 'vitest';

import {
  getPool,
  getTenantTransactionContext,
  withTenantTransaction
} from '@cvg-his-v2/shared-database';
import { ConflictError, ValidationError } from '@cvg-his-v2/shared-errors';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

import {
  DatabaseInventoryRepository,
  MAX_INVENTORY_ITEM_READ_ROWS
} from './repositories/database-inventory.repository.js';

const state = vi.hoisted(() => ({
  transaction: undefined as { accountId: string; database: unknown } | undefined
}));

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn(),
  getTenantTransactionContext: vi.fn(() => state.transaction),
  withTenantTransaction: vi.fn(async (_accountId: string, callback: (database: unknown) => Promise<unknown>) =>
    callback(database))
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: vi.fn(async (pool: unknown, callback: (client: unknown) => Promise<unknown>) =>
    callback(pool))
}));

const accountId = 'account-1';
const timestamp = new Date('2026-09-16T12:00:00.000Z');
const query = vi.fn();
const execute = vi.fn();
const pool = { query };
const database = { execute };

const itemRow = {
  id: 'item-1',
  account_id: accountId,
  sku: 'SKU-1',
  name: 'Syringe',
  unit: 'un',
  on_hand_quantity: '10',
  reorder_level: '2',
  unit_cost_amount: '1.50',
  charge_unit_price_amount: null,
  created_at: timestamp,
  updated_at: timestamp
};

const lotRow = {
  id: 'lot-1',
  account_id: accountId,
  inventory_item_id: 'item-1',
  sku: 'SKU-1',
  item_name: 'Syringe',
  lot_number: 'LOT-1',
  quantity: '10',
  reserved_quantity: null,
  unit: 'un',
  location: null,
  supplier: null,
  manufacture_date: null,
  expiry_date: timestamp,
  status: 'active',
  created_at: timestamp,
  updated_at: timestamp
};

const movementRow = {
  id: 'movement-1',
  account_id: accountId,
  inventory_item_id: 'item-1',
  movement_type: 'inbound',
  quantity_delta: '10',
  balance_before: '0',
  balance_after: '10',
  unit_cost_amount: '1.50',
  reason: 'receipt',
  reference: null,
  recorded_by_user_id: 'user-1',
  created_at: timestamp
};

const reservationRow = {
  id: 'reservation-1',
  account_id: accountId,
  inventory_item_id: 'item-1',
  inventory_lot_id: 'lot-1',
  lot_number: 'LOT-1',
  quantity: '2',
  unit: 'un',
  unit_cost_amount: '1.50',
  status: 'reserved',
  source_entity_type: 'encounter',
  source_entity_id: null,
  reference: null,
  reserved_by_user_id: 'user-1',
  created_at: timestamp,
  updated_at: timestamp,
  released_at: null,
  consumed_at: null,
  returned_at: null
};

const item = {
  id: 'item-1' as never,
  accountId: accountId as never,
  sku: 'SKU-1',
  name: 'Syringe',
  unit: 'un',
  onHandQuantity: 10,
  reorderLevel: 2,
  unitCostAmount: 1.5,
  chargeUnitPriceAmount: undefined,
  createdAt: timestamp.toISOString(),
  updatedAt: timestamp.toISOString()
};

const movement = {
  id: 'movement-1' as never,
  accountId: accountId as never,
  inventoryItemId: item.id,
  movementType: 'inbound' as const,
  quantityDelta: 2,
  balanceBefore: 10,
  balanceAfter: 12,
  unitCostAmount: 1.5,
  reason: 'receipt',
  reference: undefined,
  recordedByUserId: 'user-1' as never,
  createdAt: timestamp.toISOString()
};

const consumption = {
  id: 'consumption-1' as never,
  accountId: accountId as never,
  inventoryItemId: item.id,
  encounterId: 'encounter-1' as never,
  patientId: 'patient-1' as never,
  quantity: 2,
  unit: 'un',
  costAmount: 3,
  sourceEntityType: 'encounter' as const,
  sourceEntityId: undefined,
  recordedByUserId: 'user-1' as never,
  createdAt: timestamp.toISOString()
};

const lot = {
  id: 'lot-1' as never,
  accountId: accountId as never,
  inventoryItemId: item.id,
  sku: 'SKU-1',
  itemName: 'Syringe',
  lotNumber: 'LOT-1',
  quantity: 10,
  reservedQuantity: 2,
  unit: 'un',
  location: undefined,
  supplier: undefined,
  manufactureDate: undefined,
  expiryDate: timestamp.toISOString(),
  status: 'active' as const,
  createdAt: timestamp.toISOString(),
  updatedAt: timestamp.toISOString()
};

const reservation = {
  id: 'reservation-1' as never,
  accountId: accountId as never,
  inventoryItemId: item.id,
  inventoryLotId: lot.id,
  lotNumber: lot.lotNumber,
  quantity: 2,
  unit: 'un',
  unitCostAmount: 1.5,
  status: 'reserved' as const,
  sourceEntityType: 'encounter' as const,
  sourceEntityId: undefined,
  reference: undefined,
  reservedByUserId: 'user-1' as never,
  createdAt: timestamp.toISOString(),
  updatedAt: timestamp.toISOString(),
  releasedAt: undefined,
  consumedAt: undefined,
  returnedAt: undefined
};

beforeEach(() => {
  state.transaction = undefined;
  query.mockReset();
  execute.mockReset();
  vi.mocked(getPool).mockReturnValue(pool as never);
  vi.mocked(withTenantTransaction).mockImplementation(
    async (_accountId, callback) => callback(database as never)
  );
  execute.mockResolvedValue({ rowCount: 1, rows: [] });
  query.mockResolvedValue({ rows: [], rowCount: 1 });
});

test('DatabaseInventoryRepository exercises tenant-safe item, lot and movement persistence', async () => {
  const repository = new DatabaseInventoryRepository();
  expect(repository.stockMovementsEnabled).toBe(true);

  await repository.createItem(item);
  await repository.updateItem({ ...item, chargeUnitPriceAmount: 2 });
  query.mockResolvedValueOnce({ rows: [itemRow] });
  expect(await repository.findItemById(item.id)).toMatchObject({ id: item.id, chargeUnitPriceAmount: null });
  query.mockResolvedValueOnce({ rows: [] });
  expect(await repository.findItemById('missing' as never)).toBeNull();

  query.mockResolvedValueOnce({ rows: [itemRow] });
  expect(await repository.findAllItems(accountId as never, {
    search: ' SKU_% ',
    dateFrom: '2026-01-01',
    dateTo: '2026-12-31',
    limit: 4
  })).toHaveLength(1);
  expect(await repository.findAllItems(accountId as never)).toEqual([]);
  await expect(repository.findAllItems(accountId as never, { limit: 0 })).rejects.toBeInstanceOf(ValidationError);
  await expect(repository.findAllItems(accountId as never, { limit: MAX_INVENTORY_ITEM_READ_ROWS + 1 })).rejects.toThrow(/between/);

  query.mockResolvedValueOnce({ rows: [lotRow] });
  expect(await repository.findLots(accountId as never)).toMatchObject([
    { id: lot.id, reservedQuantity: 0, location: undefined, manufactureDate: undefined }
  ]);
  await repository.upsertLots([]);
  await expect(repository.upsertLots([lot, { ...lot, accountId: 'account-2' as never }])).rejects.toThrow(/one account/);
  await repository.upsertLots([lot]);

  query.mockResolvedValueOnce({ rows: [reservationRow] });
  expect(await repository.findReservations(accountId as never)).toMatchObject([
    { id: reservation.id, sourceEntityId: undefined, returnedAt: undefined }
  ]);
  query.mockResolvedValueOnce({ rows: [{ ...movementRow, item_sku: 'SKU-1', item_name: 'Syringe', item_unit: 'un' }] });
  expect(await repository.findConsumptions(accountId as never)).toMatchObject([{ id: 'movement-1' }]);
  await repository.createConsumption(consumption);
  await repository.createStockMovement(movement);
  query.mockResolvedValueOnce({ rows: [{ ...movementRow, item_sku: 'SKU-1', item_name: 'Syringe', item_unit: 'un' }] });
  expect(await repository.findStockMovements(accountId as never)).toMatchObject([{ id: movement.id }]);

  query.mockResolvedValueOnce({ rows: [{ ...movementRow, item_sku: 'SKU-1', item_name: 'Syringe', item_unit: 'un' }] });
  expect(await repository.findStockMovementReportRows(accountId as never, {
    search: ' SKU_% ',
    dateFrom: '2026-01-01',
    dateTo: '2026-12-31',
    limit: 5
  })).toMatchObject([{ sku: 'SKU-1', name: 'Syringe', unit: 'un' }]);
  await expect(repository.findStockMovementReportRows(accountId as never, { limit: 0 })).rejects.toBeInstanceOf(ValidationError);

  await repository.consumeAtomically(item, consumption, movement, [lot]);
  state.transaction = { accountId, database };
  await repository.consumeAtomically(item, consumption, movement);
  state.transaction = { accountId: 'account-2', database };
  await expect(repository.consumeAtomically(item, consumption, movement)).rejects.toBeInstanceOf(ConflictError);
  state.transaction = undefined;

  await repository.adjustAtomically(item, movement, [lot]);
  await repository.receiveAtomically(item, movement, [lot]);
  execute.mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(repository.adjustAtomically(item, movement)).rejects.toThrow(/adjustment/);
  execute.mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(repository.receiveAtomically(item, movement, [])).rejects.toThrow(/receiving/);

  execute.mockResolvedValueOnce({ rowCount: 1, rows: [{ on_hand_quantity: '10' }] });
  await repository.transferAtomically(item, [movement, { ...movement, id: 'movement-2' as never }], [lot]);
  execute.mockResolvedValueOnce({ rowCount: 1, rows: [{ on_hand_quantity: '9' }] });
  await expect(repository.transferAtomically(item, [movement], [])).rejects.toThrow(/transferring/);
});

test('DatabaseInventoryRepository covers reservation state transitions and fail-closed branches', async () => {
  const repository = new DatabaseInventoryRepository();
  await repository.reserveAtomically([], []);
  await expect(repository.reserveAtomically([reservation], [{ lot, reservedDelta: 1 }, { lot: { ...lot, accountId: 'account-2' as never }, reservedDelta: 1 }])).rejects.toThrow(/one account/);
  await repository.reserveAtomically([reservation], [{ lot, reservedDelta: 1 }]);
  execute.mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(repository.reserveAtomically([reservation], [{ lot, reservedDelta: 1 }])).rejects.toThrow(/reserving/);

  await repository.releaseReservationAtomically(reservation, lot);
  execute.mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(repository.releaseReservationAtomically(reservation, lot)).rejects.toThrow(/releasing/);
  execute.mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(repository.releaseReservationAtomically(reservation, lot)).rejects.toThrow(/no longer active/);

  await repository.consumeReservationAtomically(reservation, item, lot, movement);
  execute.mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(repository.consumeReservationAtomically(reservation, item, lot, movement)).rejects.toThrow(/consuming reservation/);
  execute.mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(repository.consumeReservationAtomically(reservation, item, lot, movement)).rejects.toThrow(/lot balance/);
  execute.mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(repository.consumeReservationAtomically(reservation, item, lot, movement)).rejects.toThrow(/no longer active/);

  await repository.returnReservationAtomically({ ...reservation, status: 'consumed' }, item, lot, movement);
  execute.mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(repository.returnReservationAtomically({ ...reservation, status: 'consumed' }, item, lot, movement)).rejects.toThrow(/returning reservation/);
  execute.mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(repository.returnReservationAtomically({ ...reservation, status: 'consumed' }, item, lot, movement)).rejects.toThrow(/lot not found/);
  execute.mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rowCount: 1, rows: [] }).mockResolvedValueOnce({ rowCount: 0, rows: [] });
  await expect(repository.returnReservationAtomically({ ...reservation, status: 'consumed' }, item, lot, movement)).rejects.toThrow(/Only consumed/);
});

test('DatabaseInventoryRepository disables movement writes and reads explicitly', async () => {
  const repository = new DatabaseInventoryRepository({ stockMovementsEnabled: false });
  expect(repository.stockMovementsEnabled).toBe(false);
  await repository.createStockMovement(movement);
  expect(await repository.findStockMovements(accountId as never)).toEqual([]);
  expect(await repository.findStockMovementReportRows(accountId as never)).toEqual([]);
  await repository.consumeAtomically(item, consumption, movement);
  expect(execute).toHaveBeenCalled();
});
