import { EncountersService } from "@cvg-his-v2/module-encounters";
import type {
  AddInpatientProgressRequest,
  CreateInpatientAdmissionRequest,
  UpdateInpatientStatusRequest,
} from "@cvg-his-v2/shared-contracts";
import { NotFoundError } from "@cvg-his-v2/shared-errors";
import type {
  InpatientProgressId,
  InpatientProgressSummary,
  InpatientStayId,
  InpatientStaySummary,
  UserId,
} from "@cvg-his-v2/shared-types";
import { createCorrelationId, nowIso } from "@cvg-his-v2/shared-utils";
import { requireNonEmptyString } from "@cvg-his-v2/shared-validation";

export class InpatientService {
  readonly #encounters: EncountersService;
  readonly #stays = new Map<InpatientStayId, InpatientStaySummary>();
  readonly #progress = new Map<InpatientStayId, InpatientProgressSummary[]>();

  public constructor(encounters: EncountersService) {
    this.#encounters = encounters;
  }

  public admit(
    payload: CreateInpatientAdmissionRequest,
  ): InpatientStaySummary {
    const encounter = this.#encounters.getOrThrow(payload.encounterId as never);
    const now = nowIso();
    const stay: InpatientStaySummary = {
      id: createCorrelationId("stay") as InpatientStayId,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      unit: requireNonEmptyString(payload.unit, "unit"),
      ward: requireNonEmptyString(payload.ward, "ward"),
      bed: requireNonEmptyString(payload.bed, "bed"),
      status: "admitted",
      admittedAt: now,
      updatedAt: now,
    };
    this.#stays.set(stay.id, stay);
    this.#progress.set(stay.id, []);
    return stay;
  }

  public list(encounterId?: string): readonly InpatientStaySummary[] {
    return Array.from(this.#stays.values()).filter(
      (stay) => !encounterId || stay.encounterId === encounterId,
    );
  }

  public getOrThrow(stayId: InpatientStayId): InpatientStaySummary {
    const stay = this.#stays.get(stayId);
    if (!stay) {
      throw new NotFoundError("Inpatient stay not found", { stayId });
    }

    return stay;
  }

  public addProgress(
    actorUserId: UserId,
    payload: AddInpatientProgressRequest,
  ): InpatientProgressSummary {
    const stay = this.getOrThrow(payload.stayId as never);
    const progress: InpatientProgressSummary = {
      id: createCorrelationId("stayprog") as InpatientProgressId,
      accountId: stay.accountId,
      stayId: stay.id,
      encounterId: stay.encounterId,
      note: requireNonEmptyString(payload.note, "note"),
      authoredByUserId: actorUserId,
      createdAt: nowIso(),
    };
    const current = this.#progress.get(stay.id) ?? [];
    current.unshift(progress);
    this.#progress.set(stay.id, current);
    return progress;
  }

  public listProgress(stayId: InpatientStayId): readonly InpatientProgressSummary[] {
    this.getOrThrow(stayId);
    return [...(this.#progress.get(stayId) ?? [])];
  }

  public updateStatus(
    stayId: InpatientStayId,
    payload: UpdateInpatientStatusRequest,
  ): InpatientStaySummary {
    const stay = this.getOrThrow(stayId);
    const updated: InpatientStaySummary = {
      ...stay,
      status: payload.status,
      updatedAt: nowIso(),
    };
    this.#stays.set(stayId, updated);
    return updated;
  }
}
