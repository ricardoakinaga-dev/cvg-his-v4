import { sql } from 'drizzle-orm';
import { getPool, withTenantTransaction, type DatabaseClient } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type {
  AccountId,
  EncounterId,
  InventoryConsumptionId,
  InventoryConsumptionSummary,
  InventoryItemId,
  InventoryItemSummary,
  InventoryLotSummary,
  InventoryReservationSummary,
  InventoryStockMovementId,
  InventoryStockMovementSummary,
  PatientId,
  UserId
} from '@cvg-his-v2/shared-types';

export interface InventoryLotReservationUpdate {
  readonly lot: InventoryLotSummary;
  readonly reservedDelta: number;
}

export interface InventoryRepository {
  createItem(item: InventoryItemSummary): Promise<void>;
  updateItem(item: InventoryItemSummary): Promise<void>;
  findItemById(id: InventoryItemId): Promise<InventoryItemSummary | null>;
  findAllItems(accountId: AccountId): Promise<readonly InventoryItemSummary[]>;
  findLots?(accountId: AccountId): Promise<readonly InventoryLotSummary[]>;
  upsertLots?(lots: readonly InventoryLotSummary[]): Promise<void>;
  findReservations?(accountId: AccountId): Promise<readonly InventoryReservationSummary[]>;
  reserveAtomically?(
    reservations: readonly InventoryReservationSummary[],
    lotUpdates: readonly InventoryLotReservationUpdate[]
  ): Promise<void>;
  releaseReservationAtomically?(
    reservation: InventoryReservationSummary,
    lot: InventoryLotSummary
  ): Promise<void>;
  consumeReservationAtomically?(
    reservation: InventoryReservationSummary,
    item: InventoryItemSummary,
    lot: InventoryLotSummary,
    movement: InventoryStockMovementSummary
  ): Promise<void>;
  returnReservationAtomically?(
    reservation: InventoryReservationSummary,
    item: InventoryItemSummary,
    lot: InventoryLotSummary,
    movement: InventoryStockMovementSummary
  ): Promise<void>;
  createConsumption(consumption: InventoryConsumptionSummary): Promise<void>;
  findConsumptions(accountId: AccountId): Promise<readonly InventoryConsumptionSummary[]>;
  createStockMovement(movement: InventoryStockMovementSummary): Promise<void>;
  findStockMovements(accountId: AccountId): Promise<readonly InventoryStockMovementSummary[]>;
  consumeAtomically?(
    item: InventoryItemSummary,
    consumption: InventoryConsumptionSummary,
    movement: InventoryStockMovementSummary,
    lotUpdates?: readonly InventoryLotSummary[]
  ): Promise<void>;
  adjustAtomically?(
    item: InventoryItemSummary,
    movement: InventoryStockMovementSummary,
    lotUpdates?: readonly InventoryLotSummary[]
  ): Promise<void>;
  receiveAtomically?(
    item: InventoryItemSummary,
    movement: InventoryStockMovementSummary,
    lotUpdates: readonly InventoryLotSummary[]
  ): Promise<void>;
  transferAtomically?(
    item: InventoryItemSummary,
    movements: readonly InventoryStockMovementSummary[],
    lotUpdates: readonly InventoryLotSummary[]
  ): Promise<void>;
}

export class DatabaseInventoryRepository implements InventoryRepository {
  readonly #stockMovementsEnabled: boolean;

  public constructor(options: { readonly stockMovementsEnabled?: boolean } = {}) {
    this.#stockMovementsEnabled = options.stockMovementsEnabled !== false;
  }

  private async persistLots(
    database: DatabaseClient,
    lots: readonly InventoryLotSummary[]
  ): Promise<void> {
    for (const lot of lots) {
      await database.execute(sql`INSERT INTO inventory_lots
        (id, account_id, inventory_item_id, lot_number, quantity, reserved_quantity, unit, location, supplier,
         manufacture_date, expiry_date, status, created_at, updated_at)
        VALUES (${lot.id}, ${lot.accountId}, ${lot.inventoryItemId}, ${lot.lotNumber},
          ${lot.quantity}, ${lot.reservedQuantity ?? 0}, ${lot.unit}, ${lot.location ?? null}, ${lot.supplier ?? null},
          ${lot.manufactureDate ? new Date(lot.manufactureDate) : null},
          ${lot.expiryDate ? new Date(lot.expiryDate) : null}, ${lot.status},
          ${new Date(lot.createdAt)}, ${new Date(lot.updatedAt)})
        ON CONFLICT (account_id, inventory_item_id, lot_number)
        DO UPDATE SET
          id = EXCLUDED.id,
          quantity = EXCLUDED.quantity,
          reserved_quantity = EXCLUDED.reserved_quantity,
          unit = EXCLUDED.unit,
          location = EXCLUDED.location,
          supplier = EXCLUDED.supplier,
          manufacture_date = EXCLUDED.manufacture_date,
          expiry_date = EXCLUDED.expiry_date,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at`);
    }
  }

  async consumeAtomically(
    item: InventoryItemSummary,
    consumption: InventoryConsumptionSummary,
    movement: InventoryStockMovementSummary,
    lotUpdates: readonly InventoryLotSummary[] = []
  ): Promise<void> {
    await withTenantTransaction(item.accountId, async (database) => {
      const updated = await database.execute(sql`UPDATE inventory_items
        SET on_hand_quantity = ${item.onHandQuantity - consumption.quantity},
            updated_at = ${new Date(item.updatedAt)}
        WHERE id = ${item.id}
          AND account_id = ${item.accountId}
          AND on_hand_quantity = ${item.onHandQuantity}
          AND on_hand_quantity >= ${consumption.quantity}
        RETURNING id`);
      if (updated.rowCount !== 1) {
        throw new Error('Inventory balance changed or is insufficient for consumption');
      }

      await database.execute(sql`INSERT INTO inventory_consumptions
        (id, account_id, inventory_item_id, encounter_id, patient_id, quantity, unit,
         cost_amount, source_entity_type, source_entity_id, recorded_by_user_id, created_at)
        VALUES (${consumption.id}, ${consumption.accountId}, ${consumption.inventoryItemId},
          ${consumption.encounterId}, ${consumption.patientId}, ${consumption.quantity},
          ${consumption.unit}, ${consumption.costAmount}, ${consumption.sourceEntityType},
          ${consumption.sourceEntityId ?? null}, ${consumption.recordedByUserId},
          ${new Date(consumption.createdAt)})`);

      if (this.#stockMovementsEnabled) {
        await database.execute(sql`INSERT INTO inventory_stock_movements
          (id, account_id, inventory_item_id, movement_type, quantity_delta, balance_before,
           balance_after, unit_cost_amount, reason, reference, recorded_by_user_id, created_at)
          VALUES (${movement.id}, ${movement.accountId}, ${movement.inventoryItemId},
            ${movement.movementType}, ${movement.quantityDelta}, ${movement.balanceBefore},
            ${movement.balanceAfter}, ${movement.unitCostAmount}, ${movement.reason},
            ${movement.reference ?? null}, ${movement.recordedByUserId}, ${new Date(movement.createdAt)})`);
      }
      await this.persistLots(database, lotUpdates);
    });
  }

  async adjustAtomically(
    item: InventoryItemSummary,
    movement: InventoryStockMovementSummary,
    lotUpdates: readonly InventoryLotSummary[] = []
  ): Promise<void> {
    await withTenantTransaction(item.accountId, async (database) => {
      const updated = await database.execute(sql`UPDATE inventory_items
        SET on_hand_quantity = ${movement.balanceAfter}, updated_at = ${new Date(item.updatedAt)}
        WHERE id = ${item.id}
          AND account_id = ${item.accountId}
          AND on_hand_quantity = ${movement.balanceBefore}
        RETURNING id`);
      if (updated.rowCount !== 1) {
        throw new Error('Inventory balance changed while applying adjustment');
      }
      if (this.#stockMovementsEnabled) {
        await database.execute(sql`INSERT INTO inventory_stock_movements
          (id, account_id, inventory_item_id, movement_type, quantity_delta, balance_before,
           balance_after, unit_cost_amount, reason, reference, recorded_by_user_id, created_at)
          VALUES (${movement.id}, ${movement.accountId}, ${movement.inventoryItemId},
            ${movement.movementType}, ${movement.quantityDelta}, ${movement.balanceBefore},
            ${movement.balanceAfter}, ${movement.unitCostAmount}, ${movement.reason},
            ${movement.reference ?? null}, ${movement.recordedByUserId}, ${new Date(movement.createdAt)})`);
      }
      await this.persistLots(database, lotUpdates);
    });
  }

  async receiveAtomically(
    item: InventoryItemSummary,
    movement: InventoryStockMovementSummary,
    lotUpdates: readonly InventoryLotSummary[]
  ): Promise<void> {
    await withTenantTransaction(item.accountId, async (database) => {
      const updated = await database.execute(sql`UPDATE inventory_items
        SET on_hand_quantity = ${movement.balanceAfter},
            unit_cost_amount = ${item.unitCostAmount},
            updated_at = ${new Date(item.updatedAt)}
        WHERE id = ${item.id}
          AND account_id = ${item.accountId}
          AND on_hand_quantity = ${movement.balanceBefore}
        RETURNING id`);
      if (updated.rowCount !== 1) {
        throw new Error('Inventory balance changed while receiving stock');
      }
      await database.execute(sql`INSERT INTO inventory_stock_movements
        (id, account_id, inventory_item_id, movement_type, quantity_delta, balance_before,
         balance_after, unit_cost_amount, reason, reference, recorded_by_user_id, created_at)
        VALUES (${movement.id}, ${movement.accountId}, ${movement.inventoryItemId},
          ${movement.movementType}, ${movement.quantityDelta}, ${movement.balanceBefore},
          ${movement.balanceAfter}, ${movement.unitCostAmount}, ${movement.reason},
          ${movement.reference ?? null}, ${movement.recordedByUserId}, ${new Date(movement.createdAt)})`);
      await this.persistLots(database, lotUpdates);
    });
  }

  async transferAtomically(
    item: InventoryItemSummary,
    movements: readonly InventoryStockMovementSummary[],
    lotUpdates: readonly InventoryLotSummary[]
  ): Promise<void> {
    await withTenantTransaction(item.accountId, async (database) => {
      const locked = await database.execute(sql`SELECT on_hand_quantity
        FROM inventory_items
        WHERE id = ${item.id} AND account_id = ${item.accountId}
        FOR UPDATE`);
      const currentBalance = Number(locked.rows[0]?.on_hand_quantity);
      if (locked.rowCount !== 1 || currentBalance !== item.onHandQuantity) {
        throw new Error('Inventory balance changed while transferring stock');
      }
      for (const movement of movements) {
        await database.execute(sql`INSERT INTO inventory_stock_movements
          (id, account_id, inventory_item_id, movement_type, quantity_delta, balance_before,
           balance_after, unit_cost_amount, reason, reference, recorded_by_user_id, created_at)
          VALUES (${movement.id}, ${movement.accountId}, ${movement.inventoryItemId},
            ${movement.movementType}, ${movement.quantityDelta}, ${movement.balanceBefore},
            ${movement.balanceAfter}, ${movement.unitCostAmount}, ${movement.reason},
            ${movement.reference ?? null}, ${movement.recordedByUserId}, ${new Date(movement.createdAt)})`);
      }
      await this.persistLots(database, lotUpdates);
    });
  }

  async createItem(item: InventoryItemSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `INSERT INTO inventory_items (id, account_id, sku, name, unit, on_hand_quantity, reorder_level, unit_cost_amount, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [item.id, item.accountId, item.sku, item.name, item.unit,
         item.onHandQuantity, item.reorderLevel, item.unitCostAmount,
         new Date(item.createdAt), new Date(item.updatedAt)]
      );
    });
  }

  async updateItem(item: InventoryItemSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE inventory_items
         SET name = $2,
             unit = $3,
             on_hand_quantity = $4,
             reorder_level = $5,
             unit_cost_amount = $6,
             updated_at = $7
         WHERE id = $1 AND account_id = app.current_account_id()`,
        [
          item.id,
          item.name,
          item.unit,
          item.onHandQuantity,
          item.reorderLevel,
          item.unitCostAmount,
          new Date(item.updatedAt)
        ]
      );
      if (result.rowCount !== 1) throw new Error(`Inventory item not found in current account: ${item.id}`);
      return result;
    });
  }

  async findItemById(id: InventoryItemId): Promise<InventoryItemSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM inventory_items
         WHERE id = $1 AND account_id = app.current_account_id()`,
        [id]
      );
      if (result.rows.length === 0) return null;
      return this.mapItem(result.rows[0]);
    });
  }

  async findAllItems(accountId: AccountId): Promise<readonly InventoryItemSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM inventory_items WHERE account_id = $1 ORDER BY name', [accountId]);
      return result.rows.map((r: Record<string, unknown>) => this.mapItem(r));
    });
  }

  async findLots(accountId: AccountId): Promise<readonly InventoryLotSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT lot.*, item.sku, item.name AS item_name
           FROM inventory_lots AS lot
           JOIN inventory_items AS item
             ON item.account_id = lot.account_id AND item.id = lot.inventory_item_id
          WHERE lot.account_id = $1
          ORDER BY lot.expiry_date ASC NULLS LAST, lot.id ASC`,
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapLot(row));
    });
  }

  async upsertLots(lots: readonly InventoryLotSummary[]): Promise<void> {
    if (lots.length === 0) return;
    const accountId = lots[0].accountId;
    if (lots.some((lot) => lot.accountId !== accountId)) {
      throw new Error('Inventory lots must belong to one account');
    }
    await withTenantTransaction(accountId, (database) => this.persistLots(database, lots));
  }

  async findReservations(accountId: AccountId): Promise<readonly InventoryReservationSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT reservation.*, lot.lot_number, lot.unit, item.sku, item.name AS item_name,
                item.unit_cost_amount
           FROM inventory_reservations AS reservation
           JOIN inventory_lots AS lot
             ON lot.account_id = reservation.account_id AND lot.id = reservation.inventory_lot_id
           JOIN inventory_items AS item
             ON item.account_id = reservation.account_id AND item.id = reservation.inventory_item_id
          WHERE reservation.account_id = $1
          ORDER BY reservation.created_at DESC`,
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapReservation(row));
    });
  }

  async reserveAtomically(
    reservations: readonly InventoryReservationSummary[],
    lotUpdates: readonly InventoryLotReservationUpdate[]
  ): Promise<void> {
    if (reservations.length === 0 || lotUpdates.length === 0) return;
    const accountId = reservations[0].accountId;
    if (
      reservations.some((reservation) => reservation.accountId !== accountId) ||
      lotUpdates.some((update) => update.lot.accountId !== accountId)
    ) {
      throw new Error('Inventory reservation records must belong to one account');
    }

    await withTenantTransaction(accountId, async (database) => {
      for (const update of lotUpdates) {
        const result = await database.execute(sql`UPDATE inventory_lots
          SET reserved_quantity = reserved_quantity + ${update.reservedDelta},
              updated_at = ${new Date(update.lot.updatedAt)}
          WHERE id = ${update.lot.id}
            AND account_id = ${accountId}
            AND inventory_item_id = ${update.lot.inventoryItemId}
            AND reserved_quantity + ${update.reservedDelta} >= 0
            AND quantity - reserved_quantity >= ${update.reservedDelta}
          RETURNING id`);
        if (result.rowCount !== 1) {
          throw new Error('Inventory lot balance changed while reserving stock');
        }
      }

      for (const reservation of reservations) {
        await database.execute(sql`INSERT INTO inventory_reservations (
            id, account_id, inventory_item_id, inventory_lot_id, quantity, unit,
            unit_cost_amount, status, source_entity_type, source_entity_id, reference,
            reserved_by_user_id, created_at, updated_at
          ) VALUES (
            ${reservation.id}, ${reservation.accountId}, ${reservation.inventoryItemId},
            ${reservation.inventoryLotId}, ${reservation.quantity}, ${reservation.unit},
            ${reservation.unitCostAmount}, ${reservation.status}, ${reservation.sourceEntityType},
            ${reservation.sourceEntityId ?? null}, ${reservation.reference ?? null},
            ${reservation.reservedByUserId}, ${new Date(reservation.createdAt)},
            ${new Date(reservation.updatedAt)}
          )`);
      }
    });
  }

  async releaseReservationAtomically(
    reservation: InventoryReservationSummary,
    lot: InventoryLotSummary
  ): Promise<void> {
    await withTenantTransaction(reservation.accountId, async (database) => {
      const lotResult = await database.execute(sql`UPDATE inventory_lots
        SET reserved_quantity = ${lot.reservedQuantity ?? 0}, updated_at = ${new Date(lot.updatedAt)}
        WHERE id = ${lot.id}
          AND account_id = ${reservation.accountId}
          AND inventory_item_id = ${reservation.inventoryItemId}
          AND reserved_quantity = ${(lot.reservedQuantity ?? 0) + reservation.quantity}
          AND reserved_quantity >= ${reservation.quantity}
        RETURNING id`);
      if (lotResult.rowCount !== 1) throw new Error('Inventory lot balance changed while releasing reservation');

      const reservationResult = await database.execute(sql`UPDATE inventory_reservations
        SET status = 'released', released_at = ${new Date(reservation.releasedAt ?? reservation.updatedAt)},
            updated_at = ${new Date(reservation.updatedAt)}
        WHERE id = ${reservation.id} AND account_id = ${reservation.accountId} AND status = 'reserved'
        RETURNING id`);
      if (reservationResult.rowCount !== 1) throw new Error('Inventory reservation is no longer active');
    });
  }

  async consumeReservationAtomically(
    reservation: InventoryReservationSummary,
    item: InventoryItemSummary,
    lot: InventoryLotSummary,
    movement: InventoryStockMovementSummary
  ): Promise<void> {
    await withTenantTransaction(reservation.accountId, async (database) => {
      const itemResult = await database.execute(sql`UPDATE inventory_items
        SET on_hand_quantity = ${item.onHandQuantity},
            updated_at = ${new Date(item.updatedAt)}
        WHERE id = ${item.id} AND account_id = ${reservation.accountId}
          AND on_hand_quantity = ${item.onHandQuantity + reservation.quantity}
          AND on_hand_quantity >= ${reservation.quantity}
        RETURNING id`);
      if (itemResult.rowCount !== 1) throw new Error('Inventory item balance changed while consuming reservation');

      const lotResult = await database.execute(sql`UPDATE inventory_lots
        SET quantity = ${lot.quantity}, reserved_quantity = ${lot.reservedQuantity ?? 0},
            status = ${lot.status}, updated_at = ${new Date(lot.updatedAt)}
        WHERE id = ${lot.id} AND account_id = ${reservation.accountId}
          AND quantity = ${lot.quantity + reservation.quantity}
          AND reserved_quantity = ${(lot.reservedQuantity ?? 0) + reservation.quantity}
          AND quantity >= ${reservation.quantity}
          AND reserved_quantity >= ${reservation.quantity}
        RETURNING id`);
      if (lotResult.rowCount !== 1) throw new Error('Inventory lot balance changed while consuming reservation');

      await this.insertStockMovement(database, movement);
      const reservationResult = await database.execute(sql`UPDATE inventory_reservations
        SET status = 'consumed', consumed_at = ${new Date(reservation.consumedAt ?? reservation.updatedAt)},
            updated_at = ${new Date(reservation.updatedAt)}
        WHERE id = ${reservation.id} AND account_id = ${reservation.accountId} AND status = 'reserved'
        RETURNING id`);
      if (reservationResult.rowCount !== 1) throw new Error('Inventory reservation is no longer active');
    });
  }

  async returnReservationAtomically(
    reservation: InventoryReservationSummary,
    item: InventoryItemSummary,
    lot: InventoryLotSummary,
    movement: InventoryStockMovementSummary
  ): Promise<void> {
    await withTenantTransaction(reservation.accountId, async (database) => {
      const itemResult = await database.execute(sql`UPDATE inventory_items
        SET on_hand_quantity = ${item.onHandQuantity},
            updated_at = ${new Date(item.updatedAt)}
        WHERE id = ${item.id} AND account_id = ${reservation.accountId}
          AND on_hand_quantity = ${item.onHandQuantity - reservation.quantity}
        RETURNING id`);
      if (itemResult.rowCount !== 1) throw new Error('Inventory item balance changed while returning reservation');

      const lotResult = await database.execute(sql`UPDATE inventory_lots
        SET quantity = ${lot.quantity}, reserved_quantity = ${lot.reservedQuantity ?? 0},
            status = ${lot.status}, updated_at = ${new Date(lot.updatedAt)}
        WHERE id = ${lot.id} AND account_id = ${reservation.accountId}
          AND quantity = ${lot.quantity - reservation.quantity}
          AND reserved_quantity = ${lot.reservedQuantity ?? 0}
        RETURNING id`);
      if (lotResult.rowCount !== 1) throw new Error('Inventory lot not found while returning reservation');

      await this.insertStockMovement(database, movement);
      const reservationResult = await database.execute(sql`UPDATE inventory_reservations
        SET status = 'returned', returned_at = ${new Date(reservation.returnedAt ?? reservation.updatedAt)},
            updated_at = ${new Date(reservation.updatedAt)}
        WHERE id = ${reservation.id} AND account_id = ${reservation.accountId} AND status = 'consumed'
        RETURNING id`);
      if (reservationResult.rowCount !== 1) throw new Error('Only consumed inventory reservations can be returned');
    });
  }

  private async insertStockMovement(
    database: DatabaseClient,
    movement: InventoryStockMovementSummary
  ): Promise<void> {
    if (!this.#stockMovementsEnabled) return;
    await database.execute(sql`INSERT INTO inventory_stock_movements
      (id, account_id, inventory_item_id, movement_type, quantity_delta, balance_before,
       balance_after, unit_cost_amount, reason, reference, recorded_by_user_id, created_at)
      VALUES (${movement.id}, ${movement.accountId}, ${movement.inventoryItemId},
        ${movement.movementType}, ${movement.quantityDelta}, ${movement.balanceBefore},
        ${movement.balanceAfter}, ${movement.unitCostAmount}, ${movement.reason},
        ${movement.reference ?? null}, ${movement.recordedByUserId}, ${new Date(movement.createdAt)})`);
  }

  async createConsumption(consumption: InventoryConsumptionSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `INSERT INTO inventory_consumptions (id, account_id, inventory_item_id, encounter_id, patient_id, quantity, unit, cost_amount, source_entity_type, source_entity_id, recorded_by_user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [consumption.id, consumption.accountId, consumption.inventoryItemId,
         consumption.encounterId, consumption.patientId, consumption.quantity,
         consumption.unit, consumption.costAmount, consumption.sourceEntityType,
         consumption.sourceEntityId ?? null, consumption.recordedByUserId,
         new Date(consumption.createdAt)]
      );
    });
  }

  async findConsumptions(accountId: AccountId): Promise<readonly InventoryConsumptionSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM inventory_consumptions WHERE account_id = $1 ORDER BY created_at DESC', [accountId]);
      return result.rows.map((r: Record<string, unknown>) => this.mapConsumption(r));
    });
  }

  async createStockMovement(movement: InventoryStockMovementSummary): Promise<void> {
    if (!this.#stockMovementsEnabled) return;
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `INSERT INTO inventory_stock_movements (
          id, account_id, inventory_item_id, movement_type, quantity_delta,
          balance_before, balance_after, unit_cost_amount, reason, reference,
          recorded_by_user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          movement.id,
          movement.accountId,
          movement.inventoryItemId,
          movement.movementType,
          movement.quantityDelta,
          movement.balanceBefore,
          movement.balanceAfter,
          movement.unitCostAmount,
          movement.reason,
          movement.reference ?? null,
          movement.recordedByUserId,
          new Date(movement.createdAt)
        ]
      );
    });
  }

  async findStockMovements(accountId: AccountId): Promise<readonly InventoryStockMovementSummary[]> {
    if (!this.#stockMovementsEnabled) return [];
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM inventory_stock_movements WHERE account_id = $1 ORDER BY created_at DESC',
        [accountId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapStockMovement(r));
    });
  }

  private mapItem(row: Record<string, unknown>): InventoryItemSummary {
    return {
      id: row.id as InventoryItemId,
      accountId: row.account_id as AccountId,
      sku: row.sku as string,
      name: row.name as string,
      unit: row.unit as string,
      onHandQuantity: Number(row.on_hand_quantity),
      reorderLevel: Number(row.reorder_level),
      unitCostAmount: Number(row.unit_cost_amount),
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapConsumption(row: Record<string, unknown>): InventoryConsumptionSummary {
    return {
      id: row.id as InventoryConsumptionId,
      accountId: row.account_id as AccountId,
      inventoryItemId: row.inventory_item_id as InventoryItemId,
      encounterId: row.encounter_id as unknown as EncounterId,
      patientId: row.patient_id as unknown as PatientId,
      quantity: Number(row.quantity),
      unit: row.unit as string,
      costAmount: Number(row.cost_amount),
      sourceEntityType: row.source_entity_type as InventoryConsumptionSummary['sourceEntityType'],
      sourceEntityId: (row.source_entity_id as string) ?? undefined,
      recordedByUserId: row.recorded_by_user_id as UserId,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }

  private mapStockMovement(row: Record<string, unknown>): InventoryStockMovementSummary {
    return {
      id: row.id as InventoryStockMovementId,
      accountId: row.account_id as AccountId,
      inventoryItemId: row.inventory_item_id as InventoryItemId,
      movementType: row.movement_type as InventoryStockMovementSummary['movementType'],
      quantityDelta: Number(row.quantity_delta),
      balanceBefore: Number(row.balance_before),
      balanceAfter: Number(row.balance_after),
      unitCostAmount: Number(row.unit_cost_amount),
      reason: row.reason as string,
      reference: (row.reference as string) ?? undefined,
      recordedByUserId: row.recorded_by_user_id as UserId,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }

  private mapLot(row: Record<string, unknown>): InventoryLotSummary {
    const toIso = (value: unknown): string | undefined =>
      value === null || value === undefined ? undefined : new Date(value as string).toISOString();
    return {
      id: row.id as InventoryLotSummary['id'],
      accountId: row.account_id as AccountId,
      inventoryItemId: row.inventory_item_id as InventoryItemId,
      sku: row.sku as string,
      itemName: row.item_name as string,
      lotNumber: row.lot_number as string,
      quantity: Number(row.quantity),
      reservedQuantity: Number(row.reserved_quantity ?? 0),
      unit: row.unit as string,
      location: (row.location as string | null) ?? undefined,
      supplier: (row.supplier as string | null) ?? undefined,
      manufactureDate: toIso(row.manufacture_date),
      expiryDate: toIso(row.expiry_date),
      status: row.status as InventoryLotSummary['status'],
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapReservation(row: Record<string, unknown>): InventoryReservationSummary {
    const toIso = (value: unknown): string | undefined =>
      value === null || value === undefined ? undefined : new Date(value as string).toISOString();
    return {
      id: row.id as InventoryReservationSummary['id'],
      accountId: row.account_id as AccountId,
      inventoryItemId: row.inventory_item_id as InventoryItemId,
      inventoryLotId: row.inventory_lot_id as InventoryReservationSummary['inventoryLotId'],
      lotNumber: row.lot_number as string,
      quantity: Number(row.quantity),
      unit: row.unit as string,
      unitCostAmount: Number(row.unit_cost_amount),
      status: row.status as InventoryReservationSummary['status'],
      sourceEntityType: row.source_entity_type as InventoryReservationSummary['sourceEntityType'],
      sourceEntityId: (row.source_entity_id as string) ?? undefined,
      reference: (row.reference as string) ?? undefined,
      reservedByUserId: row.reserved_by_user_id as UserId,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString(),
      releasedAt: toIso(row.released_at),
      consumedAt: toIso(row.consumed_at),
      returnedAt: toIso(row.returned_at)
    };
  }
}
