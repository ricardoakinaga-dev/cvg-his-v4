import assert from 'node:assert/strict';
import { test } from 'vitest';

import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  EncounterId,
  EncounterSummary,
  EncounterTimelineEventSummary,
  UserId
} from '@cvg-his-v2/shared-types';

import {
  EncountersService,
  type EncounterRepository,
  type EncounterTimelineRepository
} from './index.js';

const ACCOUNT_A = '00000000-0000-4000-8000-000000000001' as AccountId;
const ACCOUNT_B = '00000000-0000-4000-8000-000000000002' as AccountId;
const ENCOUNTER_A = '00000000-0000-4000-8000-000000000011' as EncounterId;
const ENCOUNTER_B = '00000000-0000-4000-8000-000000000012' as EncounterId;
const USER_ID = '00000000-0000-4000-8000-000000000021' as UserId;

type ScopedEncounterApi = {
  readonly listActive: (accountId: AccountId) => readonly EncounterSummary[];
  readonly listAll: (accountId: AccountId) => readonly EncounterSummary[];
  readonly getOrThrow: (accountId: AccountId, encounterId: EncounterId) => EncounterSummary;
  readonly snapshotState: (accountId: AccountId, encounterId: EncounterId) => unknown;
  readonly transitionEncounter: (
    accountId: AccountId,
    encounterId: EncounterId,
    actorUserId: UserId,
    payload: { readonly nextStatus: EncounterSummary['status'] }
  ) => EncounterSummary;
  readonly closeEncounter: (
    accountId: AccountId,
    encounterId: EncounterId,
    actorUserId: UserId,
    payload: { readonly closeReason: string }
  ) => EncounterSummary;
  readonly deleteEncounter: (accountId: AccountId, encounterId: EncounterId) => void;
  readonly listTimeline: (
    accountId: AccountId,
    encounterId: EncounterId
  ) => readonly EncounterTimelineEventSummary[];
  readonly listTimelineAsync: (
    accountId: AccountId,
    encounterId: EncounterId
  ) => Promise<readonly EncounterTimelineEventSummary[]>;
  readonly appendTimeline: (
    accountId: AccountId,
    encounterId: EncounterId,
    input: Omit<EncounterTimelineEventSummary, 'id' | 'encounterId' | 'occurredAt'>
  ) => EncounterTimelineEventSummary;
};

function encounter(accountId: AccountId, id: EncounterId): EncounterSummary {
  return {
    id,
    accountId,
    patientId: `patient-${accountId}` as never,
    ownerId: `owner-${accountId}` as never,
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'tenant boundary contract',
    status: 'reception',
    openedAt: '2026-08-31T10:00:00.000Z',
    createdByUserId: USER_ID,
    updatedAt: '2026-08-31T10:00:00.000Z'
  };
}

function timelineEvent(
  accountId: AccountId,
  encounterId: EncounterId,
  id: string
): EncounterTimelineEventSummary {
  return {
    id: id as never,
    accountId,
    encounterId,
    eventType: 'encounter_opened',
    summary: `event for ${accountId}`,
    actorUserId: USER_ID,
    occurredAt: '2026-08-31T10:00:00.000Z'
  };
}

function createFixture(
  options: {
    readonly updateError?: Error;
    readonly timelineError?: Error;
    readonly onStatusChanged?: (
      encounter: EncounterSummary,
      previousStatus: EncounterSummary['status']
    ) => Promise<void>;
  } = {}
): {
  readonly encounters: EncountersService;
  readonly scoped: ScopedEncounterApi;
  readonly encounterA: EncounterSummary;
  readonly encounterB: EncounterSummary;
  readonly eventA: EncounterTimelineEventSummary;
  readonly eventB: EncounterTimelineEventSummary;
  readonly calls: { updates: number; deletes: number; timelineCreates: number };
} {
  const encounterA = encounter(ACCOUNT_A, ENCOUNTER_A);
  const encounterB = encounter(ACCOUNT_B, ENCOUNTER_B);
  const eventA = timelineEvent(ACCOUNT_A, ENCOUNTER_A, 'evt-tenant-a');
  const eventB = timelineEvent(ACCOUNT_B, ENCOUNTER_B, 'evt-tenant-b');
  const calls = { updates: 0, deletes: 0, timelineCreates: 0 };

  const encounterRepository: EncounterRepository = {
    create: async () => undefined,
    update: async () => {
      calls.updates += 1;
      if (options.updateError) {
        throw options.updateError;
      }
    },
    findById: async (id) =>
      id === ENCOUNTER_A ? encounterA : id === ENCOUNTER_B ? encounterB : null,
    findActiveByPatientId: async () => null,
    findAll: async () => [encounterA, encounterB],
    findActive: async () => [encounterA, encounterB],
    delete: async () => {
      calls.deletes += 1;
    }
  };
  const timelineRepository: EncounterTimelineRepository = {
    create: async () => {
      calls.timelineCreates += 1;
      if (options.timelineError) {
        throw options.timelineError;
      }
    },
    findByEncounterId: async () => [eventA, eventB]
  };
  const owners = new OwnersService({ seedOwners: [] });
  const patients = new PatientsService({ owners, seedPatients: [], seedLinks: [] });
  const encounters = new EncountersService({
    owners,
    patients,
    encounterRepository,
    encounterTimelineRepository: timelineRepository,
    onEncounterStatusChanged: options.onStatusChanged
  });

  return {
    encounters,
    scoped: encounters as unknown as ScopedEncounterApi,
    encounterA,
    encounterB,
    eventA,
    eventB,
    calls
  };
}

test('EncountersService scopes contaminated cache hydration, collections, detail and timeline', async () => {
  const { encounters, scoped, encounterA, encounterB, eventA, eventB } = createFixture();

  await encounters.hydrateFromDatabase(ACCOUNT_A);
  await encounters.hydrateFromDatabase(ACCOUNT_B);

  assert.deepEqual(scoped.listAll(ACCOUNT_A), [encounterA]);
  assert.deepEqual(scoped.listActive(ACCOUNT_A), [encounterA]);
  assert.deepEqual(scoped.listAll(ACCOUNT_B), [encounterB]);
  assert.equal(scoped.getOrThrow(ACCOUNT_A, ENCOUNTER_A), encounterA);
  assert.equal(scoped.getOrThrow(ACCOUNT_B, ENCOUNTER_B), encounterB);
  assert.deepEqual(scoped.listTimeline(ACCOUNT_A, ENCOUNTER_A), [eventA]);
  assert.deepEqual(scoped.listTimeline(ACCOUNT_B, ENCOUNTER_B), [eventB]);
});

test('EncountersService denies foreign encounter lifecycle and timeline operations without side effects', async () => {
  const { encounters, scoped, encounterA, calls } = createFixture();

  await encounters.hydrateFromDatabase(ACCOUNT_A);

  const foreignOperations = [
    () => scoped.getOrThrow(ACCOUNT_A, ENCOUNTER_B),
    () => scoped.snapshotState(ACCOUNT_A, ENCOUNTER_B),
    () => scoped.transitionEncounter(ACCOUNT_A, ENCOUNTER_B, USER_ID, { nextStatus: 'in_care' }),
    () => scoped.closeEncounter(ACCOUNT_A, ENCOUNTER_B, USER_ID, { closeReason: 'foreign close' }),
    () => scoped.deleteEncounter(ACCOUNT_A, ENCOUNTER_B),
    () => scoped.listTimeline(ACCOUNT_A, ENCOUNTER_B),
    () =>
      scoped.appendTimeline(ACCOUNT_A, ENCOUNTER_B, {
        accountId: ACCOUNT_A,
        eventType: 'status_changed',
        summary: 'foreign timeline write',
        actorUserId: USER_ID
      })
  ];

  for (const operation of foreignOperations) {
    assert.throws(operation, NotFoundError);
  }

  await assert.rejects(scoped.listTimelineAsync(ACCOUNT_A, ENCOUNTER_B), NotFoundError);
  assert.deepEqual(scoped.listAll(ACCOUNT_A), [encounterA]);
  assert.equal(calls.updates, 0);
  assert.equal(calls.deletes, 0);
  assert.equal(calls.timelineCreates, 0);
});

test('EncountersService permits a same-account lifecycle command with explicit scope', async () => {
  const { encounters, scoped, encounterA, calls } = createFixture();

  await encounters.hydrateFromDatabase(ACCOUNT_A);

  const updated = scoped.transitionEncounter(ACCOUNT_A, ENCOUNTER_A, USER_ID, {
    nextStatus: 'in_care'
  });

  assert.equal(updated.id, encounterA.id);
  assert.equal(updated.accountId, ACCOUNT_A);
  assert.equal(updated.status, 'in_care');
  assert.equal(calls.updates, 0);
});

test('EncountersService restores the scoped timeline when a transition persistence fails', async () => {
  const persistenceError = new Error('encounter update failed');
  const { encounters, scoped, eventA, calls } = createFixture({
    updateError: persistenceError
  });

  await encounters.hydrateFromDatabase(ACCOUNT_A);
  const previousTimeline = scoped.listTimeline(ACCOUNT_A, ENCOUNTER_A);

  const updated = scoped.transitionEncounter(ACCOUNT_A, ENCOUNTER_A, USER_ID, {
    nextStatus: 'in_care'
  });
  assert.equal(updated.status, 'in_care');

  await assert.rejects(() => encounters.waitForPersistence(), /encounter update failed/);

  assert.equal(scoped.getOrThrow(ACCOUNT_A, ENCOUNTER_A).status, 'reception');
  assert.deepEqual(scoped.listTimeline(ACCOUNT_A, ENCOUNTER_A), previousTimeline);
  assert.deepEqual(scoped.listTimeline(ACCOUNT_A, ENCOUNTER_A), [eventA]);
  assert.equal(calls.updates, 1);
});

test('EncountersService does not publish a status callback when timeline persistence fails', async () => {
  const persistenceError = new Error('timeline create failed');
  let callbackInvoked = false;
  const { encounters, scoped, encounterA, eventA, calls } = createFixture({
    timelineError: persistenceError,
    onStatusChanged: async () => {
      callbackInvoked = true;
    }
  });

  await encounters.hydrateFromDatabase(ACCOUNT_A);
  scoped.transitionEncounter(ACCOUNT_A, ENCOUNTER_A, USER_ID, { nextStatus: 'in_care' });

  await assert.rejects(() => encounters.waitForPersistence(), /timeline create failed/);

  assert.equal(scoped.getOrThrow(ACCOUNT_A, ENCOUNTER_A), encounterA);
  assert.deepEqual(scoped.listTimeline(ACCOUNT_A, ENCOUNTER_A), [eventA]);
  assert.equal(calls.updates, 2);
  assert.equal(callbackInvoked, false);
});
