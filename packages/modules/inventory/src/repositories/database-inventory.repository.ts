import { getPool } from '@cvg-his-v2/shared-database';
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

export interface InventoryRepository {
  createItem(item: InventoryItemSummary): Promise<void>;
  updateItem(item: InventoryItemSummary): Promise<void>;
  findItemById(id: InventoryItemId): Promise<InventoryItemSummary | null>;
  findAllItems(accountId: AccountId): Promise<readonly InventoryItemSummary[]>;
  createConsumption(consumption: InventoryConsumptionSummary): Promise<void>;
  findConsumptions(accountId: AccountId): Promise<readonly InventoryConsumptionSummary[]>;
  createStockMovement(movement: InventoryStockMovementSummary): Promise<void>;
  findStockMovements(accountId: AccountId): Promise<readonly InventoryStockMovementSummary[]>;
}

export class DatabaseInventoryRepository implements InventoryRepository {
  readonly #stockMovementsEnabled: boolean;

  public constructor(options: { readonly stockMovementsEnabled?: boolean } = {}) {
    this.#stockMovementsEnabled = options.stockMovementsEnabled !== false;
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
      return await client.query(
        `UPDATE inventory_items SET on_hand_quantity = $2, updated_at = $3 WHERE id = $1`,
        [item.id, item.onHandQuantity, new Date(item.updatedAt)]
      );
    });
  }

  async findItemById(id: InventoryItemId): Promise<InventoryItemSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM inventory_items WHERE id = $1', [id]);
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
}
