import { eq } from 'drizzle-orm';
import { EncountersService } from '@cvg-his-v2/module-encounters';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  ArchiveClinicalEntryRequest,
  CreateClinicalEntryRequest,
  UpdateClinicalEntryRequest
} from '@cvg-his-v2/shared-contracts';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
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
import {
  clinicalEntries,
  clinicalTimeline,
  medicalRecords,
  withTenantTransaction
} from '@cvg-his-v2/shared-database';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isDatabaseAccountId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export {
  DatabaseMedicalRecordRepository,
  DatabaseClinicalEntryRepository,
  DatabaseClinicalTimelineRepository,
  DatabaseEntryRevisionRepository
} from './repositories/database-medical-records.repository.js';

export interface MedicalRecordRepository {
  create(record: MedicalRecordSummary): Promise<void>;
  update(record: MedicalRecordSummary): Promise<void>;
  findById(id: MedicalRecordId): Promise<MedicalRecordSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<MedicalRecordSummary | null>;
  findAll(accountId: AccountId): Promise<readonly MedicalRecordSummary[]>;
}

export interface ClinicalEntryRepository {
  create(entry: ClinicalEntrySummary): Promise<void>;
  update(entry: ClinicalEntrySummary): Promise<void>;
  findByMedicalRecordId(medicalRecordId: MedicalRecordId): Promise<readonly ClinicalEntrySummary[]>;
  findById(entryId: ClinicalEntryId): Promise<ClinicalEntrySummary | null>;
}

export interface ClinicalTimelineRepository {
  create(event: ClinicalTimelineEventSummary): Promise<void>;
  findByMedicalRecordId(
    medicalRecordId: MedicalRecordId
  ): Promise<readonly ClinicalTimelineEventSummary[]>;
}

export interface EntryRevisionRepository {
  create(revision: EntryRevisionSummary): Promise<void>;
  findByEntryId(entryId: ClinicalEntryId): Promise<readonly EntryRevisionSummary[]>;
}

export interface MedicalRecordsServiceOptions {
  readonly encounters: EncountersService;
  readonly patients: PatientsService;
  readonly medicalRecordRepository?: MedicalRecordRepository;
  readonly clinicalEntryRepository?: ClinicalEntryRepository;
  readonly clinicalTimelineRepository?: ClinicalTimelineRepository;
  readonly entryRevisionRepository?: EntryRevisionRepository;
}

export class MedicalRecordsService {
  readonly #encounters: EncountersService;
  readonly #patients: PatientsService;
  readonly #medicalRecordRepository?: MedicalRecordRepository;
  readonly #clinicalEntryRepository?: ClinicalEntryRepository;
  readonly #clinicalTimelineRepository?: ClinicalTimelineRepository;
  readonly #entryRevisionRepository?: EntryRevisionRepository;

  // In-memory fallback stores
  readonly #records = new Map<MedicalRecordId, MedicalRecordSummary>();
  readonly #recordByEncounterId = new Map<EncounterId, MedicalRecordId>();
  readonly #entries = new Map<MedicalRecordId, ClinicalEntrySummary[]>();
  readonly #timeline = new Map<MedicalRecordId, ClinicalTimelineEventSummary[]>();
  readonly #revisions = new Map<ClinicalEntryId, EntryRevisionSummary[]>();
  #pendingPersist: Promise<void> = Promise.resolve();
  #lastPersist: Promise<void> = Promise.resolve();

  public constructor(options: MedicalRecordsServiceOptions) {
    this.#encounters = options.encounters;
    this.#patients = options.patients;
    this.#medicalRecordRepository = options.medicalRecordRepository;
    this.#clinicalEntryRepository = options.clinicalEntryRepository;
    this.#clinicalTimelineRepository = options.clinicalTimelineRepository;
    this.#entryRevisionRepository = options.entryRevisionRepository;
  }

  public async waitForPersistence(): Promise<void> {
    try {
      await this.#lastPersist;
    } finally {
      this.#pendingPersist = this.#pendingPersist.catch(() => {});
      this.#lastPersist = this.#pendingPersist;
    }
  }

  /**
   * Rebuilds one tenant's hot medical-record cache from committed rows.
   *
   * Cross-domain commands can persist their source aggregate before a
   * clinical timeline projection fails. The surrounding tenant transaction
   * rolls the database back, but the projection queue may already have
   * created a record in memory. Rehydrating after rollback prevents the next
   * retry from treating that uncommitted record as canonical.
   */
  public async refreshAccount(accountId: AccountId): Promise<void> {
    if (!this.#medicalRecordRepository) return;

    await this.#pendingPersist.catch(() => undefined);
    const records = await this.#medicalRecordRepository.findAll(accountId);
    const nextRecordIds = new Set(records.map((record) => record.id));
    const nextEntries = new Map<MedicalRecordId, ClinicalEntrySummary[]>();
    const nextTimeline = new Map<MedicalRecordId, ClinicalTimelineEventSummary[]>();

    await Promise.all(
      records.map(async (record) => {
        const [entries, timeline] = await Promise.all([
          this.#clinicalEntryRepository?.findByMedicalRecordId(record.id) ?? Promise.resolve([]),
          this.#clinicalTimelineRepository?.findByMedicalRecordId(record.id) ?? Promise.resolve([])
        ]);
        nextEntries.set(record.id, [...entries]);
        nextTimeline.set(record.id, [...timeline]);
      })
    );

    const staleRecordIds = new Set<MedicalRecordId>();
    for (const [recordId, cached] of this.#records) {
      if (cached.accountId === accountId && !nextRecordIds.has(recordId)) {
        staleRecordIds.add(recordId);
      }
    }
    for (const [encounterId, recordId] of this.#recordByEncounterId) {
      if (staleRecordIds.has(recordId)) {
        this.#recordByEncounterId.delete(encounterId);
      }
    }
    for (const recordId of staleRecordIds) {
      this.#records.delete(recordId);
      this.#entries.delete(recordId);
      this.#timeline.delete(recordId);
    }

    for (const record of records) {
      this.#records.set(record.id, record);
      this.#recordByEncounterId.set(record.encounterId, record.id);
      this.#entries.set(record.id, nextEntries.get(record.id) ?? []);
      this.#timeline.set(record.id, nextTimeline.get(record.id) ?? []);
    }
  }

  #enqueuePersist(operation: () => Promise<void>, rollback?: () => void): void {
    const pending = this.#pendingPersist.then(async () => {
      try {
        await operation();
      } catch (error) {
        rollback?.();
        throw error;
      }
    });
    this.#lastPersist = pending;
    // A failed best-effort event must not poison every subsequent write in
    // the same runtime. The operation-specific promise remains available via
    // #lastPersist so callers can observe its failure, while the queue itself
    // advances from a recovered promise.
    this.#pendingPersist = pending.catch(() => {});
  }

  #assertEncounterWritable(encounterId: EncounterId): void {
    const encounter = this.#encounters.getOrThrow(encounterId);
    if (encounter.status === 'closed') {
      throw new ValidationError('Closed encounter is read-only', { encounterId });
    }
  }

  public ensureRecord(encounterId: EncounterId): MedicalRecordSummary {
    const existingId = this.#recordByEncounterId.get(encounterId);
    if (existingId) {
      return this.getRecordOrThrow(existingId);
    }

    this.#assertEncounterWritable(encounterId);
    const encounter = this.#encounters.getOrThrow(encounterId);
    this.#patients.getOrThrow(encounter.patientId);
    const now = nowIso();
    const record: MedicalRecordSummary = {
      id: createCorrelationId('mr') as MedicalRecordId,
      accountId: encounter.accountId,
      encounterId,
      patientId: encounter.patientId,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };

    this.#records.set(record.id, record);
    this.#recordByEncounterId.set(encounterId, record.id);
    this.#entries.set(record.id, []);

    if (this.#medicalRecordRepository) {
      this.#enqueuePersist(
        async () => {
          await this.#medicalRecordRepository!.create(record);
        },
        () => {
          if (this.#records.get(record.id) === record) {
            this.#records.delete(record.id);
          }
          if (this.#recordByEncounterId.get(encounterId) === record.id) {
            this.#recordByEncounterId.delete(encounterId);
          }
          this.#entries.delete(record.id);
          this.#timeline.delete(record.id);
        }
      );
    }

    this.appendTimeline(record.id, {
      accountId: record.accountId,
      encounterId: record.encounterId,
      eventType: 'record_created',
      summary: 'Medical record created for encounter',
      actorUserId: encounter.createdByUserId
    });
    return record;
  }

  /**
   * Persists a new clinical entry and its timeline effects in one tenant
   * transaction. The legacy addEntry API remains available for in-memory
   * callers, while the canonical PostgreSQL runtime uses this command to
   * avoid a record/entry/timeline partial write.
   */
  public async createEntryAtomically(
    actorUserId: UserId,
    payload: CreateClinicalEntryRequest
  ): Promise<ClinicalEntrySummary> {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    this.#assertEncounterWritable(encounterId);
    const encounter = this.#encounters.getOrThrow(encounterId);
    const patient = this.#patients.getOrThrow(patientId);
    if (encounter.patientId !== patientId || patient.accountId !== encounter.accountId) {
      throw new NotFoundError('Encounter does not match patient', { encounterId, patientId });
    }

    // GET/read flows may create a record lazily and enqueue its database write
    // before the user submits the first clinical entry. Wait for that queue to
    // settle before loading the record, otherwise the transaction can update a
    // not-yet-inserted record and fail its integrity trigger.
    await this.#pendingPersist;
    let record = await this.#loadRecordByEncounterId(encounterId);
    const recordWasCreated = !record;
    if (record?.status === 'completed') {
      throw new ValidationError('Completed medical record is read-only', { encounterId });
    }

    const now = nowIso();
    record ??= {
      id: createCorrelationId('mr') as MedicalRecordId,
      accountId: encounter.accountId,
      encounterId,
      patientId,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };

    const title = requireNonEmptyString(payload.title, 'title');
    const content = requireNonEmptyString(payload.content, 'content');
    if (title.length > 255 || content.length > 10000) {
      throw new ValidationError('Clinical entry exceeds the supported size', {
        titleMaxLength: 255,
        contentMaxLength: 10000
      });
    }

    const entry: ClinicalEntrySummary = {
      id: createCorrelationId('entry') as ClinicalEntryId,
      accountId: record.accountId,
      medicalRecordId: record.id,
      encounterId,
      patientId,
      entryType: payload.entryType,
      title,
      content,
      authoredByUserId: actorUserId,
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    const recordCreatedEvent: ClinicalTimelineEventSummary = {
      id: createCorrelationId('cln') as never,
      accountId: record.accountId,
      medicalRecordId: record.id,
      encounterId,
      eventType: 'record_created',
      summary: 'Medical record created for encounter',
      actorUserId: encounter.createdByUserId,
      occurredAt: now
    };
    const entryEvent: ClinicalTimelineEventSummary = {
      id: createCorrelationId('cln') as never,
      accountId: record.accountId,
      medicalRecordId: record.id,
      encounterId,
      clinicalEntryId: entry.id,
      eventType: 'entry_added',
      summary: `${entry.entryType} added: ${entry.title}`,
      actorUserId,
      occurredAt: now
    };

    const hasCanonicalRepositories = Boolean(
      this.#medicalRecordRepository &&
      this.#clinicalEntryRepository &&
      this.#clinicalTimelineRepository &&
      isDatabaseAccountId(record.accountId)
    );
    if (!hasCanonicalRepositories) {
      const fallbackEntry = this.addEntry(actorUserId, payload);
      await this.waitForPersistence();
      return fallbackEntry;
    }

    await withTenantTransaction(record.accountId, async (transaction) => {
      if (recordWasCreated) {
        await transaction.insert(medicalRecords).values({
          id: record!.id,
          accountId: record!.accountId,
          encounterId: record!.encounterId,
          patientId: record!.patientId,
          status: record!.status,
          createdAt: new Date(record!.createdAt),
          updatedAt: new Date(record!.updatedAt)
        });
      } else {
        await transaction
          .update(medicalRecords)
          .set({ updatedAt: new Date(now) })
          .where(eq(medicalRecords.id, record!.id));
      }

      await transaction.insert(clinicalEntries).values({
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
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt)
      });

      if (recordWasCreated) {
        await transaction.insert(clinicalTimeline).values({
          id: recordCreatedEvent.id,
          accountId: recordCreatedEvent.accountId,
          medicalRecordId: recordCreatedEvent.medicalRecordId,
          encounterId: recordCreatedEvent.encounterId,
          eventType: recordCreatedEvent.eventType,
          summary: recordCreatedEvent.summary,
          actorUserId: recordCreatedEvent.actorUserId,
          clinicalEntryId: null,
          attachmentId: null,
          occurredAt: new Date(recordCreatedEvent.occurredAt)
        });
      }

      await transaction.insert(clinicalTimeline).values({
        id: entryEvent.id,
        accountId: entryEvent.accountId,
        medicalRecordId: entryEvent.medicalRecordId,
        encounterId: entryEvent.encounterId,
        eventType: entryEvent.eventType,
        summary: entryEvent.summary,
        actorUserId: entryEvent.actorUserId,
        clinicalEntryId: entryEvent.clinicalEntryId,
        attachmentId: null,
        occurredAt: new Date(entryEvent.occurredAt)
      });
    });

    const updatedRecord: MedicalRecordSummary = { ...record, updatedAt: now };
    this.#records.set(updatedRecord.id, updatedRecord);
    this.#recordByEncounterId.set(encounterId, updatedRecord.id);
    this.#entries.set(updatedRecord.id, [entry, ...(this.#entries.get(updatedRecord.id) ?? [])]);
    this.#timeline.set(updatedRecord.id, [
      entryEvent,
      ...(recordWasCreated ? [recordCreatedEvent] : []),
      ...(this.#timeline.get(updatedRecord.id) ?? [])
    ]);
    return entry;
  }

  async #loadRecordById(recordId: MedicalRecordId): Promise<MedicalRecordSummary | null> {
    const cached = this.#records.get(recordId);
    if (cached) {
      return cached;
    }

    if (!this.#medicalRecordRepository) {
      return null;
    }

    const record = await this.#medicalRecordRepository.findById(recordId);
    if (!record) {
      return null;
    }

    this.#records.set(record.id, record);
    this.#recordByEncounterId.set(record.encounterId, record.id);
    return record;
  }

  async #loadRecordByEncounterId(encounterId: EncounterId): Promise<MedicalRecordSummary | null> {
    const cachedId = this.#recordByEncounterId.get(encounterId);
    if (cachedId) {
      return this.#records.get(cachedId) ?? null;
    }

    if (!this.#medicalRecordRepository) {
      return null;
    }

    const record = await this.#medicalRecordRepository.findByEncounterId(encounterId);
    if (!record) {
      return null;
    }

    this.#records.set(record.id, record);
    this.#recordByEncounterId.set(encounterId, record.id);
    return record;
  }

  public getRecordByEncounterOrThrow(encounterId: EncounterId): MedicalRecordSummary {
    return this.ensureRecord(encounterId);
  }

  public async getRecordByEncounterOrThrowAsync(
    encounterId: EncounterId
  ): Promise<MedicalRecordSummary> {
    const loaded = await this.#loadRecordByEncounterId(encounterId);
    if (loaded) {
      return loaded;
    }

    return this.ensureRecord(encounterId);
  }

  public getRecordOrThrow(recordId: MedicalRecordId): MedicalRecordSummary {
    const record = this.#records.get(recordId);
    if (!record) {
      throw new NotFoundError('Medical record not found', { recordId });
    }

    return record;
  }

  public async getRecordOrThrowAsync(recordId: MedicalRecordId): Promise<MedicalRecordSummary> {
    const loaded = await this.#loadRecordById(recordId);
    if (!loaded) {
      throw new NotFoundError('Medical record not found', { recordId });
    }

    return loaded;
  }

  public async getEntryOrThrowAsync(entryId: ClinicalEntryId): Promise<ClinicalEntrySummary> {
    if (this.#clinicalEntryRepository) {
      const entry = await this.#clinicalEntryRepository.findById(entryId);
      if (entry) {
        const record = await this.#loadRecordById(entry.medicalRecordId);
        if (!record) {
          throw new NotFoundError('Medical record not found for clinical entry', {
            entryId,
            medicalRecordId: entry.medicalRecordId
          });
        }
        const entries = await this.#clinicalEntryRepository.findByMedicalRecordId(record.id);
        this.#entries.set(record.id, [...entries]);
        return entry;
      }
    } else {
      for (const entries of this.#entries.values()) {
        const entry = entries.find((candidate) => candidate.id === entryId);
        if (entry) return entry;
      }
    }
    throw new NotFoundError('Clinical entry not found', { entryId });
  }

  public addEntry(actorUserId: UserId, payload: CreateClinicalEntryRequest): ClinicalEntrySummary {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    this.#assertEncounterWritable(encounterId);
    const record = this.ensureRecord(encounterId);
    const encounter = this.#encounters.getOrThrow(encounterId);
    if (encounter.patientId !== patientId) {
      throw new NotFoundError('Encounter does not match patient', {
        encounterId,
        patientId
      });
    }

    const now = nowIso();
    const entry: ClinicalEntrySummary = {
      id: createCorrelationId('entry') as ClinicalEntryId,
      accountId: record.accountId,
      medicalRecordId: record.id,
      encounterId,
      patientId,
      entryType: payload.entryType,
      title: requireNonEmptyString(payload.title, 'title'),
      content: requireNonEmptyString(payload.content, 'content'),
      authoredByUserId: actorUserId,
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    const currentEntries = this.#entries.get(record.id) ?? [];
    currentEntries.unshift(entry);
    this.#entries.set(record.id, currentEntries);
    this.#records.set(record.id, {
      ...record,
      updatedAt: now
    });

    const entryEvent = this.appendTimeline(
      record.id,
      {
        accountId: record.accountId,
        encounterId,
        clinicalEntryId: entry.id,
        eventType: 'entry_added',
        summary: `${entry.entryType} added: ${entry.title}`,
        actorUserId
      },
      false
    );

    if (this.#clinicalEntryRepository) {
      this.#enqueuePersist(
        async () => {
          await this.#clinicalEntryRepository!.create(entry);
          await this.#clinicalTimelineRepository?.create(entryEvent);
        },
        () => {
          const entries = this.#entries.get(record.id) ?? [];
          this.#entries.set(
            record.id,
            entries.filter((item) => item.id !== entry.id)
          );
          const events = this.#timeline.get(record.id) ?? [];
          this.#timeline.set(
            record.id,
            events.filter((item) => item.id !== entryEvent.id)
          );
        }
      );
    } else if (this.#clinicalTimelineRepository) {
      this.#enqueuePersist(
        () => this.#clinicalTimelineRepository!.create(entryEvent),
        () => {
          const events = this.#timeline.get(record.id) ?? [];
          this.#timeline.set(
            record.id,
            events.filter((item) => item.id !== entryEvent.id)
          );
        }
      );
    }
    return entry;
  }

  public updateEntry(
    actorUserId: UserId,
    entryId: ClinicalEntryId,
    payload: UpdateClinicalEntryRequest
  ): ClinicalEntrySummary {
    let foundRecordId: MedicalRecordId | undefined;
    let foundEntry: ClinicalEntrySummary | undefined;
    let entryIndex = -1;

    for (const [recordId, entries] of this.#entries) {
      const idx = entries.findIndex((e) => e.id === entryId);
      if (idx !== -1) {
        foundRecordId = recordId;
        foundEntry = entries[idx];
        entryIndex = idx;
        break;
      }
    }

    if (!foundEntry || !foundRecordId) {
      throw new NotFoundError('Clinical entry not found', { entryId });
    }

    this.#assertEncounterWritable(foundEntry.encounterId);

    if (foundEntry.deletedAt) {
      throw new ValidationError('Archived clinical entry cannot be updated', { entryId });
    }

    if (payload.expectedVersion !== undefined && payload.expectedVersion !== foundEntry.version) {
      throw new ValidationError('Clinical entry version mismatch', {
        entryId,
        expectedVersion: payload.expectedVersion,
        currentVersion: foundEntry.version
      });
    }

    const now = nowIso();
    const newVersion = foundEntry.version + 1;
    const newTitle = payload.title ?? foundEntry.title;
    const newContent = payload.content ?? foundEntry.content;

    const revision: EntryRevisionSummary = {
      id: createCorrelationId('rev') as never,
      entryId,
      version: foundEntry.version,
      title: foundEntry.title,
      content: foundEntry.content,
      authorUserId: foundEntry.authoredByUserId,
      reason: payload.reason ?? 'Updated',
      createdAt: now
    };

    const entryRevisions = this.#revisions.get(entryId) ?? [];
    entryRevisions.push(revision);
    this.#revisions.set(entryId, entryRevisions);

    if (this.#entryRevisionRepository) {
      this.#enqueuePersist(
        async () => {
          await this.#entryRevisionRepository!.create(revision);
        },
        () => {
          this.#revisions.set(
            entryId,
            entryRevisions.filter((item) => item.id !== revision.id)
          );
        }
      );
    }

    const updatedEntry: ClinicalEntrySummary = {
      ...foundEntry,
      title: newTitle,
      content: newContent,
      version: newVersion,
      updatedAt: now
    };

    const entries = this.#entries.get(foundRecordId)!;
    entries[entryIndex] = updatedEntry;
    this.#entries.set(foundRecordId, entries);

    if (this.#clinicalEntryRepository) {
      this.#enqueuePersist(
        async () => {
          await this.#clinicalEntryRepository!.update(updatedEntry);
        },
        () => {
          const currentEntries = this.#entries.get(foundRecordId!) ?? [];
          const currentIndex = currentEntries.findIndex((item) => item.id === entryId);
          if (currentIndex !== -1) {
            currentEntries[currentIndex] = foundEntry!;
            this.#entries.set(foundRecordId!, currentEntries);
          }
        }
      );
    }

    const record = this.#records.get(foundRecordId)!;
    this.#records.set(foundRecordId, { ...record, updatedAt: now });

    this.appendTimeline(foundRecordId, {
      accountId: record.accountId,
      encounterId: record.encounterId,
      clinicalEntryId: entryId,
      eventType: 'entry_updated',
      summary: `Entry v${foundEntry.version} updated to v${newVersion}: ${newTitle}`,
      actorUserId
    });

    return updatedEntry;
  }

  public archiveEntry(
    actorUserId: UserId,
    entryId: ClinicalEntryId,
    payload: ArchiveClinicalEntryRequest
  ): ClinicalEntrySummary {
    let foundRecordId: MedicalRecordId | undefined;
    let foundEntry: ClinicalEntrySummary | undefined;
    let entryIndex = -1;

    for (const [recordId, entries] of this.#entries) {
      const idx = entries.findIndex((entry) => entry.id === entryId);
      if (idx !== -1) {
        foundRecordId = recordId;
        foundEntry = entries[idx];
        entryIndex = idx;
        break;
      }
    }

    if (!foundEntry || !foundRecordId) {
      throw new NotFoundError('Clinical entry not found', { entryId });
    }

    this.#assertEncounterWritable(foundEntry.encounterId);

    if (foundEntry.deletedAt) {
      throw new ValidationError('Clinical entry already archived', { entryId });
    }

    if (payload.expectedVersion !== undefined && payload.expectedVersion !== foundEntry.version) {
      throw new ValidationError('Clinical entry version mismatch', {
        entryId,
        expectedVersion: payload.expectedVersion,
        currentVersion: foundEntry.version
      });
    }

    const now = nowIso();
    const reason = requireNonEmptyString(payload.reason, 'reason');
    const revision: EntryRevisionSummary = {
      id: createCorrelationId('rev') as never,
      entryId,
      version: foundEntry.version,
      title: foundEntry.title,
      content: foundEntry.content,
      authorUserId: foundEntry.authoredByUserId,
      reason,
      createdAt: now
    };

    const entryRevisions = this.#revisions.get(entryId) ?? [];
    entryRevisions.push(revision);
    this.#revisions.set(entryId, entryRevisions);

    if (this.#entryRevisionRepository) {
      this.#enqueuePersist(
        async () => {
          await this.#entryRevisionRepository!.create(revision);
        },
        () => {
          this.#revisions.set(
            entryId,
            entryRevisions.filter((item) => item.id !== revision.id)
          );
        }
      );
    }

    const archivedEntry: ClinicalEntrySummary = {
      ...foundEntry,
      version: foundEntry.version + 1,
      deletedAt: now,
      deletedByUserId: actorUserId,
      deleteReason: reason,
      updatedAt: now
    };

    const entries = this.#entries.get(foundRecordId)!;
    entries[entryIndex] = archivedEntry;
    this.#entries.set(foundRecordId, entries);

    if (this.#clinicalEntryRepository) {
      this.#enqueuePersist(
        async () => {
          await this.#clinicalEntryRepository!.update(archivedEntry);
        },
        () => {
          const currentEntries = this.#entries.get(foundRecordId!) ?? [];
          const currentIndex = currentEntries.findIndex((item) => item.id === entryId);
          if (currentIndex !== -1) {
            currentEntries[currentIndex] = foundEntry!;
            this.#entries.set(foundRecordId!, currentEntries);
          }
        }
      );
    }

    const record = this.#records.get(foundRecordId)!;
    this.#records.set(foundRecordId, { ...record, updatedAt: now });

    this.appendTimeline(foundRecordId, {
      accountId: record.accountId,
      encounterId: record.encounterId,
      clinicalEntryId: entryId,
      eventType: 'entry_archived',
      summary: `Entry archived at v${archivedEntry.version}: ${archivedEntry.title}`,
      actorUserId
    });

    return archivedEntry;
  }

  public getEntryRevisions(entryId: ClinicalEntryId): readonly EntryRevisionSummary[] {
    if (this.#entryRevisionRepository) {
      // Note: async repo reads not called here for sync compat
    }
    return [...(this.#revisions.get(entryId) ?? [])];
  }

  public async getEntryRevisionsAsync(
    entryId: ClinicalEntryId
  ): Promise<readonly EntryRevisionSummary[]> {
    if (this.#entryRevisionRepository) {
      const revisions = await this.#entryRevisionRepository.findByEntryId(entryId);
      this.#revisions.set(entryId, [...revisions]);
      return revisions;
    }

    return this.getEntryRevisions(entryId);
  }

  public listEntriesByEncounter(
    encounterId: EncounterId,
    options?: {
      readonly includeArchived?: boolean;
    }
  ): readonly ClinicalEntrySummary[] {
    const record = this.ensureRecord(encounterId);
    const entries = [...(this.#entries.get(record.id) ?? [])];
    if (options?.includeArchived) {
      return entries;
    }
    return entries.filter((entry) => !entry.deletedAt);
  }

  public async listEntriesByEncounterAsync(
    encounterId: EncounterId,
    options?: {
      readonly includeArchived?: boolean;
    }
  ): Promise<readonly ClinicalEntrySummary[]> {
    const record = await this.getRecordByEncounterOrThrowAsync(encounterId);
    if (this.#clinicalEntryRepository) {
      const entries = await this.#clinicalEntryRepository.findByMedicalRecordId(record.id);
      this.#entries.set(record.id, [...entries]);
      if (options?.includeArchived) {
        return entries;
      }
      return entries.filter((entry) => !entry.deletedAt);
    }

    return this.listEntriesByEncounter(encounterId, options);
  }

  public listTimelineByEncounter(
    encounterId: EncounterId
  ): readonly ClinicalTimelineEventSummary[] {
    const record = this.ensureRecord(encounterId);
    return [...(this.#timeline.get(record.id) ?? [])];
  }

  public async listTimelineByEncounterAsync(
    encounterId: EncounterId
  ): Promise<readonly ClinicalTimelineEventSummary[]> {
    const record = await this.getRecordByEncounterOrThrowAsync(encounterId);
    if (this.#clinicalTimelineRepository) {
      const events = await this.#clinicalTimelineRepository.findByMedicalRecordId(record.id);
      this.#timeline.set(record.id, [...events]);
      return events;
    }

    return this.listTimelineByEncounter(encounterId);
  }

  public async listAll(accountId: AccountId): Promise<
    ReadonlyArray<{
      record: MedicalRecordSummary;
      entryCount: number;
    }>
  > {
    const records = this.#medicalRecordRepository
      ? await this.#medicalRecordRepository.findAll(accountId)
      : [...this.#records.values()].filter((r) => r.accountId === accountId);

    const results: Array<{ record: MedicalRecordSummary; entryCount: number }> = [];

    for (const record of records) {
      this.#records.set(record.id, record);
      this.#recordByEncounterId.set(record.encounterId, record.id);

      const entries = this.#clinicalEntryRepository
        ? await this.#clinicalEntryRepository.findByMedicalRecordId(record.id)
        : (this.#entries.get(record.id) ?? []);

      if (this.#clinicalEntryRepository) {
        this.#entries.set(record.id, [...entries]);
      }

      const activeCount = entries.filter((e) => !e.deletedAt).length;
      results.push({ record, entryCount: activeCount });
    }

    return results;
  }

  public appendAttachmentEvent(
    encounterId: EncounterId,
    actorUserId: UserId,
    attachmentId: string,
    summary: string
  ): void {
    this.#assertEncounterWritable(encounterId);
    const record = this.ensureRecord(encounterId);
    this.appendTimeline(record.id, {
      accountId: record.accountId,
      encounterId,
      attachmentId: attachmentId as never,
      eventType: 'attachment_added',
      summary,
      actorUserId
    });
  }

  public appendAdvancedCareEvent(
    encounterId: EncounterId,
    actorUserId: UserId,
    eventType:
      | 'inpatient_admitted'
      | 'inpatient_progressed'
      | 'inpatient_transferred'
      | 'inpatient_discharged'
      | 'surgery_requested'
      | 'surgery_pre_op'
      | 'surgery_in_progress'
      | 'surgery_status_changed'
      | 'diagnostic_requested'
      | 'diagnostic_collected'
      | 'diagnostic_resulted',
    summary: string
  ): void {
    this.#assertEncounterWritable(encounterId);
    const record = this.ensureRecord(encounterId);
    this.appendTimeline(record.id, {
      accountId: record.accountId,
      encounterId,
      eventType,
      summary,
      actorUserId
    });
  }

  private appendTimeline(
    medicalRecordId: MedicalRecordId,
    input: Omit<ClinicalTimelineEventSummary, 'id' | 'medicalRecordId' | 'occurredAt'>,
    persist = true
  ): ClinicalTimelineEventSummary {
    const current = this.#timeline.get(medicalRecordId) ?? [];
    const event: ClinicalTimelineEventSummary = {
      id: createCorrelationId('cln') as never,
      medicalRecordId,
      occurredAt: nowIso(),
      ...input
    };
    current.unshift(event);
    this.#timeline.set(medicalRecordId, current);

    if (persist && this.#clinicalTimelineRepository) {
      this.#enqueuePersist(
        async () => {
          await this.#clinicalTimelineRepository!.create(event);
        },
        () => {
          const events = this.#timeline.get(medicalRecordId) ?? [];
          this.#timeline.set(
            medicalRecordId,
            events.filter((item) => item.id !== event.id)
          );
        }
      );
    }

    return event;
  }
}
