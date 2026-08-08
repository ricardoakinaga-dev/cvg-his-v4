import { beforeEach, describe, expect, it } from 'vitest';

import type { AccountId, StaffId, StaffSummary, UserId } from '@cvg-his-v2/shared-types';

import { StaffService } from './index.js';
import type {
  StaffCreateInput,
  StaffRecord,
  StaffRepository,
  StaffUpdateInput
} from './repositories/database-staff.repository.js';
import type {
  StaffTimeOffRepository,
  StaffTimeOffSummary
} from './repositories/database-staff-time-off.repository.js';

class InMemoryStaffRepository implements StaffRepository {
  readonly #records = new Map<string, StaffRecord>();

  constructor(initialRecords: readonly StaffRecord[] = []) {
    for (const record of initialRecords) {
      this.#records.set(record.id, record);
    }
  }

  async create(input: StaffCreateInput): Promise<StaffRecord> {
    const now = '2026-04-01T10:00:00.000Z';
    const record: StaffRecord = {
      id: `staff_repo_${this.#records.size + 1}`,
      accountId: input.accountId,
      userId: input.userId ?? null,
      employeeCode: input.employeeCode,
      fullName: input.fullName,
      department: input.department ?? null,
      jobTitle: input.jobTitle ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.#records.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<StaffRecord | null> {
    return this.#records.get(id) ?? null;
  }

  async findByAccountId(accountId?: AccountId): Promise<readonly StaffRecord[]> {
    return Array.from(this.#records.values()).filter(
      (record) => !accountId || record.accountId === accountId
    );
  }

  async findByUserId(accountId: AccountId, userId: UserId): Promise<StaffRecord | null> {
    return (
      Array.from(this.#records.values()).find(
        (record) => record.accountId === accountId && record.userId === userId
      ) ?? null
    );
  }

  async update(id: string, input: StaffUpdateInput): Promise<StaffRecord> {
    const current = this.#records.get(id);
    if (!current) {
      throw new Error(`Staff not found: ${id}`);
    }

    const updated: StaffRecord = {
      ...current,
      fullName: input.fullName ?? current.fullName,
      department: input.department !== undefined ? input.department : current.department,
      jobTitle: input.jobTitle !== undefined ? input.jobTitle : current.jobTitle,
      isActive: input.isActive ?? current.isActive,
      updatedAt: '2026-04-01T11:00:00.000Z'
    };
    this.#records.set(id, updated);
    return updated;
  }
}

class SerializedTimeOffRepository implements StaffTimeOffRepository {
  readonly #records = new Map<string, StaffTimeOffSummary>();
  #tail = Promise.resolve();

  async createIfNoOverlap(timeOff: StaffTimeOffSummary): Promise<boolean> {
    const previous = this.#tail;
    let release!: () => void;
    this.#tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const overlaps = [...this.#records.values()].some(
        (current) =>
          current.accountId === timeOff.accountId &&
          current.staffId === timeOff.staffId &&
          current.status === 'scheduled' &&
          current.startsAt < timeOff.endsAt &&
          current.endsAt > timeOff.startsAt
      );
      if (overlaps) return false;
      this.#records.set(timeOff.id, timeOff);
      return true;
    } finally {
      release();
    }
  }

  async save(timeOff: StaffTimeOffSummary): Promise<void> {
    this.#records.set(timeOff.id, timeOff);
  }

  async findByAccountId(accountId?: AccountId): Promise<readonly StaffTimeOffSummary[]> {
    return [...this.#records.values()].filter((item) => !accountId || item.accountId === accountId);
  }

  async findOverlaps(
    accountId: AccountId,
    staffId: StaffId,
    startsAt: string,
    endsAt: string
  ): Promise<readonly StaffTimeOffSummary[]> {
    return [...this.#records.values()].filter(
      (item) =>
        item.accountId === accountId &&
        item.staffId === staffId &&
        item.status === 'scheduled' &&
        item.startsAt < endsAt &&
        item.endsAt > startsAt
    );
  }
}

describe('StaffService', () => {
  let service: StaffService;

  beforeEach(() => {
    service = new StaffService(undefined, []);
  });

  it('creates, lists by account and resolves by linked user', async () => {
    const accountA = 'acc_a' as AccountId;
    const accountB = 'acc_b' as AccountId;

    const first = await service.create(accountA, {
      employeeCode: 'ADM-100',
      fullName: 'Admin Operacional',
      userId: 'user_admin_ops' as UserId,
      department: 'Governanca',
      jobTitle: 'Administrador'
    });
    await service.create(accountB, {
      employeeCode: 'FIN-200',
      fullName: 'Financeiro Norte',
      department: 'Financeiro'
    });

    expect(service.list()).toHaveLength(2);
    expect(service.list(accountA)).toHaveLength(1);
    expect(service.list(accountA)[0]?.id).toBe(first.id);
    expect(service.findByUserId('user_admin_ops' as UserId)?.id).toBe(first.id);
  });

  it('updates collaborator data and toggles active flag', async () => {
    const member = await service.create('acc_demo' as AccountId, {
      employeeCode: 'OPS-001',
      fullName: 'Operacao Base'
    });

    const updated = await service.update(member.id, {
      fullName: 'Operacao Senior',
      department: 'Operacoes',
      jobTitle: 'Coordenador'
    });
    const inactive = await service.toggleActive(member.id, false);

    expect(updated.fullName).toBe('Operacao Senior');
    expect(updated.department).toBe('Operacoes');
    expect(updated.jobTitle).toBe('Coordenador');
    expect(inactive.status).toBe('inactive');
  });

  it('throws for missing staff and respects account scope on getOrThrow', async () => {
    const member = await service.create('acc_scope' as AccountId, {
      employeeCode: 'SCP-001',
      fullName: 'Scoped Member'
    });

    expect(() => service.getOrThrow('missing' as StaffId)).toThrow();
    expect(() => service.getOrThrow(member.id, 'other_account' as AccountId)).toThrow();
    expect(service.getOrThrow(member.id, 'acc_scope' as AccountId).id).toBe(member.id);
  });

  it('hydrates from repository and merges database records into memory', async () => {
    const repository = new InMemoryStaffRepository([
      {
        id: 'staff_repo_existing' as StaffId,
        accountId: 'acc_repo' as AccountId,
        userId: 'user_repo' as UserId,
        employeeCode: 'REP-001',
        fullName: 'Repositorio Existente',
        department: 'Operacoes',
        jobTitle: 'Supervisor',
        isActive: true,
        createdAt: '2026-03-30T10:00:00.000Z',
        updatedAt: '2026-03-30T10:00:00.000Z'
      },
      {
        id: 'staff_repo_other' as StaffId,
        accountId: 'acc_other' as AccountId,
        userId: null,
        employeeCode: 'OTH-001',
        fullName: 'Outro Registro',
        department: null,
        jobTitle: null,
        isActive: false,
        createdAt: '2026-03-31T10:00:00.000Z',
        updatedAt: '2026-03-31T10:00:00.000Z'
      }
    ]);
    const hydratedService = new StaffService({ repository }, []);

    await hydratedService.hydrateFromDatabase('acc_repo' as AccountId);

    const items = hydratedService.list('acc_repo' as AccountId);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'staff_repo_existing' as StaffId,
      employeeCode: 'REP-001',
      status: 'active'
    } satisfies Partial<StaffSummary>);
    expect(hydratedService.findByUserId('user_repo' as UserId)?.id).toBe('staff_repo_existing');
    expect(hydratedService.list('acc_other' as AccountId)).toHaveLength(0);
  });

  it('persists time off in the service and rejects overlapping intervals', async () => {
    const member = await service.create('acc_demo' as AccountId, {
      employeeCode: 'VET-100',
      fullName: 'Veterinaria de Plantao',
      jobTitle: 'Medica Veterinaria'
    });

    const timeOff = await service.createTimeOff('acc_demo' as AccountId, 'user_hr' as UserId, {
      staffId: member.id,
      startsAt: '2026-04-10T09:00:00.000Z',
      endsAt: '2026-04-10T13:00:00.000Z',
      reason: 'Folga programada'
    });

    expect(service.listTimeOff('acc_demo' as AccountId)).toHaveLength(1);
    expect(
      service.listTimeOffOverlaps(
        'acc_demo' as AccountId,
        member.id,
        '2026-04-10T12:00:00.000Z',
        '2026-04-10T14:00:00.000Z'
      )
    ).toHaveLength(1);

    await expect(
      service.createTimeOff('acc_demo' as AccountId, 'user_hr' as UserId, {
        staffId: member.id,
        startsAt: '2026-04-10T12:00:00.000Z',
        endsAt: '2026-04-10T14:00:00.000Z',
        reason: 'Conflito'
      })
    ).rejects.toThrow(/already has time off/);

    const cancelled = await service.cancelTimeOff('acc_demo' as AccountId, timeOff.id);
    expect(cancelled.status).toBe('cancelled');
    expect(
      service.listTimeOffOverlaps(
        'acc_demo' as AccountId,
        member.id,
        '2026-04-10T12:00:00.000Z',
        '2026-04-10T14:00:00.000Z'
      )
    ).toHaveLength(0);
  });

  it('serializes concurrent time-off creation and accepts only one overlapping interval', async () => {
    const member = await service.create('acc_race' as AccountId, {
      employeeCode: 'VET-RACE',
      fullName: 'Veterinaria Concorrente'
    });
    const repository = new SerializedTimeOffRepository();
    const guardedService = new StaffService({ timeOffRepository: repository }, [member]);
    const input = {
      staffId: member.id,
      startsAt: '2026-04-11T09:00:00.000Z',
      endsAt: '2026-04-11T13:00:00.000Z',
      reason: 'Folga concorrente'
    } as const;

    const results = await Promise.allSettled([
      guardedService.createTimeOff('acc_race' as AccountId, 'user_hr' as UserId, input),
      guardedService.createTimeOff('acc_race' as AccountId, 'user_hr' as UserId, input)
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(guardedService.listTimeOff('acc_race' as AccountId)).toHaveLength(1);
  });
});
