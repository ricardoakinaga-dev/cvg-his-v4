import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { medicalRecords, clinicalEntries, clinicalTimeline } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  ClinicalEntryId,
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  EncounterId,
  MedicalRecordId,
  MedicalRecordSummary,
  PatientId,
  UserId
} from '@cvg-his-v2/shared-types';
import type {
  MedicalRecordRepository,
  ClinicalEntryRepository,
  ClinicalTimelineRepository
} from '../index.js';

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
    const result = await this.#db
      .select()
      .from(medicalRecords)
      .where(eq(medicalRecords.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToRecord(row);
  }

  public async findByEncounterId(encounterId: EncounterId): Promise<MedicalRecordSummary | null> {
    const result = await this.#db
      .select()
      .from(medicalRecords)
      .where(eq(medicalRecords.encounterId, encounterId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToRecord(row);
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
      createdAt: new Date(entry.createdAt),
      updatedAt: new Date(entry.updatedAt)
    });
  }

  public async findByMedicalRecordId(
    medicalRecordId: MedicalRecordId
  ): Promise<readonly ClinicalEntrySummary[]> {
    const result = await this.#db
      .select()
      .from(clinicalEntries)
      .where(eq(clinicalEntries.medicalRecordId, medicalRecordId));

    return result.map((row) => ({
      id: row.id as ClinicalEntryId,
      accountId: row.accountId as AccountId,
      medicalRecordId: row.medicalRecordId as MedicalRecordId,
      encounterId: row.encounterId as EncounterId,
      patientId: row.patientId as never,
      entryType: row.entryType as ClinicalEntrySummary['entryType'],
      title: row.title,
      content: row.content,
      authoredByUserId: row.authorUserId as UserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }));
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
    const result = await this.#db
      .select()
      .from(clinicalTimeline)
      .where(eq(clinicalTimeline.medicalRecordId, medicalRecordId));

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
