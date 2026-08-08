import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import {
  medicalRecords,
  clinicalEntries,
  clinicalTimeline,
  entryRevisions
} from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  ClinicalEntryId,
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  EncounterId,
  EntryRevisionSummary,
  MedicalRecordId,
  MedicalRecordSummary,
  PatientId,
  UserId
} from '@cvg-his-v2/shared-types';
import type {
  MedicalRecordRepository,
  ClinicalEntryRepository,
  ClinicalTimelineRepository,
  EntryRevisionRepository
} from '../index.js';

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: unknown };
  return candidate.code === '42P01';
}

function isInvalidUuidSyntaxError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  return (
    candidate.code === '22P02' &&
    typeof candidate.message === 'string' &&
    candidate.message.includes('invalid input syntax for type uuid')
  );
}

function allowSchemaCompatibilityFallback(): boolean {
  if (process.env.DATABASE_ALLOW_SCHEMA_COMPATIBILITY === '1') return true;
  return process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
}

export class DatabaseMedicalRecordRepository implements MedicalRecordRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(record: MedicalRecordSummary): Promise<void> {
    await this.#db.insert(medicalRecords).values({
      id: record.id,
      accountId: record.accountId,
      encounterId: record.encounterId,
      patientId: record.patientId,
      status: record.status,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt)
    });
  }

  public async update(record: MedicalRecordSummary): Promise<void> {
    await this.#db
      .update(medicalRecords)
      .set({
        status: record.status,
        updatedAt: new Date(record.updatedAt)
      })
      .where(eq(medicalRecords.id, record.id));
  }

  public async findById(id: MedicalRecordId): Promise<MedicalRecordSummary | null> {
    let result: typeof medicalRecords.$inferSelect[];
    try {
      result = await this.#db
        .select()
        .from(medicalRecords)
        .where(eq(medicalRecords.id, id))
        .limit(1);
    } catch (error) {
      if (allowSchemaCompatibilityFallback() && isMissingRelationError(error)) {
        return null;
      }
      throw error;
    }

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToRecord(row);
  }

  public async findByEncounterId(encounterId: EncounterId): Promise<MedicalRecordSummary | null> {
    let result: typeof medicalRecords.$inferSelect[];
    try {
      result = await this.#db
        .select()
        .from(medicalRecords)
        .where(eq(medicalRecords.encounterId, encounterId))
        .limit(1);
    } catch (error) {
      if (
        allowSchemaCompatibilityFallback() &&
        (isMissingRelationError(error) || isInvalidUuidSyntaxError(error))
      ) {
        return null;
      }
      throw error;
    }

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToRecord(row);
  }

  public async findAll(accountId: AccountId): Promise<readonly MedicalRecordSummary[]> {
    let result: typeof medicalRecords.$inferSelect[];
    try {
      result = await this.#db
        .select()
        .from(medicalRecords)
        .where(eq(medicalRecords.accountId, accountId));
    } catch (error) {
      if (allowSchemaCompatibilityFallback() && isMissingRelationError(error)) {
        return [];
      }
      throw error;
    }

    return result.map((row) => this.mapRowToRecord(row));
  }

  private mapRowToRecord(row: typeof medicalRecords.$inferSelect): MedicalRecordSummary {
    return {
      id: row.id as MedicalRecordId,
      accountId: row.accountId as AccountId,
      encounterId: row.encounterId as EncounterId,
      patientId: row.patientId as PatientId,
      status: row.status as 'open' | 'completed',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}

export class DatabaseClinicalEntryRepository implements ClinicalEntryRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(entry: ClinicalEntrySummary): Promise<void> {
    await this.#db.insert(clinicalEntries).values({
      id: entry.id,
      accountId: entry.accountId,
      medicalRecordId: entry.medicalRecordId,
      encounterId: entry.encounterId,
      patientId: entry.patientId,
      authorUserId: entry.authoredByUserId,
      entryType: entry.entryType,
      title: entry.title,
      content: entry.content,
      version: entry.version,
      deletedAt: entry.deletedAt ? new Date(entry.deletedAt) : null,
      deletedByUserId: entry.deletedByUserId ?? null,
      deleteReason: entry.deleteReason ?? null,
      createdAt: new Date(entry.createdAt),
      updatedAt: new Date(entry.updatedAt)
    });
  }

  public async update(entry: ClinicalEntrySummary): Promise<void> {
    await this.#db
      .update(clinicalEntries)
      .set({
        title: entry.title,
        content: entry.content,
        version: entry.version,
        deletedAt: entry.deletedAt ? new Date(entry.deletedAt) : null,
        deletedByUserId: entry.deletedByUserId ?? null,
        deleteReason: entry.deleteReason ?? null,
        updatedAt: new Date(entry.updatedAt)
      })
      .where(eq(clinicalEntries.id, entry.id));
  }

  public async findById(entryId: ClinicalEntryId): Promise<ClinicalEntrySummary | null> {
    let result: typeof clinicalEntries.$inferSelect[];
    try {
      result = await this.#db
        .select()
        .from(clinicalEntries)
        .where(eq(clinicalEntries.id, entryId))
        .limit(1);
    } catch (error) {
      if (allowSchemaCompatibilityFallback() && isMissingRelationError(error)) {
        return null;
      }
      throw error;
    }

    if (result.length === 0) return null;
    return this.mapRow(result[0]);
  }

  public async findByMedicalRecordId(
    medicalRecordId: MedicalRecordId
  ): Promise<readonly ClinicalEntrySummary[]> {
    let result: typeof clinicalEntries.$inferSelect[];
    try {
      result = await this.#db
        .select()
        .from(clinicalEntries)
        .where(eq(clinicalEntries.medicalRecordId, medicalRecordId));
    } catch (error) {
      if (allowSchemaCompatibilityFallback() && isMissingRelationError(error)) {
        return [];
      }
      throw error;
    }

    return result.map((row) => this.mapRow(row));
  }

  private mapRow(row: typeof clinicalEntries.$inferSelect): ClinicalEntrySummary {
    return {
      id: row.id as ClinicalEntryId,
      accountId: row.accountId as AccountId,
      medicalRecordId: row.medicalRecordId as MedicalRecordId,
      encounterId: row.encounterId as EncounterId,
      patientId: row.patientId as PatientId,
      entryType: row.entryType as ClinicalEntrySummary['entryType'],
      title: row.title,
      content: row.content,
      authoredByUserId: row.authorUserId as UserId,
      version: row.version,
      deletedAt: row.deletedAt?.toISOString(),
      deletedByUserId: (row.deletedByUserId ?? undefined) as UserId | undefined,
      deleteReason: row.deleteReason ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}

export class DatabaseClinicalTimelineRepository implements ClinicalTimelineRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(event: ClinicalTimelineEventSummary): Promise<void> {
    await this.#db.insert(clinicalTimeline).values({
      id: event.id,
      accountId: event.accountId,
      medicalRecordId: event.medicalRecordId,
      encounterId: event.encounterId,
      eventType: event.eventType,
      summary: event.summary ?? null,
      actorUserId: event.actorUserId,
      clinicalEntryId: event.clinicalEntryId ?? null,
      attachmentId: event.attachmentId ?? null,
      occurredAt: new Date(event.occurredAt)
    });
  }

  public async findByMedicalRecordId(
    medicalRecordId: MedicalRecordId
  ): Promise<readonly ClinicalTimelineEventSummary[]> {
    let result: typeof clinicalTimeline.$inferSelect[];
    try {
      result = await this.#db
        .select()
        .from(clinicalTimeline)
        .where(eq(clinicalTimeline.medicalRecordId, medicalRecordId));
    } catch (error) {
      if (allowSchemaCompatibilityFallback() && isMissingRelationError(error)) {
        return [];
      }
      throw error;
    }

    return result.map((row: typeof clinicalTimeline.$inferSelect) => ({
      id: row.id as ClinicalTimelineEventSummary['id'],
      accountId: row.accountId as AccountId,
      medicalRecordId: row.medicalRecordId as MedicalRecordId,
      encounterId: row.encounterId as EncounterId,
      eventType: row.eventType as ClinicalTimelineEventSummary['eventType'],
      summary: row.summary ?? '',
      actorUserId: (row.actorUserId ?? 'system') as UserId,
      clinicalEntryId: (row.clinicalEntryId ?? undefined) as never,
      attachmentId: (row.attachmentId ?? undefined) as never,
      occurredAt: row.occurredAt.toISOString()
    }));
  }
}

export class DatabaseEntryRevisionRepository implements EntryRevisionRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(revision: EntryRevisionSummary): Promise<void> {
    await this.#db.insert(entryRevisions).values({
      id: revision.id as string,
      entryId: revision.entryId as string,
      version: revision.version,
      title: revision.title,
      content: revision.content,
      authorUserId: revision.authorUserId as string,
      reason: revision.reason ?? null,
      createdAt: new Date(revision.createdAt)
    });
  }

  public async findByEntryId(entryId: ClinicalEntryId): Promise<readonly EntryRevisionSummary[]> {
    let result: typeof entryRevisions.$inferSelect[];
    try {
      result = await this.#db
        .select()
        .from(entryRevisions)
        .where(eq(entryRevisions.entryId, entryId));
    } catch (error) {
      if (allowSchemaCompatibilityFallback() && isMissingRelationError(error)) {
        return [];
      }
      throw error;
    }

    return result.map((row: typeof entryRevisions.$inferSelect) => ({
      id: row.id as never,
      entryId: row.entryId as ClinicalEntryId,
      version: row.version,
      title: row.title,
      content: row.content,
      authorUserId: row.authorUserId as UserId,
      reason: row.reason ?? undefined,
      createdAt: row.createdAt.toISOString()
    }));
  }
}
