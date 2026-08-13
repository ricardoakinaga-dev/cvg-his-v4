import { randomUUID } from 'node:crypto';

import { EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  AddInpatientProgressRequest,
  AddInpatientOccurrenceRequest,
  CreateInpatientDailyChargeRequest,
  CreateInpatientAdmissionRequest,
  InpatientHandoverPreviewResponse,
  MarkInpatientDailyChargeBilledRequest,
  UpdateInpatientStatusRequest,
  AssignBedRequest
} from '@cvg-his-v2/shared-contracts';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  BedId,
  InpatientProgressId,
  InpatientProgressSummary,
  InpatientOccurrenceId,
  InpatientOccurrenceSummary,
  InpatientDailyChargeId,
  InpatientDailyChargeSummary,
  InpatientDailyChargeWorklistItem,
  InpatientStayId,
  InpatientStaySummary,
  SectorId,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import {
  DatabaseInpatientStayRepository,
  DatabaseInpatientProgressRepository,
  DatabaseInpatientOccurrenceRepository,
  DatabaseInpatientDailyChargeRepository
} from './repositories/database-inpatient.repository.js';
import type {
  InpatientStayRepository,
  InpatientProgressRepository,
  InpatientOccurrenceRepository,
  InpatientDailyChargeRepository
} from './repositories/database-inpatient.repository.js';
import { SectorBedService } from './sector-bed.service.js';

export type {
  InpatientStayRepository,
  InpatientProgressRepository,
  InpatientOccurrenceRepository,
  InpatientDailyChargeRepository
};
export {
  DatabaseInpatientStayRepository,
  DatabaseInpatientProgressRepository,
  DatabaseInpatientOccurrenceRepository,
  DatabaseInpatientDailyChargeRepository
};
export {
  SectorBedService,
  DatabaseSectorRepository,
  DatabaseBedRepository,
  type SectorBedServiceOptions,
  type SectorRepository,
  type BedRepository
} from './sector-bed.service.js';

const VALID_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  admitted: ['stable', 'transferred', 'discharged'],
  stable: ['admitted', 'transferred', 'discharged'],
  transferred: ['admitted'],
  discharged: []
};

export interface InpatientServiceOptions {
  readonly stayRepository?: InpatientStayRepository;
  readonly progressRepository?: InpatientProgressRepository;
  readonly occurrenceRepository?: InpatientOccurrenceRepository;
  readonly dailyChargeRepository?: InpatientDailyChargeRepository;
  readonly sectorBedService?: SectorBedService;
}

export interface InpatientStayListFilters {
  readonly accountId?: AccountId;
  readonly encounterId?: string;
  readonly patientId?: string;
  readonly includeDischarged?: boolean;
}

export interface InpatientDailyChargeWorklistFilters {
  readonly accountId?: AccountId;
  readonly status?: InpatientDailyChargeSummary['status'];
  readonly unit?: string;
  readonly ward?: string;
}

export class InpatientService {
  readonly #encounters: EncountersService;
  readonly #stays = new Map<InpatientStayId, InpatientStaySummary>();
  readonly #progress = new Map<InpatientStayId, InpatientProgressSummary[]>();
  readonly #occurrences = new Map<InpatientStayId, InpatientOccurrenceSummary[]>();
  readonly #dailyCharges = new Map<InpatientStayId, InpatientDailyChargeSummary[]>();
  readonly #stayRepository?: InpatientStayRepository;
  readonly #progressRepository?: InpatientProgressRepository;
  readonly #occurrenceRepository?: InpatientOccurrenceRepository;
  readonly #dailyChargeRepository?: InpatientDailyChargeRepository;
  readonly #sectorBedService?: SectorBedService;
  #pendingPersist: Promise<void> = Promise.resolve();
  #lastPersist: Promise<void> = Promise.resolve();

  public constructor(encounters: EncountersService, options?: InpatientServiceOptions) {
    this.#encounters = encounters;
    this.#stayRepository = options?.stayRepository;
    this.#progressRepository = options?.progressRepository;
    this.#occurrenceRepository = options?.occurrenceRepository;
    this.#dailyChargeRepository = options?.dailyChargeRepository;
    this.#sectorBedService = options?.sectorBedService;
  }

  public async waitForPersistence(): Promise<void> {
    try {
      await this.#lastPersist;
    } finally {
      this.#pendingPersist = this.#pendingPersist.catch(() => {});
      this.#lastPersist = this.#pendingPersist;
    }
  }

  #enqueuePersist(operation: () => Promise<void>, rollback?: () => void): void {
    const pending = this.#pendingPersist.then(async () => {
      try {
        await operation();
      } catch (error) {
        rollback?.();
        throw error;
      }
    });
    this.#lastPersist = pending;
    this.#pendingPersist = pending;
    void pending.catch(() => {});
  }

  private isValidTransition(currentStatus: string, newStatus: string): boolean {
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
    return allowed?.includes(newStatus) ?? false;
  }

  private async persistStay(stay: InpatientStaySummary): Promise<void> {
    if (this.#stayRepository) {
      await this.#encounters.waitForPersistence();
      await this.#stayRepository.create(stay);
    }
  }

  private async persistProgress(progress: InpatientProgressSummary): Promise<void> {
    if (this.#progressRepository) {
      await this.#progressRepository.create(progress);
    }
  }

  private async persistOccurrence(occurrence: InpatientOccurrenceSummary): Promise<void> {
    if (this.#occurrenceRepository) {
      await this.#occurrenceRepository.create(occurrence);
    }
  }

  private async persistDailyCharge(charge: InpatientDailyChargeSummary): Promise<void> {
    if (this.#dailyChargeRepository) {
      await this.#dailyChargeRepository.create(charge);
    }
  }

  private async updateDailyCharge(charge: InpatientDailyChargeSummary): Promise<void> {
    if (this.#dailyChargeRepository) {
      await this.#dailyChargeRepository.update(charge);
    }
  }

  private async updateStay(stay: InpatientStaySummary): Promise<void> {
    if (this.#stayRepository) {
      await this.#stayRepository.update(stay);
    }
  }

  public admit(
    payload: CreateInpatientAdmissionRequest,
    expectedAccountId?: AccountId
  ): InpatientStaySummary {
    const encounter = this.#encounters.getOrThrow(payload.encounterId as never);
    if (expectedAccountId && encounter.accountId !== expectedAccountId) {
      throw new NotFoundError('Encounter not found', { encounterId: payload.encounterId });
    }
    if (payload.patientId !== encounter.patientId) {
      throw new ValidationError('Patient does not belong to encounter', {
        encounterId: encounter.id,
        patientId: payload.patientId
      });
    }
    const now = nowIso();
    const stay: InpatientStaySummary = {
      id: randomUUID() as InpatientStayId,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      unit: requireNonEmptyString(payload.unit, 'unit'),
      ward: requireNonEmptyString(payload.ward, 'ward'),
      bed: requireNonEmptyString(payload.bed, 'bed'),
      sectorId: payload.sectorId as SectorId | undefined,
      bedId: payload.bedId as BedId | undefined,
      status: 'admitted',
      admittedAt: now,
      updatedAt: now
    };
    this.#stays.set(stay.id, stay);
    this.#progress.set(stay.id, []);
    this.#occurrences.set(stay.id, []);
    this.#dailyCharges.set(stay.id, []);
    this.#enqueuePersist(
      async () => {
        await this.persistStay(stay);
        if (this.#sectorBedService && stay.bedId) {
          await this.#sectorBedService.setBedOccupied(stay.bedId);
        }
      },
      () => {
        this.#stays.delete(stay.id);
        this.#progress.delete(stay.id);
        this.#occurrences.delete(stay.id);
        this.#dailyCharges.delete(stay.id);
      }
    );
    return stay;
  }

  public async assignBed(
    stayId: InpatientStayId,
    payload: AssignBedRequest
  ): Promise<InpatientStaySummary> {
    const stay = this.getOrThrow(stayId);
    let targetBedName = stay.bed;

    if (stay.status === 'discharged') {
      throw new ValidationError('Cannot assign bed to discharged stay');
    }

    if (this.#sectorBedService) {
      const bed = await this.#sectorBedService.getBedOrThrow(payload.bedId as BedId);
      if (bed.sectorId !== payload.sectorId) {
        throw new ValidationError('Bed does not belong to the specified sector');
      }
      if (bed.status === 'occupied') {
        throw new ValidationError('Bed is already occupied');
      }
      targetBedName = bed.name;
      await this.#sectorBedService.setBedOccupied(payload.bedId as BedId);

      if (stay.bedId) {
        await this.#sectorBedService.setBedAvailable(stay.bedId);
      }
    }

    const now = nowIso();
    const updated: InpatientStaySummary = {
      ...stay,
      sectorId: payload.sectorId as SectorId,
      bedId: payload.bedId as BedId,
      bed: targetBedName,
      updatedAt: now
    };

    this.#stays.set(stayId, updated);
    this.#enqueuePersist(
      async () => {
        await this.updateStay(updated);
      },
      () => {
        this.#stays.set(stayId, stay);
      }
    );

    return updated;
  }

  public async transferBed(
    stayId: InpatientStayId,
    payload: AssignBedRequest
  ): Promise<InpatientStaySummary> {
    const stay = this.getOrThrow(stayId);
    let targetBedName = stay.bed;

    if (stay.status === 'discharged') {
      throw new ValidationError('Cannot transfer bed for discharged stay');
    }

    if (!this.isValidTransition(stay.status, 'transferred')) {
      throw new Error(`Invalid status transition from '${stay.status}' to 'transferred'`);
    }

    if (this.#sectorBedService) {
      const bed = await this.#sectorBedService.getBedOrThrow(payload.bedId as BedId);
      if (bed.sectorId !== payload.sectorId) {
        throw new ValidationError('Bed does not belong to the specified sector');
      }
      if (bed.status === 'occupied') {
        throw new ValidationError('Bed is already occupied');
      }
      targetBedName = bed.name;
      await this.#sectorBedService.setBedOccupied(payload.bedId as BedId);

      if (stay.bedId) {
        await this.#sectorBedService.setBedAvailable(stay.bedId);
      }
    }

    const now = nowIso();
    const updated: InpatientStaySummary = {
      ...stay,
      status: 'transferred',
      sectorId: payload.sectorId as SectorId,
      bedId: payload.bedId as BedId,
      bed: targetBedName,
      transferToSectorId: payload.sectorId as SectorId,
      transferToBedId: payload.bedId as BedId,
      updatedAt: now
    };

    this.#stays.set(stayId, updated);
    this.#enqueuePersist(
      async () => {
        await this.updateStay(updated);
      },
      () => {
        this.#stays.set(stayId, stay);
      }
    );

    return updated;
  }

  public list(filters?: string | InpatientStayListFilters): readonly InpatientStaySummary[] {
    const normalizedFilters =
      typeof filters === 'string' ? { encounterId: filters } : (filters ?? {});

    return Array.from(this.#stays.values()).filter((stay) => {
      if (normalizedFilters.accountId && stay.accountId !== normalizedFilters.accountId) {
        return false;
      }
      if (normalizedFilters.encounterId && stay.encounterId !== normalizedFilters.encounterId) {
        return false;
      }
      if (normalizedFilters.patientId && stay.patientId !== normalizedFilters.patientId) {
        return false;
      }
      if (!normalizedFilters.includeDischarged && stay.status === 'discharged') {
        return false;
      }
      return true;
    });
  }

  public getOrThrow(stayId: InpatientStayId): InpatientStaySummary {
    const stay = this.#stays.get(stayId);
    if (!stay) {
      throw new NotFoundError('Inpatient stay not found', { stayId });
    }

    return stay;
  }

  public getForAccountOrThrow(accountId: AccountId, stayId: InpatientStayId): InpatientStaySummary {
    const stay = this.getOrThrow(stayId);
    if (stay.accountId !== accountId) {
      throw new NotFoundError('Inpatient stay not found', { stayId });
    }
    return stay;
  }

  public addProgress(
    actorUserId: UserId,
    payload: AddInpatientProgressRequest
  ): InpatientProgressSummary {
    const stay = this.getOrThrow(payload.stayId as never);
    const progress: InpatientProgressSummary = {
      id: createCorrelationId('stayprog') as InpatientProgressId,
      accountId: stay.accountId,
      stayId: stay.id,
      encounterId: stay.encounterId,
      note: requireNonEmptyString(payload.note, 'note'),
      authoredByUserId: actorUserId,
      createdAt: nowIso()
    };
    const current = this.#progress.get(stay.id) ?? [];
    this.#progress.set(stay.id, [progress, ...current]);
    this.#enqueuePersist(
      async () => {
        await this.persistProgress(progress);
      },
      () => {
        this.#progress.set(stay.id, current);
      }
    );
    return progress;
  }

  public listProgress(stayId: InpatientStayId): readonly InpatientProgressSummary[] {
    this.getOrThrow(stayId);
    return [...(this.#progress.get(stayId) ?? [])];
  }

  public addOccurrence(
    actorUserId: UserId,
    payload: AddInpatientOccurrenceRequest
  ): InpatientOccurrenceSummary {
    const stay = this.getOrThrow(payload.stayId as never);

    if (stay.status === 'discharged') {
      throw new ValidationError('Cannot add occurrence to discharged stay');
    }

    const occurrence: InpatientOccurrenceSummary = {
      id: createCorrelationId('stayocc') as InpatientOccurrenceId,
      accountId: stay.accountId,
      stayId: stay.id,
      encounterId: stay.encounterId,
      type: payload.type,
      severity: payload.severity ?? 'info',
      title: requireNonEmptyString(payload.title, 'title'),
      description: requireNonEmptyString(payload.description, 'description'),
      authoredByUserId: actorUserId,
      createdAt: nowIso()
    };
    const current = this.#occurrences.get(stay.id) ?? [];
    this.#occurrences.set(stay.id, [occurrence, ...current]);
    this.#enqueuePersist(
      async () => {
        await this.persistOccurrence(occurrence);
      },
      () => {
        this.#occurrences.set(stay.id, current);
      }
    );
    return occurrence;
  }

  public listOccurrences(stayId: InpatientStayId): readonly InpatientOccurrenceSummary[] {
    this.getOrThrow(stayId);
    return [...(this.#occurrences.get(stayId) ?? [])];
  }

  public createDailyCharge(
    actorUserId: UserId,
    payload: CreateInpatientDailyChargeRequest
  ): InpatientDailyChargeSummary {
    const stay = this.getOrThrow(payload.stayId as never);

    if (stay.status === 'discharged') {
      throw new ValidationError('Cannot create daily charge for discharged stay');
    }

    const quantity = payload.quantity ?? 1;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ValidationError('quantity must be greater than zero');
    }
    if (!Number.isFinite(payload.unitAmount) || payload.unitAmount <= 0) {
      throw new ValidationError('unitAmount must be greater than zero');
    }

    const now = nowIso();
    const dailyCharge: InpatientDailyChargeSummary = {
      id: createCorrelationId('stayday') as InpatientDailyChargeId,
      accountId: stay.accountId,
      stayId: stay.id,
      encounterId: stay.encounterId,
      patientId: stay.patientId,
      description: requireNonEmptyString(payload.description, 'description'),
      chargeDate: payload.chargeDate ?? now.slice(0, 10),
      quantity,
      unitAmount: payload.unitAmount,
      totalAmount: Math.round(quantity * payload.unitAmount * 100) / 100,
      status: 'pending',
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now
    };
    const current = this.#dailyCharges.get(stay.id) ?? [];
    this.#dailyCharges.set(stay.id, [dailyCharge, ...current]);
    this.#enqueuePersist(
      async () => {
        await this.persistDailyCharge(dailyCharge);
      },
      () => {
        this.#dailyCharges.set(stay.id, current);
      }
    );
    return dailyCharge;
  }

  public listDailyCharges(stayId: InpatientStayId): readonly InpatientDailyChargeSummary[] {
    this.getOrThrow(stayId);
    return [...(this.#dailyCharges.get(stayId) ?? [])];
  }

  public listDailyChargeWorklist(
    filters?: InpatientDailyChargeWorklistFilters
  ): readonly InpatientDailyChargeWorklistItem[] {
    return Array.from(this.#dailyCharges.entries())
      .flatMap(([stayId, charges]) => {
        const stay = this.#stays.get(stayId);
        if (!stay) return [];
        return charges.map((charge) => ({
          ...charge,
          unit: stay.unit,
          ward: stay.ward,
          bed: stay.bed,
          stayStatus: stay.status
        }));
      })
      .filter((charge) => (filters?.status ? charge.status === filters.status : true))
      .filter((charge) => (filters?.accountId ? charge.accountId === filters.accountId : true))
      .filter((charge) => (filters?.unit ? charge.unit === filters.unit : true))
      .filter((charge) => (filters?.ward ? charge.ward === filters.ward : true))
      .sort((left, right) => {
        const statusOrder = left.status.localeCompare(right.status);
        if (statusOrder !== 0) return statusOrder;
        return left.chargeDate.localeCompare(right.chargeDate);
      });
  }

  public markDailyChargeBilled(
    stayId: InpatientStayId,
    chargeId: InpatientDailyChargeId,
    payload?: MarkInpatientDailyChargeBilledRequest
  ): InpatientDailyChargeSummary {
    this.getOrThrow(stayId);
    const charges = this.#dailyCharges.get(stayId) ?? [];
    const charge = charges.find((item) => item.id === chargeId);

    if (!charge) {
      throw new NotFoundError('Inpatient daily charge not found', { stayId, chargeId });
    }
    if (charge.status !== 'pending') {
      throw new ValidationError('Only pending daily charges can be billed');
    }

    const updated: InpatientDailyChargeSummary = {
      ...charge,
      status: 'billed',
      billingRecordId: payload?.billingRecordId,
      updatedAt: nowIso()
    };

    this.#dailyCharges.set(
      stayId,
      charges.map((item) => (item.id === chargeId ? updated : item))
    );
    this.#enqueuePersist(
      async () => {
        await this.updateDailyCharge(updated);
      },
      () => {
        this.#dailyCharges.set(stayId, charges);
      }
    );
    return updated;
  }

  public updateStatus(
    stayId: InpatientStayId,
    payload: UpdateInpatientStatusRequest
  ): InpatientStaySummary {
    const stay = this.getOrThrow(stayId);

    if (!this.isValidTransition(stay.status, payload.status)) {
      throw new Error(`Invalid status transition from '${stay.status}' to '${payload.status}'`);
    }

    if (payload.status === 'discharged' && !payload.dischargeReason?.trim()) {
      throw new ValidationError('dischargeReason is required when discharging inpatient stay');
    }

    if (
      payload.status === 'transferred' &&
      !payload.transferToUnit?.trim() &&
      !payload.transferToWard?.trim()
    ) {
      throw new ValidationError('transfer target is required when transferring inpatient stay');
    }

    const now = nowIso();
    const updated: InpatientStaySummary = {
      ...stay,
      status: payload.status,
      updatedAt: now,
      ...(payload.status === 'discharged' && {
        dischargedAt: now,
        dischargeReason: payload.dischargeReason
      }),
      ...(payload.status === 'transferred' && {
        transferToUnit: payload.transferToUnit,
        transferToWard: payload.transferToWard
      })
    };

    this.#stays.set(stayId, updated);
    this.#enqueuePersist(
      async () => {
        if (
          this.#sectorBedService &&
          stay.bedId &&
          (payload.status === 'discharged' || payload.status === 'transferred')
        ) {
          await this.#sectorBedService.setBedAvailable(stay.bedId);
        }
        await this.updateStay(updated);
      },
      () => {
        this.#stays.set(stayId, stay);
      }
    );
    return updated;
  }

  public buildHandoverPreview(filters?: {
    readonly accountId?: AccountId;
    readonly unit?: string;
    readonly ward?: string;
    readonly includeDischarged?: boolean;
  }): InpatientHandoverPreviewResponse {
    const includeDischarged = filters?.includeDischarged ?? false;
    const items = this.list({ accountId: filters?.accountId, includeDischarged })
      .filter((stay) => includeDischarged || stay.status !== 'discharged')
      .filter((stay) => !filters?.unit || stay.unit === filters.unit)
      .filter((stay) => !filters?.ward || stay.ward === filters.ward)
      .sort((left, right) => {
        const unitOrder = left.unit.localeCompare(right.unit);
        if (unitOrder !== 0) return unitOrder;
        const wardOrder = left.ward.localeCompare(right.ward);
        if (wardOrder !== 0) return wardOrder;
        return left.bed.localeCompare(right.bed);
      })
      .map((stay) => {
        const latestProgress = this.listProgress(stay.id)[0];
        const requiresAttention =
          stay.status === 'transferred' ||
          (latestProgress?.note.toLowerCase().includes('urg') ?? false) ||
          (latestProgress?.note.toLowerCase().includes('pend') ?? false);

        return {
          stayId: stay.id,
          encounterId: stay.encounterId,
          patientId: stay.patientId,
          unit: stay.unit,
          ward: stay.ward,
          bed: stay.bed,
          status: stay.status,
          latestProgressNote: latestProgress?.note ?? null,
          latestProgressAt: latestProgress?.createdAt ?? null,
          transferTarget: {
            unit: stay.transferToUnit ?? null,
            ward: stay.transferToWard ?? null
          },
          requiresAttention
        };
      });

    return {
      generatedAt: nowIso(),
      totalActiveStays: items.length,
      items
    };
  }
}
