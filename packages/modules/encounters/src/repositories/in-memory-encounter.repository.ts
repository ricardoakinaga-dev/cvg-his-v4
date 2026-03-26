import type {
  AccountId,
  EncounterId,
  EncounterSummary,
  PatientId,
  EncounterTimelineEventSummary
} from '@cvg-his-v2/shared-types';

export interface EncounterRepository {
  create(encounter: EncounterSummary): Promise<void>;
  update(encounter: EncounterSummary): Promise<void>;
  findById(id: EncounterId): Promise<EncounterSummary | null>;
  findActiveByPatientId(patientId: PatientId): Promise<EncounterSummary | null>;
  findAll(accountId: AccountId): Promise<readonly EncounterSummary[]>;
  findActive(accountId: AccountId): Promise<readonly EncounterSummary[]>;
  delete(id: EncounterId): Promise<void>;
}

export interface EncounterTimelineRepository {
  create(event: EncounterTimelineEventSummary): Promise<void>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly EncounterTimelineEventSummary[]>;
}

export class InMemoryEncounterRepository implements EncounterRepository {
  readonly #encounters = new Map<EncounterId, EncounterSummary>();

  async create(encounter: EncounterSummary): Promise<void> {
    this.#encounters.set(encounter.id, encounter);
  }

  async update(encounter: EncounterSummary): Promise<void> {
    if (!this.#encounters.has(encounter.id)) {
      throw new Error(`Encounter not found: ${encounter.id}`);
    }
    this.#encounters.set(encounter.id, encounter);
  }

  async findById(id: EncounterId): Promise<EncounterSummary | null> {
    return this.#encounters.get(id) ?? null;
  }

  async findActiveByPatientId(patientId: PatientId): Promise<EncounterSummary | null> {
    return (
      Array.from(this.#encounters.values()).find(
        (e) => e.patientId === patientId && e.status !== 'closed'
      ) ?? null
    );
  }

  async findAll(accountId: AccountId): Promise<readonly EncounterSummary[]> {
    return Array.from(this.#encounters.values()).filter((e) => e.accountId === accountId);
  }

  async findActive(accountId: AccountId): Promise<readonly EncounterSummary[]> {
    return Array.from(this.#encounters.values()).filter(
      (e) => e.accountId === accountId && e.status !== 'closed'
    );
  }

  async delete(id: EncounterId): Promise<void> {
    this.#encounters.delete(id);
  }

  clear(): void {
    this.#encounters.clear();
  }

  getAll(): readonly EncounterSummary[] {
    return Array.from(this.#encounters.values());
  }
}

export class InMemoryEncounterTimelineRepository implements EncounterTimelineRepository {
  readonly #timeline = new Map<EncounterId, EncounterTimelineEventSummary[]>();

  async create(event: EncounterTimelineEventSummary): Promise<void> {
    const existing = this.#timeline.get(event.encounterId) ?? [];
    existing.unshift(event);
    this.#timeline.set(event.encounterId, existing);
  }

  async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly EncounterTimelineEventSummary[]> {
    return this.#timeline.get(encounterId) ?? [];
  }

  clear(): void {
    this.#timeline.clear();
  }
}
