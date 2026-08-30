import { randomUUID } from 'node:crypto';

import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
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
  OwnerSummary,
  PatientId,
  PatientSummary,
  QueueEntryId,
  QueueEntrySummary,
  QueueTransferId,
  QueueTransferSummary,
  SchedulingAppointmentSummary,
  SchedulingAppointmentOperationalSummary,
  SchedulingConflictSummary,
  SchedulingOperationalBlockSummary,
  StaffId,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { getTenantContext } from '@cvg-his-v2/tenant-context';

import {
  MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS,
  type SchedulingAppointmentReportFilters,
  type SchedulingRepository
} from './repositories/database-scheduling.repository.js';

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

const ENCOUNTER_SYNC_QUEUE_STATUSES: readonly QueueEntrySummary['status'][] = [
  'in_triage',
  'in_care',
  'observation'
];

const DEFAULT_APPOINTMENT_DURATION: Record<SchedulingAppointmentSummary['visitType'], number> = {
  scheduled: 30,
  return: 20,
  walk_in: 45
};

export interface SchedulingQueueStateSnapshot {
  readonly queueEntry: QueueEntrySummary;
  readonly appointment?: SchedulingAppointmentSummary;
}

export interface SchedulingProfessionalCareReportFilters {
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface SchedulingProfessionalCareReportRow {
  readonly professional: string;
  readonly scheduled: number;
  readonly completed: number;
  readonly checkedIn: number;
  readonly cancelled: number;
  readonly services: number;
}

const SCHEDULING_WINDOW_START_HOUR = 7;
const SCHEDULING_WINDOW_END_HOUR = 19;
const LUNCH_BREAK_START_HOUR = 12;
const LUNCH_BREAK_END_HOUR = 13;

type SchedulingStaffMember = {
  id: StaffId;
  accountId: AccountId;
  userId?: UserId;
  fullName: string;
  department: string;
  jobTitle: string;
  status: 'active' | 'inactive';
};

export interface SchedulingStaffLookup {
  list(accountId?: AccountId): readonly SchedulingStaffMember[];
  getOrThrow(staffId: StaffId, accountId?: AccountId): SchedulingStaffMember;
}

export interface SchedulingTimeOffLookup {
  listTimeOffOverlaps(
    accountId: AccountId,
    staffId: StaffId,
    startsAt: string,
    endsAt: string
  ): readonly { startsAt: string; endsAt: string; reason: string }[];
}

export interface SchedulingAgendaAvailability {
  readonly id: string;
  readonly accountId: string;
  readonly professionalUserId: string;
  readonly dayOfWeek: number;
  readonly startTime: string;
  readonly endTime: string;
  readonly slotDurationMinutes: number;
  readonly timezone?: string;
  readonly effectiveFrom?: string | null;
  readonly effectiveUntil?: string | null;
  readonly notes: string | null;
}

export interface SchedulingAgendaConfigLookup {
  listAvailability(
    accountId: AccountId,
    professionalUserId?: string
  ): Promise<readonly SchedulingAgendaAvailability[]>;
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
  readonly timeOff?: SchedulingTimeOffLookup;
  readonly agendaConfig?: SchedulingAgendaConfigLookup;
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
  readonly patientId?: string;
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

function normalizeAppointmentPersistenceConflict(error: unknown): Error {
  const candidate = error as { readonly code?: unknown; readonly constraint?: unknown };
  if (
    candidate?.code === '23P01' &&
    typeof candidate.constraint === 'string' &&
    candidate.constraint.startsWith('appointments_')
  ) {
    return new ConflictError('Appointment slot is unavailable for the requested schedule', {
      constraint: candidate.constraint
    });
  }
  return error instanceof Error ? error : new Error(String(error));
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

function parseTimeMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match)
    throw new ValidationError('Agenda availability time must use HH:MM format', { value });
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new ValidationError('Agenda availability time must use a valid clock time', { value });
  }
  return hours * 60 + minutes;
}

function localScheduleParts(input: Date, timezone: string): { dayOfWeek: number; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(input);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const dayOfWeekByName: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6
    };
    const dayOfWeek = dayOfWeekByName[values.weekday ?? ''];
    if (dayOfWeek === undefined) throw new Error('weekday unavailable');
    return {
      dayOfWeek,
      minutes: Number(values.hour) * 60 + Number(values.minute)
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError('Agenda availability timezone is invalid', { timezone });
  }
}

function localScheduleDate(input: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(input);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    throw new ValidationError('Agenda availability timezone is invalid', { timezone });
  }
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
  start.setUTCMinutes(
    start.getUTCMinutes() +
      defaultDurationMinutes(appointment.visitType, appointment.durationMinutes)
  );
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

const APPOINTMENT_REPORT_STATUSES: readonly SchedulingAppointmentSummary['status'][] = [
  'scheduled',
  'checked_in',
  'completed',
  'cancelled'
];

function normalizeAppointmentReportFilters(
  filters: SchedulingAppointmentReportFilters
): SchedulingAppointmentReportFilters {
  if (filters.search !== undefined && typeof filters.search !== 'string') {
    throw new ValidationError('search must be a string with at most 200 characters', {
      value: filters.search
    });
  }
  const search = filters.search?.trim();
  if (search && search.length > 200) {
    throw new ValidationError('search must be a string with at most 200 characters', { search });
  }

  const dateFrom = normalizeAppointmentReportDate(filters.dateFrom, 'dateFrom');
  const dateTo = normalizeAppointmentReportDate(filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new ValidationError('dateFrom must be before or equal to dateTo', { dateFrom, dateTo });
  }

  if (
    filters.status !== undefined &&
    !APPOINTMENT_REPORT_STATUSES.includes(filters.status as SchedulingAppointmentSummary['status'])
  ) {
    throw new ValidationError('status must be scheduled, checked_in, completed or cancelled', {
      status: filters.status
    });
  }

  const limit = filters.limit ?? MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS;
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS
  ) {
    throw new ValidationError('Appointments report read limit must be between 1 and 10001', {
      limit
    });
  }

  return {
    ...(search ? { search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    limit
  };
}

function normalizeAppointmentReportDate(
  value: string | undefined,
  field: string
): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must be an ISO calendar date`, { value });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${field} must be an ISO calendar date`, { value });
  }
  return value;
}

function isAppointmentReportSourceRow(value: unknown): value is SchedulingAppointmentSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const appointment = value as Record<string, unknown>;
  const optionalString = (field: string): boolean =>
    appointment[field] === undefined || typeof appointment[field] === 'string';
  const validStatus = APPOINTMENT_REPORT_STATUSES.includes(
    appointment.status as SchedulingAppointmentSummary['status']
  );
  const validVisitType = ['walk_in', 'scheduled', 'return'].includes(
    appointment.visitType as string
  );
  const duration = appointment.durationMinutes;
  return (
    typeof appointment.id === 'string' &&
    typeof appointment.accountId === 'string' &&
    typeof appointment.patientId === 'string' &&
    typeof appointment.ownerId === 'string' &&
    typeof appointment.scheduledAt === 'string' &&
    !Number.isNaN(Date.parse(appointment.scheduledAt)) &&
    (duration === undefined ||
      (typeof duration === 'number' && Number.isFinite(duration) && duration > 0)) &&
    validVisitType &&
    typeof appointment.reason === 'string' &&
    validStatus &&
    optionalString('practitionerStaffId') &&
    optionalString('serviceId') &&
    optionalString('unit') &&
    optionalString('specialty') &&
    optionalString('resourceLabel') &&
    typeof appointment.createdAt === 'string' &&
    !Number.isNaN(Date.parse(appointment.createdAt)) &&
    typeof appointment.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(appointment.updatedAt))
  );
}

function matchesAppointmentReportPeriod(
  scheduledAt: string,
  dateFrom: string | undefined,
  dateTo: string | undefined
): boolean {
  const date = scheduledAt.slice(0, 10);
  return (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
}

function matchesAppointmentReportSearch(
  appointment: SchedulingAppointmentSummary,
  search: string | undefined
): boolean {
  if (!search) return true;
  const normalizedSearch = search.toLowerCase();
  return [
    appointment.id,
    appointment.patientId,
    appointment.ownerId,
    appointment.practitionerStaffId,
    appointment.serviceId,
    appointment.reason,
    appointment.unit,
    appointment.specialty,
    appointment.resourceLabel
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(normalizedSearch));
}

function operationalStatusForQueueStatus(
  status: QueueEntrySummary['status']
): QueueEntrySummary['operationalStatus'] {
  return status === 'waiting'
    ? 'waiting'
    : status === 'called'
      ? 'called'
      : status === 'in_triage'
        ? 'in_triage'
        : status === 'in_care'
          ? 'in_care'
          : status === 'observation'
            ? 'observation'
            : status === 'completed'
              ? 'completed'
              : 'cancelled';
}

function serializeSlot(
  startsAt: Date,
  durationMinutes: number
): { startsAt: string; endsAt: string } {
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
  readonly #timeOff?: SchedulingTimeOffLookup;
  readonly #agendaConfig?: SchedulingAgendaConfigLookup;
  readonly #services?: SchedulingServiceCatalog;
  readonly #appointments = new Map<AppointmentId, SchedulingAppointmentSummary>();
  readonly #availabilityByAccount = new Map<AccountId, readonly SchedulingAgendaAvailability[]>();
  readonly #queue = new Map<QueueEntryId, QueueEntrySummary>();
  readonly #queueTransfers = new Map<QueueEntryId, QueueTransferSummary[]>();
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
    this.#timeOff = options?.timeOff;
    this.#agendaConfig = options?.agendaConfig;
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
    if (this.#repository) {
      const appointments = await this.#repository.findAllAppointments(accountId);
      for (const apt of appointments) {
        this.#appointments.set(apt.id, apt);
      }
      const queueEntries = await this.#repository.findAllQueueEntries(accountId);
      for (const entry of queueEntries) {
        this.#queue.set(entry.id, entry);
        const transfers = await this.#repository.findQueueTransfersByQueueEntry(entry.id);
        if (transfers.length > 0) {
          this.#queueTransfers.set(entry.id, [...transfers]);
        }
      }
    }
    if (this.#agendaConfig && accountId) {
      const configuredAvailability = await this.#agendaConfig.listAvailability(accountId);
      const staffMembers = this.#staff?.list(accountId) ?? [];
      this.#availabilityByAccount.set(
        accountId,
        configuredAvailability.map((availability) => {
          const staffMember = staffMembers.find(
            (candidate) =>
              candidate.userId === availability.professionalUserId ||
              candidate.id === availability.professionalUserId
          );

          return staffMember
            ? { ...availability, professionalUserId: staffMember.id }
            : availability;
        })
      );
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
      .filter((appointment) =>
        filters?.patientId ? appointment.patientId === filters.patientId : true
      )
      .filter((appointment) => {
        if (!filters?.practitionerStaffId) return true;
        if (filters.practitionerStaffId === 'unassigned') {
          return !appointment.practitionerStaffId;
        }
        return appointment.practitionerStaffId === filters.practitionerStaffId;
      })
      .filter((appointment) =>
        filters?.serviceId ? appointment.serviceId === filters.serviceId : true
      )
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

  public async listPersistedReportRows(
    accountId: AccountId,
    filters: SchedulingAppointmentReportFilters = {}
  ): Promise<readonly SchedulingAppointmentSummary[]> {
    if (!this.#repository) {
      throw new ValidationError('Appointments report requires a database-backed scheduling source');
    }
    const activeAccountId = getTenantContext()?.accountId;
    if (activeAccountId && activeAccountId !== accountId) {
      throw new ValidationError(
        'Appointments report source account does not match tenant context',
        {
          accountId
        }
      );
    }
    if (typeof this.#repository.findAppointmentReportRows !== 'function') {
      throw new ValidationError(
        'Appointments report requires a source-bounded database appointment query'
      );
    }

    const normalizedFilters = normalizeAppointmentReportFilters(filters);
    const sourceRows = await this.#repository.findAppointmentReportRows(
      accountId,
      normalizedFilters
    );
    if (!Array.isArray(sourceRows)) {
      throw new ValidationError('Appointments report source returned an invalid row collection');
    }

    const filtered = sourceRows
      .map((appointment) => {
        if (!isAppointmentReportSourceRow(appointment)) {
          throw new ValidationError('Appointments report source returned an invalid row');
        }
        return appointment;
      })
      .filter((appointment) => appointment.accountId === accountId)
      .filter(
        (appointment) =>
          !normalizedFilters.status || appointment.status === normalizedFilters.status
      )
      .filter((appointment) =>
        matchesAppointmentReportPeriod(
          appointment.scheduledAt,
          normalizedFilters.dateFrom,
          normalizedFilters.dateTo
        )
      )
      .filter((appointment) =>
        matchesAppointmentReportSearch(appointment, normalizedFilters.search)
      )
      .sort(
        (left, right) =>
          left.scheduledAt.localeCompare(right.scheduledAt) || left.id.localeCompare(right.id)
      );

    return filtered;
  }

  public async listPersistedProfessionalCareReportRows(
    accountId: AccountId,
    filters: SchedulingProfessionalCareReportFilters = {}
  ): Promise<readonly SchedulingProfessionalCareReportRow[]> {
    const sourceRows = await this.listPersistedReportRows(accountId, {
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
      limit: MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS
    });
    if (sourceRows.length > MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS - 1) {
      throw new ValidationError('Professional care report source contains too many rows', {
        maxRows: MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS - 1
      });
    }

    type MutableProfessionalCareRow = {
      readonly professional: string;
      readonly scheduled: number;
      readonly completed: number;
      readonly checkedIn: number;
      readonly cancelled: number;
      readonly services: ReadonlySet<string>;
    };

    const grouped = new Map<string, MutableProfessionalCareRow>();
    for (const appointment of sourceRows) {
      const groupKey = appointment.practitionerStaffId ?? 'unassigned';
      const current = grouped.get(groupKey) ?? {
        professional: appointment.practitionerStaffId ?? 'Sem profissional',
        scheduled: 0,
        completed: 0,
        checkedIn: 0,
        cancelled: 0,
        services: new Set<string>()
      };
      const services = new Set(current.services);
      if (appointment.serviceId) services.add(appointment.serviceId);
      grouped.set(groupKey, {
        ...current,
        scheduled: current.scheduled + 1,
        completed: current.completed + (appointment.status === 'completed' ? 1 : 0),
        checkedIn: current.checkedIn + (appointment.status === 'checked_in' ? 1 : 0),
        cancelled: current.cancelled + (appointment.status === 'cancelled' ? 1 : 0),
        services
      });
    }

    return [...grouped.values()]
      .sort(
        (left, right) =>
          right.scheduled - left.scheduled || left.professional.localeCompare(right.professional)
      )
      .map((row) => ({
        professional: row.professional,
        scheduled: row.scheduled,
        completed: row.completed,
        checkedIn: row.checkedIn,
        cancelled: row.cancelled,
        services: row.services.size
      }));
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
    const referenceDate = filters.referenceDate
      ? parseDate(filters.referenceDate, 'referenceDate')
      : new Date();
    const windowStart = startOfUtcDay(referenceDate);
    const windowEnd = addUtcDays(
      windowStart,
      viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 31
    );
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
      const professional = professionals.find(
        (candidate) => candidate.id === appointment.practitionerStaffId
      );
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
    const blocks = this.listOperationalBlocks(accountId, slot.startsAt, slot.endsAt).filter(
      (block) => blockIds.has(block.id)
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
    await this.assertActiveParticipants(accountId, patientId, ownerId);

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
      id: randomUUID() as AppointmentId,
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

    if (this.#repository) {
      try {
        await this.#repository.createAppointment(appointment);
      } catch (error) {
        throw normalizeAppointmentPersistenceConflict(error);
      }
    }

    this.#appointments.set(appointment.id, appointment);

    await this.#onAppointmentCreated?.(appointment);

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

  public snapshotQueueState(queueEntryId: QueueEntryId): SchedulingQueueStateSnapshot {
    const queueEntry = this.getQueueEntryOrThrow(queueEntryId);
    const appointment = queueEntry.appointmentId
      ? this.#appointments.get(queueEntry.appointmentId)
      : undefined;
    return { queueEntry, appointment };
  }

  public restoreQueueState(snapshot: SchedulingQueueStateSnapshot): void {
    this.#queue.set(snapshot.queueEntry.id, snapshot.queueEntry);
    if (snapshot.appointment) {
      this.#appointments.set(snapshot.appointment.id, snapshot.appointment);
    }
  }

  public listQueueTransfers(queueEntryId: QueueEntryId): readonly QueueTransferSummary[] {
    return [...(this.#queueTransfers.get(queueEntryId) ?? [])].sort((a, b) =>
      a.sentAt.localeCompare(b.sentAt)
    );
  }

  public async checkIn(
    accountId: AccountId,
    payload: {
      readonly patientId: string;
      readonly ownerId: string;
      readonly appointmentId?: string;
      readonly reason: string;
      readonly priority?: QueueEntrySummary['priority'];
      readonly entryType?: QueueEntrySummary['entryType'];
      readonly currentSector?: string;
      readonly currentResponsibleUserId?: string;
      readonly currentResponsibleStaffId?: string;
      readonly nextSector?: string;
    }
  ): Promise<QueueEntrySummary> {
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    const ownerId = requireNonEmptyString(payload.ownerId, 'ownerId') as OwnerId;
    const appointmentId =
      payload.appointmentId !== undefined
        ? (requireNonEmptyString(payload.appointmentId, 'appointmentId') as AppointmentId)
        : undefined;

    await this.assertActiveParticipants(accountId, patientId, ownerId);

    if (appointmentId) {
      const linkedAppointment = this.getAppointmentOrThrow(appointmentId);
      if (linkedAppointment.accountId !== accountId) {
        throw new NotFoundError('Appointment not found', { appointmentId });
      }
      if (linkedAppointment.patientId !== patientId || linkedAppointment.ownerId !== ownerId) {
        throw new ValidationError('Check-in participants must match the appointment participants', {
          appointmentId,
          appointmentPatientId: linkedAppointment.patientId,
          appointmentOwnerId: linkedAppointment.ownerId
        });
      }
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
      entryType: payload.entryType ?? 'standard',
      reason: requireNonEmptyString(payload.reason, 'reason'),
      priority: payload.priority ?? 'medium',
      status: 'waiting',
      checkedInAt: now,
      currentSector: payload.currentSector?.trim() || 'Recepcao',
      currentResponsibleUserId: payload.currentResponsibleUserId?.trim()
        ? (payload.currentResponsibleUserId as UserId)
        : undefined,
      currentResponsibleStaffId: payload.currentResponsibleStaffId?.trim()
        ? (payload.currentResponsibleStaffId as StaffId)
        : undefined,
      nextSector: payload.nextSector?.trim() || undefined,
      operationalStatus: 'waiting',
      clinicalStatus: 'not_started',
      billingStatus: 'not_started',
      handoffStatus: 'not_started',
      createdAt: now,
      updatedAt: now
    };

    let checkedInAppointment: SchedulingAppointmentSummary | undefined;
    let previousAppointmentStatus: SchedulingAppointmentSummary['status'] | undefined;
    if (appointmentId) {
      const appointment = this.getAppointmentOrThrow(appointmentId);
      previousAppointmentStatus = appointment.status;
      const updatedAppointment: SchedulingAppointmentSummary = {
        ...appointment,
        status: 'checked_in',
        updatedAt: now
      };
      checkedInAppointment = updatedAppointment;
    }

    if (this.#repository) {
      if (this.#repository.persistCheckIn) {
        await this.#repository.persistCheckIn(entry, checkedInAppointment);
      } else {
        if (checkedInAppointment) {
          await this.#repository.updateAppointment(checkedInAppointment);
        }
        await this.#repository.createQueueEntry(entry);
      }
    }
    if (checkedInAppointment && previousAppointmentStatus) {
      this.#appointments.set(checkedInAppointment.id, checkedInAppointment);
      await this.#onAppointmentStatusChanged?.(checkedInAppointment, previousAppointmentStatus);
    }
    this.#queue.set(entry.id, entry);
    return entry;
  }

  public async transferQueueEntry(
    queueEntryId: QueueEntryId,
    payload: {
      readonly toSector: string;
      readonly sentByUserId: string;
      readonly receivedByUserId?: string;
      readonly responsibleUserId?: string;
      readonly responsibleStaffId?: string;
      readonly nextSector?: string;
      readonly reason: string;
      readonly urgency?: QueueTransferSummary['urgency'];
      readonly billingRecordId?: string;
      readonly counterSaleId?: string;
    }
  ): Promise<QueueEntrySummary> {
    const current = this.getQueueEntryOrThrow(queueEntryId);
    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new ValidationError('Queue entry cannot be transferred from terminal status', {
        queueEntryId,
        status: current.status
      });
    }

    const pendingTransfer = this.listQueueTransfers(queueEntryId).find(
      (transfer) => transfer.status === 'sent'
    );
    if (pendingTransfer) {
      throw new ConflictError('Queue entry already has a pending transfer', {
        queueEntryId,
        transferId: pendingTransfer.id,
        toSector: pendingTransfer.toSector
      });
    }

    const now = nowIso();
    const toSector = requireNonEmptyString(payload.toSector, 'toSector');
    const sentByUserId = requireNonEmptyString(payload.sentByUserId, 'sentByUserId') as UserId;
    const reason = requireNonEmptyString(payload.reason, 'reason');
    const receivedByUserId = payload.receivedByUserId?.trim()
      ? (payload.receivedByUserId as UserId)
      : undefined;
    const transfer: QueueTransferSummary = {
      id: createCorrelationId('queue-transfer') as QueueTransferId,
      accountId: current.accountId,
      queueEntryId: current.id,
      encounterId: current.encounterId,
      fromSector: current.currentSector ?? 'Recepcao',
      toSector,
      sentByUserId,
      sentAt: now,
      status: receivedByUserId ? 'received' : 'sent',
      receivedByUserId,
      receivedAt: receivedByUserId ? now : undefined,
      responsibleUserId: payload.responsibleUserId?.trim()
        ? (payload.responsibleUserId as UserId)
        : undefined,
      responsibleStaffId: payload.responsibleStaffId?.trim()
        ? (payload.responsibleStaffId as StaffId)
        : undefined,
      nextSector: payload.nextSector?.trim() || undefined,
      reason,
      urgency: payload.urgency ?? current.priority,
      billingRecordId: payload.billingRecordId?.trim() || undefined,
      counterSaleId: payload.counterSaleId?.trim() || undefined,
      createdAt: now
    };

    const updated: QueueEntrySummary = {
      ...current,
      currentSector: transfer.toSector,
      currentResponsibleUserId: transfer.responsibleUserId,
      currentResponsibleStaffId: transfer.responsibleStaffId,
      nextSector: transfer.nextSector,
      operationalStatus: receivedByUserId
        ? operationalStatusForQueueStatus(current.status)
        : 'waiting_handoff',
      lastTransferredAt: transfer.sentAt,
      lastTransferredByUserId: transfer.sentByUserId,
      updatedAt: now
    };

    if (this.#repository) {
      await this.#repository.persistQueueTransfer(updated, transfer);
    }

    this.#queue.set(queueEntryId, updated);
    this.#queueTransfers.set(queueEntryId, [...this.listQueueTransfers(queueEntryId), transfer]);

    return updated;
  }

  public async receiveQueueTransfer(
    queueEntryId: QueueEntryId,
    transferId: QueueTransferId,
    receivedByUserId: UserId
  ): Promise<QueueEntrySummary> {
    const current = this.getQueueEntryOrThrow(queueEntryId);
    const transfer = this.listQueueTransfers(queueEntryId).find((item) => item.id === transferId);
    if (!transfer) {
      throw new NotFoundError('Queue transfer not found', { queueEntryId, transferId });
    }
    if (transfer.status === 'received') {
      throw new ConflictError('Queue transfer is already received', { transferId });
    }

    const normalizedReceiver = requireNonEmptyString(
      receivedByUserId,
      'receivedByUserId'
    ) as UserId;
    const receivedAt = nowIso();
    const receivedTransfer: QueueTransferSummary = {
      ...transfer,
      status: 'received',
      receivedByUserId: normalizedReceiver,
      receivedAt
    };
    const updated: QueueEntrySummary = {
      ...current,
      operationalStatus: operationalStatusForQueueStatus(current.status),
      updatedAt: receivedAt
    };

    if (this.#repository) {
      await this.#repository.persistQueueTransferReceipt(updated, receivedTransfer);
    }

    this.#queue.set(queueEntryId, updated);
    this.#queueTransfers.set(
      queueEntryId,
      this.listQueueTransfers(queueEntryId).map((item) =>
        item.id === transferId ? receivedTransfer : item
      )
    );
    return updated;
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
    if (current.status === nextStatus && ENCOUNTER_SYNC_QUEUE_STATUSES.includes(nextStatus)) {
      return current;
    }

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

    if (this.#repository) {
      await this.#repository.updateAppointment(cancelledAppointment);
    }

    this.#appointments.set(appointmentId, cancelledAppointment);

    await this.#onAppointmentStatusChanged?.(cancelledAppointment, current.status);

    return cancelledAppointment;
  }

  public async rescheduleAppointment(
    accountId: AccountId,
    appointmentId: AppointmentId,
    payload: RescheduleAppointmentRequest
  ): Promise<SchedulingAppointmentSummary> {
    const current = this.getAppointmentOrThrow(appointmentId);

    if (current.accountId !== accountId) {
      throw new NotFoundError('Appointment not found', { appointmentId });
    }

    if (current.status !== 'scheduled') {
      throw new ConflictError('Appointment cannot be rescheduled in its current state', {
        appointmentId,
        currentStatus: current.status,
        allowedStatuses: ['scheduled']
      });
    }

    await this.assertActiveParticipants(accountId, current.patientId, current.ownerId);

    const scheduledAt = parseDate(payload.scheduledAt, 'scheduledAt');
    const visitType = payload.visitType ?? current.visitType;
    const durationMinutes = defaultDurationMinutes(
      visitType,
      payload.durationMinutes ?? current.durationMinutes
    );
    const practitionerStaffId =
      payload.practitionerStaffId !== undefined
        ? payload.practitionerStaffId.trim()
          ? (payload.practitionerStaffId.trim() as StaffId)
          : undefined
        : current.practitionerStaffId;
    const serviceId =
      payload.serviceId !== undefined ? payload.serviceId.trim() || undefined : current.serviceId;

    if (practitionerStaffId && this.#staff) {
      this.#staff.getOrThrow(practitionerStaffId, accountId);
    }

    if (serviceId && this.#services) {
      this.#services.getOrThrow(serviceId);
    }

    const resourceLabel =
      payload.resourceLabel !== undefined
        ? payload.resourceLabel.trim() || undefined
        : current.resourceLabel;

    const conflicts = this.collectConflicts(accountId, scheduledAt, durationMinutes, {
      patientId: current.patientId,
      practitionerStaffId,
      resourceLabel,
      ignoreAppointmentId: appointmentId
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

    const updated: SchedulingAppointmentSummary = {
      ...current,
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes,
      visitType,
      reason:
        payload.reason !== undefined
          ? requireNonEmptyString(payload.reason, 'reason')
          : current.reason,
      practitionerStaffId,
      serviceId,
      unit: payload.unit !== undefined ? payload.unit.trim() || undefined : current.unit,
      specialty:
        payload.specialty !== undefined ? payload.specialty.trim() || undefined : current.specialty,
      resourceLabel,
      updatedAt: nowIso()
    };

    if (this.#repository) {
      try {
        await this.#repository.updateAppointment(updated, {
          requireActiveParticipants: true
        });
      } catch (error) {
        throw normalizeAppointmentPersistenceConflict(error);
      }
    }

    this.#appointments.set(appointmentId, updated);

    return updated;
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

  private async assertActiveParticipants(
    accountId: AccountId,
    patientId: PatientId,
    ownerId: OwnerId
  ): Promise<{ readonly patient: PatientSummary; readonly owner: OwnerSummary }> {
    const [patient, owner] = await Promise.all([
      this.#patients.getAuthoritativeOrThrow(accountId, patientId),
      this.#owners.getAuthoritativeOrThrow(accountId, ownerId)
    ]);

    if (patient.accountId !== accountId || owner.accountId !== accountId) {
      throw new ValidationError('Patient and owner must belong to the current account');
    }
    if (owner.status !== 'active') {
      throw new ConflictError('Cannot schedule, check in, or reschedule an inactive owner', {
        ownerId
      });
    }
    if (patient.status !== 'active') {
      throw new ConflictError('Cannot schedule, check in, or reschedule an inactive patient', {
        patientId
      });
    }

    return { patient, owner };
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

    if (this.#repository) {
      await this.#repository.updateAppointment(updated);
    }

    this.#appointments.set(updated.id, updated);

    await this.#onAppointmentStatusChanged?.(updated, current.status);
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
    if (
      !this.isWithinConfiguredAvailability(
        accountId,
        requestedAt,
        slotEnd,
        options.practitionerStaffId
      )
    ) {
      conflicts.push({
        type: 'outside_hours',
        severity: 'critical',
        message: 'O slot solicitado está fora da janela operacional da agenda.',
        startsAt: requestedAt.toISOString(),
        endsAt: slotEnd.toISOString()
      });
    }

    if (options.practitionerStaffId) {
      const timeOffs =
        this.#timeOff?.listTimeOffOverlaps(
          accountId,
          options.practitionerStaffId,
          requestedAt.toISOString(),
          slotEnd.toISOString()
        ) ?? [];
      for (const timeOff of timeOffs) {
        conflicts.push({
          type: 'staff_overlap',
          severity: 'critical',
          message: `O profissional está indisponível: ${timeOff.reason}.`,
          startsAt: timeOff.startsAt,
          endsAt: timeOff.endsAt
        });
      }

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

  private isWithinConfiguredAvailability(
    accountId: AccountId,
    requestedAt: Date,
    slotEnd: Date,
    practitionerStaffId?: StaffId
  ): boolean {
    const configured = this.#availabilityByAccount.get(accountId);
    if (!configured || !practitionerStaffId) {
      const windowStart = setUtcTime(requestedAt, SCHEDULING_WINDOW_START_HOUR);
      const windowEnd = setUtcTime(requestedAt, SCHEDULING_WINDOW_END_HOUR);
      return requestedAt >= windowStart && slotEnd <= windowEnd;
    }

    const rows = configured.filter((row) => row.professionalUserId === practitionerStaffId);
    if (rows.length === 0) return false;
    return rows.some((row) => {
      const timezone = row.timezone?.trim() || 'UTC';
      const start = localScheduleParts(requestedAt, timezone);
      const end = localScheduleParts(slotEnd, timezone);
      const localDate = localScheduleDate(requestedAt, timezone);
      if (row.effectiveFrom && localDate < row.effectiveFrom) return false;
      if (row.effectiveUntil && localDate > row.effectiveUntil) return false;
      if (start.dayOfWeek !== row.dayOfWeek || end.dayOfWeek !== row.dayOfWeek) return false;
      return (
        start.minutes >= parseTimeMinutes(row.startTime) &&
        end.minutes <= parseTimeMinutes(row.endTime)
      );
    });
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
          conflicts.length === 0
            ? 'Slot disponível'
            : (conflicts[0]?.message ?? 'Slot indisponível')
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
  MAX_SCHEDULING_APPOINTMENT_REPORT_READ_ROWS,
  type SchedulingAppointmentReportFilters,
  type SchedulingRepository
} from './repositories/database-scheduling.repository.js';
