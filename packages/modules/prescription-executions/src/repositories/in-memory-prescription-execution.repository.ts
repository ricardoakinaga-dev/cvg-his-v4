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
    this.#executions.set(execution.id, execution);
  }

  async update(execution: PrescriptionExecutionSummary): Promise<void> {
    this.#executions.set(execution.id, execution);
  }

  async findById(id: PrescriptionExecutionId): Promise<PrescriptionExecutionSummary | null> {
    return this.#executions.get(id) ?? null;
  }

  async findByEncounterId(encounterId: EncounterId): Promise<readonly PrescriptionExecutionSummary[]> {
    return Array.from(this.#executions.values()).filter((e) => e.encounterId === encounterId);
  }

  async findByPatientId(patientId: PatientId): Promise<readonly PrescriptionExecutionSummary[]> {
    return Array.from(this.#executions.values()).filter((e) => e.patientId === patientId);
  }

  async findByAccountId(accountId: AccountId): Promise<readonly PrescriptionExecutionSummary[]> {
    return Array.from(this.#executions.values()).filter((e) => e.accountId === accountId);
  }
}

export class InMemoryAdministrationEventRepository implements AdministrationEventRepository {
  readonly #events = new Map<PrescriptionExecutionId, AdministrationEventSummary[]>();

  async create(event: AdministrationEventSummary): Promise<void> {
    const existing = this.#events.get(event.executionId) ?? [];
    existing.push(event);
    this.#events.set(event.executionId, existing);
  }

  async findByExecutionId(executionId: PrescriptionExecutionId): Promise<readonly AdministrationEventSummary[]> {
    return this.#events.get(executionId) ?? [];
  }
}
