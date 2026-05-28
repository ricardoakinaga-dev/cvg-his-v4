import { EncountersService } from '@cvg-his-v2/module-encounters';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  CreateInventoryConsumptionRequest,
  CreateInventoryItemRequest,
  CreateInventoryStockAdjustmentRequest,
  UpdateInventoryItemRequest
} from '@cvg-his-v2/shared-contracts';
import type {
  AccountId,
  InventoryConsumptionId,
  InventoryConsumptionSummary,
  InventoryLotId,
  InventoryLotSummary,
  InventoryItemId,
  InventoryItemSummary,
  InventoryStockMovementId,
  InventoryStockMovementSummary,
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

function resolveLotStatus(
  quantity: number,
  expiryDate?: string
): InventoryLotSummary['status'] {
  if (quantity <= 0) {
    return 'depleted';
  }

  if (!expiryDate) {
    return 'active';
  }

  const now = Date.now();
  const expiry = new Date(expiryDate).getTime();
  if (expiry <= now) {
    return 'expired';
  }

  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
  return diffDays <= 30 ? 'expiring' : 'active';
}

function buildLotsForItem(item: InventoryItemSummary): InventoryLotSummary[] {
  const baseCreatedAt = item.updatedAt || item.createdAt;
  const makeLot = (
    suffix: string,
    quantity: number,
    lotNumber: string,
    expiryDate?: string,
    manufactureDate?: string,
    location?: string,
    supplier?: string
  ): InventoryLotSummary => ({
    id: `${item.id}-${suffix}` as InventoryLotId,
    accountId: item.accountId,
    inventoryItemId: item.id,
    sku: item.sku,
    itemName: item.name,
    lotNumber,
    quantity,
    unit: item.unit,
    location,
    supplier,
    manufactureDate,
    expiryDate,
    status: resolveLotStatus(quantity, expiryDate),
    createdAt: baseCreatedAt,
    updatedAt: baseCreatedAt
  });

  if (item.onHandQuantity <= 0) {
    return [
      makeLot('lot-0', 0, `AUTO-${item.sku}-0`, undefined, undefined, 'Ajuste', 'Sistema')
    ];
  }

  if (item.sku === 'MED-001') {
    const firstQty = Number((item.onHandQuantity * 0.42).toFixed(2));
    const secondQty = Number((item.onHandQuantity - firstQty).toFixed(2));
    return [
      makeLot(
        'lot-a',
        firstQty,
        'DIP-240318-A',
        '2026-04-18T00:00:00.000Z',
        '2026-02-15T00:00:00.000Z',
        'Farmacia fria A1',
        'PharmaVet'
      ),
      makeLot(
        'lot-b',
        secondQty,
        'DIP-240401-B',
        '2026-07-30T00:00:00.000Z',
        '2026-03-12T00:00:00.000Z',
        'Farmacia fria A2',
        'PharmaVet'
      )
    ];
  }

  if (item.sku === 'MAT-014') {
    const firstQty = Number((item.onHandQuantity * 0.35).toFixed(2));
    const secondQty = Number((item.onHandQuantity - firstQty).toFixed(2));
    return [
      makeLot(
        'lot-a',
        firstQty,
        'GAZ-240210-A',
        '2026-06-15T00:00:00.000Z',
        '2026-01-20T00:00:00.000Z',
        'Almox central B3',
        'VetSurgical'
      ),
      makeLot(
        'lot-b',
        secondQty,
        'GAZ-240325-B',
        '2026-10-20T00:00:00.000Z',
        '2026-03-01T00:00:00.000Z',
        'Almox central B4',
        'VetSurgical'
      )
    ];
  }

  if (item.sku === 'MAT-021') {
    const firstQty = Number((item.onHandQuantity * 0.33).toFixed(2));
    const secondQty = Number((item.onHandQuantity - firstQty).toFixed(2));
    return [
      makeLot(
        'lot-a',
        firstQty,
        'CAT-240105-A',
        '2026-04-10T00:00:00.000Z',
        '2025-12-10T00:00:00.000Z',
        'Procedimentos C1',
        'CatMed'
      ),
      makeLot(
        'lot-b',
        secondQty,
        'CAT-240326-B',
        '2026-05-05T00:00:00.000Z',
        '2026-02-28T00:00:00.000Z',
        'Procedimentos C2',
        'CatMed'
      )
    ];
  }

  return [
    makeLot(
      'lot-a',
      Number(item.onHandQuantity.toFixed(2)),
      `AUTO-${item.sku}-A`,
      '2026-08-31T00:00:00.000Z',
      '2026-03-01T00:00:00.000Z',
      'Estoque geral',
      'Sistema'
    )
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
  readonly #lots = new Map<InventoryLotId, InventoryLotSummary>();
  readonly #movements: InventoryStockMovementSummary[] = [];

  public constructor(
    encounters: EncountersService,
    seedItems: readonly InventoryItemSummary[] = createSeedItems(),
    options?: InventoryServiceOptions
  ) {
    this.#repository = options?.repository;
    this.#encounters = encounters;
    for (const item of seedItems) {
      this.#items.set(item.id, item);
      for (const lot of buildLotsForItem(item)) {
        this.#lots.set(lot.id, lot);
      }
    }
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  private replaceLotsForItem(item: InventoryItemSummary): void {
    for (const [lotId, lot] of this.#lots.entries()) {
      if (lot.inventoryItemId === item.id) {
        this.#lots.delete(lotId);
      }
    }

    for (const lot of buildLotsForItem(item)) {
      this.#lots.set(lot.id, lot);
    }
  }

  private drainLots(inventoryItemId: InventoryItemId, quantity: number): void {
    let remaining = quantity;
    const candidateLots = Array.from(this.#lots.values())
      .filter((lot) => lot.inventoryItemId === inventoryItemId && lot.quantity > 0)
      .sort((left, right) => {
        const leftExpiry = left.expiryDate ?? '9999-12-31T00:00:00.000Z';
        const rightExpiry = right.expiryDate ?? '9999-12-31T00:00:00.000Z';
        return leftExpiry.localeCompare(rightExpiry);
      });

    for (const lot of candidateLots) {
      if (remaining <= 0) {
        break;
      }

      const drained = Math.min(lot.quantity, remaining);
      const updatedQuantity = Number((lot.quantity - drained).toFixed(2));
      remaining = Number((remaining - drained).toFixed(2));
      this.#lots.set(lot.id, {
        ...lot,
        quantity: updatedQuantity,
        status: resolveLotStatus(updatedQuantity, lot.expiryDate),
        updatedAt: nowIso()
      });
    }

    if (remaining > 0) {
      throw new ConflictError('Inventory lots out of sync with current stock', {
        inventoryItemId,
        remainingQuantity: remaining
      });
    }
  }

  public async hydrateFromDatabase(accountId: AccountId = 'acc_cvg_demo' as never): Promise<void> {
    if (!this.#repository) return;
    const items = await this.#repository.findAllItems(accountId);
    const consumptions = await this.#repository.findConsumptions(accountId);
    const movements = await this.#repository.findStockMovements(accountId);
    for (const item of items) {
      this.#items.set(item.id, item);
      this.replaceLotsForItem(item);
    }
    this.#consumptions.splice(0, this.#consumptions.length, ...consumptions);
    this.#movements.splice(0, this.#movements.length, ...movements);
  }

  public listItems(
    accountId?: AccountId,
    filters?: { readonly search?: string }
  ): readonly InventoryItemSummary[] {
    let items = Array.from(this.#items.values()).filter(
      (item) => !accountId || item.accountId === accountId
    );

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(search) || item.sku.toLowerCase().includes(search)
      );
    }

    return items;
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
    this.drainLots(item.id, quantity);

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
    if (this.#repository) {
      await this.#repository.createConsumption(consumption);
    }
    await this.recordStockMovement({
      accountId: encounter.accountId,
      inventoryItemId: item.id,
      movementType: 'consumption',
      quantityDelta: -quantity,
      balanceBefore: item.onHandQuantity,
      balanceAfter: updatedItem.onHandQuantity,
      unitCostAmount: item.unitCostAmount,
      reason: `Consumo assistencial ${consumption.sourceEntityType}`,
      reference: consumption.sourceEntityId,
      recordedByUserId: actorUserId
    });
    return consumption;
  }

  public listConsumptions(encounterId?: string): readonly InventoryConsumptionSummary[] {
    return this.#consumptions.filter(
      (consumption) => !encounterId || consumption.encounterId === encounterId
    );
  }

  public listConsumptionsByAccount(
    accountId: AccountId,
    encounterId?: string
  ): readonly InventoryConsumptionSummary[] {
    return this.#consumptions.filter(
      (consumption) =>
        consumption.accountId === accountId &&
        (!encounterId || consumption.encounterId === encounterId)
    );
  }

  public listLots(accountId?: AccountId): readonly InventoryLotSummary[] {
    return Array.from(this.#lots.values())
      .filter((lot) => !accountId || lot.accountId === accountId)
      .sort((left, right) => {
        const leftExpiry = left.expiryDate ?? '9999-12-31T00:00:00.000Z';
        const rightExpiry = right.expiryDate ?? '9999-12-31T00:00:00.000Z';
        return leftExpiry.localeCompare(rightExpiry);
      });
  }

  public listStockMovements(
    accountId: AccountId,
    inventoryItemId?: string
  ): readonly InventoryStockMovementSummary[] {
    return this.#movements.filter(
      (movement) =>
        movement.accountId === accountId &&
        (!inventoryItemId || movement.inventoryItemId === inventoryItemId)
    );
  }

  public async createStockAdjustment(
    accountId: AccountId,
    recordedByUserId: UserId,
    payload: CreateInventoryStockAdjustmentRequest
  ): Promise<InventoryStockMovementSummary> {
    const item = this.getItemOrThrow(payload.inventoryItemId as never);
    if (item.accountId !== accountId) {
      throw new NotFoundError('Inventory item not found', { inventoryItemId: item.id });
    }
    const quantityDelta = requireNonZeroNumber(payload.quantityDelta, 'quantityDelta');
    const balanceBefore = item.onHandQuantity;
    const balanceAfter = Number((balanceBefore + quantityDelta).toFixed(2));
    if (balanceAfter < 0) {
      throw new ConflictError('Inventory adjustment cannot produce negative stock', {
        inventoryItemId: item.id,
        balanceBefore,
        quantityDelta
      });
    }

    const updatedItem: InventoryItemSummary = {
      ...item,
      onHandQuantity: balanceAfter,
      updatedAt: nowIso()
    };
    this.#items.set(item.id, updatedItem);
    if (quantityDelta < 0) {
      this.drainLots(item.id, Math.abs(quantityDelta));
    } else {
      this.replaceLotsForItem(updatedItem);
    }
    if (this.#repository) {
      await this.#repository.updateItem(updatedItem);
    }

    return this.recordStockMovement({
      accountId,
      inventoryItemId: item.id,
      movementType: 'adjustment',
      quantityDelta,
      balanceBefore,
      balanceAfter,
      unitCostAmount: item.unitCostAmount,
      reason: payload.reason.trim(),
      reference: payload.reference?.trim() || undefined,
      recordedByUserId
    });
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
    this.drainLots(item.id, qty);

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
    if (this.#repository) {
      await this.#repository.createConsumption(consumption);
    }
    await this.recordStockMovement({
      accountId,
      inventoryItemId: item.id,
      movementType: 'consumption',
      quantityDelta: -qty,
      balanceBefore: item.onHandQuantity,
      balanceAfter: updatedItem.onHandQuantity,
      unitCostAmount: item.unitCostAmount,
      reason: 'Venda comercial',
      reference: consumption.id,
      recordedByUserId: '' as never
    });
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
    this.replaceLotsForItem(item);

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
    this.replaceLotsForItem(updatedItem);

    if (this.#repository) {
      this.#repository.updateItem(updatedItem);
    }

    return updatedItem;
  }

  private async recordStockMovement(input: Omit<InventoryStockMovementSummary, 'id' | 'createdAt'>): Promise<InventoryStockMovementSummary> {
    const movement: InventoryStockMovementSummary = {
      id: createCorrelationId('stockmov') as InventoryStockMovementId,
      ...input,
      reason: input.reason.trim() || 'Movimentacao de estoque',
      createdAt: nowIso()
    };
    this.#movements.unshift(movement);
    if (this.#repository) {
      await this.#repository.createStockMovement(movement);
    }
    return movement;
  }
}

function requireNonZeroNumber(value: number, field: string): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized === 0) {
    throw new ConflictError(`${field} must be a non-zero number`, { field });
  }
  return Number(normalized.toFixed(2));
}

export { createSeedItems };

export {
  DatabaseInventoryRepository,
  type InventoryRepository
} from './repositories/database-inventory.repository.js';
