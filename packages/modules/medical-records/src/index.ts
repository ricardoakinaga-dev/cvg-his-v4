import { and, eq } from 'drizzle-orm';
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
  entryRevisions,
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
  findById(id: MedicalRecordId, accountId?: AccountId): Promise<MedicalRecordSummary | null>;
  findByEncounterId(
    encounterId: EncounterId,
    accountId?: AccountId
  ): Promise<MedicalRecordSummary | null>;
  findAll(accountId: AccountId): Promise<readonly MedicalRecordSummary[]>;
}

export interface ClinicalEntryRepository {
  create(entry: ClinicalEntrySummary): Promise<void>;
  update(entry: ClinicalEntrySummary, expectedVersion?: number): Promise<void>;
  findByMedicalRecordId(
    medicalRecordId: MedicalRecordId,
    accountId?: AccountId
  ): Promise<readonly ClinicalEntrySummary[]>;
  findById(entryId: ClinicalEntryId, accountId?: AccountId): Promise<ClinicalEntrySummary | null>;
}

export interface ClinicalTimelineRepository {
  create(event: ClinicalTimelineEventSummary): Promise<void>;
  findByMedicalRecordId(
    medicalRecordId: MedicalRecordId,
    accountId?: AccountId
  ): Promise<readonly ClinicalTimelineEventSummary[]>;
}

export interface EntryRevisionRepository {
  create(revision: EntryRevisionSummary): Promise<void>;
  findByEntryId(
    entryId: ClinicalEntryId,
    accountId?: AccountId
  ): Promise<readonly EntryRevisionSummary[]>;
}

export interface MedicalRecordsEntryCreationPersistence {
  readonly record: MedicalRecordSummary;
  readonly updatedRecord: MedicalRecordSummary;
  readonly entry: ClinicalEntrySummary;
  readonly recordCreatedEvent?: ClinicalTimelineEventSummary;
  readonly entryEvent: ClinicalTimelineEventSummary;
}

export interface MedicalRecordsRecordCreationPersistence {
  readonly record: MedicalRecordSummary;
  readonly recordCreatedEvent: ClinicalTimelineEventSummary;
}

export interface MedicalRecordsEntryMutationPersistence {
  readonly record: MedicalRecordSummary;
  readonly updatedRecord: MedicalRecordSummary;
  readonly previousEntry: ClinicalEntrySummary;
  readonly updatedEntry: ClinicalEntrySummary;
  readonly revision: EntryRevisionSummary;
  readonly timelineEvent: ClinicalTimelineEventSummary;
}

export interface MedicalRecordsAtomicPersistenceReceipt {
  readonly operation: 'record_creation' | 'entry_creation' | 'entry_mutation';
  readonly recordId: MedicalRecordId;
  readonly entryId?: ClinicalEntryId;
  readonly revisionId?: string;
  readonly timelineEventIds: readonly string[];
  readonly persistedVersion?: number;
}

/**
 * Atomic persistence seam for adapters whose identifiers do not use the
 * canonical PostgreSQL path. Each method owns the complete write set and
 * must commit it as one tenant transaction; the service never orchestrates
 * these writes through an arbitrary callback.
 */
export interface MedicalRecordsAtomicPersistence {
  persistRecordCreation(
    input: MedicalRecordsRecordCreationPersistence
  ): Promise<MedicalRecordsAtomicPersistenceReceipt>;
  persistEntryCreation(
    input: MedicalRecordsEntryCreationPersistence
  ): Promise<MedicalRecordsAtomicPersistenceReceipt>;
  persistEntryMutation(
    input: MedicalRecordsEntryMutationPersistence
  ): Promise<MedicalRecordsAtomicPersistenceReceipt>;
}

export interface MedicalRecordsServiceOptions {
  readonly encounters: EncountersService;
  readonly patients: PatientsService;
  readonly medicalRecordRepository?: MedicalRecordRepository;
  readonly clinicalEntryRepository?: ClinicalEntryRepository;
  readonly clinicalTimelineRepository?: ClinicalTimelineRepository;
  readonly entryRevisionRepository?: EntryRevisionRepository;
  /**
   * Required when persistence repositories are supplied without canonical
   * UUID-backed PostgreSQL identifiers. The adapter owns the complete write
   * set for each command and must provide real tenant-transaction atomicity.
   */
  readonly atomicPersistence?: MedicalRecordsAtomicPersistence;
}

const ATOMIC_PERSISTENCE_CONFIRMATION_ERROR =
  'Medical record atomic persistence did not confirm the complete write set';

function sameMedicalRecord(
  actual: MedicalRecordSummary | null,
  expected: MedicalRecordSummary
): boolean {
  return Boolean(
    actual &&
    actual.id === expected.id &&
    actual.accountId === expected.accountId &&
    actual.encounterId === expected.encounterId &&
    actual.patientId === expected.patientId &&
    actual.status === expected.status &&
    actual.createdAt === expected.createdAt &&
    actual.updatedAt === expected.updatedAt
  );
}

function sameClinicalEntry(
  actual: ClinicalEntrySummary | null,
  expected: ClinicalEntrySummary
): boolean {
  return Boolean(
    actual &&
    actual.id === expected.id &&
    actual.accountId === expected.accountId &&
    actual.medicalRecordId === expected.medicalRecordId &&
    actual.encounterId === expected.encounterId &&
    actual.patientId === expected.patientId &&
    actual.entryType === expected.entryType &&
    actual.title === expected.title &&
    actual.content === expected.content &&
    actual.authoredByUserId === expected.authoredByUserId &&
    actual.version === expected.version &&
    (actual.deletedAt ?? undefined) === (expected.deletedAt ?? undefined) &&
    (actual.deletedByUserId ?? undefined) === (expected.deletedByUserId ?? undefined) &&
    (actual.deleteReason ?? undefined) === (expected.deleteReason ?? undefined) &&
    actual.createdAt === expected.createdAt &&
    actual.updatedAt === expected.updatedAt
  );
}

function sameTimelineEvent(
  actual: ClinicalTimelineEventSummary | undefined,
  expected: ClinicalTimelineEventSummary
): boolean {
  return Boolean(
    actual &&
    actual.id === expected.id &&
    actual.accountId === expected.accountId &&
    actual.medicalRecordId === expected.medicalRecordId &&
    actual.encounterId === expected.encounterId &&
    actual.eventType === expected.eventType &&
    actual.summary === expected.summary &&
    actual.actorUserId === expected.actorUserId &&
    (actual.clinicalEntryId ?? undefined) === (expected.clinicalEntryId ?? undefined) &&
    (actual.attachmentId ?? undefined) === (expected.attachmentId ?? undefined) &&
    actual.occurredAt === expected.occurredAt
  );
}

function sameEntryRevision(
  actual: EntryRevisionSummary | undefined,
  expected: EntryRevisionSummary
): boolean {
  return Boolean(
    actual &&
    actual.id === expected.id &&
    actual.entryId === expected.entryId &&
    actual.version === expected.version &&
    actual.title === expected.title &&
    actual.content === expected.content &&
    actual.authorUserId === expected.authorUserId &&
    (actual.reason ?? undefined) === (expected.reason ?? undefined) &&
    actual.createdAt === expected.createdAt
  );
}

export interface MedicalRecordEncounterSnapshot {
  readonly encounterId: EncounterId;
  readonly record?: MedicalRecordSummary;
  readonly entries: readonly ClinicalEntrySummary[];
  readonly timeline: readonly ClinicalTimelineEventSummary[];
}

interface ClinicalEntryMutationPlan extends MedicalRecordsEntryMutationPersistence {}

export class MedicalRecordsService {
  readonly #encounters: EncountersService;
  readonly #patients: PatientsService;
  readonly #medicalRecordRepository?: MedicalRecordRepository;
  readonly #clinicalEntryRepository?: ClinicalEntryRepository;
  readonly #clinicalTimelineRepository?: ClinicalTimelineRepository;
  readonly #entryRevisionRepository?: EntryRevisionRepository;
  readonly #atomicPersistence?: MedicalRecordsAtomicPersistence;

  // In-memory fallback stores
  readonly #records = new Map<MedicalRecordId, MedicalRecordSummary>();
  readonly #recordByEncounterId = new Map<EncounterId, MedicalRecordId>();
  readonly #entries = new Map<MedicalRecordId, ClinicalEntrySummary[]>();
  readonly #timeline = new Map<MedicalRecordId, ClinicalTimelineEventSummary[]>();
  readonly #revisions = new Map<ClinicalEntryId, EntryRevisionSummary[]>();
  #pendingPersist: Promise<void> = Promise.resolve();
  #persistOperations: Promise<void>[] = [];

  public constructor(options: MedicalRecordsServiceOptions) {
    this.#encounters = options.encounters;
    this.#patients = options.patients;
    this.#medicalRecordRepository = options.medicalRecordRepository;
    this.#clinicalEntryRepository = options.clinicalEntryRepository;
    this.#clinicalTimelineRepository = options.clinicalTimelineRepository;
    this.#entryRevisionRepository = options.entryRevisionRepository;
    this.#atomicPersistence = options.atomicPersistence;
  }

  #requireEncounterForAccount(accountId: AccountId, encounterId: EncounterId) {
    const encounter = this.#encounters.getOrThrow(accountId, encounterId);
    if (encounter.accountId !== accountId) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }
    return encounter;
  }

  #assertRecordForAccount(
    accountId: AccountId,
    recordId: MedicalRecordId,
    record: MedicalRecordSummary
  ): MedicalRecordSummary {
    if (
      record.id !== recordId ||
      record.accountId !== accountId ||
      record.encounterId.length === 0
    ) {
      throw new NotFoundError('Medical record not found', { recordId });
    }

    try {
      const encounter = this.#encounters.getOrThrow(accountId, record.encounterId);
      const patient = this.#patients.getOrThrow(record.patientId);
      if (
        encounter.id !== record.encounterId ||
        encounter.accountId !== accountId ||
        encounter.patientId !== record.patientId ||
        patient.id !== record.patientId ||
        patient.accountId !== accountId
      ) {
        throw new Error('Medical record parent scope mismatch');
      }
    } catch {
      throw new NotFoundError('Medical record not found', { recordId });
    }

    return record;
  }

  #assertRecordWritable(record: MedicalRecordSummary): MedicalRecordSummary {
    if (record.status === 'completed') {
      throw new ValidationError('Completed medical record is read-only', {
        encounterId: record.encounterId
      });
    }
    return record;
  }

  #filterEntriesForRecord(
    record: MedicalRecordSummary,
    entries: readonly ClinicalEntrySummary[]
  ): ClinicalEntrySummary[] {
    return entries.filter(
      (entry) =>
        entry.accountId === record.accountId &&
        entry.medicalRecordId === record.id &&
        entry.encounterId === record.encounterId &&
        entry.patientId === record.patientId
    );
  }

  #filterTimelineForRecord(
    record: MedicalRecordSummary,
    events: readonly ClinicalTimelineEventSummary[]
  ): ClinicalTimelineEventSummary[] {
    return events.filter(
      (event) =>
        event.accountId === record.accountId &&
        event.medicalRecordId === record.id &&
        event.encounterId === record.encounterId
    );
  }

  #filterRevisionsForEntry(
    entryId: ClinicalEntryId,
    revisions: readonly EntryRevisionSummary[]
  ): EntryRevisionSummary[] {
    return revisions.filter((revision) => revision.entryId === entryId);
  }

  #findCachedEntry(
    accountId: AccountId,
    entryId: ClinicalEntryId
  ): {
    readonly recordId: MedicalRecordId;
    readonly entry: ClinicalEntrySummary;
  } | null {
    for (const [recordId, entries] of this.#entries) {
      const record = this.#records.get(recordId);
      if (!record) continue;

      let scopedRecord: MedicalRecordSummary;
      try {
        scopedRecord = this.#assertRecordForAccount(accountId, recordId, record);
      } catch {
        continue;
      }

      const entryIndex = entries.findIndex(
        (candidate) =>
          candidate.id === entryId &&
          candidate.accountId === accountId &&
          candidate.medicalRecordId === scopedRecord.id &&
          candidate.encounterId === scopedRecord.encounterId &&
          candidate.patientId === scopedRecord.patientId
      );
      if (entryIndex !== -1) {
        return { recordId: scopedRecord.id, entry: entries[entryIndex]! };
      }
    }
    return null;
  }

  public async waitForPersistence(): Promise<void> {
    const operations = this.#persistOperations.splice(0);
    if (operations.length === 0) {
      await this.#pendingPersist;
      return;
    }

    const results = await Promise.allSettled(operations);
    const failed = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    if (failed) {
      throw failed.reason;
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
    const records = (await this.#medicalRecordRepository.findAll(accountId)).filter((record) => {
      if (record.accountId !== accountId) return false;
      try {
        this.#assertRecordForAccount(accountId, record.id, record);
        return true;
      } catch {
        return false;
      }
    });
    const nextRecordIds = new Set(records.map((record) => record.id));
    const nextEntries = new Map<MedicalRecordId, ClinicalEntrySummary[]>();
    const nextTimeline = new Map<MedicalRecordId, ClinicalTimelineEventSummary[]>();
    const nextRevisions = new Map<ClinicalEntryId, EntryRevisionSummary[]>();

    await Promise.all(
      records.map(async (record) => {
        const [entries, timeline] = await Promise.all([
          this.#clinicalEntryRepository?.findByMedicalRecordId(record.id, record.accountId) ??
            Promise.resolve([]),
          this.#clinicalTimelineRepository?.findByMedicalRecordId(record.id, record.accountId) ??
            Promise.resolve([])
        ]);
        const scopedEntries = this.#filterEntriesForRecord(record, entries);
        nextEntries.set(record.id, scopedEntries);
        nextTimeline.set(record.id, this.#filterTimelineForRecord(record, timeline));
        if (this.#entryRevisionRepository) {
          const revisions = await Promise.all(
            scopedEntries.map(
              async (entry) =>
                [
                  entry.id,
                  this.#filterRevisionsForEntry(
                    entry.id,
                    await this.#entryRevisionRepository!.findByEntryId(entry.id, record.accountId)
                  )
                ] as const
            )
          );
          for (const [entryId, entryRevisions] of revisions) {
            nextRevisions.set(entryId, [...entryRevisions]);
          }
        }
      })
    );

    const cachedAccountEntryIds = new Set<ClinicalEntryId>();
    for (const [recordId, entries] of this.#entries) {
      const cachedRecord = this.#records.get(recordId);
      if (cachedRecord?.accountId === accountId) {
        for (const entry of entries) cachedAccountEntryIds.add(entry.id);
      }
    }

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
    for (const entryId of cachedAccountEntryIds) {
      this.#revisions.delete(entryId);
    }

    for (const record of records) {
      this.#records.set(record.id, record);
      this.#recordByEncounterId.set(record.encounterId, record.id);
      this.#entries.set(record.id, nextEntries.get(record.id) ?? []);
      this.#timeline.set(record.id, nextTimeline.get(record.id) ?? []);
    }
    for (const [entryId, revisions] of nextRevisions) {
      this.#revisions.set(entryId, revisions);
    }
  }

  public snapshotEncounter(
    accountId: AccountId,
    encounterId: EncounterId
  ): MedicalRecordEncounterSnapshot {
    this.#requireEncounterForAccount(accountId, encounterId);
    const recordId = this.#recordByEncounterId.get(encounterId);
    const record = recordId ? this.#records.get(recordId) : undefined;
    const scopedRecord = record
      ? this.#assertRecordForAccount(accountId, recordId!, record)
      : undefined;
    if (scopedRecord && scopedRecord.encounterId !== encounterId) {
      throw new NotFoundError('Medical record not found', { encounterId });
    }
    return {
      encounterId,
      ...(scopedRecord ? { record: { ...scopedRecord } } : {}),
      entries: scopedRecord
        ? this.#filterEntriesForRecord(scopedRecord, this.#entries.get(scopedRecord.id) ?? [])
        : [],
      timeline: scopedRecord
        ? this.#filterTimelineForRecord(scopedRecord, this.#timeline.get(scopedRecord.id) ?? [])
        : []
    };
  }

  public restoreEncounterSnapshot(
    accountId: AccountId,
    snapshot: MedicalRecordEncounterSnapshot
  ): void {
    this.#requireEncounterForAccount(accountId, snapshot.encounterId);
    const record = snapshot.record
      ? this.#assertRecordForAccount(accountId, snapshot.record.id, snapshot.record)
      : undefined;
    if (record && record.encounterId !== snapshot.encounterId) {
      throw new NotFoundError('Medical record not found', { encounterId: snapshot.encounterId });
    }
    const currentRecordId = this.#recordByEncounterId.get(snapshot.encounterId);
    const currentRecord = currentRecordId ? this.#records.get(currentRecordId) : undefined;
    if (currentRecordId && !currentRecord) {
      throw new NotFoundError('Medical record not found', { encounterId: snapshot.encounterId });
    }
    if (currentRecordId && currentRecord && currentRecordId !== record?.id) {
      this.#assertRecordForAccount(accountId, currentRecordId, currentRecord);
      this.#recordByEncounterId.delete(snapshot.encounterId);
      this.#records.delete(currentRecordId);
      this.#entries.delete(currentRecordId);
      this.#timeline.delete(currentRecordId);
    }
    if (!record) {
      return;
    }
    this.#records.set(record.id, { ...record });
    this.#recordByEncounterId.set(snapshot.encounterId, record.id);
    this.#entries.set(record.id, this.#filterEntriesForRecord(record, snapshot.entries));
    this.#timeline.set(record.id, this.#filterTimelineForRecord(record, snapshot.timeline));
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
    this.#persistOperations.push(pending);
    // A failed best-effort event must not poison every subsequent write in
    // the same runtime. The operation promise remains available to
    // waitForPersistence so callers observe a failure, while the queue itself
    // advances from a recovered promise and can accept a later retry.
    this.#pendingPersist = pending.catch(() => {});
  }

  #assertEncounterWritable(accountId: AccountId, encounterId: EncounterId) {
    const encounter = this.#requireEncounterForAccount(accountId, encounterId);
    if (encounter.status === 'closed') {
      throw new ValidationError('Closed encounter is read-only', { encounterId });
    }
    return encounter;
  }

  #hasCanonicalRepositories(accountId: AccountId): boolean {
    return Boolean(
      isDatabaseAccountId(accountId) &&
      this.#medicalRecordRepository &&
      this.#clinicalEntryRepository &&
      this.#clinicalTimelineRepository &&
      this.#entryRevisionRepository
    );
  }

  #hasCanonicalEntryCreationRepositories(accountId: AccountId): boolean {
    return Boolean(
      isDatabaseAccountId(accountId) &&
      this.#medicalRecordRepository &&
      this.#clinicalEntryRepository &&
      this.#clinicalTimelineRepository
    );
  }

  #hasCanonicalRecordCreationRepositories(accountId: AccountId): boolean {
    return Boolean(
      isDatabaseAccountId(accountId) &&
      this.#medicalRecordRepository &&
      this.#clinicalTimelineRepository
    );
  }

  #hasPersistenceRepositories(): boolean {
    return Boolean(
      this.#medicalRecordRepository ||
      this.#clinicalEntryRepository ||
      this.#clinicalTimelineRepository ||
      this.#entryRevisionRepository
    );
  }

  #requireAtomicPersistence(): MedicalRecordsAtomicPersistence {
    if (!this.#atomicPersistence) {
      throw new Error('Medical record atomic persistence adapter is unavailable');
    }
    return this.#atomicPersistence;
  }

  #assertAtomicPersistenceAvailable(
    accountId: AccountId,
    operation: 'record creation' | 'entry creation' | 'entry mutation'
  ): void {
    if (!this.#hasPersistenceRepositories()) return;

    const hasCanonicalPersistence =
      operation === 'record creation'
        ? this.#hasCanonicalRecordCreationRepositories(accountId)
        : operation === 'entry creation'
          ? this.#hasCanonicalEntryCreationRepositories(accountId)
          : this.#hasCanonicalRepositories(accountId);
    if (!hasCanonicalPersistence && !this.#atomicPersistence) {
      throw new Error(`Medical record atomic persistence adapter is unavailable for ${operation}`);
    }
  }

  #assertAtomicPersistenceReceipt(
    receipt: unknown,
    expected: MedicalRecordsAtomicPersistenceReceipt
  ): void {
    if (!receipt || typeof receipt !== 'object') {
      throw new Error(ATOMIC_PERSISTENCE_CONFIRMATION_ERROR);
    }

    const candidate = receipt as Partial<MedicalRecordsAtomicPersistenceReceipt>;
    const timelineEventIds = candidate.timelineEventIds;
    const expectedTimelineEventIds = expected.timelineEventIds;
    const timelineMatches =
      Array.isArray(timelineEventIds) &&
      timelineEventIds.length === expectedTimelineEventIds.length &&
      timelineEventIds.every((eventId, index) => eventId === expectedTimelineEventIds[index]);
    if (
      candidate.operation !== expected.operation ||
      candidate.recordId !== expected.recordId ||
      candidate.entryId !== expected.entryId ||
      candidate.revisionId !== expected.revisionId ||
      candidate.persistedVersion !== expected.persistedVersion ||
      !timelineMatches
    ) {
      throw new Error(ATOMIC_PERSISTENCE_CONFIRMATION_ERROR);
    }
  }

  async #verifyRecordCreationPersistence(
    input: MedicalRecordsRecordCreationPersistence
  ): Promise<void> {
    if (!this.#medicalRecordRepository || !this.#clinicalTimelineRepository) {
      throw new Error(ATOMIC_PERSISTENCE_CONFIRMATION_ERROR);
    }

    const [record, timeline] = await Promise.all([
      this.#medicalRecordRepository.findById(input.record.id, input.record.accountId),
      this.#clinicalTimelineRepository.findByMedicalRecordId(
        input.record.id,
        input.record.accountId
      )
    ]);
    if (!sameMedicalRecord(record, input.record)) {
      throw new Error(ATOMIC_PERSISTENCE_CONFIRMATION_ERROR);
    }
    if (!timeline.some((event) => sameTimelineEvent(event, input.recordCreatedEvent))) {
      throw new Error(ATOMIC_PERSISTENCE_CONFIRMATION_ERROR);
    }
  }

  async #verifyEntryCreationPersistence(
    input: MedicalRecordsEntryCreationPersistence
  ): Promise<void> {
    if (
      !this.#medicalRecordRepository ||
      !this.#clinicalEntryRepository ||
      !this.#clinicalTimelineRepository
    ) {
      throw new Error(ATOMIC_PERSISTENCE_CONFIRMATION_ERROR);
    }

    const [record, entry, timeline] = await Promise.all([
      this.#medicalRecordRepository.findById(input.updatedRecord.id, input.updatedRecord.accountId),
      this.#clinicalEntryRepository.findById(input.entry.id, input.entry.accountId),
      this.#clinicalTimelineRepository.findByMedicalRecordId(
        input.updatedRecord.id,
        input.updatedRecord.accountId
      )
    ]);
    const expectedTimeline = [
      ...(input.recordCreatedEvent ? [input.recordCreatedEvent] : []),
      input.entryEvent
    ];
    if (
      !sameMedicalRecord(record, input.updatedRecord) ||
      !sameClinicalEntry(entry, input.entry) ||
      expectedTimeline.some(
        (expectedEvent) => !timeline.some((event) => sameTimelineEvent(event, expectedEvent))
      )
    ) {
      throw new Error(ATOMIC_PERSISTENCE_CONFIRMATION_ERROR);
    }
  }

  async #verifyEntryMutationPersistence(plan: ClinicalEntryMutationPlan): Promise<void> {
    if (
      !this.#medicalRecordRepository ||
      !this.#clinicalEntryRepository ||
      !this.#clinicalTimelineRepository ||
      !this.#entryRevisionRepository
    ) {
      throw new Error(ATOMIC_PERSISTENCE_CONFIRMATION_ERROR);
    }

    const [record, entry, revisions, timeline] = await Promise.all([
      this.#medicalRecordRepository.findById(plan.updatedRecord.id, plan.updatedRecord.accountId),
      this.#clinicalEntryRepository.findById(plan.updatedEntry.id, plan.updatedEntry.accountId),
      this.#entryRevisionRepository.findByEntryId(
        plan.updatedEntry.id,
        plan.updatedEntry.accountId
      ),
      this.#clinicalTimelineRepository.findByMedicalRecordId(
        plan.updatedRecord.id,
        plan.updatedRecord.accountId
      )
    ]);
    if (
      !sameMedicalRecord(record, plan.updatedRecord) ||
      !sameClinicalEntry(entry, plan.updatedEntry) ||
      !revisions.some((revision) => sameEntryRevision(revision, plan.revision)) ||
      !timeline.some((event) => sameTimelineEvent(event, plan.timelineEvent))
    ) {
      throw new Error(ATOMIC_PERSISTENCE_CONFIRMATION_ERROR);
    }
  }

  #prepareEntryMutation(
    accountId: AccountId,
    actorUserId: UserId,
    entryId: ClinicalEntryId,
    payload: UpdateClinicalEntryRequest | ArchiveClinicalEntryRequest,
    action: 'update' | 'archive'
  ): ClinicalEntryMutationPlan {
    const cachedEntry = this.#findCachedEntry(accountId, entryId);
    if (!cachedEntry) {
      throw new NotFoundError('Clinical entry not found', { entryId });
    }

    const record = this.#assertRecordForAccount(
      accountId,
      cachedEntry.recordId,
      this.#records.get(cachedEntry.recordId)!
    );
    this.#assertRecordWritable(record);
    this.#assertEncounterWritable(accountId, record.encounterId);

    if (action === 'update' && cachedEntry.entry.deletedAt) {
      throw new ValidationError('Archived clinical entry cannot be updated', { entryId });
    }
    if (action === 'archive' && cachedEntry.entry.deletedAt) {
      throw new ValidationError('Clinical entry already archived', { entryId });
    }

    const expectedVersion = payload.expectedVersion;
    if (expectedVersion !== undefined && expectedVersion !== cachedEntry.entry.version) {
      throw new ValidationError('Clinical entry version mismatch', {
        entryId,
        expectedVersion,
        currentVersion: cachedEntry.entry.version
      });
    }

    const now = nowIso();
    const isArchive = action === 'archive';
    const archivePayload = payload as ArchiveClinicalEntryRequest;
    const updatePayload = payload as UpdateClinicalEntryRequest;
    const reason = isArchive
      ? requireNonEmptyString(archivePayload.reason, 'reason')
      : (updatePayload.reason ?? 'Updated');
    const updatedEntry: ClinicalEntrySummary = isArchive
      ? {
          ...cachedEntry.entry,
          version: cachedEntry.entry.version + 1,
          deletedAt: now,
          deletedByUserId: actorUserId,
          deleteReason: reason,
          updatedAt: now
        }
      : {
          ...cachedEntry.entry,
          title: updatePayload.title ?? cachedEntry.entry.title,
          content: updatePayload.content ?? cachedEntry.entry.content,
          version: cachedEntry.entry.version + 1,
          updatedAt: now
        };
    const revision: EntryRevisionSummary = {
      id: createCorrelationId('rev') as never,
      entryId,
      version: cachedEntry.entry.version,
      title: cachedEntry.entry.title,
      content: cachedEntry.entry.content,
      authorUserId: cachedEntry.entry.authoredByUserId,
      reason,
      createdAt: now
    };
    const timelineEvent: ClinicalTimelineEventSummary = {
      id: createCorrelationId('cln') as never,
      medicalRecordId: record.id,
      occurredAt: now,
      accountId: record.accountId,
      encounterId: record.encounterId,
      clinicalEntryId: entryId,
      eventType: isArchive ? 'entry_archived' : 'entry_updated',
      summary: isArchive
        ? `Entry archived at v${updatedEntry.version}: ${updatedEntry.title}`
        : `Entry v${cachedEntry.entry.version} updated to v${updatedEntry.version}: ${updatedEntry.title}`,
      actorUserId
    };

    return {
      record,
      updatedRecord: { ...record, updatedAt: now },
      previousEntry: cachedEntry.entry,
      updatedEntry,
      revision,
      timelineEvent
    };
  }

  #applyEntryMutation(plan: ClinicalEntryMutationPlan): void {
    const entries = this.#entries.get(plan.record.id) ?? [];
    const entryIndex = entries.findIndex((entry) => entry.id === plan.previousEntry.id);
    if (entryIndex === -1) {
      throw new NotFoundError('Clinical entry not found', { entryId: plan.previousEntry.id });
    }
    this.#entries.set(plan.record.id, [
      ...entries.slice(0, entryIndex),
      plan.updatedEntry,
      ...entries.slice(entryIndex + 1)
    ]);
    this.#revisions.set(plan.updatedEntry.id, [
      ...(this.#revisions.get(plan.updatedEntry.id) ?? []),
      plan.revision
    ]);
    this.#records.set(plan.record.id, plan.updatedRecord);
    this.#timeline.set(plan.record.id, [
      plan.timelineEvent,
      ...(this.#timeline.get(plan.record.id) ?? [])
    ]);
  }

  #rollbackEntryMutation(plan: ClinicalEntryMutationPlan): void {
    const entries = this.#entries.get(plan.record.id) ?? [];
    const currentIndex = entries.findIndex((entry) => entry.id === plan.updatedEntry.id);
    const currentEntry = currentIndex === -1 ? undefined : entries[currentIndex];
    if (
      currentEntry &&
      currentEntry.version === plan.updatedEntry.version &&
      currentEntry.updatedAt === plan.updatedEntry.updatedAt
    ) {
      this.#entries.set(plan.record.id, [
        ...entries.slice(0, currentIndex),
        plan.previousEntry,
        ...entries.slice(currentIndex + 1)
      ]);
    }

    this.#revisions.set(
      plan.updatedEntry.id,
      (this.#revisions.get(plan.updatedEntry.id) ?? []).filter(
        (revision) => revision.id !== plan.revision.id
      )
    );
    this.#timeline.set(
      plan.record.id,
      (this.#timeline.get(plan.record.id) ?? []).filter(
        (event) => event.id !== plan.timelineEvent.id
      )
    );
    if (this.#records.get(plan.record.id) === plan.updatedRecord) {
      this.#records.set(plan.record.id, plan.record);
    }
  }

  async #persistRecordCreationAtomically(
    input: MedicalRecordsRecordCreationPersistence
  ): Promise<MedicalRecordsAtomicPersistenceReceipt> {
    await withTenantTransaction(input.record.accountId, async (transaction) => {
      await transaction.insert(medicalRecords).values({
        id: input.record.id,
        accountId: input.record.accountId,
        encounterId: input.record.encounterId,
        patientId: input.record.patientId,
        status: input.record.status,
        createdAt: new Date(input.record.createdAt),
        updatedAt: new Date(input.record.updatedAt)
      });
      await transaction.insert(clinicalTimeline).values({
        id: input.recordCreatedEvent.id,
        accountId: input.recordCreatedEvent.accountId,
        medicalRecordId: input.recordCreatedEvent.medicalRecordId,
        encounterId: input.recordCreatedEvent.encounterId,
        eventType: input.recordCreatedEvent.eventType,
        summary: input.recordCreatedEvent.summary ?? null,
        actorUserId: input.recordCreatedEvent.actorUserId ?? null,
        clinicalEntryId: input.recordCreatedEvent.clinicalEntryId ?? null,
        attachmentId: input.recordCreatedEvent.attachmentId ?? null,
        occurredAt: new Date(input.recordCreatedEvent.occurredAt)
      });
    });

    return {
      operation: 'record_creation',
      recordId: input.record.id,
      timelineEventIds: [input.recordCreatedEvent.id]
    };
  }

  async #persistEntryCreationAtomically(
    input: MedicalRecordsEntryCreationPersistence
  ): Promise<MedicalRecordsAtomicPersistenceReceipt> {
    await withTenantTransaction(input.record.accountId, async (transaction) => {
      if (input.recordCreatedEvent) {
        await transaction.insert(medicalRecords).values({
          id: input.record.id,
          accountId: input.record.accountId,
          encounterId: input.record.encounterId,
          patientId: input.record.patientId,
          status: input.record.status,
          createdAt: new Date(input.record.createdAt),
          updatedAt: new Date(input.record.updatedAt)
        });
        await transaction.insert(clinicalTimeline).values({
          id: input.recordCreatedEvent.id,
          accountId: input.recordCreatedEvent.accountId,
          medicalRecordId: input.recordCreatedEvent.medicalRecordId,
          encounterId: input.recordCreatedEvent.encounterId,
          eventType: input.recordCreatedEvent.eventType,
          summary: input.recordCreatedEvent.summary ?? null,
          actorUserId: input.recordCreatedEvent.actorUserId ?? null,
          clinicalEntryId: input.recordCreatedEvent.clinicalEntryId ?? null,
          attachmentId: input.recordCreatedEvent.attachmentId ?? null,
          occurredAt: new Date(input.recordCreatedEvent.occurredAt)
        });
      } else {
        const updatedRecords = await transaction
          .update(medicalRecords)
          .set({ updatedAt: new Date(input.updatedRecord.updatedAt) })
          .where(
            and(
              eq(medicalRecords.id, input.record.id),
              eq(medicalRecords.accountId, input.record.accountId),
              eq(medicalRecords.encounterId, input.record.encounterId)
            )
          )
          .returning({ id: medicalRecords.id });
        if (updatedRecords.length !== 1) {
          throw new NotFoundError('Medical record not found', { recordId: input.record.id });
        }
      }

      await transaction.insert(clinicalEntries).values({
        id: input.entry.id,
        accountId: input.entry.accountId,
        medicalRecordId: input.entry.medicalRecordId,
        encounterId: input.entry.encounterId,
        patientId: input.entry.patientId,
        authorUserId: input.entry.authoredByUserId,
        entryType: input.entry.entryType,
        title: input.entry.title,
        content: input.entry.content,
        version: input.entry.version,
        deletedAt: input.entry.deletedAt ? new Date(input.entry.deletedAt) : null,
        deletedByUserId: input.entry.deletedByUserId ?? null,
        deleteReason: input.entry.deleteReason ?? null,
        createdAt: new Date(input.entry.createdAt),
        updatedAt: new Date(input.entry.updatedAt)
      });
      await transaction.insert(clinicalTimeline).values({
        id: input.entryEvent.id,
        accountId: input.entryEvent.accountId,
        medicalRecordId: input.entryEvent.medicalRecordId,
        encounterId: input.entryEvent.encounterId,
        eventType: input.entryEvent.eventType,
        summary: input.entryEvent.summary ?? null,
        actorUserId: input.entryEvent.actorUserId ?? null,
        clinicalEntryId: input.entryEvent.clinicalEntryId ?? null,
        attachmentId: input.entryEvent.attachmentId ?? null,
        occurredAt: new Date(input.entryEvent.occurredAt)
      });
    });

    return {
      operation: 'entry_creation',
      recordId: input.record.id,
      entryId: input.entry.id,
      timelineEventIds: [
        ...(input.recordCreatedEvent ? [input.recordCreatedEvent.id] : []),
        input.entryEvent.id
      ]
    };
  }

  async #persistRecordCreation(input: MedicalRecordsRecordCreationPersistence): Promise<void> {
    const canonical = this.#hasCanonicalRecordCreationRepositories(input.record.accountId);
    const receipt = canonical
      ? await this.#persistRecordCreationAtomically(input)
      : await this.#requireAtomicPersistence().persistRecordCreation(input);
    this.#assertAtomicPersistenceReceipt(receipt, {
      operation: 'record_creation',
      recordId: input.record.id,
      timelineEventIds: [input.recordCreatedEvent.id]
    });
    if (!canonical) await this.#verifyRecordCreationPersistence(input);
  }

  async #persistEntryCreation(input: MedicalRecordsEntryCreationPersistence): Promise<void> {
    const canonical = this.#hasCanonicalEntryCreationRepositories(input.record.accountId);
    const receipt = canonical
      ? await this.#persistEntryCreationAtomically(input)
      : await this.#requireAtomicPersistence().persistEntryCreation(input);
    this.#assertAtomicPersistenceReceipt(receipt, {
      operation: 'entry_creation',
      recordId: input.record.id,
      entryId: input.entry.id,
      timelineEventIds: [
        ...(input.recordCreatedEvent ? [input.recordCreatedEvent.id] : []),
        input.entryEvent.id
      ]
    });
    if (!canonical) await this.#verifyEntryCreationPersistence(input);
  }

  async #persistEntryMutation(plan: ClinicalEntryMutationPlan): Promise<void> {
    const canonical = this.#hasCanonicalRepositories(plan.record.accountId);
    const receipt = canonical
      ? await this.#persistEntryMutationAtomically(plan)
      : await this.#requireAtomicPersistence().persistEntryMutation(plan);
    this.#assertAtomicPersistenceReceipt(receipt, {
      operation: 'entry_mutation',
      recordId: plan.record.id,
      entryId: plan.updatedEntry.id,
      revisionId: plan.revision.id,
      timelineEventIds: [plan.timelineEvent.id],
      persistedVersion: plan.updatedEntry.version
    });
    if (!canonical) await this.#verifyEntryMutationPersistence(plan);
  }

  #enqueueRecordCreation(
    input: MedicalRecordsRecordCreationPersistence,
    rollback: () => void
  ): void {
    this.#enqueuePersist(() => this.#persistRecordCreation(input), rollback);
  }

  #rollbackEntryCreation(
    input: MedicalRecordsEntryCreationPersistence,
    recordWasCreated: boolean
  ): void {
    const entries = this.#entries.get(input.record.id) ?? [];
    this.#entries.set(
      input.record.id,
      entries.filter((entry) => entry.id !== input.entry.id)
    );
    const timelineEventIds = new Set([
      input.entryEvent.id,
      ...(input.recordCreatedEvent ? [input.recordCreatedEvent.id] : [])
    ]);
    const timeline = this.#timeline.get(input.record.id) ?? [];
    this.#timeline.set(
      input.record.id,
      timeline.filter((event) => !timelineEventIds.has(event.id))
    );
    if (recordWasCreated) {
      this.#records.delete(input.record.id);
      if (this.#recordByEncounterId.get(input.record.encounterId) === input.record.id) {
        this.#recordByEncounterId.delete(input.record.encounterId);
      }
      this.#entries.delete(input.record.id);
      this.#timeline.delete(input.record.id);
      return;
    }
    if (this.#records.get(input.record.id)?.updatedAt === input.updatedRecord.updatedAt) {
      this.#records.set(input.record.id, input.record);
    }
  }

  #enqueueEntryCreation(
    input: MedicalRecordsEntryCreationPersistence,
    recordWasCreated: boolean
  ): void {
    if (!this.#hasPersistenceRepositories()) return;
    this.#enqueuePersist(
      () => this.#persistEntryCreation(input),
      () => this.#rollbackEntryCreation(input, recordWasCreated)
    );
  }

  #enqueueEntryMutation(plan: ClinicalEntryMutationPlan): void {
    if (!this.#hasPersistenceRepositories()) return;

    this.#enqueuePersist(
      () => this.#persistEntryMutation(plan),
      () => this.#rollbackEntryMutation(plan)
    );
  }

  async #persistEntryMutationAtomically(
    plan: ClinicalEntryMutationPlan
  ): Promise<MedicalRecordsAtomicPersistenceReceipt> {
    await withTenantTransaction(plan.record.accountId, async (transaction) => {
      await transaction
        .update(medicalRecords)
        .set({ updatedAt: new Date(plan.updatedRecord.updatedAt) })
        .where(
          and(
            eq(medicalRecords.id, plan.record.id),
            eq(medicalRecords.accountId, plan.record.accountId),
            eq(medicalRecords.encounterId, plan.record.encounterId)
          )
        );
      const updatedEntries = await transaction
        .update(clinicalEntries)
        .set({
          title: plan.updatedEntry.title,
          content: plan.updatedEntry.content,
          version: plan.updatedEntry.version,
          deletedAt: plan.updatedEntry.deletedAt ? new Date(plan.updatedEntry.deletedAt) : null,
          deletedByUserId: plan.updatedEntry.deletedByUserId ?? null,
          deleteReason: plan.updatedEntry.deleteReason ?? null,
          updatedAt: new Date(plan.updatedEntry.updatedAt)
        })
        .where(
          and(
            eq(clinicalEntries.id, plan.updatedEntry.id),
            eq(clinicalEntries.accountId, plan.record.accountId),
            eq(clinicalEntries.medicalRecordId, plan.record.id),
            eq(clinicalEntries.version, plan.previousEntry.version)
          )
        )
        .returning({ id: clinicalEntries.id });
      if (updatedEntries.length !== 1) {
        throw new ValidationError('Clinical entry version mismatch', {
          entryId: plan.updatedEntry.id,
          expectedVersion: plan.previousEntry.version
        });
      }
      await transaction.insert(entryRevisions).values({
        id: plan.revision.id as string,
        entryId: plan.revision.entryId as string,
        version: plan.revision.version,
        title: plan.revision.title,
        content: plan.revision.content,
        authorUserId: plan.revision.authorUserId as string,
        reason: plan.revision.reason ?? null,
        createdAt: new Date(plan.revision.createdAt)
      });
      await transaction.insert(clinicalTimeline).values({
        id: plan.timelineEvent.id as string,
        accountId: plan.timelineEvent.accountId,
        medicalRecordId: plan.timelineEvent.medicalRecordId,
        encounterId: plan.timelineEvent.encounterId,
        eventType: plan.timelineEvent.eventType,
        summary: plan.timelineEvent.summary ?? null,
        actorUserId: plan.timelineEvent.actorUserId ?? null,
        clinicalEntryId: plan.timelineEvent.clinicalEntryId ?? null,
        attachmentId: plan.timelineEvent.attachmentId ?? null,
        occurredAt: new Date(plan.timelineEvent.occurredAt)
      });
    });

    return {
      operation: 'entry_mutation',
      recordId: plan.record.id,
      entryId: plan.updatedEntry.id,
      revisionId: plan.revision.id,
      timelineEventIds: [plan.timelineEvent.id],
      persistedVersion: plan.updatedEntry.version
    };
  }

  public ensureRecord(accountId: AccountId, encounterId: EncounterId): MedicalRecordSummary {
    const encounter = this.#requireEncounterForAccount(accountId, encounterId);
    const existingId = this.#recordByEncounterId.get(encounterId);
    if (existingId) {
      return this.getRecordOrThrow(accountId, existingId);
    }

    this.#assertEncounterWritable(accountId, encounterId);
    const patient = this.#patients.getOrThrow(encounter.patientId);
    if (patient.id !== encounter.patientId || patient.accountId !== accountId) {
      throw new NotFoundError('Patient not found', { patientId: encounter.patientId });
    }
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

    this.#assertAtomicPersistenceAvailable(accountId, 'record creation');

    const recordCreatedEvent: ClinicalTimelineEventSummary = {
      id: createCorrelationId('cln') as never,
      accountId: record.accountId,
      medicalRecordId: record.id,
      encounterId: record.encounterId,
      eventType: 'record_created',
      summary: 'Medical record created for encounter',
      actorUserId: encounter.createdByUserId,
      occurredAt: now
    };

    this.#records.set(record.id, record);
    this.#recordByEncounterId.set(encounterId, record.id);
    this.#entries.set(record.id, []);
    this.#timeline.set(record.id, [recordCreatedEvent]);
    if (this.#hasPersistenceRepositories()) {
      this.#enqueueRecordCreation({ record, recordCreatedEvent }, () => {
        if (this.#records.get(record.id) !== record) return;
        this.#records.delete(record.id);
        if (this.#recordByEncounterId.get(encounterId) === record.id) {
          this.#recordByEncounterId.delete(encounterId);
        }
        this.#entries.delete(record.id);
        this.#timeline.delete(record.id);
      });
    }
    return record;
  }

  /**
   * Persists a new clinical entry and its timeline effects in one tenant
   * transaction. The legacy addEntry API remains available for in-memory
   * callers, while the canonical PostgreSQL runtime uses this command to
   * avoid a record/entry/timeline partial write.
   */
  public async createEntryAtomically(
    accountId: AccountId,
    actorUserId: UserId,
    payload: CreateClinicalEntryRequest
  ): Promise<ClinicalEntrySummary> {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    const encounter = this.#assertEncounterWritable(accountId, encounterId);
    const patient = this.#patients.getOrThrow(patientId);
    if (encounter.patientId !== patientId || patient.accountId !== encounter.accountId) {
      throw new NotFoundError('Encounter does not match patient', { encounterId, patientId });
    }

    const title = requireNonEmptyString(payload.title, 'title');
    const content = requireNonEmptyString(payload.content, 'content');
    if (title.length > 255 || content.length > 10000) {
      throw new ValidationError('Clinical entry exceeds the supported size', {
        titleMaxLength: 255,
        contentMaxLength: 10000
      });
    }

    // GET/read flows may create a record lazily and enqueue its database write
    // before the user submits the first clinical entry. Wait for that queue to
    // settle before loading the record, otherwise the transaction can update a
    // not-yet-inserted record and fail its integrity trigger.
    await this.#pendingPersist;
    let record = await this.#loadRecordByEncounterId(accountId, encounterId);
    const recordWasCreated = !record;
    if (record) this.#assertRecordWritable(record);

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

    const updatedRecord: MedicalRecordSummary = { ...record, updatedAt: now };
    const persistenceInput: MedicalRecordsEntryCreationPersistence = {
      record,
      updatedRecord,
      entry,
      recordCreatedEvent: recordWasCreated ? recordCreatedEvent : undefined,
      entryEvent
    };
    if (!this.#hasPersistenceRepositories()) {
      const fallbackEntry = this.#addEntryInMemory(accountId, actorUserId, payload);
      await this.waitForPersistence();
      return fallbackEntry;
    }

    this.#assertAtomicPersistenceAvailable(accountId, 'entry creation');
    await this.#persistEntryCreation(persistenceInput);
    this.#records.set(updatedRecord.id, updatedRecord);
    this.#recordByEncounterId.set(encounterId, updatedRecord.id);
    this.#entries.set(updatedRecord.id, [
      entry,
      ...this.#filterEntriesForRecord(updatedRecord, this.#entries.get(updatedRecord.id) ?? [])
    ]);
    this.#timeline.set(updatedRecord.id, [
      entryEvent,
      ...(recordWasCreated ? [recordCreatedEvent] : []),
      ...this.#filterTimelineForRecord(updatedRecord, this.#timeline.get(updatedRecord.id) ?? [])
    ]);
    return entry;
  }

  async #loadRecordById(
    accountId: AccountId,
    recordId: MedicalRecordId
  ): Promise<MedicalRecordSummary | null> {
    const cached = this.#records.get(recordId);
    if (cached) {
      return this.#assertRecordForAccount(accountId, recordId, cached);
    }

    if (!this.#medicalRecordRepository) {
      return null;
    }

    const record = await this.#medicalRecordRepository.findById(recordId, accountId);
    if (!record) {
      return null;
    }

    this.#assertRecordForAccount(accountId, recordId, record);

    this.#records.set(record.id, record);
    this.#recordByEncounterId.set(record.encounterId, record.id);
    return record;
  }

  async #loadRecordByEncounterId(
    accountId: AccountId,
    encounterId: EncounterId
  ): Promise<MedicalRecordSummary | null> {
    this.#requireEncounterForAccount(accountId, encounterId);
    const cachedId = this.#recordByEncounterId.get(encounterId);
    if (cachedId) {
      const cached = this.#records.get(cachedId);
      if (!cached) return null;
      if (cached.encounterId !== encounterId) {
        throw new NotFoundError('Medical record not found', { encounterId });
      }
      return this.#assertRecordForAccount(accountId, cachedId, cached);
    }

    if (!this.#medicalRecordRepository) {
      return null;
    }

    const record = await this.#medicalRecordRepository.findByEncounterId(encounterId, accountId);
    if (!record) {
      return null;
    }

    if (record.encounterId !== encounterId) {
      throw new NotFoundError('Medical record not found', { encounterId });
    }
    this.#assertRecordForAccount(accountId, record.id, record);

    this.#records.set(record.id, record);
    this.#recordByEncounterId.set(encounterId, record.id);
    return record;
  }

  public getRecordByEncounterOrThrow(
    accountId: AccountId,
    encounterId: EncounterId
  ): MedicalRecordSummary {
    return this.ensureRecord(accountId, encounterId);
  }

  public async getRecordByEncounterOrThrowAsync(
    accountId: AccountId,
    encounterId: EncounterId
  ): Promise<MedicalRecordSummary> {
    const loaded = await this.#loadRecordByEncounterId(accountId, encounterId);
    if (loaded) {
      return loaded;
    }

    return this.ensureRecord(accountId, encounterId);
  }

  public getRecordOrThrow(accountId: AccountId, recordId: MedicalRecordId): MedicalRecordSummary {
    const record = this.#records.get(recordId);
    if (!record) {
      throw new NotFoundError('Medical record not found', { recordId });
    }

    return this.#assertRecordForAccount(accountId, recordId, record);
  }

  public async getRecordOrThrowAsync(
    accountId: AccountId,
    recordId: MedicalRecordId
  ): Promise<MedicalRecordSummary> {
    const loaded = await this.#loadRecordById(accountId, recordId);
    if (!loaded) {
      throw new NotFoundError('Medical record not found', { recordId });
    }

    return loaded;
  }

  public async getEntryOrThrowAsync(
    accountId: AccountId,
    entryId: ClinicalEntryId
  ): Promise<ClinicalEntrySummary> {
    if (this.#clinicalEntryRepository) {
      const entry = await this.#clinicalEntryRepository.findById(entryId, accountId);
      if (entry) {
        if (entry.accountId !== accountId) {
          throw new NotFoundError('Clinical entry not found', { entryId });
        }
        const record = await this.#loadRecordById(accountId, entry.medicalRecordId);
        if (!record) {
          throw new NotFoundError('Medical record not found for clinical entry', {
            entryId,
            medicalRecordId: entry.medicalRecordId
          });
        }
        const entries = await this.#clinicalEntryRepository.findByMedicalRecordId(
          record.id,
          accountId
        );
        const scopedEntries = this.#filterEntriesForRecord(record, entries);
        this.#entries.set(record.id, scopedEntries);
        const scopedEntry = scopedEntries.find((candidate) => candidate.id === entryId);
        if (!scopedEntry) {
          throw new NotFoundError('Clinical entry not found', { entryId });
        }
        return scopedEntry;
      }
    } else {
      const cachedEntry = this.#findCachedEntry(accountId, entryId);
      if (cachedEntry) return cachedEntry.entry;
    }
    throw new NotFoundError('Clinical entry not found', { entryId });
  }

  /**
   * Synchronous compatibility path for memory-only consumers. Persistent
   * runtimes must use createEntryAtomically so the record, entry and timeline
   * write set is committed before the cache is published.
   */
  public addEntry(
    accountId: AccountId,
    actorUserId: UserId,
    payload: CreateClinicalEntryRequest
  ): ClinicalEntrySummary {
    if (this.#hasPersistenceRepositories()) {
      throw new Error('Persistent medical-record entry creation requires createEntryAtomically');
    }
    return this.#addEntryInMemory(accountId, actorUserId, payload);
  }

  #addEntryInMemory(
    accountId: AccountId,
    actorUserId: UserId,
    payload: CreateClinicalEntryRequest
  ): ClinicalEntrySummary {
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId') as EncounterId;
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    const encounter = this.#assertEncounterWritable(accountId, encounterId);
    const patient = this.#patients.getOrThrow(patientId);
    if (encounter.patientId !== patientId) {
      throw new NotFoundError('Encounter does not match patient', {
        encounterId,
        patientId
      });
    }
    if (patient.id !== patientId || patient.accountId !== accountId) {
      throw new NotFoundError('Patient not found', { patientId });
    }
    const title = requireNonEmptyString(payload.title, 'title');
    const content = requireNonEmptyString(payload.content, 'content');
    if (title.length > 255 || content.length > 10000) {
      throw new ValidationError('Clinical entry exceeds the supported size', {
        titleMaxLength: 255,
        contentMaxLength: 10000
      });
    }

    const existingRecordId = this.#recordByEncounterId.get(encounterId);
    const existingRecord = existingRecordId
      ? this.getRecordOrThrow(accountId, existingRecordId)
      : undefined;
    if (existingRecord) this.#assertRecordWritable(existingRecord);

    const recordWasCreated = !existingRecord;
    const now = nowIso();
    const record: MedicalRecordSummary = existingRecord ?? {
      id: createCorrelationId('mr') as MedicalRecordId,
      accountId: encounter.accountId,
      encounterId,
      patientId,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };
    const recordCreatedEvent: ClinicalTimelineEventSummary | undefined = recordWasCreated
      ? {
          id: createCorrelationId('cln') as never,
          accountId: record.accountId,
          medicalRecordId: record.id,
          encounterId,
          eventType: 'record_created',
          summary: 'Medical record created for encounter',
          actorUserId: encounter.createdByUserId,
          occurredAt: now
        }
      : undefined;

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

    if (recordWasCreated) {
      this.#records.set(record.id, record);
      this.#recordByEncounterId.set(encounterId, record.id);
      this.#entries.set(record.id, []);
      this.#timeline.set(record.id, recordCreatedEvent ? [recordCreatedEvent] : []);
    }

    const currentEntries = this.#filterEntriesForRecord(record, this.#entries.get(record.id) ?? []);
    const updatedRecord: MedicalRecordSummary = { ...record, updatedAt: now };
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
    this.#entries.set(record.id, [entry, ...currentEntries]);
    this.#records.set(record.id, updatedRecord);
    const currentTimeline = this.#filterTimelineForRecord(
      updatedRecord,
      this.#timeline.get(record.id) ?? []
    ).filter((event) => event.id !== entryEvent.id && event.id !== recordCreatedEvent?.id);
    this.#timeline.set(record.id, [
      entryEvent,
      ...(recordCreatedEvent ? [recordCreatedEvent] : []),
      ...currentTimeline
    ]);

    return entry;
  }

  /**
   * Synchronous compatibility path for memory-only consumers. Persistent
   * runtimes must use updateEntryAtomically to avoid publishing an uncommitted
   * clinical mutation.
   */
  public updateEntry(
    accountId: AccountId,
    actorUserId: UserId,
    entryId: ClinicalEntryId,
    payload: UpdateClinicalEntryRequest
  ): ClinicalEntrySummary {
    if (this.#hasPersistenceRepositories()) {
      throw new Error('Persistent clinical entry updates require updateEntryAtomically');
    }
    return this.#updateEntryInMemory(accountId, actorUserId, entryId, payload);
  }

  #updateEntryInMemory(
    accountId: AccountId,
    actorUserId: UserId,
    entryId: ClinicalEntryId,
    payload: UpdateClinicalEntryRequest
  ): ClinicalEntrySummary {
    const plan = this.#prepareEntryMutation(accountId, actorUserId, entryId, payload, 'update');
    this.#applyEntryMutation(plan);
    return plan.updatedEntry;
  }

  public async updateEntryAtomically(
    accountId: AccountId,
    actorUserId: UserId,
    entryId: ClinicalEntryId,
    payload: UpdateClinicalEntryRequest
  ): Promise<ClinicalEntrySummary> {
    if (!this.#hasPersistenceRepositories()) {
      const updatedEntry = this.#updateEntryInMemory(accountId, actorUserId, entryId, payload);
      await this.waitForPersistence();
      return updatedEntry;
    }

    await this.#pendingPersist;
    await this.getEntryOrThrowAsync(accountId, entryId);
    const plan = this.#prepareEntryMutation(accountId, actorUserId, entryId, payload, 'update');
    this.#assertAtomicPersistenceAvailable(accountId, 'entry mutation');
    await this.#persistEntryMutation(plan);
    this.#applyEntryMutation(plan);
    return plan.updatedEntry;
  }

  /**
   * Synchronous compatibility path for memory-only consumers. Persistent
   * runtimes must use archiveEntryAtomically to keep the cache and durable
   * revision/timeline write set consistent.
   */
  public archiveEntry(
    accountId: AccountId,
    actorUserId: UserId,
    entryId: ClinicalEntryId,
    payload: ArchiveClinicalEntryRequest
  ): ClinicalEntrySummary {
    if (this.#hasPersistenceRepositories()) {
      throw new Error('Persistent clinical entry archives require archiveEntryAtomically');
    }
    return this.#archiveEntryInMemory(accountId, actorUserId, entryId, payload);
  }

  #archiveEntryInMemory(
    accountId: AccountId,
    actorUserId: UserId,
    entryId: ClinicalEntryId,
    payload: ArchiveClinicalEntryRequest
  ): ClinicalEntrySummary {
    const plan = this.#prepareEntryMutation(accountId, actorUserId, entryId, payload, 'archive');
    this.#applyEntryMutation(plan);
    return plan.updatedEntry;
  }

  public async archiveEntryAtomically(
    accountId: AccountId,
    actorUserId: UserId,
    entryId: ClinicalEntryId,
    payload: ArchiveClinicalEntryRequest
  ): Promise<ClinicalEntrySummary> {
    if (!this.#hasPersistenceRepositories()) {
      const archivedEntry = this.#archiveEntryInMemory(accountId, actorUserId, entryId, payload);
      await this.waitForPersistence();
      return archivedEntry;
    }

    await this.#pendingPersist;
    await this.getEntryOrThrowAsync(accountId, entryId);
    const plan = this.#prepareEntryMutation(accountId, actorUserId, entryId, payload, 'archive');
    this.#assertAtomicPersistenceAvailable(accountId, 'entry mutation');
    await this.#persistEntryMutation(plan);
    this.#applyEntryMutation(plan);
    return plan.updatedEntry;
  }

  public getEntryRevisions(
    accountId: AccountId,
    entryId: ClinicalEntryId
  ): readonly EntryRevisionSummary[] {
    if (this.#entryRevisionRepository) {
      // Note: async repo reads not called here for sync compat
    }
    if (!this.#findCachedEntry(accountId, entryId)) {
      throw new NotFoundError('Clinical entry not found', { entryId });
    }
    return [...(this.#revisions.get(entryId) ?? [])];
  }

  public async getEntryRevisionsAsync(
    accountId: AccountId,
    entryId: ClinicalEntryId
  ): Promise<readonly EntryRevisionSummary[]> {
    await this.getEntryOrThrowAsync(accountId, entryId);
    if (this.#entryRevisionRepository) {
      const revisions = this.#filterRevisionsForEntry(
        entryId,
        await this.#entryRevisionRepository.findByEntryId(entryId, accountId)
      );
      this.#revisions.set(entryId, [...revisions]);
      return revisions;
    }

    return this.getEntryRevisions(accountId, entryId);
  }

  public listEntriesByEncounter(
    accountId: AccountId,
    encounterId: EncounterId,
    options?: {
      readonly includeArchived?: boolean;
    }
  ): readonly ClinicalEntrySummary[] {
    this.#requireEncounterForAccount(accountId, encounterId);
    const recordId = this.#recordByEncounterId.get(encounterId);
    if (!recordId) return [];
    const record = this.getRecordOrThrow(accountId, recordId);
    const entries = this.#filterEntriesForRecord(record, this.#entries.get(record.id) ?? []);
    if (options?.includeArchived) {
      return entries;
    }
    return entries.filter((entry) => !entry.deletedAt);
  }

  public async listEntriesByEncounterAsync(
    accountId: AccountId,
    encounterId: EncounterId,
    options?: {
      readonly includeArchived?: boolean;
    }
  ): Promise<readonly ClinicalEntrySummary[]> {
    const record = await this.getRecordByEncounterOrThrowAsync(accountId, encounterId);
    if (this.#clinicalEntryRepository) {
      const entries = this.#filterEntriesForRecord(
        record,
        await this.#clinicalEntryRepository.findByMedicalRecordId(record.id, accountId)
      );
      this.#entries.set(record.id, entries);
      if (options?.includeArchived) {
        return entries;
      }
      return entries.filter((entry) => !entry.deletedAt);
    }

    return this.listEntriesByEncounter(accountId, encounterId, options);
  }

  public listTimelineByEncounter(
    accountId: AccountId,
    encounterId: EncounterId
  ): readonly ClinicalTimelineEventSummary[] {
    this.#requireEncounterForAccount(accountId, encounterId);
    const recordId = this.#recordByEncounterId.get(encounterId);
    if (!recordId) return [];
    const record = this.getRecordOrThrow(accountId, recordId);
    return this.#filterTimelineForRecord(record, this.#timeline.get(record.id) ?? []);
  }

  public async listTimelineByEncounterAsync(
    accountId: AccountId,
    encounterId: EncounterId
  ): Promise<readonly ClinicalTimelineEventSummary[]> {
    const record = await this.getRecordByEncounterOrThrowAsync(accountId, encounterId);
    if (this.#clinicalTimelineRepository) {
      const events = this.#filterTimelineForRecord(
        record,
        await this.#clinicalTimelineRepository.findByMedicalRecordId(record.id, accountId)
      );
      this.#timeline.set(record.id, events);
      return events;
    }

    return this.listTimelineByEncounter(accountId, encounterId);
  }

  public async listAll(accountId: AccountId): Promise<
    ReadonlyArray<{
      record: MedicalRecordSummary;
      entryCount: number;
    }>
  > {
    const candidateRecords = this.#medicalRecordRepository
      ? await this.#medicalRecordRepository.findAll(accountId)
      : [...this.#records.values()];
    const records = candidateRecords.filter((record) => {
      if (record.accountId !== accountId) return false;
      try {
        this.#assertRecordForAccount(accountId, record.id, record);
        return true;
      } catch {
        return false;
      }
    });

    const results: Array<{ record: MedicalRecordSummary; entryCount: number }> = [];

    for (const record of records) {
      this.#records.set(record.id, record);
      this.#recordByEncounterId.set(record.encounterId, record.id);

      const entries = this.#filterEntriesForRecord(
        record,
        this.#clinicalEntryRepository
          ? await this.#clinicalEntryRepository.findByMedicalRecordId(record.id, accountId)
          : (this.#entries.get(record.id) ?? [])
      );

      if (this.#clinicalEntryRepository) {
        this.#entries.set(record.id, [...entries]);
      }

      const activeCount = entries.filter((e) => !e.deletedAt).length;
      results.push({ record, entryCount: activeCount });
    }

    return results;
  }

  public appendAttachmentEvent(
    accountId: AccountId,
    encounterId: EncounterId,
    actorUserId: UserId,
    attachmentId: string,
    summary: string
  ): void {
    this.#assertEncounterWritable(accountId, encounterId);
    const record = this.ensureRecord(accountId, encounterId);
    this.#assertRecordWritable(record);
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
    accountId: AccountId,
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
    this.#assertEncounterWritable(accountId, encounterId);
    const record = this.ensureRecord(accountId, encounterId);
    this.#assertRecordWritable(record);
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
    const current = [...(this.#timeline.get(medicalRecordId) ?? [])];
    const event: ClinicalTimelineEventSummary = {
      id: createCorrelationId('cln') as never,
      medicalRecordId,
      occurredAt: nowIso(),
      ...input
    };
    this.#timeline.set(medicalRecordId, [event, ...current]);

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
