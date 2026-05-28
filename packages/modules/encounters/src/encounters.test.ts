import assert from 'node:assert/strict';
import { test } from 'vitest';

import { OwnersService } from '@cvg-his-v2/module-owners';
import { PatientsService } from '@cvg-his-v2/module-patients';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';

import {
  ClinicalHandoffsService,
  EncountersService,
  InMemoryClinicalHandoffRepository,
  type EncounterRepository
} from './index.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createEncountersService() {
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });
  return new EncountersService({ owners, patients });
}

function openTestEncounter(encounters: EncountersService) {
  return encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Handoff test'
  });
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
  assert.match(encounter.id, UUID_PATTERN);
  assert.equal(encounter.status, 'reception');
  assert.equal(encounter.patientId, 'patient_luna');
});

test('ClinicalHandoffsService: sends minimal handoff to reception and records timeline', () => {
  const encounters = createEncountersService();
  const encounter = openTestEncounter(encounters);
  const handoffs = new ClinicalHandoffsService(encounters);

  const handoff = handoffs.sendToReception(encounter.accountId, 'user_vet' as never, {
    encounterId: encounter.id,
    clinicalSummary: 'Paciente avaliado, medicado e liberado.',
    receptionInstructions: 'Orientar tutor e conferir pendencias antes da saida.',
    priority: 'high'
  });

  assert.equal(handoff.encounterId, encounter.id);
  assert.equal(handoff.handoffStatus, 'sent_to_reception');
  assert.equal(handoff.fromSector, 'clinic');
  assert.equal(handoff.toSector, 'reception');
  assert.equal(handoff.priority, 'high');
  assert.equal(
    handoffs.list(encounter.accountId, { handoffStatus: 'sent_to_reception' }).length,
    1
  );
  assert.ok(
    encounters
      .listTimeline(encounter.id)
      .some((event) => event.eventType === 'handoff_sent_to_reception')
  );
});

test('ClinicalHandoffsService: acknowledges reception ownership once', () => {
  const encounters = createEncountersService();
  const encounter = openTestEncounter(encounters);
  const handoffs = new ClinicalHandoffsService(encounters);
  const handoff = handoffs.sendToReception(encounter.accountId, 'user_vet' as never, {
    encounterId: encounter.id,
    clinicalSummary: 'Resumo clinico suficiente para recepcao.',
    receptionInstructions: 'Entregar receita e orientar retorno.',
    priority: 'medium'
  });

  const acknowledged = handoffs.acknowledge(
    encounter.accountId,
    'user_reception' as never,
    handoff.id,
    { note: 'Recebido pela recepcao.' }
  );

  assert.equal(acknowledged.handoffStatus, 'acknowledged_by_reception');
  assert.equal(acknowledged.acknowledgedBy, 'user_reception');
  assert.ok(acknowledged.acknowledgedAt);
  assert.throws(
    () => handoffs.acknowledge(encounter.accountId, 'user_reception' as never, handoff.id),
    ConflictError
  );
  assert.ok(
    encounters
      .listTimeline(encounter.id)
      .some((event) => event.eventType === 'handoff_acknowledged')
  );
});

test('ClinicalHandoffsService: requires summary and instructions before sending', () => {
  const encounters = createEncountersService();
  const encounter = openTestEncounter(encounters);
  const handoffs = new ClinicalHandoffsService(encounters);

  assert.throws(
    () =>
      handoffs.sendToReception(encounter.accountId, 'user_vet' as never, {
        encounterId: encounter.id,
        clinicalSummary: '',
        receptionInstructions: 'Orientar tutor.'
      }),
    ValidationError
  );

  assert.throws(
    () =>
      handoffs.sendToReception(encounter.accountId, 'user_vet' as never, {
        encounterId: encounter.id,
        clinicalSummary: 'Resumo clinico.',
        receptionInstructions: ''
      }),
    ValidationError
  );
});

test('ClinicalHandoffsService: blocks duplicate handoff for the same encounter', () => {
  const encounters = createEncountersService();
  const encounter = openTestEncounter(encounters);
  const handoffs = new ClinicalHandoffsService(encounters);

  handoffs.sendToReception(encounter.accountId, 'user_vet' as never, {
    encounterId: encounter.id,
    clinicalSummary: 'Resumo clinico.',
    receptionInstructions: 'Orientar tutor.'
  });

  assert.throws(
    () =>
      handoffs.sendToReception(encounter.accountId, 'user_vet' as never, {
        encounterId: encounter.id,
        clinicalSummary: 'Novo resumo.',
        receptionInstructions: 'Nova orientacao.'
      }),
    ConflictError
  );
});

test('ClinicalHandoffsService: hydrates persisted handoffs from repository', async () => {
  const encounters = createEncountersService();
  const encounter = openTestEncounter(encounters);
  const repository = new InMemoryClinicalHandoffRepository();
  const handoffsA = new ClinicalHandoffsService(encounters, { repository });

  const handoff = handoffsA.sendToReception(encounter.accountId, 'user_vet' as never, {
    encounterId: encounter.id,
    clinicalSummary: 'Resumo persistido.',
    receptionInstructions: 'Recepcao deve confirmar recebimento.'
  });
  await handoffsA.waitForPersistence();

  const handoffsB = new ClinicalHandoffsService(encounters, { repository });
  await handoffsB.hydrateFromDatabase(encounter.accountId);

  assert.equal(handoffsB.getOrThrow(handoff.id).clinicalSummary, 'Resumo persistido.');
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

test('EncountersService: deleteEncounter removes encounter and timeline from memory', () => {
  const encounters = createEncountersService();

  const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Delete test'
  });

  encounters.deleteEncounter(encounter.id);

  assert.throws(() => encounters.getOrThrow(encounter.id), NotFoundError);
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

test('EncountersService: onEncounterCreated callback is invoked on openEncounter', () => {
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });

  let callbackInvoked = false;
  let capturedEncounterId: string | null = null;

  const encounters = new EncountersService({
    owners,
    patients,
    onEncounterCreated: async (encounter) => {
      callbackInvoked = true;
      capturedEncounterId = encounter.id;
    }
  });

  const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Callback test'
  });

  assert.equal(callbackInvoked, true);
  assert.equal(capturedEncounterId, encounter.id);
});

test('EncountersService: onEncounterStatusChanged callback is invoked on transitionEncounter', () => {
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });

  let callbackInvoked = false;
  let capturedPreviousStatus: string | null = null;

  const encounters = new EncountersService({
    owners,
    patients,
    onEncounterStatusChanged: async (encounter, previousStatus) => {
      callbackInvoked = true;
      capturedPreviousStatus = previousStatus;
    }
  });

  const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Callback test'
  });

  callbackInvoked = false;

  encounters.transitionEncounter(encounter.id, 'user_admin' as never, {
    nextStatus: 'in_triage'
  });

  assert.equal(callbackInvoked, true);
  assert.equal(capturedPreviousStatus, 'reception');
});

test('EncountersService: onEncounterStatusChanged callback is invoked on closeEncounter', () => {
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });

  let callbackInvoked = false;
  let capturedPreviousStatus: string | null = null;

  const encounters = new EncountersService({
    owners,
    patients,
    onEncounterStatusChanged: async (encounter, previousStatus) => {
      callbackInvoked = true;
      capturedPreviousStatus = previousStatus;
    }
  });

  const encounter = encounters.openEncounter('acc_cvg_demo' as never, 'user_admin' as never, {
    patientId: 'patient_luna',
    ownerId: 'owner_maria_silva',
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Callback test'
  });

  callbackInvoked = false;

  encounters.closeEncounter(encounter.id, 'user_admin' as never, {
    closeReason: 'Test done'
  });

  assert.equal(callbackInvoked, true);
  assert.equal(capturedPreviousStatus, 'reception');
});

test('EncountersService: openEncounter rolls back memory when repository persistence fails', async () => {
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });
  const failingRepository: EncounterRepository = {
    async create() {
      throw new Error('database unavailable');
    },
    async update() {},
    async findById() {
      return null;
    },
    async findActiveByPatientId() {
      return null;
    },
    async findAll() {
      return [];
    },
    async findActive() {
      return [];
    },
    async delete() {}
  };
  const encounters = new EncountersService({
    owners,
    patients,
    encounterRepository: failingRepository
  });
  const accountId = '550e8400-e29b-41d4-a716-446655440000' as never;
  const actorUserId = '550e8400-e29b-41d4-a716-446655440001' as never;
  const owner = owners.create(accountId, {
    fullName: 'Tutor Persistencia',
    contacts: [{ label: 'Telefone', value: '+55 11 99999-0000', type: 'phone', primary: true }],
    financialResponsible: true
  });
  const patient = patients.create(accountId, {
    name: 'Paciente Persistencia',
    species: 'canine',
    sex: 'unknown',
    primaryOwnerId: owner.id
  });

  const encounter = encounters.openEncounter(accountId, actorUserId, {
    patientId: patient.id,
    ownerId: owner.id,
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Rollback test'
  });

  await assert.rejects(() => encounters.waitForPersistence(), /database unavailable/);
  assert.throws(() => encounters.getOrThrow(encounter.id), NotFoundError);
  assert.equal(
    encounters.listActive().some((item) => item.id === encounter.id),
    false
  );
});

test('EncountersService: openEncounter rejects legacy ids before database persistence', async () => {
  const owners = new OwnersService();
  const patients = new PatientsService({ owners });
  let persisted = false;
  const repository: EncounterRepository = {
    async create() {
      persisted = true;
    },
    async update() {},
    async findById() {
      return null;
    },
    async findActiveByPatientId() {
      return null;
    },
    async findAll() {
      return [];
    },
    async findActive() {
      return [];
    },
    async delete() {}
  };
  const encounters = new EncountersService({
    owners,
    patients,
    encounterRepository: repository
  });

  assert.throws(
    () =>
      encounters.openEncounter(
        '550e8400-e29b-41d4-a716-446655440000' as never,
        '550e8400-e29b-41d4-a716-446655440001' as never,
        {
          patientId: 'patient_mogeb6qv_5b0gq64z',
          ownerId: 'owner_ricardo_akinaga',
          visitType: 'walk_in',
          origin: 'reception',
          reason: 'Consulta'
        }
      ),
    ValidationError
  );
  await encounters.waitForPersistence();
  assert.equal(persisted, false);
  assert.equal(encounters.listActive().length, 0);
});
