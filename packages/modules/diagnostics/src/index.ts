import { EncountersService } from "@cvg-his-v2/module-encounters";
import type {
  CreateDiagnosticOrderRequest,
  RecordDiagnosticResultRequest,
} from "@cvg-his-v2/shared-contracts";
import { NotFoundError } from "@cvg-his-v2/shared-errors";
import type { DiagnosticOrderId, DiagnosticOrderSummary } from "@cvg-his-v2/shared-types";
import { createCorrelationId, nowIso } from "@cvg-his-v2/shared-utils";
import { requireNonEmptyString } from "@cvg-his-v2/shared-validation";

export class DiagnosticsService {
  readonly #encounters: EncountersService;
  readonly #orders = new Map<DiagnosticOrderId, DiagnosticOrderSummary>();

  public constructor(encounters: EncountersService) {
    this.#encounters = encounters;
  }

  public createOrder(payload: CreateDiagnosticOrderRequest): DiagnosticOrderSummary {
    const encounter = this.#encounters.getOrThrow(payload.encounterId as never);
    const now = nowIso();
    const order: DiagnosticOrderSummary = {
      id: createCorrelationId("diag") as DiagnosticOrderId,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      examType: requireNonEmptyString(payload.examType, "examType"),
      reason: requireNonEmptyString(payload.reason, "reason"),
      status: "requested",
      createdAt: now,
      updatedAt: now,
    };
    this.#orders.set(order.id, order);
    return order;
  }

  public list(encounterId?: string): readonly DiagnosticOrderSummary[] {
    return Array.from(this.#orders.values()).filter(
      (order) => !encounterId || order.encounterId === encounterId,
    );
  }

  public getOrThrow(orderId: DiagnosticOrderId): DiagnosticOrderSummary {
    const order = this.#orders.get(orderId);
    if (!order) {
      throw new NotFoundError("Diagnostic order not found", { orderId });
    }

    return order;
  }

  public recordResult(
    orderId: DiagnosticOrderId,
    payload: RecordDiagnosticResultRequest,
  ): DiagnosticOrderSummary {
    const current = this.getOrThrow(orderId);
    const updated: DiagnosticOrderSummary = {
      ...current,
      status: payload.status,
      resultSummary: requireNonEmptyString(payload.resultSummary, "resultSummary"),
      updatedAt: nowIso(),
    };
    this.#orders.set(orderId, updated);
    return updated;
  }
}
