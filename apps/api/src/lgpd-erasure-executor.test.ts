import assert from 'node:assert/strict';
import test from 'node:test';

import { createLgpdErasureExecutor, OWNER_ERASURE_RETAINED } from './lgpd-erasure-executor.js';

const context = {
  accountId: '00000000-0000-4000-8000-000000000001',
  subjectId: 'owner-1',
  requestId: 'dsr-1',
  requestType: 'data_deletion' as const,
  retentionEvidence: []
};

test('owner erasure removes contact data and retains legally required records with a reason', async () => {
  const calls: Array<[string, string]> = [];
  const executor = createLgpdErasureExecutor({
    eraseContactAndProfileData: async (accountId, ownerId) => {
      calls.push([accountId, ownerId]);
      return { erasedFields: ['contacts', 'profile', 'administrativeNotes'] };
    }
  });

  const evidence = await executor({ ...context, subjectType: 'owner' });

  assert.deepEqual(calls, [[context.accountId, 'owner-1']]);
  assert.deepEqual(evidence.erasedDataTypes, [
    'owner_contacts',
    'owner_profile',
    'owner_administrative_notes'
  ]);
  assert.deepEqual(evidence.retainedDataTypes, [...OWNER_ERASURE_RETAINED]);
  assert.ok(evidence.retainedDataTypes.every((item) => item.reason.length > 20));
});

test('patient requests erase nothing and explain that the animal is not a data subject', async () => {
  let called = false;
  const executor = createLgpdErasureExecutor({
    eraseContactAndProfileData: async () => {
      called = true;
      return { erasedFields: [] };
    }
  });

  const evidence = await executor({ ...context, subjectType: 'patient' });

  assert.equal(called, false);
  assert.deepEqual(evidence.erasedDataTypes, []);
  assert.match(evidence.retainedDataTypes[0]?.reason ?? '', /não é titular/);
});

test('system user requests are refused so the request stays open', async () => {
  const executor = createLgpdErasureExecutor({
    eraseContactAndProfileData: async () => ({ erasedFields: [] })
  });

  await assert.rejects(
    () => executor({ ...context, subjectType: 'user' }),
    (error: { code?: string }) => error.code === 'DSR_ERASURE_NOT_EXECUTED'
  );
});
