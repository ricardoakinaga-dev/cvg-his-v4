import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { SurgeryCaseSummary } from '@cvg-his-v2/shared-types';

import { SurgeryService } from './index.js';

const persistedCase = {
  id: '79a4314e-e53f-417c-96b5-82657e2de5a0',
  accountId: '7b76182d-f590-48b0-81f2-dd9d4141b678',
  encounterId: 'aab7d340-f137-4557-9587-e4e6e453ae5d',
  patientId: 'df493fa6-af0b-4ef4-ab3e-dd873a3be548',
  procedureName: 'Ovariohisterectomia',
  status: 'recovery',
  operativeNotes: 'Procedimento sem intercorrencias.',
  createdAt: '2026-07-11T10:00:00.000Z',
  updatedAt: '2026-07-11T11:00:00.000Z'
} as SurgeryCaseSummary;

test('SurgeryService hydrates durable cases after an API restart', async () => {
  let writes = 0;
  const service = new SurgeryService({ getOrThrow: () => undefined } as never, {
    surgeryCaseRepository: {
      create: async () => {
        writes += 1;
      },
      update: async () => {
        writes += 1;
      },
      findById: async () => persistedCase,
      findByEncounterId: async () => [persistedCase],
      findByAccountId: async (accountId: string) =>
        accountId === persistedCase.accountId ? [persistedCase] : []
    } as never
  });

  await service.hydrateAccount(persistedCase.accountId);

  assert.deepEqual(service.list(persistedCase.accountId), [persistedCase]);
  assert.equal(service.getOrThrow(persistedCase.accountId, persistedCase.id), persistedCase);
  assert.equal(writes, 0, 'Hydration must never reinsert already durable rows');
});
