import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, OwnerId, PatientId } from '@cvg-his-v2/shared-types';

import { OwnersService } from '../../../packages/modules/owners/src/index.js';
import {
  PatientsService
} from '../../../packages/modules/patients/src/index.js';
import {
  InMemoryOwnerPatientLinkRepository,
  InMemoryPatientRepository
} from '../../../packages/modules/patients/src/repositories/in-memory-patient.repository.js';

const ACCOUNT_ID = 'acc_cov_patients' as AccountId;

function createOwner(
  owners: OwnersService,
  name: string,
  contact = '11999990000'
): { id: OwnerId } {
  return owners.create(ACCOUNT_ID, {
    fullName: name,
    contacts: [{ label: 'mobile', value: contact, type: 'phone', primary: true }],
    financialResponsible: true
  });
}

describe('PatientsService coverage guard', () => {
  let owners: OwnersService;
  let patientRepository: InMemoryPatientRepository;
  let linkRepository: InMemoryOwnerPatientLinkRepository;
  let service: PatientsService;

  beforeEach(() => {
    owners = new OwnersService({ seedOwners: [] });
    patientRepository = new InMemoryPatientRepository();
    linkRepository = new InMemoryOwnerPatientLinkRepository();
    service = new PatientsService({
      owners,
      patientRepository,
      ownerPatientLinkRepository: linkRepository,
      seedPatients: [],
      seedLinks: []
    });
  });

  it('hydrates persisted patients and links, then searches by patient and owner data', async () => {
    const owner = createOwner(owners, 'Maria da Serra');
    const patientId = 'patient_repo_1' as PatientId;

    await patientRepository.create({
      id: patientId,
      accountId: ACCOUNT_ID,
      name: 'Thor',
      species: 'canine',
      breed: 'Labrador',
      sex: 'male',
      size: 'large',
      baseWeightKg: 31.5,
      birthDateApproximate: '2021-01-20',
      primaryOwnerId: owner.id,
      status: 'active',
      createdAt: '2026-04-18T10:00:00.000Z',
      updatedAt: '2026-04-18T10:00:00.000Z'
    });
    await linkRepository.create({
      id: 'link_repo_1' as never,
      accountId: ACCOUNT_ID,
      ownerId: owner.id,
      patientId,
      relationshipType: 'primary',
      financialResponsible: true,
      createdAt: '2026-04-18T10:00:00.000Z'
    });

    await service.hydrateFromDatabase(ACCOUNT_ID);

    expect(service.getOrThrow(patientId).name).toBe('Thor');
    expect(service.list('  labrador  ')).toHaveLength(1);
    expect(service.list('maria')).toHaveLength(1);
    expect(service.searchMaster('thor').links).toHaveLength(1);
  });

  it('creates patients, persists repositories, invokes callback and rejects duplicates by same owner', async () => {
    const owner = createOwner(owners, 'Juliana Costa');
    const onPatientCreated = vi.fn(async () => undefined);
    const repositoryBacked = new PatientsService({
      owners,
      patientRepository,
      ownerPatientLinkRepository: linkRepository,
      seedPatients: [],
      seedLinks: [],
      onPatientCreated
    });

    const created = repositoryBacked.create(ACCOUNT_ID, {
      name: 'Luna',
      species: 'canine',
      sex: 'female',
      primaryOwnerId: owner.id,
      baseWeightKg: 18.4
    });

    await Promise.resolve();

    expect(patientRepository.getAll()).toHaveLength(1);
    expect(repositoryBacked.listLinks({ patientId: created.id })).toHaveLength(1);
    expect(linkRepository.getAll()).toHaveLength(0);
    expect(onPatientCreated).toHaveBeenCalledWith(expect.objectContaining({ id: created.id }));

    expect(() =>
      repositoryBacked.create(ACCOUNT_ID, {
        name: 'luna',
        species: 'feline',
        sex: 'female',
        primaryOwnerId: owner.id
      })
    ).toThrow(ConflictError);

    expect(() =>
      repositoryBacked.create(ACCOUNT_ID, {
        name: 'Sem Tutor',
        species: 'canine',
        sex: 'male',
        primaryOwnerId: 'owner_missing' as OwnerId
      })
    ).toThrow(NotFoundError);
  });

  it('updates patient data and swaps the primary owner link when ownership changes', async () => {
    const primaryOwner = createOwner(owners, 'Primeiro Tutor');
    const newOwner = createOwner(owners, 'Segundo Tutor', '11999990001');
    const patient = service.create(ACCOUNT_ID, {
      name: 'Nina',
      species: 'feline',
      sex: 'female',
      primaryOwnerId: primaryOwner.id
    });

    const updated = service.update(patient.id, {
      breed: 'Siames',
      baseWeightKg: 4.2,
      primaryOwnerId: newOwner.id
    });

    await Promise.resolve();

    expect(updated.primaryOwnerId).toBe(newOwner.id);
    expect(updated.breed).toBe('Siames');
    expect(updated.baseWeightKg).toBe(4.2);
    expect(linkRepository.getAll()).toHaveLength(0);
    expect(service.listLinks({ patientId: patient.id })).toEqual([
      expect.objectContaining({
        patientId: patient.id,
        ownerId: newOwner.id,
        relationshipType: 'primary'
      })
    ]);
  });

  it('creates secondary links and enforces relationship consistency rules', () => {
    const primaryOwner = createOwner(owners, 'Tutor Primario');
    const spouseOwner = createOwner(owners, 'Tutor Secundario', '11999990002');
    const patient = service.create(ACCOUNT_ID, {
      name: 'Milo',
      species: 'canine',
      sex: 'male',
      primaryOwnerId: primaryOwner.id
    });

    const secondary = service.createLink(ACCOUNT_ID, {
      ownerId: spouseOwner.id,
      patientId: patient.id,
      relationshipType: 'spouse',
      financialResponsible: false
    });

    expect(secondary.relationshipType).toBe('spouse');
    expect(service.listLinks({ ownerId: spouseOwner.id })).toHaveLength(1);
    expect(linkRepository.getAll()).toHaveLength(1);

    expect(() =>
      service.createLink(ACCOUNT_ID, {
        ownerId: spouseOwner.id,
        patientId: patient.id,
        relationshipType: 'spouse',
        financialResponsible: false
      })
    ).toThrow(ConflictError);

    expect(() =>
      service.createLink(ACCOUNT_ID, {
        ownerId: spouseOwner.id,
        patientId: patient.id,
        relationshipType: 'primary',
        financialResponsible: true
      })
    ).toThrow(ValidationError);
  });
});
