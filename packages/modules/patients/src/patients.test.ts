import { describe, it, expect, beforeEach } from 'vitest';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from './index.js';
import type { AccountId, PatientId } from '@cvg-his-v2/shared-types';

const ACCOUNT_ID = 'acc_test' as AccountId;

describe('PatientsService', () => {
  let owners: OwnersService;
  let service: PatientsService;

  beforeEach(() => {
    owners = new OwnersService({ seedOwners: [] });
    service = new PatientsService({ owners, seedPatients: [], seedLinks: [] });
  });

  it('should list patients (empty)', () => {
    expect(service.list().length).toBe(0);
  });

  it('should create a patient', () => {
    const owner = owners.create(ACCOUNT_ID, {
      fullName: 'Owner',
      contacts: [{ label: 'Phone', value: '111', type: 'phone', primary: true }],
      financialResponsible: true
    });
    const patient = service.create(ACCOUNT_ID, {
      name: 'Luna',
      species: 'Cão',
      sex: 'female',
      primaryOwnerId: owner.id
    });
    expect(patient.name).toBe('Luna');
    expect(patient.species).toBe('Cão');
    expect(patient.status).toBe('active');
  });

  it('should throw NotFoundError for missing patient', () => {
    expect(() => service.getOrThrow('missing' as PatientId)).toThrow();
  });

  it('should invoke onPatientCreated callback when creating a patient', () => {
    const owner = owners.create(ACCOUNT_ID, {
      fullName: 'Owner',
      contacts: [{ label: 'Phone', value: '111', type: 'phone', primary: true }],
      financialResponsible: true
    });

    let callbackInvoked = false;
    let capturedPatientId: string | null = null;

    const serviceWithCallback = new PatientsService({
      owners,
      seedPatients: [],
      seedLinks: [],
      onPatientCreated: async (patient) => {
        callbackInvoked = true;
        capturedPatientId = patient.id;
      }
    });

    const patient = serviceWithCallback.create(ACCOUNT_ID, {
      name: 'Luna',
      species: 'Cão',
      sex: 'female',
      primaryOwnerId: owner.id
    });

    expect(callbackInvoked).toBe(true);
    expect(capturedPatientId).toBe(patient.id);
  });
});
