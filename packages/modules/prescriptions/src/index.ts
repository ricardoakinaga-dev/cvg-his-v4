import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  ClinicalEntryId,
  ClinicalEntrySummary,
  EncounterId,
  PatientId,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

/**
 * PrescriptionId is a branded string for prescription identifiers.
 * Corresponds to a ClinicalEntryId where entryType === 'prescription'.
 */
export type PrescriptionId = ClinicalEntryId & { readonly __PrescriptionIdBrand: unique symbol };

/**
 * PrescriptionSummary is the canonical domain view of a prescription.
 * It is a ClinicalEntrySummary with entryType === 'prescription' and
 * convenience fields for medication-specific data parsed from content.
 */
export interface PrescriptionSummary {
  readonly id: PrescriptionId;
  readonly accountId: AccountId;
  readonly medicalRecordId: ClinicalEntrySummary['medicalRecordId'];
  readonly encounterId: EncounterId;
  readonly patientId: PatientId;
  readonly entryType: 'prescription';
  readonly title: string;
  readonly content: string;
  readonly authoredByUserId: UserId;
  readonly version: number;
  readonly deletedAt?: string;
  readonly deletedByUserId?: UserId;
  readonly deleteReason?: string;
  readonly lastRevisionReason?: string;
  readonly lastRevisionByUserId?: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Medication name (same as title) */
  readonly medicationName: string;
  /** Parsed from content line "Posologia: X" */
  readonly dosage?: string;
  /** Parsed from content line "Via: X" */
  readonly route?: string;
  /** Parsed from content line "Frequência: X" */
  readonly frequency?: string;
  readonly notes?: string;
}

export interface PrescriptionDocumentContext {
  readonly clinic: {
    readonly name: string;
    readonly document?: string;
    readonly address?: string;
    readonly phone?: string;
  };
  readonly owner: {
    readonly name: string;
    readonly document?: string;
  };
  readonly patient: {
    readonly name: string;
    readonly species?: string;
    readonly breed?: string;
    readonly weightKg?: number;
  };
  readonly professional: {
    readonly name: string;
    readonly license?: string;
  };
}

export interface PrescriptionDocument {
  readonly title: 'Receita Veterinaria';
  readonly prescriptionId: PrescriptionId;
  readonly issuedAt: string;
  readonly header: string;
  readonly owner: string;
  readonly patient: string;
  readonly medications: ReadonlyArray<{
    readonly medicationName: string;
    readonly dosage?: string;
    readonly route?: string;
    readonly frequency?: string;
    readonly notes?: string;
  }>;
  readonly footer: string;
  readonly printText: string;
}

export interface CreatePrescriptionRequest {
  readonly medicalRecordId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly medicationName: string;
  readonly dosage?: string;
  readonly route?: string;
  readonly frequency?: string;
  readonly notes?: string;
}

export interface UpdatePrescriptionRequest {
  readonly title?: string;
  readonly content?: string;
  readonly reason?: string;
  readonly expectedVersion?: number;
}

export interface ArchivePrescriptionRequest {
  readonly reason: string;
  readonly expectedVersion?: number;
}

/**
 * Converts a ClinicalEntrySummary with entryType === 'prescription' into a PrescriptionSummary.
 * Returns null if the entry is not a prescription.
 */
export function toPrescriptionSummary(entry: ClinicalEntrySummary): PrescriptionSummary | null {
  if (entry.entryType !== 'prescription') return null;

  const lines = entry.content.split('\n');
  let dosage: string | undefined;
  let route: string | undefined;
  let frequency: string | undefined;
  let notes: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Posologia:')) dosage = trimmed.slice('Posologia:'.length).trim();
    else if (trimmed.startsWith('Via:')) route = trimmed.slice('Via:'.length).trim();
    else if (trimmed.startsWith('Frequência:')) frequency = trimmed.slice('Frequência:'.length).trim();
    else if (trimmed.startsWith('Observações:')) notes = trimmed.slice('Observações:'.length).trim();
  }

  return {
    id: entry.id as PrescriptionId,
    accountId: entry.accountId,
    medicalRecordId: entry.medicalRecordId,
    encounterId: entry.encounterId,
    patientId: entry.patientId,
    entryType: 'prescription',
    title: entry.title,
    content: entry.content,
    authoredByUserId: entry.authoredByUserId,
    version: entry.version,
    deletedAt: entry.deletedAt,
    deletedByUserId: entry.deletedByUserId,
    deleteReason: entry.deleteReason,
    lastRevisionReason: (entry as { lastRevisionReason?: string }).lastRevisionReason,
    lastRevisionByUserId: (entry as { lastRevisionByUserId?: UserId }).lastRevisionByUserId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    medicationName: entry.title,
    dosage,
    route,
    frequency,
    notes
  };
}

function formatPrescriptionContent(payload: CreatePrescriptionRequest): string {
  const lines: string[] = [];
  if (payload.dosage) lines.push(`Posologia: ${payload.dosage}`);
  if (payload.route) lines.push(`Via: ${payload.route}`);
  if (payload.frequency) lines.push(`Frequência: ${payload.frequency}`);
  if (payload.notes) lines.push(`Observações: ${payload.notes}`);
  return lines.join('\n');
}

export interface PrescriptionRepository {
  create(prescription: PrescriptionSummary): Promise<void>;
  update(prescription: PrescriptionSummary): Promise<void>;
  findById(id: PrescriptionId): Promise<PrescriptionSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly PrescriptionSummary[]>;
  findByPatientId(patientId: PatientId): Promise<readonly PrescriptionSummary[]>;
  findByAccountId(accountId: AccountId): Promise<readonly PrescriptionSummary[]>;
  findByAccountIdPaginated(
    accountId: AccountId,
    options: { offset: number; limit: number }
  ): Promise<{ items: readonly PrescriptionSummary[]; total: number }>;
}

/**
 * In-memory implementation of PrescriptionRepository for testing and
 * environments without an external database.
 */
export class InMemoryPrescriptionRepository implements PrescriptionRepository {
  readonly #store = new Map<string, ClinicalEntrySummary>();

  async create(prescription: PrescriptionSummary): Promise<void> {
    this.#store.set(prescription.id, prescription as unknown as ClinicalEntrySummary);
  }

  async update(prescription: PrescriptionSummary): Promise<void> {
    this.#store.set(prescription.id, prescription as unknown as ClinicalEntrySummary);
  }

  async findById(id: PrescriptionId): Promise<PrescriptionSummary | null> {
    const entry = this.#store.get(id);
    if (!entry) return null;
    return toPrescriptionSummary(entry);
  }

  async findByEncounterId(encounterId: EncounterId): Promise<readonly PrescriptionSummary[]> {
    return Array.from(this.#store.values())
      .filter((e) => e.encounterId === encounterId && e.entryType === 'prescription')
      .map(toPrescriptionSummary)
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  async findByPatientId(patientId: PatientId): Promise<readonly PrescriptionSummary[]> {
    return Array.from(this.#store.values())
      .filter((e) => e.patientId === patientId && e.entryType === 'prescription')
      .map(toPrescriptionSummary)
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  async findByAccountId(accountId: AccountId): Promise<readonly PrescriptionSummary[]> {
    return Array.from(this.#store.values())
      .filter((e) => e.accountId === accountId && e.entryType === 'prescription')
      .map(toPrescriptionSummary)
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  async findByAccountIdPaginated(
    accountId: AccountId,
    options: { offset: number; limit: number }
  ): Promise<{ items: readonly PrescriptionSummary[]; total: number }> {
    const all = await this.findByAccountId(accountId);
    return {
      items: all.slice(options.offset, options.offset + options.limit),
      total: all.length,
    };
  }
}

export interface PrescriptionsServiceOptions {
  readonly prescriptionRepository?: PrescriptionRepository;
}

/**
 * PrescriptionsService manages prescriptions.
 *
 * Prescriptions are stored as ClinicalEntry records with entryType === 'prescription'.
 * The service provides prescription-specific validation, business logic, and convenience
 * queries. Persistence is delegated to the optional PrescriptionRepository.
 */
export class PrescriptionsService {
  readonly #prescriptionRepository?: PrescriptionRepository;
  readonly #prescriptions = new Map<PrescriptionId, ClinicalEntrySummary>();
  #pendingPersist = Promise.resolve();
  #lastPersist = Promise.resolve();

  public constructor(options: PrescriptionsServiceOptions = {}) {
    this.#prescriptionRepository = options.prescriptionRepository;
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#prescriptionRepository) {
      return;
    }

    const prescriptions = await this.#prescriptionRepository.findByAccountId(accountId);
    for (const prescription of prescriptions) {
      this.#prescriptions.set(prescription.id, prescription as unknown as ClinicalEntrySummary);
    }
  }

  public async waitForPersistence(): Promise<void> {
    try {
      await this.#lastPersist;
    } finally {
      this.#pendingPersist = this.#pendingPersist.catch(() => {});
      this.#lastPersist = this.#pendingPersist;
    }
  }

  #enqueuePersist(op: () => Promise<void>, rollback?: () => void): void {
    const pending = this.#pendingPersist.then(async () => {
      try {
        await op();
      } catch (error) {
        rollback?.();
        throw error;
      }
    });
    this.#lastPersist = pending;
    this.#pendingPersist = pending;
  }

  #validateCreate(payload: CreatePrescriptionRequest): void {
    requireNonEmptyString(payload.medicalRecordId, 'medicalRecordId');
    requireNonEmptyString(payload.encounterId, 'encounterId');
    requireNonEmptyString(payload.patientId, 'patientId');
    requireNonEmptyString(payload.medicationName, 'medicationName');
    if (payload.medicationName.trim().length < 2) {
      throw new ValidationError('Medication name must be at least 2 characters', { field: 'medicationName' });
    }
  }

  public create(accountId: AccountId, actorUserId: UserId, payload: CreatePrescriptionRequest): PrescriptionSummary {
    this.#validateCreate(payload);

    const now = nowIso();
    const entry: ClinicalEntrySummary = {
      id: createCorrelationId('rx') as ClinicalEntryId,
      accountId,
      medicalRecordId: payload.medicalRecordId as never,
      encounterId: payload.encounterId as EncounterId,
      patientId: payload.patientId as PatientId,
      entryType: 'prescription',
      title: payload.medicationName.trim(),
      content: formatPrescriptionContent(payload),
      authoredByUserId: actorUserId,
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    this.#prescriptions.set(entry.id as PrescriptionId, entry);

    if (this.#prescriptionRepository) {
      const prescription = toPrescriptionSummary(entry);
      if (prescription) {
        this.#enqueuePersist(
          () => this.#prescriptionRepository!.create(prescription),
          () => {
            if (this.#prescriptions.get(entry.id as PrescriptionId) === entry) {
              this.#prescriptions.delete(entry.id as PrescriptionId);
            }
          }
        );
      }
    }

    const prescription = toPrescriptionSummary(entry);
    if (!prescription) throw new ValidationError('Failed to build prescription summary');
    return prescription;
  }

  public getById(
    prescriptionId: PrescriptionId,
    expectedAccountId?: AccountId
  ): PrescriptionSummary {
    const entry = this.#prescriptions.get(prescriptionId);
    if (!entry) throw new NotFoundError('Prescription not found', { prescriptionId });
    const prescription = toPrescriptionSummary(entry);
    if (!prescription) throw new NotFoundError('Prescription not found', { prescriptionId });
    if (expectedAccountId && prescription.accountId !== expectedAccountId) {
      throw new NotFoundError('Prescription not found', { prescriptionId });
    }
    return prescription;
  }

  public async getByIdAsync(
    prescriptionId: PrescriptionId,
    expectedAccountId?: AccountId
  ): Promise<PrescriptionSummary> {
    if (this.#prescriptions.has(prescriptionId)) {
      return this.getById(prescriptionId, expectedAccountId);
    }

    const persisted = await this.#prescriptionRepository?.findById(prescriptionId);
    if (!persisted || (expectedAccountId && persisted.accountId !== expectedAccountId)) {
      throw new NotFoundError('Prescription not found', { prescriptionId });
    }

    const cached = { ...persisted };
    this.#prescriptions.set(
      prescriptionId,
      cached as unknown as ClinicalEntrySummary
    );
    return cached;
  }

  public renderDocument(
    prescriptionId: PrescriptionId,
    context: PrescriptionDocumentContext,
    expectedAccountId?: AccountId
  ): PrescriptionDocument {
    const prescription = this.getById(prescriptionId, expectedAccountId);
    const header = [
      context.clinic.name,
      context.clinic.document ? `CNPJ/CPF: ${context.clinic.document}` : '',
      context.clinic.address,
      context.clinic.phone ? `Telefone: ${context.clinic.phone}` : ''
    ]
      .filter(Boolean)
      .join('\n');
    const owner = [
      `Tutor: ${context.owner.name}`,
      context.owner.document ? `Documento: ${context.owner.document}` : ''
    ]
      .filter(Boolean)
      .join('\n');
    const patient = [
      `Animal: ${context.patient.name}`,
      context.patient.species ? `Especie: ${context.patient.species}` : '',
      context.patient.breed ? `Raca: ${context.patient.breed}` : '',
      context.patient.weightKg !== undefined ? `Peso: ${context.patient.weightKg} kg` : ''
    ]
      .filter(Boolean)
      .join('\n');
    const medication = {
      medicationName: prescription.medicationName,
      dosage: prescription.dosage,
      route: prescription.route,
      frequency: prescription.frequency,
      notes: prescription.notes
    };
    const footer = [
      `Profissional: ${context.professional.name}`,
      context.professional.license ? `Registro: ${context.professional.license}` : '',
      `Emitida em: ${prescription.createdAt}`,
      `Identificador: ${prescription.id}`
    ]
      .filter(Boolean)
      .join('\n');
    const printText = [
      'Receita Veterinaria',
      header,
      owner,
      patient,
      `Medicamento: ${medication.medicationName}`,
      medication.dosage ? `Posologia: ${medication.dosage}` : '',
      medication.route ? `Via: ${medication.route}` : '',
      medication.frequency ? `Frequencia: ${medication.frequency}` : '',
      medication.notes ? `Orientacoes: ${medication.notes}` : '',
      footer
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      title: 'Receita Veterinaria',
      prescriptionId,
      issuedAt: prescription.createdAt,
      header,
      owner,
      patient,
      medications: [medication],
      footer,
      printText
    };
  }

  public listByEncounter(
    encounterId: EncounterId,
    expectedAccountId?: AccountId
  ): readonly PrescriptionSummary[] {
    return Array.from(this.#prescriptions.values())
      .filter(
        (entry) =>
          entry.encounterId === encounterId &&
          entry.entryType === 'prescription' &&
          (!expectedAccountId || entry.accountId === expectedAccountId)
      )
      .map(toPrescriptionSummary)
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  public listByPatient(
    patientId: PatientId,
    expectedAccountId?: AccountId
  ): readonly PrescriptionSummary[] {
    return Array.from(this.#prescriptions.values())
      .filter(
        (entry) =>
          entry.patientId === patientId &&
          entry.entryType === 'prescription' &&
          (!expectedAccountId || entry.accountId === expectedAccountId)
      )
      .map(toPrescriptionSummary)
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  public listByAccount(accountId: AccountId): readonly PrescriptionSummary[] {
    return Array.from(this.#prescriptions.values())
      .filter((e) => e.accountId === accountId && e.entryType === 'prescription')
      .map(toPrescriptionSummary)
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  public update(
    prescriptionId: PrescriptionId,
    actorUserId: UserId,
    payload: UpdatePrescriptionRequest,
    expectedAccountId?: AccountId
  ): PrescriptionSummary {
    const current = this.getById(prescriptionId, expectedAccountId);
    if (current.deletedAt) throw new ValidationError('Cannot update an archived prescription', { prescriptionId });
    requireNonEmptyString(payload.reason, 'reason');
    if (payload.expectedVersion !== undefined && payload.expectedVersion !== current.version) {
      throw new ValidationError('Prescription version mismatch', {
        prescriptionId, expectedVersion: payload.expectedVersion, currentVersion: current.version
      });
    }

    const now = nowIso();
    const updated: ClinicalEntrySummary = {
      ...current,
      title: payload.title ?? current.title,
      content: payload.content ?? current.content,
      version: current.version + 1,
      lastRevisionReason: payload.reason,
      lastRevisionByUserId: actorUserId,
      updatedAt: now
    } as ClinicalEntrySummary;

    this.#prescriptions.set(prescriptionId, updated);
    if (this.#prescriptionRepository) {
      const prescription = toPrescriptionSummary(updated);
      if (prescription) {
        this.#enqueuePersist(
          () => this.#prescriptionRepository!.update(prescription),
          () => {
            this.#prescriptions.set(prescriptionId, current as unknown as ClinicalEntrySummary);
          }
        );
      }
    }

    const prescription = toPrescriptionSummary(updated);
    if (!prescription) throw new ValidationError('Failed to build prescription summary');
    return prescription;
  }

  public archive(
    prescriptionId: PrescriptionId,
    actorUserId: UserId,
    payload: ArchivePrescriptionRequest,
    expectedAccountId?: AccountId
  ): PrescriptionSummary {
    const current = this.getById(prescriptionId, expectedAccountId);
    if (current.deletedAt) throw new ValidationError('Prescription is already archived', { prescriptionId });
    if (payload.expectedVersion !== undefined && payload.expectedVersion !== current.version) {
      throw new ValidationError('Prescription version mismatch', {
        prescriptionId, expectedVersion: payload.expectedVersion, currentVersion: current.version
      });
    }

    const now = nowIso();
    const updated: ClinicalEntrySummary = {
      ...current,
      version: current.version + 1,
      deletedAt: now,
      deletedByUserId: actorUserId,
      deleteReason: payload.reason,
      updatedAt: now
    };

    this.#prescriptions.set(prescriptionId, updated);
    if (this.#prescriptionRepository) {
      const prescription = toPrescriptionSummary(updated);
      if (prescription) {
        this.#enqueuePersist(
          () => this.#prescriptionRepository!.update(prescription),
          () => {
            this.#prescriptions.set(prescriptionId, current as unknown as ClinicalEntrySummary);
          }
        );
      }
    }

    const prescription = toPrescriptionSummary(updated);
    if (!prescription) throw new ValidationError('Failed to build prescription summary');
    return prescription;
  }
}
