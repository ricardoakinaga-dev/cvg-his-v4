import { EncountersService } from '@cvg-his-v2/module-encounters';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  CreateInventoryConsumptionRequest,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest
} from '@cvg-his-v2/shared-contracts';
import type {
  AccountId,
  InventoryConsumptionId,
  InventoryConsumptionSummary,
  InventoryItemId,
  InventoryItemSummary,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireEnum, requirePositiveNumber } from '@cvg-his-v2/shared-validation';

function createSeedItems(): InventoryItemSummary[] {
  const createdAt = '2026-03-25T00:00:00.000Z';
  return [
    {
      id: 'inv_dipyrone' as InventoryItemId,
      accountId: 'acc_cvg_demo' as never,
      sku: 'MED-001',
      name: 'Dipirona Injetavel',
      unit: 'ampola',
      onHandQuantity: 24,
      reorderLevel: 5,
      unitCostAmount: 12.5,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'inv_gauze' as InventoryItemId,
      accountId: 'acc_cvg_demo' as never,
      sku: 'MAT-014',
      name: 'Gaze Esteril',
      unit: 'pacote',
      onHandQuantity: 60,
      reorderLevel: 10,
      unitCostAmount: 4.2,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'inv_catheter' as InventoryItemId,
      accountId: 'acc_cvg_demo' as never,
      sku: 'MAT-021',
      name: 'Cateter Intravenoso',
      unit: 'unidade',
      onHandQuantity: 18,
      reorderLevel: 4,
      unitCostAmount: 8.9,
      createdAt,
      updatedAt: createdAt
    }
  ];
}

import type { InventoryRepository } from './repositories/database-inventory.repository.js';

export interface InventoryServiceOptions {
  readonly repository?: InventoryRepository;
}

export class InventoryService {
  readonly #repository?: InventoryRepository;
  readonly #encounters: EncountersService;
  readonly #items = new Map<InventoryItemId, InventoryItemSummary>();
  readonly #consumptions: InventoryConsumptionSummary[] = [];

  public constructor(
    encounters: EncountersService,
    seedItems: readonly InventoryItemSummary[] = createSeedItems(),
    options?: InventoryServiceOptions
  ) {
    this.#repository = options?.repository;
    this.#encounters = encounters;
    for (const item of seedItems) {
      this.#items.set(item.id, item);
    }
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(): Promise<void> {
    if (!this.#repository) return;
    const items = await this.#repository.findAllItems('' as never);
    for (const item of items) {
      this.#items.set(item.id, item);
    }
  }

  public listItems(): readonly InventoryItemSummary[] {
    return Array.from(this.#items.values());
  }

  public getItemOrThrow(inventoryItemId: InventoryItemId): InventoryItemSummary {
    const item = this.#items.get(inventoryItemId);
    if (!item) {
      throw new NotFoundError('Inventory item not found', { inventoryItemId });
    }

    return item;
  }

  public async consume(
    actorUserId: UserId,
    payload: CreateInventoryConsumptionRequest
  ): Promise<InventoryConsumptionSummary> {
    const encounter = this.#encounters.getOrThrow(payload.encounterId as never);
    const item = this.getItemOrThrow(payload.inventoryItemId as never);
    const quantity = requirePositiveNumber(payload.quantity, 'quantity');
    if (item.onHandQuantity < quantity) {
      throw new ConflictError('Insufficient stock for assistive consumption', {
        inventoryItemId: item.id,
        onHandQuantity: item.onHandQuantity,
        requestedQuantity: quantity
      });
    }

    const updatedItem: InventoryItemSummary = {
      ...item,
      onHandQuantity: Number((item.onHandQuantity - quantity).toFixed(2)),
      updatedAt: nowIso()
    };
    this.#items.set(item.id, updatedItem);

    if (this.#repository) {
      await this.#repository.updateItem(updatedItem);
    }

    const consumption: InventoryConsumptionSummary = {
      id: createCorrelationId('cons') as InventoryConsumptionId,
      accountId: encounter.accountId,
      inventoryItemId: item.id,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      quantity,
      unit: item.unit,
      costAmount: Number((quantity * item.unitCostAmount).toFixed(2)),
      sourceEntityType: requireEnum(payload.sourceEntityType, 'sourceEntityType', [
        'encounter',
        'diagnostic_order',
        'surgery_case',
        'inpatient_stay',
        'prescription',
        'other'
      ]),
      sourceEntityId: payload.sourceEntityId?.trim() || undefined,
      recordedByUserId: actorUserId,
      createdAt: nowIso()
    };
    this.#consumptions.unshift(consumption);
    return consumption;
  }

  public listConsumptions(encounterId?: string): readonly InventoryConsumptionSummary[] {
    return this.#consumptions.filter(
      (consumption) => !encounterId || consumption.encounterId === encounterId
    );
  }

  public async consumeForSale(
    accountId: AccountId,
    inventoryItemId: InventoryItemId,
    quantity: number
  ): Promise<InventoryConsumptionSummary> {
    const item = this.getItemOrThrow(inventoryItemId);
    const qty = requirePositiveNumber(quantity, 'quantity');
    if (item.onHandQuantity < qty) {
      throw new ConflictError('Insufficient stock for commercial sale', {
        inventoryItemId: item.id,
        onHandQuantity: item.onHandQuantity,
        requestedQuantity: qty
      });
    }

    const updatedItem: InventoryItemSummary = {
      ...item,
      onHandQuantity: Number((item.onHandQuantity - qty).toFixed(2)),
      updatedAt: nowIso()
    };
    this.#items.set(item.id, updatedItem);

    if (this.#repository) {
      await this.#repository.updateItem(updatedItem);
    }

    const consumption: InventoryConsumptionSummary = {
      id: createCorrelationId('csale') as InventoryConsumptionId,
      accountId,
      inventoryItemId: item.id,
      encounterId: '' as never,
      patientId: '' as never,
      quantity: qty,
      unit: item.unit,
      costAmount: Number((qty * item.unitCostAmount).toFixed(2)),
      sourceEntityType: 'other',
      sourceEntityId: undefined,
      recordedByUserId: '' as never,
      createdAt: nowIso()
    };
    this.#consumptions.unshift(consumption);
    return consumption;
  }

  public createItem(
    accountId: AccountId,
    payload: CreateInventoryItemRequest
  ): InventoryItemSummary {
    const id = createCorrelationId('inv') as InventoryItemId;
    const now = nowIso();

    // Validate SKU uniqueness
    const existingBySku = Array.from(this.#items.values()).find((i) => i.sku === payload.sku);
    if (existingBySku) {
      throw new ConflictError('SKU already exists', { sku: payload.sku });
    }

    const item: InventoryItemSummary = {
      id,
      accountId,
      sku: payload.sku.trim(),
      name: payload.name.trim(),
      unit: payload.unit.trim(),
      onHandQuantity: requirePositiveNumber(payload.onHandQuantity, 'onHandQuantity'),
      reorderLevel: Math.max(0, Math.floor(payload.reorderLevel)),
      unitCostAmount: Math.max(0, Number(payload.unitCostAmount.toFixed(2))),
      createdAt: now,
      updatedAt: now
    };

    this.#items.set(item.id, item);

    if (this.#repository) {
      this.#repository.createItem(item);
    }

    return item;
  }

  public updateItem(
    inventoryItemId: InventoryItemId,
    payload: UpdateInventoryItemRequest
  ): InventoryItemSummary {
    const existing = this.getItemOrThrow(inventoryItemId);

    const updatedItem: InventoryItemSummary = {
      ...existing,
      name: payload.name !== undefined ? payload.name.trim() : existing.name,
      unit: payload.unit !== undefined ? payload.unit.trim() : existing.unit,
      onHandQuantity:
        payload.onHandQuantity !== undefined
          ? requirePositiveNumber(payload.onHandQuantity, 'onHandQuantity')
          : existing.onHandQuantity,
      reorderLevel:
        payload.reorderLevel !== undefined
          ? Math.max(0, Math.floor(payload.reorderLevel))
          : existing.reorderLevel,
      unitCostAmount:
        payload.unitCostAmount !== undefined
          ? Math.max(0, Number(payload.unitCostAmount.toFixed(2)))
          : existing.unitCostAmount,
      updatedAt: nowIso()
    };

    this.#items.set(updatedItem.id, updatedItem);

    if (this.#repository) {
      this.#repository.updateItem(updatedItem);
    }

    return updatedItem;
  }
}

export { createSeedItems };

export {
  DatabaseInventoryRepository,
  type InventoryRepository
} from './repositories/database-inventory.repository.js';
