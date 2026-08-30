import type {
  AccountId,
  DischargeId,
  DischargeSummary,
  EncounterId,
  UserId
} from '@cvg-his-v2/shared-types';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import type { DischargeRepository } from '../index.js';

function requireAccountId(accountId: AccountId): AccountId {
  return requireNonEmptyString(accountId as string, 'accountId') as AccountId;
}

export class InMemoryDischargeRepository implements DischargeRepository {
  readonly #discharges = new Map<DischargeId, DischargeSummary>();

  async create(discharge: DischargeSummary): Promise<void> {
    requireAccountId(discharge.accountId);
    this.#discharges.set(discharge.id, { ...discharge });
  }

  async update(discharge: DischargeSummary, expectedVersion?: number): Promise<void> {
    const scopedAccountId = requireAccountId(discharge.accountId);
    const current = this.#discharges.get(discharge.id);
    if (!current || current.accountId !== scopedAccountId) {
      throw new NotFoundError('Discharge not found', { dischargeId: discharge.id });
    }
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new ConflictError('Discharge version mismatch', {
        dischargeId: discharge.id,
        expectedVersion,
        currentVersion: current.version
      });
    }
    this.#discharges.set(discharge.id, { ...discharge });
  }

  async findById(accountId: AccountId, id: DischargeId): Promise<DischargeSummary | null> {
    const scopedAccountId = requireAccountId(accountId);
    const discharge = this.#discharges.get(id);
    return discharge?.accountId === scopedAccountId ? { ...discharge } : null;
  }

  async findByEncounterId(
    accountId: AccountId,
    encounterId: EncounterId
  ): Promise<DischargeSummary | null> {
    const scopedAccountId = requireAccountId(accountId);
    for (const discharge of this.#discharges.values()) {
      if (discharge.accountId === scopedAccountId && discharge.encounterId === encounterId) {
        return { ...discharge };
      }
    }
    return null;
  }

  async findByAccountId(accountId: AccountId): Promise<readonly DischargeSummary[]> {
    const scopedAccountId = requireAccountId(accountId);
    return Array.from(this.#discharges.values())
      .filter((d) => d.accountId === scopedAccountId)
      .map((d) => ({ ...d }));
  }

  async delete(accountId: AccountId, id: DischargeId): Promise<void> {
    const scopedAccountId = requireAccountId(accountId);
    const discharge = this.#discharges.get(id);
    if (discharge?.accountId === scopedAccountId) {
      this.#discharges.delete(id);
    }
  }
}
