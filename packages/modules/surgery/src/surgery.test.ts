import assert from 'node:assert/strict';
import { test } from 'vitest';

import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';

import { SurgeryService } from './index.js';

function createService() {
  const encounter = {
    id: 'encounter_1',
    accountId: 'acc_test' as AccountId,
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

  const surgeryCase = service.requestCase(encounter.accountId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Ovariohisterectomia',
    preparationNotes: 'Jejum de 8h'
  });

  assert.equal(surgeryCase.encounterId, encounter.id);
  assert.equal(surgeryCase.status, 'requested');
  assert.equal(service.list(encounter.accountId, encounter.id).length, 1);
});

test('SurgeryService updateStatus stores operative notes', () => {
  const { service, encounter } = createService();
  const surgeryCase = service.requestCase(encounter.accountId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Limpeza cirurgica',
    preparationNotes: 'Consentimento assinado'
  });

  const toPreOp = service.updateStatus(encounter.accountId, surgeryCase.id, { status: 'pre_op' });
  assert.equal(toPreOp.status, 'pre_op');

  const toInProgress = service.updateStatus(encounter.accountId, surgeryCase.id, {
    status: 'in_progress'
  });
  assert.equal(toInProgress.status, 'in_progress');
  assert.ok(toInProgress.startedAt);

  const toRecovery = service.updateStatus(encounter.accountId, surgeryCase.id, {
    status: 'recovery'
  });
  assert.equal(toRecovery.status, 'recovery');

  const completed = service.updateStatus(encounter.accountId, surgeryCase.id, {
    status: 'completed',
    operativeNotes: 'Procedimento sem intercorrencias'
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.operativeNotes, 'Procedimento sem intercorrencias');
  assert.ok(completed.endedAt);
});

test('SurgeryService getOrThrow rejects unknown case', () => {
  const { service, encounter } = createService();

  assert.throws(
    () => service.getOrThrow(encounter.accountId, 'surg_missing' as never),
    NotFoundError
  );
});

test('SurgeryService list filters by encounter', () => {
  const { service, encounter } = createService();
  service.requestCase(encounter.accountId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Biopsia',
    preparationNotes: 'Sem preparo especial'
  });

  assert.equal(service.list(encounter.accountId, encounter.id).length, 1);
  assert.equal(service.list(encounter.accountId, 'encounter_2').length, 0);
});

test('SurgeryService requestCase records surgical team', () => {
  const { service, encounter } = createService();

  const surgeryCase = service.requestCase(encounter.accountId, {
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

  const surgeryCase = service.requestCase(encounter.accountId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Ressecção'
  });

  service.updateStatus(encounter.accountId, surgeryCase.id, { status: 'pre_op' });
  service.updateStatus(encounter.accountId, surgeryCase.id, { status: 'in_progress' });
  service.updateStatus(encounter.accountId, surgeryCase.id, { status: 'recovery' });

  assert.throws(
    () => service.updateStatus(encounter.accountId, surgeryCase.id, { status: 'requested' }),
    /Invalid status transition/
  );
});

test('SurgeryService updateStatus allows cancellation from early states', () => {
  const { service, encounter } = createService();

  const surgeryCase = service.requestCase(encounter.accountId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Ressecção'
  });

  const cancelled = service.updateStatus(encounter.accountId, surgeryCase.id, {
    status: 'cancelled'
  });
  assert.equal(cancelled.status, 'cancelled');

  const preOpCase = service.requestCase(encounter.accountId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Ressecção2'
  });
  const cancelledFromPreOp = service.updateStatus(encounter.accountId, preOpCase.id, {
    status: 'pre_op'
  });
  const cancelledAfterPreOp = service.updateStatus(encounter.accountId, preOpCase.id, {
    status: 'cancelled'
  });
  assert.equal(cancelledAfterPreOp.status, 'cancelled');
});

test('SurgeryService rolls back in-memory creation when persistence fails', async () => {
  const { encounter } = createService();
  const service = new SurgeryService({ getOrThrow: () => encounter } as never, {
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
  });

  service.requestCase(encounter.accountId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Persisted surgery'
  });

  await assert.rejects(() => service.waitForPersistence(), /database unavailable/);
  assert.deepEqual(service.list(encounter.accountId), []);
});

test('SurgeryService requires account scope for every case boundary', () => {
  const { service, encounter } = createService();
  const otherAccountId = 'acc_other' as AccountId;

  const surgeryCase = service.requestCase(encounter.accountId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    procedureName: 'Cirurgia account-scoped'
  });

  assert.equal(service.list(encounter.accountId, encounter.id).length, 1);
  assert.deepEqual(service.list(otherAccountId), []);
  assert.throws(() => service.getOrThrow(otherAccountId, surgeryCase.id), NotFoundError);
  assert.throws(
    () => service.updateStatus(otherAccountId, surgeryCase.id, { status: 'pre_op' }),
    NotFoundError
  );
  assert.throws(
    () =>
      service.requestCase(otherAccountId, {
        encounterId: encounter.id,
        patientId: encounter.patientId,
        procedureName: 'Cross-account surgery'
      }),
    NotFoundError
  );
  assert.equal(service.getOrThrow(encounter.accountId, surgeryCase.id).status, 'requested');
});
