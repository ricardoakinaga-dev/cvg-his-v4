import type { CreateOwnerRequest, UpdateOwnerRequest } from '@cvg-his-v2/shared-contracts';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  OwnerAddress,
  OwnerContact,
  OwnerFinancialProfile,
  OwnerId,
  OwnerProfile,
  OwnerSummary
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import {
  requireBoolean,
  requireNonEmptyString,
  requireOptionalString
} from '@cvg-his-v2/shared-validation';

export interface OwnerRepository {
  create(owner: OwnerSummary): Promise<void>;
  update(owner: OwnerSummary): Promise<void>;
  findById(id: OwnerId): Promise<OwnerSummary | null>;
  findByAccountId(accountId: AccountId, search?: string): Promise<readonly OwnerSummary[]>;
  delete(id: OwnerId): Promise<void>;
}

function normalizeContacts(contacts: CreateOwnerRequest['contacts']): readonly OwnerContact[] {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    throw new ValidationError('Owner must have at least one contact');
  }

  const normalized = contacts.map((contact, index) => ({
    label: requireNonEmptyString(contact.label, `contacts[${index}].label`),
    value: requireNonEmptyString(contact.value, `contacts[${index}].value`),
    type: contact.type,
    primary: contact.primary ?? index === 0
  }));

  if (!normalized.some((contact) => contact.primary)) {
    throw new ValidationError('At least one contact must be primary');
  }

  return normalized;
}

function normalizeAddress(address?: CreateOwnerRequest['address']): OwnerAddress | undefined {
  if (!address) return undefined;

  const normalized: OwnerAddress = {
    zipCode: requireOptionalString(address.zipCode),
    street: requireOptionalString(address.street),
    number: requireOptionalString(address.number),
    complement: requireOptionalString(address.complement),
    state: requireOptionalString(address.state),
    city: requireOptionalString(address.city),
    district: requireOptionalString(address.district),
    reference: requireOptionalString(address.reference),
    cityCode: requireOptionalString(address.cityCode)
  };

  return Object.values(normalized).some((value) => value !== undefined) ? normalized : undefined;
}

function normalizeProfile(profile?: CreateOwnerRequest['profile']): OwnerProfile | undefined {
  if (!profile) return undefined;

  const normalized: OwnerProfile = {
    birthDate: requireOptionalString(profile.birthDate),
    sex: profile.sex,
    group: requireOptionalString(profile.group),
    receiveSms: profile.receiveSms,
    personType: profile.personType,
    rg: requireOptionalString(profile.rg)
  };

  return Object.values(normalized).some((value) => value !== undefined) ? normalized : undefined;
}

function normalizeFinancialProfile(
  financialProfile?: CreateOwnerRequest['financialProfile']
): OwnerFinancialProfile | undefined {
  if (!financialProfile) return undefined;

  const normalized: OwnerFinancialProfile = {
    allowedDebtLimit:
      typeof financialProfile.allowedDebtLimit === 'number'
        ? financialProfile.allowedDebtLimit
        : undefined,
    creditBalance:
      typeof financialProfile.creditBalance === 'number'
        ? financialProfile.creditBalance
        : undefined,
    availablePoints:
      typeof financialProfile.availablePoints === 'number'
        ? financialProfile.availablePoints
        : undefined,
    blockedPoints:
      typeof financialProfile.blockedPoints === 'number'
        ? financialProfile.blockedPoints
        : undefined
  };

  return Object.values(normalized).some((value) => value !== undefined) ? normalized : undefined;
}

function createSeedOwners(): OwnerSummary[] {
  const createdAt = '2026-03-25T00:00:00.000Z';

  return [
    {
      id: 'owner_maria_silva' as OwnerId,
      accountId: 'acc_cvg_demo' as AccountId,
      fullName: 'Maria Silva',
      documentId: '111.111.111-11',
      contacts: [
        {
          label: 'Celular',
          value: '+55 11 99999-1111',
          type: 'whatsapp',
          primary: true
        },
        {
          label: 'Email',
          value: 'maria.silva@example.com',
          type: 'email',
          primary: false
        }
      ],
      financialResponsible: true,
      administrativeNotes: 'Tutor principal com preferencia por contato via WhatsApp.',
      status: 'active',
      createdAt,
      updatedAt: createdAt
    },
    {
      id: 'owner_joao_souza' as OwnerId,
      accountId: 'acc_cvg_demo' as AccountId,
      fullName: 'Joao Souza',
      documentId: '222.222.222-22',
      contacts: [
        {
          label: 'Telefone',
          value: '+55 11 98888-2222',
          type: 'phone',
          primary: true
        }
      ],
      financialResponsible: false,
      administrativeNotes: 'Contato secundario.',
      status: 'active',
      createdAt,
      updatedAt: createdAt
    }
  ];
}

export interface OwnersServiceOptions {
  readonly ownerRepository?: OwnerRepository;
  readonly seedOwners?: readonly OwnerSummary[];
}

export class OwnersService {
  readonly #owners = new Map<OwnerId, OwnerSummary>();
  readonly #ownerRepository?: OwnerRepository;

  public constructor(options: OwnersServiceOptions = {}) {
    const seedOwners = options.seedOwners ?? createSeedOwners();
    this.#ownerRepository = options.ownerRepository;

    for (const owner of seedOwners) {
      this.#owners.set(owner.id, owner);
    }
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#ownerRepository) {
      return;
    }

    const owners = await this.#ownerRepository.findByAccountId(accountId);
    for (const owner of owners) {
      this.#owners.set(owner.id, owner);
    }
  }

  public list(search?: string): readonly OwnerSummary[] {
    const query = search?.trim().toLowerCase();
    const owners = Array.from(this.#owners.values());

    if (!query) {
      return owners;
    }

    return owners.filter((owner) => {
      const primaryContact = owner.contacts.map((contact) => contact.value.toLowerCase());
      return (
        owner.fullName.toLowerCase().includes(query) ||
        owner.documentId?.toLowerCase().includes(query) ||
        primaryContact.some((value) => value.includes(query))
      );
    });
  }

  public getOrThrow(ownerId: OwnerId): OwnerSummary {
    const owner = this.#owners.get(ownerId);
    if (!owner) {
      throw new NotFoundError('Owner not found', { ownerId });
    }

    return owner;
  }

  public create(accountId: AccountId, payload: CreateOwnerRequest): OwnerSummary {
    const fullName = requireNonEmptyString(payload.fullName, 'fullName');
    const documentId = requireOptionalString(payload.documentId);
    const duplicate = this.list().find(
      (owner) =>
        owner.fullName.toLowerCase() === fullName.toLowerCase() &&
        documentId !== undefined &&
        owner.documentId === documentId
    );

    if (duplicate) {
      throw new ConflictError('Possible duplicate owner detected', {
        ownerId: duplicate.id
      });
    }

    const now = nowIso();
    const owner: OwnerSummary = {
      id: createCorrelationId('owner') as OwnerId,
      accountId,
      fullName,
      documentId,
      contacts: normalizeContacts(payload.contacts),
      address: normalizeAddress(payload.address),
      profile: normalizeProfile(payload.profile),
      financialProfile: normalizeFinancialProfile(payload.financialProfile),
      financialResponsible: requireBoolean(payload.financialResponsible, 'financialResponsible'),
      administrativeNotes: requireOptionalString(payload.administrativeNotes),
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    this.#owners.set(owner.id, owner);

    // Persist to database if repository is available
    if (this.#ownerRepository) {
      this.#ownerRepository.create(owner).catch((err) => {
        console.error('Failed to persist owner to database:', err);
      });
    }

    return owner;
  }

  public update(ownerId: OwnerId, payload: UpdateOwnerRequest): OwnerSummary {
    const current = this.getOrThrow(ownerId);
    const updated: OwnerSummary = {
      ...current,
      fullName:
        payload.fullName !== undefined
          ? requireNonEmptyString(payload.fullName, 'fullName')
          : current.fullName,
      documentId:
        payload.documentId !== undefined
          ? requireOptionalString(payload.documentId)
          : current.documentId,
      contacts:
        payload.contacts !== undefined ? normalizeContacts(payload.contacts) : current.contacts,
      address: payload.address !== undefined ? normalizeAddress(payload.address) : current.address,
      profile: payload.profile !== undefined ? normalizeProfile(payload.profile) : current.profile,
      financialProfile:
        payload.financialProfile !== undefined
          ? normalizeFinancialProfile(payload.financialProfile)
          : current.financialProfile,
      financialResponsible:
        payload.financialResponsible !== undefined
          ? requireBoolean(payload.financialResponsible, 'financialResponsible')
          : current.financialResponsible,
      administrativeNotes:
        payload.administrativeNotes !== undefined
          ? requireOptionalString(payload.administrativeNotes)
          : current.administrativeNotes,
      status: payload.status ?? current.status,
      updatedAt: nowIso()
    };

    this.#owners.set(ownerId, updated);

    // Persist to database if repository is available
    if (this.#ownerRepository) {
      this.#ownerRepository.update(updated).catch((err) => {
        console.error('Failed to update owner in database:', err);
      });
    }

    return updated;
  }
}

export { createSeedOwners };
export { DatabaseOwnerRepository } from './repositories/database-owner.repository.js';
