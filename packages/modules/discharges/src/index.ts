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

  public async getById(
    id: DischargeId,
    expectedAccountId?: AccountId
  ): Promise<DischargeSummary> {
    const discharge = this.#dischargeRepository
      ? await this.#dischargeRepository.findById(id)
      : (this.#discharges.get(id) ?? null);
    if (!discharge) {
      throw new NotFoundError('Discharge not found', { dischargeId: id });
    }
    if (expectedAccountId && discharge.accountId !== expectedAccountId) {
      throw new NotFoundError('Discharge not found', { dischargeId: id });
    }
    return { ...discharge };
  }

  public async getByEncounterId(
    encounterId: EncounterId,
    expectedAccountId?: AccountId
  ): Promise<DischargeSummary | null> {
    if (this.#dischargeRepository) {
      const discharge = await this.#dischargeRepository.findByEncounterId(encounterId);
      return discharge && (!expectedAccountId || discharge.accountId === expectedAccountId)
        ? { ...discharge }
        : null;
    }
    for (const discharge of this.#discharges.values()) {
      if (
        discharge.encounterId === encounterId &&
        (!expectedAccountId || discharge.accountId === expectedAccountId)
      ) {
        return { ...discharge };
      }
    }
    return null;
  }

  public async list(accountId: AccountId): Promise<readonly DischargeSummary[]> {
    const discharges = this.#dischargeRepository
      ? await this.#dischargeRepository.findByAccountId(accountId)
      : Array.from(this.#discharges.values()).filter(
          (discharge) => discharge.accountId === accountId
        );
    return discharges.map((discharge) => ({ ...discharge }));
  }

  public async create(
    accountId: AccountId,
    dischargedBy: UserId,
    payload: CreateDischargeRequest
  ): Promise<DischargeSummary> {
    requireNonEmptyString(payload.encounterId, 'encounterId');
    requireNonEmptyString(payload.dischargeType, 'dischargeType');

    const encounterId = payload.encounterId as EncounterId;

    // Check for duplicate discharge per encounter
    const existing = await this.getByEncounterId(encounterId, accountId);
    if (existing) {
      throw new ConflictError('Encounter already has a discharge', {
        dischargeId: existing.id,
        encounterId
      });
    }

    const followUpDate = requireOptionalString(payload.followUpDate);
    validateOptionalDate(followUpDate, 'followUpDate');
    const now = nowIso();
    const discharge: DischargeSummary = {
      id: createCorrelationId('discharge') as DischargeId,
      accountId,
      encounterId,
      dischargeType: payload.dischargeType,
      outcome: requireOptionalString(payload.outcome),
      clinicalSummary: requireOptionalString(payload.clinicalSummary),
      continuityInstructions: requireOptionalString(payload.continuityInstructions),
      followUpDate,
      followUpNotes: requireOptionalString(payload.followUpNotes),
      dischargedBy,
      dischargedAt: now,
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    if (this.#dischargeRepository) {
      await this.#dischargeRepository.create(discharge);
    }
    this.#discharges.set(discharge.id, { ...discharge });

    return { ...discharge };
  }

  public async update(
    id: DischargeId,
    payload: UpdateDischargeRequest,
    expectedVersion?: number,
    expectedAccountId?: AccountId
  ): Promise<DischargeSummary> {
    const current = await this.getById(id, expectedAccountId);

    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new ConflictError('Discharge version mismatch', {
        dischargeId: id,
        expectedVersion,
        currentVersion: current.version
      });
    }

    const followUpDate =
      payload.followUpDate !== undefined
        ? requireOptionalString(payload.followUpDate)
        : current.followUpDate;
    validateOptionalDate(followUpDate, 'followUpDate');
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
      followUpDate,
      followUpNotes:
        payload.followUpNotes !== undefined
          ? requireOptionalString(payload.followUpNotes)
          : current.followUpNotes,
      version: current.version + 1,
      updatedAt: nowIso()
    };

    if (this.#dischargeRepository) {
      await this.#dischargeRepository.update(updated);
    }
    this.#discharges.set(id, { ...updated });

    return { ...updated };
  }
}

function validateOptionalDate(value: string | undefined, field: string): void {
  if (value !== undefined && Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`${field} must be a valid ISO date`);
  }
}

export { DatabaseDischargeRepository } from './repositories/database-discharge.repository.js';
