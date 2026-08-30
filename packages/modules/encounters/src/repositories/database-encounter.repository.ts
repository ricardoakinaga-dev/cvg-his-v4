import { eq, and, ne, desc, sql } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { encounters, encounterTimeline } from '@cvg-his-v2/shared-database';
import { ConflictError } from '@cvg-his-v2/shared-errors';
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
import { requireAccountId } from '@cvg-his-v2/tenant-context';

const ACTIVE_ENCOUNTER_UNIQUE_CONSTRAINT = 'uidx_encounters_one_active_per_patient';

function isActiveEncounterUniqueViolation(error: unknown, seen = new Set<object>()): boolean {
  if (typeof error !== 'object' || error === null || seen.has(error)) {
    return false;
  }
  seen.add(error);

  const databaseError = error as {
    readonly code?: unknown;
    readonly constraint?: unknown;
    readonly cause?: unknown;
  };
  if (
    databaseError.code === '23505' &&
    databaseError.constraint === ACTIVE_ENCOUNTER_UNIQUE_CONSTRAINT
  ) {
    return true;
  }

  return isActiveEncounterUniqueViolation(databaseError.cause, seen);
}

function mapEncounterPersistenceError(error: unknown, patientId: PatientId): unknown {
  if (isActiveEncounterUniqueViolation(error)) {
    return new ConflictError('Patient already has an active encounter', { patientId });
  }

  return error;
}

export interface EncounterRepository {
  create(encounter: EncounterSummary): Promise<void>;
  update(encounter: EncounterSummary): Promise<void>;
  updateForReopen?(encounter: EncounterSummary): Promise<void>;
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
    const accountId = requireAccountId();
    if (encounter.accountId !== accountId) {
      throw new Error('Encounter account does not match tenant context');
    }
    try {
      const result = await this.#db.execute(sql`
        INSERT INTO encounters (
          id, account_id, owner_id, patient_id, status, opened_by_user_id,
          closed_by_user_id, opened_at, closed_at, close_reason, reason,
          created_at, updated_at
        )
        SELECT
          ${encounter.id},
          ${encounter.accountId},
          ${encounter.ownerId},
          ${encounter.patientId},
          ${encounter.status === 'closed' ? 'closed' : 'open'},
          ${encounter.createdByUserId},
          ${encounter.status === 'closed' ? encounter.createdByUserId : null},
          ${new Date(encounter.openedAt)},
          ${encounter.closedAt ? new Date(encounter.closedAt) : null},
          ${encounter.closeReason ?? null},
          ${encounter.reason},
          ${new Date(encounter.openedAt)},
          ${new Date(encounter.updatedAt)}
        WHERE ${sql`EXISTS (
          SELECT 1 FROM owners owner_record
           WHERE owner_record.id = ${encounter.ownerId}
             AND owner_record.account_id = ${accountId}
             AND COALESCE(owner_record.address_json ->> 'status', 'active') = 'active'
        )`}
          AND ${sql`EXISTS (
          SELECT 1 FROM patients patient_record
           WHERE patient_record.id = ${encounter.patientId}
             AND patient_record.account_id = ${accountId}
             AND COALESCE(patient_record.alerts_json ->> 'status', 'active') = 'active'
        )`}
        RETURNING id
      `);
      if (result.rowCount !== 1) {
        throw new ConflictError('Cannot open an encounter for an inactive owner or patient', {
          ownerId: encounter.ownerId,
          patientId: encounter.patientId
        });
      }
    } catch (error) {
      throw mapEncounterPersistenceError(error, encounter.patientId);
    }
  }

  public async update(encounter: EncounterSummary): Promise<void> {
    const accountId = requireAccountId();
    if (encounter.accountId !== accountId) {
      throw new Error('Encounter account does not match tenant context');
    }
    try {
      await this.#db
        .update(encounters)
        .set({
          status: encounter.status === 'closed' ? 'closed' : 'open',
          closedByUserId: encounter.status === 'closed' ? encounter.createdByUserId : null,
          closedAt: encounter.closedAt ? new Date(encounter.closedAt) : null,
          closeReason: encounter.closeReason ?? null,
          reason: encounter.reason,
          updatedAt: new Date(encounter.updatedAt)
        })
        .where(and(eq(encounters.id, encounter.id), eq(encounters.accountId, accountId)));
    } catch (error) {
      throw mapEncounterPersistenceError(error, encounter.patientId);
    }
  }

  public async updateForReopen(encounter: EncounterSummary): Promise<void> {
    const accountId = requireAccountId();
    if (encounter.accountId !== accountId) {
      throw new Error('Encounter account does not match tenant context');
    }

    try {
      const result = await this.#db.execute(sql`
        UPDATE encounters
           SET status = 'open',
               closed_by_user_id = NULL,
               closed_at = NULL,
               close_reason = NULL,
               reason = ${encounter.reason},
               updated_at = ${new Date(encounter.updatedAt)}
         WHERE id = ${encounter.id}
           AND account_id = ${accountId}
           AND EXISTS (
             SELECT 1 FROM owners owner_record
              WHERE owner_record.id = ${encounter.ownerId}
                AND owner_record.account_id = ${accountId}
                AND COALESCE(owner_record.address_json ->> 'status', 'active') = 'active'
           )
           AND EXISTS (
             SELECT 1 FROM patients patient_record
              WHERE patient_record.id = ${encounter.patientId}
                AND patient_record.account_id = ${accountId}
                AND COALESCE(patient_record.alerts_json ->> 'status', 'active') = 'active'
           )
         RETURNING id
      `);
      if (result.rowCount !== 1) {
        throw new ConflictError('Cannot reopen an encounter for an inactive owner or patient', {
          ownerId: encounter.ownerId,
          patientId: encounter.patientId,
          encounterId: encounter.id
        });
      }
    } catch (error) {
      throw mapEncounterPersistenceError(error, encounter.patientId);
    }
  }

  public async findById(id: EncounterId): Promise<EncounterSummary | null> {
    const accountId = requireAccountId();
    const result = await this.#db
      .select()
      .from(encounters)
      .where(and(eq(encounters.id, id), eq(encounters.accountId, accountId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToEncounter(row);
  }

  public async findActiveByPatientId(patientId: PatientId): Promise<EncounterSummary | null> {
    const accountId = requireAccountId();
    const result = await this.#db
      .select()
      .from(encounters)
      .where(
        and(
          eq(encounters.patientId, patientId),
          eq(encounters.accountId, accountId),
          ne(encounters.status, 'closed')
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToEncounter(row);
  }

  public async findAll(accountId: AccountId): Promise<readonly EncounterSummary[]> {
    if (requireAccountId() !== accountId) return [];
    const result = await this.#db
      .select()
      .from(encounters)
      .where(eq(encounters.accountId, accountId));

    return result.map((row) => this.mapRowToEncounter(row));
  }

  public async findActive(accountId: AccountId): Promise<readonly EncounterSummary[]> {
    if (requireAccountId() !== accountId) return [];
    const result = await this.#db
      .select()
      .from(encounters)
      .where(and(eq(encounters.accountId, accountId), ne(encounters.status, 'closed')));

    return result.map((row) => this.mapRowToEncounter(row));
  }

  public async delete(id: EncounterId): Promise<void> {
    const accountId = requireAccountId();
    await this.#db
      .delete(encounters)
      .where(and(eq(encounters.id, id), eq(encounters.accountId, accountId)));
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
      closeReason: row.closeReason ?? undefined
    };
  }
}

export class DatabaseEncounterTimelineRepository implements EncounterTimelineRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(event: EncounterTimelineEventSummary): Promise<void> {
    const accountId = requireAccountId();
    if (event.accountId !== accountId) {
      throw new Error('Encounter timeline account does not match tenant context');
    }
    await this.#db.insert(encounterTimeline).values({
      id: event.id,
      accountId: event.accountId,
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
    const accountId = requireAccountId();
    const result = await this.#db
      .select()
      .from(encounterTimeline)
      .where(
        and(
          eq(encounterTimeline.encounterId, encounterId),
          eq(encounterTimeline.accountId, accountId)
        )
      )
      .orderBy(desc(encounterTimeline.occurredAt));

    return result.map((row) => ({
      id: row.id as EncounterTimelineEventId,
      accountId: row.accountId as AccountId,
      encounterId: row.encounterId as EncounterId,
      occurredAt: row.occurredAt.toISOString(),
      eventType: row.eventType as EncounterTimelineEventSummary['eventType'],
      summary: row.summary ?? '',
      actorUserId: (row.actorUserId ?? 'system') as UserId
    }));
  }
}
