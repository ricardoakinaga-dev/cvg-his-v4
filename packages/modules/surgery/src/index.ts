import { EncountersService } from "@cvg-his-v2/module-encounters";
import type {
  CreateSurgeryCaseRequest,
  UpdateSurgeryStatusRequest,
} from "@cvg-his-v2/shared-contracts";
import { NotFoundError } from "@cvg-his-v2/shared-errors";
import type { SurgeryCaseId, SurgeryCaseSummary } from "@cvg-his-v2/shared-types";
import { createCorrelationId, nowIso } from "@cvg-his-v2/shared-utils";
import { requireNonEmptyString } from "@cvg-his-v2/shared-validation";

export class SurgeryService {
  readonly #encounters: EncountersService;
  readonly #cases = new Map<SurgeryCaseId, SurgeryCaseSummary>();

  public constructor(encounters: EncountersService) {
    this.#encounters = encounters;
  }

  public requestCase(payload: CreateSurgeryCaseRequest): SurgeryCaseSummary {
    const encounter = this.#encounters.getOrThrow(payload.encounterId as never);
    const now = nowIso();
    const surgeryCase: SurgeryCaseSummary = {
      id: createCorrelationId("surg") as SurgeryCaseId,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      procedureName: requireNonEmptyString(payload.procedureName, "procedureName"),
      status: "requested",
      preparationNotes: payload.preparationNotes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    this.#cases.set(surgeryCase.id, surgeryCase);
    return surgeryCase;
  }

  public list(encounterId?: string): readonly SurgeryCaseSummary[] {
    return Array.from(this.#cases.values()).filter(
      (caseItem) => !encounterId || caseItem.encounterId === encounterId,
    );
  }

  public getOrThrow(caseId: SurgeryCaseId): SurgeryCaseSummary {
    const caseItem = this.#cases.get(caseId);
    if (!caseItem) {
      throw new NotFoundError("Surgery case not found", { caseId });
    }

    return caseItem;
  }

  public updateStatus(
    caseId: SurgeryCaseId,
    payload: UpdateSurgeryStatusRequest,
  ): SurgeryCaseSummary {
    const current = this.getOrThrow(caseId);
    const updated: SurgeryCaseSummary = {
      ...current,
      status: payload.status,
      operativeNotes: payload.operativeNotes?.trim() || current.operativeNotes,
      updatedAt: nowIso(),
    };
    this.#cases.set(caseId, updated);
    return updated;
  }
}
