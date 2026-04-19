import { EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  AddInpatientProgressRequest,
  CreateInpatientAdmissionRequest,
  InpatientHandoverPreviewResponse,
  UpdateInpatientStatusRequest,
  AssignBedRequest
} from '@cvg-his-v2/shared-contracts';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  InpatientProgressId,
  InpatientProgressSummary,
  InpatientStayId,
  InpatientStaySummary,
  UserId,
  SectorId,
  BedId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import {
  DatabaseInpatientStayRepository,
  DatabaseInpatientProgressRepository
} from './repositories/database-inpatient.repository.js';
import type {
  InpatientStayRepository,
  InpatientProgressRepository
} from './repositories/database-inpatient.repository.js';
import { SectorBedService } from './sector-bed.service.js';
import type { SectorBedServiceOptions } from './sector-bed.service.js';

export type { InpatientStayRepository, InpatientProgressRepository };
export { DatabaseInpatientStayRepository, DatabaseInpatientProgressRepository };
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
  readonly sectorBedService?: SectorBedService;
}

export class InpatientService {
  readonly #encounters: EncountersService;
  readonly #stays = new Map<InpatientStayId, InpatientStaySummary>();
  readonly #progress = new Map<InpatientStayId, InpatientProgressSummary[]>();
  readonly #stayRepository?: InpatientStayRepository;
  readonly #progressRepository?: InpatientProgressRepository;
  readonly #sectorBedService?: SectorBedService;
  #pendingPersist: Promise<void> = Promise.resolve();

  public constructor(encounters: EncountersService, options?: InpatientServiceOptions) {
    this.#encounters = encounters;
    this.#stayRepository = options?.stayRepository;
    this.#progressRepository = options?.progressRepository;
    this.#sectorBedService = options?.sectorBedService;
  }

  #enqueuePersist(operation: () => Promise<void>): void {
    this.#pendingPersist = this.#pendingPersist.then(operation).catch(() => {});
  }

  private isValidTransition(currentStatus: string, newStatus: string): boolean {
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
    return allowed?.includes(newStatus) ?? false;
  }

  private async persistStay(stay: InpatientStaySummary): Promise<void> {
    if (this.#stayRepository) {
      await this.#stayRepository.create(stay);
    }
  }

  private async persistProgress(progress: InpatientProgressSummary): Promise<void> {
    if (this.#progressRepository) {
      await this.#progressRepository.create(progress);
    }
  }

  private async updateStay(stay: InpatientStaySummary): Promise<void> {
    if (this.#stayRepository) {
      await this.#stayRepository.update(stay);
    }
  }

  public admit(payload: CreateInpatientAdmissionRequest): InpatientStaySummary {
    const encounter = this.#encounters.getOrThrow(payload.encounterId as never);
    const now = nowIso();
    const stay: InpatientStaySummary = {
      id: createCorrelationId('stay') as InpatientStayId,
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
    this.#enqueuePersist(async () => {
      await this.persistStay(stay);
      if (this.#sectorBedService && stay.bedId) {
        await this.#sectorBedService.setBedOccupied(stay.bedId);
      }
    });
    return stay;
  }

  public async assignBed(
    stayId: InpatientStayId,
    payload: AssignBedRequest
  ): Promise<InpatientStaySummary> {
    const stay = this.getOrThrow(stayId);

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
      updatedAt: now
    };

    this.#stays.set(stayId, updated);
    this.#enqueuePersist(async () => {
      await this.updateStay(updated);
    });

    return updated;
  }

  public async transferBed(
    stayId: InpatientStayId,
    payload: AssignBedRequest
  ): Promise<InpatientStaySummary> {
    const stay = this.getOrThrow(stayId);

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
      await this.#sectorBedService.setBedOccupied(payload.bedId as BedId);

      if (stay.bedId) {
        await this.#sectorBedService.setBedAvailable(stay.bedId);
      }
    }

    const now = nowIso();
    const updated: InpatientStaySummary = {
      ...stay,
      status: 'transferred',
      transferToSectorId: payload.sectorId as SectorId,
      transferToBedId: payload.bedId as BedId,
      updatedAt: now
    };

    this.#stays.set(stayId, updated);
    this.#enqueuePersist(async () => {
      await this.updateStay(updated);
    });

    return updated;
  }

  public list(encounterId?: string): readonly InpatientStaySummary[] {
    return Array.from(this.#stays.values()).filter(
      (stay) => !encounterId || stay.encounterId === encounterId
    );
  }

  public getOrThrow(stayId: InpatientStayId): InpatientStaySummary {
    const stay = this.#stays.get(stayId);
    if (!stay) {
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
    current.unshift(progress);
    this.#progress.set(stay.id, current);
    this.#enqueuePersist(async () => {
      await this.persistProgress(progress);
    });
    return progress;
  }

  public listProgress(stayId: InpatientStayId): readonly InpatientProgressSummary[] {
    this.getOrThrow(stayId);
    return [...(this.#progress.get(stayId) ?? [])];
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
    this.#enqueuePersist(async () => {
      if (
        this.#sectorBedService &&
        stay.bedId &&
        (payload.status === 'discharged' || payload.status === 'transferred')
      ) {
        await this.#sectorBedService.setBedAvailable(stay.bedId);
      }
      await this.updateStay(updated);
    });
    return updated;
  }

  public buildHandoverPreview(filters?: {
    readonly unit?: string;
    readonly ward?: string;
    readonly includeDischarged?: boolean;
  }): InpatientHandoverPreviewResponse {
    const includeDischarged = filters?.includeDischarged ?? false;
    const items = this.list()
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
          stay.status === 'transferred'
          || (latestProgress?.note.toLowerCase().includes('urg') ?? false)
          || (latestProgress?.note.toLowerCase().includes('pend') ?? false);

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
