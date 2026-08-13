import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { TriageSummary } from '@cvg-his-v2/shared-types';

import { TriageService } from './index.js';
import type { TriageVersionSummary } from './version-types.js';

function createEncounter(
  status: 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed' = 'in_triage'
) {
  return {
    id: 'enc_test' as never,
    accountId: 'acc_test' as never,
    patientId: 'patient_test' as never,
    status
  };
}

function createEncountersStub(
  status: 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed' = 'in_triage'
) {
  const encounter = createEncounter(status);
  return {
    getOrThrow(encounterId: string) {
      assert.equal(encounterId, encounter.id);
      return encounter;
    }
  } as never;
}

test('createTriage stores a first record for an encounter', async () => {
  const service = new TriageService(createEncountersStub());

  const created = await service.createTriage('user_triage' as never, {
    encounterId: 'enc_test',
    patientId: 'patient_test',
    priority: 'high',
    chiefComplaint: 'Dor aguda',
    initialNotes: 'Paciente inquieto',
    alerts: ['agressivo'],
    destination: 'in_care'
  });

  assert.equal(created.priority, 'high');
  assert.equal(created.destination, 'in_care');
  assert.equal(service.list('enc_test' as never).length, 1);
});

test('createTriage prevents a second initial triage for the same encounter', async () => {
  const service = new TriageService(createEncountersStub());

  await service.createTriage('user_triage' as never, {
    encounterId: 'enc_test',
    patientId: 'patient_test',
    priority: 'medium',
    chiefComplaint: 'Vomito',
    alerts: ['desidratacao'],
    destination: 'observation'
  });

  await assert.rejects(
    () =>
      service.createTriage('user_triage' as never, {
        encounterId: 'enc_test',
        patientId: 'patient_test',
        priority: 'critical',
        chiefComplaint: 'Parada respiratoria',
        alerts: ['choque'],
        destination: 'in_care'
      }),
    (error: unknown) => {
      assert.equal(error instanceof ConflictError, true);
      return true;
    }
  );
});

test('TriageService scopes reads and mutations to the expected account', async () => {
  const service = new TriageService(createEncountersStub());
  const created = await service.createTriage(
    'user_triage' as never,
    {
      encounterId: 'enc_test',
      patientId: 'patient_test',
      priority: 'high',
      chiefComplaint: 'Isolamento',
      alerts: [],
      destination: 'in_care'
    },
    'acc_test' as never
  );

  assert.equal(service.listByAccount('acc_test' as never).length, 1);
  assert.equal(service.listByAccount('acc_other' as never).length, 0);
  assert.throws(
    () => service.getForAccountOrThrow('acc_other' as never, created.id),
    NotFoundError
  );
  await assert.rejects(
    () =>
      service.updateTriage(
        created.id,
        { priority: 'low' },
        'user_other' as never,
        'acc_other' as never
      ),
    NotFoundError
  );
});

test('updateTriage updates only allowed clinical fields', async () => {
  const service = new TriageService(createEncountersStub('observation'));

  const created = await service.createTriage('user_triage' as never, {
    encounterId: 'enc_test',
    patientId: 'patient_test',
    priority: 'medium',
    chiefComplaint: 'Febre',
    initialNotes: 'Sem apetite',
    alerts: ['letargia'],
    destination: 'observation'
  });

  const updated = await service.updateTriage(created.id, {
    priority: 'high',
    chiefComplaint: 'Febre persistente',
    initialNotes: 'Piora clinica nas ultimas horas',
    alerts: ['letargia', 'desidratacao'],
    destination: 'in_care'
  });

  assert.equal(updated.priority, 'high');
  assert.equal(updated.destination, 'in_care');
  assert.equal(updated.chiefComplaint, 'Febre persistente');
  assert.deepEqual(updated.alerts, ['letargia', 'desidratacao']);
  assert.equal(updated.triagedByUserId, created.triagedByUserId);
  assert.ok(updated.updatedAt >= created.updatedAt);
  assert.equal(service.listVersions(created.id).length, 1);
  assert.deepEqual(service.listVersions(created.id)[0]?.changedFields.includes('priority'), true);
});

test('updateTriage rejects changes when encounter is closed', async () => {
  const service = new TriageService(createEncountersStub('closed'));

  const created = await service.createTriage('user_triage' as never, {
    encounterId: 'enc_test',
    patientId: 'patient_test',
    priority: 'medium',
    chiefComplaint: 'Retorno',
    alerts: ['dor'],
    destination: 'observation'
  });

  await assert.rejects(
    () =>
      service.updateTriage(created.id, {
        priority: 'high'
      }),
    (error: unknown) => {
      assert.equal(error instanceof ConflictError, true);
      return true;
    }
  );
});

test('hydrateFromDatabase loads persisted triage records into memory', async () => {
  const persisted: TriageSummary = {
    id: 'triage_persisted' as never,
    accountId: 'acc_test' as never,
    encounterId: 'enc_test' as never,
    patientId: 'patient_test' as never,
    priority: 'critical',
    chiefComplaint: 'Dispneia',
    initialNotes: 'Saturacao baixa',
    alerts: ['oxigenio'],
    destination: 'in_care',
    triagedByUserId: 'user_triage' as never,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  };

  const repository = {
    async create() {},
    async update() {},
    async createVersion() {},
    async findById() {
      return persisted;
    },
    async findByEncounterId() {
      return [persisted];
    },
    async findByAccountId() {
      return [persisted];
    },
    async findVersionsByTriageId() {
      return [];
    },
    async findVersionsByAccountId() {
      return [];
    }
  };

  const service = new TriageService(createEncountersStub(), { repository });
  await service.hydrateFromDatabase();

  assert.equal(service.list().length, 1);
  assert.equal(service.getOrThrow('triage_persisted' as never).chiefComplaint, 'Dispneia');
});

test('hydrateFromDatabase also loads persisted triage versions', async () => {
  const persisted: TriageSummary = {
    id: 'triage_hist' as never,
    accountId: 'acc_test' as never,
    encounterId: 'enc_test' as never,
    patientId: 'patient_test' as never,
    priority: 'medium',
    chiefComplaint: 'Dor',
    initialNotes: 'Inicial',
    alerts: ['dor'],
    destination: 'observation',
    triagedByUserId: 'user_triage' as never,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  };
  const version: TriageVersionSummary = {
    id: 'triagev_hist' as never,
    triageId: persisted.id,
    accountId: persisted.accountId,
    encounterId: persisted.encounterId,
    changedFields: ['priority', 'destination'],
    previousSnapshot: {
      priority: 'low',
      chiefComplaint: 'Dor',
      initialNotes: 'Inicial',
      alerts: ['dor'],
      destination: 'observation',
      updatedAt: '2026-04-01T09:00:00.000Z'
    },
    nextSnapshot: {
      priority: 'medium',
      chiefComplaint: 'Dor',
      initialNotes: 'Inicial',
      alerts: ['dor'],
      destination: 'observation',
      updatedAt: '2026-04-01T10:00:00.000Z'
    },
    changedByUserId: 'user_triage' as never,
    createdAt: '2026-04-01T10:00:00.000Z'
  };

  const repository = {
    async create() {},
    async update() {},
    async createVersion() {},
    async findById() {
      return persisted;
    },
    async findByEncounterId() {
      return [persisted];
    },
    async findByAccountId() {
      return [persisted];
    },
    async findVersionsByTriageId() {
      return [version];
    },
    async findVersionsByAccountId() {
      return [version];
    }
  };

  const service = new TriageService(createEncountersStub(), { repository });
  await service.hydrateFromDatabase();

  assert.equal(service.listVersions('triage_hist' as never).length, 1);
  assert.equal(service.listVersions('triage_hist' as never)[0]?.id, 'triagev_hist');
});
