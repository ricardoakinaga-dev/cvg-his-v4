import type { PoolClient } from 'pg';

import { getPool } from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type {
  AccountId,
  EncounterId,
  InventoryConsumptionId,
  InventoryConsumptionSummary,
  InventoryItemId,
  InventoryItemSummary,
  InventoryStockMovementId,
  InventoryStockMovementSummary,
  PatientId,
  UserId
} from '@cvg-his-v2/shared-types';

export interface InventoryItemUpdate {
  readonly name?: string;
  readonly unit?: string;
  readonly onHandQuantity?: number;
  readonly reorderLevel?: number;
  readonly unitCostAmount?: number;
}

export interface InventoryItemCreationCommand {
  readonly item: InventoryItemSummary;
  readonly movementId: InventoryStockMovementId;
  readonly recordedByUserId: UserId;
  readonly reason: string;
  readonly reference?: string;
}

export interface InventoryItemUpdateCommand {
  readonly accountId: AccountId;
  readonly inventoryItemId: InventoryItemId;
  readonly update: InventoryItemUpdate;
  readonly updatedAt: string;
  readonly movementId: InventoryStockMovementId;
  readonly recordedByUserId: UserId;
  readonly reason: string;
  readonly reference?: string;
}

export interface InventoryConsumptionCommand {
  readonly accountId: AccountId;
  readonly inventoryItemId: InventoryItemId;
  readonly quantity: number;
  readonly consumptionId: InventoryConsumptionId;
  readonly movementId: InventoryStockMovementId;
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly sourceEntityType: InventoryConsumptionSummary['sourceEntityType'];
  readonly sourceEntityId?: string;
  readonly recordedByUserId: UserId;
  readonly createdAt: string;
}

export interface InventoryAdjustmentCommand {
  readonly accountId: AccountId;
  readonly inventoryItemId: InventoryItemId;
  readonly quantityDelta: number;
  readonly movementId: InventoryStockMovementId;
  readonly movementType?: InventoryStockMovementSummary['movementType'];
  readonly reason: string;
  readonly reference?: string;
  readonly recordedByUserId: UserId;
  readonly createdAt: string;
}

export interface InventoryConsumptionMutationResult {
  readonly item: InventoryItemSummary;
  readonly consumption: InventoryConsumptionSummary;
  readonly movement: InventoryStockMovementSummary;
  readonly stockVersion: number;
}

export interface InventoryAdjustmentMutationResult {
  readonly item: InventoryItemSummary;
  readonly movement: InventoryStockMovementSummary;
  readonly stockVersion: number;
}

export interface InventoryItemCreationMutationResult {
  readonly item: InventoryItemSummary;
  readonly movement: InventoryStockMovementSummary;
  readonly stockVersion: number;
}

export interface InventoryItemUpdateMutationResult {
  readonly item: InventoryItemSummary;
  readonly movement?: InventoryStockMovementSummary;
  readonly stockVersion: number;
}

export interface InventoryRepository {
  createItem(command: InventoryItemCreationCommand): Promise<InventoryItemCreationMutationResult>;
  updateItem(command: InventoryItemUpdateCommand): Promise<InventoryItemUpdateMutationResult>;
  findItemById(accountId: AccountId, id: InventoryItemId): Promise<InventoryItemSummary | null>;
  findAllItems(accountId: AccountId): Promise<readonly InventoryItemSummary[]>;
  createConsumption(consumption: InventoryConsumptionSummary): Promise<void>;
  findConsumptions(accountId: AccountId): Promise<readonly InventoryConsumptionSummary[]>;
  createStockMovement(movement: InventoryStockMovementSummary): Promise<void>;
  findStockMovements(accountId: AccountId): Promise<readonly InventoryStockMovementSummary[]>;
  consumeStock(command: InventoryConsumptionCommand): Promise<InventoryConsumptionMutationResult>;
  adjustStock(command: InventoryAdjustmentCommand): Promise<InventoryAdjustmentMutationResult>;
}

interface LockedInventoryItem {
  readonly item: InventoryItemSummary;
  readonly stockVersion: number;
}

function requireSingleAffectedRow(rowCount: number | null, operation: string): void {
  if (rowCount !== 1) {
    throw new Error(`${operation} did not affect exactly one row`);
  }
}

function requirePositiveStockQuantity(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ConflictError('Inventory consumption quantity must be positive', { quantity });
  }
  return Number(quantity.toFixed(2));
}

function requireNonZeroStockDelta(quantityDelta: number): number {
  if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
    throw new ConflictError('Inventory stock delta must be non-zero', { quantityDelta });
  }
  return Number(quantityDelta.toFixed(2));
}

function requireRecordedByUserId(value: UserId): UserId {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ConflictError('recordedByUserId must be a non-empty string', {
      field: 'recordedByUserId'
    });
  }
  return value.trim() as UserId;
}

export class DatabaseInventoryRepository implements InventoryRepository {
  readonly #stockMovementsEnabled: boolean;

  public constructor(options: { readonly stockMovementsEnabled?: boolean } = {}) {
    this.#stockMovementsEnabled = options.stockMovementsEnabled !== false;
  }

  public async createItem(
    command: InventoryItemCreationCommand
  ): Promise<InventoryItemCreationMutationResult> {
    this.requireStockMovements();
    const recordedByUserId = requireRecordedByUserId(command.recordedByUserId);
    return withTenantQuery(getPool(), async (client) => {
      const { item } = command;
      const result = await client.query(
        `INSERT INTO inventory_items (
           id, account_id, sku, name, unit, on_hand_quantity, reorder_level,
           unit_cost_amount, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          item.id,
          item.accountId,
          item.sku,
          item.name,
          item.unit,
          item.onHandQuantity,
          item.reorderLevel,
          item.unitCostAmount,
          new Date(item.createdAt),
          new Date(item.updatedAt)
        ]
      );
      requireSingleAffectedRow(result.rowCount, 'Inventory item creation');
      const persistedItem = this.mapItem(result.rows[0] as Record<string, unknown>);
      const movement = this.createMovement({
        id: command.movementId,
        accountId: persistedItem.accountId,
        inventoryItemId: persistedItem.id,
        movementType: 'inbound',
        quantityDelta: persistedItem.onHandQuantity,
        balanceBefore: 0,
        balanceAfter: persistedItem.onHandQuantity,
        unitCostAmount: persistedItem.unitCostAmount,
        reason: command.reason,
        reference: command.reference,
        recordedByUserId,
        createdAt: persistedItem.createdAt
      });
      await this.insertStockMovement(client, movement);

      return Object.freeze({ item: persistedItem, movement, stockVersion: 0 });
    });
  }

  public async updateItem(
    command: InventoryItemUpdateCommand
  ): Promise<InventoryItemUpdateMutationResult> {
    const recordedByUserId = requireRecordedByUserId(command.recordedByUserId);
    if (command.update.onHandQuantity !== undefined) {
      this.requireStockMovements();
    }
    return withTenantQuery(getPool(), async (client) => {
      const locked = await this.lockItem(client, command.accountId, command.inventoryItemId);
      const balanceAfter = command.update.onHandQuantity ?? locked.item.onHandQuantity;
      const stockChanged = balanceAfter !== locked.item.onHandQuantity;
      const result = await client.query(
        `UPDATE inventory_items
         SET name = COALESCE($3, name),
             unit = COALESCE($4, unit),
             on_hand_quantity = COALESCE($5::numeric, on_hand_quantity),
             reorder_level = COALESCE($6::numeric, reorder_level),
             unit_cost_amount = COALESCE($7::numeric, unit_cost_amount),
             stock_version = stock_version + $8,
             updated_at = $9
         WHERE id = $1 AND account_id = $2 AND stock_version = $10
         RETURNING *`,
        [
          command.inventoryItemId,
          command.accountId,
          command.update.name ?? null,
          command.update.unit ?? null,
          command.update.onHandQuantity ?? null,
          command.update.reorderLevel ?? null,
          command.update.unitCostAmount ?? null,
          stockChanged ? 1 : 0,
          new Date(command.updatedAt),
          locked.stockVersion
        ]
      );
      if (result.rowCount === 0) {
        throw new ConflictError('Inventory item changed concurrently', {
          inventoryItemId: command.inventoryItemId,
          expectedStockVersion: locked.stockVersion
        });
      }
      requireSingleAffectedRow(result.rowCount, 'Inventory item update');
      const item = this.mapItem(result.rows[0] as Record<string, unknown>);
      if (!stockChanged) {
        return Object.freeze({ item, stockVersion: locked.stockVersion });
      }

      const movement = this.createMovement({
        id: command.movementId,
        accountId: command.accountId,
        inventoryItemId: command.inventoryItemId,
        movementType: 'adjustment',
        quantityDelta: Number((balanceAfter - locked.item.onHandQuantity).toFixed(2)),
        balanceBefore: locked.item.onHandQuantity,
        balanceAfter,
        unitCostAmount: item.unitCostAmount,
        reason: command.reason,
        reference: command.reference,
        recordedByUserId,
        createdAt: command.updatedAt
      });
      await this.insertStockMovement(client, movement);
      return Object.freeze({
        item,
        movement,
        stockVersion: locked.stockVersion + 1
      });
    });
  }

  public async findItemById(
    accountId: AccountId,
    id: InventoryItemId
  ): Promise<InventoryItemSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM inventory_items WHERE id = $1 AND account_id = $2',
        [id, accountId]
      );
      if (result.rowCount === 0) return null;
      requireSingleAffectedRow(result.rowCount, 'Inventory item lookup');
      return this.mapItem(result.rows[0] as Record<string, unknown>);
    });
  }

  public async findAllItems(accountId: AccountId): Promise<readonly InventoryItemSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM inventory_items WHERE account_id = $1 ORDER BY name',
        [accountId]
      );
      return Object.freeze(result.rows.map((row: Record<string, unknown>) => this.mapItem(row)));
    });
  }

  public async createConsumption(consumption: InventoryConsumptionSummary): Promise<void> {
    await withTenantQuery(getPool(), (client) => this.insertConsumption(client, consumption));
  }

  public async findConsumptions(
    accountId: AccountId
  ): Promise<readonly InventoryConsumptionSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM inventory_consumptions
         WHERE account_id = $1
         ORDER BY created_at DESC`,
        [accountId]
      );
      return Object.freeze(
        result.rows.map((row: Record<string, unknown>) => this.mapConsumption(row))
      );
    });
  }

  public async createStockMovement(movement: InventoryStockMovementSummary): Promise<void> {
    await withTenantQuery(getPool(), (client) => this.insertStockMovement(client, movement));
  }

  public async findStockMovements(
    accountId: AccountId
  ): Promise<readonly InventoryStockMovementSummary[]> {
    if (!this.#stockMovementsEnabled) return Object.freeze([]);
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM inventory_stock_movements
         WHERE account_id = $1
         ORDER BY created_at DESC`,
        [accountId]
      );
      return Object.freeze(
        result.rows.map((row: Record<string, unknown>) => this.mapStockMovement(row))
      );
    });
  }

  public async consumeStock(
    command: InventoryConsumptionCommand
  ): Promise<InventoryConsumptionMutationResult> {
    this.requireStockMovements();
    const quantity = requirePositiveStockQuantity(command.quantity);
    const recordedByUserId = requireRecordedByUserId(command.recordedByUserId);
    return withTenantQuery(getPool(), async (client) => {
      const locked = await this.lockItem(client, command.accountId, command.inventoryItemId);
      const balanceAfter = Number((locked.item.onHandQuantity - quantity).toFixed(2));
      if (balanceAfter < 0) {
        throw new ConflictError('Insufficient stock for assistive consumption', {
          inventoryItemId: command.inventoryItemId,
          onHandQuantity: locked.item.onHandQuantity,
          requestedQuantity: quantity
        });
      }

      const updated = await this.updateLockedStock(
        client,
        locked,
        command.accountId,
        balanceAfter,
        command.createdAt
      );
      const consumption = Object.freeze({
        id: command.consumptionId,
        accountId: command.accountId,
        inventoryItemId: command.inventoryItemId,
        encounterId: command.encounterId,
        patientId: command.patientId,
        quantity,
        unit: locked.item.unit,
        costAmount: Number((quantity * locked.item.unitCostAmount).toFixed(2)),
        sourceEntityType: command.sourceEntityType,
        sourceEntityId: command.sourceEntityId,
        recordedByUserId,
        createdAt: command.createdAt
      }) satisfies InventoryConsumptionSummary;
      const movement = this.createMovement({
        id: command.movementId,
        accountId: command.accountId,
        inventoryItemId: command.inventoryItemId,
        movementType: 'consumption',
        quantityDelta: -quantity,
        balanceBefore: locked.item.onHandQuantity,
        balanceAfter,
        unitCostAmount: locked.item.unitCostAmount,
        reason: `Consumo assistencial ${command.sourceEntityType}`,
        reference: command.sourceEntityId,
        recordedByUserId,
        createdAt: command.createdAt
      });

      await this.insertConsumption(client, consumption);
      await this.insertStockMovement(client, movement);
      return Object.freeze({
        item: updated.item,
        consumption,
        movement,
        stockVersion: updated.stockVersion
      });
    });
  }

  public async adjustStock(
    command: InventoryAdjustmentCommand
  ): Promise<InventoryAdjustmentMutationResult> {
    this.requireStockMovements();
    const quantityDelta = requireNonZeroStockDelta(command.quantityDelta);
    const recordedByUserId = requireRecordedByUserId(command.recordedByUserId);
    return withTenantQuery(getPool(), async (client) => {
      const locked = await this.lockItem(client, command.accountId, command.inventoryItemId);
      const balanceAfter = Number((locked.item.onHandQuantity + quantityDelta).toFixed(2));
      if (balanceAfter < 0) {
        throw new ConflictError('Inventory adjustment cannot produce negative stock', {
          inventoryItemId: command.inventoryItemId,
          balanceBefore: locked.item.onHandQuantity,
          quantityDelta
        });
      }

      const updated = await this.updateLockedStock(
        client,
        locked,
        command.accountId,
        balanceAfter,
        command.createdAt
      );
      const movement = this.createMovement({
        id: command.movementId,
        accountId: command.accountId,
        inventoryItemId: command.inventoryItemId,
        movementType: command.movementType ?? 'adjustment',
        quantityDelta,
        balanceBefore: locked.item.onHandQuantity,
        balanceAfter,
        unitCostAmount: locked.item.unitCostAmount,
        reason: command.reason,
        reference: command.reference,
        recordedByUserId,
        createdAt: command.createdAt
      });
      await this.insertStockMovement(client, movement);

      return Object.freeze({
        item: updated.item,
        movement,
        stockVersion: updated.stockVersion
      });
    });
  }

  private requireStockMovements(): void {
    if (!this.#stockMovementsEnabled) {
      throw new Error('Inventory stock movement persistence is unavailable');
    }
  }

  private async lockItem(
    client: PoolClient,
    accountId: AccountId,
    inventoryItemId: InventoryItemId
  ): Promise<LockedInventoryItem> {
    const result = await client.query(
      `SELECT * FROM inventory_items
       WHERE id = $1 AND account_id = $2
       FOR UPDATE`,
      [inventoryItemId, accountId]
    );
    if (result.rowCount === 0) {
      throw new NotFoundError('Inventory item not found', { inventoryItemId });
    }
    requireSingleAffectedRow(result.rowCount, 'Inventory stock lock');
    const row = result.rows[0] as Record<string, unknown>;
    const stockVersion = Number(row.stock_version);
    if (!Number.isSafeInteger(stockVersion) || stockVersion < 0) {
      throw new Error('Inventory item has an invalid stock version');
    }
    return Object.freeze({ item: this.mapItem(row), stockVersion });
  }

  private async updateLockedStock(
    client: PoolClient,
    locked: LockedInventoryItem,
    accountId: AccountId,
    balanceAfter: number,
    updatedAt: string
  ): Promise<LockedInventoryItem> {
    const result = await client.query(
      `UPDATE inventory_items
       SET on_hand_quantity = $3,
           stock_version = stock_version + 1,
           updated_at = $4
       WHERE id = $1 AND account_id = $2 AND stock_version = $5
       RETURNING *`,
      [locked.item.id, accountId, balanceAfter, new Date(updatedAt), locked.stockVersion]
    );
    if (result.rowCount === 0) {
      throw new ConflictError('Inventory item changed concurrently', {
        inventoryItemId: locked.item.id,
        expectedStockVersion: locked.stockVersion
      });
    }
    requireSingleAffectedRow(result.rowCount, 'Inventory stock update');
    return Object.freeze({
      item: this.mapItem(result.rows[0] as Record<string, unknown>),
      stockVersion: locked.stockVersion + 1
    });
  }

  private async insertConsumption(
    client: PoolClient,
    consumption: InventoryConsumptionSummary
  ): Promise<void> {
    const result = await client.query(
      `INSERT INTO inventory_consumptions (
         id, account_id, inventory_item_id, encounter_id, patient_id, quantity,
         unit, cost_amount, source_entity_type, source_entity_id,
         recorded_by_user_id, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        consumption.id,
        consumption.accountId,
        consumption.inventoryItemId,
        consumption.encounterId,
        consumption.patientId,
        consumption.quantity,
        consumption.unit,
        consumption.costAmount,
        consumption.sourceEntityType,
        consumption.sourceEntityId ?? null,
        consumption.recordedByUserId,
        new Date(consumption.createdAt)
      ]
    );
    requireSingleAffectedRow(result.rowCount, 'Inventory consumption creation');
  }

  private async insertStockMovement(
    client: PoolClient,
    movement: InventoryStockMovementSummary
  ): Promise<void> {
    this.requireStockMovements();
    const result = await client.query(
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
    requireSingleAffectedRow(result.rowCount, 'Inventory stock movement creation');
  }

  private createMovement(movement: InventoryStockMovementSummary): InventoryStockMovementSummary {
    return Object.freeze({ ...movement });
  }

  private mapItem(row: Record<string, unknown>): InventoryItemSummary {
    return Object.freeze({
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
    });
  }

  private mapConsumption(row: Record<string, unknown>): InventoryConsumptionSummary {
    return Object.freeze({
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
    });
  }

  private mapStockMovement(row: Record<string, unknown>): InventoryStockMovementSummary {
    return Object.freeze({
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
    });
  }
}
