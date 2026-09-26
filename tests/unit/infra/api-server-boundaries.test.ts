import { describe, expect, it } from 'vitest';

import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { SchedulingService } from '@cvg-his-v2/module-scheduling';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import {
  createEncounterAccountGuard,
  createEncounterQueueSynchronizer,
  readHeader,
  validateRequestBody
} from '../../../apps/api/src/helpers/api-server-boundaries.js';

describe('api server composition boundaries', () => {
  it('keeps header and field validation contracts across optional and invalid inputs', () => {
    expect(readHeader({ headers: { authorization: 'Bearer token' } } as never, 'authorization')).toBe(
      'Bearer token'
    );
    expect(readHeader({ headers: { authorization: ['Bearer token'] } } as never, 'authorization')).toBe(
      undefined
    );
    expect(readHeader({ headers: {} } as never, 'missing')).toBeUndefined();

    expect(() =>
      validateRequestBody(
        { optional: undefined, nullable: null, name: 'Ana', code: 42, tags: [] },
        {
          optional: { type: 'string' },
          nullable: { type: 'string' },
          name: { type: 'string', required: true, minLength: 2, maxLength: 10 },
          code: { type: 'number' },
          tags: { type: 'array' }
        },
        'corr-boundary-valid'
      )
    ).not.toThrow();

    expect(() =>
      validateRequestBody(
        {},
        { required: { type: 'string', required: true } },
        'corr-required'
      )
    ).toThrow("Field 'required' is required");
    expect(() =>
      validateRequestBody(
        { required: null },
        { required: { type: 'string', required: true } },
        'corr-required-null'
      )
    ).toThrow(ValidationError);
    expect(() =>
      validateRequestBody(
        { name: 42 },
        { name: { type: 'string', required: true } },
        'corr-type'
      )
    ).toThrow("Field 'name' must be of type 'string', got 'number'");
    expect(() =>
      validateRequestBody(
        { name: [] },
        { name: { type: 'string', required: true } },
        'corr-array-type'
      )
    ).toThrow("Field 'name' must be of type 'string', got 'array'");
    expect(() =>
      validateRequestBody(
        { name: 'a' },
        { name: { type: 'string', minLength: 2 } },
        'corr-min'
      )
    ).toThrow("Field 'name' must have at least 2 characters");
    expect(() =>
      validateRequestBody(
        { name: 'synthetic-name-over-limit' },
        { name: { type: 'string', maxLength: 10 } },
        'corr-max'
      )
    ).toThrow("Field 'name' must have at most 10 characters");
    expect(() =>
      validateRequestBody(
        { status: 'unknown' },
        { status: { type: 'string', enum: ['active', 'closed'] } },
        'corr-enum'
      )
    ).toThrow("Field 'status' must be one of: active, closed");
    expect(() =>
      validateRequestBody(
        { status: 'active' },
        { status: { type: 'string', enum: ['active', 'closed'] } },
        'corr-enum-valid'
      )
    ).not.toThrow();
  });

  it('keeps the account-scoped encounter lookup order', () => {
    const calls: unknown[][] = [];
    const encounters = {
      getOrThrow(accountId: never, encounterId: never) {
        calls.push([accountId, encounterId]);
        return { accountId: 'account-1' };
      }
    } as unknown as Pick<EncountersService, 'getOrThrow'>;

    const guard = createEncounterAccountGuard(encounters);
    expect(guard('encounter-1', 'account-1')).toEqual({ accountId: 'account-1' });
    expect(calls).toEqual([['account-1', 'encounter-1']]);
  });

  it('keeps queue synchronization for absent, closed, reception and active states', async () => {
    const actions: unknown[][] = [];
    let queueEntryId: string | undefined = undefined;
    const encounters = {
      getOrThrow() {
        return { accountId: 'account-1', queueEntryId };
      }
    } as unknown as Pick<EncountersService, 'getOrThrow'>;
    const scheduling = {
      async completeQueueEntry(id: never) {
        actions.push(['complete', id]);
      },
      async transitionQueueForEncounter(id: never, status: never) {
        actions.push(['transition', id, status]);
      }
    } as unknown as Pick<
      SchedulingService,
      'completeQueueEntry' | 'transitionQueueForEncounter'
    >;

    const sync = createEncounterQueueSynchronizer(encounters, scheduling);
    await sync('account-1', 'encounter-1', 'reception');
    queueEntryId = 'queue-1';
    await sync('account-1', 'encounter-1', 'closed');
    await sync('account-1', 'encounter-1', 'reception');
    await sync('account-1', 'encounter-1', 'in_triage');
    await sync('account-1', 'encounter-1', 'in_care');
    await sync('account-1', 'encounter-1', 'observation');

    expect(actions).toEqual([
      ['complete', 'queue-1'],
      ['transition', 'queue-1', 'in_triage'],
      ['transition', 'queue-1', 'in_care'],
      ['transition', 'queue-1', 'observation']
    ]);
  });
});
