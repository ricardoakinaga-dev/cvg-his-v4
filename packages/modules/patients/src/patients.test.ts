import { describe, it, expect, beforeEach } from 'vitest';
import { OwnersService } from '@cvg-his-v2/module-owners';
import {
  PatientsService,
  type OwnerPatientLinkRepository,
  type PatientRepository
} from './index.js';
import {
  InMemoryPatientRepository,
  InMemoryOwnerPatientLinkRepository
} from './repositories/in-memory-patient.repository.js';
import type { AccountId, PatientId, OwnerId } from '@cvg-his-v2/shared-types';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';

const ACCOUNT_ID = 'acc_test' as AccountId;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    it('filters patients by owner document, RG, phone and patient id', () => {
      const owner = owners.create(ACCOUNT_ID, {
        fullName: 'Tutor Busca Ampla',
        documentId: '123.456.789-00',
        contacts: [
          { label: 'Celular', value: '+55 (11) 98888-4444', type: 'whatsapp', primary: true }
        ],
        profile: {
          rg: '22.333.444-5'
        },
        financialResponsible: true
      });
      const patient = service.create(ACCOUNT_ID, {
        name: 'Nina',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner.id
      });

      expect(service.list('12345678900').map((item) => item.id)).toContain(patient.id);
      expect(service.list('11988884444').map((item) => item.id)).toContain(patient.id);
      expect(service.list('223334445').map((item) => item.id)).toContain(patient.id);
      expect(service.list(patient.id).map((item) => item.id)).toContain(patient.id);
    });

    it('filters patients by Vetus-like identifiers', () => {
      const owner = createOwner(owners);
      service.create(ACCOUNT_ID, {
        name: 'Thor',
        species: 'canine',
        sex: 'male',
        microchip: 'CHIP-9988',
        color: 'Preto',
        legacyVetusId: '3835',
        primaryOwnerId: owner.id
      });

      expect(service.list('CHIP-9988')).toHaveLength(1);
      expect(service.list('3835')).toHaveLength(1);
      expect(service.list('preto')).toHaveLength(1);
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

    it('refreshes lifecycle state from the repository instead of trusting a stale cache', async () => {
      const owner = createOwner(owners);
      const cached = service.create(ACCOUNT_ID, {
        name: 'Authoritative patient',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner.id
      });
      const persisted = { ...cached, status: 'inactive' as const };
      const authoritative = new PatientsService({
        owners,
        seedPatients: [cached],
        seedLinks: [],
        patientRepository: {
          create: async () => undefined,
          update: async () => undefined,
          findById: async () => persisted,
          findByAccountId: async () => [persisted],
          delete: async () => undefined
        }
      });

      await expect(authoritative.getAuthoritativeOrThrow(ACCOUNT_ID, cached.id)).resolves.toMatchObject({
        id: cached.id,
        status: 'inactive'
      });
      expect(authoritative.getOrThrow(cached.id).status).toBe('inactive');
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
        isNeutered: true,
        microchip: '985141000000001',
        pedigreeNumber: 'PED-123',
        color: 'Caramelo',
        chronicDisease: 'Doenca renal cronica',
        allergy: 'Dipirona',
        temperament: 'Docil',
        generalNotes: 'Paciente usa coleira vermelha.',
        legacyVetusId: '15',
        originalCreatedAt: '2024-05-03',
        primaryOwnerId: owner.id
      });

      expect(patient.id).toBeDefined();
      expect(patient.id).toMatch(UUID_PATTERN);
      expect(patient.name).toBe('Luna');
      expect(patient.species).toBe('canine');
      expect(patient.sex).toBe('female');
      expect(patient.breed).toBe('SRD');
      expect(patient.size).toBe('medium');
      expect(patient.baseWeightKg).toBe(18.5);
      expect(patient.isNeutered).toBe(true);
      expect(patient.microchip).toBe('985141000000001');
      expect(patient.pedigreeNumber).toBe('PED-123');
      expect(patient.color).toBe('Caramelo');
      expect(patient.chronicDisease).toBe('Doenca renal cronica');
      expect(patient.allergy).toBe('Dipirona');
      expect(patient.temperament).toBe('Docil');
      expect(patient.generalNotes).toBe('Paciente usa coleira vermelha.');
      expect(patient.legacyVetusId).toBe('15');
      expect(patient.originalCreatedAt).toBe('2024-05-03');
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

    it('rejects an inactive owner as a new primary responsible person', () => {
      const inactiveOwner = createOwner(owners, 'Tutor Inativo');
      owners.update(inactiveOwner.id, { status: 'inactive' });

      expect(() =>
        service.create(ACCOUNT_ID, {
          name: 'Paciente sem tutor ativo',
          species: 'canine',
          sex: 'unknown',
          primaryOwnerId: inactiveOwner.id
        })
      ).toThrow(ConflictError);
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

      await svc.waitForPersistence();

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
      await service.waitForPersistence();

      const found = await patientRepo.findById(patient.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Luna');

      const links = await linkRepo.findByPatientId(patient.id, ACCOUNT_ID);
      expect(links).toHaveLength(1);
      expect(links[0].relationshipType).toBe('primary');
    });

    it('rolls back patient and primary link from memory when repository persistence fails', async () => {
      const owner = createOwner(owners);
      const failingPatientRepository: PatientRepository = {
        async create() {
          throw new Error('database unavailable');
        },
        async update() {},
        async findById() {
          return null;
        },
        async findByAccountId() {
          return [];
        },
        async delete() {}
      };
      const linkRepository: OwnerPatientLinkRepository = {
        async create() {},
        async findById() {
          return null;
        },
        async findByPatientId() {
          return [];
        },
        async findByOwnerId() {
          return [];
        },
        async delete() {}
      };
      const failingService = new PatientsService({
        owners,
        patientRepository: failingPatientRepository,
        ownerPatientLinkRepository: linkRepository,
        seedPatients: [],
        seedLinks: []
      });

      const patient = failingService.create(ACCOUNT_ID, {
        name: 'Rollback Patient',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner.id
      });

      await expect(failingService.waitForPersistence()).rejects.toThrow('database unavailable');
      expect(() => failingService.getOrThrow(patient.id)).toThrow(NotFoundError);
      expect(failingService.listLinks({ patientId: patient.id })).toHaveLength(0);
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
        size: 'large',
        microchip: 'CHIP-UPDATED',
        color: 'Branco',
        isNeutered: false,
        allergy: 'Penicilina'
      });

      expect(updated.name).toBe('Luna Updated');
      expect(updated.species).toBe('feline');
      expect(updated.size).toBe('large');
      expect(updated.microchip).toBe('CHIP-UPDATED');
      expect(updated.color).toBe('Branco');
      expect(updated.isNeutered).toBe(false);
      expect(updated.allergy).toBe('Penicilina');
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

    it('does not transfer a patient to an inactive primary owner', () => {
      const patient = createPatient(service, owners, { name: 'Luna' });
      const inactiveOwner = createOwner(owners, 'Tutor Inativo');
      owners.update(inactiveOwner.id, { status: 'inactive' });

      expect(() => service.update(patient.id, { primaryOwnerId: inactiveOwner.id })).toThrow(
        ConflictError
      );
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
      await service.waitForPersistence();

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

    it('rejects new relationships with an inactive owner', () => {
      const patient = createPatient(service, owners);
      const inactiveOwner = createOwner(owners, 'Tutor Inativo');
      owners.update(inactiveOwner.id, { status: 'inactive' });

      expect(() =>
        service.createLink(ACCOUNT_ID, {
          ownerId: inactiveOwner.id,
          patientId: patient.id,
          relationshipType: 'authorized',
          financialResponsible: false
        })
      ).toThrow(ConflictError);
    });

    it('rejects new relationships with an inactive patient', () => {
      const patient = createPatient(service, owners);
      const authorizedOwner = createOwner(owners, 'Autorizado do Paciente Inativo');
      service.update(patient.id, { status: 'inactive' });

      expect(() =>
        service.createLink(ACCOUNT_ID, {
          ownerId: authorizedOwner.id,
          patientId: patient.id,
          relationshipType: 'authorized',
          financialResponsible: false
        })
      ).toThrow(ConflictError);
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

    it('rejects owners and patients from another account', () => {
      const anotherAccountId = 'acc_other' as AccountId;
      const foreignOwner = owners.create(anotherAccountId, {
        fullName: 'Foreign owner',
        contacts: [{ label: 'Phone', value: '11988887777', type: 'phone', primary: true }],
        financialResponsible: false
      });
      const localPatient = createPatient(service, owners);

      expect(() =>
        service.createLink(ACCOUNT_ID, {
          ownerId: foreignOwner.id,
          patientId: localPatient.id,
          relationshipType: 'secondary',
          financialResponsible: false
        })
      ).toThrow(ValidationError);
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
      await service.waitForPersistence();

      const found = await linkRepo.findById(link.id, ACCOUNT_ID);
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

  describe('relationship lifecycle and merge()', () => {
    it('updates and deletes an authorized relationship while protecting primary', async () => {
      const primaryOwner = createOwner(owners, 'Primary');
      const authorizedOwner = createOwner(owners, 'Authorized');
      const patient = service.create(ACCOUNT_ID, {
        name: 'Luna',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: primaryOwner.id
      });
      const link = service.createLink(ACCOUNT_ID, {
        ownerId: authorizedOwner.id,
        patientId: patient.id,
        relationshipType: 'secondary',
        financialResponsible: false
      });

      const updated = service.updateLink(ACCOUNT_ID, link.id, { financialResponsible: true });
      await service.waitForPersistence();
      expect(updated.financialResponsible).toBe(true);
      expect((await linkRepo.findById(link.id, ACCOUNT_ID))?.financialResponsible).toBe(true);

      service.deleteLink(ACCOUNT_ID, link.id);
      await service.waitForPersistence();
      expect(await linkRepo.findById(link.id, ACCOUNT_ID)).toBeNull();
      expect(() => service.deleteLink(ACCOUNT_ID, service.listLinks({ patientId: patient.id })[0].id))
        .toThrow(ValidationError);
    });

    it('merges patients without deleting the source clinical identity', async () => {
      const owner = createOwner(owners);
      const source = service.create(ACCOUNT_ID, {
        name: 'Duplicate Luna',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner.id
      });
      const target = service.create(ACCOUNT_ID, {
        name: 'Canonical Luna',
        species: 'canine',
        sex: 'female',
        primaryOwnerId: owner.id
      });

      const merged = service.merge(
        ACCOUNT_ID,
        source.id,
        target.id,
        'user_admin' as never,
        'Duplicate registry entry'
      );
      await service.waitForPersistence();

      expect(merged.status).toBe('inactive');
      expect(merged.generalNotes).toContain(target.id);
      expect(service.getOrThrow(source.id).status).toBe('inactive');
      expect(service.getOrThrow(target.id).status).toBe('active');
      expect((await patientRepo.findById(source.id))?.status).toBe('inactive');
    });
  });
});
