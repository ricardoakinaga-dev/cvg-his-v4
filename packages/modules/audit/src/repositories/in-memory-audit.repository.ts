import type { AccountId, AuditEventId, AuditEventSummary } from '@cvg-his-v2/shared-types';

export interface AuditRepository {
  create(event: AuditEventSummary): Promise<void>;
  list(accountId?: AccountId, limit?: number): Promise<readonly AuditEventSummary[]>;
  findById(id: AuditEventId): Promise<AuditEventSummary | null>;
}

export class InMemoryAuditRepository implements AuditRepository {
  readonly #events: AuditEventSummary[] = [];

  async create(event: AuditEventSummary): Promise<void> {
    this.#events.unshift(event);
  }

  async list(accountId?: AccountId, limit = 100): Promise<readonly AuditEventSummary[]> {
    const filtered = accountId
      ? this.#events.filter((e) => e.accountId === accountId)
      : this.#events;
    return filtered.slice(0, limit);
  }

  async findById(id: AuditEventId): Promise<AuditEventSummary | null> {
    return this.#events.find((e) => e.eventId === id) ?? null;
  }

  // Helper for testing
  clear(): void {
    this.#events.length = 0;
  }

  getAll(): readonly AuditEventSummary[] {
    return [...this.#events];
  }
}
