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

const INITIAL_STOCK_REASON = 'Saldo inicial do item de estoque';
const ITEM_STOCK_EDIT_REASON = 'Saldo de estoque alterado por edicao do item';

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

function resolveLotStatus(quantity: number, expiryDate?: string): InventoryLotSummary['status'] {
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
    return [makeLot('lot-0', 0, `AUTO-${item.sku}-0`, undefined, undefined, 'Ajuste', 'Sistema')];
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
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
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
  #items = new Map<InventoryItemId, InventoryItemSummary>();
  #consumptions: readonly InventoryConsumptionSummary[] = Object.freeze([]);
  #lots = new Map<InventoryLotId, InventoryLotSummary>();
  #movements: readonly InventoryStockMovementSummary[] = Object.freeze([]);

  public constructor(
    encounters: EncountersService,
    seedItems: readonly InventoryItemSummary[] = createSeedItems(),
    options?: InventoryServiceOptions
  ) {
    this.#repository = options?.repository;
    this.#encounters = encounters;
    for (const item of seedItems) {
      const immutableItem = Object.freeze({ ...item });
      this.#items = new Map([...this.#items, [immutableItem.id, immutableItem]]);
      for (const lot of buildLotsForItem(item)) {
        const immutableLot = Object.freeze({ ...lot });
        this.#lots = new Map([...this.#lots, [immutableLot.id, immutableLot]]);
      }
    }
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  private replaceLotsForItem(
    lots: ReadonlyMap<InventoryLotId, InventoryLotSummary>,
    item: InventoryItemSummary
  ): Map<InventoryLotId, InventoryLotSummary> {
    const retainedLots = Array.from(lots.entries()).filter(
      ([, lot]) => lot.inventoryItemId !== item.id
    );
    const replacementLots = buildLotsForItem(item).map(
      (lot) => [lot.id, Object.freeze({ ...lot })] as const
    );
    return new Map([...retainedLots, ...replacementLots]);
  }

  private drainLots(
    lots: ReadonlyMap<InventoryLotId, InventoryLotSummary>,
    inventoryItemId: InventoryItemId,
    quantity: number
  ): Map<InventoryLotId, InventoryLotSummary> {
    let remaining = quantity;
    let nextLots = new Map(lots);
    const candidateLots = Array.from(lots.values())
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
      const updatedLot = Object.freeze({
        ...lot,
        quantity: updatedQuantity,
        status: resolveLotStatus(updatedQuantity, lot.expiryDate),
        updatedAt: nowIso()
      });
      nextLots = new Map([...nextLots, [lot.id, updatedLot]]);
    }

    if (remaining > 0) {
      throw new ConflictError('Inventory lots out of sync with current stock', {
        inventoryItemId,
        remainingQuantity: remaining
      });
    }

    return nextLots;
  }

  public async hydrateFromDatabase(accountId: AccountId = 'acc_cvg_demo' as never): Promise<void> {
    if (!this.#repository) return;
    const items = await this.#repository.findAllItems(accountId);
    const consumptions = await this.#repository.findConsumptions(accountId);
    const movements = await this.#repository.findStockMovements(accountId);
    const retainedItems = Array.from(this.#items.entries()).filter(
      ([, item]) => item.accountId !== accountId
    );
    const hydratedItems = items.map((item) => [item.id, Object.freeze({ ...item })] as const);
    this.#items = new Map([...retainedItems, ...hydratedItems]);

    let hydratedLots = new Map(
      Array.from(this.#lots.entries()).filter(([, lot]) => lot.accountId !== accountId)
    );
    for (const item of hydratedItems.map(([, item]) => item)) {
      hydratedLots = this.replaceLotsForItem(hydratedLots, item);
    }
    this.#lots = hydratedLots;
    this.#consumptions = Object.freeze([
      ...consumptions.map((consumption) => Object.freeze({ ...consumption })),
      ...this.#consumptions.filter((consumption) => consumption.accountId !== accountId)
    ]);
    this.#movements = Object.freeze([
      ...movements.map((movement) => Object.freeze({ ...movement })),
      ...this.#movements.filter((movement) => movement.accountId !== accountId)
    ]);
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

    return Object.freeze(items);
  }

  public getItemOrThrow(
    accountId: AccountId,
    inventoryItemId: InventoryItemId
  ): InventoryItemSummary {
    const item = this.#items.get(inventoryItemId);
    if (!item || item.accountId !== accountId) {
      throw new NotFoundError('Inventory item not found', { inventoryItemId });
    }

    return item;
  }

  public async consume(
    accountId: AccountId,
    actorUserId: UserId,
    payload: CreateInventoryConsumptionRequest
  ): Promise<InventoryConsumptionSummary> {
    const encounter = this.#encounters.getOrThrow(payload.encounterId as never);
    if (encounter.accountId !== accountId) {
      throw new NotFoundError('Encounter not found', { encounterId: payload.encounterId });
    }
    const item = this.getItemOrThrow(accountId, payload.inventoryItemId as never);
    const quantity = requirePositiveNumber(payload.quantity, 'quantity');
    const sourceEntityType = requireEnum(payload.sourceEntityType, 'sourceEntityType', [
      'encounter',
      'diagnostic_order',
      'surgery_case',
      'inpatient_stay',
      'prescription',
      'other'
    ]);
    const createdAt = nowIso();

    if (this.#repository) {
      const result = await this.#repository.consumeStock({
        accountId,
        inventoryItemId: item.id,
        quantity,
        consumptionId: createCorrelationId('cons') as InventoryConsumptionId,
        movementId: createCorrelationId('stockmov') as InventoryStockMovementId,
        encounterId: encounter.id,
        patientId: encounter.patientId,
        sourceEntityType,
        sourceEntityId: payload.sourceEntityId?.trim() || undefined,
        recordedByUserId: actorUserId,
        createdAt
      });
      this.#items = new Map([...this.#items, [result.item.id, result.item]]);
      this.#lots = this.replaceLotsForItem(this.#lots, result.item);
      this.#consumptions = Object.freeze([result.consumption, ...this.#consumptions]);
      this.#movements = Object.freeze([result.movement, ...this.#movements]);
      return result.consumption;
    }

    if (item.onHandQuantity < quantity) {
      throw new ConflictError('Insufficient stock for assistive consumption', {
        inventoryItemId: item.id,
        onHandQuantity: item.onHandQuantity,
        requestedQuantity: quantity
      });
    }
    const updatedItem = Object.freeze({
      ...item,
      onHandQuantity: Number((item.onHandQuantity - quantity).toFixed(2)),
      updatedAt: createdAt
    });
    const consumption = Object.freeze({
      id: createCorrelationId('cons') as InventoryConsumptionId,
      accountId,
      inventoryItemId: item.id,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      quantity,
      unit: item.unit,
      costAmount: Number((quantity * item.unitCostAmount).toFixed(2)),
      sourceEntityType,
      sourceEntityId: payload.sourceEntityId?.trim() || undefined,
      recordedByUserId: actorUserId,
      createdAt
    }) satisfies InventoryConsumptionSummary;
    const movement = Object.freeze({
      id: createCorrelationId('stockmov') as InventoryStockMovementId,
      accountId,
      inventoryItemId: item.id,
      movementType: 'consumption' as const,
      quantityDelta: -quantity,
      balanceBefore: item.onHandQuantity,
      balanceAfter: updatedItem.onHandQuantity,
      unitCostAmount: item.unitCostAmount,
      reason: `Consumo assistencial ${sourceEntityType}`,
      reference: consumption.sourceEntityId,
      recordedByUserId: actorUserId,
      createdAt
    }) satisfies InventoryStockMovementSummary;
    const updatedLots = this.drainLots(this.#lots, item.id, quantity);

    this.#items = new Map([...this.#items, [updatedItem.id, updatedItem]]);
    this.#lots = updatedLots;
    this.#consumptions = Object.freeze([consumption, ...this.#consumptions]);
    this.#movements = Object.freeze([movement, ...this.#movements]);
    return consumption;
  }

  public listConsumptions(encounterId?: string): readonly InventoryConsumptionSummary[] {
    return Object.freeze(
      this.#consumptions.filter(
        (consumption) => !encounterId || consumption.encounterId === encounterId
      )
    );
  }

  public listConsumptionsByAccount(
    accountId: AccountId,
    encounterId?: string
  ): readonly InventoryConsumptionSummary[] {
    return Object.freeze(
      this.#consumptions.filter(
        (consumption) =>
          consumption.accountId === accountId &&
          (!encounterId || consumption.encounterId === encounterId)
      )
    );
  }

  public listLots(accountId?: AccountId): readonly InventoryLotSummary[] {
    return Object.freeze(
      Array.from(this.#lots.values())
        .filter((lot) => !accountId || lot.accountId === accountId)
        .sort((left, right) => {
          const leftExpiry = left.expiryDate ?? '9999-12-31T00:00:00.000Z';
          const rightExpiry = right.expiryDate ?? '9999-12-31T00:00:00.000Z';
          return leftExpiry.localeCompare(rightExpiry);
        })
    );
  }

  public listStockMovements(
    accountId: AccountId,
    inventoryItemId?: string
  ): readonly InventoryStockMovementSummary[] {
    return Object.freeze(
      this.#movements.filter(
        (movement) =>
          movement.accountId === accountId &&
          (!inventoryItemId || movement.inventoryItemId === inventoryItemId)
      )
    );
  }

  public async createStockAdjustment(
    accountId: AccountId,
    recordedByUserId: UserId,
    payload: CreateInventoryStockAdjustmentRequest
  ): Promise<InventoryStockMovementSummary> {
    const item = this.getItemOrThrow(accountId, payload.inventoryItemId as never);
    const quantityDelta = requireNonZeroNumber(payload.quantityDelta, 'quantityDelta');
    const createdAt = nowIso();
    const reason = payload.reason.trim() || 'Movimentacao de estoque';
    if (this.#repository) {
      const result = await this.#repository.adjustStock({
        accountId,
        inventoryItemId: item.id,
        quantityDelta,
        movementId: createCorrelationId('stockmov') as InventoryStockMovementId,
        reason,
        reference: payload.reference?.trim() || undefined,
        recordedByUserId,
        createdAt
      });
      this.#items = new Map([...this.#items, [result.item.id, result.item]]);
      this.#lots = this.replaceLotsForItem(this.#lots, result.item);
      this.#movements = Object.freeze([result.movement, ...this.#movements]);
      return result.movement;
    }

    const balanceBefore = item.onHandQuantity;
    const balanceAfter = Number((balanceBefore + quantityDelta).toFixed(2));
    if (balanceAfter < 0) {
      throw new ConflictError('Inventory adjustment cannot produce negative stock', {
        inventoryItemId: item.id,
        balanceBefore,
        quantityDelta
      });
    }
    const updatedItem = Object.freeze({
      ...item,
      onHandQuantity: balanceAfter,
      updatedAt: createdAt
    });
    const movement = Object.freeze({
      id: createCorrelationId('stockmov') as InventoryStockMovementId,
      accountId,
      inventoryItemId: item.id,
      movementType: 'adjustment' as const,
      quantityDelta,
      balanceBefore,
      balanceAfter,
      unitCostAmount: item.unitCostAmount,
      reason,
      reference: payload.reference?.trim() || undefined,
      recordedByUserId,
      createdAt
    }) satisfies InventoryStockMovementSummary;
    const updatedLots =
      quantityDelta < 0
        ? this.drainLots(this.#lots, item.id, Math.abs(quantityDelta))
        : this.replaceLotsForItem(this.#lots, updatedItem);

    this.#items = new Map([...this.#items, [updatedItem.id, updatedItem]]);
    this.#lots = updatedLots;
    this.#movements = Object.freeze([movement, ...this.#movements]);
    return movement;
  }

  public async consumeForSale(
    accountId: AccountId,
    inventoryItemId: InventoryItemId,
    quantity: number,
    recordedByUserId: UserId
  ): Promise<InventoryConsumptionSummary> {
    const item = this.getItemOrThrow(accountId, inventoryItemId);
    const qty = requirePositiveNumber(quantity, 'quantity');
    const actorUserId = requireActorUserId(recordedByUserId);
    const createdAt = nowIso();
    const consumptionId = createCorrelationId('csale') as InventoryConsumptionId;
    if (this.#repository) {
      const result = await this.#repository.adjustStock({
        accountId,
        inventoryItemId: item.id,
        quantityDelta: -qty,
        movementId: createCorrelationId('stockmov') as InventoryStockMovementId,
        movementType: 'consumption',
        reason: 'Venda comercial',
        reference: consumptionId,
        recordedByUserId: actorUserId,
        createdAt
      });
      const consumption = Object.freeze({
        id: consumptionId,
        accountId,
        inventoryItemId: item.id,
        encounterId: '' as never,
        patientId: '' as never,
        quantity: qty,
        unit: result.item.unit,
        costAmount: Number((qty * result.item.unitCostAmount).toFixed(2)),
        sourceEntityType: 'other' as const,
        sourceEntityId: undefined,
        recordedByUserId: actorUserId,
        createdAt
      }) satisfies InventoryConsumptionSummary;
      this.#items = new Map([...this.#items, [result.item.id, result.item]]);
      this.#lots = this.replaceLotsForItem(this.#lots, result.item);
      this.#consumptions = Object.freeze([consumption, ...this.#consumptions]);
      this.#movements = Object.freeze([result.movement, ...this.#movements]);
      return consumption;
    }

    if (item.onHandQuantity < qty) {
      throw new ConflictError('Insufficient stock for commercial sale', {
        inventoryItemId: item.id,
        onHandQuantity: item.onHandQuantity,
        requestedQuantity: qty
      });
    }
    const updatedItem = Object.freeze({
      ...item,
      onHandQuantity: Number((item.onHandQuantity - qty).toFixed(2)),
      updatedAt: createdAt
    });
    const consumption = Object.freeze({
      id: consumptionId,
      accountId,
      inventoryItemId: item.id,
      encounterId: '' as never,
      patientId: '' as never,
      quantity: qty,
      unit: item.unit,
      costAmount: Number((qty * item.unitCostAmount).toFixed(2)),
      sourceEntityType: 'other',
      sourceEntityId: undefined,
      recordedByUserId: actorUserId,
      createdAt
    }) satisfies InventoryConsumptionSummary;
    const movement = Object.freeze({
      id: createCorrelationId('stockmov') as InventoryStockMovementId,
      accountId,
      inventoryItemId: item.id,
      movementType: 'consumption' as const,
      quantityDelta: -qty,
      balanceBefore: item.onHandQuantity,
      balanceAfter: updatedItem.onHandQuantity,
      unitCostAmount: item.unitCostAmount,
      reason: 'Venda comercial',
      reference: consumption.id,
      recordedByUserId: actorUserId,
      createdAt
    }) satisfies InventoryStockMovementSummary;
    const updatedLots = this.drainLots(this.#lots, item.id, qty);

    this.#items = new Map([...this.#items, [updatedItem.id, updatedItem]]);
    this.#lots = updatedLots;
    this.#consumptions = Object.freeze([consumption, ...this.#consumptions]);
    this.#movements = Object.freeze([movement, ...this.#movements]);
    return consumption;
  }

  public async createItem(
    accountId: AccountId,
    recordedByUserId: UserId,
    payload: CreateInventoryItemRequest
  ): Promise<InventoryItemSummary> {
    const id = createCorrelationId('inv') as InventoryItemId;
    const now = nowIso();
    const sku = payload.sku.trim();
    const actorUserId = requireActorUserId(recordedByUserId);

    const existingBySku = Array.from(this.#items.values()).find(
      (item) => item.accountId === accountId && item.sku === sku
    );
    if (existingBySku) {
      throw new ConflictError('SKU already exists', { sku });
    }

    const item = Object.freeze({
      id,
      accountId,
      sku,
      name: payload.name.trim(),
      unit: payload.unit.trim(),
      onHandQuantity: requirePositiveNumber(payload.onHandQuantity, 'onHandQuantity'),
      reorderLevel: Math.max(0, Math.floor(payload.reorderLevel)),
      unitCostAmount: Math.max(0, Number(payload.unitCostAmount.toFixed(2))),
      createdAt: now,
      updatedAt: now
    }) satisfies InventoryItemSummary;

    const movement = Object.freeze({
      id: createCorrelationId('stockmov') as InventoryStockMovementId,
      accountId,
      inventoryItemId: item.id,
      movementType: 'inbound' as const,
      quantityDelta: item.onHandQuantity,
      balanceBefore: 0,
      balanceAfter: item.onHandQuantity,
      unitCostAmount: item.unitCostAmount,
      reason: INITIAL_STOCK_REASON,
      reference: item.sku,
      recordedByUserId: actorUserId,
      createdAt: now
    }) satisfies InventoryStockMovementSummary;

    if (this.#repository) {
      const persisted = await this.#repository.createItem({
        item,
        movementId: movement.id,
        recordedByUserId: actorUserId,
        reason: movement.reason,
        reference: movement.reference
      });
      this.#items = new Map([...this.#items, [persisted.item.id, persisted.item]]);
      this.#lots = this.replaceLotsForItem(this.#lots, persisted.item);
      this.#movements = Object.freeze([persisted.movement, ...this.#movements]);
      return persisted.item;
    }

    this.#items = new Map([...this.#items, [item.id, item]]);
    this.#lots = this.replaceLotsForItem(this.#lots, item);
    this.#movements = Object.freeze([movement, ...this.#movements]);

    return item;
  }

  public async updateItem(
    accountId: AccountId,
    recordedByUserId: UserId,
    inventoryItemId: InventoryItemId,
    payload: UpdateInventoryItemRequest
  ): Promise<InventoryItemSummary> {
    const existing = this.getItemOrThrow(accountId, inventoryItemId);
    const actorUserId = requireActorUserId(recordedByUserId);
    const normalizedUpdate = Object.freeze({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.unit !== undefined ? { unit: payload.unit.trim() } : {}),
      ...(payload.onHandQuantity !== undefined
        ? {
            onHandQuantity: requireNonNegativeNumber(payload.onHandQuantity, 'onHandQuantity')
          }
        : {}),
      ...(payload.reorderLevel !== undefined
        ? { reorderLevel: Math.max(0, Math.floor(payload.reorderLevel)) }
        : {}),
      ...(payload.unitCostAmount !== undefined
        ? { unitCostAmount: Math.max(0, Number(payload.unitCostAmount.toFixed(2))) }
        : {})
    });
    const updatedAt = nowIso();

    if (this.#repository) {
      const persisted = await this.#repository.updateItem({
        accountId,
        inventoryItemId,
        update: normalizedUpdate,
        updatedAt,
        movementId: createCorrelationId('stockmov') as InventoryStockMovementId,
        recordedByUserId: actorUserId,
        reason: ITEM_STOCK_EDIT_REASON,
        reference: inventoryItemId
      });
      const stockChanged = persisted.item.onHandQuantity !== existing.onHandQuantity;
      if (stockChanged && !persisted.movement) {
        throw new Error('Inventory stock update did not return its ledger movement');
      }
      this.#items = new Map([...this.#items, [persisted.item.id, persisted.item]]);
      this.#lots = this.replaceLotsForItem(this.#lots, persisted.item);
      if (persisted.movement) {
        this.#movements = Object.freeze([persisted.movement, ...this.#movements]);
      }
      return persisted.item;
    }

    const updatedItem = Object.freeze({
      ...existing,
      ...normalizedUpdate,
      updatedAt
    }) satisfies InventoryItemSummary;

    const stockChanged = updatedItem.onHandQuantity !== existing.onHandQuantity;
    const movement = stockChanged
      ? (Object.freeze({
          id: createCorrelationId('stockmov') as InventoryStockMovementId,
          accountId,
          inventoryItemId,
          movementType: 'adjustment' as const,
          quantityDelta: Number((updatedItem.onHandQuantity - existing.onHandQuantity).toFixed(2)),
          balanceBefore: existing.onHandQuantity,
          balanceAfter: updatedItem.onHandQuantity,
          unitCostAmount: updatedItem.unitCostAmount,
          reason: ITEM_STOCK_EDIT_REASON,
          reference: inventoryItemId,
          recordedByUserId: actorUserId,
          createdAt: updatedAt
        }) satisfies InventoryStockMovementSummary)
      : undefined;

    this.#items = new Map([...this.#items, [updatedItem.id, updatedItem]]);
    this.#lots = this.replaceLotsForItem(this.#lots, updatedItem);
    if (movement) {
      this.#movements = Object.freeze([movement, ...this.#movements]);
    }

    return updatedItem;
  }
}

function requireNonZeroNumber(value: number, field: string): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized === 0) {
    throw new ConflictError(`${field} must be a non-zero number`, { field });
  }
  return Number(normalized.toFixed(2));
}

function requireNonNegativeNumber(value: number, field: string): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new ConflictError(`${field} must be a non-negative number`, { field });
  }
  return Number(normalized.toFixed(2));
}

function requireActorUserId(value: UserId): UserId {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ConflictError('recordedByUserId must be a non-empty string', {
      field: 'recordedByUserId'
    });
  }
  return value.trim() as UserId;
}

export { createSeedItems };

export {
  DatabaseInventoryRepository,
  type InventoryRepository
} from './repositories/database-inventory.repository.js';
