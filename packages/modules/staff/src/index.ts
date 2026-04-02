import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, StaffId, StaffSummary, UserId } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';
import type {
  StaffRecord,
  StaffCreateInput,
  StaffUpdateInput,
  StaffRepository
} from './repositories/database-staff.repository.js';

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
}

export class StaffService {
  readonly #repository?: StaffRepository;
  readonly #staffById = new Map<StaffId, StaffSummary>();
  readonly #staffByUserId = new Map<UserId, StaffSummary>();

  public constructor(
    options?: StaffServiceOptions,
    seedStaff: readonly StaffSummary[] = createSeedStaff()
  ) {
    this.#repository = options?.repository;
    for (const staff of seedStaff) {
      this.#staffById.set(staff.id, staff);
      if (staff.userId) {
        this.#staffByUserId.set(staff.userId, staff);
      }
    }
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId?: AccountId): Promise<void> {
    if (!this.#repository) return;
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
