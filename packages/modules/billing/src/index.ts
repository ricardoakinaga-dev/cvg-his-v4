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
    const records = await this.#repository.findRecordsByAccountId(accountId);
    for (const record of records) {
      this.#records.set(record.id, record);
      this.#recordByEncounterId.set(record.encounterId, record.id);
      const items = await this.#repository.findItemsByRecord(record.accountId, record.id);
      this.#items.set(record.id, [...items]);
    }
  }

  public async findByEncounter(
    encounterId: EncounterId,
    expectedAccountId?: AccountId
  ): Promise<BillingRecordSummary | null> {
    const existingId = this.#recordByEncounterId.get(encounterId);
    if (existingId) {
      const existing = this.getOrThrow(existingId);
      return expectedAccountId && existing.accountId !== expectedAccountId ? null : existing;
    }

    const encounter = this.#encounters.getOrThrow(encounterId);
    if (expectedAccountId && encounter.accountId !== expectedAccountId) {
      return null;
    }

    if (this.#repository) {
      const record = await this.#repository.findRecordByEncounter(encounter.accountId, encounterId);
      if (record) {
        this.#records.set(record.id, record);
        this.#recordByEncounterId.set(encounterId, record.id);
        const items = await this.#repository.findItemsByRecord(record.accountId, record.id);
        this.#items.set(record.id, [...items]);
        return record;
      }
    }

    return null;
  }

  public async ensureRecord(
    encounterId: EncounterId,
    expectedAccountId?: AccountId
  ): Promise<BillingRecordSummary> {
    const existing = await this.findByEncounter(encounterId, expectedAccountId);
    if (existing) {
      return existing;
    }

    const encounter = this.#encounters.getOrThrow(encounterId);
    if (expectedAccountId && encounter.accountId !== expectedAccountId) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }
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
      await this.#repository.createRecord(record);
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

  public async getByEncounterOrThrow(
    encounterId: EncounterId,
    expectedAccountId?: AccountId
  ): Promise<BillingRecordSummary> {
    const record = await this.findByEncounter(encounterId, expectedAccountId);
    if (!record) {
      throw new NotFoundError('Billing record not found', { encounterId });
    }
    return record;
  }

  public getOrThrow(
    recordId: BillingRecordId,
    expectedAccountId?: AccountId
  ): BillingRecordSummary {
    const record = this.#records.get(recordId);
    if (!record) {
      throw new ConflictError('Billing record not found', { recordId });
    }
    if (expectedAccountId && record.accountId !== expectedAccountId) {
      throw new NotFoundError('Billing record not found', { recordId });
    }
    return record;
  }

  public async createEstimate(
    payload: CreateBillingEstimateRequest,
    expectedAccountId?: AccountId
  ): Promise<BillingRecordSummary> {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    await this.ensureRecord(encounterId, expectedAccountId);
    return this.updateStatus(
      encounterId,
      {
        status: 'estimated',
        administrativeNotes: payload.administrativeNotes
      },
      expectedAccountId
    );
  }

  public async addItem(
    actorUserId: UserId,
    payload: CreateBillingItemRequest,
    expectedAccountId?: AccountId
  ): Promise<BillingItemSummary> {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    const record = await this.ensureRecord(encounterId, expectedAccountId);
    if (record.status === 'settled') {
      throw new ConflictError('Settled billing records cannot receive new items', {
        encounterId
      });
    }

    const quantity = requirePositiveNumber(payload.quantity, 'quantity');
    const unitPriceAmount = requirePositiveNumber(payload.unitPriceAmount, 'unitPriceAmount');
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
      description: requireNonEmptyString(payload.description, 'description'),
      quantity,
      unitPriceAmount,
      totalAmount: Number((quantity * unitPriceAmount).toFixed(2)),
      sourceEntityType: payload.sourceEntityType,
      sourceEntityId: payload.sourceEntityId?.trim() || undefined,
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
      await this.#repository.createItem(item);
    }

    this.#items.set(record.id, nextItems);
    this.#records.set(record.id, updatedRecord);

    return item;
  }

  public async listItems(
    encounterId: EncounterId,
    expectedAccountId?: AccountId
  ): Promise<readonly BillingItemSummary[]> {
    const record = await this.findByEncounter(encounterId, expectedAccountId);
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
    payload: UpdateBillingStatusRequest,
    expectedAccountId?: AccountId
  ): Promise<BillingRecordSummary> {
    const record = await this.findByEncounter(encounterId, expectedAccountId);
    if (!record) {
      throw new NotFoundError('Billing record not found', { encounterId });
    }
    const previousStatus = record.status;
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
