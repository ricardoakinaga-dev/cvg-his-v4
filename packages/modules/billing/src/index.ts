import { EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  CreateBillingEstimateRequest,
  CreateBillingItemRequest,
  UpdateBillingStatusRequest
} from '@cvg-his-v2/shared-contracts';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  BillingItemId,
  BillingItemSummary,
  BillingRecordId,
  BillingRecordSummary,
  BillingRecordStatus,
  EncounterId,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import {
  requireEnum,
  requireNonEmptyString,
  requirePositiveNumber
} from '@cvg-his-v2/shared-validation';
import type { BillingRepository } from './repositories/database-billing.repository.js';

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? (error as { readonly code?: unknown }).code : undefined;
  return code === '23505';
}

function matchesSourceItem(
  item: BillingItemSummary,
  payload: CreateBillingItemRequest,
  encounterId: EncounterId,
  description: string,
  quantity: number,
  unitPriceAmount: number,
  sourceEntityId: string
): boolean {
  return (
    item.encounterId === encounterId &&
    item.itemType === payload.itemType &&
    item.description === description &&
    item.quantity === quantity &&
    item.unitPriceAmount === unitPriceAmount &&
    item.sourceEntityType === payload.sourceEntityType &&
    item.sourceEntityId === sourceEntityId
  );
}

export interface BillingServiceOptions {
  readonly repository?: BillingRepository;
  readonly onRecordCreated?: (record: BillingRecordSummary) => Promise<void>;
  readonly onStatusChanged?: (
    record: BillingRecordSummary,
    previousStatus: string
  ) => Promise<void>;
}

export interface BillingRecordFilters {
  readonly accountId?: string;
  readonly encounterId?: string;
  readonly patientId?: string;
  readonly ownerId?: string;
}

export class BillingService {
  readonly #encounters: EncountersService;
  readonly #repository?: BillingRepository;
  readonly #records = new Map<BillingRecordId, BillingRecordSummary>();
  readonly #recordByEncounterId = new Map<EncounterId, BillingRecordId>();
  readonly #items = new Map<BillingRecordId, BillingItemSummary[]>();
  readonly #onRecordCreated?: (record: BillingRecordSummary) => Promise<void>;
  readonly #onStatusChanged?: (
    record: BillingRecordSummary,
    previousStatus: string
  ) => Promise<void>;

  public constructor(encounters: EncountersService, options?: BillingServiceOptions) {
    this.#encounters = encounters;
    this.#repository = options?.repository;
    this.#onRecordCreated = options?.onRecordCreated;
    this.#onStatusChanged = options?.onStatusChanged;
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId?: AccountId): Promise<void> {
    if (!this.#repository) return;
    if (!accountId) return;
    this.clearAccountCache(accountId);
    const records = await this.#repository.findRecordsByAccountId(accountId);
    for (const record of records) {
      this.#records.set(record.id, record);
      this.#recordByEncounterId.set(record.encounterId, record.id);
      const items = await this.#repository.findItemsByRecord(record.accountId, record.id);
      this.#items.set(record.id, [...items]);
    }
  }

  /**
   * Rebuilds the in-process cache from committed database state after a
   * transaction rollback. Repository-backed runtimes must never keep a
   * rolled-back billing item visible to a retry.
   */
  public async refreshFromDatabase(accountId?: AccountId): Promise<void> {
    await this.hydrateFromDatabase(accountId);
  }

  private clearAccountCache(accountId: AccountId): void {
    for (const [recordId, record] of this.#records) {
      if (record.accountId !== accountId) continue;
      this.#records.delete(recordId);
      this.#items.delete(recordId);
      if (this.#recordByEncounterId.get(record.encounterId) === recordId) {
        this.#recordByEncounterId.delete(record.encounterId);
      }
    }
  }

  public async findByEncounter(encounterId: EncounterId): Promise<BillingRecordSummary | null> {
    const encounter = this.#encounters.getOrThrow(encounterId);

    if (this.#repository) {
      const record = await this.#repository.findRecordByEncounter(encounter.accountId, encounterId);
      if (record) {
        this.#records.set(record.id, record);
        this.#recordByEncounterId.set(encounterId, record.id);
        const items = await this.#repository.findItemsByRecord(record.accountId, record.id);
        this.#items.set(record.id, [...items]);
        return record;
      }
      const staleId = this.#recordByEncounterId.get(encounterId);
      if (staleId) {
        this.#recordByEncounterId.delete(encounterId);
        this.#records.delete(staleId);
        this.#items.delete(staleId);
      }
      return null;
    }

    const existingId = this.#recordByEncounterId.get(encounterId);
    if (existingId) {
      return this.getOrThrow(existingId);
    }

    return null;
  }

  public async ensureRecord(encounterId: EncounterId): Promise<BillingRecordSummary> {
    const existing = await this.findByEncounter(encounterId);
    if (existing) {
      return existing;
    }

    const encounter = this.#encounters.getOrThrow(encounterId);
    const now = nowIso();
    const record: BillingRecordSummary = {
      id: createCorrelationId('bill') as BillingRecordId,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      ownerId: encounter.ownerId,
      status: 'draft',
      subtotalAmount: 0,
      currency: 'BRL',
      createdAt: now,
      updatedAt: now
    };

    this.#records.set(record.id, record);
    this.#recordByEncounterId.set(encounterId, record.id);
    this.#items.set(record.id, []);

    if (this.#repository) {
      try {
        await this.#repository.createRecord(record);
      } catch (error) {
        // The encounter unique index closes the race between two runtimes
        // creating the first billing record. Reload the committed winner and
        // continue the caller's idempotent command against that record.
        if (!isUniqueViolation(error)) {
          this.#records.delete(record.id);
          this.#recordByEncounterId.delete(encounterId);
          this.#items.delete(record.id);
          throw error;
        }

        const concurrent = await this.#repository.findRecordByEncounter(
          record.accountId,
          encounterId
        );
        if (!concurrent) {
          this.#records.delete(record.id);
          this.#recordByEncounterId.delete(encounterId);
          this.#items.delete(record.id);
          throw error;
        }

        this.#records.set(concurrent.id, concurrent);
        this.#recordByEncounterId.set(encounterId, concurrent.id);
        const items = await this.#repository.findItemsByRecord(concurrent.accountId, concurrent.id);
        this.#items.set(concurrent.id, [...items]);
        this.#records.delete(record.id);
        this.#items.delete(record.id);
        return concurrent;
      }
    }

    await this.#onRecordCreated?.(record);

    return record;
  }

  public list(filters?: string | BillingRecordFilters): readonly BillingRecordSummary[] {
    const normalized = typeof filters === 'string' ? { encounterId: filters } : (filters ?? {});
    return Array.from(this.#records.values())
      .filter((record) => (normalized.accountId ? record.accountId === normalized.accountId : true))
      .filter((record) =>
        normalized.encounterId ? record.encounterId === normalized.encounterId : true
      )
      .filter((record) => (normalized.patientId ? record.patientId === normalized.patientId : true))
      .filter((record) => (normalized.ownerId ? record.ownerId === normalized.ownerId : true));
  }

  public async listAuthoritative(
    filters: BillingRecordFilters & { readonly accountId: string }
  ): Promise<readonly BillingRecordSummary[]> {
    if (!this.#repository) return this.list(filters);

    const records = await this.#repository.findRecordsByAccountId(filters.accountId as AccountId);
    for (const record of records) {
      this.#records.set(record.id, record);
      this.#recordByEncounterId.set(record.encounterId, record.id);
    }
    return records
      .filter((record) => (filters.encounterId ? record.encounterId === filters.encounterId : true))
      .filter((record) => (filters.patientId ? record.patientId === filters.patientId : true))
      .filter((record) => (filters.ownerId ? record.ownerId === filters.ownerId : true));
  }

  public async getByEncounterOrThrow(encounterId: EncounterId): Promise<BillingRecordSummary> {
    const record = await this.findByEncounter(encounterId);
    if (!record) {
      throw new NotFoundError('Billing record not found', { encounterId });
    }
    return record;
  }

  public getOrThrow(recordId: BillingRecordId): BillingRecordSummary {
    const record = this.#records.get(recordId);
    if (!record) {
      throw new ConflictError('Billing record not found', { recordId });
    }
    return record;
  }

  public async createEstimate(
    payload: CreateBillingEstimateRequest
  ): Promise<BillingRecordSummary> {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    await this.ensureRecord(encounterId);
    return this.updateStatus(encounterId, {
      status: 'estimated',
      administrativeNotes: payload.administrativeNotes
    });
  }

  public async addItem(
    actorUserId: UserId,
    payload: CreateBillingItemRequest
  ): Promise<BillingItemSummary> {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    const record = await this.ensureRecord(encounterId);
    if (record.status === 'settled') {
      throw new ConflictError('Settled billing records cannot receive new items', {
        encounterId
      });
    }

    const quantity = requirePositiveNumber(payload.quantity, 'quantity');
    const unitPriceAmount = requirePositiveNumber(payload.unitPriceAmount, 'unitPriceAmount');
    const description = requireNonEmptyString(payload.description, 'description');
    requireEnum(payload.itemType, 'itemType', [
      'service',
      'supply',
      'procedure',
      'exam',
      'daily_rate',
      'other'
    ]);
    if (payload.sourceEntityType) {
      requireEnum(payload.sourceEntityType, 'sourceEntityType', [
        'encounter',
        'diagnostic_order',
        'surgery_case',
        'inpatient_stay',
        'inpatient_daily_charge',
        'prescription'
      ]);
    }
    const sourceEntityId = payload.sourceEntityId?.trim() || undefined;

    const existing = await this.findExistingSourceItem(
      record,
      payload,
      encounterId,
      description,
      quantity,
      unitPriceAmount,
      sourceEntityId
    );
    if (existing) return existing;

    const item: BillingItemSummary = {
      id: createCorrelationId('billitem') as BillingItemId,
      billingRecordId: record.id,
      accountId: record.accountId,
      encounterId,
      itemType: requireEnum(payload.itemType, 'itemType', [
        'service',
        'supply',
        'procedure',
        'exam',
        'daily_rate',
        'other'
      ]),
      description,
      quantity,
      unitPriceAmount,
      totalAmount: Number((quantity * unitPriceAmount).toFixed(2)),
      sourceEntityType: payload.sourceEntityType,
      sourceEntityId,
      createdByUserId: actorUserId,
      createdAt: nowIso()
    };

    const currentItems = this.#items.get(record.id) ?? [];
    const nextItems = [item, ...currentItems];
    const updatedRecord: BillingRecordSummary = {
      ...record,
      subtotalAmount: sumItems(nextItems),
      updatedAt: nowIso()
    };

    if (this.#repository) {
      try {
        await this.#repository.createItem(item);
      } catch (error) {
        // The source unique index closes the race between two API instances.
        // Resolve the winner and replay it only when the request is identical.
        if (isUniqueViolation(error)) {
          const concurrent = await this.findExistingSourceItem(
            record,
            payload,
            encounterId,
            description,
            quantity,
            unitPriceAmount,
            sourceEntityId
          );
          if (concurrent) return concurrent;
        }
        throw error;
      }
    }

    this.#items.set(record.id, nextItems);
    this.#records.set(record.id, updatedRecord);

    return item;
  }

  private async findExistingSourceItem(
    record: BillingRecordSummary,
    payload: CreateBillingItemRequest,
    encounterId: EncounterId,
    description: string,
    quantity: number,
    unitPriceAmount: number,
    sourceEntityId: string | undefined
  ): Promise<BillingItemSummary | null> {
    if (!payload.sourceEntityType || !sourceEntityId) return null;

    const cached = (this.#items.get(record.id) ?? []).find(
      (item) =>
        item.sourceEntityType === payload.sourceEntityType && item.sourceEntityId === sourceEntityId
    );
    const persisted =
      cached ??
      (await this.#repository?.findItemBySource?.(
        record.accountId,
        payload.sourceEntityType,
        sourceEntityId
      ));
    if (!persisted) return null;

    if (
      !matchesSourceItem(
        persisted,
        payload,
        encounterId,
        description,
        quantity,
        unitPriceAmount,
        sourceEntityId
      )
    ) {
      throw new ConflictError('Billing source item already exists with different values', {
        sourceEntityType: payload.sourceEntityType,
        sourceEntityId
      });
    }

    const current = this.#items.get(persisted.billingRecordId) ?? [];
    if (!current.some((item) => item.id === persisted.id)) {
      this.#items.set(persisted.billingRecordId, [persisted, ...current]);
    }
    return persisted;
  }

  public async listItems(encounterId: EncounterId): Promise<readonly BillingItemSummary[]> {
    const record = await this.findByEncounter(encounterId);
    if (!record) return [];

    if (this.#repository) {
      const dbItems = await this.#repository.findItemsByRecord(record.accountId, record.id);
      if (dbItems.length > 0) {
        this.#items.set(record.id, [...dbItems]);
        return dbItems;
      }
    }

    return [...(this.#items.get(record.id) ?? [])];
  }

  public async settleByRecordId(recordId: BillingRecordId): Promise<BillingRecordSummary> {
    const record = this.getOrThrow(recordId);
    return this.updateStatus(record.encounterId, { status: 'settled' });
  }

  public async updateStatus(
    encounterId: EncounterId,
    payload: UpdateBillingStatusRequest
  ): Promise<BillingRecordSummary> {
    const record = await this.findByEncounter(encounterId);
    if (!record) {
      throw new NotFoundError('Billing record not found', { encounterId });
    }
    const previousStatus = record.status;
    const allowedTransitions: Record<BillingRecordStatus, readonly BillingRecordStatus[]> = {
      draft: ['estimated', 'open'],
      estimated: ['open', 'settled'],
      open: ['settled'],
      settled: []
    };
    if (
      payload.status !== previousStatus &&
      !allowedTransitions[previousStatus].includes(payload.status)
    ) {
      throw new ConflictError('Invalid billing status transition', {
        previousStatus,
        requestedStatus: payload.status
      });
    }
    const updated: BillingRecordSummary = {
      ...record,
      status: payload.status,
      administrativeNotes: payload.administrativeNotes?.trim() || record.administrativeNotes,
      subtotalAmount: sumItems(this.#items.get(record.id) ?? []),
      updatedAt: nowIso()
    };
    if (this.#repository) {
      await this.#repository.updateRecord(updated);
    }

    this.#records.set(record.id, updated);

    if (payload.status !== previousStatus) {
      await this.#onStatusChanged?.(updated, previousStatus);
    }

    return updated;
  }
}

function sumItems(items: readonly BillingItemSummary[]): number {
  return Number(items.reduce((total, item) => total + item.totalAmount, 0).toFixed(2));
}

export {
  DatabaseBillingRepository,
  type BillingRepository
} from './repositories/database-billing.repository.js';
