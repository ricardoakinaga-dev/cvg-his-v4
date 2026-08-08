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

export type ExecutionStatus = 'pending' | 'administered' | 'not-administered' | 'suspended' | 'cancelled';

const VALID_STATUS_TRANSITIONS: Record<ExecutionStatus, readonly ExecutionStatus[]> = {
  pending: ['administered', 'not-administered', 'suspended'],
  administered: [],
  'not-administered': [],
  suspended: ['pending', 'cancelled'],
  cancelled: []
};

export interface PrescriptionExecutionRepository {
  create(execution: PrescriptionExecutionSummary): Promise<void>;
  update(execution: PrescriptionExecutionSummary): Promise<void>;
  findById(id: PrescriptionExecutionId): Promise<PrescriptionExecutionSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly PrescriptionExecutionSummary[]>;
  findByPatientId(patientId: PatientId): Promise<readonly PrescriptionExecutionSummary[]>;
  findByAccountId(accountId: AccountId): Promise<readonly PrescriptionExecutionSummary[]>;
}

export interface AdministrationEventRepository {
  create(event: AdministrationEventSummary): Promise<void>;
  findByExecutionId(executionId: PrescriptionExecutionId): Promise<readonly AdministrationEventSummary[]>;
}

export interface PrescriptionExecutionsServiceOptions {
  readonly executionRepository?: PrescriptionExecutionRepository;
  readonly eventRepository?: AdministrationEventRepository;
}

export class PrescriptionExecutionsService {
  readonly #executions = new Map<PrescriptionExecutionId, PrescriptionExecutionSummary>();
  readonly #events = new Map<PrescriptionExecutionId, AdministrationEventSummary[]>();
  readonly #executionRepository?: PrescriptionExecutionRepository;
  readonly #eventRepository?: AdministrationEventRepository;
  #pendingPersist: Promise<void> = Promise.resolve();

  public constructor(options: PrescriptionExecutionsServiceOptions = {}) {
    this.#executionRepository = options.executionRepository;
    this.#eventRepository = options.eventRepository;
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#executionRepository) return;
    const executions = await this.#executionRepository.findByAccountId(accountId);
    for (const execution of executions) {
      this.#executions.set(execution.id, execution);
      const events = this.#eventRepository
        ? await this.#eventRepository.findByExecutionId(execution.id)
        : [];
      this.#events.set(execution.id, [...events]);
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
    this.#events.set(executionId, [...events]);
  }

  public getById(id: PrescriptionExecutionId): PrescriptionExecutionSummary {
    const execution = this.#executions.get(id);
    if (!execution) {
      throw new NotFoundError('Prescription execution not found', { executionId: id });
    }
    return execution;
  }

  public getByIdForAccount(
    accountId: AccountId,
    id: PrescriptionExecutionId
  ): PrescriptionExecutionSummary {
    const execution = this.getById(id);
    if (execution.accountId !== accountId) {
      throw new NotFoundError('Prescription execution not found', { executionId: id });
    }
    return execution;
  }

  public getEvents(executionId: PrescriptionExecutionId): readonly AdministrationEventSummary[] {
    return [...(this.#events.get(executionId) ?? [])];
  }

  public listByEncounter(
    encounterId: EncounterId,
    accountId?: AccountId
  ): readonly PrescriptionExecutionSummary[] {
    return Array.from(this.#executions.values()).filter(
      (e) => e.encounterId === encounterId && (!accountId || e.accountId === accountId)
    );
  }

  public listByPatient(
    patientId: PatientId,
    accountId?: AccountId
  ): readonly PrescriptionExecutionSummary[] {
    return Array.from(this.#executions.values()).filter(
      (e) => e.patientId === patientId && (!accountId || e.accountId === accountId)
    );
  }

  public list(accountId: AccountId): readonly PrescriptionExecutionSummary[] {
    return Array.from(this.#executions.values()).filter((e) => e.accountId === accountId);
  }

  public create(accountId: AccountId, payload: CreatePrescriptionExecutionRequest): PrescriptionExecutionSummary {
    requireNonEmptyString(payload.clinicalEntryId, 'clinicalEntryId');
    requireNonEmptyString(payload.patientId, 'patientId');
    requireNonEmptyString(payload.encounterId, 'encounterId');
    requireNonEmptyString(payload.medicationName, 'medicationName');
    requireNonEmptyString(payload.dosage, 'dosage');
    requireNonEmptyString(payload.scheduledAt, 'scheduledAt');

    const now = nowIso();
    const execution: PrescriptionExecutionSummary = {
      id: createCorrelationId('pe') as PrescriptionExecutionId,
      accountId,
      clinicalEntryId: payload.clinicalEntryId as ClinicalEntryId,
      patientId: payload.patientId as PatientId,
      encounterId: payload.encounterId as EncounterId,
      medicationName: payload.medicationName,
      dosage: payload.dosage,
      route: requireOptionalString(payload.route),
      frequency: requireOptionalString(payload.frequency),
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
      this.#enqueuePersist(async () => {
        await this.#executionRepository!.create(execution);
        await this.#eventRepository?.create(event);
      }, () => {
        this.#executions.delete(execution.id);
        this.#events.delete(execution.id);
      });
    }

    return execution;
  }

  public execute(id: PrescriptionExecutionId, actorId: UserId, payload: ExecutePrescriptionRequest): PrescriptionExecutionSummary {
    const current = this.getById(id);

    if (!VALID_STATUS_TRANSITIONS[current.status].includes(payload.status)) {
      throw new ValidationError(
        `Invalid status transition: ${current.status} → ${payload.status}. Allowed: ${VALID_STATUS_TRANSITIONS[current.status].join(', ')}`
      );
    }

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
    const previousEvents = this.getEvents(id);

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
      this.#enqueuePersist(async () => {
        await this.#executionRepository!.update(updated);
        await this.#eventRepository?.create(event);
      }, () => {
        this.#executions.set(id, current);
        this.#replaceEvents(id, previousEvents);
      });
    }

    return updated;
  }

  public suspend(id: PrescriptionExecutionId, actorId: UserId, payload: SuspendPrescriptionRequest): PrescriptionExecutionSummary {
    const current = this.getById(id);

    if (!VALID_STATUS_TRANSITIONS[current.status].includes('suspended')) {
      throw new ValidationError(
        `Cannot suspend execution in status '${current.status}'. Allowed transitions: ${VALID_STATUS_TRANSITIONS[current.status].join(', ')}`
      );
    }

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
    const previousEvents = this.getEvents(id);

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
      this.#enqueuePersist(async () => {
        await this.#executionRepository!.update(updated);
        await this.#eventRepository?.create(event);
      }, () => {
        this.#executions.set(id, current);
        this.#replaceEvents(id, previousEvents);
      });
    }

    return updated;
  }

  public resume(id: PrescriptionExecutionId, actorId: UserId): PrescriptionExecutionSummary {
    const current = this.getById(id);

    if (current.status !== 'suspended') {
      throw new ValidationError(`Cannot resume execution in status '${current.status}'. Only suspended executions can be resumed.`);
    }

    const now = nowIso();
    const updated: PrescriptionExecutionSummary = {
      ...current,
      status: 'pending',
      version: current.version + 1,
      updatedAt: now
    };

    this.#executions.set(id, updated);
    const previousEvents = this.getEvents(id);

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
      this.#enqueuePersist(async () => {
        await this.#executionRepository!.update(updated);
        await this.#eventRepository?.create(event);
      }, () => {
        this.#executions.set(id, current);
        this.#replaceEvents(id, previousEvents);
      });
    }

    return updated;
  }

  public logEvent(id: PrescriptionExecutionId, actorId: UserId, payload: LogAdministrationEventRequest): AdministrationEventSummary {
    this.getById(id); // validate exists

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

    const previousEvents = this.getEvents(id);
    this.#addEvent(id, event);

    if (this.#eventRepository) {
      this.#enqueuePersist(
        () => this.#eventRepository!.create(event),
        () => this.#replaceEvents(id, previousEvents)
      );
    }

    return event;
  }

  #addEvent(executionId: PrescriptionExecutionId, event: AdministrationEventSummary): void {
    const existing = this.#events.get(executionId) ?? [];
    this.#events.set(executionId, [...existing, event]);
  }
}

export { DatabasePrescriptionExecutionRepository, DatabaseAdministrationEventRepository } from './repositories/database-prescription-execution.repository.js';
