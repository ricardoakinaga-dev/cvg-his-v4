import assert from 'node:assert/strict';
import { test } from 'vitest';

import type {
  AccountId,
  ClinicalHandoffId,
  ClinicalHandoffSummary,
  EncounterSummary,
  EncounterId,
  EncounterTimelineEventSummary,
  OwnerId,
  PatientId,
  UserId
} from '@cvg-his-v2/shared-types';
import { NotFoundError } from '@cvg-his-v2/shared-errors';

import {
  ClinicalHandoffsService,
  type ClinicalHandoffRepository,
  type EncountersService
} from './index.js';

const ACCOUNT_A = '00000000-0000-4000-8000-000000000001' as AccountId;
const ACCOUNT_B = '00000000-0000-4000-8000-000000000002' as AccountId;
const HANDOFF_A = '00000000-0000-4000-8000-000000000011' as ClinicalHandoffId;
const HANDOFF_B = '00000000-0000-4000-8000-000000000012' as ClinicalHandoffId;
const ENCOUNTER_A = '00000000-0000-4000-8000-000000000021' as EncounterId;
const ENCOUNTER_B = '00000000-0000-4000-8000-000000000022' as EncounterId;
const OWNER_A = '00000000-0000-4000-8000-000000000031' as OwnerId;
const OWNER_B = '00000000-0000-4000-8000-000000000032' as OwnerId;
const PATIENT_A = '00000000-0000-4000-8000-000000000041' as PatientId;
const PATIENT_B = '00000000-0000-4000-8000-000000000042' as PatientId;
const USER_ID = '00000000-0000-4000-8000-000000000051' as UserId;

function encounter(accountId: AccountId, id: EncounterId): EncounterSummary {
  return {
    id,
    accountId,
    patientId: accountId === ACCOUNT_A ? PATIENT_A : PATIENT_B,
    ownerId: accountId === ACCOUNT_A ? OWNER_A : OWNER_B,
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'handoff boundary test',
    status: 'reception',
    openedAt: '2026-08-31T10:00:00.000Z',
    createdByUserId: USER_ID,
    updatedAt: '2026-08-31T10:00:00.000Z'
  };
}

function timelineEvent(
  accountId: AccountId,
  encounterId: EncounterId
): EncounterTimelineEventSummary {
  return {
    id: `evt-${accountId}` as never,
    accountId,
    encounterId,
    eventType: 'handoff_sent_to_reception',
    summary: 'handoff boundary event',
    actorUserId: USER_ID,
    occurredAt: '2026-08-31T10:00:00.000Z'
  };
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function handoff(
  accountId: AccountId,
  id: ClinicalHandoffId,
  encounterId: EncounterId,
  ownerId: OwnerId,
  patientId: PatientId
): ClinicalHandoffSummary {
  return {
    id,
    accountId,
    encounterId,
    ownerId,
    patientId,
    originChannel: 'reception',
    fromSector: 'clinic',
    toSector: 'reception',
    fromResponsibleId: USER_ID,
    toResponsibleType: 'sector',
    toResponsibleId: 'reception',
    clinicalSummary: `summary-${accountId}`,
    receptionInstructions: `instructions-${accountId}`,
    priority: 'medium',
    handoffStatus: 'sent_to_reception',
    createdBy: USER_ID,
    sentBy: USER_ID,
    sentAt: '2026-08-31T10:00:00.000Z',
    pendingIssues: [],
    createdAt: '2026-08-31T10:00:00.000Z',
    updatedAt: '2026-08-31T10:00:00.000Z'
  };
}

test('ClinicalHandoffsService hides foreign details after contaminated hydration', async () => {
  const handoffA = handoff(ACCOUNT_A, HANDOFF_A, ENCOUNTER_A, OWNER_A, PATIENT_A);
  const handoffB = handoff(ACCOUNT_B, HANDOFF_B, ENCOUNTER_B, OWNER_B, PATIENT_B);
  const repository: ClinicalHandoffRepository = {
    create: async () => undefined,
    update: async () => undefined,
    findById: async (id) => (id === HANDOFF_A ? handoffA : id === HANDOFF_B ? handoffB : null),
    findByEncounterId: async () => [handoffA, handoffB],
    findAll: async () => [handoffA, handoffB]
  };
  const handoffs = new ClinicalHandoffsService({} as EncountersService, { repository });

  await handoffs.hydrateFromDatabase(ACCOUNT_A);

  assert.deepEqual(handoffs.list(ACCOUNT_A), [handoffA]);
  assert.equal(handoffs.getOrThrow(ACCOUNT_A, HANDOFF_A), handoffA);
  assert.throws(() => handoffs.getOrThrow(ACCOUNT_A, HANDOFF_B), NotFoundError);
  assert.deepEqual(handoffs.list(ACCOUNT_B), []);
});

test('ClinicalHandoffsService gates callbacks on handoff and timeline persistence', async () => {
  const currentEncounter = encounter(ACCOUNT_A, ENCOUNTER_A);
  const timeline = deferred<void>();
  const callbacks: string[] = [];
  const repository: ClinicalHandoffRepository = {
    create: async () => undefined,
    update: async () => undefined,
    findById: async () => null,
    findByEncounterId: async () => [],
    findAll: async () => []
  };
  const encounters = {
    getOrThrow: () => currentEncounter,
    appendTimeline: () => timelineEvent(ACCOUNT_A, ENCOUNTER_A),
    appendTimelineWithPersistence: () => ({
      event: timelineEvent(ACCOUNT_A, ENCOUNTER_A),
      persistence: timeline.promise
    })
  } as unknown as EncountersService;
  const handoffs = new ClinicalHandoffsService(encounters, {
    repository,
    onHandoffSent: async () => {
      callbacks.push('sent');
    }
  });

  handoffs.sendToReception(ACCOUNT_A, USER_ID, {
    encounterId: ENCOUNTER_A,
    clinicalSummary: 'Resumo persistido antes do evento.',
    receptionInstructions: 'Aguardar persistencia completa.'
  });

  await Promise.resolve();
  assert.deepEqual(callbacks, []);

  timeline.resolve(undefined);
  await handoffs.waitForPersistence();
  assert.deepEqual(callbacks, ['sent']);
});

test('ClinicalHandoffsService recovers persistence and callback queues after rejection', async () => {
  const currentEncounter = encounter(ACCOUNT_A, ENCOUNTER_A);
  const persistenceError = new Error('handoff persistence failed');
  const callbackError = new Error('handoff callback failed');
  let failCreate = true;
  let sentCallbacks = 0;
  let acknowledgedCallbacks = 0;
  const repository: ClinicalHandoffRepository = {
    create: async () => {
      if (failCreate) throw persistenceError;
    },
    update: async () => undefined,
    findById: async () => null,
    findByEncounterId: async () => [],
    findAll: async () => []
  };
  const encounters = {
    getOrThrow: () => currentEncounter,
    appendTimeline: () => timelineEvent(ACCOUNT_A, ENCOUNTER_A),
    appendTimelineWithPersistence: () => ({
      event: timelineEvent(ACCOUNT_A, ENCOUNTER_A),
      persistence: Promise.resolve()
    })
  } as unknown as EncountersService;
  const handoffs = new ClinicalHandoffsService(encounters, {
    repository,
    onHandoffSent: async () => {
      sentCallbacks += 1;
    },
    onHandoffAcknowledged: async () => {
      acknowledgedCallbacks += 1;
      if (acknowledgedCallbacks === 1) throw callbackError;
    }
  });

  const first = handoffs.sendToReception(ACCOUNT_A, USER_ID, {
    encounterId: ENCOUNTER_A,
    clinicalSummary: 'Primeiro handoff.',
    receptionInstructions: 'Falhar persistencia.'
  });
  await assert.rejects(() => handoffs.waitForPersistence(), persistenceError);
  assert.equal(sentCallbacks, 0);

  failCreate = false;
  const second = handoffs.sendToReception(ACCOUNT_A, USER_ID, {
    encounterId: ENCOUNTER_A,
    clinicalSummary: 'Segundo handoff.',
    receptionInstructions: 'Persistir com fila recuperada.'
  });
  await handoffs.waitForPersistence();
  assert.equal(second.id, handoffs.list(ACCOUNT_A)[0]?.id);
  assert.equal(sentCallbacks, 1);

  const acknowledged = handoffs.acknowledge(ACCOUNT_A, USER_ID, second.id);
  await assert.rejects(() => handoffs.waitForPersistence(), callbackError);
  assert.equal(acknowledged.handoffStatus, 'acknowledged_by_reception');
  assert.equal(acknowledgedCallbacks, 1);

  handoffs.markPending(ACCOUNT_A, USER_ID, second.id, {
    type: 'queue_recovery',
    reason: 'Verify callback queue recovery',
    ownerId: USER_ID
  });
  await handoffs.waitForPersistence();
  assert.equal(acknowledgedCallbacks, 2);
});
