import assert from 'node:assert/strict';
import test from 'node:test';

import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { SchedulingService } from '@cvg-his-v2/module-scheduling';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import {
  createEncounterAccountGuard,
  createEncounterQueueSynchronizer,
  readHeader,
  validateRequestBody
} from './api-server-boundaries.js';

test('readHeader preserves the server header lookup contract', () => {
  const request = { headers: { authorization: 'Bearer token' } } as never;

  assert.equal(readHeader(request, 'authorization'), 'Bearer token');
  assert.equal(readHeader(request, 'missing'), undefined);
});

test('validateRequestBody preserves field-level error details and messages', () => {
  assert.throws(
    () =>
      validateRequestBody(
        { name: 42 },
        { name: { type: 'string', required: true } },
        'corr-boundary-test'
      ),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === "Field 'name' must be of type 'string', got 'number'" &&
      error.details &&
      typeof error.details === 'object' &&
      'field' in error.details &&
      error.details.field === 'name'
  );
});

test('encounter account guard preserves tenant-scoped lookup order', () => {
  const calls: unknown[][] = [];
  const encounters = {
    getOrThrow(accountId: never, encounterId: never) {
      calls.push([accountId, encounterId]);
      return { accountId: 'account-1' };
    }
  } as unknown as Pick<EncountersService, 'getOrThrow'>;

  const guard = createEncounterAccountGuard(encounters);
  assert.deepEqual(guard('encounter-1', 'account-1'), { accountId: 'account-1' });
  assert.deepEqual(calls, [['account-1', 'encounter-1']]);
});

test('encounter queue synchronizer preserves closed and active transitions', async () => {
  const actions: unknown[][] = [];
  const encounters = {
    getOrThrow() {
      return { accountId: 'account-1', queueEntryId: 'queue-1' };
    }
  } as unknown as Pick<EncountersService, 'getOrThrow'>;
  const scheduling = {
    async completeQueueEntry(queueEntryId: never) {
      actions.push(['complete', queueEntryId]);
      return undefined;
    },
    async transitionQueueForEncounter(queueEntryId: never, status: never) {
      actions.push(['transition', queueEntryId, status]);
      return undefined;
    }
  } as unknown as Pick<
    SchedulingService,
    'completeQueueEntry' | 'transitionQueueForEncounter'
  >;

  const sync = createEncounterQueueSynchronizer(encounters, scheduling);
  await sync('account-1', 'encounter-1', 'closed');
  await sync('account-1', 'encounter-1', 'in_care');

  assert.deepEqual(actions, [
    ['complete', 'queue-1'],
    ['transition', 'queue-1', 'in_care']
  ]);
});
