import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type { CheckInQueueRequest, CreateAppointmentRequest } from '@cvg-his-v2/shared-contracts';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  AppointmentId,
  EncounterId,
  OwnerId,
  PatientId,
  QueueEntryId,
  QueueEntrySummary,
  SchedulingAppointmentSummary
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

const CANCELLABLE_APPOINTMENT_STATUSES: readonly SchedulingAppointmentSummary['status'][] = [
  'scheduled',
  'checked_in'
];

const QUEUE_TRANSITIONS: Record<
  QueueEntrySummary['status'],
  readonly QueueEntrySummary['status'][]
> = {
  waiting: ['called', 'cancelled'],
  called: ['in_triage', 'cancelled'],
  in_triage: ['in_care', 'observation', 'cancelled'],
  in_care: ['observation', 'completed', 'cancelled'],
  observation: ['in_care', 'completed', 'cancelled'],
  completed: [],
  cancelled: []
};

function createSeedAppointments(): SchedulingAppointmentSummary[] {
  const createdAt = '2026-03-25T00:00:00.000Z';
  return [
    {
      id: 'appt_luna_checkup' as AppointmentId,
      accountId: 'acc_cvg_demo' as AccountId,
      patientId: 'patient_luna' as PatientId,
      ownerId: 'owner_maria_silva' as OwnerId,
      scheduledAt: '2026-03-25T09:00:00.000Z',
      visitType: 'scheduled',
      reason: 'Retorno de acompanhamento',
      status: 'scheduled',
      createdAt,
      updatedAt: createdAt
    }
  ];
}

import type { SchedulingRepository } from './repositories/database-scheduling.repository.js';

export interface SchedulingServiceOptions {
  readonly repository?: SchedulingRepository;
  readonly onAppointmentCreated?: (appointment: SchedulingAppointmentSummary) => Promise<void>;
  readonly onAppointmentStatusChanged?: (
    appointment: SchedulingAppointmentSummary,
    previousStatus: SchedulingAppointmentSummary['status']
  ) => Promise<void>;
}

export class SchedulingService {
  readonly #repository?: SchedulingRepository;
  readonly #owners: OwnersService;
  readonly #patients: PatientsService;
  readonly #appointments = new Map<AppointmentId, SchedulingAppointmentSummary>();
  readonly #queue = new Map<QueueEntryId, QueueEntrySummary>();
  readonly #onAppointmentCreated?: (appointment: SchedulingAppointmentSummary) => Promise<void>;
  readonly #onAppointmentStatusChanged?: (
    appointment: SchedulingAppointmentSummary,
    previousStatus: SchedulingAppointmentSummary['status']
  ) => Promise<void>;

  public constructor(
    owners: OwnersService,
    patients: PatientsService,
    seedAppointments: readonly SchedulingAppointmentSummary[] = createSeedAppointments(),
    options?: SchedulingServiceOptions
  ) {
    this.#repository = options?.repository;
    this.#owners = owners;
    this.#patients = patients;
    this.#onAppointmentCreated = options?.onAppointmentCreated;
    this.#onAppointmentStatusChanged = options?.onAppointmentStatusChanged;

    for (const appointment of seedAppointments) {
      this.#appointments.set(appointment.id, appointment);
    }
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId?: AccountId): Promise<void> {
    if (!this.#repository) return;
    const appointments = await this.#repository.findAllAppointments(accountId);
    for (const apt of appointments) {
      this.#appointments.set(apt.id, apt);
    }
    const queueEntries = await this.#repository.findAllQueueEntries(accountId);
    for (const entry of queueEntries) {
      this.#queue.set(entry.id, entry);
    }
  }

  public listAppointments(accountId?: AccountId): readonly SchedulingAppointmentSummary[] {
    return Array.from(this.#appointments.values())
      .filter((appointment) => !accountId || appointment.accountId === accountId)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  public async createAppointment(
    accountId: AccountId,
    payload: CreateAppointmentRequest
  ): Promise<SchedulingAppointmentSummary> {
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    const ownerId = requireNonEmptyString(payload.ownerId, 'ownerId') as OwnerId;
    this.#patients.getOrThrow(patientId);
    this.#owners.getOrThrow(ownerId);

    const scheduledAt = requireNonEmptyString(payload.scheduledAt, 'scheduledAt');
    const conflictWindowMs = 30 * 60 * 1000;
    const requestedTime = new Date(scheduledAt).getTime();

    const conflictingAppointment = this.listAppointments(accountId).find((appointment) => {
      if (appointment.patientId !== patientId) return false;
      if (appointment.status === 'cancelled' || appointment.status === 'completed') return false;
      const existingTime = new Date(appointment.scheduledAt).getTime();
      return Math.abs(existingTime - requestedTime) < conflictWindowMs;
    });
    if (conflictingAppointment) {
      throw new ConflictError('Patient already has an appointment within a 30-minute window', {
        appointmentId: conflictingAppointment.id,
        scheduledAt,
        conflictingAt: conflictingAppointment.scheduledAt
      });
    }

    const now = nowIso();
    const appointment: SchedulingAppointmentSummary = {
      id: createCorrelationId('appt') as AppointmentId,
      accountId,
      patientId,
      ownerId,
      scheduledAt,
      visitType: payload.visitType,
      reason: requireNonEmptyString(payload.reason, 'reason'),
      status: 'scheduled',
      createdAt: now,
      updatedAt: now
    };

    this.#appointments.set(appointment.id, appointment);

    if (this.#repository) {
      await this.#repository.createAppointment(appointment);
    }

    void this.#onAppointmentCreated?.(appointment);

    return appointment;
  }

  public getQueue(accountId?: AccountId): readonly QueueEntrySummary[] {
    return Array.from(this.#queue.values())
      .filter((entry) => !accountId || entry.accountId === accountId)
      .sort((a, b) => {
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
      throw new NotFoundError('Queue entry not found', { queueEntryId });
    }

    return entry;
  }

  public async checkIn(
    accountId: AccountId,
    payload: CheckInQueueRequest
  ): Promise<QueueEntrySummary> {
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    const ownerId = requireNonEmptyString(payload.ownerId, 'ownerId') as OwnerId;
    const appointmentId =
      payload.appointmentId !== undefined
        ? (requireNonEmptyString(payload.appointmentId, 'appointmentId') as AppointmentId)
        : undefined;

    this.#patients.getOrThrow(patientId);
    this.#owners.getOrThrow(ownerId);
    if (appointmentId) {
      this.getAppointmentOrThrow(appointmentId);
    }

    const now = nowIso();
    const entry: QueueEntrySummary = {
      id: createCorrelationId('queue') as QueueEntryId,
      accountId,
      patientId,
      ownerId,
      appointmentId,
      reason: requireNonEmptyString(payload.reason, 'reason'),
      priority: payload.priority ?? 'medium',
      status: 'waiting',
      checkedInAt: now,
      createdAt: now,
      updatedAt: now
    };

    if (appointmentId) {
      const appointment = this.getAppointmentOrThrow(appointmentId);
      const previousStatus = appointment.status;
      const updatedAppointment = {
        ...appointment,
        status: 'checked_in' as const,
        updatedAt: now
      };
      this.#appointments.set(appointment.id, updatedAppointment);
      if (this.#repository) {
        await this.#repository.updateAppointment(updatedAppointment);
      }
      void this.#onAppointmentStatusChanged?.(updatedAppointment, previousStatus);
    }

    this.#queue.set(entry.id, entry);
    if (this.#repository) {
      await this.#repository.createQueueEntry(entry);
    }
    return entry;
  }

  public async callQueueEntry(queueEntryId: QueueEntryId): Promise<QueueEntrySummary> {
    const current = this.getQueueEntryOrThrow(queueEntryId);
    const allowedNext = QUEUE_TRANSITIONS[current.status];
    if (!allowedNext.includes('called')) {
      throw new ValidationError('Queue entry cannot be called from its current status', {
        from: current.status,
        allowed: allowedNext
      });
    }
    const now = nowIso();
    const updated: QueueEntrySummary = {
      ...current,
      status: 'called',
      calledAt: now,
      updatedAt: now
    };
    this.#queue.set(queueEntryId, updated);
    if (this.#repository) {
      await this.#repository.updateQueueEntry(updated);
    }
    return updated;
  }

  public async attachEncounter(
    queueEntryId: QueueEntryId,
    encounterId: EncounterId
  ): Promise<QueueEntrySummary> {
    const current = this.getQueueEntryOrThrow(queueEntryId);
    const allowedNext = QUEUE_TRANSITIONS[current.status];
    if (!allowedNext.includes('in_triage')) {
      throw new ValidationError('Queue entry cannot attach encounter from its current status', {
        from: current.status,
        allowed: allowedNext
      });
    }
    const updated: QueueEntrySummary = {
      ...current,
      encounterId,
      status: 'in_triage',
      updatedAt: nowIso()
    };
    this.#queue.set(queueEntryId, updated);
    if (this.#repository) {
      await this.#repository.updateQueueEntry(updated);
    }
    return updated;
  }

  public async transitionQueueForEncounter(
    queueEntryId: QueueEntryId,
    nextStatus: QueueEntrySummary['status']
  ): Promise<QueueEntrySummary> {
    const current = this.getQueueEntryOrThrow(queueEntryId);
    const allowedNext = QUEUE_TRANSITIONS[current.status];
    if (!allowedNext.includes(nextStatus)) {
      throw new ValidationError('Invalid queue entry status transition', {
        from: current.status,
        to: nextStatus,
        allowed: allowedNext
      });
    }
    const updated: QueueEntrySummary = {
      ...current,
      status: nextStatus,
      updatedAt: nowIso()
    };
    this.#queue.set(queueEntryId, updated);
    if (this.#repository) {
      await this.#repository.updateQueueEntry(updated);
    }
    return updated;
  }

  public async completeQueueEntry(queueEntryId: QueueEntryId): Promise<QueueEntrySummary> {
    return this.transitionQueueEntry(queueEntryId, 'completed');
  }

  public getAppointmentOrThrow(appointmentId: AppointmentId): SchedulingAppointmentSummary {
    const appointment = this.#appointments.get(appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found', { appointmentId });
    }

    return appointment;
  }

  public async cancelAppointment(
    appointmentId: AppointmentId,
    reason?: string
  ): Promise<SchedulingAppointmentSummary> {
    const current = this.getAppointmentOrThrow(appointmentId);

    if (!CANCELLABLE_APPOINTMENT_STATUSES.includes(current.status)) {
      throw new ConflictError('Appointment cannot be cancelled in its current state', {
        appointmentId,
        currentStatus: current.status,
        allowedStatuses: CANCELLABLE_APPOINTMENT_STATUSES
      });
    }

    const now = nowIso();
    const cancelledAppointment: SchedulingAppointmentSummary = {
      ...current,
      status: 'cancelled',
      reason: reason ?? current.reason,
      updatedAt: now
    };

    this.#appointments.set(appointmentId, cancelledAppointment);

    if (this.#repository) {
      await this.#repository.updateAppointment(cancelledAppointment);
    }

    void this.#onAppointmentStatusChanged?.(cancelledAppointment, current.status);

    return cancelledAppointment;
  }

  public async transitionQueueEntry(
    queueEntryId: QueueEntryId,
    nextStatus: QueueEntrySummary['status']
  ): Promise<QueueEntrySummary> {
    const current = this.getQueueEntryOrThrow(queueEntryId);

    const allowedNext = QUEUE_TRANSITIONS[current.status];
    if (!allowedNext.includes(nextStatus)) {
      throw new ValidationError('Invalid queue entry status transition', {
        from: current.status,
        to: nextStatus,
        allowed: allowedNext
      });
    }

    const now = nowIso();
    const updated: QueueEntrySummary = {
      ...current,
      status: nextStatus,
      updatedAt: now
    };

    this.#queue.set(queueEntryId, updated);

    if (this.#repository) {
      await this.#repository.updateQueueEntry(updated);
    }

    return updated;
  }
}

export { createSeedAppointments };

export {
  DatabaseSchedulingRepository,
  type SchedulingRepository
} from './repositories/database-scheduling.repository.js';
