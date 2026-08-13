import type {
  AccountId,
  DischargeId,
  DischargeSummary,
  EncounterId,
  UserId
} from '@cvg-his-v2/shared-types';
import type { DischargeRepository } from '../index.js';

export class InMemoryDischargeRepository implements DischargeRepository {
  readonly #discharges = new Map<DischargeId, DischargeSummary>();

  async create(discharge: DischargeSummary): Promise<void> {
    this.#discharges.set(discharge.id, { ...discharge });
  }

  async update(discharge: DischargeSummary): Promise<void> {
    this.#discharges.set(discharge.id, { ...discharge });
  }

  async findById(id: DischargeId): Promise<DischargeSummary | null> {
    const discharge = this.#discharges.get(id);
    return discharge ? { ...discharge } : null;
  }

  async findByEncounterId(encounterId: EncounterId): Promise<DischargeSummary | null> {
    for (const discharge of this.#discharges.values()) {
      if (discharge.encounterId === encounterId) {
        return { ...discharge };
      }
    }
    return null;
  }

  async findByAccountId(accountId: AccountId): Promise<readonly DischargeSummary[]> {
    return Array.from(this.#discharges.values())
      .filter((discharge) => discharge.accountId === accountId)
      .map((discharge) => ({ ...discharge }));
  }

  async delete(id: DischargeId): Promise<void> {
    this.#discharges.delete(id);
  }
}
