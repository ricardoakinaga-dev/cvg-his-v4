import { EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  CreateBillingEstimateRequest,
  CreateBillingItemRequest,
  UpdateBillingStatusRequest
} from '@cvg-his-v2/shared-contracts';
import { ConflictError } from '@cvg-his-v2/shared-errors';
import type {
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

  public async hydrateFromDatabase(): Promise<void> {
    if (!this.#repository) return;
    const records = await this.#repository.findRecordsByAccountId('' as never);
    for (const record of records) {
      this.#records.set(record.id, record);
      this.#recordByEncounterId.set(record.encounterId, record.id);
      const items = await this.#repository.findItemsByRecord(record.id);
      this.#items.set(record.id, [...items]);
    }
  }

  public async ensureRecord(encounterId: EncounterId): Promise<BillingRecordSummary> {
    const existingId = this.#recordByEncounterId.get(encounterId);
    if (existingId) {
      return this.getOrThrow(existingId);
    }

    if (this.#repository) {
      const records = await this.#repository.findRecordsByEncounter(encounterId);
      if (records.length > 0) {
        const record = records[0];
        this.#records.set(record.id, record);
        this.#recordByEncounterId.set(encounterId, record.id);
        this.#items.set(record.id, []);
        return record;
      }
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
      await this.#repository.createRecord(record);
    }

    await this.#onRecordCreated?.(record);

    return record;
  }

  public list(encounterId?: string): readonly BillingRecordSummary[] {
    return Array.from(this.#records.values()).filter(
      (record) => !encounterId || record.encounterId === encounterId
    );
  }

  public async getByEncounterOrThrow(encounterId: EncounterId): Promise<BillingRecordSummary> {
    return this.ensureRecord(encounterId);
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
    currentItems.unshift(item);
    this.#items.set(record.id, currentItems);
    this.#records.set(record.id, {
      ...record,
      subtotalAmount: sumItems(currentItems),
      updatedAt: nowIso()
    });

    if (this.#repository) {
      await this.#repository.createItem(item);
    }

    return item;
  }

  public async listItems(encounterId: EncounterId): Promise<readonly BillingItemSummary[]> {
    const record = await this.ensureRecord(encounterId);

    if (this.#repository) {
      const dbItems = await this.#repository.findItemsByRecord(record.id);
      if (dbItems.length > 0) {
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
    const record = await this.ensureRecord(encounterId);
    const previousStatus = record.status;
    const updated: BillingRecordSummary = {
      ...record,
      status: payload.status,
      administrativeNotes: payload.administrativeNotes?.trim() || record.administrativeNotes,
      subtotalAmount: sumItems(this.#items.get(record.id) ?? []),
      updatedAt: nowIso()
    };
    this.#records.set(record.id, updated);

    if (this.#repository) {
      await this.#repository.updateRecord(updated);
    }

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
