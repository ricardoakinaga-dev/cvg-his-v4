import { EncountersService } from "@cvg-his-v2/module-encounters";
import type {
  CreateBillingEstimateRequest,
  CreateBillingItemRequest,
  UpdateBillingStatusRequest,
} from "@cvg-his-v2/shared-contracts";
import { ConflictError } from "@cvg-his-v2/shared-errors";
import type {
  BillingItemId,
  BillingItemSummary,
  BillingRecordId,
  BillingRecordSummary,
  EncounterId,
  UserId,
} from "@cvg-his-v2/shared-types";
import { createCorrelationId, nowIso } from "@cvg-his-v2/shared-utils";
import {
  requireEnum,
  requireNonEmptyString,
  requirePositiveNumber,
} from "@cvg-his-v2/shared-validation";

export class BillingService {
  readonly #encounters: EncountersService;
  readonly #records = new Map<BillingRecordId, BillingRecordSummary>();
  readonly #recordByEncounterId = new Map<EncounterId, BillingRecordId>();
  readonly #items = new Map<BillingRecordId, BillingItemSummary[]>();

  public constructor(encounters: EncountersService) {
    this.#encounters = encounters;
  }

  public ensureRecord(encounterId: EncounterId): BillingRecordSummary {
    const existingId = this.#recordByEncounterId.get(encounterId);
    if (existingId) {
      return this.getOrThrow(existingId);
    }

    const encounter = this.#encounters.getOrThrow(encounterId);
    const now = nowIso();
    const record: BillingRecordSummary = {
      id: createCorrelationId("bill") as BillingRecordId,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      ownerId: encounter.ownerId,
      status: "draft",
      subtotalAmount: 0,
      currency: "BRL",
      createdAt: now,
      updatedAt: now,
    };

    this.#records.set(record.id, record);
    this.#recordByEncounterId.set(encounterId, record.id);
    this.#items.set(record.id, []);
    return record;
  }

  public list(encounterId?: string): readonly BillingRecordSummary[] {
    return Array.from(this.#records.values()).filter(
      (record) => !encounterId || record.encounterId === encounterId,
    );
  }

  public getByEncounterOrThrow(encounterId: EncounterId): BillingRecordSummary {
    return this.ensureRecord(encounterId);
  }

  public getOrThrow(recordId: BillingRecordId): BillingRecordSummary {
    const record = this.#records.get(recordId);
    if (!record) {
      throw new ConflictError("Billing record not found", { recordId });
    }

    return record;
  }

  public createEstimate(payload: CreateBillingEstimateRequest): BillingRecordSummary {
    const encounterId = requireNonEmptyString(payload.encounterId, "encounterId") as EncounterId;
    const record = this.ensureRecord(encounterId);
    return this.updateStatus(encounterId, {
      status: "estimated",
      administrativeNotes: payload.administrativeNotes,
    });
  }

  public addItem(
    actorUserId: UserId,
    payload: CreateBillingItemRequest,
  ): BillingItemSummary {
    const encounterId = requireNonEmptyString(payload.encounterId, "encounterId") as EncounterId;
    const record = this.ensureRecord(encounterId);
    if (record.status === "settled") {
      throw new ConflictError("Settled billing records cannot receive new items", {
        encounterId,
      });
    }

    const quantity = requirePositiveNumber(payload.quantity, "quantity");
    const unitPriceAmount = requirePositiveNumber(
      payload.unitPriceAmount,
      "unitPriceAmount",
    );
    const item: BillingItemSummary = {
      id: createCorrelationId("billitem") as BillingItemId,
      billingRecordId: record.id,
      accountId: record.accountId,
      encounterId,
      itemType: requireEnum(payload.itemType, "itemType", [
        "service",
        "supply",
        "procedure",
        "exam",
        "daily_rate",
        "other",
      ]),
      description: requireNonEmptyString(payload.description, "description"),
      quantity,
      unitPriceAmount,
      totalAmount: Number((quantity * unitPriceAmount).toFixed(2)),
      sourceEntityType: payload.sourceEntityType,
      sourceEntityId: payload.sourceEntityId?.trim() || undefined,
      createdByUserId: actorUserId,
      createdAt: nowIso(),
    };

    const currentItems = this.#items.get(record.id) ?? [];
    currentItems.unshift(item);
    this.#items.set(record.id, currentItems);
    this.#records.set(record.id, {
      ...record,
      subtotalAmount: sumItems(currentItems),
      updatedAt: nowIso(),
    });

    return item;
  }

  public listItems(encounterId: EncounterId): readonly BillingItemSummary[] {
    const record = this.ensureRecord(encounterId);
    return [...(this.#items.get(record.id) ?? [])];
  }

  public updateStatus(
    encounterId: EncounterId,
    payload: UpdateBillingStatusRequest,
  ): BillingRecordSummary {
    const record = this.ensureRecord(encounterId);
    const updated: BillingRecordSummary = {
      ...record,
      status: payload.status,
      administrativeNotes: payload.administrativeNotes?.trim() || record.administrativeNotes,
      subtotalAmount: sumItems(this.#items.get(record.id) ?? []),
      updatedAt: nowIso(),
    };
    this.#records.set(record.id, updated);
    return updated;
  }
}

function sumItems(items: readonly BillingItemSummary[]): number {
  return Number(
    items.reduce((total, item) => total + item.totalAmount, 0).toFixed(2),
  );
}
