import assert from 'node:assert/strict';
import { test } from 'vitest';

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

  const toPreOp = service.updateStatus(surgeryCase.id, { status: 'pre_op' });
  assert.equal(toPreOp.status, 'pre_op');

  const toInProgress = service.updateStatus(surgeryCase.id, { status: 'in_progress' });
  assert.equal(toInProgress.status, 'in_progress');
  assert.ok(toInProgress.startedAt);

  const toRecovery = service.updateStatus(surgeryCase.id, { status: 'recovery' });
  assert.equal(toRecovery.status, 'recovery');

  const completed = service.updateStatus(surgeryCase.id, {
    status: 'completed',
    operativeNotes: 'Procedimento sem intercorrencias'
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.operativeNotes, 'Procedimento sem intercorrencias');
  assert.ok(completed.endedAt);
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

test('SurgeryService requestCase records surgical team', () => {
  const { service, encounter } = createService();

  const surgeryCase = service.requestCase({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Ortotomia',
    surgeonUserId: 'dr_fernandes',
    surgicalTeam: ['enf_maria', 'enf_joao', 'dr_ana']
  });

  assert.equal(surgeryCase.surgeonUserId, 'dr_fernandes');
  assert.deepEqual(surgeryCase.surgicalTeam, ['enf_maria', 'enf_joao', 'dr_ana']);
});

test('SurgeryService updateStatus blocks invalid transitions', () => {
  const { service, encounter } = createService();

  const surgeryCase = service.requestCase({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Ressecção'
  });

  service.updateStatus(surgeryCase.id, { status: 'pre_op' });
  service.updateStatus(surgeryCase.id, { status: 'in_progress' });
  service.updateStatus(surgeryCase.id, { status: 'recovery' });

  assert.throws(
    () => service.updateStatus(surgeryCase.id, { status: 'requested' }),
    /Invalid status transition/
  );
});

test('SurgeryService updateStatus allows cancellation from early states', () => {
  const { service, encounter } = createService();

  const surgeryCase = service.requestCase({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Ressecção'
  });

  const cancelled = service.updateStatus(surgeryCase.id, { status: 'cancelled' });
  assert.equal(cancelled.status, 'cancelled');

  const preOpCase = service.requestCase({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Ressecção2'
  });
  const cancelledFromPreOp = service.updateStatus(preOpCase.id, { status: 'pre_op' });
  const cancelledAfterPreOp = service.updateStatus(preOpCase.id, { status: 'cancelled' });
  assert.equal(cancelledAfterPreOp.status, 'cancelled');
});

test('SurgeryService rolls back in-memory creation when persistence fails', async () => {
  const { encounter } = createService();
  const service = new SurgeryService(
    { getOrThrow: () => encounter } as never,
    {
      surgeryCaseRepository: {
        async findByAccountId() {
          return [];
        },
        async findById() {
          return null;
        },
        async create() {
          throw new Error('database unavailable');
        },
        async update() {
          throw new Error('database unavailable');
        },
        async findByEncounterId() {
          return [];
        }
      }
    }
  );

  service.requestCase({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Persisted surgery'
  });

  await assert.rejects(() => service.waitForPersistence(), /database unavailable/);
  assert.deepEqual(service.list(), []);
});
