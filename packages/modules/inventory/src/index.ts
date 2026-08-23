import { EncountersService } from '@cvg-his-v2/module-encounters';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  CreateInventoryConsumptionRequest,
  CreateInventoryItemRequest,
  CreateInventoryStockAdjustmentRequest,
  CreateInventoryReservationRequest,
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
  InventoryReservationId,
  InventoryReservationSummary,
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
        '2027-04-18T00:00:00.000Z',
        '2027-02-15T00:00:00.000Z',
        'Farmacia fria A1',
        'PharmaVet'
      ),
      makeLot(
        'lot-b',
        secondQty,
        'DIP-240401-B',
        '2027-07-30T00:00:00.000Z',
        '2027-03-12T00:00:00.000Z',
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
        '2027-06-15T00:00:00.000Z',
        '2027-01-20T00:00:00.000Z',
        'Almox central B3',
        'VetSurgical'
      ),
      makeLot(
        'lot-b',
        secondQty,
        'GAZ-240325-B',
        '2027-10-20T00:00:00.000Z',
        '2027-03-01T00:00:00.000Z',
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
        '2027-04-10T00:00:00.000Z',
        '2026-12-10T00:00:00.000Z',
        'Procedimentos C1',
        'CatMed'
      ),
      makeLot(
        'lot-b',
        secondQty,
        'CAT-240326-B',
        '2027-05-05T00:00:00.000Z',
        '2027-02-28T00:00:00.000Z',
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
      '2027-08-31T00:00:00.000Z',
      '2027-03-01T00:00:00.000Z',
      'Estoque geral',
      'Sistema'
    )
  ];
}

import type {
  InventoryLotReservationUpdate,
  InventoryRepository
} from './repositories/database-inventory.repository.js';

export interface InventoryServiceOptions {
  readonly repository?: InventoryRepository;
}

export interface CreateInventoryInboundRequest {
  readonly inventoryItemId: string;
  readonly quantity: number;
  readonly unitCostAmount: number;
  readonly lotNumber: string;
  readonly expiryDate?: string | null;
  readonly manufactureDate?: string | null;
  readonly location?: string | null;
  readonly supplier?: string | null;
  readonly reference?: string | null;
}

export interface InventoryTransferRequest {
  readonly inventoryItemId: string;
  readonly quantity: number;
  readonly fromLocation: string;
  readonly toLocation: string;
  readonly reference?: string | null;
}

export class InventoryService {
  readonly #repository?: InventoryRepository;
  readonly #encounters: EncountersService;
  readonly #items = new Map<InventoryItemId, InventoryItemSummary>();
  #consumptions: InventoryConsumptionSummary[] = [];
  #reservations: InventoryReservationSummary[] = [];
  readonly #lots = new Map<InventoryLotId, InventoryLotSummary>();
  #movements: InventoryStockMovementSummary[] = [];

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
    const existingLots = Array.from(this.#lots.values()).filter(
      (lot) => lot.inventoryItemId === item.id
    );
    for (const [lotId, lot] of this.#lots.entries()) {
      if (lot.inventoryItemId === item.id) {
        this.#lots.delete(lotId);
      }
    }

    for (const lot of buildLotsForItem(item)) {
      const existingLot = existingLots.find((candidate) => candidate.id === lot.id);
      const reservedQuantity = existingLot?.reservedQuantity ?? 0;
      if (reservedQuantity > lot.quantity) {
        throw new ConflictError('Inventory item quantity cannot be lower than its reservations', {
          inventoryItemId: item.id,
          lotId: lot.id,
          reservedQuantity,
          quantity: lot.quantity
        });
      }
      this.#lots.set(lot.id, { ...lot, reservedQuantity });
    }
  }

  private drainLots(inventoryItemId: InventoryItemId, quantity: number): void {
    let remaining = quantity;
    const candidateLots = Array.from(this.#lots.values())
      .filter(
        (lot) =>
          lot.inventoryItemId === inventoryItemId &&
          lot.quantity - (lot.reservedQuantity ?? 0) > 0 &&
          resolveLotStatus(lot.quantity, lot.expiryDate) !== 'expired'
      )
      .sort((left, right) => {
        const leftExpiry = left.expiryDate ?? '9999-12-31T00:00:00.000Z';
        const rightExpiry = right.expiryDate ?? '9999-12-31T00:00:00.000Z';
        return leftExpiry.localeCompare(rightExpiry);
      });

    for (const lot of candidateLots) {
      if (remaining <= 0) {
        break;
      }

      const drained = Math.min(lot.quantity - (lot.reservedQuantity ?? 0), remaining);
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
    const persistedLots = (await this.#repository.findLots?.(accountId)) ?? [];
    const reservations = (await this.#repository.findReservations?.(accountId)) ?? [];
    const previousItemIds = Array.from(this.#items.values())
      .filter((item) => item.accountId === accountId)
      .map((item) => item.id);
    for (const itemId of previousItemIds) {
      this.#items.delete(itemId);
      for (const [lotId, lot] of this.#lots.entries()) {
        if (lot.inventoryItemId === itemId) this.#lots.delete(lotId);
      }
    }
    for (const item of items) {
      this.#items.set(item.id, item);
      const lots = persistedLots.filter((lot) => lot.inventoryItemId === item.id);
      if (lots.length > 0) {
        for (const lot of lots) {
          this.#lots.set(lot.id, {
            ...lot,
            sku: item.sku,
            itemName: item.name,
            status: resolveLotStatus(lot.quantity, lot.expiryDate)
          });
        }
      } else {
        const generatedLots = buildLotsForItem(item);
        for (const lot of generatedLots) this.#lots.set(lot.id, lot);
        await this.#repository.upsertLots?.(generatedLots);
      }
    }
    this.#consumptions = [
      ...this.#consumptions.filter((consumption) => consumption.accountId !== accountId),
      ...consumptions
    ];
    this.#movements = [
      ...this.#movements.filter((movement) => movement.accountId !== accountId),
      ...movements
    ];
    this.#reservations = [
      ...this.#reservations.filter((reservation) => reservation.accountId !== accountId),
      ...reservations
    ];
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

  public getItemOrThrow(
    inventoryItemId: InventoryItemId,
    accountId: AccountId
  ): InventoryItemSummary {
    const item = this.#items.get(inventoryItemId);
    if (!item || item.accountId !== accountId) {
      throw new NotFoundError('Inventory item not found', { inventoryItemId });
    }

    return item;
  }

  public async consume(
    actorUserId: UserId,
    payload: CreateInventoryConsumptionRequest,
    accountId: AccountId,
    retryCount = 0
  ): Promise<InventoryConsumptionSummary> {
    const encounter = this.#encounters.getOrThrow(payload.encounterId as never);
    if (encounter.accountId !== accountId) {
      throw new NotFoundError('Encounter not found', { encounterId: payload.encounterId });
    }
    const item = this.getItemOrThrow(payload.inventoryItemId as never, accountId);
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
    const movement = this.buildStockMovement({
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
    const previousLots = this.snapshotLots(item.id);
    try {
      this.drainLots(item.id, quantity);
      const updatedLots = this.snapshotLots(item.id);
      if (this.#repository?.consumeAtomically) {
        await this.#repository.consumeAtomically(item, consumption, movement, updatedLots);
      } else if (this.#repository) {
        await this.#repository.updateItem(updatedItem);
        await this.#repository.createConsumption(consumption);
        await this.#repository.createStockMovement(movement);
        await this.#repository.upsertLots?.(updatedLots);
      }
      this.#items.set(item.id, updatedItem);
      this.#consumptions = [consumption, ...this.#consumptions];
      this.#movements = [movement, ...this.#movements];
    } catch (error) {
      this.#items.set(item.id, item);
      this.restoreLots(item.id, previousLots);
      if (this.#repository && retryCount < 1 && isBalanceChangedConflict(error)) {
        await this.hydrateFromDatabase(accountId);
        return this.consume(actorUserId, payload, accountId, retryCount + 1);
      }
      throw error;
    }
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

  public listReservations(
    accountId: AccountId,
    status?: InventoryReservationSummary['status']
  ): readonly InventoryReservationSummary[] {
    return this.#reservations.filter(
      (reservation) =>
        reservation.accountId === accountId && (!status || reservation.status === status)
    );
  }

  private getReservationOrThrow(
    reservationId: InventoryReservationId,
    accountId: AccountId
  ): InventoryReservationSummary {
    const reservation = this.#reservations.find(
      (candidate) => candidate.id === reservationId && candidate.accountId === accountId
    );
    if (!reservation) {
      throw new NotFoundError('Inventory reservation not found', { reservationId });
    }
    return reservation;
  }

  public async reserve(
    accountId: AccountId,
    reservedByUserId: UserId,
    payload: CreateInventoryReservationRequest
  ): Promise<readonly InventoryReservationSummary[]> {
    const item = this.getItemOrThrow(payload.inventoryItemId as InventoryItemId, accountId);
    const quantity = requirePositiveNumber(payload.quantity, 'quantity');
    const sourceEntityType = requireEnum(payload.sourceEntityType, 'sourceEntityType', [
      'encounter',
      'diagnostic_order',
      'surgery_case',
      'inpatient_stay',
      'prescription',
      'other'
    ]) as InventoryReservationSummary['sourceEntityType'];
    const candidates = this.listLots(accountId)
      .filter((lot) => lot.inventoryItemId === item.id)
      .filter((lot) => resolveLotStatus(lot.quantity, lot.expiryDate) !== 'expired')
      .filter((lot) => lot.quantity - (lot.reservedQuantity ?? 0) > 0)
      .sort((left, right) => {
        const leftExpiry = left.expiryDate ?? '9999-12-31T00:00:00.000Z';
        const rightExpiry = right.expiryDate ?? '9999-12-31T00:00:00.000Z';
        return leftExpiry.localeCompare(rightExpiry);
      });
    const available = candidates.reduce(
      (sum, lot) => sum + lot.quantity - (lot.reservedQuantity ?? 0),
      0
    );
    if (available < quantity) {
      throw new ConflictError('Insufficient available stock for reservation', {
        inventoryItemId: item.id,
        availableQuantity: Number(available.toFixed(2)),
        requestedQuantity: quantity
      });
    }

    const now = nowIso();
    const reservations: InventoryReservationSummary[] = [];
    const lotUpdates: InventoryLotReservationUpdate[] = [];
    const previousLots = this.snapshotLots(item.id);
    let remaining = quantity;
    for (const lot of candidates) {
      if (remaining <= 0) break;
      const availableInLot = Number((lot.quantity - (lot.reservedQuantity ?? 0)).toFixed(2));
      const allocated = Number(Math.min(availableInLot, remaining).toFixed(2));
      remaining = Number((remaining - allocated).toFixed(2));
      const updatedAt = nowIso();
      const updatedLot: InventoryLotSummary = {
        ...lot,
        reservedQuantity: Number(((lot.reservedQuantity ?? 0) + allocated).toFixed(2)),
        updatedAt
      };
      lotUpdates.push({ lot: updatedLot, reservedDelta: allocated });
      reservations.push({
        id: createCorrelationId('reservation') as InventoryReservationId,
        accountId,
        inventoryItemId: item.id,
        inventoryLotId: lot.id,
        lotNumber: lot.lotNumber,
        quantity: allocated,
        unit: item.unit,
        unitCostAmount: item.unitCostAmount,
        status: 'reserved',
        sourceEntityType,
        sourceEntityId: payload.sourceEntityId?.trim() || undefined,
        reference: payload.reference?.trim() || undefined,
        reservedByUserId,
        createdAt: now,
        updatedAt: now
      });
      this.#lots.set(updatedLot.id, updatedLot);
    }

    try {
      if (this.#repository?.reserveAtomically) {
        await this.#repository.reserveAtomically(reservations, lotUpdates);
      } else if (this.#repository) {
        await this.#repository.upsertLots?.(lotUpdates.map((update) => update.lot));
      }
      for (const update of lotUpdates) this.#lots.set(update.lot.id, update.lot);
      this.#reservations = [...reservations, ...this.#reservations];
      return reservations;
    } catch (error) {
      this.restoreLots(item.id, previousLots);
      throw error;
    }
  }

  public async releaseReservation(
    accountId: AccountId,
    actorUserId: UserId,
    reservationId: InventoryReservationId
  ): Promise<InventoryReservationSummary> {
    const current = this.getReservationOrThrow(reservationId, accountId);
    if (current.status !== 'reserved') {
      throw new ConflictError('Only active inventory reservations can be released', {
        reservationId,
        status: current.status
      });
    }
    const lot = this.#lots.get(current.inventoryLotId);
    if (!lot)
      throw new NotFoundError('Inventory lot not found', {
        inventoryLotId: current.inventoryLotId
      });
    const now = nowIso();
    const updatedLot: InventoryLotSummary = {
      ...lot,
      reservedQuantity: Number(
        Math.max(0, (lot.reservedQuantity ?? 0) - current.quantity).toFixed(2)
      ),
      updatedAt: now
    };
    const updatedReservation: InventoryReservationSummary = {
      ...current,
      status: 'released',
      releasedAt: now,
      updatedAt: now
    };
    try {
      if (this.#repository?.releaseReservationAtomically) {
        await this.#repository.releaseReservationAtomically(updatedReservation, updatedLot);
      } else {
        await this.#repository?.upsertLots?.([updatedLot]);
      }
      this.#lots.set(updatedLot.id, updatedLot);
      this.#reservations = this.#reservations.map((reservation) =>
        reservation.id === reservationId ? updatedReservation : reservation
      );
      return updatedReservation;
    } catch (error) {
      throw error;
    }
  }

  public async consumeReservation(
    accountId: AccountId,
    actorUserId: UserId,
    reservationId: InventoryReservationId
  ): Promise<InventoryReservationSummary> {
    const current = this.getReservationOrThrow(reservationId, accountId);
    if (current.status !== 'reserved') {
      throw new ConflictError('Only active inventory reservations can be consumed', {
        reservationId,
        status: current.status
      });
    }
    const item = this.getItemOrThrow(current.inventoryItemId, accountId);
    const lot = this.#lots.get(current.inventoryLotId);
    if (!lot)
      throw new NotFoundError('Inventory lot not found', {
        inventoryLotId: current.inventoryLotId
      });
    if (item.onHandQuantity < current.quantity || lot.quantity < current.quantity) {
      throw new ConflictError('Inventory balance is insufficient for reservation consumption', {
        reservationId,
        quantity: current.quantity
      });
    }
    const now = nowIso();
    const updatedItem: InventoryItemSummary = {
      ...item,
      onHandQuantity: Number((item.onHandQuantity - current.quantity).toFixed(2)),
      updatedAt: now
    };
    const updatedLot: InventoryLotSummary = {
      ...lot,
      quantity: Number((lot.quantity - current.quantity).toFixed(2)),
      reservedQuantity: Number(
        Math.max(0, (lot.reservedQuantity ?? 0) - current.quantity).toFixed(2)
      ),
      status: resolveLotStatus(lot.quantity - current.quantity, lot.expiryDate),
      updatedAt: now
    };
    const movement = this.buildStockMovement({
      accountId,
      inventoryItemId: item.id,
      movementType: 'consumption',
      quantityDelta: -current.quantity,
      balanceBefore: item.onHandQuantity,
      balanceAfter: updatedItem.onHandQuantity,
      unitCostAmount: current.unitCostAmount,
      reason: 'Consumo de reserva de estoque',
      reference: current.reference ?? current.id,
      recordedByUserId: actorUserId
    });
    const updatedReservation: InventoryReservationSummary = {
      ...current,
      status: 'consumed',
      consumedAt: now,
      updatedAt: now
    };
    const previousLots = this.snapshotLots(item.id);
    try {
      if (this.#repository?.consumeReservationAtomically) {
        await this.#repository.consumeReservationAtomically(
          updatedReservation,
          updatedItem,
          updatedLot,
          movement
        );
      } else if (this.#repository) {
        await this.#repository.updateItem(updatedItem);
        await this.#repository.createStockMovement(movement);
        await this.#repository.upsertLots?.([updatedLot]);
      }
      this.#items.set(item.id, updatedItem);
      this.#lots.set(updatedLot.id, updatedLot);
      this.#movements = [movement, ...this.#movements];
      this.#reservations = this.#reservations.map((reservation) =>
        reservation.id === reservationId ? updatedReservation : reservation
      );
      return updatedReservation;
    } catch (error) {
      this.#items.set(item.id, item);
      this.restoreLots(item.id, previousLots);
      throw error;
    }
  }

  public async returnReservation(
    accountId: AccountId,
    actorUserId: UserId,
    reservationId: InventoryReservationId
  ): Promise<InventoryReservationSummary> {
    const current = this.getReservationOrThrow(reservationId, accountId);
    if (current.status !== 'consumed') {
      throw new ConflictError('Only consumed inventory reservations can be returned', {
        reservationId,
        status: current.status
      });
    }
    const item = this.getItemOrThrow(current.inventoryItemId, accountId);
    const lot = this.#lots.get(current.inventoryLotId);
    if (!lot)
      throw new NotFoundError('Inventory lot not found', {
        inventoryLotId: current.inventoryLotId
      });
    const now = nowIso();
    const updatedItem: InventoryItemSummary = {
      ...item,
      onHandQuantity: Number((item.onHandQuantity + current.quantity).toFixed(2)),
      updatedAt: now
    };
    const updatedLot: InventoryLotSummary = {
      ...lot,
      quantity: Number((lot.quantity + current.quantity).toFixed(2)),
      reservedQuantity: lot.reservedQuantity ?? 0,
      status: resolveLotStatus(lot.quantity + current.quantity, lot.expiryDate),
      updatedAt: now
    };
    const movement = this.buildStockMovement({
      accountId,
      inventoryItemId: item.id,
      movementType: 'inbound',
      quantityDelta: current.quantity,
      balanceBefore: item.onHandQuantity,
      balanceAfter: updatedItem.onHandQuantity,
      unitCostAmount: current.unitCostAmount,
      reason: 'Devolução de consumo de estoque',
      reference: current.reference ?? current.id,
      recordedByUserId: actorUserId
    });
    const updatedReservation: InventoryReservationSummary = {
      ...current,
      status: 'returned',
      returnedAt: now,
      updatedAt: now
    };
    const previousLots = this.snapshotLots(item.id);
    try {
      if (this.#repository?.returnReservationAtomically) {
        await this.#repository.returnReservationAtomically(
          updatedReservation,
          updatedItem,
          updatedLot,
          movement
        );
      } else if (this.#repository) {
        await this.#repository.updateItem(updatedItem);
        await this.#repository.createStockMovement(movement);
        await this.#repository.upsertLots?.([updatedLot]);
      }
      this.#items.set(item.id, updatedItem);
      this.#lots.set(updatedLot.id, updatedLot);
      this.#movements = [movement, ...this.#movements];
      this.#reservations = this.#reservations.map((reservation) =>
        reservation.id === reservationId ? updatedReservation : reservation
      );
      return updatedReservation;
    } catch (error) {
      this.#items.set(item.id, item);
      this.restoreLots(item.id, previousLots);
      throw error;
    }
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
    const item = this.getItemOrThrow(payload.inventoryItemId as never, accountId);
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
    const previousLots = this.snapshotLots(item.id);
    if (quantityDelta < 0) {
      this.drainLots(item.id, Math.abs(quantityDelta));
    } else {
      this.replaceLotsForItem(updatedItem);
    }
    const movement = this.buildStockMovement({
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
    try {
      if (this.#repository?.adjustAtomically) {
        await this.#repository.adjustAtomically(updatedItem, movement, this.snapshotLots(item.id));
      } else if (this.#repository) {
        await this.#repository.updateItem(updatedItem);
        await this.#repository.createStockMovement(movement);
        await this.#repository.upsertLots?.(this.snapshotLots(item.id));
      }
      this.#items.set(item.id, updatedItem);
      this.#movements = [movement, ...this.#movements];
      return movement;
    } catch (error) {
      this.#items.set(item.id, item);
      this.restoreLots(item.id, previousLots);
      throw error;
    }
  }

  public async receiveInbound(
    accountId: AccountId,
    recordedByUserId: UserId,
    payload: CreateInventoryInboundRequest
  ): Promise<InventoryStockMovementSummary> {
    const item = this.getItemOrThrow(payload.inventoryItemId as InventoryItemId, accountId);
    const quantity = requirePositiveNumber(payload.quantity, 'quantity');
    if (
      typeof payload.unitCostAmount !== 'number' ||
      !Number.isFinite(payload.unitCostAmount) ||
      payload.unitCostAmount < 0
    ) {
      throw new ValidationError('Field unitCostAmount must be a non-negative number');
    }
    const unitCostAmount = Number(payload.unitCostAmount.toFixed(2));
    const lotNumber = payload.lotNumber.trim();
    if (!lotNumber) throw new ConflictError('lotNumber is required');
    const balanceBefore = item.onHandQuantity;
    const balanceAfter = Number((balanceBefore + quantity).toFixed(2));
    const weightedCost = Number(
      ((balanceBefore * item.unitCostAmount + quantity * unitCostAmount) / balanceAfter).toFixed(2)
    );
    const now = nowIso();
    const updatedItem: InventoryItemSummary = {
      ...item,
      onHandQuantity: balanceAfter,
      unitCostAmount: weightedCost,
      updatedAt: now
    };
    const existingLot = this.listLots(accountId).find(
      (lot) => lot.inventoryItemId === item.id && lot.lotNumber === lotNumber
    );
    const lot: InventoryLotSummary = {
      id: existingLot?.id ?? (`${item.id}-${createCorrelationId('lot')}` as InventoryLotId),
      accountId,
      inventoryItemId: item.id,
      sku: item.sku,
      itemName: item.name,
      lotNumber,
      quantity: Number(((existingLot?.quantity ?? 0) + quantity).toFixed(2)),
      reservedQuantity: existingLot?.reservedQuantity ?? 0,
      unit: item.unit,
      location: payload.location?.trim() || existingLot?.location,
      supplier: payload.supplier?.trim() || existingLot?.supplier,
      manufactureDate: payload.manufactureDate ?? existingLot?.manufactureDate,
      expiryDate: payload.expiryDate ?? existingLot?.expiryDate,
      status: resolveLotStatus(
        (existingLot?.quantity ?? 0) + quantity,
        payload.expiryDate ?? existingLot?.expiryDate
      ),
      createdAt: existingLot?.createdAt ?? now,
      updatedAt: now
    };
    const movement = this.buildStockMovement({
      accountId,
      inventoryItemId: item.id,
      movementType: 'inbound',
      quantityDelta: quantity,
      balanceBefore,
      balanceAfter,
      unitCostAmount,
      reason: 'Entrada de compra',
      reference: payload.reference?.trim() || undefined,
      recordedByUserId
    });
    const previousLots = this.snapshotLots(item.id);
    this.#lots.set(lot.id, lot);
    try {
      if (this.#repository?.receiveAtomically) {
        await this.#repository.receiveAtomically(updatedItem, movement, [lot]);
      } else if (this.#repository) {
        await this.#repository.updateItem(updatedItem);
        await this.#repository.createStockMovement(movement);
        await this.#repository.upsertLots?.([lot]);
      }
      this.#items.set(item.id, updatedItem);
      this.#movements = [movement, ...this.#movements];
      return movement;
    } catch (error) {
      this.#items.set(item.id, item);
      this.restoreLots(item.id, previousLots);
      throw error;
    }
  }

  public async transferBetweenLocations(
    accountId: AccountId,
    recordedByUserId: UserId,
    payload: InventoryTransferRequest
  ): Promise<readonly InventoryStockMovementSummary[]> {
    const item = this.getItemOrThrow(payload.inventoryItemId as InventoryItemId, accountId);
    const quantity = requirePositiveNumber(payload.quantity, 'quantity');
    const fromLocation = payload.fromLocation.trim();
    const toLocation = payload.toLocation.trim();
    if (!fromLocation || !toLocation || fromLocation === toLocation) {
      throw new ConflictError('Transfer requires distinct source and destination locations');
    }
    const candidates = this.listLots(accountId)
      .filter(
        (lot) =>
          lot.inventoryItemId === item.id &&
          lot.location === fromLocation &&
          lot.quantity - (lot.reservedQuantity ?? 0) > 0
      )
      .filter((lot) => resolveLotStatus(lot.quantity, lot.expiryDate) !== 'expired')
      .sort((left, right) => (left.expiryDate ?? '9999').localeCompare(right.expiryDate ?? '9999'));
    if (
      candidates.reduce((sum, lot) => sum + lot.quantity - (lot.reservedQuantity ?? 0), 0) <
      quantity
    ) {
      throw new ConflictError('Insufficient stock at source location', { fromLocation, quantity });
    }
    const previousLots = this.snapshotLots(item.id);
    let remaining = quantity;
    const transferLots: InventoryLotSummary[] = [];
    for (const sourceLot of candidates) {
      if (remaining <= 0) break;
      const moved = Math.min(sourceLot.quantity - (sourceLot.reservedQuantity ?? 0), remaining);
      remaining = Number((remaining - moved).toFixed(2));
      this.#lots.set(sourceLot.id, {
        ...sourceLot,
        quantity: Number((sourceLot.quantity - moved).toFixed(2)),
        status: resolveLotStatus(sourceLot.quantity - moved, sourceLot.expiryDate),
        updatedAt: nowIso()
      });
      transferLots.push({
        ...sourceLot,
        id: `${sourceLot.id}-${createCorrelationId('transfer-lot')}` as InventoryLotId,
        lotNumber: `${sourceLot.lotNumber}-T-${Date.now().toString(36)}`,
        quantity: moved,
        reservedQuantity: 0,
        location: toLocation,
        status: resolveLotStatus(moved, sourceLot.expiryDate),
        updatedAt: nowIso()
      });
    }
    for (const lot of transferLots) {
      const sameLot = this.listLots(accountId).find(
        (candidate) =>
          candidate.inventoryItemId === item.id && candidate.lotNumber === lot.lotNumber
      );
      if (sameLot) {
        this.#lots.set(sameLot.id, {
          ...sameLot,
          quantity: sameLot.quantity + lot.quantity,
          updatedAt: nowIso()
        });
      } else {
        this.#lots.set(lot.id, lot);
      }
    }
    const firstMovement = this.buildStockMovement({
      accountId,
      inventoryItemId: item.id,
      movementType: 'outbound',
      quantityDelta: -quantity,
      balanceBefore: item.onHandQuantity,
      balanceAfter: Number((item.onHandQuantity - quantity).toFixed(2)),
      unitCostAmount: item.unitCostAmount,
      reason: `Transferência de ${fromLocation}`,
      reference: payload.reference?.trim() || undefined,
      recordedByUserId
    });
    const secondMovement = this.buildStockMovement({
      accountId,
      inventoryItemId: item.id,
      movementType: 'inbound',
      quantityDelta: quantity,
      balanceBefore: firstMovement.balanceAfter,
      balanceAfter: item.onHandQuantity,
      unitCostAmount: item.unitCostAmount,
      reason: `Transferência para ${toLocation}`,
      reference: payload.reference?.trim() || firstMovement.id,
      recordedByUserId
    });
    try {
      if (this.#repository?.transferAtomically) {
        await this.#repository.transferAtomically(
          item,
          [firstMovement, secondMovement],
          [...this.snapshotLots(item.id)]
        );
      } else if (this.#repository) {
        await this.#repository.createStockMovement(firstMovement);
        await this.#repository.createStockMovement(secondMovement);
        await this.#repository.upsertLots?.(this.snapshotLots(item.id));
      }
      this.#movements = [secondMovement, firstMovement, ...this.#movements];
      return [firstMovement, secondMovement];
    } catch (error) {
      this.restoreLots(item.id, previousLots);
      throw error;
    }
  }

  public async consumeForSale(
    accountId: AccountId,
    inventoryItemId: InventoryItemId,
    quantity: number
  ): Promise<InventoryConsumptionSummary> {
    const item = this.getItemOrThrow(inventoryItemId, accountId);
    const qty = requirePositiveNumber(quantity, 'quantity');
    const reservedQuantity = this.snapshotLots(item.id).reduce(
      (sum, lot) => sum + (lot.reservedQuantity ?? 0),
      0
    );
    const availableQuantity = item.onHandQuantity - reservedQuantity;
    if (availableQuantity < qty) {
      throw new ConflictError('Insufficient stock for commercial sale', {
        inventoryItemId: item.id,
        onHandQuantity: item.onHandQuantity,
        reservedQuantity,
        availableQuantity,
        requestedQuantity: qty
      });
    }

    const updatedItem: InventoryItemSummary = {
      ...item,
      onHandQuantity: Number((item.onHandQuantity - qty).toFixed(2)),
      updatedAt: nowIso()
    };
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
    const movement = this.buildStockMovement({
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
    const previousLots = this.snapshotLots(item.id);
    try {
      this.drainLots(item.id, qty);
      const updatedLots = this.snapshotLots(item.id);
      if (this.#repository?.consumeAtomically) {
        await this.#repository.consumeAtomically(item, consumption, movement, updatedLots);
      } else if (this.#repository) {
        await this.#repository.updateItem(updatedItem);
        await this.#repository.createConsumption(consumption);
        await this.#repository.createStockMovement(movement);
        await this.#repository.upsertLots?.(updatedLots);
      }
      this.#items.set(item.id, updatedItem);
      this.#consumptions = [consumption, ...this.#consumptions];
      this.#movements = [movement, ...this.#movements];
    } catch (error) {
      this.#items.set(item.id, item);
      this.restoreLots(item.id, previousLots);
      throw error;
    }
    return consumption;
  }

  public async createItem(
    accountId: AccountId,
    payload: CreateInventoryItemRequest
  ): Promise<InventoryItemSummary> {
    const id = createCorrelationId('inv') as InventoryItemId;
    const now = nowIso();

    // Validate SKU uniqueness
    const existingBySku = Array.from(this.#items.values()).find(
      (item) => item.accountId === accountId && item.sku === payload.sku.trim()
    );
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
      chargeUnitPriceAmount: normalizeChargeUnitPriceAmount(payload.chargeUnitPriceAmount) ?? null,
      createdAt: now,
      updatedAt: now
    };

    if (this.#repository) {
      await this.#repository.createItem(item);
      await this.#repository.upsertLots?.(buildLotsForItem(item));
    }

    this.#items.set(item.id, item);
    this.replaceLotsForItem(item);

    return item;
  }

  public async updateItem(
    accountId: AccountId,
    inventoryItemId: InventoryItemId,
    payload: UpdateInventoryItemRequest
  ): Promise<InventoryItemSummary> {
    const existing = this.getItemOrThrow(inventoryItemId, accountId);

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
      chargeUnitPriceAmount:
        payload.chargeUnitPriceAmount !== undefined
          ? normalizeChargeUnitPriceAmount(payload.chargeUnitPriceAmount)
          : existing.chargeUnitPriceAmount,
      updatedAt: nowIso()
    };
    const reservedQuantity = this.snapshotLots(existing.id).reduce(
      (sum, lot) => sum + (lot.reservedQuantity ?? 0),
      0
    );
    if (updatedItem.onHandQuantity < reservedQuantity) {
      throw new ConflictError('Inventory item quantity cannot be lower than its reservations', {
        inventoryItemId: existing.id,
        reservedQuantity,
        requestedQuantity: updatedItem.onHandQuantity
      });
    }

    if (this.#repository) {
      await this.#repository.updateItem(updatedItem);
      await this.#repository.upsertLots?.(
        buildLotsForItem(updatedItem).map((lot) => ({
          ...lot,
          reservedQuantity: this.#lots.get(lot.id)?.reservedQuantity ?? 0
        }))
      );
    }

    this.#items.set(updatedItem.id, updatedItem);
    this.replaceLotsForItem(updatedItem);

    return updatedItem;
  }

  private buildStockMovement(
    input: Omit<InventoryStockMovementSummary, 'id' | 'createdAt'>
  ): InventoryStockMovementSummary {
    return {
      id: createCorrelationId('stockmov') as InventoryStockMovementId,
      ...input,
      reason: input.reason.trim() || 'Movimentacao de estoque',
      createdAt: nowIso()
    };
  }

  private snapshotLots(inventoryItemId: InventoryItemId): readonly InventoryLotSummary[] {
    return Array.from(this.#lots.values()).filter((lot) => lot.inventoryItemId === inventoryItemId);
  }

  private restoreLots(
    inventoryItemId: InventoryItemId,
    previousLots: readonly InventoryLotSummary[]
  ): void {
    for (const [lotId, lot] of this.#lots.entries()) {
      if (lot.inventoryItemId === inventoryItemId) this.#lots.delete(lotId);
    }
    for (const lot of previousLots) this.#lots.set(lot.id, lot);
  }
}

function requireNonZeroNumber(value: number, field: string): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized === 0) {
    throw new ConflictError(`${field} must be a non-zero number`, { field });
  }
  return Number(normalized.toFixed(2));
}

function normalizeChargeUnitPriceAmount(
  value: number | null | undefined
): number | null | undefined {
  if (value === undefined || value === null) return value;
  const validatedValue = requirePositiveNumber(value, 'chargeUnitPriceAmount');
  const roundedValue = Number(validatedValue.toFixed(2));
  return requirePositiveNumber(roundedValue, 'chargeUnitPriceAmount');
}

function isBalanceChangedConflict(error: unknown): boolean {
  if (!(error instanceof ConflictError) || !error.details || typeof error.details !== 'object') {
    return false;
  }
  return (
    'reason' in error.details &&
    (error.details as { readonly reason?: unknown }).reason === 'balance_changed'
  );
}

export { createSeedItems };

export {
  DatabaseInventoryRepository,
  type InventoryRepository
} from './repositories/database-inventory.repository.js';

export {
  DatabaseProcurementRepository,
  InMemoryProcurementRepository,
  ProcurementService,
  type CreateInventoryPurchaseInput,
  type InventoryPurchaseLineSummary,
  type InventoryPurchaseStatus,
  type InventoryPurchaseSummary,
  type InventoryTransferStatus,
  type InventoryTransferSummary,
  type InventoryPayableGateway,
  type ProcurementRepository,
  type ReceiveInventoryPurchaseInput
} from './procurement.js';
