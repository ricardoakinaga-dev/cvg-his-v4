import assert from 'node:assert/strict';
import test from 'node:test';

import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';

import { EncountersService } from './index.js';

function createEncountersService() {
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });
  return new EncountersService({ owners, patients });
}

test('EncountersService: openEncounter creates a new encounter', () => {
  const encounters = createEncountersService();

  const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Test encounter'
  });

  assert.ok(encounter.id);
  assert.equal(encounter.status, 'reception');
  assert.equal(encounter.patientId, 'patient_luna');
});

test('EncountersService: getOrThrow throws for non-existent encounter', () => {
  const encounters = createEncountersService();

  assert.throws(() => encounters.getOrThrow('nonexistent' as never), NotFoundError);
});

test('EncountersService: transitionEncounter changes status', () => {
  const encounters = createEncountersService();

  const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Test'
  });

  const transitioned = encounters.transitionEncounter(encounter.id, 'user_admin' as never, {
    nextStatus: 'in_triage'
  });

  assert.equal(transitioned.status, 'in_triage');
});

test('EncountersService: transitionEncounter blocks invalid transitions', () => {
  const encounters = createEncountersService();

  const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Test'
  });

  // Close the encounter
  encounters.closeEncounter(encounter.id, 'user_admin' as never, { closeReason: 'Done' });

  // Try to transition closed encounter - should fail
  assert.throws(
    () =>
      encounters.transitionEncounter(encounter.id, 'user_admin' as never, {
        nextStatus: 'in_care'
      }),
    ValidationError
  );
});

test('EncountersService: closeEncounter sets closed status', () => {
  const encounters = createEncountersService();

  const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Test'
  });

  const closed = encounters.closeEncounter(encounter.id, 'user_admin' as never, {
    closeReason: 'Test complete'
  });

  assert.equal(closed.status, 'closed');
  assert.ok(closed.closedAt);
});

test('EncountersService: appendTimeline adds events', () => {
  const encounters = createEncountersService();

  const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Test'
  });

  encounters.appendTimeline(encounter.id, {
    accountId: encounter.accountId,
    eventType: 'status_changed',
    summary: 'Test status change',
    actorUserId: 'user_admin' as never
  });

  const timeline = encounters.listTimeline(encounter.id);
  assert.ok(timeline.length >= 2); // open + status_changed
  assert.ok(timeline.some((e) => e.eventType === 'status_changed'));
});

test('EncountersService: listActive excludes closed encounters', () => {
  const encounters = createEncountersService();

  const e1 = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Test 1'
  });

  // Close first encounter before opening second (same patient)
  encounters.closeEncounter(e1.id, 'user_admin' as never, { closeReason: 'Done' });

  const e2 = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Test 2'
  });

  const active = encounters.listActive();
  assert.ok(active.some((e) => e.id === e2.id));
  assert.ok(!active.some((e) => e.id === e1.id));
});
