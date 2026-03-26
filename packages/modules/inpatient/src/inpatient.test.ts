import assert from 'node:assert/strict';
import test from 'node:test';

import { NotFoundError } from '@cvg-his-v2/shared-errors';

import { InpatientService } from './index.js';

function createService() {
  const encounter = {
    id: 'encounter_1',
    accountId: 'acc_test',
    patientId: 'patient_1'
  };
  const encounters = {
    getOrThrow(encounterId: string) {
      assert.equal(encounterId, encounter.id);
      return encounter;
    }
  };
  const service = new InpatientService(encounters as never);

  return { service, encounter };
}

test('InpatientService admit creates stay linked to encounter', () => {
  const { service, encounter } = createService();

  const stay = service.admit({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    unit: 'UTI',
    ward: 'Ala A',
    bed: 'B12'
  });

  assert.equal(stay.encounterId, encounter.id);
  assert.equal(stay.status, 'admitted');
  assert.equal(service.list(encounter.id).length, 1);
});

test('InpatientService addProgress records authored progress note', () => {
  const { service, encounter } = createService();
  const stay = service.admit({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    unit: 'Internacao',
    ward: 'Ala B',
    bed: 'B03'
  });

  const progress = service.addProgress('doctor_1' as never, {
    stayId: stay.id,
    note: 'Paciente estavel'
  });

  assert.equal(progress.stayId, stay.id);
  assert.equal(service.listProgress(stay.id).length, 1);
  assert.equal(service.listProgress(stay.id)[0].authoredByUserId, 'doctor_1');
});

test('InpatientService updateStatus persists latest status', () => {
  const { service, encounter } = createService();
  const stay = service.admit({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    unit: 'Internacao',
    ward: 'Ala C',
    bed: 'C08'
  });

  const updated = service.updateStatus(stay.id, {
    status: 'discharged'
  });

  assert.equal(updated.status, 'discharged');
  assert.equal(service.getOrThrow(stay.id).status, 'discharged');
});

test('InpatientService getOrThrow rejects unknown stay', () => {
  const { service } = createService();

  assert.throws(() => service.getOrThrow('stay_missing' as never), NotFoundError);
});
