import { randomUUID } from 'node:crypto';

export interface ProfessionalAvailabilityRecord {
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

export interface AppointmentTypeConfigRecord {
  readonly id: string;
  readonly accountId: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly defaultDurationMinutes: number;
  readonly color: string | null;
  readonly active: boolean;
}

export interface AgendaConfigRepository {
  listAvailability(
    accountId: string,
    professionalUserId?: string
  ): Promise<readonly ProfessionalAvailabilityRecord[]>;
  createAvailability(
    record: ProfessionalAvailabilityRecord
  ): Promise<ProfessionalAvailabilityRecord>;
  findAvailabilityById(
    accountId: string,
    id: string
  ): Promise<ProfessionalAvailabilityRecord | null>;
  updateAvailability(
    record: ProfessionalAvailabilityRecord
  ): Promise<ProfessionalAvailabilityRecord>;
  deleteAvailability(accountId: string, id: string): Promise<boolean>;

  listAppointmentTypes(
    accountId: string,
    filters?: { query?: string; active?: boolean }
  ): Promise<readonly AppointmentTypeConfigRecord[]>;
  createAppointmentType(record: AppointmentTypeConfigRecord): Promise<AppointmentTypeConfigRecord>;
  findAppointmentTypeById(
    accountId: string,
    id: string
  ): Promise<AppointmentTypeConfigRecord | null>;
  updateAppointmentType(
    record: AppointmentTypeConfigRecord
  ): Promise<AppointmentTypeConfigRecord>;
  deleteAppointmentType(accountId: string, id: string): Promise<boolean>;
}

function copyAvailability(
  record: ProfessionalAvailabilityRecord
): ProfessionalAvailabilityRecord {
  return { ...record };
}

function copyAppointmentType(record: AppointmentTypeConfigRecord): AppointmentTypeConfigRecord {
  return { ...record };
}

export class InMemoryAgendaConfigRepository implements AgendaConfigRepository {
  readonly #availability = new Map<string, ProfessionalAvailabilityRecord>();
  readonly #appointmentTypes = new Map<string, AppointmentTypeConfigRecord>();

  public constructor(seed = true) {
    if (!seed) return;

    const availabilitySeeds: readonly ProfessionalAvailabilityRecord[] = [
      {
        id: 'avail-vet-seg',
        accountId: 'acc_cvg_demo',
        professionalUserId: 'user_vet',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        timezone: 'America/Sao_Paulo',
        effectiveFrom: null,
        effectiveUntil: null,
        notes: 'Agenda clínica principal'
      },
      {
        id: 'avail-nurse-ter',
        accountId: 'acc_cvg_demo',
        professionalUserId: 'user_nurse',
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '18:00',
        slotDurationMinutes: 20,
        timezone: 'America/Sao_Paulo',
        effectiveFrom: null,
        effectiveUntil: null,
        notes: 'Cobertura triagem e apoio'
      }
    ];
    const appointmentTypeSeeds: readonly AppointmentTypeConfigRecord[] = [
      {
        id: 'appt-clinica',
        accountId: 'acc_cvg_demo',
        code: 'CONS_CLIN',
        name: 'Consulta Clínica',
        description: 'Atendimento clínico geral',
        defaultDurationMinutes: 30,
        color: '#0F766E',
        active: true
      },
      {
        id: 'appt-retorno',
        accountId: 'acc_cvg_demo',
        code: 'RETORNO',
        name: 'Retorno',
        description: 'Revisão e acompanhamento pós-atendimento',
        defaultDurationMinutes: 20,
        color: '#1D4ED8',
        active: true
      }
    ];

    for (const record of availabilitySeeds) this.#availability.set(record.id, copyAvailability(record));
    for (const record of appointmentTypeSeeds) {
      this.#appointmentTypes.set(record.id, copyAppointmentType(record));
    }
  }

  async listAvailability(
    accountId: string,
    professionalUserId?: string
  ): Promise<readonly ProfessionalAvailabilityRecord[]> {
    return [...this.#availability.values()]
      .filter(
        (record) =>
          record.accountId === accountId &&
          (!professionalUserId || record.professionalUserId === professionalUserId)
      )
      .sort((left, right) =>
        left.dayOfWeek === right.dayOfWeek
          ? left.startTime.localeCompare(right.startTime)
          : left.dayOfWeek - right.dayOfWeek
      )
      .map(copyAvailability);
  }

  async createAvailability(
    record: ProfessionalAvailabilityRecord
  ): Promise<ProfessionalAvailabilityRecord> {
    const next = copyAvailability(record);
    this.#availability.set(next.id, next);
    return copyAvailability(next);
  }

  async findAvailabilityById(
    accountId: string,
    id: string
  ): Promise<ProfessionalAvailabilityRecord | null> {
    const record = this.#availability.get(id);
    return record?.accountId === accountId ? copyAvailability(record) : null;
  }

  async updateAvailability(
    record: ProfessionalAvailabilityRecord
  ): Promise<ProfessionalAvailabilityRecord> {
    const current = this.#availability.get(record.id);
    if (!current || current.accountId !== record.accountId) {
      throw new Error('Availability not found');
    }
    const next = copyAvailability(record);
    this.#availability.set(next.id, next);
    return copyAvailability(next);
  }

  async deleteAvailability(accountId: string, id: string): Promise<boolean> {
    const record = this.#availability.get(id);
    if (!record || record.accountId !== accountId) return false;
    this.#availability.delete(id);
    return true;
  }

  async listAppointmentTypes(
    accountId: string,
    filters: { query?: string; active?: boolean } = {}
  ): Promise<readonly AppointmentTypeConfigRecord[]> {
    const query = filters.query?.trim().toLowerCase() ?? '';
    return [...this.#appointmentTypes.values()]
      .filter((record) => record.accountId === accountId)
      .filter((record) => filters.active === undefined || record.active === filters.active)
      .filter(
        (record) =>
          !query ||
          record.name.toLowerCase().includes(query) ||
          record.code.toLowerCase().includes(query) ||
          (record.description ?? '').toLowerCase().includes(query)
      )
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
      .map(copyAppointmentType);
  }

  async createAppointmentType(
    record: AppointmentTypeConfigRecord
  ): Promise<AppointmentTypeConfigRecord> {
    const next = copyAppointmentType(record);
    this.#appointmentTypes.set(next.id, next);
    return copyAppointmentType(next);
  }

  async findAppointmentTypeById(
    accountId: string,
    id: string
  ): Promise<AppointmentTypeConfigRecord | null> {
    const record = this.#appointmentTypes.get(id);
    return record?.accountId === accountId ? copyAppointmentType(record) : null;
  }

  async updateAppointmentType(
    record: AppointmentTypeConfigRecord
  ): Promise<AppointmentTypeConfigRecord> {
    const current = this.#appointmentTypes.get(record.id);
    if (!current || current.accountId !== record.accountId) {
      throw new Error('Appointment type not found');
    }
    const next = copyAppointmentType(record);
    this.#appointmentTypes.set(next.id, next);
    return copyAppointmentType(next);
  }

  async deleteAppointmentType(accountId: string, id: string): Promise<boolean> {
    const record = this.#appointmentTypes.get(id);
    if (!record || record.accountId !== accountId) return false;
    this.#appointmentTypes.delete(id);
    return true;
  }
}

export function createAgendaAvailabilityRecord(input: {
  accountId: string;
  professionalUserId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  timezone?: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  notes?: string | null;
}): ProfessionalAvailabilityRecord {
  return {
    id: randomUUID(),
    accountId: input.accountId,
    professionalUserId: input.professionalUserId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    slotDurationMinutes: input.slotDurationMinutes,
    timezone: input.timezone ?? 'America/Sao_Paulo',
    effectiveFrom: input.effectiveFrom ?? null,
    effectiveUntil: input.effectiveUntil ?? null,
    notes: input.notes ?? null
  };
}

export function createAppointmentTypeConfigRecord(input: {
  accountId: string;
  code: string;
  name: string;
  description?: string | null;
  defaultDurationMinutes: number;
  color?: string | null;
  active?: boolean;
}): AppointmentTypeConfigRecord {
  return {
    id: randomUUID(),
    accountId: input.accountId,
    code: input.code,
    name: input.name,
    description: input.description ?? null,
    defaultDurationMinutes: input.defaultDurationMinutes,
    color: input.color ?? null,
    active: input.active ?? true
  };
}
