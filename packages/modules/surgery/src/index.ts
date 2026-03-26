import { EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  CreateSurgeryCaseRequest,
  UpdateSurgeryStatusRequest
} from '@cvg-his-v2/shared-contracts';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { SurgeryCaseId, SurgeryCaseSummary } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { DatabaseSurgeryCaseRepository } from './repositories/database-surgery.repository.js';
import type { SurgeryCaseRepository } from './repositories/database-surgery.repository.js';

export type { SurgeryCaseRepository };
export { DatabaseSurgeryCaseRepository };

const VALID_SURGERY_TRANSITIONS: Record<string, readonly string[]> = {
  requested: ['pre_op', 'cancelled'],
  pre_op: ['in_progress', 'cancelled'],
  in_progress: ['recovery', 'cancelled'],
  recovery: ['completed'],
  completed: [],
  cancelled: []
};

export interface SurgeryServiceOptions {
  readonly surgeryCaseRepository?: SurgeryCaseRepository;
}

export class SurgeryService {
  readonly #encounters: EncountersService;
  readonly #cases = new Map<SurgeryCaseId, SurgeryCaseSummary>();
  readonly #repository?: SurgeryCaseRepository;
  #pendingPersist: Promise<void> = Promise.resolve();

  public constructor(encounters: EncountersService, options?: SurgeryServiceOptions) {
    this.#encounters = encounters;
    this.#repository = options?.surgeryCaseRepository;
  }

  private isValidTransition(currentStatus: string, newStatus: string): boolean {
    const allowed = VALID_SURGERY_TRANSITIONS[currentStatus];
    return allowed?.includes(newStatus) ?? false;
  }

  private async persistCase(surgeryCase: SurgeryCaseSummary): Promise<void> {
    const repo = this.#repository;
    if (repo) {
      this.#pendingPersist = this.#pendingPersist.then(async () => {
        const existing = await repo.findById(surgeryCase.id);
        if (existing) {
          await repo.update(surgeryCase);
        } else {
          await repo.create(surgeryCase);
        }
      });
      await this.#pendingPersist;
    }
  }

  private async updateCase(surgeryCase: SurgeryCaseSummary): Promise<void> {
    await this.persistCase(surgeryCase);
  }

  public requestCase(payload: CreateSurgeryCaseRequest): SurgeryCaseSummary {
    const encounter = this.#encounters.getOrThrow(payload.encounterId as never);
    const now = nowIso();
    const surgeryCase: SurgeryCaseSummary = {
      id: createCorrelationId('surg') as SurgeryCaseId,
      accountId: encounter.accountId,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      procedureName: requireNonEmptyString(payload.procedureName, 'procedureName'),
      status: 'requested',
      surgeonUserId: payload.surgeonUserId,
      surgicalTeam: payload.surgicalTeam,
      preparationNotes: payload.preparationNotes?.trim() || undefined,
      scheduledAt: payload.scheduledAt,
      createdAt: now,
      updatedAt: now
    };
    this.#cases.set(surgeryCase.id, surgeryCase);
    this.persistCase(surgeryCase).catch((err) =>
      console.error('Failed to persist surgery case:', err)
    );
    return surgeryCase;
  }

  public list(encounterId?: string): readonly SurgeryCaseSummary[] {
    return Array.from(this.#cases.values()).filter(
      (caseItem) => !encounterId || caseItem.encounterId === encounterId
    );
  }

  public getOrThrow(caseId: SurgeryCaseId): SurgeryCaseSummary {
    const caseItem = this.#cases.get(caseId);
    if (!caseItem) {
      throw new NotFoundError('Surgery case not found', { caseId });
    }

    return caseItem;
  }

  public updateStatus(
    caseId: SurgeryCaseId,
    payload: UpdateSurgeryStatusRequest
  ): SurgeryCaseSummary {
    const current = this.getOrThrow(caseId);

    if (!this.isValidTransition(current.status, payload.status)) {
      throw new Error(`Invalid status transition from '${current.status}' to '${payload.status}'`);
    }

    const now = nowIso();
    const updated: SurgeryCaseSummary = {
      ...current,
      status: payload.status,
      operativeNotes: payload.operativeNotes?.trim() || current.operativeNotes,
      updatedAt: now,
      ...(payload.status === 'in_progress' && !current.startedAt && { startedAt: now }),
      ...((payload.status === 'recovery' || payload.status === 'completed') &&
        !current.endedAt && { endedAt: now })
    };
    this.#cases.set(caseId, updated);
    this.updateCase(updated).catch((err) => console.error('Failed to update surgery case:', err));
    return updated;
  }
}
