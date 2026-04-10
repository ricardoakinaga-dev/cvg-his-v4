import { eq, and, ne } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { encounters, encounterTimeline } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  EncounterId,
  EncounterSummary,
  EncounterTimelineEventId,
  EncounterTimelineEventSummary,
  OwnerId,
  PatientId,
  UserId
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

export class DatabaseEncounterRepository implements EncounterRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(encounter: EncounterSummary): Promise<void> {
    await this.#db.insert(encounters).values({
      id: encounter.id,
      accountId: encounter.accountId,
      ownerId: encounter.ownerId,
      patientId: encounter.patientId,
      status: encounter.status === 'closed' ? 'closed' : 'open',
      openedByUserId: encounter.createdByUserId,
      closedByUserId: encounter.status === 'closed' ? encounter.createdByUserId : null,
      openedAt: new Date(encounter.openedAt),
      closedAt: encounter.closedAt ? new Date(encounter.closedAt) : null,
      reason: encounter.reason,
      createdAt: new Date(encounter.openedAt),
      updatedAt: new Date(encounter.updatedAt)
    });
  }

  public async update(encounter: EncounterSummary): Promise<void> {
    await this.#db
      .update(encounters)
      .set({
        status: encounter.status === 'closed' ? 'closed' : 'open',
        closedByUserId: encounter.status === 'closed' ? encounter.createdByUserId : null,
        closedAt: encounter.closedAt ? new Date(encounter.closedAt) : null,
        reason: encounter.reason,
        updatedAt: new Date(encounter.updatedAt)
      })
      .where(eq(encounters.id, encounter.id));
  }

  public async findById(id: EncounterId): Promise<EncounterSummary | null> {
    const result = await this.#db.select().from(encounters).where(eq(encounters.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToEncounter(row);
  }

  public async findActiveByPatientId(patientId: PatientId): Promise<EncounterSummary | null> {
    const result = await this.#db
      .select()
      .from(encounters)
      .where(and(eq(encounters.patientId, patientId), ne(encounters.status, 'closed')))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToEncounter(row);
  }

  public async findAll(accountId: AccountId): Promise<readonly EncounterSummary[]> {
    const result = await this.#db
      .select()
      .from(encounters)
      .where(eq(encounters.accountId, accountId));

    return result.map((row) => this.mapRowToEncounter(row));
  }

  public async findActive(accountId: AccountId): Promise<readonly EncounterSummary[]> {
    const result = await this.#db
      .select()
      .from(encounters)
      .where(and(eq(encounters.accountId, accountId), ne(encounters.status, 'closed')));

    return result.map((row) => this.mapRowToEncounter(row));
  }

  public async delete(id: EncounterId): Promise<void> {
    await this.#db.delete(encounters).where(eq(encounters.id, id));
  }

  private mapRowToEncounter(row: typeof encounters.$inferSelect): EncounterSummary {
    const visitType: 'walk_in' | 'scheduled' | 'return' = 'walk_in';
    return {
      id: row.id as EncounterId,
      accountId: row.accountId as AccountId,
      patientId: row.patientId as PatientId,
      ownerId: row.ownerId as OwnerId,
      appointmentId: undefined,
      queueEntryId: undefined,
      visitType,
      origin: 'reception',
      reason: row.reason ?? '',
      status: (row.status === 'closed' ? 'closed' : 'reception') as
        | 'reception'
        | 'in_triage'
        | 'in_care'
        | 'observation'
        | 'closed',
      openedAt: row.openedAt.toISOString(),
      createdByUserId: row.openedByUserId as UserId,
      updatedAt: row.updatedAt.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      closeReason: undefined
    };
  }
}

export class DatabaseEncounterTimelineRepository implements EncounterTimelineRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(event: EncounterTimelineEventSummary): Promise<void> {
    await this.#db.insert(encounterTimeline).values({
      id: event.id,
      encounterId: event.encounterId,
      eventType: event.eventType,
      summary: event.summary,
      actorUserId: event.actorUserId,
      metadata: null,
      occurredAt: new Date(event.occurredAt)
    });
  }

  public async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly EncounterTimelineEventSummary[]> {
    const result = await this.#db
      .select()
      .from(encounterTimeline)
      .where(eq(encounterTimeline.encounterId, encounterId));

    return result.map((row) => ({
      id: row.id as EncounterTimelineEventId,
      accountId: 'acc_cvg_demo' as AccountId,
      encounterId: row.encounterId as EncounterId,
      occurredAt: row.occurredAt.toISOString(),
      eventType: row.eventType as EncounterTimelineEventSummary['eventType'],
      summary: row.summary ?? '',
      actorUserId: (row.actorUserId ?? 'system') as UserId
    }));
  }
}
