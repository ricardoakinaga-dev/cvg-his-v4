import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
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
    getOrThrow(_accountId: string, encounterId: string) {
      assert.equal(encounterId, encounter.id);
      return encounter;
    }
  } as never;
}

test('createTriage stores a first record for an encounter', async () => {
  const service = new TriageService(createEncountersStub());

  const created = await service.createTriage(
    'user_triage' as never,
    {
      encounterId: 'enc_test',
      patientId: 'patient_test',
      priority: 'high',
      chiefComplaint: 'Dor aguda',
      initialNotes: 'Paciente inquieto',
      alerts: ['agressivo'],
      destination: 'in_care'
    },
    'acc_test' as never
  );

  assert.equal(created.priority, 'high');
  assert.equal(created.destination, 'in_care');
  assert.equal(service.list('acc_test' as never, 'enc_test' as never).length, 1);
});

test('createTriage rejects a closed encounter before persistence or cache mutation', async () => {
  let createCalls = 0;
  const repository = {
    async create() {
      createCalls += 1;
    },
    async update() {},
    async createVersion() {},
    async findById() {
      return null;
    },
    async findByEncounterId() {
      return [];
    },
    async findByAccountId() {
      return [];
    },
    async findVersionsByTriageId() {
      return [];
    },
    async findVersionsByAccountId() {
      return [];
    }
  };
  const service = new TriageService(createEncountersStub('closed'), { repository });

  await assert.rejects(
    () =>
      service.createTriage(
        'user_triage' as never,
        {
          encounterId: 'enc_test',
          patientId: 'patient_test',
          priority: 'high',
          chiefComplaint: 'Dor aguda',
          alerts: [],
          destination: 'in_care'
        },
        'acc_test' as never
      ),
    (error: unknown) => {
      assert.equal(error instanceof ConflictError, true);
      return true;
    }
  );

  assert.equal(createCalls, 0);
  assert.deepEqual(service.list('acc_test' as never), []);
});

test('triage list rejects empty encounter filters and protects cached read models', async () => {
  const service = new TriageService(createEncountersStub('observation'));
  const created = await service.createTriage(
    'user_triage' as never,
    {
      encounterId: 'enc_test',
      patientId: 'patient_test',
      priority: 'medium',
      chiefComplaint: 'Dor',
      alerts: ['letargia'],
      destination: 'observation'
    },
    'acc_test' as never
  );

  assert.throws(
    () => service.list('acc_test' as never, '' as never),
    (error: unknown) => {
      assert.equal(error instanceof ValidationError, true);
      return true;
    }
  );

  (created.alerts as string[]).push('alteracao-externa');
  assert.deepEqual(service.getOrThrow(created.id, 'acc_test' as never).alerts, ['letargia']);

  const listed = service.list('acc_test' as never)[0];
  assert.ok(listed);
  (listed.alerts as string[]).push('segunda-alteracao-externa');
  assert.deepEqual(service.list('acc_test' as never)[0]?.alerts, ['letargia']);
});

test('triage persistence failures do not leave speculative cache state', async () => {
  let failCreate = true;
  let failUpdate = false;
  const repository = {
    async create() {
      if (failCreate) throw new Error('triage create failed');
    },
    async update() {
      if (failUpdate) throw new Error('triage update failed');
    },
    async createVersion() {},
    async findById() {
      return null;
    },
    async findByEncounterId() {
      return [];
    },
    async findByAccountId() {
      return [];
    },
    async findVersionsByTriageId() {
      return [];
    },
    async findVersionsByAccountId() {
      return [];
    }
  };
  const service = new TriageService(createEncountersStub('observation'), { repository });
  const payload = {
    encounterId: 'enc_test',
    patientId: 'patient_test',
    priority: 'medium' as const,
    chiefComplaint: 'Dor',
    alerts: ['letargia'],
    destination: 'observation' as const
  };

  await assert.rejects(() =>
    service.createTriage('user_triage' as never, payload, 'acc_test' as never)
  );
  assert.equal(service.list('acc_test' as never).length, 0);

  failCreate = false;
  const created = await service.createTriage('user_triage' as never, payload, 'acc_test' as never);
  failUpdate = true;
  await assert.rejects(
    () => service.updateTriage(created.id, { priority: 'high' }, 'acc_test' as never),
    /triage update failed/
  );
  assert.equal(service.getOrThrow(created.id, 'acc_test' as never).priority, 'medium');
  assert.equal(service.listVersions(created.id, 'acc_test' as never).length, 0);
});

test('triage hydration requires an account context', async () => {
  const repository = {
    async create() {},
    async update() {},
    async createVersion() {},
    async findById() {
      return null;
    },
    async findByEncounterId() {
      return [];
    },
    async findByAccountId() {
      return [];
    },
    async findVersionsByTriageId() {
      return [];
    },
    async findVersionsByAccountId() {
      return [];
    }
  };
  const service = new TriageService(createEncountersStub(), { repository });

  await assert.rejects(
    () => service.hydrateFromDatabase(undefined as never),
    (error: unknown) => {
      assert.equal(error instanceof ValidationError, true);
      return true;
    }
  );

  await assert.rejects(
    () => new TriageService(createEncountersStub()).hydrateFromDatabase(undefined as never),
    (error: unknown) => {
      assert.equal(error instanceof ValidationError, true);
      return true;
    }
  );
});

test('triage collection, history and update remain isolated after two-account hydration', async () => {
  const accountA = 'acc_triage_a';
  const accountB = 'acc_triage_b';
  const record = (accountId: string, id: string): TriageSummary => ({
    id: id as never,
    accountId: accountId as never,
    encounterId: 'enc_shared' as never,
    patientId: 'patient_shared' as never,
    priority: 'medium',
    chiefComplaint: `Queixa ${accountId}`,
    initialNotes: undefined,
    alerts: [],
    destination: 'observation',
    triagedByUserId: 'user_triage' as never,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z'
  });
  const recordA = record(accountA, 'triage_shared_a');
  const recordB = record(accountB, 'triage_shared_b');
  const versionB: TriageVersionSummary = {
    id: 'triage_version_b' as never,
    triageId: recordB.id,
    accountId: recordB.accountId,
    encounterId: recordB.encounterId,
    changedFields: ['priority'],
    previousSnapshot: {
      priority: 'low',
      chiefComplaint: recordB.chiefComplaint,
      initialNotes: recordB.initialNotes,
      alerts: recordB.alerts,
      destination: recordB.destination,
      updatedAt: recordB.updatedAt
    },
    nextSnapshot: {
      priority: 'medium',
      chiefComplaint: recordB.chiefComplaint,
      initialNotes: recordB.initialNotes,
      alerts: recordB.alerts,
      destination: recordB.destination,
      updatedAt: recordB.updatedAt
    },
    changedByUserId: 'user_triage' as never,
    createdAt: recordB.updatedAt
  };
  const repository = {
    async create() {},
    async update() {},
    async createVersion() {},
    async findById() {
      return null;
    },
    async findByEncounterId() {
      return [];
    },
    async findByAccountId() {
      return [recordA, recordB];
    },
    async findVersionsByTriageId() {
      return [];
    },
    async findVersionsByAccountId() {
      return [versionB];
    }
  };
  const service = new TriageService(createEncountersStub(), { repository });

  await service.hydrateFromDatabase(accountA as never);
  await service.hydrateFromDatabase(accountB as never);

  assert.deepEqual(
    service.list(accountA as never).map((item) => item.id),
    [recordA.id]
  );
  assert.throws(
    () => service.getOrThrow(recordB.id, accountA as never),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    }
  );
  assert.throws(
    () => service.listVersions(recordB.id, accountA as never),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    }
  );
  await assert.rejects(
    () => service.updateTriage(recordB.id, { priority: 'high' }, accountA as never),
    (error: unknown) => {
      assert.equal(error instanceof NotFoundError, true);
      return true;
    }
  );
});

test('createTriage prevents a second initial triage for the same encounter', async () => {
  const service = new TriageService(createEncountersStub());

  await service.createTriage(
    'user_triage' as never,
    {
      encounterId: 'enc_test',
      patientId: 'patient_test',
      priority: 'medium',
      chiefComplaint: 'Vomito',
      alerts: ['desidratacao'],
      destination: 'observation'
    },
    'acc_test' as never
  );

  await assert.rejects(
    () =>
      service.createTriage(
        'user_triage' as never,
        {
          encounterId: 'enc_test',
          patientId: 'patient_test',
          priority: 'critical',
          chiefComplaint: 'Parada respiratoria',
          alerts: ['choque'],
          destination: 'in_care'
        },
        'acc_test' as never
      ),
    (error: unknown) => {
      assert.equal(error instanceof ConflictError, true);
      return true;
    }
  );
});

test('updateTriage updates only allowed clinical fields', async () => {
  const service = new TriageService(createEncountersStub('observation'));

  const created = await service.createTriage(
    'user_triage' as never,
    {
      encounterId: 'enc_test',
      patientId: 'patient_test',
      priority: 'medium',
      chiefComplaint: 'Febre',
      initialNotes: 'Sem apetite',
      alerts: ['letargia'],
      destination: 'observation'
    },
    'acc_test' as never
  );

  const updated = await service.updateTriage(
    created.id,
    {
      priority: 'high',
      chiefComplaint: 'Febre persistente',
      initialNotes: 'Piora clinica nas ultimas horas',
      alerts: ['letargia', 'desidratacao'],
      destination: 'in_care'
    },
    'acc_test' as never
  );

  assert.equal(updated.priority, 'high');
  assert.equal(updated.destination, 'in_care');
  assert.equal(updated.chiefComplaint, 'Febre persistente');
  assert.deepEqual(updated.alerts, ['letargia', 'desidratacao']);
  assert.equal(updated.triagedByUserId, created.triagedByUserId);
  assert.ok(updated.updatedAt >= created.updatedAt);
  assert.equal(service.listVersions(created.id, 'acc_test' as never).length, 1);
  assert.deepEqual(
    service.listVersions(created.id, 'acc_test' as never)[0]?.changedFields.includes('priority'),
    true
  );
});

test('updateTriage rejects changes when encounter is closed', async () => {
  let encounterStatus: 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed' =
    'observation';
  const service = new TriageService(
    {
      getOrThrow: () => createEncounter(encounterStatus)
    } as never
  );

  const created = await service.createTriage(
    'user_triage' as never,
    {
      encounterId: 'enc_test',
      patientId: 'patient_test',
      priority: 'medium',
      chiefComplaint: 'Retorno',
      alerts: ['dor'],
      destination: 'observation'
    },
    'acc_test' as never
  );

  encounterStatus = 'closed';

  await assert.rejects(
    () =>
      service.updateTriage(
        created.id,
        {
          priority: 'high'
        },
        'acc_test' as never
      ),
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
  await service.hydrateFromDatabase('acc_test' as never);

  assert.equal(service.list('acc_test' as never).length, 1);
  assert.equal(
    service.getOrThrow('triage_persisted' as never, 'acc_test' as never).chiefComplaint,
    'Dispneia'
  );
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
  await service.hydrateFromDatabase('acc_test' as never);

  assert.equal(service.listVersions('triage_hist' as never, 'acc_test' as never).length, 1);
  assert.equal(
    service.listVersions('triage_hist' as never, 'acc_test' as never)[0]?.id,
    'triagev_hist'
  );
});
