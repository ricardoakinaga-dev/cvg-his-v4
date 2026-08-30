import type {
  AccountId,
  AdministrationEventId,
  AdministrationEventSummary,
  EncounterId,
  PatientId,
  PrescriptionExecutionId,
  PrescriptionExecutionSummary,
  UserId
} from '@cvg-his-v2/shared-types';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AdministrationEventRepository, PrescriptionExecutionRepository } from '../index.js';

export class InMemoryPrescriptionExecutionRepository implements PrescriptionExecutionRepository {
  readonly #executions = new Map<PrescriptionExecutionId, PrescriptionExecutionSummary>();
  readonly #eventRepository: AdministrationEventRepository;
  #mutationTail: Promise<void> = Promise.resolve();

  public constructor(eventRepository: AdministrationEventRepository) {
    this.#eventRepository = eventRepository;
  }

  async createWithEvent(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary
  ): Promise<void> {
    await this.#withMutationLock(async () => {
      if (this.#executions.has(execution.id)) {
        throw new ConflictError('Prescription execution already exists', {
          executionId: execution.id
        });
      }
      this.#executions.set(execution.id, { ...execution });
      try {
        await this.#eventRepository.create({ ...event });
      } catch (error) {
        this.#executions.delete(execution.id);
        throw error;
      }
    });
  }

  async updateWithEvent(
    execution: PrescriptionExecutionSummary,
    event: AdministrationEventSummary,
    expectedVersion: number
  ): Promise<void> {
    await this.#withMutationLock(async () => {
      const current = this.#executions.get(execution.id);
      if (!current || current.accountId !== execution.accountId) {
        throw new NotFoundError('Prescription execution not found', { executionId: execution.id });
      }
      if (current.version !== expectedVersion) {
        throw new ConflictError('Prescription execution version mismatch', {
          executionId: execution.id,
          expectedVersion,
          currentVersion: current.version
        });
      }
      this.#executions.set(execution.id, { ...execution });
      try {
        await this.#eventRepository.create({ ...event });
      } catch (error) {
        this.#executions.set(execution.id, current);
        throw error;
      }
    });
  }

  async #withMutationLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.#mutationTail;
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#mutationTail = current;
    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async findById(id: PrescriptionExecutionId): Promise<PrescriptionExecutionSummary | null> {
    const execution = this.#executions.get(id);
    return execution ? { ...execution } : null;
  }

  async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly PrescriptionExecutionSummary[]> {
    return Array.from(this.#executions.values())
      .filter((e) => e.encounterId === encounterId)
      .map((e) => ({ ...e }));
  }

  async findByPatientId(patientId: PatientId): Promise<readonly PrescriptionExecutionSummary[]> {
    return Array.from(this.#executions.values())
      .filter((e) => e.patientId === patientId)
      .map((e) => ({ ...e }));
  }

  async findByAccountId(accountId: AccountId): Promise<readonly PrescriptionExecutionSummary[]> {
    return Array.from(this.#executions.values())
      .filter((e) => e.accountId === accountId)
      .map((e) => ({ ...e }));
  }
}

export class InMemoryAdministrationEventRepository implements AdministrationEventRepository {
  readonly #events = new Map<PrescriptionExecutionId, AdministrationEventSummary[]>();

  async create(event: AdministrationEventSummary): Promise<void> {
    const existing = this.#events.get(event.executionId) ?? [];
    if (
      Array.from(this.#events.values()).some((events) =>
        events.some((item) => item.id === event.id)
      )
    ) {
      throw new Error(`Administration event ${event.id} already exists`);
    }
    this.#events.set(event.executionId, [...existing, { ...event }]);
  }

  async findById(eventId: AdministrationEventId): Promise<AdministrationEventSummary | null> {
    for (const events of this.#events.values()) {
      const event = events.find((item) => item.id === eventId);
      if (event) return { ...event };
    }
    return null;
  }

  async deleteById(eventId: AdministrationEventId): Promise<void> {
    for (const [executionId, events] of this.#events) {
      const remaining = events.filter((event) => event.id !== eventId);
      if (remaining.length !== events.length) {
        if (remaining.length === 0) this.#events.delete(executionId);
        else this.#events.set(executionId, remaining);
        return;
      }
    }
  }

  async findByExecutionId(
    executionId: PrescriptionExecutionId
  ): Promise<readonly AdministrationEventSummary[]> {
    return [...(this.#events.get(executionId) ?? [])];
  }
}
