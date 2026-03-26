import { EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  AddInpatientProgressRequest,
  CreateInpatientAdmissionRequest,
  UpdateInpatientStatusRequest
} from '@cvg-his-v2/shared-contracts';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  InpatientProgressId,
  InpatientProgressSummary,
  InpatientStayId,
  InpatientStaySummary,
  UserId
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

export type { InpatientStayRepository, InpatientProgressRepository };
export { DatabaseInpatientStayRepository, DatabaseInpatientProgressRepository };

const VALID_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  admitted: ['stable', 'transferred', 'discharged'],
  stable: ['admitted', 'transferred', 'discharged'],
  transferred: ['admitted'],
  discharged: []
};

export interface InpatientServiceOptions {
  readonly stayRepository?: InpatientStayRepository;
  readonly progressRepository?: InpatientProgressRepository;
}

export class InpatientService {
  readonly #encounters: EncountersService;
  readonly #stays = new Map<InpatientStayId, InpatientStaySummary>();
  readonly #progress = new Map<InpatientStayId, InpatientProgressSummary[]>();
  readonly #stayRepository?: InpatientStayRepository;
  readonly #progressRepository?: InpatientProgressRepository;
  #pendingPersist: Promise<void> = Promise.resolve();

  public constructor(encounters: EncountersService, options?: InpatientServiceOptions) {
    this.#encounters = encounters;
    this.#stayRepository = options?.stayRepository;
    this.#progressRepository = options?.progressRepository;
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
      status: 'admitted',
      admittedAt: now,
      updatedAt: now
    };
    this.#stays.set(stay.id, stay);
    this.#progress.set(stay.id, []);
    this.#enqueuePersist(async () => {
      await this.persistStay(stay);
    });
    return stay;
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
      await this.updateStay(updated);
    });
    return updated;
  }
}
