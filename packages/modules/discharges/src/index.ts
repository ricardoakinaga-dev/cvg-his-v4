import type { CreateDischargeRequest, UpdateDischargeRequest } from '@cvg-his-v2/shared-contracts';
import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  DischargeId,
  DischargeSummary,
  EncounterId,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString, requireOptionalString } from '@cvg-his-v2/shared-validation';

export interface DischargeRepository {
  create(discharge: DischargeSummary): Promise<void>;
  update(discharge: DischargeSummary, expectedVersion?: number): Promise<void>;
  findById(accountId: AccountId, id: DischargeId): Promise<DischargeSummary | null>;
  findByEncounterId(
    accountId: AccountId,
    encounterId: EncounterId
  ): Promise<DischargeSummary | null>;
  findByAccountId(accountId: AccountId): Promise<readonly DischargeSummary[]>;
  delete(accountId: AccountId, id: DischargeId): Promise<void>;
}

export interface DischargesServiceOptions {
  readonly dischargeRepository?: DischargeRepository;
}

function requireAccountId(accountId: AccountId): AccountId {
  return requireNonEmptyString(accountId as string, 'accountId') as AccountId;
}

function cloneDischargeSummary(discharge: DischargeSummary): DischargeSummary {
  return { ...discharge };
}

export class DischargesService {
  readonly #discharges = new Map<DischargeId, DischargeSummary>();
  readonly #dischargeRepository?: DischargeRepository;
  readonly #useUuidIdentifiers: boolean;
  #pendingPersist: Promise<void> = Promise.resolve();
  #lastPersist: Promise<void> = Promise.resolve();

  public constructor(options: DischargesServiceOptions = {}) {
    this.#dischargeRepository = options.dischargeRepository;
    this.#useUuidIdentifiers = Boolean(options.dischargeRepository);
  }

  #nextId(): DischargeId {
    return (
      this.#useUuidIdentifiers ? randomUUID() : createCorrelationId('discharge')
    ) as DischargeId;
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    const scopedAccountId = requireAccountId(accountId);
    if (!this.#dischargeRepository) return;
    const persisted = await this.#dischargeRepository.findByAccountId(scopedAccountId);
    for (const discharge of persisted) {
      if (discharge.accountId === scopedAccountId) {
        this.#discharges.set(discharge.id, cloneDischargeSummary(discharge));
      }
    }
  }

  /**
   * Rebuild one tenant's hot cache from committed rows after a failed command.
   * The discharge route can update both the discharge and inpatient caches in
   * one tenant UoW; replacing the account slice prevents a rolled-back
   * discharge from remaining visible to a subsequent request.
   */
  public async refreshAccount(accountId: AccountId): Promise<void> {
    const scopedAccountId = requireAccountId(accountId);
    if (!this.#dischargeRepository) return;
    const persisted = await this.#dischargeRepository.findByAccountId(scopedAccountId);
    for (const [id, discharge] of this.#discharges) {
      if (discharge.accountId === scopedAccountId) {
        this.#discharges.delete(id);
      }
    }
    for (const discharge of persisted) {
      if (discharge.accountId === scopedAccountId) {
        this.#discharges.set(discharge.id, cloneDischargeSummary(discharge));
      }
    }
  }

  public async waitForPersistence(): Promise<void> {
    try {
      await this.#lastPersist;
    } finally {
      this.#pendingPersist = this.#pendingPersist.catch(() => undefined);
      this.#lastPersist = this.#pendingPersist;
    }
  }

  #enqueuePersist(operation: () => Promise<void>, rollback?: () => void): void {
    const pending = this.#pendingPersist
      .catch(() => undefined)
      .then(async () => {
        try {
          await operation();
        } catch (error) {
          rollback?.();
          throw error;
        }
      });
    this.#lastPersist = pending;
    this.#pendingPersist = pending;
  }

  public getById(accountId: AccountId, id: DischargeId): DischargeSummary {
    const scopedAccountId = requireAccountId(accountId);
    const discharge = this.#discharges.get(id);
    if (!discharge || discharge.accountId !== scopedAccountId) {
      throw new NotFoundError('Discharge not found', { dischargeId: id });
    }
    return cloneDischargeSummary(discharge);
  }

  public getByIdForAccount(accountId: AccountId, id: DischargeId): DischargeSummary {
    return this.getById(accountId, id);
  }

  public getByEncounterId(accountId: AccountId, encounterId: EncounterId): DischargeSummary | null {
    const scopedAccountId = requireAccountId(accountId);
    for (const discharge of this.#discharges.values()) {
      if (discharge.encounterId === encounterId && discharge.accountId === scopedAccountId) {
        return cloneDischargeSummary(discharge);
      }
    }
    return null;
  }

  public list(accountId: AccountId): readonly DischargeSummary[] {
    const scopedAccountId = requireAccountId(accountId);
    return Array.from(this.#discharges.values())
      .filter((d) => d.accountId === scopedAccountId)
      .map(cloneDischargeSummary);
  }

  public removeFromCache(accountId: AccountId, id: DischargeId): void {
    const scopedAccountId = requireAccountId(accountId);
    const discharge = this.#discharges.get(id);
    if (discharge?.accountId === scopedAccountId) {
      this.#discharges.delete(id);
    }
  }

  public create(
    accountId: AccountId,
    dischargedBy: UserId,
    payload: CreateDischargeRequest
  ): DischargeSummary {
    const scopedAccountId = requireAccountId(accountId);
    requireNonEmptyString(payload.encounterId, 'encounterId');
    requireNonEmptyString(payload.dischargeType, 'dischargeType');

    const encounterId = payload.encounterId as EncounterId;

    // Check for duplicate discharge per encounter
    const existing = this.getByEncounterId(scopedAccountId, encounterId);
    if (existing) {
      throw new ConflictError('Encounter already has a discharge', {
        dischargeId: existing.id,
        encounterId
      });
    }

    const now = nowIso();
    const discharge: DischargeSummary = {
      id: this.#nextId(),
      accountId: scopedAccountId,
      encounterId,
      dischargeType: payload.dischargeType,
      outcome: requireOptionalString(payload.outcome),
      clinicalSummary: requireOptionalString(payload.clinicalSummary),
      continuityInstructions: requireOptionalString(payload.continuityInstructions),
      followUpDate: requireOptionalString(payload.followUpDate),
      followUpNotes: requireOptionalString(payload.followUpNotes),
      dischargedBy,
      dischargedAt: now,
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    this.#discharges.set(discharge.id, discharge);

    if (this.#dischargeRepository) {
      this.#enqueuePersist(
        () => this.#dischargeRepository!.create(discharge),
        () => {
          if (this.#discharges.get(discharge.id) === discharge) {
            this.#discharges.delete(discharge.id);
          }
        }
      );
    }

    return cloneDischargeSummary(discharge);
  }

  public update(
    accountId: AccountId,
    id: DischargeId,
    payload: UpdateDischargeRequest,
    expectedVersion?: number
  ): DischargeSummary {
    const scopedAccountId = requireAccountId(accountId);
    const current = this.getById(scopedAccountId, id);

    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new ConflictError('Discharge version mismatch', {
        dischargeId: id,
        expectedVersion,
        currentVersion: current.version
      });
    }

    const updated: DischargeSummary = {
      ...current,
      outcome:
        payload.outcome !== undefined ? requireOptionalString(payload.outcome) : current.outcome,
      clinicalSummary:
        payload.clinicalSummary !== undefined
          ? requireOptionalString(payload.clinicalSummary)
          : current.clinicalSummary,
      continuityInstructions:
        payload.continuityInstructions !== undefined
          ? requireOptionalString(payload.continuityInstructions)
          : current.continuityInstructions,
      followUpDate:
        payload.followUpDate !== undefined
          ? requireOptionalString(payload.followUpDate)
          : current.followUpDate,
      followUpNotes:
        payload.followUpNotes !== undefined
          ? requireOptionalString(payload.followUpNotes)
          : current.followUpNotes,
      version: current.version + 1,
      updatedAt: nowIso()
    };

    this.#discharges.set(id, updated);

    if (this.#dischargeRepository) {
      this.#enqueuePersist(
        () => this.#dischargeRepository!.update(updated, current.version),
        () => {
          this.#discharges.set(id, current);
        }
      );
    }

    return cloneDischargeSummary(updated);
  }
}

export { DatabaseDischargeRepository } from './repositories/database-discharge.repository.js';
