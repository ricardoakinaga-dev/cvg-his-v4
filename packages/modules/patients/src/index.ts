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
  findById(id: OwnerPatientLinkId): Promise<OwnerPatientLinkSummary | null>;
  findByPatientId(patientId: PatientId): Promise<readonly OwnerPatientLinkSummary[]>;
  findByOwnerId(ownerId: OwnerId): Promise<readonly OwnerPatientLinkSummary[]>;
  delete(id: OwnerPatientLinkId): Promise<void>;
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
    }
  ];
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

  public list(search?: string): readonly PatientSummary[] {
    const query = search?.trim().toLowerCase();
    const patients = Array.from(this.#patients.values());

    if (!query) {
      return patients;
    }

    return patients.filter((patient) => {
      const owner = this.#owners.getOrThrow(patient.primaryOwnerId);
      return (
        patient.name.toLowerCase().includes(query) ||
        patient.species.toLowerCase().includes(query) ||
        patient.breed?.toLowerCase().includes(query) ||
        owner.fullName.toLowerCase().includes(query)
      );
    });
  }

  public listLinks(filters?: {
    readonly ownerId?: OwnerId;
    readonly patientId?: PatientId;
  }): readonly OwnerPatientLinkSummary[] {
    return Array.from(this.#links.values()).filter((link) => {
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

  public create(accountId: AccountId, payload: CreatePatientRequest): PatientSummary {
    const primaryOwnerId = requireNonEmptyString(
      payload.primaryOwnerId,
      'primaryOwnerId'
    ) as OwnerId;
    this.#owners.getOrThrow(primaryOwnerId);

    const name = requireNonEmptyString(payload.name, 'name');
    const species = requireNonEmptyString(payload.species, 'species');

    const duplicate = this.list().find(
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
      id: createCorrelationId('patient') as PatientId,
      accountId,
      name,
      species,
      breed: requireOptionalString(payload.breed),
      sex: payload.sex,
      size: payload.size,
      baseWeightKg: requireOptionalPositiveNumber(payload.baseWeightKg),
      birthDateApproximate: requireOptionalString(payload.birthDateApproximate),
      primaryOwnerId,
      status: payload.status ?? 'active',
      createdAt: now,
      updatedAt: now
    };

    this.#patients.set(patient.id, patient);
    this.ensurePrimaryLink(accountId, patient.id, primaryOwnerId);

    // Persist to database if repository is available
    if (this.#patientRepository) {
      this.#patientRepository.create(patient).catch((err) => {
        console.error('Failed to persist patient to database:', err);
      });
    }

    void this.#onPatientCreated?.(patient);

    return patient;
  }

  public update(patientId: PatientId, payload: UpdatePatientRequest): PatientSummary {
    const current = this.getOrThrow(patientId);
    const nextPrimaryOwnerId =
      payload.primaryOwnerId !== undefined
        ? (requireNonEmptyString(payload.primaryOwnerId, 'primaryOwnerId') as OwnerId)
        : current.primaryOwnerId;
    this.#owners.getOrThrow(nextPrimaryOwnerId);

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
      primaryOwnerId: nextPrimaryOwnerId,
      status: payload.status ?? current.status,
      updatedAt: nowIso()
    };

    this.#patients.set(patientId, updated);
    this.ensurePrimaryLink(updated.accountId, patientId, nextPrimaryOwnerId);

    // Persist to database if repository is available
    if (this.#patientRepository) {
      this.#patientRepository.update(updated).catch((err) => {
        console.error('Failed to update patient in database:', err);
      });
    }

    return updated;
  }

  public createLink(
    accountId: AccountId,
    payload: CreateOwnerPatientLinkRequest
  ): OwnerPatientLinkSummary {
    const ownerId = requireNonEmptyString(payload.ownerId, 'ownerId') as OwnerId;
    const patientId = requireNonEmptyString(payload.patientId, 'patientId') as PatientId;
    this.#owners.getOrThrow(ownerId);
    const patient = this.getOrThrow(patientId);

    const duplicate = this.listLinks({ ownerId, patientId }).find(
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
      this.#ownerPatientLinkRepository.create(link).catch((err) => {
        console.error('Failed to persist owner-patient link to database:', err);
      });
    }

    return link;
  }

  public searchMaster(query: string): {
    readonly owners: readonly OwnerSummary[];
    readonly patients: readonly PatientSummary[];
    readonly links: readonly OwnerPatientLinkSummary[];
  } {
    const trimmed = query.trim();
    return {
      owners: this.#owners.list(trimmed),
      patients: this.list(trimmed),
      links: Array.from(this.#links.values()).filter((link) => {
        const patient = this.#patients.get(link.patientId);
        const owner = this.#owners.getOrThrow(link.ownerId);
        return (
          trimmed.length === 0 ||
          patient?.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          owner.fullName.toLowerCase().includes(trimmed.toLowerCase())
        );
      })
    };
  }

  private ensurePrimaryLink(accountId: AccountId, patientId: PatientId, ownerId: OwnerId): void {
    const existing = this.listLinks({ patientId }).find(
      (link) => link.relationshipType === 'primary'
    );

    if (existing && existing.ownerId === ownerId) {
      return;
    }

    if (existing && existing.ownerId !== ownerId) {
      this.#links.delete(existing.id);
    }

    const linkId = createCorrelationId('link') as OwnerPatientLinkId;
    this.#links.set(linkId, {
      id: linkId,
      accountId,
      ownerId,
      patientId,
      relationshipType: 'primary',
      financialResponsible: true,
      createdAt: nowIso()
    });
  }
}

export { createSeedLinks, createSeedPatients };
export {
  DatabasePatientRepository,
  DatabaseOwnerPatientLinkRepository
} from './repositories/database-patient.repository.js';
