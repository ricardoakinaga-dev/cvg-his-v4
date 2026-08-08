import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, StaffId, StaffSummary, UserId } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';
import type {
  StaffRecord,
  StaffCreateInput,
  StaffUpdateInput,
  StaffRepository
} from './repositories/database-staff.repository.js';
import {
  createStaffTimeOffId,
  type StaffTimeOffRepository,
  type StaffTimeOffSummary
} from './repositories/database-staff-time-off.repository.js';

function createSeedStaff(): StaffSummary[] {
  const createdAt = '2026-03-25T00:00:00.000Z';

  return [
    {
      id: 'staff_admin' as StaffId,
      accountId: 'acc_cvg_demo' as never,
      userId: 'user_admin' as UserId,
      employeeCode: 'ADM-001',
      fullName: 'Admin CVG',
      department: 'Governanca',
      jobTitle: 'Administrador do Sistema',
      status: 'active',
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'staff_reception' as StaffId,
      accountId: 'acc_cvg_demo' as never,
      userId: 'user_reception' as UserId,
      employeeCode: 'REC-001',
      fullName: 'Recepcao Central',
      department: 'Atendimento',
      jobTitle: 'Recepcionista',
      status: 'active',
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'staff_auditor' as StaffId,
      accountId: 'acc_cvg_demo' as never,
      userId: 'user_auditor' as UserId,
      employeeCode: 'AUD-001',
      fullName: 'Auditoria Interna',
      department: 'Governanca',
      jobTitle: 'Auditor',
      status: 'active',
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'staff_nurse' as StaffId,
      accountId: 'acc_cvg_demo' as never,
      userId: 'user_nurse' as UserId,
      employeeCode: 'NUR-001',
      fullName: 'Enfermagem Inicial',
      department: 'Triagem',
      jobTitle: 'Enfermeira',
      status: 'active',
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'staff_vet' as StaffId,
      accountId: 'acc_cvg_demo' as never,
      userId: 'user_vet' as UserId,
      employeeCode: 'VET-001',
      fullName: 'Veterinario Responsavel',
      department: 'Clinica',
      jobTitle: 'Medico Veterinario',
      status: 'active',
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'staff_finance' as StaffId,
      accountId: 'acc_cvg_demo' as never,
      userId: 'user_finance' as UserId,
      employeeCode: 'FIN-001',
      fullName: 'Financeiro Operacional',
      department: 'Financeiro',
      jobTitle: 'Analista Financeiro',
      status: 'active',
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'staff_inventory' as StaffId,
      accountId: 'acc_cvg_demo' as never,
      userId: 'user_inventory' as UserId,
      employeeCode: 'INV-001',
      fullName: 'Estoque Assistencial',
      department: 'Suprimentos',
      jobTitle: 'Analista de Estoque',
      status: 'active',
      createdAt,
      updatedAt: createdAt
    }
  ];
}

export interface StaffServiceOptions {
  readonly repository?: StaffRepository;
  readonly timeOffRepository?: StaffTimeOffRepository;
}

export class StaffService {
  readonly #repository?: StaffRepository;
  readonly #timeOffRepository?: StaffTimeOffRepository;
  readonly #staffById = new Map<StaffId, StaffSummary>();
  readonly #staffByUserId = new Map<UserId, StaffSummary>();
  readonly #timeOffById = new Map<string, StaffTimeOffSummary>();

  public constructor(
    options?: StaffServiceOptions,
    seedStaff: readonly StaffSummary[] = createSeedStaff()
  ) {
    this.#repository = options?.repository;
    this.#timeOffRepository = options?.timeOffRepository;
    for (const staff of seedStaff) {
      this.#staffById.set(staff.id, staff);
      if (staff.userId) {
        this.#staffByUserId.set(staff.userId, staff);
      }
    }
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository || this.#timeOffRepository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId?: AccountId): Promise<void> {
    if (this.#repository) {
      const dbStaff = await this.#repository.findByAccountId(accountId);
      for (const record of dbStaff) {
        const summary: StaffSummary = {
          id: record.id as StaffId,
          accountId: record.accountId,
          userId: record.userId ?? (undefined as UserId | undefined),
          employeeCode: record.employeeCode,
          fullName: record.fullName,
          department: record.department ?? '',
          jobTitle: record.jobTitle ?? '',
          status: record.isActive ? 'active' : 'inactive',
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        };
        this.#staffById.set(summary.id, summary);
        if (summary.userId) {
          this.#staffByUserId.set(summary.userId, summary);
        }
      }
    }

    if (this.#timeOffRepository) {
      const timeOffs = await this.#timeOffRepository.findByAccountId(accountId);
      for (const timeOff of timeOffs) this.#timeOffById.set(timeOff.id, timeOff);
    }
  }

  public listTimeOff(accountId: AccountId, staffId?: StaffId): readonly StaffTimeOffSummary[] {
    return [...this.#timeOffById.values()]
      .filter((timeOff) => timeOff.accountId === accountId)
      .filter((timeOff) => !staffId || timeOff.staffId === staffId)
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  }

  public listTimeOffOverlaps(
    accountId: AccountId,
    staffId: StaffId,
    startsAt: string,
    endsAt: string
  ): readonly StaffTimeOffSummary[] {
    const start = parseTimeOffDate(startsAt, 'startsAt');
    const end = parseTimeOffDate(endsAt, 'endsAt');
    return this.listTimeOff(accountId, staffId).filter(
      (timeOff) =>
        timeOff.status === 'scheduled' &&
        new Date(timeOff.startsAt) < end &&
        new Date(timeOff.endsAt) > start
    );
  }

  public async createTimeOff(
    accountId: AccountId,
    createdByUserId: UserId,
    input: {
      readonly staffId: StaffId;
      readonly startsAt: string;
      readonly endsAt: string;
      readonly reason: string;
    }
  ): Promise<StaffTimeOffSummary> {
    this.getOrThrow(input.staffId, accountId);
    const startsAt = parseTimeOffDate(input.startsAt, 'startsAt');
    const endsAt = parseTimeOffDate(input.endsAt, 'endsAt');
    if (endsAt <= startsAt) {
      throw new ValidationError('endsAt must be after startsAt');
    }
    const reason = input.reason.trim();
    if (!reason) throw new ValidationError('reason must be a non-empty string');

    const localOverlaps = this.listTimeOffOverlaps(
      accountId,
      input.staffId,
      startsAt.toISOString(),
      endsAt.toISOString()
    );
    const persistedOverlaps = this.#timeOffRepository
      ? await this.#timeOffRepository.findOverlaps(
          accountId,
          input.staffId,
          startsAt.toISOString(),
          endsAt.toISOString()
        )
      : [];
    if (localOverlaps.length > 0 || persistedOverlaps.length > 0) {
      throw new ConflictError('Staff member already has time off in the requested interval', {
        staffId: input.staffId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString()
      });
    }

    const now = nowIso();
    const timeOff: StaffTimeOffSummary = {
      id: createStaffTimeOffId(Boolean(this.#timeOffRepository)),
      accountId,
      staffId: input.staffId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      reason,
      status: 'scheduled',
      createdByUserId,
      createdAt: now,
      updatedAt: now
    };
    if (this.#timeOffRepository?.createIfNoOverlap) {
      const created = await this.#timeOffRepository.createIfNoOverlap(timeOff);
      if (!created) {
        throw new ConflictError('Staff member already has time off in the requested interval', {
          staffId: input.staffId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString()
        });
      }
    } else {
      await this.#timeOffRepository?.save(timeOff);
    }
    this.#timeOffById.set(timeOff.id, timeOff);
    return timeOff;
  }

  public async cancelTimeOff(
    accountId: AccountId,
    timeOffId: string
  ): Promise<StaffTimeOffSummary> {
    const current = this.#timeOffById.get(timeOffId);
    if (!current || current.accountId !== accountId) {
      throw new NotFoundError('Staff time off not found', { timeOffId });
    }
    if (current.status === 'cancelled') {
      throw new ConflictError('Staff time off is already cancelled', { timeOffId });
    }
    const updated: StaffTimeOffSummary = {
      ...current,
      status: 'cancelled',
      updatedAt: nowIso()
    };
    await this.#timeOffRepository?.save(updated);
    this.#timeOffById.set(updated.id, updated);
    return updated;
  }

  public list(accountId?: AccountId): readonly StaffSummary[] {
    return Array.from(this.#staffById.values()).filter(
      (s) => !accountId || s.accountId === accountId
    );
  }

  public getOrThrow(staffId: StaffId, accountId?: AccountId): StaffSummary {
    const staff = this.#staffById.get(staffId);
    if (!staff || (accountId && staff.accountId !== accountId)) {
      throw new NotFoundError('Staff member not found', { staffId });
    }
    return staff;
  }

  public findByUserId(userId: UserId): StaffSummary | undefined {
    return this.#staffByUserId.get(userId);
  }

  async create(
    accountId: AccountId,
    input: {
      readonly employeeCode: string;
      readonly fullName: string;
      readonly userId?: UserId | null;
      readonly department?: string | null;
      readonly jobTitle?: string | null;
    }
  ): Promise<StaffSummary> {
    const createInput: StaffCreateInput = {
      accountId,
      userId: input.userId ?? null,
      employeeCode: input.employeeCode,
      fullName: input.fullName,
      department: input.department ?? null,
      jobTitle: input.jobTitle ?? null
    };

    let record: StaffRecord;
    if (this.#repository) {
      record = await this.#repository.create(createInput);
    } else {
      const now = nowIso();
      const id = `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as StaffId;
      record = {
        id,
        accountId,
        userId: input.userId ?? null,
        employeeCode: input.employeeCode,
        fullName: input.fullName,
        department: input.department ?? null,
        jobTitle: input.jobTitle ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
    }

    const summary: StaffSummary = {
      id: record.id as StaffId,
      accountId: record.accountId,
      userId: record.userId ?? (undefined as UserId | undefined),
      employeeCode: record.employeeCode,
      fullName: record.fullName,
      department: record.department ?? '',
      jobTitle: record.jobTitle ?? '',
      status: record.isActive ? 'active' : 'inactive',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
    this.#staffById.set(summary.id, summary);
    if (summary.userId) {
      this.#staffByUserId.set(summary.userId, summary);
    }
    return summary;
  }

  async update(
    staffId: StaffId,
    input: {
      readonly fullName?: string;
      readonly department?: string | null;
      readonly jobTitle?: string | null;
      readonly isActive?: boolean;
    }
  ): Promise<StaffSummary> {
    const existing = this.getOrThrow(staffId);
    const updateInput: StaffUpdateInput = {
      fullName: input.fullName,
      department: input.department,
      jobTitle: input.jobTitle,
      isActive: input.isActive
    };

    let record: StaffRecord;
    if (this.#repository) {
      record = await this.#repository.update(staffId as string, updateInput);
    } else {
      const now = nowIso();
      record = {
        id: staffId as string,
        accountId: existing.accountId,
        userId: existing.userId ?? null,
        employeeCode: existing.employeeCode,
        fullName: input.fullName ?? existing.fullName,
        department:
          input.department !== undefined ? input.department : (existing.department ?? null),
        jobTitle: input.jobTitle !== undefined ? input.jobTitle : (existing.jobTitle ?? null),
        isActive: input.isActive !== undefined ? input.isActive : existing.status === 'active',
        createdAt: existing.createdAt,
        updatedAt: now
      };
    }

    const summary: StaffSummary = {
      id: record.id as StaffId,
      accountId: record.accountId,
      userId: record.userId ?? (undefined as UserId | undefined),
      employeeCode: record.employeeCode,
      fullName: record.fullName,
      department: record.department ?? '',
      jobTitle: record.jobTitle ?? '',
      status: record.isActive ? 'active' : 'inactive',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
    this.#staffById.set(summary.id, summary);
    if (summary.userId) {
      this.#staffByUserId.set(summary.userId, summary);
    }
    return summary;
  }

  async toggleActive(staffId: StaffId, isActive: boolean): Promise<StaffSummary> {
    return this.update(staffId, { isActive });
  }
}

export { createSeedStaff };
export {
  DatabaseStaffRepository,
  type StaffRepository,
  type StaffRecord,
  type StaffCreateInput,
  type StaffUpdateInput
} from './repositories/database-staff.repository.js';
export {
  DatabaseStaffTimeOffRepository,
  type StaffTimeOffRepository,
  type StaffTimeOffStatus,
  type StaffTimeOffSummary
} from './repositories/database-staff-time-off.repository.js';

function parseTimeOffDate(value: string, field: string): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} must be a valid ISO date`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${field} must be a valid ISO date`);
  }
  return parsed;
}
