import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import { ConflictError } from '@cvg-his-v2/shared-errors';
import type { EncounterSummary } from '@cvg-his-v2/shared-types';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

import { EncountersService, type EncounterRepository } from './index.js';
import { DatabaseEncounterRepository } from './repositories/database-encounter.repository.js';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const PATIENT_ID = '00000000-0000-4000-8000-000000000002';
const OWNER_ID = '00000000-0000-4000-8000-000000000003';
const USER_ID = '00000000-0000-4000-8000-000000000004';

function encounter(): EncounterSummary {
  return {
    id: '00000000-0000-4000-8000-000000000005' as never,
    accountId: ACCOUNT_ID as never,
    patientId: PATIENT_ID as never,
    ownerId: OWNER_ID as never,
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'database uniqueness contract',
    status: 'reception',
    openedAt: '2026-08-27T06:00:00.000Z',
    createdByUserId: USER_ID as never,
    updatedAt: '2026-08-27T06:00:00.000Z'
  };
}

function postgresError(
  code: string,
  constraint: string
): Error & { code: string; constraint: string } {
  return Object.assign(new Error('duplicate key value violates unique constraint'), {
    code,
    constraint
  });
}

function databaseThatRejects(error: unknown): DatabaseClient {
  return {
    execute: async () => {
      throw error;
    }
  } as unknown as DatabaseClient;
}

function databaseThatRejectsUpdate(error: unknown): DatabaseClient {
  return {
    update: () => ({
      set: () => ({
        where: async () => {
          throw error;
        }
      })
    })
  } as unknown as DatabaseClient;
}

const tenantContext = {
  tenantId: '00000000-0000-4000-8000-000000000010',
  accountId: ACCOUNT_ID,
  correlationId: 'encounter-active-uniqueness-unit'
};

test('DatabaseEncounterRepository maps the named active-encounter violation to a conflict', async () => {
  const repository = new DatabaseEncounterRepository(
    databaseThatRejects(
      Object.assign(new Error('Failed query'), {
        cause: postgresError('23505', 'uidx_encounters_one_active_per_patient')
      })
    )
  );

  const rejection = await runWithTenantContext(tenantContext, () =>
    repository.create(encounter()).then(
      () => undefined,
      (error: unknown) => error
    )
  );

  assert.ok(rejection instanceof ConflictError);
  assert.equal(rejection.message, 'Patient already has an active encounter');
  assert.deepEqual(rejection.details, { patientId: PATIENT_ID });
});

test('DatabaseEncounterRepository preserves unrelated database unique violations', async () => {
  const original = postgresError('23505', 'some_other_constraint');
  const repository = new DatabaseEncounterRepository(databaseThatRejects(original));

  const rejection = await runWithTenantContext(tenantContext, () =>
    repository.create(encounter()).then(
      () => undefined,
      (error: unknown) => error
    )
  );

  assert.equal(rejection, original);
});

test('DatabaseEncounterRepository maps the active-encounter violation from a generic update', async () => {
  const repository = new DatabaseEncounterRepository(
    databaseThatRejectsUpdate(
      Object.assign(new Error('Failed query'), {
        cause: postgresError('23505', 'uidx_encounters_one_active_per_patient')
      })
    )
  );

  const rejection = await runWithTenantContext(tenantContext, () =>
    repository.update(encounter()).then(
      () => undefined,
      (error: unknown) => error
    )
  );

  assert.ok(rejection instanceof ConflictError);
  assert.equal(rejection.message, 'Patient already has an active encounter');
});

test('EncountersService rolls back speculative cache state after an active-encounter conflict', async () => {
  const repository = {
    create: async () => {
      throw new ConflictError('Patient already has an active encounter');
    }
  } as unknown as EncounterRepository;
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });
  const encounters = new EncountersService({
    owners,
    patients,
    encounterRepository: repository,
    requireUuidIdentifiers: false
  });

  encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Conflict rollback'
  });

  await assert.rejects(() => encounters.waitForPersistence(), ConflictError);
  assert.deepEqual(encounters.listActive('acc_cvg_demo' as never), []);
});
test('EncountersService restores the closed timeline after a reopen conflict', async () => {
  const repository = {
    create: async () => undefined,
    update: async () => undefined,
    updateForReopen: async () => {
      throw new ConflictError('Patient already has an active encounter');
    }
  } as unknown as EncounterRepository;
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });
  const encounters = new EncountersService({
    owners,
    patients,
    encounterRepository: repository,
    requireUuidIdentifiers: false
  });

  const opened = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Reopen conflict rollback'
  });
  await encounters.waitForPersistence();
  const closed = encounters.closeEncounter('acc_cvg_demo' as never, opened.id, 'user_admin' as never, {
    closeReason: 'Close before conflict'
  });
  await encounters.waitForPersistence();
  const closedTimeline = encounters.listTimeline('acc_cvg_demo' as never, closed.id);

  encounters.reopenEncounter(
    'acc_cvg_demo' as never,
    closed.id,
    'user_admin' as never,
    'Competing active encounter'
  );
  await assert.rejects(() => encounters.waitForPersistence(), ConflictError);

  assert.equal(encounters.getOrThrow('acc_cvg_demo' as never, closed.id).status, 'closed');
  assert.deepEqual(encounters.listTimeline('acc_cvg_demo' as never, closed.id), closedTimeline);
});
