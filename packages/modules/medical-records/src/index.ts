import { EncountersService } from '@cvg-his-v2/module-encounters';
import { PatientsService } from '@cvg-his-v2/module-patients';
import type { CreateClinicalEntryRequest } from '@cvg-his-v2/shared-contracts';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  ClinicalEntryId,
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  EncounterId,
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
  DatabaseClinicalTimelineRepository
} from './repositories/database-medical-records.repository.js';

export interface MedicalRecordRepository {
  create(record: MedicalRecordSummary): Promise<void>;
  update(record: MedicalRecordSummary): Promise<void>;
  findById(id: MedicalRecordId): Promise<MedicalRecordSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<MedicalRecordSummary | null>;
}

export interface ClinicalEntryRepository {
  create(entry: ClinicalEntrySummary): Promise<void>;
  findByMedicalRecordId(medicalRecordId: MedicalRecordId): Promise<readonly ClinicalEntrySummary[]>;
}

export interface ClinicalTimelineRepository {
  create(event: ClinicalTimelineEventSummary): Promise<void>;
  findByMedicalRecordId(
    medicalRecordId: MedicalRecordId
  ): Promise<readonly ClinicalTimelineEventSummary[]>;
}

export interface MedicalRecordsServiceOptions {
  readonly encounters: EncountersService;
  readonly patients: PatientsService;
  readonly medicalRecordRepository?: MedicalRecordRepository;
  readonly clinicalEntryRepository?: ClinicalEntryRepository;
  readonly clinicalTimelineRepository?: ClinicalTimelineRepository;
}

export class MedicalRecordsService {
  readonly #encounters: EncountersService;
  readonly #patients: PatientsService;
  readonly #medicalRecordRepository?: MedicalRecordRepository;
  readonly #clinicalEntryRepository?: ClinicalEntryRepository;
  readonly #clinicalTimelineRepository?: ClinicalTimelineRepository;

  // In-memory fallback stores
  readonly #records = new Map<MedicalRecordId, MedicalRecordSummary>();
  readonly #recordByEncounterId = new Map<EncounterId, MedicalRecordId>();
  readonly #entries = new Map<MedicalRecordId, ClinicalEntrySummary[]>();
  readonly #timeline = new Map<MedicalRecordId, ClinicalTimelineEventSummary[]>();

  public constructor(options: MedicalRecordsServiceOptions) {
    this.#encounters = options.encounters;
    this.#patients = options.patients;
    this.#medicalRecordRepository = options.medicalRecordRepository;
    this.#clinicalEntryRepository = options.clinicalEntryRepository;
    this.#clinicalTimelineRepository = options.clinicalTimelineRepository;
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

    // Persist to repository if available
    if (this.#medicalRecordRepository) {
      this.#medicalRecordRepository.create(record).catch(() => {});
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

  public getRecordByEncounterOrThrow(encounterId: EncounterId): MedicalRecordSummary {
    return this.ensureRecord(encounterId);
  }

  public getRecordOrThrow(recordId: MedicalRecordId): MedicalRecordSummary {
    const record = this.#records.get(recordId);
    if (!record) {
      throw new NotFoundError('Medical record not found', { recordId });
    }

    return record;
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

    // Persist to repository if available
    if (this.#clinicalEntryRepository) {
      this.#clinicalEntryRepository.create(entry).catch(() => {});
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

  public listEntriesByEncounter(encounterId: EncounterId): readonly ClinicalEntrySummary[] {
    const record = this.ensureRecord(encounterId);
    return [...(this.#entries.get(record.id) ?? [])];
  }

  public listTimelineByEncounter(
    encounterId: EncounterId
  ): readonly ClinicalTimelineEventSummary[] {
    const record = this.ensureRecord(encounterId);
    return [...(this.#timeline.get(record.id) ?? [])];
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
      | 'surgery_requested'
      | 'surgery_status_changed'
      | 'diagnostic_requested'
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

    // Persist to repository if available
    if (this.#clinicalTimelineRepository) {
      this.#clinicalTimelineRepository.create(event).catch(() => {});
    }

    return event;
  }
}
