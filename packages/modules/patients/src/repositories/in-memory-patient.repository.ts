import type {
  AccountId,
  PatientId,
  PatientSummary,
  OwnerId,
  OwnerPatientLinkId,
  OwnerPatientLinkSummary
} from '@cvg-his-v2/shared-types';

export interface PatientRepository {
  create(patient: PatientSummary): Promise<void>;
  update(patient: PatientSummary): Promise<void>;
  findById(id: PatientId): Promise<PatientSummary | null>;
  findByAccountId(accountId: AccountId, search?: string): Promise<readonly PatientSummary[]>;
  delete(id: PatientId): Promise<void>;
}

export interface OwnerPatientLinkRepository {
  create(link: OwnerPatientLinkSummary): Promise<void>;
  findById(id: OwnerPatientLinkId, accountId: AccountId): Promise<OwnerPatientLinkSummary | null>;
  findByPatientId(
    patientId: PatientId,
    accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]>;
  findByOwnerId(
    ownerId: OwnerId,
    accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]>;
  delete(id: OwnerPatientLinkId): Promise<void>;
}

export class InMemoryPatientRepository implements PatientRepository {
  readonly #patients = new Map<PatientId, PatientSummary>();

  async create(patient: PatientSummary): Promise<void> {
    this.#patients.set(patient.id, patient);
  }

  async update(patient: PatientSummary): Promise<void> {
    if (!this.#patients.has(patient.id)) {
      throw new Error(`Patient not found: ${patient.id}`);
    }
    this.#patients.set(patient.id, patient);
  }

  async findById(id: PatientId): Promise<PatientSummary | null> {
    return this.#patients.get(id) ?? null;
  }

  async findByAccountId(accountId: AccountId, search?: string): Promise<readonly PatientSummary[]> {
    return Array.from(this.#patients.values())
      .filter((p) => p.accountId === accountId)
      .filter(
        (p) =>
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.species?.toLowerCase().includes(search.toLowerCase()) ||
          p.breed?.toLowerCase().includes(search.toLowerCase())
      );
  }

  async delete(id: PatientId): Promise<void> {
    this.#patients.delete(id);
  }

  clear(): void {
    this.#patients.clear();
  }

  getAll(): readonly PatientSummary[] {
    return Array.from(this.#patients.values());
  }
}

export class InMemoryOwnerPatientLinkRepository implements OwnerPatientLinkRepository {
  readonly #links = new Map<OwnerPatientLinkId, OwnerPatientLinkSummary>();

  async create(link: OwnerPatientLinkSummary): Promise<void> {
    this.#links.set(link.id, link);
  }

  async findById(
    id: OwnerPatientLinkId,
    _accountId: AccountId
  ): Promise<OwnerPatientLinkSummary | null> {
    return this.#links.get(id) ?? null;
  }

  async findByPatientId(
    patientId: PatientId,
    _accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]> {
    return Array.from(this.#links.values()).filter((l) => l.patientId === patientId);
  }

  async findByOwnerId(
    ownerId: OwnerId,
    _accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]> {
    return Array.from(this.#links.values()).filter((l) => l.ownerId === ownerId);
  }

  async delete(id: OwnerPatientLinkId): Promise<void> {
    this.#links.delete(id);
  }

  clear(): void {
    this.#links.clear();
  }

  getAll(): readonly OwnerPatientLinkSummary[] {
    return Array.from(this.#links.values());
  }
}
