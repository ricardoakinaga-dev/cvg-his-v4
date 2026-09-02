import { randomUUID } from 'node:crypto';
import { EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  CreateSurgeryCaseRequest,
  UpdateSurgeryStatusRequest
} from '@cvg-his-v2/shared-contracts';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, SurgeryCaseId, SurgeryCaseSummary } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';
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

  public async hydrateAccount(accountId: string): Promise<void> {
    if (!this.#repository) return;
    const cases = await this.#repository.findByAccountId(accountId as never);
    for (const surgeryCase of cases) {
      this.#cases.set(surgeryCase.id, surgeryCase);
    }
  }

  private isValidTransition(currentStatus: string, newStatus: string): boolean {
    const allowed = VALID_SURGERY_TRANSITIONS[currentStatus];
    return allowed?.includes(newStatus) ?? false;
  }

  private getEncounterForAccount(accountId: AccountId, encounterId: string) {
    const encounter = this.#encounters.getOrThrow(accountId, encounterId as never);
    if (encounter.accountId !== accountId) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }
    return encounter;
  }

  private getCaseForAccount(accountId: AccountId, caseId: SurgeryCaseId): SurgeryCaseSummary {
    const caseItem = this.#cases.get(caseId);
    if (!caseItem || caseItem.accountId !== accountId) {
      throw new NotFoundError('Surgery case not found', { caseId });
    }
    return caseItem;
  }

  private enqueuePersist(surgeryCase: SurgeryCaseSummary, rollback: () => void): void {
    const repo = this.#repository;
    if (repo) {
      this.#pendingPersist = this.#pendingPersist
        .catch(() => undefined)
        .then(async () => {
          const existing = await repo.findById(surgeryCase.id);
          if (existing) {
            await repo.update(surgeryCase);
          } else {
            await repo.create(surgeryCase);
          }
        });
      void this.#pendingPersist.catch(() => rollback());
    }
  }

  public async waitForPersistence(): Promise<void> {
    await this.#pendingPersist;
  }

  public requestCase(accountId: AccountId, payload: CreateSurgeryCaseRequest): SurgeryCaseSummary {
    const encounter = this.getEncounterForAccount(accountId, payload.encounterId);
    const now = nowIso();
    const surgeryCase: SurgeryCaseSummary = {
      id: randomUUID() as SurgeryCaseId,
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
    this.enqueuePersist(surgeryCase, () => {
      if (this.#cases.get(surgeryCase.id) === surgeryCase) {
        this.#cases.delete(surgeryCase.id);
      }
    });
    return surgeryCase;
  }

  public list(accountId: AccountId, encounterId?: string): readonly SurgeryCaseSummary[] {
    return Array.from(this.#cases.values()).filter(
      (caseItem) =>
        caseItem.accountId === accountId && (!encounterId || caseItem.encounterId === encounterId)
    );
  }

  public getOrThrow(accountId: AccountId, caseId: SurgeryCaseId): SurgeryCaseSummary {
    return this.getCaseForAccount(accountId, caseId);
  }

  public updateStatus(
    accountId: AccountId,
    caseId: SurgeryCaseId,
    payload: UpdateSurgeryStatusRequest
  ): SurgeryCaseSummary {
    const current = this.getOrThrow(accountId, caseId);

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
    this.enqueuePersist(updated, () => {
      if (this.#cases.get(caseId) === updated) {
        this.#cases.set(caseId, current);
      }
    });
    return updated;
  }
}
