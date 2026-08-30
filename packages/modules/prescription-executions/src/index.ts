import type {
  CreatePrescriptionExecutionRequest,
  ExecutePrescriptionRequest,
  SuspendPrescriptionRequest,
  LogAdministrationEventRequest
} from '@cvg-his-v2/shared-contracts';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  AdministrationEventId,
  AdministrationEventSummary,
  ClinicalEntryId,
  EncounterId,
  PatientId,
  PrescriptionExecutionId,
  PrescriptionExecutionSummary,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString, requireOptionalString } from '@cvg-his-v2/shared-validation';

export type ExecutionStatus =
  | 'pending'
  | 'administered'
  | 'not-administered'
  | 'suspended'
  | 'cancelled';

const VALID_STATUS_TRANSITIONS: Record<ExecutionStatus, readonly ExecutionStatus[]> = {
  pending: ['administered', 'not-administered', 'suspended'],
  administered: [],
  'not-administered': [],
  suspended: ['pending', 'cancelled'],
  cancelled: []
};

export interface PrescriptionExecutionRepository {
  createWithEvent(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary
  ): Promise<void>;
  updateWithEvent(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary,
    expectedVersion: number
  ): Promise<void>;
  findById(id: PrescriptionExecutionId): Promise<PrescriptionExecutionSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly PrescriptionExecutionSummary[]>;
  findByPatientId(patientId: PatientId): Promise<readonly PrescriptionExecutionSummary[]>;
  findByAccountId(accountId: AccountId): Promise<readonly PrescriptionExecutionSummary[]>;
}

export interface PrescriptionExecutionPrescription {
  readonly accountId: AccountId;
  readonly patientId: PatientId;
  readonly encounterId: EncounterId;
  readonly medicationName: string;
  readonly dosage?: string;
  readonly route?: string;
  readonly frequency?: string;
  readonly signedAt?: string;
  readonly deletedAt?: string;
}

export interface PrescriptionExecutionPrescriptionSource {
  getByIdForAccount(
    accountId: AccountId,
    prescriptionId: ClinicalEntryId
  ): PrescriptionExecutionPrescription | null;
}

export interface AdministrationEventRepository {
  create(event: AdministrationEventSummary): Promise<void>;
  findById(eventId: AdministrationEventId): Promise<AdministrationEventSummary | null>;
  deleteById(eventId: AdministrationEventId): Promise<void>;
  findByExecutionId(
    executionId: PrescriptionExecutionId
  ): Promise<readonly AdministrationEventSummary[]>;
}

export interface PrescriptionExecutionsServiceOptions {
  readonly executionRepository?: PrescriptionExecutionRepository;
  readonly eventRepository?: AdministrationEventRepository;
  readonly prescriptionSource?: PrescriptionExecutionPrescriptionSource;
  /** Production composition must fail closed instead of accepting free-form medication data. */
  readonly requirePrescriptionSource?: boolean;
}

function cloneExecution(execution: PrescriptionExecutionSummary): PrescriptionExecutionSummary {
  return { ...execution };
}

function cloneEvent(event: AdministrationEventSummary): AdministrationEventSummary {
  return {
    ...event,
    vitalsSnapshot: event.vitalsSnapshot ? { ...event.vitalsSnapshot } : undefined
  };
}

export class PrescriptionExecutionsService {
  readonly #executions = new Map<PrescriptionExecutionId, PrescriptionExecutionSummary>();
  readonly #events = new Map<PrescriptionExecutionId, AdministrationEventSummary[]>();
  readonly #executionRepository?: PrescriptionExecutionRepository;
  readonly #eventRepository?: AdministrationEventRepository;
  readonly #prescriptionSource?: PrescriptionExecutionPrescriptionSource;
  #pendingPersist: Promise<void> = Promise.resolve();

  public constructor(options: PrescriptionExecutionsServiceOptions = {}) {
    this.#executionRepository = options.executionRepository;
    this.#eventRepository = options.eventRepository;
    this.#prescriptionSource = options.prescriptionSource;
    if (
      (options.requirePrescriptionSource || this.#executionRepository) &&
      !this.#prescriptionSource
    ) {
      throw new ValidationError('Prescription execution requires a prescription source');
    }
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#executionRepository) return;
    for (const [executionId, execution] of this.#executions) {
      if (execution.accountId === accountId) {
        this.#executions.delete(executionId);
        this.#events.delete(executionId);
      }
    }
    const executions = await this.#executionRepository.findByAccountId(accountId);
    for (const execution of executions) {
      this.#executions.set(execution.id, cloneExecution(execution));
      const events = this.#eventRepository
        ? await this.#eventRepository.findByExecutionId(execution.id)
        : [];
      this.#events.set(execution.id, events.map(cloneEvent));
    }
  }

  public async waitForPersistence(): Promise<void> {
    await this.#pendingPersist;
  }

  #enqueuePersist(operation: () => Promise<void>, rollback?: () => void): void {
    const pending = this.#pendingPersist
      .catch(() => undefined)
      .then(async () => {
        try {
          await operation();
        } catch (error) {
          rollback?.();
          throw error;
        }
      });
    this.#pendingPersist = pending;
  }

  #replaceEvents(
    executionId: PrescriptionExecutionId,
    events: readonly AdministrationEventSummary[]
  ): void {
    this.#events.set(executionId, events.map(cloneEvent));
  }

  #expectedVersion(
    current: PrescriptionExecutionSummary,
    requestedVersion: number | undefined
  ): number {
    if (
      requestedVersion !== undefined &&
      (!Number.isInteger(requestedVersion) || requestedVersion < 1)
    ) {
      throw new ValidationError('expectedVersion must be a positive integer', {
        executionId: current.id
      });
    }
    const expectedVersion = requestedVersion ?? current.version;
    if (current.version !== expectedVersion) {
      throw new ConflictError('Prescription execution version mismatch', {
        executionId: current.id,
        expectedVersion,
        currentVersion: current.version
      });
    }
    return expectedVersion;
  }

  #resolvePrescription(
    accountId: AccountId,
    payload: CreatePrescriptionExecutionRequest
  ): PrescriptionExecutionPrescription | null {
    if (!this.#prescriptionSource) return null;

    const prescription = this.#prescriptionSource.getByIdForAccount(
      accountId,
      payload.clinicalEntryId as ClinicalEntryId
    );
    if (!prescription) {
      throw new NotFoundError('Prescription not found', {
        clinicalEntryId: payload.clinicalEntryId
      });
    }
    if (prescription.accountId !== accountId) {
      throw new NotFoundError('Prescription not found', {
        clinicalEntryId: payload.clinicalEntryId
      });
    }
    if (prescription.deletedAt) {
      throw new ValidationError('Archived prescriptions cannot be executed', {
        clinicalEntryId: payload.clinicalEntryId
      });
    }
    if (!prescription.signedAt) {
      throw new ValidationError('Prescription must be signed before execution', {
        clinicalEntryId: payload.clinicalEntryId
      });
    }
    if (prescription.patientId !== payload.patientId) {
      throw new ValidationError('Prescription patient does not match execution patient', {
        clinicalEntryId: payload.clinicalEntryId
      });
    }
    if (prescription.encounterId !== payload.encounterId) {
      throw new ValidationError('Prescription encounter does not match execution encounter', {
        clinicalEntryId: payload.clinicalEntryId
      });
    }

    const medicationName = requireNonEmptyString(prescription.medicationName, 'medicationName');
    const dosage = requireNonEmptyString(prescription.dosage, 'prescription.dosage');
    const requestedMedicationName = requireNonEmptyString(payload.medicationName, 'medicationName');
    const requestedDosage = requireNonEmptyString(payload.dosage, 'dosage');
    if (requestedMedicationName !== medicationName || requestedDosage !== dosage) {
      throw new ValidationError('Execution medication and dosage must match the prescription', {
        clinicalEntryId: payload.clinicalEntryId
      });
    }

    const requestedRoute = requireOptionalString(payload.route);
    if (requestedRoute !== undefined && requestedRoute !== prescription.route) {
      throw new ValidationError('Execution route must match the prescription', {
        clinicalEntryId: payload.clinicalEntryId
      });
    }
    const requestedFrequency = requireOptionalString(payload.frequency);
    if (requestedFrequency !== undefined && requestedFrequency !== prescription.frequency) {
      throw new ValidationError('Execution frequency must match the prescription', {
        clinicalEntryId: payload.clinicalEntryId
      });
    }

    return { ...prescription, medicationName, dosage };
  }

  async #persistCreated(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary
  ): Promise<void> {
    await this.#executionRepository!.createWithEvent(execution, event);
  }

  async #persistUpdated(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary,
    expectedVersion: number
  ): Promise<void> {
    await this.#executionRepository!.updateWithEvent(execution, event, expectedVersion);
  }

  public getById(id: PrescriptionExecutionId): PrescriptionExecutionSummary {
    const execution = this.#executions.get(id);
    if (!execution) {
      throw new NotFoundError('Prescription execution not found', { executionId: id });
    }
    return cloneExecution(execution);
  }

  public getByIdForAccount(
    accountId: AccountId,
    id: PrescriptionExecutionId
  ): PrescriptionExecutionSummary {
    const scopedAccountId = requireNonEmptyString(accountId, 'accountId') as AccountId;
    const execution = this.getById(id);
    if (execution.accountId !== scopedAccountId) {
      throw new NotFoundError('Prescription execution not found', { executionId: id });
    }
    return execution;
  }

  public getEvents(
    accountId: AccountId,
    executionId: PrescriptionExecutionId
  ): readonly AdministrationEventSummary[] {
    this.getByIdForAccount(accountId, executionId);
    return (this.#events.get(executionId) ?? []).map(cloneEvent);
  }

  public listByEncounter(
    encounterId: EncounterId,
    accountId: AccountId
  ): readonly PrescriptionExecutionSummary[] {
    const scopedAccountId = requireNonEmptyString(accountId, 'accountId') as AccountId;
    return Array.from(this.#executions.values())
      .filter((e) => e.accountId === scopedAccountId && e.encounterId === encounterId)
      .map(cloneExecution);
  }

  public listByPatient(
    patientId: PatientId,
    accountId: AccountId
  ): readonly PrescriptionExecutionSummary[] {
    const scopedAccountId = requireNonEmptyString(accountId, 'accountId') as AccountId;
    return Array.from(this.#executions.values())
      .filter((e) => e.accountId === scopedAccountId && e.patientId === patientId)
      .map(cloneExecution);
  }

  public list(accountId: AccountId): readonly PrescriptionExecutionSummary[] {
    return Array.from(this.#executions.values())
      .filter((e) => e.accountId === accountId)
      .map(cloneExecution);
  }

  public create(
    accountId: AccountId,
    payload: CreatePrescriptionExecutionRequest
  ): PrescriptionExecutionSummary {
    requireNonEmptyString(payload.clinicalEntryId, 'clinicalEntryId');
    requireNonEmptyString(payload.patientId, 'patientId');
    requireNonEmptyString(payload.encounterId, 'encounterId');
    requireNonEmptyString(payload.medicationName, 'medicationName');
    requireNonEmptyString(payload.dosage, 'dosage');
    requireNonEmptyString(payload.scheduledAt, 'scheduledAt');

    const prescription = this.#resolvePrescription(accountId, payload);
    const medicationName =
      prescription?.medicationName ??
      requireNonEmptyString(payload.medicationName, 'medicationName');
    const dosage = prescription?.dosage ?? requireNonEmptyString(payload.dosage, 'dosage');
    const route = prescription?.route ?? requireOptionalString(payload.route);
    const frequency = prescription?.frequency ?? requireOptionalString(payload.frequency);

    const now = nowIso();
    const execution: PrescriptionExecutionSummary = {
      id: createCorrelationId('pe') as PrescriptionExecutionId,
      accountId,
      clinicalEntryId: payload.clinicalEntryId as ClinicalEntryId,
      patientId: payload.patientId as PatientId,
      encounterId: payload.encounterId as EncounterId,
      medicationName,
      dosage,
      route,
      frequency,
      scheduledAt: payload.scheduledAt,
      status: 'pending',
      notes: requireOptionalString(payload.notes),
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    this.#executions.set(execution.id, execution);

    // Log creation event
    const event: AdministrationEventSummary = {
      id: createCorrelationId('ae') as AdministrationEventId,
      executionId: execution.id,
      eventType: 'created',
      actorId: 'system' as UserId,
      occurredAt: now,
      notes: 'Prescription execution created',
      createdAt: now
    };
    this.#addEvent(execution.id, event);

    if (this.#executionRepository) {
      this.#enqueuePersist(
        () => this.#persistCreated(execution, event),
        () => {
          this.#executions.delete(execution.id);
          this.#events.delete(execution.id);
        }
      );
    }

    return cloneExecution(execution);
  }

  public execute(
    accountId: AccountId,
    id: PrescriptionExecutionId,
    actorId: UserId,
    payload: ExecutePrescriptionRequest
  ): PrescriptionExecutionSummary {
    const current = this.getByIdForAccount(accountId, id);

    if (!VALID_STATUS_TRANSITIONS[current.status].includes(payload.status)) {
      throw new ValidationError(
        `Invalid status transition: ${current.status} → ${payload.status}. Allowed: ${VALID_STATUS_TRANSITIONS[current.status].join(', ')}`
      );
    }

    const expectedVersion = this.#expectedVersion(current, payload.expectedVersion);

    const now = nowIso();
    const updated: PrescriptionExecutionSummary = {
      ...current,
      status: payload.status,
      administeredBy: actorId,
      administeredAt: now,
      notes: payload.notes ?? current.notes,
      version: current.version + 1,
      updatedAt: now
    };

    this.#executions.set(id, updated);
    const previousEvents = this.getEvents(accountId, id);

    // Log execution event
    const event: AdministrationEventSummary = {
      id: createCorrelationId('ae') as AdministrationEventId,
      executionId: id,
      eventType: payload.status === 'administered' ? 'administered' : 'not-administered',
      actorId,
      occurredAt: now,
      notes: payload.notes,
      vitalsSnapshot: payload.vitalsSnapshot,
      createdAt: now
    };
    this.#addEvent(id, event);

    if (this.#executionRepository) {
      this.#enqueuePersist(
        () => this.#persistUpdated(updated, event, expectedVersion),
        () => {
          this.#executions.set(id, current);
          this.#replaceEvents(id, previousEvents);
        }
      );
    }

    return cloneExecution(updated);
  }

  public suspend(
    accountId: AccountId,
    id: PrescriptionExecutionId,
    actorId: UserId,
    payload: SuspendPrescriptionRequest
  ): PrescriptionExecutionSummary {
    const current = this.getByIdForAccount(accountId, id);

    if (!VALID_STATUS_TRANSITIONS[current.status].includes('suspended')) {
      throw new ValidationError(
        `Cannot suspend execution in status '${current.status}'. Allowed transitions: ${VALID_STATUS_TRANSITIONS[current.status].join(', ')}`
      );
    }

    const expectedVersion = this.#expectedVersion(current, payload.expectedVersion);

    requireNonEmptyString(payload.reason, 'reason');

    const now = nowIso();
    const updated: PrescriptionExecutionSummary = {
      ...current,
      status: 'suspended',
      notes: payload.reason,
      version: current.version + 1,
      updatedAt: now
    };

    this.#executions.set(id, updated);
    const previousEvents = this.getEvents(accountId, id);

    const event: AdministrationEventSummary = {
      id: createCorrelationId('ae') as AdministrationEventId,
      executionId: id,
      eventType: 'suspended',
      actorId,
      occurredAt: now,
      notes: payload.reason,
      createdAt: now
    };
    this.#addEvent(id, event);

    if (this.#executionRepository) {
      this.#enqueuePersist(
        () => this.#persistUpdated(updated, event, expectedVersion),
        () => {
          this.#executions.set(id, current);
          this.#replaceEvents(id, previousEvents);
        }
      );
    }

    return cloneExecution(updated);
  }

  public resume(
    accountId: AccountId,
    id: PrescriptionExecutionId,
    actorId: UserId,
    requestedVersion?: number
  ): PrescriptionExecutionSummary {
    const current = this.getByIdForAccount(accountId, id);

    if (current.status !== 'suspended') {
      throw new ValidationError(
        `Cannot resume execution in status '${current.status}'. Only suspended executions can be resumed.`
      );
    }

    const expectedVersion = this.#expectedVersion(current, requestedVersion);

    const now = nowIso();
    const updated: PrescriptionExecutionSummary = {
      ...current,
      status: 'pending',
      version: current.version + 1,
      updatedAt: now
    };

    this.#executions.set(id, updated);
    const previousEvents = this.getEvents(accountId, id);

    const event: AdministrationEventSummary = {
      id: createCorrelationId('ae') as AdministrationEventId,
      executionId: id,
      eventType: 'resumed',
      actorId,
      occurredAt: now,
      notes: 'Execution resumed',
      createdAt: now
    };
    this.#addEvent(id, event);

    if (this.#executionRepository) {
      this.#enqueuePersist(
        () => this.#persistUpdated(updated, event, expectedVersion),
        () => {
          this.#executions.set(id, current);
          this.#replaceEvents(id, previousEvents);
        }
      );
    }

    return cloneExecution(updated);
  }

  public logEvent(
    accountId: AccountId,
    id: PrescriptionExecutionId,
    actorId: UserId,
    payload: LogAdministrationEventRequest
  ): AdministrationEventSummary {
    this.getByIdForAccount(accountId, id); // validate existence and tenant ownership

    requireNonEmptyString(payload.eventType, 'eventType');

    const now = nowIso();
    const event: AdministrationEventSummary = {
      id: createCorrelationId('ae') as AdministrationEventId,
      executionId: id,
      eventType: payload.eventType,
      actorId,
      occurredAt: now,
      notes: requireOptionalString(payload.notes),
      vitalsSnapshot: payload.vitalsSnapshot,
      createdAt: now
    };

    const previousEvents = this.getEvents(accountId, id);
    this.#addEvent(id, event);

    if (this.#eventRepository) {
      this.#enqueuePersist(
        () => this.#eventRepository!.create(event),
        () => this.#replaceEvents(id, previousEvents)
      );
    }

    return cloneEvent(event);
  }

  #addEvent(executionId: PrescriptionExecutionId, event: AdministrationEventSummary): void {
    const existing = this.#events.get(executionId) ?? [];
    this.#events.set(executionId, [...existing, cloneEvent(event)]);
  }
}

export {
  DatabasePrescriptionExecutionRepository,
  DatabaseAdministrationEventRepository
} from './repositories/database-prescription-execution.repository.js';
