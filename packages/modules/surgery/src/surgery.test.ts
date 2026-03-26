import assert from 'node:assert/strict';
import test from 'node:test';

import { NotFoundError } from '@cvg-his-v2/shared-errors';

import { SurgeryService } from './index.js';

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
  const service = new SurgeryService(encounters as never);

  return { service, encounter };
}

test('SurgeryService requestCase creates requested surgery case', () => {
  const { service, encounter } = createService();

  const surgeryCase = service.requestCase({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Ovariohisterectomia',
    preparationNotes: 'Jejum de 8h'
  });

  assert.equal(surgeryCase.encounterId, encounter.id);
  assert.equal(surgeryCase.status, 'requested');
  assert.equal(service.list(encounter.id).length, 1);
});

test('SurgeryService updateStatus stores operative notes', () => {
  const { service, encounter } = createService();
  const surgeryCase = service.requestCase({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Limpeza cirurgica',
    preparationNotes: 'Consentimento assinado'
  });

  const updated = service.updateStatus(surgeryCase.id, {
    status: 'completed',
    operativeNotes: 'Procedimento sem intercorrencias'
  });

  assert.equal(updated.status, 'completed');
  assert.equal(updated.operativeNotes, 'Procedimento sem intercorrencias');
});

test('SurgeryService getOrThrow rejects unknown case', () => {
  const { service } = createService();

  assert.throws(() => service.getOrThrow('surg_missing' as never), NotFoundError);
});

test('SurgeryService list filters by encounter', () => {
  const { service, encounter } = createService();
  service.requestCase({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Biopsia',
    preparationNotes: 'Sem preparo especial'
  });

  assert.equal(service.list(encounter.id).length, 1);
  assert.equal(service.list('encounter_2').length, 0);
});
