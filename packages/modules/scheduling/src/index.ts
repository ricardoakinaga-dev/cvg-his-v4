import { OwnersService } from "@cvg-his-v2/module-owners";
import { PatientsService } from "@cvg-his-v2/module-patients";
import type {
  CheckInQueueRequest,
  CreateAppointmentRequest,
} from "@cvg-his-v2/shared-contracts";
import { NotFoundError } from "@cvg-his-v2/shared-errors";
import type {
  AccountId,
  AppointmentId,
  EncounterId,
  OwnerId,
  PatientId,
  QueueEntryId,
  QueueEntrySummary,
  SchedulingAppointmentSummary,
} from "@cvg-his-v2/shared-types";
import { createCorrelationId, nowIso } from "@cvg-his-v2/shared-utils";
import { requireNonEmptyString } from "@cvg-his-v2/shared-validation";

function createSeedAppointments(): SchedulingAppointmentSummary[] {
  const createdAt = "2026-03-25T00:00:00.000Z";
  return [
    {
      id: "appt_luna_checkup" as AppointmentId,
      accountId: "acc_cvg_demo" as AccountId,
      patientId: "patient_luna" as PatientId,
      ownerId: "owner_maria_silva" as OwnerId,
      scheduledAt: "2026-03-25T09:00:00.000Z",
      visitType: "scheduled",
      reason: "Retorno de acompanhamento",
      status: "scheduled",
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export class SchedulingService {
  readonly #owners: OwnersService;
  readonly #patients: PatientsService;
  readonly #appointments = new Map<AppointmentId, SchedulingAppointmentSummary>();
  readonly #queue = new Map<QueueEntryId, QueueEntrySummary>();

  public constructor(
    owners: OwnersService,
    patients: PatientsService,
    seedAppointments: readonly SchedulingAppointmentSummary[] = createSeedAppointments(),
  ) {
    this.#owners = owners;
    this.#patients = patients;

    for (const appointment of seedAppointments) {
      this.#appointments.set(appointment.id, appointment);
    }
  }

  public listAppointments(): readonly SchedulingAppointmentSummary[] {
    return Array.from(this.#appointments.values()).sort((a, b) =>
      a.scheduledAt.localeCompare(b.scheduledAt),
    );
  }

  public createAppointment(
    accountId: AccountId,
    payload: CreateAppointmentRequest,
  ): SchedulingAppointmentSummary {
    const patientId = requireNonEmptyString(payload.patientId, "patientId") as PatientId;
    const ownerId = requireNonEmptyString(payload.ownerId, "ownerId") as OwnerId;
    this.#patients.getOrThrow(patientId);
    this.#owners.getOrThrow(ownerId);

    const now = nowIso();
    const appointment: SchedulingAppointmentSummary = {
      id: createCorrelationId("appt") as AppointmentId,
      accountId,
      patientId,
      ownerId,
      scheduledAt: requireNonEmptyString(payload.scheduledAt, "scheduledAt"),
      visitType: payload.visitType,
      reason: requireNonEmptyString(payload.reason, "reason"),
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    };

    this.#appointments.set(appointment.id, appointment);
    return appointment;
  }

  public getQueue(): readonly QueueEntrySummary[] {
    return Array.from(this.#queue.values()).sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return a.checkedInAt.localeCompare(b.checkedInAt);
    });
  }

  public getQueueEntryOrThrow(queueEntryId: QueueEntryId): QueueEntrySummary {
    const entry = this.#queue.get(queueEntryId);
    if (!entry) {
      throw new NotFoundError("Queue entry not found", { queueEntryId });
    }

    return entry;
  }

  public checkIn(accountId: AccountId, payload: CheckInQueueRequest): QueueEntrySummary {
    const patientId = requireNonEmptyString(payload.patientId, "patientId") as PatientId;
    const ownerId = requireNonEmptyString(payload.ownerId, "ownerId") as OwnerId;
    const appointmentId =
      payload.appointmentId !== undefined
        ? (requireNonEmptyString(payload.appointmentId, "appointmentId") as AppointmentId)
        : undefined;

    this.#patients.getOrThrow(patientId);
    this.#owners.getOrThrow(ownerId);
    if (appointmentId) {
      this.getAppointmentOrThrow(appointmentId);
    }

    const now = nowIso();
    const entry: QueueEntrySummary = {
      id: createCorrelationId("queue") as QueueEntryId,
      accountId,
      patientId,
      ownerId,
      appointmentId,
      reason: requireNonEmptyString(payload.reason, "reason"),
      priority: payload.priority ?? "medium",
      status: "waiting",
      checkedInAt: now,
      createdAt: now,
      updatedAt: now,
    };

    if (appointmentId) {
      const appointment = this.getAppointmentOrThrow(appointmentId);
      this.#appointments.set(appointment.id, {
        ...appointment,
        status: "checked_in",
        updatedAt: now,
      });
    }

    this.#queue.set(entry.id, entry);
    return entry;
  }

  public callQueueEntry(queueEntryId: QueueEntryId): QueueEntrySummary {
    const current = this.getQueueEntryOrThrow(queueEntryId);
    const now = nowIso();
    const updated: QueueEntrySummary = {
      ...current,
      status: "called",
      calledAt: now,
      updatedAt: now,
    };
    this.#queue.set(queueEntryId, updated);
    return updated;
  }

  public attachEncounter(
    queueEntryId: QueueEntryId,
    encounterId: EncounterId,
  ): QueueEntrySummary {
    const current = this.getQueueEntryOrThrow(queueEntryId);
    const updated: QueueEntrySummary = {
      ...current,
      encounterId,
      status: "in_triage",
      updatedAt: nowIso(),
    };
    this.#queue.set(queueEntryId, updated);
    return updated;
  }

  public transitionQueueForEncounter(
    queueEntryId: QueueEntryId,
    nextStatus: QueueEntrySummary["status"],
  ): QueueEntrySummary {
    const current = this.getQueueEntryOrThrow(queueEntryId);
    const updated: QueueEntrySummary = {
      ...current,
      status: nextStatus,
      updatedAt: nowIso(),
    };
    this.#queue.set(queueEntryId, updated);
    return updated;
  }

  public completeQueueEntry(queueEntryId: QueueEntryId): QueueEntrySummary {
    return this.transitionQueueForEncounter(queueEntryId, "completed");
  }

  public getAppointmentOrThrow(appointmentId: AppointmentId): SchedulingAppointmentSummary {
    const appointment = this.#appointments.get(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Appointment not found", { appointmentId });
    }

    return appointment;
  }
}

export { createSeedAppointments };
