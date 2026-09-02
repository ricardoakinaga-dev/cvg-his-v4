import assert from 'node:assert/strict';
import { test } from 'vitest';
import { NotFoundError } from '@cvg-his-v2/shared-errors';

import type {
  AccountId,
  InpatientDailyChargeSummary,
  InpatientOccurrenceSummary,
  InpatientProgressSummary,
  InpatientStaySummary
} from '@cvg-his-v2/shared-types';

import { InpatientService } from './index.js';

const ACCOUNT_A = 'account-inpatient-a' as AccountId;
const ACCOUNT_B = 'account-inpatient-b' as AccountId;

const stayA = {
  id: 'stay-inpatient-a',
  accountId: ACCOUNT_A,
  encounterId: 'encounter-inpatient-a',
  patientId: 'patient-inpatient-a',
  ownerId: 'owner-inpatient-a',
  admittedByUserId: 'user-inpatient-a',
  unit: 'UTI',
  ward: 'Ala A',
  bed: 'A-01',
  status: 'admitted',
  admittedAt: '2026-08-31T10:00:00.000Z',
  updatedAt: '2026-08-31T10:00:00.000Z'
} as InpatientStaySummary;

const stayB = {
  ...stayA,
  id: 'stay-inpatient-b',
  accountId: ACCOUNT_B,
  encounterId: 'encounter-inpatient-b',
  patientId: 'patient-inpatient-b',
  ownerId: 'owner-inpatient-b',
  admittedByUserId: 'user-inpatient-b',
  ward: 'Ala B',
  bed: 'B-01'
} as InpatientStaySummary;

const progressA = {
  id: 'progress-inpatient-a',
  accountId: ACCOUNT_A,
  stayId: stayA.id,
  encounterId: stayA.encounterId,
  note: 'Paciente A estável.',
  authoredByUserId: stayA.admittedByUserId,
  createdAt: '2026-08-31T10:10:00.000Z'
} as InpatientProgressSummary;

const progressB = {
  ...progressA,
  id: 'progress-inpatient-b',
  accountId: ACCOUNT_B,
  stayId: stayB.id,
  encounterId: stayB.encounterId,
  note: 'Paciente B estável.',
  authoredByUserId: stayB.admittedByUserId
} as InpatientProgressSummary;

const progressWrongStay = {
  ...progressA,
  id: 'progress-inpatient-wrong-stay',
  stayId: 'stay-inpatient-other',
  note: 'Registro de outro aggregate.'
} as InpatientProgressSummary;

const occurrenceA = {
  id: 'occurrence-inpatient-a',
  accountId: ACCOUNT_A,
  stayId: stayA.id,
  encounterId: stayA.encounterId,
  type: 'nursing',
  severity: 'info',
  title: 'Observação A',
  description: 'Observação pertencente ao tenant A.',
  authoredByUserId: stayA.admittedByUserId,
  createdAt: '2026-08-31T10:20:00.000Z'
} as InpatientOccurrenceSummary;

const occurrenceB = {
  ...occurrenceA,
  id: 'occurrence-inpatient-b',
  accountId: ACCOUNT_B,
  stayId: stayB.id,
  encounterId: stayB.encounterId,
  title: 'Observação B',
  description: 'Observação pertencente ao tenant B.'
} as InpatientOccurrenceSummary;

const chargeA = {
  id: 'charge-inpatient-a',
  accountId: ACCOUNT_A,
  stayId: stayA.id,
  encounterId: stayA.encounterId,
  patientId: stayA.patientId,
  description: 'Diária A',
  chargeDate: '2026-08-31',
  quantity: 1,
  unitAmount: 100,
  totalAmount: 100,
  status: 'pending',
  createdByUserId: stayA.admittedByUserId,
  createdAt: '2026-08-31T10:30:00.000Z',
  updatedAt: '2026-08-31T10:30:00.000Z'
} as InpatientDailyChargeSummary;

const chargeB = {
  ...chargeA,
  id: 'charge-inpatient-b',
  accountId: ACCOUNT_B,
  stayId: stayB.id,
  encounterId: stayB.encounterId,
  patientId: stayB.patientId,
  description: 'Diária B'
} as InpatientDailyChargeSummary;

test('InpatientService filters contaminated aggregate and child rows during hydrate and refresh', async () => {
  const contaminatedStays = [stayA, stayB];
  const contaminatedProgress = [progressA, progressB, progressWrongStay];
  const contaminatedOccurrences = [occurrenceA, occurrenceB];
  const contaminatedCharges = [chargeA, chargeB];
  const service = new InpatientService({} as never, {
    stayRepository: {
      create: async () => {},
      update: async () => {},
      findById: async () => null,
      findByEncounterId: async () => contaminatedStays,
      findByAccountId: async () => contaminatedStays
    },
    progressRepository: {
      create: async () => {},
      findByStayId: async () => contaminatedProgress
    },
    occurrenceRepository: {
      create: async () => {},
      findByStayId: async () => contaminatedOccurrences
    },
    dailyChargeRepository: {
      create: async () => {},
      update: async () => {},
      findByStayId: async () => contaminatedCharges
    }
  });
  await service.hydrateAccount(ACCOUNT_A);
  await service.hydrateAccount(ACCOUNT_B);
  await service.refreshAccount(ACCOUNT_A);

  assert.deepEqual(
    service.list(ACCOUNT_A, { includeDischarged: true }).map((item) => item.id),
    [stayA.id]
  );
  assert.deepEqual(
    service.list(ACCOUNT_B, { includeDischarged: true }).map((item) => item.id),
    [stayB.id]
  );
  assert.deepEqual(
    service.listProgress(stayA.id, ACCOUNT_A).map((item) => item.id),
    [progressA.id]
  );
  assert.deepEqual(
    service.listProgress(stayB.id, ACCOUNT_B).map((item) => item.id),
    [progressB.id]
  );
  assert.deepEqual(
    service.listOccurrences(stayA.id, ACCOUNT_A).map((item) => item.id),
    [occurrenceA.id]
  );
  assert.deepEqual(
    service.listOccurrences(stayB.id, ACCOUNT_B).map((item) => item.id),
    [occurrenceB.id]
  );
  assert.deepEqual(
    service.listDailyCharges(stayA.id, ACCOUNT_A).map((item) => item.id),
    [chargeA.id]
  );
  assert.deepEqual(
    service.listDailyCharges(stayB.id, ACCOUNT_B).map((item) => item.id),
    [chargeB.id]
  );
});

test('InpatientService scopes worklists and handover previews to the explicit tenant', () => {
  const encounters = {
    getOrThrow(_accountId: AccountId, encounterId: string) {
      return encounterId === stayB.encounterId ? stayB : stayA;
    }
  };
  const service = new InpatientService(encounters as never);
  const first = service.admit(
    {
      encounterId: stayA.encounterId,
      patientId: stayA.patientId,
      unit: stayA.unit,
      ward: stayA.ward,
      bed: stayA.bed
    },
    ACCOUNT_A
  );
  const second = service.admit(
    {
      encounterId: stayB.encounterId,
      patientId: stayB.patientId,
      unit: stayB.unit,
      ward: stayB.ward,
      bed: stayB.bed
    },
    ACCOUNT_B
  );
  service.createDailyCharge(
    'user-a' as never,
    {
      stayId: first.id,
      description: 'Diária A',
      unitAmount: 100
    },
    ACCOUNT_A
  );
  service.createDailyCharge(
    'user-b' as never,
    {
      stayId: second.id,
      description: 'Diária B',
      unitAmount: 200
    },
    ACCOUNT_B
  );

  assert.deepEqual(
    service.listDailyChargeWorklist(ACCOUNT_A).map((item) => item.accountId),
    [ACCOUNT_A]
  );
  assert.deepEqual(
    service.listDailyChargeWorklist(ACCOUNT_B).map((item) => item.accountId),
    [ACCOUNT_B]
  );
  assert.deepEqual(
    service.buildHandoverPreview(ACCOUNT_A).items.map((item) => item.stayId),
    [first.id]
  );
  assert.deepEqual(
    service.buildHandoverPreview(ACCOUNT_B).items.map((item) => item.stayId),
    [second.id]
  );
});

test('InpatientService scopes cache restoration and filters contaminated child snapshots', () => {
  const service = new InpatientService({} as never);
  service.restoreStayCache(ACCOUNT_A, stayA);
  service.restoreProgressCache(ACCOUNT_A, stayA.id, [progressA, progressB, progressWrongStay]);
  service.restoreOccurrencesCache(ACCOUNT_A, stayA.id, [occurrenceA, occurrenceB]);
  service.restoreDailyChargesCache(ACCOUNT_A, stayA.id, [chargeA, chargeB]);

  assert.deepEqual(
    service.listProgress(stayA.id, ACCOUNT_A).map((item) => item.id),
    [progressA.id]
  );
  assert.deepEqual(
    service.listOccurrences(stayA.id, ACCOUNT_A).map((item) => item.id),
    [occurrenceA.id]
  );
  assert.deepEqual(
    service.listDailyCharges(stayA.id, ACCOUNT_A).map((item) => item.id),
    [chargeA.id]
  );
  assert.throws(() => service.restoreStayCache(ACCOUNT_A, stayB), /account|tenant/i);
});

test('InpatientService refuses to bill a daily charge whose aggregate linkage is contaminated', () => {
  const service = new InpatientService({
    getOrThrow: () => stayA
  } as never);
  const admitted = service.admit(
    {
      encounterId: stayA.encounterId,
      patientId: stayA.patientId,
      unit: stayA.unit,
      ward: stayA.ward,
      bed: stayA.bed
    },
    ACCOUNT_A
  );
  const charge = service.createDailyCharge(
    'user-inpatient-a' as never,
    {
      stayId: admitted.id,
      description: 'Diária com vínculo contaminado',
      unitAmount: 100
    },
    ACCOUNT_A
  );

  Object.assign(admitted, { patientId: 'patient-contaminated' as never });

  assert.throws(
    () => service.markDailyChargeBilled(admitted.id, charge.id, undefined, ACCOUNT_A),
    NotFoundError
  );
  Object.assign(admitted, { patientId: stayA.patientId });
  assert.equal(service.listDailyCharges(admitted.id, ACCOUNT_A)[0]?.status, 'pending');
});

test('InpatientService validates the target sector before changing bed occupancy', async () => {
  const runCase = async (operation: 'assign' | 'transfer') => {
    const occupiedBedIds: string[] = [];
    const availableBedIds: string[] = [];
    const sectorBedService = {
      getBedOrThrow: async () => ({
        id: 'bed-target' as never,
        accountId: ACCOUNT_A,
        sectorId: 'sector-target' as never,
        code: 'B-02',
        name: 'Leito B-02',
        status: 'available' as const,
        active: true,
        createdAt: '2026-08-31T10:00:00.000Z',
        updatedAt: '2026-08-31T10:00:00.000Z'
      }),
      getSectorOrThrow: async () => {
        throw new NotFoundError('Sector disappeared');
      },
      setBedOccupied: async (_accountId: AccountId, bedId: string) => {
        occupiedBedIds.push(bedId);
      },
      setBedAvailable: async (_accountId: AccountId, bedId: string) => {
        availableBedIds.push(bedId);
      }
    };
    const service = new InpatientService({ getOrThrow: () => stayA } as never, {
      sectorBedService: sectorBedService as never
    });
    const admitted = service.admit(
      {
        encounterId: stayA.encounterId,
        patientId: stayA.patientId,
        unit: stayA.unit,
        ward: stayA.ward,
        bed: stayA.bed
      },
      ACCOUNT_A
    );

    await assert.rejects(
      () =>
        operation === 'assign'
          ? service.assignBed(
              admitted.id,
              { sectorId: 'sector-target', bedId: 'bed-target' },
              ACCOUNT_A
            )
          : service.transferBed(
              admitted.id,
              { sectorId: 'sector-target', bedId: 'bed-target' },
              ACCOUNT_A
            ),
      NotFoundError
    );
    assert.deepEqual(occupiedBedIds, []);
    assert.deepEqual(availableBedIds, []);
  };

  await runCase('assign');
  await runCase('transfer');
});
