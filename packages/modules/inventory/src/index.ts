import { EncountersService } from "@cvg-his-v2/module-encounters";
import { ConflictError, NotFoundError } from "@cvg-his-v2/shared-errors";
import type { CreateInventoryConsumptionRequest } from "@cvg-his-v2/shared-contracts";
import type {
  InventoryConsumptionId,
  InventoryConsumptionSummary,
  InventoryItemId,
  InventoryItemSummary,
  UserId,
} from "@cvg-his-v2/shared-types";
import { createCorrelationId, nowIso } from "@cvg-his-v2/shared-utils";
import {
  requireEnum,
  requirePositiveNumber,
} from "@cvg-his-v2/shared-validation";

function createSeedItems(): InventoryItemSummary[] {
  const createdAt = "2026-03-25T00:00:00.000Z";
  return [
    {
      id: "inv_dipyrone" as InventoryItemId,
      accountId: "acc_cvg_demo" as never,
      sku: "MED-001",
      name: "Dipirona Injetavel",
      unit: "ampola",
      onHandQuantity: 24,
      reorderLevel: 5,
      unitCostAmount: 12.5,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "inv_gauze" as InventoryItemId,
      accountId: "acc_cvg_demo" as never,
      sku: "MAT-014",
      name: "Gaze Esteril",
      unit: "pacote",
      onHandQuantity: 60,
      reorderLevel: 10,
      unitCostAmount: 4.2,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "inv_catheter" as InventoryItemId,
      accountId: "acc_cvg_demo" as never,
      sku: "MAT-021",
      name: "Cateter Intravenoso",
      unit: "unidade",
      onHandQuantity: 18,
      reorderLevel: 4,
      unitCostAmount: 8.9,
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export class InventoryService {
  readonly #encounters: EncountersService;
  readonly #items = new Map<InventoryItemId, InventoryItemSummary>();
  readonly #consumptions: InventoryConsumptionSummary[] = [];

  public constructor(
    encounters: EncountersService,
    seedItems: readonly InventoryItemSummary[] = createSeedItems(),
  ) {
    this.#encounters = encounters;
    for (const item of seedItems) {
      this.#items.set(item.id, item);
    }
  }

  public listItems(): readonly InventoryItemSummary[] {
    return Array.from(this.#items.values());
  }

  public getItemOrThrow(inventoryItemId: InventoryItemId): InventoryItemSummary {
    const item = this.#items.get(inventoryItemId);
    if (!item) {
      throw new NotFoundError("Inventory item not found", { inventoryItemId });
    }

    return item;
  }

  public consume(
    actorUserId: UserId,
    payload: CreateInventoryConsumptionRequest,
  ): InventoryConsumptionSummary {
    const encounter = this.#encounters.getOrThrow(payload.encounterId as never);
    const item = this.getItemOrThrow(payload.inventoryItemId as never);
    const quantity = requirePositiveNumber(payload.quantity, "quantity");
    if (item.onHandQuantity < quantity) {
      throw new ConflictError("Insufficient stock for assistive consumption", {
        inventoryItemId: item.id,
        onHandQuantity: item.onHandQuantity,
        requestedQuantity: quantity,
      });
    }

    const updatedItem: InventoryItemSummary = {
      ...item,
      onHandQuantity: Number((item.onHandQuantity - quantity).toFixed(2)),
      updatedAt: nowIso(),
    };
    this.#items.set(item.id, updatedItem);

    const consumption: InventoryConsumptionSummary = {
      id: createCorrelationId("cons") as InventoryConsumptionId,
      accountId: encounter.accountId,
      inventoryItemId: item.id,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      quantity,
      unit: item.unit,
      costAmount: Number((quantity * item.unitCostAmount).toFixed(2)),
      sourceEntityType: requireEnum(payload.sourceEntityType, "sourceEntityType", [
        "encounter",
        "diagnostic_order",
        "surgery_case",
        "inpatient_stay",
        "prescription",
        "other",
      ]),
      sourceEntityId: payload.sourceEntityId?.trim() || undefined,
      recordedByUserId: actorUserId,
      createdAt: nowIso(),
    };
    this.#consumptions.unshift(consumption);
    return consumption;
  }

  public listConsumptions(encounterId?: string): readonly InventoryConsumptionSummary[] {
    return this.#consumptions.filter(
      (consumption) => !encounterId || consumption.encounterId === encounterId,
    );
  }
}

export { createSeedItems };

export { DatabaseInventoryRepository, type InventoryRepository } from "./repositories/database-inventory.repository.js";
