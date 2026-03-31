import { getPool } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  InventoryConsumptionId,
  InventoryConsumptionSummary,
  InventoryItemId,
  InventoryItemSummary,
  UserId
} from '@cvg-his-v2/shared-types';

export interface InventoryRepository {
  createItem(item: InventoryItemSummary): Promise<void>;
  updateItem(item: InventoryItemSummary): Promise<void>;
  findItemById(id: InventoryItemId): Promise<InventoryItemSummary | null>;
  findAllItems(accountId: AccountId): Promise<readonly InventoryItemSummary[]>;
  createConsumption(consumption: InventoryConsumptionSummary): Promise<void>;
  findConsumptions(accountId: AccountId): Promise<readonly InventoryConsumptionSummary[]>;
}

export class DatabaseInventoryRepository implements InventoryRepository {
  async createItem(item: InventoryItemSummary): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO inventory_items (id, account_id, sku, name, unit, on_hand_quantity, reorder_level, unit_cost_amount, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [item.id, item.accountId, item.sku, item.name, item.unit,
       item.onHandQuantity, item.reorderLevel, item.unitCostAmount,
       new Date(item.createdAt), new Date(item.updatedAt)]
    );
  }

  async updateItem(item: InventoryItemSummary): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE inventory_items SET on_hand_quantity = $2, updated_at = $3 WHERE id = $1`,
      [item.id, item.onHandQuantity, new Date(item.updatedAt)]
    );
  }

  async findItemById(id: InventoryItemId): Promise<InventoryItemSummary | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapItem(result.rows[0]);
  }

  async findAllItems(accountId: AccountId): Promise<readonly InventoryItemSummary[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM inventory_items WHERE account_id = $1 ORDER BY name', [accountId]);
    return result.rows.map((r: Record<string, unknown>) => this.mapItem(r));
  }

  async createConsumption(consumption: InventoryConsumptionSummary): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO inventory_consumptions (id, account_id, inventory_item_id, encounter_id, patient_id, quantity, unit, cost_amount, source_entity_type, source_entity_id, recorded_by_user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [consumption.id, consumption.accountId, consumption.inventoryItemId,
       consumption.encounterId, consumption.patientId, consumption.quantity,
       consumption.unit, consumption.costAmount, consumption.sourceEntityType,
       consumption.sourceEntityId ?? null, consumption.recordedByUserId,
       new Date(consumption.createdAt)]
    );
  }

  async findConsumptions(accountId: AccountId): Promise<readonly InventoryConsumptionSummary[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM inventory_consumptions WHERE account_id = $1 ORDER BY created_at DESC', [accountId]);
    return result.rows.map((r: Record<string, unknown>) => this.mapConsumption(r));
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
      encounterId: row.encounter_id as string,
      patientId: row.patient_id as string,
      quantity: Number(row.quantity),
      unit: row.unit as string,
      costAmount: Number(row.cost_amount),
      sourceEntityType: row.source_entity_type as InventoryConsumptionSummary['sourceEntityType'],
      sourceEntityId: (row.source_entity_id as string) ?? undefined,
      recordedByUserId: row.recorded_by_user_id as UserId,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }
}
