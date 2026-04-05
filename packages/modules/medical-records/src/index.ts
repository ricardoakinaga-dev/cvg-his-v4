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
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

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

  public constructor(options: MedicalRecordsServiceOptions) {
    this.#encounters = options.encounters;
    this.#patients = options.patients;
    this.#medicalRecordRepository = options.medicalRecordRepository;
    this.#clinicalEntryRepository = options.clinicalEntryRepository;
    this.#clinicalTimelineRepository = options.clinicalTimelineRepository;
    this.#entryRevisionRepository = options.entryRevisionRepository;
  }

  public async waitForPersistence(): Promise<void> {
    await this.#pendingPersist;
  }

  #enqueuePersist(operation: () => Promise<void>): void {
    this.#pendingPersist = this.#pendingPersist.then(operation).catch(() => {});
  }

  public ensureRecord(encounterId: EncounterId): MedicalRecordSummary {
    const existingId = this.#recordByEncounterId.get(encounterId);
    if (existingId) {
      return this.getRecordOrThrow(existingId);
    }

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
      this.#enqueuePersist(async () => {
        await this.#medicalRecordRepository!.create(record);
      });
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

  public addEntry(actorUserId: UserId, payload: CreateClinicalEntryRequest): ClinicalEntrySummary {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
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

    if (this.#clinicalEntryRepository) {
      this.#enqueuePersist(async () => {
        await this.#clinicalEntryRepository!.create(entry);
      });
    }

    this.appendTimeline(record.id, {
      accountId: record.accountId,
      encounterId,
      clinicalEntryId: entry.id,
      eventType: 'entry_added',
      summary: `${entry.entryType} added: ${entry.title}`,
      actorUserId
    });
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
      this.#enqueuePersist(async () => {
        await this.#entryRevisionRepository!.create(revision);
      });
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
      this.#enqueuePersist(async () => {
        await this.#clinicalEntryRepository!.update(updatedEntry);
      });
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
      this.#enqueuePersist(async () => {
        await this.#entryRevisionRepository!.create(revision);
      });
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
      this.#enqueuePersist(async () => {
        await this.#clinicalEntryRepository!.update(archivedEntry);
      });
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
    input: Omit<ClinicalTimelineEventSummary, 'id' | 'medicalRecordId' | 'occurredAt'>
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

    if (this.#clinicalTimelineRepository) {
      this.#enqueuePersist(async () => {
        await this.#clinicalTimelineRepository!.create(event);
      });
    }

    return event;
  }
}
