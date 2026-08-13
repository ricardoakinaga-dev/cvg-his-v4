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
import type { AdministrationEventRepository, PrescriptionExecutionRepository } from '../index.js';

export class InMemoryPrescriptionExecutionRepository implements PrescriptionExecutionRepository {
  readonly #executions = new Map<PrescriptionExecutionId, PrescriptionExecutionSummary>();

  async create(execution: PrescriptionExecutionSummary): Promise<void> {
    this.#executions.set(execution.id, { ...execution });
  }

  async update(execution: PrescriptionExecutionSummary): Promise<void> {
    this.#executions.set(execution.id, { ...execution });
  }

  async findById(id: PrescriptionExecutionId): Promise<PrescriptionExecutionSummary | null> {
    const execution = this.#executions.get(id);
    return execution ? { ...execution } : null;
  }

  async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly PrescriptionExecutionSummary[]> {
    return Array.from(this.#executions.values())
      .filter((execution) => execution.encounterId === encounterId)
      .map((execution) => ({ ...execution }));
  }

  async findByPatientId(patientId: PatientId): Promise<readonly PrescriptionExecutionSummary[]> {
    return Array.from(this.#executions.values())
      .filter((execution) => execution.patientId === patientId)
      .map((execution) => ({ ...execution }));
  }

  async findByAccountId(accountId: AccountId): Promise<readonly PrescriptionExecutionSummary[]> {
    return Array.from(this.#executions.values())
      .filter((execution) => execution.accountId === accountId)
      .map((execution) => ({ ...execution }));
  }
}

export class InMemoryAdministrationEventRepository implements AdministrationEventRepository {
  readonly #events = new Map<PrescriptionExecutionId, AdministrationEventSummary[]>();

  async create(event: AdministrationEventSummary): Promise<void> {
    const existing = this.#events.get(event.executionId) ?? [];
    this.#events.set(event.executionId, [...existing, { ...event }]);
  }

  async findByExecutionId(
    executionId: PrescriptionExecutionId
  ): Promise<readonly AdministrationEventSummary[]> {
    return (this.#events.get(executionId) ?? []).map((event) => ({ ...event }));
  }
}
