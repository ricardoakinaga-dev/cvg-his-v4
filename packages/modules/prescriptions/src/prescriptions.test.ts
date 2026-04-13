import { describe, it, expect, beforeEach } from 'vitest';
import {
  PrescriptionsService,
  InMemoryPrescriptionRepository,
  type CreatePrescriptionRequest,
  type PrescriptionId
} from './index.js';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, EncounterId, PatientId, UserId } from '@cvg-his-v2/shared-types';

const ACCOUNT_ID = 'acc_cvg_demo' as AccountId;
const PATIENT_1 = 'pat_001' as PatientId;
const PATIENT_2 = 'pat_002' as PatientId;
const ENCOUNTER_1 = 'enc_001' as EncounterId;
const ENCOUNTER_2 = 'enc_002' as EncounterId;
const ACTOR_ID = 'user_doc_01' as UserId;

function createPayload(overrides: Partial<CreatePrescriptionRequest> = {}): CreatePrescriptionRequest {
  return {
    encounterId: ENCOUNTER_1,
    patientId: PATIENT_1,
    medicationName: 'Amoxicilina',
    dosage: '500mg',
    route: 'Oral',
    frequency: '8/8h',
    notes: 'Tomar com alimentos',
    ...overrides
  };
}

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;
  let repo: InMemoryPrescriptionRepository;

  beforeEach(() => {
    repo = new InMemoryPrescriptionRepository();
    service = new PrescriptionsService({ prescriptionRepository: repo });
  });

  describe('create', () => {
    it('should create a prescription with all fields', () => {
      const rx = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());

      expect(rx.id).toBeDefined();
      expect(rx.entryType).toBe('prescription');
      expect(rx.medicationName).toBe('Amoxicilina');
      expect(rx.dosage).toBe('500mg');
      expect(rx.route).toBe('Oral');
      expect(rx.frequency).toBe('8/8h');
      expect(rx.version).toBe(1);
      expect(rx.createdAt).toBeDefined();
    });

    it('should create a prescription with only required fields', () => {
      const rx = service.create(ACCOUNT_ID, ACTOR_ID, {
        encounterId: ENCOUNTER_1,
        patientId: PATIENT_1,
        medicationName: 'Dipirona'
      });

      expect(rx.medicationName).toBe('Dipirona');
      expect(rx.dosage).toBeUndefined();
      expect(rx.route).toBeUndefined();
      expect(rx.frequency).toBeUndefined();
    });

    it('should store prescription content as formatted lines', () => {
      const rx = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());

      expect(rx.content).toContain('Posologia: 500mg');
      expect(rx.content).toContain('Via: Oral');
      expect(rx.content).toContain('Frequência: 8/8h');
      expect(rx.content).toContain('Observações: Tomar com alimentos');
    });

    it('should throw ValidationError for empty medicationName', () => {
      expect(() =>
        service.create(ACCOUNT_ID, ACTOR_ID, {
          encounterId: ENCOUNTER_1,
          patientId: PATIENT_1,
          medicationName: ''
        })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for medicationName shorter than 2 chars', () => {
      expect(() =>
        service.create(ACCOUNT_ID, ACTOR_ID, {
          encounterId: ENCOUNTER_1,
          patientId: PATIENT_1,
          medicationName: 'A'
        })
      ).toThrow(ValidationError);
    });

    it('should persist to repository when repository is provided', async () => {
      const rx = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());
      await service.waitForPersistence();

      const found = await repo.findById(rx.id);
      expect(found).not.toBeNull();
      expect(found!.medicationName).toBe('Amoxicilina');
    });
  });

  describe('getById', () => {
    it('should return prescription by id', () => {
      const created = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());
      const found = service.getById(created.id);

      expect(found.id).toBe(created.id);
      expect(found.medicationName).toBe('Amoxicilina');
    });

    it('should throw NotFoundError for non-existent id', () => {
      expect(() => service.getById('rx_nonexistent' as PrescriptionId)).toThrow(NotFoundError);
    });
  });

  describe('listByEncounter', () => {
    it('should list prescriptions for an encounter', () => {
      service.create(ACCOUNT_ID, ACTOR_ID, createPayload({ medicationName: 'Amoxicilina' }));
      service.create(ACCOUNT_ID, ACTOR_ID, createPayload({ medicationName: 'Dipirona' }));

      const list = service.listByEncounter(ENCOUNTER_1);
      expect(list.length).toBe(2);
      expect(list.map((r) => r.medicationName)).toContain('Amoxicilina');
      expect(list.map((r) => r.medicationName)).toContain('Dipirona');
    });

    it('should return empty list for encounter with no prescriptions', () => {
      const list = service.listByEncounter(ENCOUNTER_2);
      expect(list.length).toBe(0);
    });

    it('should not return prescriptions from other encounters', () => {
      service.create(ACCOUNT_ID, ACTOR_ID, createPayload());
      service.create(ACCOUNT_ID, ACTOR_ID, {
        ...createPayload(),
        encounterId: ENCOUNTER_2,
        medicationName: 'Omeprazol'
      });

      const list = service.listByEncounter(ENCOUNTER_1);
      expect(list.length).toBe(1);
      expect(list[0].medicationName).toBe('Amoxicilina');
    });
  });

  describe('listByPatient', () => {
    it('should list prescriptions for a patient', () => {
      service.create(ACCOUNT_ID, ACTOR_ID, createPayload());
      service.create(ACCOUNT_ID, ACTOR_ID, createPayload({ medicationName: 'Omeprazol' }));
      service.create(ACCOUNT_ID, ACTOR_ID, createPayload({ medicationName: 'Ibuprofeno', patientId: PATIENT_2 }));

      const patient1List = service.listByPatient(PATIENT_1);
      const patient2List = service.listByPatient(PATIENT_2);

      expect(patient1List.length).toBe(2);
      expect(patient2List.length).toBe(1);
      expect(patient2List[0].medicationName).toBe('Ibuprofeno');
    });
  });

  describe('listByAccount', () => {
    it('should list prescriptions for an account', () => {
      service.create(ACCOUNT_ID, ACTOR_ID, createPayload());
      service.create(ACCOUNT_ID, ACTOR_ID, createPayload({ medicationName: 'Omeprazol' }));

      const list = service.listByAccount(ACCOUNT_ID);
      expect(list.length).toBe(2);
    });
  });

  describe('update', () => {
    it('should update prescription title', () => {
      const created = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());

      const updated = service.update(created.id, ACTOR_ID, { title: 'Amoxicilina 875mg' });

      expect(updated.title).toBe('Amoxicilina 875mg');
      expect(updated.version).toBe(2);
    });

    it('should update prescription content', () => {
      const created = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());

      const updated = service.update(created.id, ACTOR_ID, {
        content: 'Posologia: 875mg\nVia: Oral\nFrequência: 12/12h'
      });

      expect(updated.content).toContain('875mg');
      expect(updated.content).toContain('12/12h');
    });

    it('should throw ValidationError when updating archived prescription', () => {
      const created = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());
      service.archive(created.id, ACTOR_ID, { reason: 'Duplicated' });

      expect(() =>
        service.update(created.id, ACTOR_ID, { title: 'New name' })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError on version mismatch', () => {
      const created = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());

      expect(() =>
        service.update(created.id, ACTOR_ID, {
          title: 'New name',
          expectedVersion: 99
        })
      ).toThrow(ValidationError);
    });
  });

  describe('archive', () => {
    it('should archive a prescription', () => {
      const created = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());

      const archived = service.archive(created.id, ACTOR_ID, { reason: 'Duplicated prescription' });

      expect(archived.deletedAt).toBeDefined();
      expect(archived.deletedByUserId).toBe(ACTOR_ID);
      expect(archived.deleteReason).toBe('Duplicated prescription');
    });

    it('should throw ValidationError when archiving already archived prescription', () => {
      const created = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());
      service.archive(created.id, ACTOR_ID, { reason: 'First archive' });

      expect(() =>
        service.archive(created.id, ACTOR_ID, { reason: 'Second archive' })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError on version mismatch when archiving', () => {
      const created = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());

      expect(() =>
        service.archive(created.id, ACTOR_ID, {
          reason: 'Archive',
          expectedVersion: 99
        })
      ).toThrow(ValidationError);
    });
  });

  describe('InMemoryPrescriptionRepository', () => {
    it('should create and find prescriptions', async () => {
      const repo = new InMemoryPrescriptionRepository();
      const service = new PrescriptionsService({ prescriptionRepository: repo });

      const rx = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());
      await service.waitForPersistence();

      const found = await repo.findById(rx.id);
      expect(found).not.toBeNull();
      expect(found!.medicationName).toBe('Amoxicilina');
    });

    it('should update prescriptions via repository', async () => {
      const repo = new InMemoryPrescriptionRepository();
      const service = new PrescriptionsService({ prescriptionRepository: repo });

      const rx = service.create(ACCOUNT_ID, ACTOR_ID, createPayload());
      await service.waitForPersistence();

      const updated = service.update(rx.id, ACTOR_ID, { title: 'Updated name' });
      await service.waitForPersistence();

      const found = await repo.findById(updated.id);
      expect(found!.title).toBe('Updated name');
    });

    it('should list prescriptions by encounter via repository', async () => {
      const repo = new InMemoryPrescriptionRepository();
      const service = new PrescriptionsService({ prescriptionRepository: repo });

      service.create(ACCOUNT_ID, ACTOR_ID, createPayload());
      service.create(ACCOUNT_ID, ACTOR_ID, createPayload({ medicationName: 'Second' }));
      await service.waitForPersistence();

      const list = await repo.findByEncounterId(ENCOUNTER_1);
      expect(list.length).toBe(2);
    });

    it('should list prescriptions by patient via repository', async () => {
      const repo = new InMemoryPrescriptionRepository();
      const service = new PrescriptionsService({ prescriptionRepository: repo });

      service.create(ACCOUNT_ID, ACTOR_ID, createPayload());
      await service.waitForPersistence();

      const list = await repo.findByPatientId(PATIENT_1);
      expect(list.length).toBe(1);
    });

    it('should return null when finding non-existent prescription', async () => {
      const repo = new InMemoryPrescriptionRepository();
      const found = await repo.findById('rx_nonexistent' as PrescriptionId);
      expect(found).toBeNull();
    });
  });
});
