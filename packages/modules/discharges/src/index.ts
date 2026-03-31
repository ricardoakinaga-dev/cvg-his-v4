import type { CreateDischargeRequest, UpdateDischargeRequest } from '@cvg-his-v2/shared-contracts';
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
  update(discharge: DischargeSummary): Promise<void>;
  findById(id: DischargeId): Promise<DischargeSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<DischargeSummary | null>;
  findByAccountId(accountId: AccountId): Promise<readonly DischargeSummary[]>;
  delete(id: DischargeId): Promise<void>;
}

export interface DischargesServiceOptions {
  readonly dischargeRepository?: DischargeRepository;
}

export class DischargesService {
  readonly #discharges = new Map<DischargeId, DischargeSummary>();
  readonly #dischargeRepository?: DischargeRepository;

  public constructor(options: DischargesServiceOptions = {}) {
    this.#dischargeRepository = options.dischargeRepository;
  }

  public getById(id: DischargeId): DischargeSummary {
    const discharge = this.#discharges.get(id);
    if (!discharge) {
      throw new NotFoundError('Discharge not found', { dischargeId: id });
    }
    return discharge;
  }

  public getByEncounterId(encounterId: EncounterId): DischargeSummary | null {
    for (const discharge of this.#discharges.values()) {
      if (discharge.encounterId === encounterId) {
        return discharge;
      }
    }
    return null;
  }

  public list(accountId: AccountId): readonly DischargeSummary[] {
    return Array.from(this.#discharges.values()).filter((d) => d.accountId === accountId);
  }

  public create(accountId: AccountId, dischargedBy: UserId, payload: CreateDischargeRequest): DischargeSummary {
    requireNonEmptyString(payload.encounterId, 'encounterId');
    requireNonEmptyString(payload.dischargeType, 'dischargeType');

    const encounterId = payload.encounterId as EncounterId;

    // Check for duplicate discharge per encounter
    const existing = this.getByEncounterId(encounterId);
    if (existing) {
      throw new ConflictError('Encounter already has a discharge', {
        dischargeId: existing.id,
        encounterId
      });
    }

    const now = nowIso();
    const discharge: DischargeSummary = {
      id: createCorrelationId('discharge') as DischargeId,
      accountId,
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
      this.#dischargeRepository.create(discharge).catch((err) => {
        console.error('Failed to persist discharge to database:', err);
      });
    }

    return discharge;
  }

  public update(id: DischargeId, payload: UpdateDischargeRequest, expectedVersion?: number): DischargeSummary {
    const current = this.getById(id);

    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new ConflictError('Discharge version mismatch', {
        dischargeId: id,
        expectedVersion,
        currentVersion: current.version
      });
    }

    const updated: DischargeSummary = {
      ...current,
      outcome: payload.outcome !== undefined ? requireOptionalString(payload.outcome) : current.outcome,
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
      this.#dischargeRepository.update(updated).catch((err) => {
        console.error('Failed to update discharge in database:', err);
      });
    }

    return updated;
  }
}

export { DatabaseDischargeRepository } from './repositories/database-discharge.repository.js';
