import { EncountersService } from "@cvg-his-v2/module-encounters";
import type { CreateTriageRequest } from "@cvg-his-v2/shared-contracts";
import { ConflictError } from "@cvg-his-v2/shared-errors";
import type {
  EncounterId,
  TriageRecordId,
  TriageSummary,
  UserId,
} from "@cvg-his-v2/shared-types";
import { createCorrelationId, nowIso } from "@cvg-his-v2/shared-utils";
import { requireNonEmptyString, requireStringArray } from "@cvg-his-v2/shared-validation";

export class TriageService {
  readonly #encounters: EncountersService;
  readonly #records = new Map<TriageRecordId, TriageSummary>();

  public constructor(encounters: EncountersService) {
    this.#encounters = encounters;
  }

  public list(encounterId?: EncounterId): readonly TriageSummary[] {
    return Array.from(this.#records.values()).filter(
      (record) => !encounterId || record.encounterId === encounterId,
    );
  }

  public createTriage(
    actorUserId: UserId,
    payload: CreateTriageRequest,
  ): TriageSummary {
    const encounterId = requireNonEmptyString(payload.encounterId, "encounterId") as EncounterId;
    const encounter = this.#encounters.getOrThrow(encounterId);
    const existing = this.list(encounterId)[0];
    if (existing) {
      throw new ConflictError("Encounter already has an initial triage", {
        triageId: existing.id,
      });
    }

    const now = nowIso();
    const record: TriageSummary = {
      id: createCorrelationId("triage") as TriageRecordId,
      accountId: encounter.accountId,
      encounterId,
      patientId: encounter.patientId,
      priority: payload.priority,
      chiefComplaint: requireNonEmptyString(payload.chiefComplaint, "chiefComplaint"),
      initialNotes: payload.initialNotes?.trim() || undefined,
      alerts: requireStringArray(payload.alerts, "alerts"),
      destination: payload.destination,
      triagedByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    };

    this.#records.set(record.id, record);
    return record;
  }
}
