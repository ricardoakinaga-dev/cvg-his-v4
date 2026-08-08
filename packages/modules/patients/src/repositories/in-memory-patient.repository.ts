import type {
  AccountId,
  PatientId,
  PatientSummary,
  OwnerId,
  OwnerPatientLinkId,
  OwnerPatientLinkSummary
} from '@cvg-his-v2/shared-types';

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function matchesSearch(value: unknown, search: string): boolean {
  if (typeof value === 'string') {
    const normalizedSearch = search.toLowerCase();
    const searchDigits = normalizeDigits(search);
    return (
      value.toLowerCase().includes(normalizedSearch) ||
      (searchDigits.length > 0 && normalizeDigits(value).includes(searchDigits))
    );
  }

  return false;
}

export interface PatientRepository {
  create(patient: PatientSummary): Promise<void>;
  update(patient: PatientSummary): Promise<void>;
  findById(id: PatientId): Promise<PatientSummary | null>;
  findByAccountId(accountId: AccountId, search?: string): Promise<readonly PatientSummary[]>;
  delete(id: PatientId): Promise<void>;
}

export interface OwnerPatientLinkRepository {
  create(link: OwnerPatientLinkSummary): Promise<void>;
  update?(link: OwnerPatientLinkSummary): Promise<void>;
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
          matchesSearch(p.id, search) ||
          matchesSearch(p.name, search) ||
          matchesSearch(p.species, search) ||
          matchesSearch(p.breed, search) ||
          matchesSearch(p.microchip, search) ||
          matchesSearch(p.legacyVetusId, search) ||
          matchesSearch(p.color, search) ||
          matchesSearch(p.pedigreeNumber, search)
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

  async update(link: OwnerPatientLinkSummary): Promise<void> {
    if (!this.#links.has(link.id)) throw new Error(`Owner-patient link not found: ${link.id}`);
    this.#links.set(link.id, link);
  }

  async findById(
    id: OwnerPatientLinkId,
    accountId: AccountId
  ): Promise<OwnerPatientLinkSummary | null> {
    const link = this.#links.get(id);
    return link?.accountId === accountId ? link : null;
  }

  async findByPatientId(
    patientId: PatientId,
    accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]> {
    return Array.from(this.#links.values()).filter(
      (link) => link.accountId === accountId && link.patientId === patientId
    );
  }

  async findByOwnerId(
    ownerId: OwnerId,
    accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]> {
    return Array.from(this.#links.values()).filter(
      (link) => link.accountId === accountId && link.ownerId === ownerId
    );
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
