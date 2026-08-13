import assert from 'node:assert/strict';
import { test } from 'vitest';

import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';

import {
  DatabaseMedicalRecordRepository,
  MedicalRecordsService,
  type ClinicalEntryRepository,
  type ClinicalTimelineRepository,
  type EntryRevisionRepository,
  type MedicalRecordRepository
} from './index.js';

function createService() {
  const medicalRecords: unknown[] = [];
  const entries: unknown[] = [];
  const timeline: unknown[] = [];
  const revisions: unknown[] = [];

  const medicalRecordRepository: MedicalRecordRepository = {
    async create(record) {
      medicalRecords.push(record);
    },
    async update() {},
    async findById() {
      return null;
    },
    async findByEncounterId() {
      return null;
    },
    async findAll() {
      return [];
    }
  };

  const clinicalEntryRepository: ClinicalEntryRepository = {
    async create(entry) {
      entries.push(entry);
    },
    async update() {},
    async findById() {
      return null;
    },
    async findByMedicalRecordId() {
      return [];
    }
  };

  const clinicalTimelineRepository: ClinicalTimelineRepository = {
    async create(event) {
      timeline.push(event);
    },
    async findByMedicalRecordId() {
      return [];
    }
  };

  const entryRevisionRepository: EntryRevisionRepository = {
    async create(revision) {
      revisions.push(revision);
    },
    async findByEntryId() {
      return [];
    }
  };

  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          createdByUserId: 'user_creator'
        };
      }
    } as never,
    patients: {
      getOrThrow(patientId: string) {
        return {
          id: patientId
        };
      }
    } as never,
    medicalRecordRepository,
    clinicalEntryRepository,
    clinicalTimelineRepository,
    entryRevisionRepository
  });

  return { service, medicalRecords, entries, timeline, revisions };
}

test('DatabaseMedicalRecordRepository treats prefixed encounter IDs rejected by UUID columns as missing', async () => {
  const invalidUuidError = Object.assign(
    new Error('invalid input syntax for type uuid: "enc_moged3a3_m57y9s5p"'),
    { code: '22P02' }
  );
  const db = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                async limit() {
                  throw invalidUuidError;
                }
              };
            }
          };
        }
      };
    }
  } as never;

  const repository = new DatabaseMedicalRecordRepository(db);
  const record = await repository.findByEncounterId('enc_moged3a3_m57y9s5p' as never);

  assert.equal(record, null);
});

test('MedicalRecordsService ensureRecord creates record and initial timeline event', async () => {
  const { service, medicalRecords, timeline } = createService();

  const record = service.ensureRecord('encounter_1' as never);
  await service.waitForPersistence();

  assert.equal(record.encounterId, 'encounter_1');
  assert.equal(medicalRecords.length, 1);
  assert.equal(timeline.length, 1);
  assert.equal((timeline[0] as { eventType: string }).eventType, 'record_created');
});

test('MedicalRecordsService addEntry stores entry with version 1', async () => {
  const { service, entries } = createService();

  const entry = service.addEntry('doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'anamnesis',
    title: 'Historico',
    content: 'Paciente com boa evolucao'
  });
  await service.waitForPersistence();

  assert.equal(entry.title, 'Historico');
  assert.equal(entry.version, 1);
  assert.equal(entries.length, 1);
});

test('MedicalRecordsService addEntry stores entry and appends timeline', async () => {
  const { service, entries, timeline } = createService();

  const entry = service.addEntry('doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'anamnesis',
    title: 'Historico',
    content: 'Paciente com boa evolucao'
  });
  await service.waitForPersistence();

  assert.equal(entry.title, 'Historico');
  assert.equal(entries.length, 1);
  assert.equal(timeline.length, 2);
  assert.equal(service.listEntriesByEncounter('encounter_1' as never).length, 1);
  assert.equal(service.listTimelineByEncounter('encounter_1' as never).length, 2);
  assert.equal(service.listTimelineByEncounter('encounter_1' as never)[0].eventType, 'entry_added');
});

test('MedicalRecordsService addEntry rolls back memory when entry persistence fails', async () => {
  const failingService = new MedicalRecordsService({
    encounters: {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          createdByUserId: 'user_creator'
        };
      }
    } as never,
    patients: {
      getOrThrow(patientId: string) {
        return {
          id: patientId
        };
      }
    } as never,
    medicalRecordRepository: {
      async create() {},
      async update() {},
      async findById() {
        return null;
      },
      async findByEncounterId() {
        return null;
      },
      async findAll() {
        return [];
      }
    },
    clinicalEntryRepository: {
      async create() {
        throw new Error('database unavailable');
      },
      async update() {},
      async findById() {
        return null;
      },
      async findByMedicalRecordId() {
        return [];
      }
    },
    clinicalTimelineRepository: {
      async create() {},
      async findByMedicalRecordId() {
        return [];
      }
    }
  });

  const entry = failingService.addEntry('doctor_1' as never, {
    encounterId: 'encounter_rollback',
    patientId: 'patient_1',
    entryType: 'anamnesis',
    title: 'Historico',
    content: 'Conteudo'
  });

  await assert.rejects(() => failingService.waitForPersistence(), /database unavailable/);
  assert.equal(
    failingService
      .listEntriesByEncounter('encounter_rollback' as never, { includeArchived: true })
      .some((item) => item.id === entry.id),
    false
  );
});

test('MedicalRecordsService addEntry rejects patient mismatch', () => {
  const { service } = createService();

  assert.throws(
    () =>
      service.addEntry('doctor_1' as never, {
        encounterId: 'encounter_1',
        patientId: 'patient_other',
        entryType: 'anamnesis',
        title: 'Historico',
        content: 'Conteudo'
      }),
    NotFoundError
  );
});

test('MedicalRecordsService rejects cross-account record and entry access before mutation', async () => {
  const { service } = createService();
  const encounterId = 'encounter_tenant_boundary' as never;
  const expectedAccountId = 'acc_test' as never;
  const foreignAccountId = 'acc_other' as never;

  const record = service.ensureRecord(encounterId, expectedAccountId);
  await service.waitForPersistence();

  await assert.rejects(
    () => service.getRecordOrThrowAsync(record.id, foreignAccountId),
    NotFoundError
  );
  await assert.rejects(
    () => service.listEntriesByEncounterAsync(encounterId, undefined, foreignAccountId),
    NotFoundError
  );
  await assert.rejects(
    () => service.listTimelineByEncounterAsync(encounterId, foreignAccountId),
    NotFoundError
  );

  assert.throws(
    () =>
      service.addEntry(
        'doctor_1' as never,
        {
          encounterId,
          patientId: 'patient_1',
          entryType: 'progress_note',
          title: 'Tentativa entre contas',
          content: 'Nao deve ser persistido'
        },
        foreignAccountId
      ),
    NotFoundError
  );
  assert.equal(
    service.listEntriesByEncounter(encounterId, undefined, expectedAccountId).length,
    0
  );

  const entry = service.addEntry(
    'doctor_1' as never,
    {
      encounterId,
      patientId: 'patient_1',
      entryType: 'progress_note',
      title: 'Registro legitimo',
      content: 'Conteudo original'
    },
    expectedAccountId
  );

  assert.throws(
    () =>
      service.updateEntry(
        'doctor_1' as never,
        entry.id,
        { content: 'Alteracao indevida' },
        foreignAccountId
      ),
    NotFoundError
  );
  assert.throws(
    () =>
      service.archiveEntry(
        'doctor_1' as never,
        entry.id,
        { reason: 'Arquivamento indevido' },
        foreignAccountId
      ),
    NotFoundError
  );
  await assert.rejects(
    () => service.getEntryRevisionsAsync(entry.id, foreignAccountId),
    NotFoundError
  );

  const persistedEntry = service.listEntriesByEncounter(
    encounterId,
    undefined,
    expectedAccountId
  )[0];
  assert.equal(persistedEntry?.version, 1);
  assert.equal(persistedEntry?.content, 'Conteudo original');
  assert.equal(persistedEntry?.deletedAt, undefined);
});

test('MedicalRecordsService updateEntry increments version and creates revision', async () => {
  const { service, revisions } = createService();

  const entry = service.addEntry('doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'anamnesis',
    title: 'Historico',
    content: 'Conteudo original'
  });

  assert.equal(entry.version, 1);

  const updated = service.updateEntry('doctor_1' as never, entry.id as never, {
    title: 'Historico Atualizado',
    content: 'Conteudo revisado',
    reason: 'Correcao de informacao'
  });
  await service.waitForPersistence();

  assert.equal(updated.version, 2);
  assert.equal(updated.title, 'Historico Atualizado');
  assert.equal(updated.content, 'Conteudo revisado');
  assert.equal(revisions.length, 1);

  const revision = revisions[0] as {
    entryId: string;
    version: number;
    title: string;
    content: string;
    reason: string;
  };
  assert.equal(revision.version, 1);
  assert.equal(revision.title, 'Historico');
  assert.equal(revision.content, 'Conteudo original');
  assert.equal(revision.reason, 'Correcao de informacao');
});

test('MedicalRecordsService updateEntry rejects non-existent entry', () => {
  const { service } = createService();

  assert.throws(
    () =>
      service.updateEntry('doctor_1' as never, 'nonexistent' as never, {
        title: 'Should fail'
      }),
    NotFoundError
  );
});

test('MedicalRecordsService getEntryRevisions returns revision history', async () => {
  const { service } = createService();

  const entry = service.addEntry('doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Evolucao',
    content: 'Versao 1'
  });

  service.updateEntry('doctor_1' as never, entry.id as never, {
    content: 'Versao 2',
    reason: 'Atualizacao 1'
  });

  service.updateEntry('doctor_1' as never, entry.id as never, {
    content: 'Versao 3',
    reason: 'Atualizacao 2'
  });
  await service.waitForPersistence();

  const revisions = service.getEntryRevisions(entry.id as never);
  assert.equal(revisions.length, 2);
  assert.equal(revisions[0].version, 1);
  assert.equal(revisions[0].content, 'Versao 1');
  assert.equal(revisions[1].version, 2);
  assert.equal(revisions[1].content, 'Versao 2');

  const entries = service.listEntriesByEncounter('encounter_1' as never);
  assert.equal(entries[0].version, 3);
  assert.equal(entries[0].content, 'Versao 3');
});

test('MedicalRecordsService appends attachment and advanced-care events to timeline', () => {
  const { service } = createService();

  service.ensureRecord('encounter_1' as never);
  service.appendAttachmentEvent(
    'encounter_1' as never,
    'doctor_1' as never,
    'att_1',
    'Anexo laboratorial'
  );
  service.appendAdvancedCareEvent(
    'encounter_1' as never,
    'doctor_1' as never,
    'diagnostic_requested',
    'Ultrassom solicitado'
  );

  const timeline = service.listTimelineByEncounter('encounter_1' as never);
  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].eventType, 'diagnostic_requested');
  assert.equal(timeline[1].eventType, 'attachment_added');
});

test('MedicalRecordsService updateEntry records entry_updated in timeline', async () => {
  const { service } = createService();

  const entry = service.addEntry('doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'assessment',
    title: 'Diagnostico',
    content: 'Inicial'
  });

  service.updateEntry('doctor_1' as never, entry.id as never, {
    content: 'Revisado',
    reason: 'Nova evidencia'
  });
  await service.waitForPersistence();

  const timeline = service.listTimelineByEncounter('encounter_1' as never);
  assert.equal(timeline[0].eventType, 'entry_updated');
  assert.ok(timeline[0].summary.includes('v2'));
});

test('MedicalRecordsService archiveEntry hides entry from active list and preserves history', async () => {
  const { service, revisions } = createService();

  const entry = service.addEntry('doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'assessment',
    title: 'Hipotese diagnostica',
    content: 'Conteudo clinico sensivel'
  });

  const archived = service.archiveEntry('doctor_1' as never, entry.id as never, {
    reason: 'Lancamento duplicado',
    expectedVersion: 1
  });
  await service.waitForPersistence();

  assert.equal(archived.version, 2);
  assert.equal(archived.deleteReason, 'Lancamento duplicado');
  assert.ok(archived.deletedAt);
  assert.equal(service.listEntriesByEncounter('encounter_1' as never).length, 0);
  assert.equal(
    service.listEntriesByEncounter('encounter_1' as never, { includeArchived: true }).length,
    1
  );
  assert.equal(revisions.length, 1);

  const timeline = service.listTimelineByEncounter('encounter_1' as never);
  assert.equal(timeline[0].eventType, 'entry_archived');
});

test('MedicalRecordsService updateEntry blocks stale version updates', () => {
  const { service } = createService();

  const entry = service.addEntry('doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Evolucao',
    content: 'Versao 1'
  });

  service.updateEntry('doctor_1' as never, entry.id as never, {
    content: 'Versao 2',
    expectedVersion: 1,
    reason: 'Atualizacao valida'
  });

  assert.throws(
    () =>
      service.updateEntry('doctor_1' as never, entry.id as never, {
        content: 'Versao stale',
        expectedVersion: 1,
        reason: 'Tentativa stale'
      }),
    ValidationError
  );
});
