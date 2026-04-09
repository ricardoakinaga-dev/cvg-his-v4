import { describe, it, expect, beforeEach } from 'vitest';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from './index.js';
import {
  InMemoryPatientRepository,
  InMemoryOwnerPatientLinkRepository
} from './repositories/in-memory-patient.repository.js';
import type { AccountId, PatientId, OwnerId } from '@cvg-his-v2/shared-types';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';

const ACCOUNT_ID = 'acc_test' as AccountId;

function createOwner(owners: OwnersService, name = 'Maria Silva'): { id: OwnerId } {
  return owners.create(ACCOUNT_ID, {
    fullName: name,
    contacts: [{ label: 'Phone', value: '11999999999', type: 'phone', primary: true }],
    financialResponsible: true
  });
}

function createPatient(
  service: PatientsService,
  owners: OwnersService,
  overrides: Partial<{
    name: string;
    species: string;
    sex: 'male' | 'female' | 'unknown';
    breed: string;
    size: 'small' | 'medium' | 'large';
    baseWeightKg: number;
  }> = {}
) {
  const owner = createOwner(owners);
  return service.create(ACCOUNT_ID, {
    name: overrides.name ?? 'Luna',
    species: overrides.species ?? 'canine',
    sex: overrides.sex ?? 'female',
    breed: overrides.breed,
    size: overrides.size,
    baseWeightKg: overrides.baseWeightKg,
    primaryOwnerId: owner.id
  });
}

describe('PatientsService', () => {
  let owners: OwnersService;
  let patientRepo: InMemoryPatientRepository;
  let linkRepo: InMemoryOwnerPatientLinkRepository;
  let service: PatientsService;

  beforeEach(() => {
    owners = new OwnersService({ seedOwners: [] });
    patientRepo = new InMemoryPatientRepository();
    linkRepo = new InMemoryOwnerPatientLinkRepository();
    service = new PatientsService({
      owners,
      patientRepository: patientRepo,
      ownerPatientLinkRepository: linkRepo,
      seedPatients: [],
      seedLinks: []
    });
  });

  describe('list()', () => {
    it('returns empty list when no patients', () => {
      expect(service.list()).toHaveLength(0);
    });

    it('returns all patients without search', () => {
      createPatient(service, owners, { name: 'Luna' });
      createPatient(service, owners, { name: 'Max' });
      expect(service.list()).toHaveLength(2);
    });

    it('filters patients by name search', () => {
      createPatient(service, owners, { name: 'Luna' });
      createPatient(service, owners, { name: 'Max' });
      createPatient(service, owners, { name: 'Luna Jr' });

      const results = service.list('luna');
      expect(results.length).toBe(2);
    });

    it('filters patients by species search', () => {
      createPatient(service, owners, { name: 'Luna', species: 'canine' });
      createPatient(service, owners, { name: 'Max', species: 'feline' });

      const results = service.list('feline');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Max');
    });

    it('filters patients by owner name search', () => {
      createPatient(service, owners, { name: 'Luna' });
      createPatient(service, owners, { name: 'Max' });

      const results = service.list('maria');
      expect(results.length).toBe(2);
    });

    it('search is case-insensitive', () => {
      createPatient(service, owners, { name: 'LUNA' });
      const results = service.list('luna');
      expect(results.length).toBe(1);
    });

    it('trims search query', () => {
      createPatient(service, owners, { name: 'Luna' });
      const results = service.list('  luna  ');
      expect(results.length).toBe(1);
    });
  });

  describe('getOrThrow()', () => {
    it('returns patient when exists', () => {
      const patient = createPatient(service, owners, { name: 'Luna' });
      expect(service.getOrThrow(patient.id).name).toBe('Luna');
    });

    it('throws NotFoundError when patient does not exist', () => {
      expect(() => service.getOrThrow('nonexistent' as PatientId)).toThrow(NotFoundError);
    });
  });

  describe('create()', () => {
    it('creates patient with all fields', () => {
      const owner = createOwner(owners);
      const patient = service.create(ACCOUNT_ID, {
        name: 'Luna',
        species: 'canine',
        sex: 'female',
        breed: 'SRD',
        size: 'medium',
        baseWeightKg: 18.5,
        birthDateApproximate: '2020-08-15',
        primaryOwnerId: owner.id
      });

      expect(patient.id).toBeDefined();
      expect(patient.name).toBe('Luna');
      expect(patient.species).toBe('canine');
      expect(patient.sex).toBe('female');
      expect(patient.breed).toBe('SRD');
      expect(patient.size).toBe('medium');
      expect(patient.baseWeightKg).toBe(18.5);
      expect(patient.status).toBe('active');
      expect(patient.primaryOwnerId).toBe(owner.id);
      expect(patient.createdAt).toBeDefined();
      expect(patient.updatedAt).toBeDefined();
    });

    it('creates patient with only required fields', () => {
      const owner = createOwner(owners);
      const patient = service.create(ACCOUNT_ID, {
        name: 'Luna',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner.id
      });

      expect(patient.breed).toBeUndefined();
      expect(patient.size).toBeUndefined();
      expect(patient.baseWeightKg).toBeUndefined();
    });

    it('creates primary link when patient is created', () => {
      const owner = createOwner(owners);
      const patient = service.create(ACCOUNT_ID, {
        name: 'Luna',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner.id
      });

      const links = service.listLinks({ patientId: patient.id });
      expect(links).toHaveLength(1);
      expect(links[0].relationshipType).toBe('primary');
      expect(links[0].ownerId).toBe(owner.id);
      expect(links[0].financialResponsible).toBe(true);
    });

    it('throws ConflictError for duplicate patient (same name + same owner)', () => {
      const owner = createOwner(owners);
      service.create(ACCOUNT_ID, {
        name: 'Luna',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner.id
      });

      expect(() =>
        service.create(ACCOUNT_ID, {
          name: 'Luna',
          species: 'feline',
          sex: 'male',
          primaryOwnerId: owner.id
        })
      ).toThrow(ConflictError);
    });

    it('allows same name with different owner', () => {
      const owner1 = createOwner(owners, 'Maria');
      const owner2 = createOwner(owners, 'João');
      service.create(ACCOUNT_ID, {
        name: 'Luna',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner1.id
      });

      const second = service.create(ACCOUNT_ID, {
        name: 'Luna',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner2.id
      });

      expect(second.name).toBe('Luna');
      expect(service.list()).toHaveLength(2);
    });

    it('throws NotFoundError when primaryOwner does not exist', () => {
      expect(() =>
        service.create(ACCOUNT_ID, {
          name: 'Luna',
          species: 'canine',
          sex: 'female',
          primaryOwnerId: 'nonexistent' as OwnerId
        })
      ).toThrow(NotFoundError);
    });

    it('invokes onPatientCreated callback', async () => {
      const owner = createOwner(owners);
      let called = false;
      let capturedId = '';
      const svc = new PatientsService({
        owners,
        seedPatients: [],
        seedLinks: [],
        onPatientCreated: async (p) => {
          called = true;
          capturedId = p.id;
        }
      });

      const patient = svc.create(ACCOUNT_ID, {
        name: 'Luna',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner.id
      });

      expect(called).toBe(true);
      expect(capturedId).toBe(patient.id);
    });

    it('persists to repository when available', async () => {
      const owner = createOwner(owners);
      const patient = service.create(ACCOUNT_ID, {
        name: 'Luna',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner.id
      });

      const found = await patientRepo.findById(patient.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Luna');
    });

    it('create without repository does not throw', () => {
      const svcNoRepo = new PatientsService({
        owners,
        seedPatients: [],
        seedLinks: []
      });
      const owner = createOwner(owners);
      expect(() =>
        svcNoRepo.create(ACCOUNT_ID, {
          name: 'Luna',
          species: 'canine',
          sex: 'female',
          primaryOwnerId: owner.id
        })
      ).not.toThrow();
    });
  });

  describe('update()', () => {
    it('updates patient fields', () => {
      const patient = createPatient(service, owners, { name: 'Luna' });

      const updated = service.update(patient.id, {
        name: 'Luna Updated',
        species: 'feline',
        size: 'large'
      });

      expect(updated.name).toBe('Luna Updated');
      expect(updated.species).toBe('feline');
      expect(updated.size).toBe('large');
      expect(updated.id).toBe(patient.id);
    });

    it('preserves unchanged fields', () => {
      const patient = createPatient(service, owners, { name: 'Luna', breed: 'SRD' });

      const updated = service.update(patient.id, { name: 'Luna V2' });

      expect(updated.breed).toBe('SRD');
      expect(updated.species).toBe(patient.species);
    });

    it('updates primaryOwnerId and re-links', () => {
      const owner1 = createOwner(owners, 'Maria');
      const patient = createPatient(service, owners, { name: 'Luna' });
      const owner2 = createOwner(owners, 'João');

      service.update(patient.id, { primaryOwnerId: owner2.id });

      const links = service.listLinks({ patientId: patient.id });
      const primaryLink = links.find((l) => l.relationshipType === 'primary');
      expect(primaryLink).toBeDefined();
      expect(primaryLink!.ownerId).toBe(owner2.id);
    });

    it('throws NotFoundError when patient does not exist', () => {
      expect(() => service.update('nonexistent' as PatientId, { name: 'X' })).toThrow(
        NotFoundError
      );
    });

    it('throws NotFoundError when new primaryOwner does not exist', () => {
      const patient = createPatient(service, owners);
      expect(() =>
        service.update(patient.id, { primaryOwnerId: 'nonexistent' as OwnerId })
      ).toThrow(NotFoundError);
    });

    it('persists update to repository', async () => {
      const patient = createPatient(service, owners);
      service.update(patient.id, { name: 'Updated' });

      const found = await patientRepo.findById(patient.id);
      expect(found!.name).toBe('Updated');
    });
  });

  describe('listLinks()', () => {
    it('returns empty when no links', () => {
      expect(service.listLinks()).toHaveLength(0);
    });

    it('returns all links without filter', () => {
      const p1 = createPatient(service, owners, { name: 'Luna' });
      const p2 = createPatient(service, owners, { name: 'Max' });

      const links = service.listLinks();
      expect(links.length).toBeGreaterThanOrEqual(2);
    });

    it('filters links by ownerId', () => {
      const o1 = createOwner(owners, 'Maria');
      const o2 = createOwner(owners, 'João');
      const p1 = createPatient(service, owners);
      const p2 = createPatient(service, owners);

      service.createLink(ACCOUNT_ID, {
        ownerId: o1.id,
        patientId: p1.id,
        relationshipType: 'secondary',
        financialResponsible: false
      });
      service.createLink(ACCOUNT_ID, {
        ownerId: o1.id,
        patientId: p2.id,
        relationshipType: 'secondary',
        financialResponsible: false
      });
      service.createLink(ACCOUNT_ID, {
        ownerId: o2.id,
        patientId: p1.id,
        relationshipType: 'secondary',
        financialResponsible: false
      });

      const links = service.listLinks({ ownerId: o1.id });
      expect(links).toHaveLength(2);
    });

    it('filters links by patientId', () => {
      const owner = createOwner(owners);
      const patient = createPatient(service, owners);

      service.createLink(ACCOUNT_ID, {
        ownerId: owner.id,
        patientId: patient.id,
        relationshipType: 'secondary',
        financialResponsible: false
      });

      const links = service.listLinks({ patientId: patient.id });
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('createLink()', () => {
    it('creates secondary link between owner and patient', () => {
      const owner = createOwner(owners);
      const patient = createPatient(service, owners);

      const link = service.createLink(ACCOUNT_ID, {
        ownerId: owner.id,
        patientId: patient.id,
        relationshipType: 'secondary',
        financialResponsible: false
      });

      expect(link.id).toBeDefined();
      expect(link.ownerId).toBe(owner.id);
      expect(link.patientId).toBe(patient.id);
      expect(link.relationshipType).toBe('secondary');
      expect(link.financialResponsible).toBe(false);
    });

    it('throws ConflictError for duplicate relationship', () => {
      const owner = createOwner(owners);
      const patient = createPatient(service, owners);

      service.createLink(ACCOUNT_ID, {
        ownerId: owner.id,
        patientId: patient.id,
        relationshipType: 'secondary',
        financialResponsible: false
      });

      expect(() =>
        service.createLink(ACCOUNT_ID, {
          ownerId: owner.id,
          patientId: patient.id,
          relationshipType: 'secondary',
          financialResponsible: false
        })
      ).toThrow(ConflictError);
    });

    it('throws ValidationError when primary link does not match patient primaryOwner', () => {
      const owner1 = createOwner(owners, 'Maria');
      const owner2 = createOwner(owners, 'João');
      const patient = createPatient(service, owners);

      expect(() =>
        service.createLink(ACCOUNT_ID, {
          ownerId: owner2.id,
          patientId: patient.id,
          relationshipType: 'primary',
          financialResponsible: true
        })
      ).toThrow(ValidationError);
    });

    it('throws NotFoundError when owner does not exist', () => {
      const patient = createPatient(service, owners);
      expect(() =>
        service.createLink(ACCOUNT_ID, {
          ownerId: 'nonexistent' as OwnerId,
          patientId: patient.id,
          relationshipType: 'secondary',
          financialResponsible: false
        })
      ).toThrow(NotFoundError);
    });

    it('throws NotFoundError when patient does not exist', () => {
      const owner = createOwner(owners);
      expect(() =>
        service.createLink(ACCOUNT_ID, {
          ownerId: owner.id,
          patientId: 'nonexistent' as PatientId,
          relationshipType: 'secondary',
          financialResponsible: false
        })
      ).toThrow(NotFoundError);
    });

    it('persists link to repository', async () => {
      const owner = createOwner(owners);
      const patient = createPatient(service, owners);

      const link = service.createLink(ACCOUNT_ID, {
        ownerId: owner.id,
        patientId: patient.id,
        relationshipType: 'secondary',
        financialResponsible: false
      });

      const found = await linkRepo.findById(link.id);
      expect(found).not.toBeNull();
      expect(found!.relationshipType).toBe('secondary');
    });
  });

  describe('searchMaster()', () => {
    it('returns all entities matching query', () => {
      const owner = createOwner(owners, 'Maria Silva');
      createPatient(service, owners, { name: 'Luna' });

      const result = service.searchMaster('luna');

      expect(result.patients.length).toBe(1);
      expect(result.owners.length).toBe(0);
    });

    it('returns owners matching query', () => {
      const owner = createOwner(owners, 'Ana Paula');
      const patient = service.create(ACCOUNT_ID, {
        name: 'Luna',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner.id
      });

      const result = service.searchMaster('ana');

      expect(result.owners.length).toBe(1);
      expect(result.owners[0].id).toBe(owner.id);
    });

    it('returns empty results when no match', () => {
      createPatient(service, owners);

      const result = service.searchMaster('zzzzz');

      expect(result.patients).toHaveLength(0);
      expect(result.owners).toHaveLength(0);
    });

    it('trims query', () => {
      createPatient(service, owners, { name: 'Luna' });

      const result = service.searchMaster('  luna  ');

      expect(result.patients.length).toBe(1);
    });
  });
});
