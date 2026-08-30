import assert from 'node:assert/strict';
import { test } from 'vitest';

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

test('InpatientService waits for atomic admission rollback before rejecting persistence', async () => {
  const encounter = {
    id: 'encounter_atomic',
    accountId: 'acc_test',
    patientId: 'patient_atomic',
    ownerId: 'owner_atomic',
    createdByUserId: 'user_atomic'
  };
  const service = new InpatientService({ getOrThrow: () => encounter } as never, {
    stayRepository: {
      create: async () => {},
      createWithBedOccupation: async () => {
        throw new Error('bed occupation failed');
      },
      update: async () => {},
      findById: async () => null,
      findByEncounterId: async () => [],
      findByAccountId: async () => []
    }
  });

  const stay = service.admit(
    {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      unit: 'UTI',
      ward: 'Ala A',
      bed: '01',
      bedId: 'bed_atomic'
    },
    encounter.accountId,
    encounter.createdByUserId as never
  );

  await assert.rejects(() => service.waitForPersistence(), /bed occupation failed/);
  assert.throws(() => service.getOrThrow(stay.id, encounter.accountId as never), NotFoundError);
  assert.equal(service.list({ encounterId: encounter.id, includeDischarged: true }).length, 0);
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
  service.updateStatus(
    historicalStay.id,
    {
      status: 'discharged',
      dischargeReason: 'Alta clinica'
    },
    historicalStay.accountId
  );

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

  const progress = service.addProgress(
    'doctor_1' as never,
    {
      stayId: stay.id,
      note: 'Paciente estavel'
    },
    stay.accountId
  );

  assert.equal(progress.stayId, stay.id);
  assert.equal(service.listProgress(stay.id, stay.accountId).length, 1);
  assert.equal(service.listProgress(stay.id, stay.accountId)[0].authoredByUserId, 'doctor_1');
});

test('InpatientService records structured inpatient occurrence for operational handover', () => {
  const { service, encounter } = createService();
  const stay = service.admit({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    unit: 'Internacao',
    ward: 'Ala B',
    bed: 'B03'
  });

  const occurrence = service.addOccurrence(
    'nurse_1' as never,
    {
      stayId: stay.id,
      type: 'clinical',
      severity: 'attention',
      title: 'Hiporexia no plantao',
      description: 'Paciente recusou dieta umida e precisa de reavaliacao nutricional.'
    },
    stay.accountId
  );

  assert.equal(occurrence.stayId, stay.id);
  assert.equal(occurrence.type, 'clinical');
  assert.equal(occurrence.severity, 'attention');
  assert.equal(occurrence.authoredByUserId, 'nurse_1');
  assert.equal(
    service.listOccurrences(stay.id, stay.accountId)[0]?.title,
    'Hiporexia no plantao'
  );
});

test('InpatientService manages daily charge lifecycle for inpatient billing', () => {
  const { service, encounter } = createService();
  const stay = service.admit({
    encounterId: encounter.id,
    patientId: encounter.patientId,
    unit: 'UTI',
    ward: 'Ala A',
    bed: 'B12'
  });

  const charge = service.createDailyCharge(
    'admin_1' as never,
    {
      stayId: stay.id,
      description: 'Diaria UTI',
      chargeDate: '2026-05-28',
      quantity: 2,
      unitAmount: 180
    },
    stay.accountId
  );

  assert.equal(charge.totalAmount, 360);
  assert.equal(charge.status, 'pending');
  assert.equal(service.listDailyCharges(stay.id, stay.accountId).length, 1);

  const billed = service.markDailyChargeBilled(
    stay.id,
    charge.id,
    {
      billingRecordId: 'bill_1'
    },
    stay.accountId
  );

  assert.equal(billed.status, 'billed');
  assert.equal(billed.billingRecordId, 'bill_1');

  const replayed = service.markDailyChargeBilled(stay.id, charge.id, undefined, stay.accountId);
  assert.deepEqual(replayed, billed);
});

test('InpatientService lists daily charge worklist filtered by status and ward', () => {
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
  const firstStay = service.admit({
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    unit: 'UTI',
    ward: 'Ala A',
    bed: 'B12'
  });
  const secondStay = service.admit({
    encounterId: 'encounter_2',
    patientId: 'patient_2',
    unit: 'Internacao',
    ward: 'Ala B',
    bed: 'B03'
  });
  const billed = service.createDailyCharge(
    'admin_1' as never,
    {
      stayId: firstStay.id,
      description: 'Diaria UTI',
      chargeDate: '2026-05-27',
      quantity: 1,
      unitAmount: 180
    },
    firstStay.accountId
  );
  service.markDailyChargeBilled(firstStay.id, billed.id, { billingRecordId: 'bill_1' }, firstStay.accountId);
  service.createDailyCharge(
    'admin_1' as never,
    {
      stayId: secondStay.id,
      description: 'Diaria internacao',
      chargeDate: '2026-05-28',
      quantity: 2,
      unitAmount: 120
    },
    secondStay.accountId
  );

  const pending = service.listDailyChargeWorklist({ status: 'pending' });
  assert.equal(pending.length, 1);
  assert.equal(pending[0]?.ward, 'Ala B');
  assert.equal(pending[0]?.totalAmount, 240);

  const alaA = service.listDailyChargeWorklist({ ward: 'Ala A' });
  assert.equal(alaA.length, 1);
  assert.equal(alaA[0]?.status, 'billed');
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

  const updated = service.updateStatus(
    stay.id,
    {
      status: 'discharged',
      dischargeReason: 'Alta clinica'
    },
    stay.accountId
  );

  assert.equal(updated.status, 'discharged');
  assert.equal(service.getOrThrow(stay.id, stay.accountId).status, 'discharged');
});

test('InpatientService getOrThrow rejects unknown stay', () => {
  const { service } = createService();

  assert.throws(
    () => service.getOrThrow('stay_missing' as never, 'acc_test' as never),
    NotFoundError
  );
});

test('InpatientService rejects foreign-account stay operations at the domain boundary', () => {
  const accountA = 'acc_inpatient_a';
  const accountB = 'acc_inpatient_b';
  const encounters = {
    getOrThrow(encounterId: string) {
      return {
        id: encounterId,
        accountId: encounterId === 'encounter_b' ? accountB : accountA,
        patientId: `${encounterId}_patient`
      };
    }
  };
  const service = new InpatientService(encounters as never);
  const foreignStay = service.admit({
    encounterId: 'encounter_b',
    patientId: 'encounter_b_patient',
    unit: 'Internacao',
    ward: 'Ala B',
    bed: 'B-01'
  });

  assert.throws(
    () => service.getOrThrow(foreignStay.id, accountA as never),
    NotFoundError
  );
  assert.throws(
    () => service.listProgress(foreignStay.id, accountA as never),
    NotFoundError
  );
  assert.throws(
    () =>
      service.updateStatus(
        foreignStay.id,
        { status: 'stable' },
        accountA as never
      ),
    NotFoundError
  );
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

  const toStable = service.updateStatus(stay.id, { status: 'stable' }, stay.accountId);
  assert.equal(toStable.status, 'stable');

  const toDischarged = service.updateStatus(
    stay.id,
    {
      status: 'discharged',
      dischargeReason: 'Alta a pedido'
    },
    stay.accountId
  );
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

  service.updateStatus(
    stay.id,
    {
      status: 'discharged',
      dischargeReason: 'Alta clinica'
    },
    stay.accountId
  );

  assert.throws(
    () => service.updateStatus(stay.id, { status: 'admitted' }, stay.accountId),
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

  const transferred = service.updateStatus(
    stay.id,
    {
      status: 'transferred',
      transferToUnit: 'Enfermaria',
      transferToWard: 'Ala B'
    },
    stay.accountId
  );

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
    () => service.updateStatus(stay.id, { status: 'discharged' }, stay.accountId),
    /dischargeReason is required/
  );

  assert.throws(
    () => service.updateStatus(stay.id, { status: 'transferred' }, stay.accountId),
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

  service.addProgress(
    'doctor_1' as never,
    {
      stayId: stay.id,
      note: 'Pendente reavaliacao hemodinamica'
    },
    stay.accountId
  );

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

test('SectorBedService keeps an in-memory sector and bed lifecycle usable', async () => {
  const service = new SectorBedService();
  const accountId = 'acc_test' as never;

  const sector = await service.createSector(accountId, {
    code: 'OBS-E2E',
    name: 'Observação',
    kind: 'observation'
  });
  const bed = await service.createBed(accountId, {
    sectorId: sector.id,
    code: 'OBS-01',
    name: 'Leito de observação',
    supportsSpecies: 'feline'
  });

  assert.equal((await service.listSectors(accountId)).length, 1);
  assert.equal((await service.listBeds(accountId, sector.id)).length, 1);
  assert.equal((await service.getBedForAccountOrThrow(accountId, bed.id)).status, 'available');

  await service.setBedOccupied(accountId, bed.id);
  assert.equal((await service.getBedForAccountOrThrow(accountId, bed.id)).status, 'occupied');
});

test('SectorBedService rejects foreign sectors from account-scoped bed reads and creation', async () => {
  const service = new SectorBedService();
  const accountA = 'acc_sector_a' as never;
  const accountB = 'acc_sector_b' as never;
  const sectorB = await service.createSector(accountB, {
    code: 'B-OBS',
    name: 'Observação B',
    kind: 'observation'
  });
  const bedB = await service.createBed(accountB, {
    sectorId: sectorB.id,
    code: 'B-01',
    name: 'Leito B 01'
  });

  assert.deepEqual(await service.listBeds(accountA, sectorB.id), []);
  await assert.rejects(
    service.createBed(accountA, {
      sectorId: sectorB.id,
      code: 'A-FOREIGN',
      name: 'Leito indevido'
    }),
    /Sector not found/
  );
  assert.equal((await service.listBeds(accountB, sectorB.id))[0]?.id, bedB.id);
});
