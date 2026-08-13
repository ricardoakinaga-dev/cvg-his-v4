import type {
  CreatePrescriptionExecutionRequest,
  ExecutePrescriptionRequest,
  LogAdministrationEventRequest,
  SuspendPrescriptionRequest
} from '@cvg-his-v2/shared-contracts';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
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
  create(execution: PrescriptionExecutionSummary): Promise<void>;
  update(execution: PrescriptionExecutionSummary): Promise<void>;
  createWithEvent?(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary
  ): Promise<void>;
  updateWithEvent?(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary
  ): Promise<void>;
  findById(id: PrescriptionExecutionId): Promise<PrescriptionExecutionSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly PrescriptionExecutionSummary[]>;
  findByPatientId(patientId: PatientId): Promise<readonly PrescriptionExecutionSummary[]>;
  findByAccountId(accountId: AccountId): Promise<readonly PrescriptionExecutionSummary[]>;
}

export interface AdministrationEventRepository {
  create(event: AdministrationEventSummary): Promise<void>;
  findByExecutionId(
    executionId: PrescriptionExecutionId
  ): Promise<readonly AdministrationEventSummary[]>;
}

export interface PrescriptionExecutionsServiceOptions {
  readonly executionRepository?: PrescriptionExecutionRepository;
  readonly eventRepository?: AdministrationEventRepository;
}

export class PrescriptionExecutionsService {
  readonly #executions = new Map<PrescriptionExecutionId, PrescriptionExecutionSummary>();
  readonly #events = new Map<PrescriptionExecutionId, readonly AdministrationEventSummary[]>();
  readonly #executionRepository?: PrescriptionExecutionRepository;
  readonly #eventRepository?: AdministrationEventRepository;

  public constructor(options: PrescriptionExecutionsServiceOptions = {}) {
    this.#executionRepository = options.executionRepository;
    this.#eventRepository = options.eventRepository;
  }

  public async getById(
    id: PrescriptionExecutionId,
    expectedAccountId?: AccountId
  ): Promise<PrescriptionExecutionSummary> {
    const execution = this.#executionRepository
      ? await this.#executionRepository.findById(id)
      : (this.#executions.get(id) ?? null);
    if (!execution) {
      throw new NotFoundError('Prescription execution not found', { executionId: id });
    }
    if (expectedAccountId && execution.accountId !== expectedAccountId) {
      throw new NotFoundError('Prescription execution not found', { executionId: id });
    }
    return execution;
  }

  public async getEvents(
    executionId: PrescriptionExecutionId,
    expectedAccountId?: AccountId
  ): Promise<readonly AdministrationEventSummary[]> {
    if (expectedAccountId) {
      await this.getById(executionId, expectedAccountId);
    }
    if (this.#eventRepository) {
      return this.#eventRepository.findByExecutionId(executionId);
    }
    return [...(this.#events.get(executionId) ?? [])];
  }

  public async listByEncounter(
    encounterId: EncounterId,
    expectedAccountId?: AccountId
  ): Promise<readonly PrescriptionExecutionSummary[]> {
    const executions = this.#executionRepository
      ? await this.#executionRepository.findByEncounterId(encounterId)
      : Array.from(this.#executions.values()).filter(
          (execution) => execution.encounterId === encounterId
        );
    return executions.filter(
      (execution) => !expectedAccountId || execution.accountId === expectedAccountId
    );
  }

  public async listByPatient(
    patientId: PatientId,
    expectedAccountId?: AccountId
  ): Promise<readonly PrescriptionExecutionSummary[]> {
    const executions = this.#executionRepository
      ? await this.#executionRepository.findByPatientId(patientId)
      : Array.from(this.#executions.values()).filter(
          (execution) => execution.patientId === patientId
        );
    return executions.filter(
      (execution) => !expectedAccountId || execution.accountId === expectedAccountId
    );
  }

  public async list(accountId: AccountId): Promise<readonly PrescriptionExecutionSummary[]> {
    if (this.#executionRepository) {
      return this.#executionRepository.findByAccountId(accountId);
    }
    return Array.from(this.#executions.values()).filter(
      (execution) => execution.accountId === accountId
    );
  }

  public async create(
    accountId: AccountId,
    payload: CreatePrescriptionExecutionRequest
  ): Promise<PrescriptionExecutionSummary> {
    requireNonEmptyString(payload.clinicalEntryId, 'clinicalEntryId');
    requireNonEmptyString(payload.patientId, 'patientId');
    requireNonEmptyString(payload.encounterId, 'encounterId');
    requireNonEmptyString(payload.medicationName, 'medicationName');
    requireNonEmptyString(payload.dosage, 'dosage');
    const scheduledAt = requireNonEmptyString(payload.scheduledAt, 'scheduledAt');
    if (Number.isNaN(Date.parse(scheduledAt))) {
      throw new ValidationError('scheduledAt must be a valid ISO date');
    }

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
      scheduledAt,
      status: 'pending',
      notes: requireOptionalString(payload.notes),
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    const event: AdministrationEventSummary = {
      id: createCorrelationId('ae') as AdministrationEventId,
      executionId: execution.id,
      eventType: 'created',
      actorId: 'system' as UserId,
      occurredAt: now,
      notes: 'Prescription execution created',
      createdAt: now
    };

    await this.#persistCreate(execution, event);
    this.#executions.set(execution.id, execution);
    this.#addEvent(execution.id, event);
    return execution;
  }

  public async execute(
    id: PrescriptionExecutionId,
    actorId: UserId,
    payload: ExecutePrescriptionRequest,
    expectedAccountId?: AccountId
  ): Promise<PrescriptionExecutionSummary> {
    const current = await this.getById(id, expectedAccountId);
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

    await this.#persistUpdate(updated, event);
    this.#executions.set(id, updated);
    this.#addEvent(id, event);
    return updated;
  }

  public async suspend(
    id: PrescriptionExecutionId,
    actorId: UserId,
    payload: SuspendPrescriptionRequest,
    expectedAccountId?: AccountId
  ): Promise<PrescriptionExecutionSummary> {
    const current = await this.getById(id, expectedAccountId);
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
    const event: AdministrationEventSummary = {
      id: createCorrelationId('ae') as AdministrationEventId,
      executionId: id,
      eventType: 'suspended',
      actorId,
      occurredAt: now,
      notes: payload.reason,
      createdAt: now
    };

    await this.#persistUpdate(updated, event);
    this.#executions.set(id, updated);
    this.#addEvent(id, event);
    return updated;
  }

  public async resume(
    id: PrescriptionExecutionId,
    actorId: UserId,
    expectedAccountId?: AccountId
  ): Promise<PrescriptionExecutionSummary> {
    const current = await this.getById(id, expectedAccountId);
    if (current.status !== 'suspended') {
      throw new ValidationError(
        `Cannot resume execution in status '${current.status}'. Only suspended executions can be resumed.`
      );
    }

    const now = nowIso();
    const updated: PrescriptionExecutionSummary = {
      ...current,
      status: 'pending',
      version: current.version + 1,
      updatedAt: now
    };
    const event: AdministrationEventSummary = {
      id: createCorrelationId('ae') as AdministrationEventId,
      executionId: id,
      eventType: 'resumed',
      actorId,
      occurredAt: now,
      notes: 'Execution resumed',
      createdAt: now
    };

    await this.#persistUpdate(updated, event);
    this.#executions.set(id, updated);
    this.#addEvent(id, event);
    return updated;
  }

  public async logEvent(
    id: PrescriptionExecutionId,
    actorId: UserId,
    payload: LogAdministrationEventRequest,
    expectedAccountId?: AccountId
  ): Promise<AdministrationEventSummary> {
    await this.getById(id, expectedAccountId);
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

    if (this.#eventRepository) {
      await this.#eventRepository.create(event);
    }
    this.#addEvent(id, event);
    return event;
  }

  async #persistCreate(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary
  ): Promise<void> {
    if (this.#executionRepository?.createWithEvent) {
      await this.#executionRepository.createWithEvent(execution, event);
      return;
    }
    if (this.#executionRepository) {
      await this.#executionRepository.create(execution);
    }
    if (this.#eventRepository) {
      await this.#eventRepository.create(event);
    }
  }

  async #persistUpdate(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary
  ): Promise<void> {
    if (this.#executionRepository?.updateWithEvent) {
      await this.#executionRepository.updateWithEvent(execution, event);
      return;
    }
    if (this.#executionRepository) {
      await this.#executionRepository.update(execution);
    }
    if (this.#eventRepository) {
      await this.#eventRepository.create(event);
    }
  }

  #addEvent(executionId: PrescriptionExecutionId, event: AdministrationEventSummary): void {
    const existing = this.#events.get(executionId) ?? [];
    this.#events.set(executionId, [...existing, event]);
  }
}

export {
  DatabaseAdministrationEventRepository,
  DatabasePrescriptionExecutionRepository
} from './repositories/database-prescription-execution.repository.js';
