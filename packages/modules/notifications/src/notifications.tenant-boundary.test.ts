import assert from 'node:assert/strict';
import { test } from 'vitest';

import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  EncounterId,
  EncounterSummary,
  PatientId,
  PatientSummary,
  UserId
} from '@cvg-his-v2/shared-types';

import { NotificationsService, type NotificationRepository } from './index.js';

const ACCOUNT_A = '00000000-0000-4000-8000-000000000001' as AccountId;
const ACCOUNT_B = '00000000-0000-4000-8000-000000000002' as AccountId;
const ENCOUNTER_A = '00000000-0000-4000-8000-000000000011' as EncounterId;
const ENCOUNTER_B = '00000000-0000-4000-8000-000000000012' as EncounterId;
const PATIENT_A = '00000000-0000-4000-8000-000000000021' as PatientId;
const PATIENT_B = '00000000-0000-4000-8000-000000000022' as PatientId;
const USER_A = '00000000-0000-4000-8000-000000000031' as UserId;

const encounterA = { id: ENCOUNTER_A, accountId: ACCOUNT_A } as EncounterSummary;
const encounterB = { id: ENCOUNTER_B, accountId: ACCOUNT_B } as EncounterSummary;
const patientA = { id: PATIENT_A, accountId: ACCOUNT_A } as PatientSummary;
const patientB = { id: PATIENT_B, accountId: ACCOUNT_B } as PatientSummary;

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    category: 'operations' as const,
    severity: 'medium' as const,
    title: 'Tenant boundary notification',
    message: 'Must remain inside the account boundary',
    ...overrides
  };
}

test('NotificationsService rejects foreign encounter and patient references', async () => {
  const encounterDependency = {
    getOrThrow: (_accountId: AccountId, _encounterId: EncounterId) => encounterA
  };
  const foreignPatientDependency = {
    getOrThrow: (_patientId: PatientId) => patientB
  };
  const notificationsWithForeignPatient = new NotificationsService({
    encounters: encounterDependency as never,
    patients: foreignPatientDependency as never
  });

  await assert.rejects(
    () =>
      notificationsWithForeignPatient.create(
        USER_A,
        ACCOUNT_A,
        createPayload({ encounterId: ENCOUNTER_A, patientId: PATIENT_B })
      ),
    NotFoundError
  );

  const foreignEncounterDependency = {
    getOrThrow: (_accountId: AccountId, _encounterId: EncounterId) => encounterB
  };
  const notificationsWithForeignEncounter = new NotificationsService({
    encounters: foreignEncounterDependency as never,
    patients: { getOrThrow: () => patientA } as never
  });

  await assert.rejects(
    () =>
      notificationsWithForeignEncounter.create(
        USER_A,
        ACCOUNT_A,
        createPayload({ encounterId: ENCOUNTER_B, patientId: PATIENT_A })
      ),
    NotFoundError
  );
});

test('NotificationsService keeps local and repository lists and processing tenant-scoped', async () => {
  const notificationsStore = new Map<string, any>();
  const jobsStore = new Map<string, any>();
  const repository: NotificationRepository = {
    createNotification: async (notification) => {
      notificationsStore.set(notification.id, notification);
    },
    updateNotification: async (notification) => {
      notificationsStore.set(notification.id, notification);
    },
    findNotificationById: async (id) => notificationsStore.get(id) ?? null,
    findNotifications: async () => Array.from(notificationsStore.values()),
    createJob: async (job) => {
      jobsStore.set(job.id, job);
    },
    updateJob: async (job) => {
      jobsStore.set(job.id, job);
    },
    findJobById: async (id) => jobsStore.get(id) ?? null,
    findJobs: async () => Array.from(jobsStore.values()),
    findQueuedJobs: async () =>
      Array.from(jobsStore.values()).filter((job) => job.status === 'queued')
  };
  const notifications = new NotificationsService({ notificationRepository: repository });
  const notificationA = await notifications.create(USER_A, ACCOUNT_A, createPayload());
  const notificationB = await notifications.create(
    USER_A,
    ACCOUNT_B,
    createPayload({ title: 'B' })
  );

  assert.deepEqual(notifications.list(ACCOUNT_A, 'queued'), [notificationA]);
  assert.deepEqual(
    notifications.listJobs(ACCOUNT_A).map((job) => job.accountId),
    [ACCOUNT_A]
  );
  assert.deepEqual(await notifications.listFromRepository(ACCOUNT_A, 'queued'), [notificationA]);
  assert.deepEqual(
    (await notifications.listJobsFromRepository(ACCOUNT_A)).map((job) => job.accountId),
    [ACCOUNT_A]
  );

  const processed = await notifications.processPendingFromRepository(ACCOUNT_A, { limit: 10 });
  assert.deepEqual(
    processed.map((notification) => notification.id),
    [notificationA.id]
  );
  assert.equal((await notifications.listFromRepository(ACCOUNT_A, 'sent')).length, 1);
  assert.equal(
    (await notifications.listFromRepository(ACCOUNT_B, 'queued'))[0]?.id,
    notificationB.id
  );
  assert.equal((await notifications.listJobsFromRepository(ACCOUNT_B))[0]?.status, 'queued');

  const localNotifications = new NotificationsService();
  await localNotifications.create(USER_A, ACCOUNT_A, createPayload());
  await localNotifications.create(USER_A, ACCOUNT_B, createPayload({ title: 'B-local' }));
  const localProcessed = await localNotifications.processPending(ACCOUNT_A, { limit: 10 });
  assert.equal(localProcessed.length, 1);
  assert.equal(localNotifications.list(ACCOUNT_B, 'queued').length, 1);

  assert.throws(() => localNotifications.list(undefined as never), ValidationError);
});
