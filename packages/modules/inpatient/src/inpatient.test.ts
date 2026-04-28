import assert from 'node:assert/strict';
import test from 'node:test';

import { NotFoundError } from '@cvg-his-v2/shared-errors';

import { InpatientService, SectorBedService } from './index.js';

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

test('InpatientService list filters stays by patient across encounters', () => {
  const encounters = {
    getOrThrow(encounterId: string) {
      return {
        id: encounterId,
        accountId: 'acc_test',
        patientId: encounterId === 'encounter_2' ? 'patient_2' : 'patient_1'
      };
    }
  };
  const service = new InpatientService(encounters as never);

  service.admit({
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    unit: 'UTI',
    ward: 'Ala A',
    bed: 'B12'
  });
  service.admit({
    encounterId: 'encounter_2',
    patientId: 'patient_2',
    unit: 'Internacao',
    ward: 'Ala B',
    bed: 'B03'
  });
  const historicalStay = service.admit({
    encounterId: 'encounter_3',
    patientId: 'patient_1',
    unit: 'Internacao',
    ward: 'Ala C',
    bed: 'C01'
  });
  service.updateStatus(historicalStay.id, {
    status: 'discharged',
    dischargeReason: 'Alta clinica'
  });

  assert.deepEqual(
    service.list({ patientId: 'patient_1' }).map((stay) => stay.patientId),
    ['patient_1']
  );
  assert.equal(service.list({ patientId: 'patient_1' }).length, 1);
  assert.equal(service.list({ patientId: 'patient_1', includeDischarged: true }).length, 2);
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
    status: 'discharged',
    dischargeReason: 'Alta clinica'
  });

  assert.equal(updated.status, 'discharged');
  assert.equal(service.getOrThrow(stay.id).status, 'discharged');
});

test('InpatientService getOrThrow rejects unknown stay', () => {
  const { service } = createService();

  assert.throws(() => service.getOrThrow('stay_missing' as never), NotFoundError);
});

test('InpatientService updateStatus allows valid transitions', () => {
  const { service, encounter } = createService();

  const stay = service.admit({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    unit: 'UTI',
    ward: 'Ala A',
    bed: 'B12'
  });

  const toStable = service.updateStatus(stay.id, { status: 'stable' });
  assert.equal(toStable.status, 'stable');

  const toDischarged = service.updateStatus(stay.id, {
    status: 'discharged',
    dischargeReason: 'Alta a pedido'
  });
  assert.equal(toDischarged.status, 'discharged');
  assert.equal(toDischarged.dischargeReason, 'Alta a pedido');
  assert.ok(toDischarged.dischargedAt);
});

test('InpatientService updateStatus blocks invalid transitions', () => {
  const { service, encounter } = createService();

  const stay = service.admit({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    unit: 'UTI',
    ward: 'Ala A',
    bed: 'B12'
  });

  service.updateStatus(stay.id, {
    status: 'discharged',
    dischargeReason: 'Alta clinica'
  });


  assert.throws(
    () => service.updateStatus(stay.id, { status: 'admitted' }),
    /Invalid status transition/
  );
});

test('InpatientService updateStatus records transfer metadata', () => {
  const { service, encounter } = createService();

  const stay = service.admit({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    unit: 'UTI',
    ward: 'Ala A',
    bed: 'B12'
  });

  const transferred = service.updateStatus(stay.id, {
    status: 'transferred',
    transferToUnit: 'Enfermaria',
    transferToWard: 'Ala B'
  });

  assert.equal(transferred.status, 'transferred');
  assert.equal(transferred.transferToUnit, 'Enfermaria');
  assert.equal(transferred.transferToWard, 'Ala B');
});

test('InpatientService updateStatus requires discharge reason and transfer target', () => {
  const { service, encounter } = createService();

  const stay = service.admit({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    unit: 'UTI',
    ward: 'Ala A',
    bed: 'B12'
  });

  assert.throws(
    () => service.updateStatus(stay.id, { status: 'discharged' }),
    /dischargeReason is required/
  );

  assert.throws(
    () => service.updateStatus(stay.id, { status: 'transferred' }),
    /transfer target is required/
  );
});

test('InpatientService buildHandoverPreview summarizes latest progress and transfer attention', () => {
  const { service, encounter } = createService();
  const stay = service.admit({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    unit: 'UTI',
    ward: 'Ala A',
    bed: 'B12'
  });

  service.addProgress('doctor_1' as never, {
    stayId: stay.id,
    note: 'Pendente reavaliacao hemodinamica'
  });

  const preview = service.buildHandoverPreview({ ward: 'Ala A' });
  assert.equal(preview.totalActiveStays, 1);
  assert.equal(preview.items[0]?.stayId, stay.id);
  assert.equal(preview.items[0]?.latestProgressNote, 'Pendente reavaliacao hemodinamica');
  assert.equal(preview.items[0]?.requiresAttention, true);
});

test('SectorBedService buildBedMap reads only durable stay columns', async () => {
  const accountId = '65751ed5-07d3-44a2-830a-cc9dc8a0dbe4' as never;
  const sectorId = 'sec_uti' as never;
  const bedId = 'bed_uti_01' as never;
  let executedSql = '';
  const service = new SectorBedService({
    sectorRepository: {
      create: async () => {},
      findById: async () => null,
      findByAccountId: async () => [
        {
          id: sectorId,
          accountId,
          code: 'UTI',
          name: 'UTI',
          kind: 'icu',
          active: true,
          createdAt: '2026-04-28T00:00:00.000Z',
          updatedAt: '2026-04-28T00:00:00.000Z'
        }
      ]
    },
    bedRepository: {
      create: async () => {},
      update: async () => {},
      findById: async () => null,
      findBySectorId: async () => [],
      findByAccountId: async () => [
        {
          id: bedId,
          accountId,
          sectorId,
          code: 'UTI-01',
          name: 'Leito UTI 01',
          status: 'occupied',
          active: true,
          createdAt: '2026-04-28T00:00:00.000Z',
          updatedAt: '2026-04-28T00:00:00.000Z'
        }
      ],
      findByStatus: async () => []
    },
    databaseClient: {
      execute: async (query: { sql?: string }) => {
        executedSql = query.sql ?? '';
        return {
          rows: [
            {
              id: 'stay_1',
              patient_id: 'patient_1',
              encounter_id: 'encounter_1',
              bed_id: bedId,
              admitted_at: new Date('2026-04-28T06:00:00.000Z')
            }
          ]
        };
      }
    } as never
  });

  const bedMap = await service.buildBedMap(accountId);

  assert.equal(bedMap.occupiedBeds, 1);
  assert.equal(bedMap.items[0]?.beds[0]?.stayId, 'stay_1');
  assert.equal(bedMap.items[0]?.beds[0]?.patientId, 'patient_1');
  assert.equal(executedSql.includes('unit'), false);
  assert.equal(executedSql.includes('ward'), false);
});
