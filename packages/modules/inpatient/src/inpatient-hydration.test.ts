import assert from 'node:assert/strict';
import { test } from 'vitest';

import type {
  InpatientDailyChargeSummary,
  InpatientOccurrenceSummary,
  InpatientProgressSummary,
  InpatientStaySummary
} from '@cvg-his-v2/shared-types';

import { InpatientService } from './index.js';

const stay = {
  id: '0f33db23-efb9-4372-a5ce-5b463490dfec',
  accountId: '69d1b378-c46f-4aa8-a72d-b21e1a81b20d',
  encounterId: 'daf1ad1d-ca7b-4923-a260-60f49bf564fe',
  patientId: 'ba36b7cb-bdd8-4620-aad4-3811c7939359',
  unit: 'Internacao',
  ward: 'Ala A',
  bed: 'A-01',
  status: 'admitted',
  admittedAt: '2026-07-11T12:00:00.000Z',
  updatedAt: '2026-07-11T12:00:00.000Z'
} as InpatientStaySummary;

const progress = {
  id: '50b86a8d-ecc1-48ef-9cdc-c9a65c221427',
  accountId: stay.accountId,
  stayId: stay.id,
  encounterId: stay.encounterId,
  note: 'Paciente hidratado e estavel.',
  authoredByUserId: '8de186f5-ab18-4167-84bd-53073def6552',
  createdAt: '2026-07-11T12:30:00.000Z'
} as InpatientProgressSummary;

const occurrence = {
  id: '44c966b2-585c-4dca-87b3-53074b21517c',
  accountId: stay.accountId,
  stayId: stay.id,
  encounterId: stay.encounterId,
  type: 'nursing',
  severity: 'attention',
  title: 'Acesso venoso',
  description: 'Acesso venoso reavaliado.',
  authoredByUserId: progress.authoredByUserId,
  createdAt: '2026-07-11T12:40:00.000Z'
} as InpatientOccurrenceSummary;

const charge = {
  id: 'd6182273-cfeb-494c-b860-4c8d59ecf463',
  accountId: stay.accountId,
  stayId: stay.id,
  encounterId: stay.encounterId,
  patientId: stay.patientId,
  description: 'Diaria de internacao',
  chargeDate: '2026-07-11',
  quantity: 1,
  unitAmount: 150,
  totalAmount: 150,
  status: 'pending',
  createdByUserId: progress.authoredByUserId,
  createdAt: '2026-07-11T12:45:00.000Z',
  updatedAt: '2026-07-11T12:45:00.000Z'
} as InpatientDailyChargeSummary;

test('InpatientService hydrates durable stay aggregate after an API restart', async () => {
  let writes = 0;
  const service = new InpatientService({ getOrThrow: () => undefined } as never, {
    stayRepository: {
      create: async () => { writes += 1; },
      update: async () => { writes += 1; },
      findById: async () => stay,
      findByEncounterId: async () => [stay],
      findByAccountId: async (accountId: string) => accountId === stay.accountId ? [stay] : []
    } as never,
    progressRepository: {
      create: async () => { writes += 1; },
      findByStayId: async () => [progress]
    },
    occurrenceRepository: {
      create: async () => { writes += 1; },
      findByStayId: async () => [occurrence]
    },
    dailyChargeRepository: {
      create: async () => { writes += 1; },
      update: async () => { writes += 1; },
      findByStayId: async () => [charge]
    }
  });

  await service.hydrateAccount(stay.accountId);

  assert.deepEqual(service.list({ accountId: stay.accountId }), [stay]);
  assert.deepEqual(service.listProgress(stay.id), [progress]);
  assert.deepEqual(service.listOccurrences(stay.id), [occurrence]);
  assert.deepEqual(service.listDailyCharges(stay.id), [charge]);
  assert.equal(writes, 0, 'Hydration must never reinsert already durable rows');
});
