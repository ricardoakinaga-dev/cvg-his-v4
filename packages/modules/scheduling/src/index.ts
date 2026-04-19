import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  CreateAppointmentRequest,
  SchedulingAvailabilityResponse,
  SchedulingCockpitAppointmentSummary,
  SchedulingOverviewResponse,
  SchedulingProfessionalSummary,
  SchedulingViewMode
} from '@cvg-his-v2/shared-contracts';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  AppointmentId,
  EncounterId,
  OwnerId,
  PatientId,
  QueueEntryId,
  QueueEntrySummary,
  SchedulingAppointmentSummary,
  SchedulingAppointmentOperationalSummary,
  SchedulingConflictSummary,
  SchedulingOperationalBlockSummary,
  StaffId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import type { SchedulingRepository } from './repositories/database-scheduling.repository.js';

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

const DEFAULT_APPOINTMENT_DURATION: Record<SchedulingAppointmentSummary['visitType'], number> = {
  scheduled: 30,
  return: 20,
  walk_in: 45
};

const SCHEDULING_WINDOW_START_HOUR = 7;
const SCHEDULING_WINDOW_END_HOUR = 19;
const LUNCH_BREAK_START_HOUR = 12;
const LUNCH_BREAK_END_HOUR = 13;

type SchedulingStaffMember = {
  id: StaffId;
  accountId: AccountId;
  fullName: string;
  department: string;
  jobTitle: string;
  status: 'active' | 'inactive';
};

export interface SchedulingStaffLookup {
  list(accountId?: AccountId): readonly SchedulingStaffMember[];
  getOrThrow(staffId: StaffId, accountId?: AccountId): SchedulingStaffMember;
}

export interface SchedulingServiceCatalog {
  getOrThrow(id: string): {
    id: string;
    name: string;
  };
}

export interface SchedulingServiceOptions {
  readonly repository?: SchedulingRepository;
  readonly staff?: SchedulingStaffLookup;
  readonly services?: SchedulingServiceCatalog;
  readonly onAppointmentCreated?: (appointment: SchedulingAppointmentSummary) => Promise<void>;
  readonly onAppointmentStatusChanged?: (
    appointment: SchedulingAppointmentSummary,
    previousStatus: SchedulingAppointmentSummary['status']
  ) => Promise<void>;
}

export interface SchedulingAppointmentFilters {
  readonly startAt?: string;
  readonly endAt?: string;
  readonly statuses?: readonly SchedulingAppointmentSummary['status'][];
  readonly practitionerStaffId?: string | 'unassigned';
  readonly serviceId?: string;
  readonly specialty?: string;
  readonly unit?: string;
  readonly search?: string;
}

export interface SchedulingAvailabilityQuery {
  readonly scheduledAt: string;
  readonly durationMinutes?: number;
  readonly patientId: string;
  readonly practitionerStaffId?: string;
  readonly resourceLabel?: string;
  readonly ignoreAppointmentId?: string;
}

export interface SchedulingOverviewFilters extends SchedulingAppointmentFilters {
  readonly viewMode?: SchedulingViewMode;
  readonly referenceDate?: string;
}

function createSeedAppointments(): SchedulingAppointmentSummary[] {
  const createdAt = '2026-03-25T00:00:00.000Z';
  return [
    {
      id: 'appt_luna_checkup' as AppointmentId,
      accountId: 'acc_cvg_demo' as AccountId,
      patientId: 'patient_luna' as PatientId,
      ownerId: 'owner_maria_silva' as OwnerId,
      scheduledAt: '2026-03-25T09:00:00.000Z',
      durationMinutes: 30,
      practitionerStaffId: 'staff_vet' as StaffId,
      unit: 'Clinica',
      specialty: 'Clinico geral',
      resourceLabel: 'Consultorio 1',
      visitType: 'scheduled',
      reason: 'Retorno de acompanhamento',
      status: 'scheduled',
      createdAt,
      updatedAt: createdAt
    }
  ];
}

function parseDate(input: string, fieldName: string): Date {
  const value = new Date(requireNonEmptyString(input, fieldName));
  if (Number.isNaN(value.getTime())) {
    throw new ValidationError(`Field '${fieldName}' must be a valid ISO date`);
  }
  return value;
}

function startOfUtcDay(input: Date): Date {
  const date = new Date(input);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function addUtcDays(input: Date, days: number): Date {
  const date = new Date(input);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function setUtcTime(input: Date, hour: number, minute = 0): Date {
  const date = new Date(input);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function defaultDurationMinutes(
  visitType: SchedulingAppointmentSummary['visitType'],
  requestedDuration?: number
): number {
  const duration = requestedDuration ?? DEFAULT_APPOINTMENT_DURATION[visitType];
  if (!Number.isFinite(duration) || duration <= 0 || duration > 8 * 60) {
    throw new ValidationError('Appointment duration must be between 1 and 480 minutes', {
      duration
    });
  }
  return Math.round(duration);
}

function getAppointmentEnd(appointment: SchedulingAppointmentSummary): Date {
  const start = parseDate(appointment.scheduledAt, 'scheduledAt');
  start.setUTCMinutes(start.getUTCMinutes() + defaultDurationMinutes(appointment.visitType, appointment.durationMinutes));
  return start;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

function uniqueStrings(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))]
    .map((value) => value.trim())
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function serializeSlot(startsAt: Date, durationMinutes: number): { startsAt: string; endsAt: string } {
  const endsAt = new Date(startsAt);
  endsAt.setUTCMinutes(endsAt.getUTCMinutes() + durationMinutes);
  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString()
  };
}

function inferSpecialty(
  current: SchedulingAppointmentSummary,
  professional?: SchedulingProfessionalSummary
): string | undefined {
  if (current.specialty?.trim()) {
    return current.specialty.trim();
  }

  if (!professional) {
    return undefined;
  }

  const jobTitle = professional.jobTitle.toLowerCase();
  if (jobTitle.includes('veterin')) return 'Clinico geral';
  if (jobTitle.includes('enferm')) return 'Triagem';
  return professional.department || undefined;
}

function appointmentOperationalLabel(
  stage: SchedulingAppointmentOperationalSummary['stage']
): string {
  return {
    scheduled: 'Agendado',
    checked_in: 'Check-in',
    called: 'Chamado',
    in_triage: 'Em triagem',
    in_care: 'Em atendimento',
    observation: 'Em observação',
    completed: 'Concluído',
    cancelled: 'Cancelado'
  }[stage];
}

export class SchedulingService {
  readonly #repository?: SchedulingRepository;
  readonly #owners: OwnersService;
  readonly #patients: PatientsService;
  readonly #staff?: SchedulingStaffLookup;
  readonly #services?: SchedulingServiceCatalog;
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
    this.#staff = options?.staff;
    this.#services = options?.services;
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

  public listAppointments(
    accountId?: AccountId,
    filters?: SchedulingAppointmentFilters
  ): readonly SchedulingAppointmentSummary[] {
    const startAt = filters?.startAt ? parseDate(filters.startAt, 'startAt') : undefined;
    const endAt = filters?.endAt ? parseDate(filters.endAt, 'endAt') : undefined;
    const search = filters?.search?.trim().toLowerCase();

    return Array.from(this.#appointments.values())
      .filter((appointment) => !accountId || appointment.accountId === accountId)
      .filter((appointment) => {
        if (!startAt && !endAt) return true;
        const appointmentStart = parseDate(appointment.scheduledAt, 'scheduledAt');
        const appointmentEnd = getAppointmentEnd(appointment);
        if (startAt && appointmentEnd <= startAt) return false;
        if (endAt && appointmentStart >= endAt) return false;
        return true;
      })
      .filter((appointment) =>
        filters?.statuses?.length ? filters.statuses.includes(appointment.status) : true
      )
      .filter((appointment) => {
        if (!filters?.practitionerStaffId) return true;
        if (filters.practitionerStaffId === 'unassigned') {
          return !appointment.practitionerStaffId;
        }
        return appointment.practitionerStaffId === filters.practitionerStaffId;
      })
      .filter((appointment) => (filters?.serviceId ? appointment.serviceId === filters.serviceId : true))
      .filter((appointment) =>
        filters?.specialty ? appointment.specialty === filters.specialty : true
      )
      .filter((appointment) => (filters?.unit ? appointment.unit === filters.unit : true))
      .filter((appointment) => {
        if (!search) return true;
        const patient = this.#patients.getOrThrow(appointment.patientId);
        const owner = this.#owners.getOrThrow(appointment.ownerId);
        const practitionerName =
          appointment.practitionerStaffId && this.#staff
            ? this.#staff.getOrThrow(appointment.practitionerStaffId, appointment.accountId)
                .fullName
            : '';
        const serviceName =
          appointment.serviceId && this.#services
            ? this.#services.getOrThrow(appointment.serviceId).name
            : '';
        return [
          appointment.reason,
          appointment.specialty,
          appointment.unit,
          appointment.resourceLabel,
          patient.name,
          owner.fullName,
          practitionerName,
          serviceName
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  public getSchedulingProfessionals(accountId: AccountId): SchedulingProfessionalSummary[] {
    const members = this.#staff?.list(accountId) ?? [];
    return members
      .filter((member) => member.status === 'active')
      .filter((member: SchedulingStaffMember) => {
        const text = `${member.department} ${member.jobTitle}`.toLowerCase();
        return (
          text.includes('clin') ||
          text.includes('triag') ||
          text.includes('veterin') ||
          text.includes('enferm')
        );
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'))
      .map((member) => ({
        id: member.id,
        fullName: member.fullName,
        department: member.department,
        jobTitle: member.jobTitle,
        specialty: member.jobTitle.includes('Veterin') ? 'Clinico geral' : member.department,
        unit: member.department,
        status: member.status
      }));
  }

  public listOperationalBlocks(
    accountId: AccountId,
    startAt: string,
    endAt: string,
    practitionerStaffId?: string | 'unassigned'
  ): SchedulingOperationalBlockSummary[] {
    const professionals = this.getSchedulingProfessionals(accountId).filter((professional) => {
      if (!practitionerStaffId || practitionerStaffId === 'unassigned') {
        return true;
      }
      return professional.id === practitionerStaffId;
    });

    const blocks: SchedulingOperationalBlockSummary[] = [];
    let cursor = startOfUtcDay(parseDate(startAt, 'startAt'));
    const limit = parseDate(endAt, 'endAt');

    while (cursor < limit) {
      for (const professional of professionals) {
        const lunchStart = setUtcTime(cursor, LUNCH_BREAK_START_HOUR);
        const lunchEnd = setUtcTime(cursor, LUNCH_BREAK_END_HOUR);
        blocks.push({
          id: `block-${professional.id}-${lunchStart.toISOString()}`,
          accountId,
          title: 'Intervalo operacional',
          kind: 'lunch_break',
          startsAt: lunchStart.toISOString(),
          endsAt: lunchEnd.toISOString(),
          practitionerStaffId: professional.id as StaffId,
          unit: professional.unit,
          resourceLabel: undefined
        });
      }

      cursor = addUtcDays(cursor, 1);
    }

    return blocks.filter((block) =>
      overlaps(
        parseDate(block.startsAt, 'block.startsAt'),
        parseDate(block.endsAt, 'block.endsAt'),
        parseDate(startAt, 'startAt'),
        parseDate(endAt, 'endAt')
      )
    );
  }

  public getSchedulingOverview(
    accountId: AccountId,
    filters: SchedulingOverviewFilters = {}
  ): SchedulingOverviewResponse {
    const viewMode = filters.viewMode ?? 'day';
    const referenceDate = filters.referenceDate ? parseDate(filters.referenceDate, 'referenceDate') : new Date();
    const windowStart = startOfUtcDay(referenceDate);
    const windowEnd = addUtcDays(windowStart, viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 31);
    const professionals = this.getSchedulingProfessionals(accountId);
    const blocks = this.listOperationalBlocks(
      accountId,
      windowStart.toISOString(),
      windowEnd.toISOString(),
      filters.practitionerStaffId
    );
    const items = this.listAppointments(accountId, {
      ...filters,
      startAt: windowStart.toISOString(),
      endAt: windowEnd.toISOString()
    }).map((appointment) => {
      const professional = professionals.find((candidate) => candidate.id === appointment.practitionerStaffId);
      const slot = serializeSlot(
        parseDate(appointment.scheduledAt, 'scheduledAt'),
        defaultDurationMinutes(appointment.visitType, appointment.durationMinutes)
      );

      return {
        ...appointment,
        specialty: inferSpecialty(appointment, professional),
        endsAt: slot.endsAt,
        practitionerName: professional?.fullName,
        serviceName:
          appointment.serviceId && this.#services
            ? this.#services.getOrThrow(appointment.serviceId).name
            : undefined,
        conflicts: this.collectConflicts(
          accountId,
          parseDate(appointment.scheduledAt, 'scheduledAt'),
          defaultDurationMinutes(appointment.visitType, appointment.durationMinutes),
          {
            patientId: appointment.patientId,
            practitionerStaffId: appointment.practitionerStaffId,
            resourceLabel: appointment.resourceLabel,
            ignoreAppointmentId: appointment.id
          }
        ),
        operational: this.buildAppointmentOperationalSummary(accountId, appointment)
      } satisfies SchedulingCockpitAppointmentSummary;
    });

    const conflictCount = items.filter((item) => item.conflicts.length > 0).length;
    const filterOptions = {
      units: uniqueStrings([
        ...professionals.map((professional) => professional.unit),
        ...items.map((item) => item.unit)
      ]),
      specialties: uniqueStrings([
        ...professionals.map((professional) => professional.specialty),
        ...items.map((item) => item.specialty)
      ]),
      statuses: ['scheduled', 'checked_in', 'completed', 'cancelled'] as const
    };

    return {
      viewMode,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      stats: {
        total: items.length,
        scheduled: items.filter((item) => item.status === 'scheduled').length,
        checkedIn: items.filter((item) => item.status === 'checked_in').length,
        completed: items.filter((item) => item.status === 'completed').length,
        cancelled: items.filter((item) => item.status === 'cancelled').length,
        conflicts: conflictCount,
        unassigned: items.filter((item) => !item.practitionerStaffId).length
      },
      professionals,
      blocks,
      filterOptions,
      items
    };
  }

  public getAvailability(
    accountId: AccountId,
    query: SchedulingAvailabilityQuery
  ): SchedulingAvailabilityResponse {
    const requestedAt = parseDate(query.scheduledAt, 'scheduledAt');
    const durationMinutes = defaultDurationMinutes('scheduled', query.durationMinutes);
    const conflicts = this.collectConflicts(accountId, requestedAt, durationMinutes, {
      patientId: requireNonEmptyString(query.patientId, 'patientId') as PatientId,
      practitionerStaffId: query.practitionerStaffId as StaffId | undefined,
      resourceLabel: query.resourceLabel?.trim() || undefined,
      ignoreAppointmentId: query.ignoreAppointmentId as AppointmentId | undefined
    });
    const slot = serializeSlot(requestedAt, durationMinutes);
    const blockIds = new Set(conflicts.map((conflict) => conflict.blockId).filter(Boolean));
    const blocks = this.listOperationalBlocks(accountId, slot.startsAt, slot.endsAt).filter((block) =>
      blockIds.has(block.id)
    );

    return {
      available: conflicts.length === 0,
      requestedSlot: {
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        durationMinutes
      },
      conflicts,
      blocks,
      suggestions: this.buildAvailabilitySuggestions(accountId, requestedAt, durationMinutes, {
        patientId: requireNonEmptyString(query.patientId, 'patientId') as PatientId,
        practitionerStaffId: query.practitionerStaffId as StaffId | undefined,
        resourceLabel: query.resourceLabel?.trim() || undefined,
        ignoreAppointmentId: query.ignoreAppointmentId as AppointmentId | undefined
      })
    };
  }

  public async createAppointment(
    accountId: AccountId,
    payload: CreateAppointmentRequest
  ): Promise<SchedulingAppointmentSummary> {
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    const ownerId = requireNonEmptyString(payload.ownerId, 'ownerId') as OwnerId;
    this.#patients.getOrThrow(patientId);
    this.#owners.getOrThrow(ownerId);

    const scheduledAt = parseDate(payload.scheduledAt, 'scheduledAt');
    const visitType = payload.visitType ?? 'scheduled';
    const durationMinutes = defaultDurationMinutes(visitType, payload.durationMinutes);
    const practitionerStaffId = payload.practitionerStaffId?.trim()
      ? (payload.practitionerStaffId as StaffId)
      : undefined;

    if (practitionerStaffId && this.#staff) {
      this.#staff.getOrThrow(practitionerStaffId, accountId);
    }

    if (payload.serviceId?.trim() && this.#services) {
      this.#services.getOrThrow(payload.serviceId.trim());
    }

    const conflicts = this.collectConflicts(accountId, scheduledAt, durationMinutes, {
      patientId,
      practitionerStaffId,
      resourceLabel: payload.resourceLabel?.trim() || undefined
    });
    if (conflicts.length > 0) {
      if (conflicts.every((conflict) => conflict.type === 'patient_overlap')) {
        throw new ConflictError('Patient already has an appointment within a 30-minute window', {
          conflicts
        });
      }

      throw new ConflictError('Appointment slot is unavailable for the requested schedule', {
        conflicts
      });
    }

    const now = nowIso();
    const appointment: SchedulingAppointmentSummary = {
      id: createCorrelationId('appt') as AppointmentId,
      accountId,
      patientId,
      ownerId,
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes,
      visitType,
      reason: requireNonEmptyString(payload.reason, 'reason'),
      practitionerStaffId,
      serviceId: payload.serviceId?.trim() || undefined,
      unit: payload.unit?.trim() || undefined,
      specialty: payload.specialty?.trim() || undefined,
      resourceLabel: payload.resourceLabel?.trim() || undefined,
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
    payload: {
      readonly patientId: string;
      readonly ownerId: string;
      readonly appointmentId?: string;
      readonly reason: string;
      readonly priority?: QueueEntrySummary['priority'];
    }
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
      const linkedAppointment = this.getAppointmentOrThrow(appointmentId);
      if (linkedAppointment.status === 'cancelled' || linkedAppointment.status === 'completed') {
        throw new ConflictError('Appointment cannot be checked in from its current state', {
          appointmentId,
          currentStatus: linkedAppointment.status
        });
      }

      const activeEntry = this.getQueue(accountId).find(
        (entry) =>
          entry.appointmentId === appointmentId &&
          entry.status !== 'completed' &&
          entry.status !== 'cancelled'
      );
      if (activeEntry) {
        throw new ConflictError('Appointment already has an active queue entry', {
          appointmentId,
          queueEntryId: activeEntry.id,
          queueStatus: activeEntry.status
        });
      }
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
      const updatedAppointment: SchedulingAppointmentSummary = {
        ...appointment,
        status: 'checked_in',
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
    await this.syncLinkedAppointmentForQueueEntry(updated);
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
    await this.syncLinkedAppointmentForQueueEntry(updated);
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
    await this.syncLinkedAppointmentForQueueEntry(updated);
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

    await this.syncLinkedAppointmentForQueueEntry(updated);

    return updated;
  }

  private buildAppointmentOperationalSummary(
    accountId: AccountId,
    appointment: SchedulingAppointmentSummary
  ): SchedulingAppointmentOperationalSummary {
    const linkedEntry = this.getQueue(accountId)
      .filter((entry) => entry.appointmentId === appointment.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

    if (!linkedEntry) {
      return {
        stage: appointment.status,
        label: appointmentOperationalLabel(appointment.status),
        source: 'appointment',
        updatedAt: appointment.updatedAt
      };
    }

    const stage =
      linkedEntry.status === 'waiting'
        ? 'checked_in'
        : (linkedEntry.status as SchedulingAppointmentOperationalSummary['stage']);

    return {
      stage,
      label: appointmentOperationalLabel(stage),
      source: 'queue',
      queueEntryId: linkedEntry.id,
      queueStatus: linkedEntry.status,
      encounterId: linkedEntry.encounterId,
      updatedAt: linkedEntry.updatedAt
    };
  }

  private async syncLinkedAppointmentForQueueEntry(entry: QueueEntrySummary): Promise<void> {
    if (!entry.appointmentId) {
      return;
    }

    const current = this.getAppointmentOrThrow(entry.appointmentId);
    const nextStatus =
      entry.status === 'completed'
        ? 'completed'
        : entry.status === 'cancelled'
          ? 'cancelled'
          : 'checked_in';

    if (current.status === nextStatus) {
      return;
    }

    const updated: SchedulingAppointmentSummary = {
      ...current,
      status: nextStatus,
      updatedAt: nowIso()
    };

    this.#appointments.set(updated.id, updated);

    if (this.#repository) {
      await this.#repository.updateAppointment(updated);
    }

    void this.#onAppointmentStatusChanged?.(updated, current.status);
  }

  private collectConflicts(
    accountId: AccountId,
    requestedAt: Date,
    durationMinutes: number,
    options: {
      readonly patientId: PatientId;
      readonly practitionerStaffId?: StaffId;
      readonly resourceLabel?: string;
      readonly ignoreAppointmentId?: AppointmentId;
    }
  ): SchedulingConflictSummary[] {
    const slotEnd = new Date(requestedAt);
    slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + durationMinutes);
    const conflicts: SchedulingConflictSummary[] = [];
    const windowStart = setUtcTime(requestedAt, SCHEDULING_WINDOW_START_HOUR);
    const windowEnd = setUtcTime(requestedAt, SCHEDULING_WINDOW_END_HOUR);

    if (requestedAt < windowStart || slotEnd > windowEnd) {
      conflicts.push({
        type: 'outside_hours',
        severity: 'critical',
        message: 'O slot solicitado está fora da janela operacional da agenda.',
        startsAt: requestedAt.toISOString(),
        endsAt: slotEnd.toISOString()
      });
    }

    if (options.practitionerStaffId) {
      const blocks = this.listOperationalBlocks(
        accountId,
        requestedAt.toISOString(),
        slotEnd.toISOString(),
        options.practitionerStaffId
      );
      for (const block of blocks) {
        if (
          !overlaps(
            requestedAt,
            slotEnd,
            parseDate(block.startsAt, 'block.startsAt'),
            parseDate(block.endsAt, 'block.endsAt')
          )
        ) {
          continue;
        }

        conflicts.push({
          type: 'operational_block',
          severity: 'critical',
          message: `${block.title} bloqueia o horário solicitado.`,
          startsAt: block.startsAt,
          endsAt: block.endsAt,
          blockId: block.id
        });
      }
    }

    for (const appointment of this.listAppointments(accountId)) {
      if (options.ignoreAppointmentId && appointment.id === options.ignoreAppointmentId) {
        continue;
      }

      if (appointment.status === 'cancelled' || appointment.status === 'completed') {
        continue;
      }

      const appointmentStart = parseDate(appointment.scheduledAt, 'scheduledAt');
      const appointmentEnd = getAppointmentEnd(appointment);
      if (!overlaps(requestedAt, slotEnd, appointmentStart, appointmentEnd)) {
        continue;
      }

      if (appointment.patientId === options.patientId) {
        conflicts.push({
          type: 'patient_overlap',
          severity: 'critical',
          message: 'O paciente já possui outro atendimento neste intervalo.',
          startsAt: appointment.scheduledAt,
          endsAt: appointmentEnd.toISOString(),
          appointmentId: appointment.id
        });
      }

      if (
        options.practitionerStaffId &&
        appointment.practitionerStaffId &&
        appointment.practitionerStaffId === options.practitionerStaffId
      ) {
        conflicts.push({
          type: 'staff_overlap',
          severity: 'critical',
          message: 'O profissional já está alocado em outro atendimento neste intervalo.',
          startsAt: appointment.scheduledAt,
          endsAt: appointmentEnd.toISOString(),
          appointmentId: appointment.id
        });
      }

      if (
        options.resourceLabel &&
        appointment.resourceLabel &&
        appointment.resourceLabel.toLowerCase() === options.resourceLabel.toLowerCase()
      ) {
        conflicts.push({
          type: 'resource_overlap',
          severity: 'critical',
          message: 'O recurso ou sala informado já está ocupado neste intervalo.',
          startsAt: appointment.scheduledAt,
          endsAt: appointmentEnd.toISOString(),
          appointmentId: appointment.id
        });
      }
    }

    return conflicts;
  }

  private buildAvailabilitySuggestions(
    accountId: AccountId,
    requestedAt: Date,
    durationMinutes: number,
    options: {
      readonly patientId: PatientId;
      readonly practitionerStaffId?: StaffId;
      readonly resourceLabel?: string;
      readonly ignoreAppointmentId?: AppointmentId;
    }
  ): SchedulingAvailabilityResponse['suggestions'] {
    const suggestions: Array<SchedulingAvailabilityResponse['suggestions'][number]> = [];
    const windowStart = setUtcTime(requestedAt, SCHEDULING_WINDOW_START_HOUR);
    const firstCandidate = requestedAt < windowStart ? windowStart : requestedAt;
    let cursor = new Date(firstCandidate);
    const windowEnd = setUtcTime(requestedAt, SCHEDULING_WINDOW_END_HOUR);

    while (cursor < windowEnd && suggestions.length < 6) {
      const slot = serializeSlot(cursor, durationMinutes);
      const conflicts = this.collectConflicts(accountId, cursor, durationMinutes, options);
      suggestions.push({
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        available: conflicts.length === 0,
        reason:
          conflicts.length === 0 ? 'Slot disponível' : conflicts[0]?.message ?? 'Slot indisponível'
      });
      cursor = new Date(cursor);
      cursor.setUTCMinutes(cursor.getUTCMinutes() + 30);
    }

    return suggestions;
  }
}

export { createSeedAppointments };

export {
  DatabaseSchedulingRepository,
  type SchedulingRepository
} from './repositories/database-scheduling.repository.js';
