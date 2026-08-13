import { randomUUID } from 'node:crypto';

import { OwnersService } from '@cvg-his-v2/module-owners';
import type {
  CreateOwnerPatientLinkRequest,
  CreatePatientRequest,
  UpdatePatientRequest
} from '@cvg-his-v2/shared-contracts';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  OwnerId,
  OwnerPatientLinkId,
  OwnerPatientLinkSummary,
  OwnerSummary,
  PatientId,
  PatientSummary
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import {
  requireBoolean,
  requireNonEmptyString,
  requireOptionalPositiveNumber,
  requireOptionalString
} from '@cvg-his-v2/shared-validation';

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

interface SearchQuery {
  readonly text: string;
  readonly digits: string;
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizeSearchQuery(search?: string): SearchQuery | undefined {
  const text = search?.trim().toLowerCase();
  if (!text) {
    return undefined;
  }

  return {
    text,
    digits: normalizeDigits(text)
  };
}

function matchesSearchValue(value: unknown, query: SearchQuery): boolean {
  if (typeof value === 'string') {
    return (
      value.toLowerCase().includes(query.text) ||
      (query.digits.length > 0 && normalizeDigits(value).includes(query.digits))
    );
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return matchesSearchValue(String(value), query);
  }

  if (Array.isArray(value)) {
    return value.some((item) => matchesSearchValue(item, query));
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => matchesSearchValue(item, query));
  }

  return false;
}

function matchesOwnerSearch(owner: OwnerSummary, query: SearchQuery): boolean {
  return (
    matchesSearchValue(owner.id, query) ||
    matchesSearchValue(owner.fullName, query) ||
    matchesSearchValue(owner.documentId, query) ||
    matchesSearchValue(owner.legacyVetusId, query) ||
    matchesSearchValue(owner.originalCreatedAt, query) ||
    owner.contacts.some((contact) => matchesSearchValue(contact.value, query)) ||
    matchesSearchValue(owner.profile, query) ||
    matchesSearchValue(owner.address, query)
  );
}

function createSeedPatients(): PatientSummary[] {
  const createdAt = '2026-03-25T00:00:00.000Z';

  return [
    {
      id: 'patient_luna' as PatientId,
      accountId: 'acc_cvg_demo' as AccountId,
      name: 'Luna',
      species: 'canine',
      breed: 'SRD',
      sex: 'female',
      size: 'medium',
      baseWeightKg: 18.3,
      birthDateApproximate: '2020-08-15',
      primaryOwnerId: 'owner_maria_silva' as OwnerId,
      status: 'active',
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'patient_mogeb6qv_5b0gq64z' as PatientId,
      accountId: 'acc_cvg_demo' as AccountId,
      name: 'DANI',
      species: 'canine',
      breed: 'SRD CANINO',
      sex: 'female',
      size: undefined,
      baseWeightKg: 0,
      birthDateApproximate: '2025-01-01',
      isNeutered: undefined,
      microchip: undefined,
      pedigreeNumber: undefined,
      color: undefined,
      chronicDisease: undefined,
      allergy: undefined,
      temperament: undefined,
      generalNotes: 'Cadastro pareado do Vetus animal ID 9621 para auditoria autorizada.',
      legacyVetusId: '9621',
      originalCreatedAt: '2026-02-27',
      primaryOwnerId: 'owner_ricardo_akinaga' as OwnerId,
      status: 'active',
      createdAt: '2026-02-27T00:00:00.000Z',
      updatedAt: '2026-02-27T00:00:00.000Z'
    }
  ];
}

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function createSeedLinks(): OwnerPatientLinkSummary[] {
  return [
    {
      id: 'link_maria_luna_primary' as OwnerPatientLinkId,
      accountId: 'acc_cvg_demo' as AccountId,
      ownerId: 'owner_maria_silva' as OwnerId,
      patientId: 'patient_luna' as PatientId,
      relationshipType: 'primary',
      financialResponsible: true,
      createdAt: '2026-03-25T00:00:00.000Z'
    },
    {
      id: 'link_ricardo_dani_primary' as OwnerPatientLinkId,
      accountId: 'acc_cvg_demo' as AccountId,
      ownerId: 'owner_ricardo_akinaga' as OwnerId,
      patientId: 'patient_mogeb6qv_5b0gq64z' as PatientId,
      relationshipType: 'primary',
      financialResponsible: true,
      createdAt: '2026-02-27T00:00:00.000Z'
    }
  ];
}

export interface PatientsServiceOptions {
  readonly owners: OwnersService;
  readonly patientRepository?: PatientRepository;
  readonly ownerPatientLinkRepository?: OwnerPatientLinkRepository;
  readonly seedPatients?: readonly PatientSummary[];
  readonly seedLinks?: readonly OwnerPatientLinkSummary[];
  readonly onPatientCreated?: (patient: PatientSummary) => Promise<void>;
}

export class PatientsService {
  readonly #owners: OwnersService;
  readonly #patients = new Map<PatientId, PatientSummary>();
  readonly #links = new Map<OwnerPatientLinkId, OwnerPatientLinkSummary>();
  readonly #patientRepository?: PatientRepository;
  readonly #ownerPatientLinkRepository?: OwnerPatientLinkRepository;
  readonly #onPatientCreated?: (patient: PatientSummary) => Promise<void>;
  #pendingPersist: Promise<void> = Promise.resolve();
  #lastPersist: Promise<void> = Promise.resolve();

  public constructor(options: PatientsServiceOptions) {
    this.#owners = options.owners;
    this.#patientRepository = options.patientRepository;
    this.#ownerPatientLinkRepository = options.ownerPatientLinkRepository;
    this.#onPatientCreated = options.onPatientCreated;

    const seedPatients = options.seedPatients ?? createSeedPatients();
    const seedLinks = options.seedLinks ?? createSeedLinks();

    for (const patient of seedPatients) {
      this.#patients.set(patient.id, patient);
    }

    for (const link of seedLinks) {
      this.#links.set(link.id, link);
    }
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#patientRepository) {
      return;
    }

    const patients = await this.#patientRepository.findByAccountId(accountId);
    for (const patient of patients) {
      this.#patients.set(patient.id, patient);
    }

    if (!this.#ownerPatientLinkRepository) {
      return;
    }

    for (const patient of patients) {
      const links = await this.#ownerPatientLinkRepository.findByPatientId(patient.id, accountId);
      for (const link of links) {
        this.#links.set(link.id, link);
      }
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

  #enqueuePersist(operation: () => Promise<void>, rollback?: () => void): void {
    const pending = this.#pendingPersist.then(async () => {
      try {
        await operation();
      } catch (error) {
        rollback?.();
        throw error;
      }
    });
    this.#lastPersist = pending;
    this.#pendingPersist = pending;
  }

  public list(search?: string, expectedAccountId?: AccountId): readonly PatientSummary[] {
    const query = normalizeSearchQuery(search);
    const patients = Array.from(this.#patients.values()).filter(
      (patient) => !expectedAccountId || patient.accountId === expectedAccountId
    );

    if (!query) {
      return patients;
    }

    return patients.filter((patient) => {
      const owner = expectedAccountId
        ? this.#owners.getForAccountOrThrow(patient.primaryOwnerId, expectedAccountId)
        : this.#owners.getOrThrow(patient.primaryOwnerId);
      return (
        matchesSearchValue(patient.id, query) ||
        matchesSearchValue(patient.name, query) ||
        matchesSearchValue(patient.species, query) ||
        matchesSearchValue(patient.breed, query) ||
        matchesSearchValue(patient.microchip, query) ||
        matchesSearchValue(patient.legacyVetusId, query) ||
        matchesSearchValue(patient.color, query) ||
        matchesSearchValue(patient.pedigreeNumber, query) ||
        matchesOwnerSearch(owner, query)
      );
    });
  }

  public listByAccount(accountId: AccountId, search?: string): readonly PatientSummary[] {
    return this.list(search, accountId);
  }

  public listLinks(filters?: {
    readonly accountId?: AccountId;
    readonly ownerId?: OwnerId;
    readonly patientId?: PatientId;
  }): readonly OwnerPatientLinkSummary[] {
    return Array.from(this.#links.values()).filter((link) => {
      if (filters?.accountId && link.accountId !== filters.accountId) {
        return false;
      }

      if (filters?.ownerId && link.ownerId !== filters.ownerId) {
        return false;
      }

      if (filters?.patientId && link.patientId !== filters.patientId) {
        return false;
      }

      return true;
    });
  }

  public getOrThrow(patientId: PatientId): PatientSummary {
    const patient = this.#patients.get(patientId);
    if (!patient) {
      throw new NotFoundError('Patient not found', { patientId });
    }

    return patient;
  }

  public getForAccountOrThrow(
    patientId: PatientId,
    expectedAccountId: AccountId
  ): PatientSummary {
    const patient = this.getOrThrow(patientId);
    if (patient.accountId !== expectedAccountId) {
      throw new NotFoundError('Patient not found', { patientId });
    }
    return patient;
  }

  public create(accountId: AccountId, payload: CreatePatientRequest): PatientSummary {
    const primaryOwnerId = requireNonEmptyString(
      payload.primaryOwnerId,
      'primaryOwnerId'
    ) as OwnerId;
    this.#owners.getForAccountOrThrow(primaryOwnerId, accountId);

    const name = requireNonEmptyString(payload.name, 'name');
    const species = requireNonEmptyString(payload.species, 'species');

    const duplicate = this.listByAccount(accountId).find(
      (patient) =>
        patient.name.toLowerCase() === name.toLowerCase() &&
        patient.primaryOwnerId === primaryOwnerId
    );

    if (duplicate) {
      throw new ConflictError('Possible duplicate patient detected', {
        patientId: duplicate.id
      });
    }

    const now = nowIso();
    const patient: PatientSummary = {
      id: randomUUID() as PatientId,
      accountId,
      name,
      species,
      breed: requireOptionalString(payload.breed),
      sex: payload.sex,
      size: payload.size,
      baseWeightKg: requireOptionalPositiveNumber(payload.baseWeightKg),
      birthDateApproximate: requireOptionalString(payload.birthDateApproximate),
      isNeutered: normalizeOptionalBoolean(payload.isNeutered),
      microchip: requireOptionalString(payload.microchip),
      pedigreeNumber: requireOptionalString(payload.pedigreeNumber),
      color: requireOptionalString(payload.color),
      chronicDisease: requireOptionalString(payload.chronicDisease),
      allergy: requireOptionalString(payload.allergy),
      temperament: requireOptionalString(payload.temperament),
      generalNotes: requireOptionalString(payload.generalNotes),
      legacyVetusId: requireOptionalString(payload.legacyVetusId),
      originalCreatedAt: requireOptionalString(payload.originalCreatedAt),
      primaryOwnerId,
      status: payload.status ?? 'active',
      createdAt: now,
      updatedAt: now
    };

    const linkId = createCorrelationId('link') as OwnerPatientLinkId;
    const primaryLink: OwnerPatientLinkSummary = {
      id: linkId,
      accountId,
      ownerId: primaryOwnerId,
      patientId: patient.id,
      relationshipType: 'primary',
      financialResponsible: true,
      createdAt: nowIso()
    };

    this.#patients.set(patient.id, patient);
    this.#links.set(primaryLink.id, primaryLink);

    if (this.#patientRepository || this.#ownerPatientLinkRepository) {
      this.#enqueuePersist(
        async () => {
          await this.#patientRepository?.create(patient);
          await this.#ownerPatientLinkRepository?.create(primaryLink);
        },
        () => {
          if (this.#patients.get(patient.id) === patient) {
            this.#patients.delete(patient.id);
          }
          if (this.#links.get(primaryLink.id) === primaryLink) {
            this.#links.delete(primaryLink.id);
          }
        }
      );
    }

    void this.#onPatientCreated?.(patient);

    return patient;
  }

  public update(
    patientId: PatientId,
    payload: UpdatePatientRequest,
    expectedAccountId?: AccountId
  ): PatientSummary {
    const current = expectedAccountId
      ? this.getForAccountOrThrow(patientId, expectedAccountId)
      : this.getOrThrow(patientId);
    const nextPrimaryOwnerId =
      payload.primaryOwnerId !== undefined
        ? (requireNonEmptyString(payload.primaryOwnerId, 'primaryOwnerId') as OwnerId)
        : current.primaryOwnerId;
    this.#owners.getForAccountOrThrow(nextPrimaryOwnerId, current.accountId);

    const updated: PatientSummary = {
      ...current,
      name: payload.name !== undefined ? requireNonEmptyString(payload.name, 'name') : current.name,
      species:
        payload.species !== undefined
          ? requireNonEmptyString(payload.species, 'species')
          : current.species,
      breed: payload.breed !== undefined ? requireOptionalString(payload.breed) : current.breed,
      sex: payload.sex ?? current.sex,
      size: payload.size ?? current.size,
      baseWeightKg:
        payload.baseWeightKg !== undefined
          ? requireOptionalPositiveNumber(payload.baseWeightKg)
          : current.baseWeightKg,
      birthDateApproximate:
        payload.birthDateApproximate !== undefined
          ? requireOptionalString(payload.birthDateApproximate)
          : current.birthDateApproximate,
      isNeutered:
        payload.isNeutered !== undefined
          ? normalizeOptionalBoolean(payload.isNeutered)
          : current.isNeutered,
      microchip:
        payload.microchip !== undefined ? requireOptionalString(payload.microchip) : current.microchip,
      pedigreeNumber:
        payload.pedigreeNumber !== undefined
          ? requireOptionalString(payload.pedigreeNumber)
          : current.pedigreeNumber,
      color: payload.color !== undefined ? requireOptionalString(payload.color) : current.color,
      chronicDisease:
        payload.chronicDisease !== undefined
          ? requireOptionalString(payload.chronicDisease)
          : current.chronicDisease,
      allergy: payload.allergy !== undefined ? requireOptionalString(payload.allergy) : current.allergy,
      temperament:
        payload.temperament !== undefined
          ? requireOptionalString(payload.temperament)
          : current.temperament,
      generalNotes:
        payload.generalNotes !== undefined
          ? requireOptionalString(payload.generalNotes)
          : current.generalNotes,
      legacyVetusId:
        payload.legacyVetusId !== undefined
          ? requireOptionalString(payload.legacyVetusId)
          : current.legacyVetusId,
      originalCreatedAt:
        payload.originalCreatedAt !== undefined
          ? requireOptionalString(payload.originalCreatedAt)
          : current.originalCreatedAt,
      primaryOwnerId: nextPrimaryOwnerId,
      status: payload.status ?? current.status,
      updatedAt: nowIso()
    };

    this.#patients.set(patientId, updated);
    this.ensurePrimaryLink(updated.accountId, patientId, nextPrimaryOwnerId);

    // Persist to database if repository is available
    if (this.#patientRepository) {
      this.#enqueuePersist(
        () => this.#patientRepository!.update(updated),
        () => {
          this.#patients.set(patientId, current);
        }
      );
    }

    return updated;
  }

  public createLink(
    accountId: AccountId,
    payload: CreateOwnerPatientLinkRequest
  ): OwnerPatientLinkSummary {
    const ownerId = requireNonEmptyString(payload.ownerId, 'ownerId') as OwnerId;
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    this.#owners.getForAccountOrThrow(ownerId, accountId);
    const patient = this.getForAccountOrThrow(patientId, accountId);

    const duplicate = this.listLinks({ accountId, ownerId, patientId }).find(
      (link) => link.relationshipType === payload.relationshipType
    );
    if (duplicate) {
      throw new ConflictError('Owner-patient relationship already exists', {
        linkId: duplicate.id
      });
    }

    if (payload.relationshipType === 'primary' && patient.primaryOwnerId !== ownerId) {
      throw new ValidationError("Primary relationship must match the patient's primary owner");
    }

    const link: OwnerPatientLinkSummary = {
      id: createCorrelationId('link') as OwnerPatientLinkId,
      accountId,
      ownerId,
      patientId,
      relationshipType: payload.relationshipType,
      financialResponsible: requireBoolean(payload.financialResponsible, 'financialResponsible'),
      createdAt: nowIso()
    };

    this.#links.set(link.id, link);

    // Persist to database if repository is available
    if (this.#ownerPatientLinkRepository) {
      this.#enqueuePersist(
        () => this.#ownerPatientLinkRepository!.create(link),
        () => {
          if (this.#links.get(link.id) === link) {
            this.#links.delete(link.id);
          }
        }
      );
    }

    return link;
  }

  public searchMaster(query: string, expectedAccountId?: AccountId): {
    readonly owners: readonly OwnerSummary[];
    readonly patients: readonly PatientSummary[];
    readonly links: readonly OwnerPatientLinkSummary[];
  } {
    const trimmed = query.trim();
    return {
      owners: expectedAccountId
        ? this.#owners.listByAccount(expectedAccountId, trimmed)
        : this.#owners.list(trimmed),
      patients: expectedAccountId
        ? this.listByAccount(expectedAccountId, trimmed)
        : this.list(trimmed),
      links: Array.from(this.#links.values()).filter((link) => {
        if (expectedAccountId && link.accountId !== expectedAccountId) {
          return false;
        }
        const patient = this.#patients.get(link.patientId);
        const owner = expectedAccountId
          ? this.#owners.getForAccountOrThrow(link.ownerId, expectedAccountId)
          : this.#owners.getOrThrow(link.ownerId);
        return (
          trimmed.length === 0 ||
          patient?.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          owner.fullName.toLowerCase().includes(trimmed.toLowerCase())
        );
      })
    };
  }

  private ensurePrimaryLink(accountId: AccountId, patientId: PatientId, ownerId: OwnerId): void {
    const existing = this.listLinks({ accountId, patientId }).find(
      (link) => link.relationshipType === 'primary'
    );

    if (existing && existing.ownerId === ownerId) {
      return;
    }

    if (existing && existing.ownerId !== ownerId) {
      this.#links.delete(existing.id);
      if (this.#ownerPatientLinkRepository) {
        this.#enqueuePersist(
          () => this.#ownerPatientLinkRepository!.delete(existing.id),
          () => {
            this.#links.set(existing.id, existing);
          }
        );
      }
    }

    const linkId = createCorrelationId('link') as OwnerPatientLinkId;
    const link: OwnerPatientLinkSummary = {
      id: linkId,
      accountId,
      ownerId,
      patientId,
      relationshipType: 'primary',
      financialResponsible: true,
      createdAt: nowIso()
    };
    this.#links.set(linkId, link);

    if (this.#ownerPatientLinkRepository) {
      this.#enqueuePersist(
        () => this.#ownerPatientLinkRepository!.create(link),
        () => {
          if (this.#links.get(link.id) === link) {
            this.#links.delete(link.id);
          }
        }
      );
    }
  }
}

export { createSeedLinks, createSeedPatients };
export {
  DatabasePatientRepository,
  DatabaseOwnerPatientLinkRepository
} from './repositories/database-patient.repository.js';
