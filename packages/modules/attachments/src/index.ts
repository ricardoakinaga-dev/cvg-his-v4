import { EncountersService } from "@cvg-his-v2/module-encounters";
import { DiagnosticsService } from "@cvg-his-v2/module-diagnostics";
import { MedicalRecordsService } from "@cvg-his-v2/module-medical-records";
import type { CreateAttachmentRequest } from "@cvg-his-v2/shared-contracts";
import { NotFoundError } from "@cvg-his-v2/shared-errors";
import type { AttachmentId, AttachmentSummary, UserId } from "@cvg-his-v2/shared-types";
import { createCorrelationId, nowIso } from "@cvg-his-v2/shared-utils";
import { requireNonEmptyString } from "@cvg-his-v2/shared-validation";

export class AttachmentsService {
  readonly #encounters: EncountersService;
  readonly #diagnostics: DiagnosticsService;
  readonly #medicalRecords: MedicalRecordsService;
  readonly #attachments: AttachmentSummary[] = [];

  public constructor(
    encounters: EncountersService,
    medicalRecords: MedicalRecordsService,
    diagnostics: DiagnosticsService,
  ) {
    this.#encounters = encounters;
    this.#medicalRecords = medicalRecords;
    this.#diagnostics = diagnostics;
  }

  public upload(
    actorUserId: UserId,
    payload: CreateAttachmentRequest,
  ): AttachmentSummary {
    const linkedEntityId = requireNonEmptyString(
      payload.linkedEntityId,
      "linkedEntityId",
    );

    if (payload.linkedEntityType === "encounter") {
      this.#encounters.getOrThrow(linkedEntityId as never);
    } else if (payload.linkedEntityType === "medical_record") {
      this.#medicalRecords.getRecordOrThrow(linkedEntityId as never);
    } else if (payload.linkedEntityType === "diagnostic_order") {
      this.#diagnostics.getOrThrow(linkedEntityId as never);
    } else {
      throw new NotFoundError("Invalid attachment link target", {
        linkedEntityType: payload.linkedEntityType,
      });
    }

    const attachment: AttachmentSummary = {
      id: createCorrelationId("att") as AttachmentId,
      accountId:
        payload.linkedEntityType === "encounter"
          ? this.#encounters.getOrThrow(linkedEntityId as never).accountId
          : payload.linkedEntityType === "medical_record"
            ? this.#medicalRecords.getRecordOrThrow(linkedEntityId as never).accountId
            : this.#diagnostics.getOrThrow(linkedEntityId as never).accountId,
      linkedEntityType: payload.linkedEntityType,
      linkedEntityId,
      category: payload.category,
      fileName: requireNonEmptyString(payload.fileName, "fileName"),
      storageKey: `phase-7/${linkedEntityId}/${payload.fileName}`,
      mimeType: requireNonEmptyString(payload.mimeType, "mimeType"),
      checksum: requireNonEmptyString(payload.checksum, "checksum"),
      source: "upload",
      uploadedByUserId: actorUserId,
      createdAt: nowIso(),
    };

    this.#attachments.unshift(attachment);
    return attachment;
  }

  public listByLinkedEntity(
    linkedEntityType: "encounter" | "medical_record" | "diagnostic_order",
    linkedEntityId: string,
  ): readonly AttachmentSummary[] {
    return this.#attachments.filter(
      (attachment) =>
        attachment.linkedEntityType === linkedEntityType &&
        attachment.linkedEntityId === linkedEntityId,
    );
  }
}
