import assert from 'node:assert/strict';
import { test } from 'vitest';

import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  EntryRevisionSummary,
  MedicalRecordSummary
} from '@cvg-his-v2/shared-types';

import {
  DatabaseMedicalRecordRepository,
  MedicalRecordsService,
  type MedicalRecordsAtomicPersistence,
  type ClinicalEntryRepository,
  type ClinicalTimelineRepository,
  type EntryRevisionRepository,
  type MedicalRecordRepository
} from './index.js';

function createService() {
  const medicalRecords: MedicalRecordSummary[] = [];
  const entries: ClinicalEntrySummary[] = [];
  const timeline: ClinicalTimelineEventSummary[] = [];
  const revisions: EntryRevisionSummary[] = [];
  let encounterStatus: 'in_care' | 'closed' = 'in_care';
  const transaction = async <T>(_accountId: string, operation: () => Promise<T>): Promise<T> => {
    const snapshot = {
      medicalRecords: [...medicalRecords],
      entries: [...entries],
      timeline: [...timeline],
      revisions: [...revisions]
    };
    try {
      return await operation();
    } catch (error) {
      medicalRecords.splice(0, medicalRecords.length, ...snapshot.medicalRecords);
      entries.splice(0, entries.length, ...snapshot.entries);
      timeline.splice(0, timeline.length, ...snapshot.timeline);
      revisions.splice(0, revisions.length, ...snapshot.revisions);
      throw error;
    }
  };

  const medicalRecordRepository: MedicalRecordRepository = {
    async create(record) {
      medicalRecords.push(record);
    },
    async update(record) {
      const index = medicalRecords.findIndex((candidate) => candidate.id === record.id);
      if (index !== -1) medicalRecords[index] = { ...record };
    },
    async findById(id) {
      return medicalRecords.find((record) => record.id === id) ?? null;
    },
    async findByEncounterId(encounterId) {
      return medicalRecords.find((record) => record.encounterId === encounterId) ?? null;
    },
    async findAll(accountId) {
      return medicalRecords.filter((record) => record.accountId === accountId);
    }
  };

  const clinicalEntryRepository: ClinicalEntryRepository = {
    async create(entry) {
      entries.push(entry);
    },
    async update(entry) {
      const index = entries.findIndex((candidate) => candidate.id === entry.id);
      if (index !== -1) entries[index] = { ...entry };
    },
    async findById(entryId) {
      return entries.find((entry) => entry.id === entryId) ?? null;
    },
    async findByMedicalRecordId(medicalRecordId) {
      return entries.filter((entry) => entry.medicalRecordId === medicalRecordId);
    }
  };

  const clinicalTimelineRepository: ClinicalTimelineRepository = {
    async create(event) {
      timeline.push(event);
    },
    async findByMedicalRecordId(medicalRecordId) {
      return timeline.filter((event) => event.medicalRecordId === medicalRecordId);
    }
  };

  const entryRevisionRepository: EntryRevisionRepository = {
    async create(revision) {
      revisions.push(revision);
    },
    async findByEntryId(entryId) {
      return revisions.filter((revision) => revision.entryId === entryId);
    }
  };

  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          status: encounterStatus,
          createdByUserId: 'user_creator'
        };
      }
    } as never,
    patients: {
      getOrThrow(patientId: string) {
        return {
          id: patientId,
          accountId: 'acc_test'
        };
      }
    } as never,
    medicalRecordRepository,
    clinicalEntryRepository,
    clinicalTimelineRepository,
    entryRevisionRepository,
    atomicPersistence: {
      async persistRecordCreation(input) {
        await transaction(input.record.accountId, async () => {
          await medicalRecordRepository.create(input.record);
          await clinicalTimelineRepository.create(input.recordCreatedEvent);
        });
        return {
          operation: 'record_creation' as const,
          recordId: input.record.id,
          timelineEventIds: [input.recordCreatedEvent.id]
        };
      },
      async persistEntryCreation(input) {
        await transaction(input.record.accountId, async () => {
          if (input.recordCreatedEvent) {
            await medicalRecordRepository.create(input.record);
            await clinicalTimelineRepository.create(input.recordCreatedEvent);
          } else {
            await medicalRecordRepository.update(input.updatedRecord);
          }
          await clinicalEntryRepository.create(input.entry);
          await clinicalTimelineRepository.create(input.entryEvent);
        });
        return {
          operation: 'entry_creation' as const,
          recordId: input.record.id,
          entryId: input.entry.id,
          timelineEventIds: [
            ...(input.recordCreatedEvent ? [input.recordCreatedEvent.id] : []),
            input.entryEvent.id
          ]
        };
      },
      async persistEntryMutation(input) {
        await transaction(input.record.accountId, async () => {
          await clinicalEntryRepository.update(input.updatedEntry, input.previousEntry.version);
          await entryRevisionRepository.create(input.revision);
          await clinicalTimelineRepository.create(input.timelineEvent);
          await medicalRecordRepository.update(input.updatedRecord);
        });
        return {
          operation: 'entry_mutation' as const,
          recordId: input.record.id,
          entryId: input.updatedEntry.id,
          revisionId: input.revision.id,
          timelineEventIds: [input.timelineEvent.id],
          persistedVersion: input.updatedEntry.version
        };
      }
    } satisfies MedicalRecordsAtomicPersistence
  });

  return {
    service,
    medicalRecords,
    entries,
    timeline,
    revisions,
    setEncounterStatus(status: 'in_care' | 'closed') {
      encounterStatus = status;
    }
  };
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

  const record = service.ensureRecord('acc_test' as never, 'encounter_1' as never);
  await service.waitForPersistence();

  assert.equal(record.encounterId, 'encounter_1');
  assert.equal(medicalRecords.length, 1);
  assert.equal(timeline.length, 1);
  assert.equal((timeline[0] as { eventType: string }).eventType, 'record_created');
});

test('MedicalRecordsService addEntry stores entry with version 1', async () => {
  const { service, entries } = createService();

  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
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

  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'anamnesis',
    title: 'Historico',
    content: 'Paciente com boa evolucao'
  });
  await service.waitForPersistence();

  assert.equal(entry.title, 'Historico');
  assert.equal(entries.length, 1);
  assert.equal(
    service.listEntriesByEncounter('acc_test' as never, 'encounter_1' as never).length,
    1
  );
  assert.equal(
    service.listTimelineByEncounter('acc_test' as never, 'encounter_1' as never).length,
    2
  );
  assert.equal(
    service.listTimelineByEncounter('acc_test' as never, 'encounter_1' as never)[0].eventType,
    'entry_added'
  );
});

test('MedicalRecordsService blocks synchronous persistent compatibility writes before cache mutation', async () => {
  const { service } = createService();

  assert.throws(
    () =>
      service.addEntry('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_1',
        patientId: 'patient_1',
        entryType: 'progress_note',
        title: 'Síncrono bloqueado',
        content: 'Não deve publicar cache'
      }),
    /requires createEntryAtomically/
  );
  assert.deepEqual(await service.listAll('acc_test' as never), []);

  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Persistido',
    content: 'Entrada durável'
  });
  assert.throws(
    () =>
      service.updateEntry('acc_test' as never, 'doctor_1' as never, entry.id, {
        content: 'Não deve atualizar'
      }),
    /updateEntryAtomically/
  );
  assert.throws(
    () =>
      service.archiveEntry('acc_test' as never, 'doctor_1' as never, entry.id, {
        reason: 'Não deve arquivar'
      }),
    /archiveEntryAtomically/
  );
  assert.equal(
    service.listEntriesByEncounter('acc_test' as never, 'encounter_1' as never)[0]?.content,
    'Entrada durável'
  );
});

test('MedicalRecordsService uses the in-memory atomic fallback for synthetic account IDs', async () => {
  const { service, entries, timeline } = createService();

  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'anamnesis',
    title: 'Anamnese inicial',
    content: 'Fluxo de demonstração'
  });

  assert.equal(entry.title, 'Anamnese inicial');
  assert.equal(entries.length, 1);
  assert.equal(timeline.length, 2);
  assert.equal(
    service.listEntriesByEncounter('acc_test' as never, 'encounter_1' as never).length,
    1
  );
});

test('MedicalRecordsService addEntry rolls back memory when entry persistence fails', async () => {
  let failNextEntryPersistence = true;
  let persistedRecord: MedicalRecordSummary | undefined;
  const persistedEntries: ClinicalEntrySummary[] = [];
  const persistedTimeline: ClinicalTimelineEventSummary[] = [];
  const persistedEntryIds: string[] = [];
  const failingService = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
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
          id: patientId,
          accountId: 'acc_test'
        };
      }
    } as never,
    medicalRecordRepository: {
      async create(record) {
        persistedRecord = { ...record };
      },
      async update() {},
      async findById() {
        return persistedRecord ?? null;
      },
      async findByEncounterId() {
        return persistedRecord ?? null;
      },
      async findAll() {
        return persistedRecord ? [persistedRecord] : [];
      }
    },
    clinicalEntryRepository: {
      async create(entry) {
        persistedEntries.push({ ...entry });
      },
      async update() {},
      async findById(entryId) {
        return persistedEntries.find((entry) => entry.id === entryId) ?? null;
      },
      async findByMedicalRecordId(recordId) {
        return persistedEntries.filter((entry) => entry.medicalRecordId === recordId);
      }
    },
    clinicalTimelineRepository: {
      async create(event) {
        persistedTimeline.push({ ...event });
      },
      async findByMedicalRecordId(recordId) {
        return persistedTimeline.filter((event) => event.medicalRecordId === recordId);
      }
    },
    atomicPersistence: {
      async persistRecordCreation() {
        throw new Error('record creation is not used by this test');
      },
      async persistEntryCreation(input) {
        if (failNextEntryPersistence) {
          failNextEntryPersistence = false;
          throw new Error('database unavailable');
        }
        persistedRecord = { ...input.updatedRecord };
        persistedEntries.push({ ...input.entry });
        if (input.recordCreatedEvent) persistedTimeline.push({ ...input.recordCreatedEvent });
        persistedTimeline.push({ ...input.entryEvent });
        persistedEntryIds.push(input.entry.id);
        return {
          operation: 'entry_creation' as const,
          recordId: input.record.id,
          entryId: input.entry.id,
          timelineEventIds: [
            ...(input.recordCreatedEvent ? [input.recordCreatedEvent.id] : []),
            input.entryEvent.id
          ]
        };
      },
      async persistEntryMutation() {
        throw new Error('entry mutation is not used by this test');
      }
    }
  });

  await assert.rejects(
    () =>
      failingService.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_rollback',
        patientId: 'patient_1',
        entryType: 'anamnesis',
        title: 'Historico',
        content: 'Conteudo'
      }),
    /database unavailable/
  );
  assert.equal(
    failingService.listEntriesByEncounter('acc_test' as never, 'encounter_rollback' as never, {
      includeArchived: true
    }).length,
    0
  );

  const recoveredEntry = await failingService.createEntryAtomically(
    'acc_test' as never,
    'doctor_1' as never,
    {
      encounterId: 'encounter_rollback',
      patientId: 'patient_1',
      entryType: 'progress_note',
      title: 'Persistencia recuperada',
      content: 'A fila deve aceitar novas escritas após a falha anterior.'
    }
  );
  await failingService.waitForPersistence();
  assert.deepEqual(persistedEntryIds, [recoveredEntry.id]);
});

test('MedicalRecordsService addEntry rejects patient mismatch without creating residual state', async () => {
  const { service, medicalRecords, timeline } = createService();

  await assert.rejects(
    () =>
      service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_1',
        patientId: 'patient_other',
        entryType: 'anamnesis',
        title: 'Historico',
        content: 'Conteudo'
      }),
    NotFoundError
  );
  await service.waitForPersistence();
  assert.equal(medicalRecords.length, 0);
  assert.equal(timeline.length, 0);
  assert.equal(
    service.snapshotEncounter('acc_test' as never, 'encounter_1' as never).record,
    undefined
  );
});

test('MedicalRecordsService validates entry content before creating a medical record', async () => {
  const { service, medicalRecords, timeline } = createService();

  await assert.rejects(
    () =>
      service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_1',
        patientId: 'patient_1',
        entryType: 'anamnesis',
        title: '',
        content: 'Não deve criar prontuário'
      }),
    ValidationError
  );
  await assert.rejects(
    () =>
      service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_1',
        patientId: 'patient_1',
        entryType: 'anamnesis',
        title: 'Título válido',
        content: 'x'.repeat(10001)
      }),
    ValidationError
  );

  await service.waitForPersistence();
  assert.equal(medicalRecords.length, 0);
  assert.equal(timeline.length, 0);
  assert.equal(
    service.snapshotEncounter('acc_test' as never, 'encounter_1' as never).record,
    undefined
  );
});

test('MedicalRecordsService propagates update and archive persistence failures as one mutation', async () => {
  let failEntryUpdate = false;
  let persistedRecord: MedicalRecordSummary | undefined;
  const persistedEntries: ClinicalEntrySummary[] = [];
  const persistedRevisions: EntryRevisionSummary[] = [];
  const persistedTimeline: ClinicalTimelineEventSummary[] = [];
  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          status: 'in_care',
          createdByUserId: 'user_creator'
        };
      }
    } as never,
    patients: {
      getOrThrow(patientId: string) {
        return { id: patientId, accountId: 'acc_test' };
      }
    } as never,
    medicalRecordRepository: {
      async create(record) {
        persistedRecord = { ...record };
      },
      async update(record) {
        persistedRecord = { ...record };
      },
      async findById() {
        return persistedRecord ?? null;
      },
      async findByEncounterId() {
        return persistedRecord ?? null;
      },
      async findAll() {
        return persistedRecord ? [persistedRecord] : [];
      }
    },
    clinicalEntryRepository: {
      async create(entry) {
        persistedEntries.push({ ...entry });
      },
      async update(entry) {
        if (failEntryUpdate) throw new Error('entry persistence unavailable');
        const index = persistedEntries.findIndex((candidate) => candidate.id === entry.id);
        if (index !== -1) persistedEntries[index] = { ...entry };
      },
      async findById(entryId) {
        return persistedEntries.find((entry) => entry.id === entryId) ?? null;
      },
      async findByMedicalRecordId(recordId) {
        return persistedEntries.filter((entry) => entry.medicalRecordId === recordId);
      }
    },
    clinicalTimelineRepository: {
      async create(event) {
        persistedTimeline.push(event);
      },
      async findByMedicalRecordId(recordId) {
        return persistedTimeline.filter((event) => event.medicalRecordId === recordId);
      }
    },
    entryRevisionRepository: {
      async create(revision) {
        persistedRevisions.push(revision);
      },
      async findByEntryId(entryId) {
        return persistedRevisions.filter((revision) => revision.entryId === entryId);
      }
    },
    atomicPersistence: {
      async persistRecordCreation(input) {
        return {
          operation: 'record_creation' as const,
          recordId: input.record.id,
          timelineEventIds: [input.recordCreatedEvent.id]
        };
      },
      async persistEntryCreation(input) {
        persistedRecord = { ...input.updatedRecord };
        persistedEntries.push({ ...input.entry });
        if (input.recordCreatedEvent) persistedTimeline.push({ ...input.recordCreatedEvent });
        persistedTimeline.push({ ...input.entryEvent });
        return {
          operation: 'entry_creation' as const,
          recordId: input.record.id,
          entryId: input.entry.id,
          timelineEventIds: [
            ...(input.recordCreatedEvent ? [input.recordCreatedEvent.id] : []),
            input.entryEvent.id
          ]
        };
      },
      async persistEntryMutation(input) {
        if (failEntryUpdate) throw new Error('entry persistence unavailable');
        const entryIndex = persistedEntries.findIndex(
          (entry) => entry.id === input.updatedEntry.id
        );
        if (entryIndex !== -1) persistedEntries[entryIndex] = { ...input.updatedEntry };
        persistedRevisions.push({ ...input.revision });
        persistedTimeline.push({ ...input.timelineEvent });
        persistedRecord = { ...input.updatedRecord };
        return {
          operation: 'entry_mutation' as const,
          recordId: input.record.id,
          entryId: input.updatedEntry.id,
          revisionId: input.revision.id,
          timelineEventIds: [input.timelineEvent.id],
          persistedVersion: input.updatedEntry.version
        };
      }
    }
  });

  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Versão original',
    content: 'Conteúdo original'
  });
  await service.waitForPersistence();

  failEntryUpdate = true;
  await assert.rejects(
    () =>
      service.updateEntryAtomically('acc_test' as never, 'doctor_1' as never, entry.id, {
        content: 'Não deve persistir',
        reason: 'Falha simulada'
      }),
    /entry persistence unavailable/
  );
  assert.equal(
    service.listEntriesByEncounter('acc_test' as never, 'encounter_1' as never)[0]?.content,
    'Conteúdo original'
  );
  assert.equal(persistedRevisions.length, 0);
  assert.equal(
    persistedTimeline.some((event) => event.eventType === 'entry_updated'),
    false
  );

  failEntryUpdate = false;
  await service.updateEntryAtomically('acc_test' as never, 'doctor_1' as never, entry.id, {
    content: 'Atualização persistida',
    reason: 'Correção'
  });
  assert.equal(persistedRevisions.length, 1);

  failEntryUpdate = true;
  await assert.rejects(
    () =>
      service.archiveEntryAtomically('acc_test' as never, 'doctor_1' as never, entry.id, {
        reason: 'Não deve arquivar'
      }),
    /entry persistence unavailable/
  );
  const afterArchiveFailure = service.listEntriesByEncounter(
    'acc_test' as never,
    'encounter_1' as never,
    { includeArchived: true }
  )[0];
  assert.equal(afterArchiveFailure?.deletedAt, undefined);
  assert.equal(afterArchiveFailure?.version, 2);
  assert.equal(persistedRevisions.length, 1);
  assert.equal(
    persistedTimeline.some((event) => event.eventType === 'entry_archived'),
    false
  );
});

test('MedicalRecordsService fallback transaction rolls back late repository writes', async () => {
  let failTimelinePersistence = false;
  let persistedRecord: MedicalRecordSummary | undefined;
  let persistedEntries: ClinicalEntrySummary[] = [];
  let persistedRevisions: EntryRevisionSummary[] = [];
  let persistedTimeline: ClinicalTimelineEventSummary[] = [];

  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          status: 'in_care',
          createdByUserId: 'user_creator'
        };
      }
    } as never,
    patients: {
      getOrThrow(patientId: string) {
        return { id: patientId, accountId: 'acc_test' };
      }
    } as never,
    medicalRecordRepository: {
      async create(record) {
        persistedRecord = { ...record };
      },
      async update(record) {
        persistedRecord = { ...record };
      },
      async findById() {
        return persistedRecord ?? null;
      },
      async findByEncounterId() {
        return persistedRecord ?? null;
      },
      async findAll() {
        return persistedRecord ? [persistedRecord] : [];
      }
    },
    clinicalEntryRepository: {
      async create(entry) {
        persistedEntries = [...persistedEntries, { ...entry }];
      },
      async update(entry) {
        persistedEntries = persistedEntries.map((candidate) =>
          candidate.id === entry.id ? { ...entry } : candidate
        );
      },
      async findById(entryId) {
        return persistedEntries.find((entry) => entry.id === entryId) ?? null;
      },
      async findByMedicalRecordId(recordId) {
        return persistedEntries.filter((entry) => entry.medicalRecordId === recordId);
      }
    },
    clinicalTimelineRepository: {
      async create(event) {
        if (failTimelinePersistence) {
          throw new Error('timeline persistence unavailable');
        }
        persistedTimeline = [...persistedTimeline, { ...event }];
      },
      async findByMedicalRecordId(recordId) {
        return persistedTimeline.filter((event) => event.medicalRecordId === recordId);
      }
    },
    entryRevisionRepository: {
      async create(revision) {
        persistedRevisions = [...persistedRevisions, { ...revision }];
      },
      async findByEntryId(entryId) {
        return persistedRevisions.filter((revision) => revision.entryId === entryId);
      }
    },
    atomicPersistence: {
      async persistRecordCreation(input) {
        const snapshot = {
          persistedRecord,
          persistedEntries: persistedEntries.map((entry) => ({ ...entry })),
          persistedRevisions: persistedRevisions.map((revision) => ({ ...revision })),
          persistedTimeline: persistedTimeline.map((event) => ({ ...event }))
        };
        try {
          persistedRecord = { ...input.record };
          persistedTimeline = [...persistedTimeline, { ...input.recordCreatedEvent }];
          return {
            operation: 'record_creation' as const,
            recordId: input.record.id,
            timelineEventIds: [input.recordCreatedEvent.id]
          };
        } catch (error) {
          persistedRecord = snapshot.persistedRecord;
          persistedEntries = snapshot.persistedEntries;
          persistedRevisions = snapshot.persistedRevisions;
          persistedTimeline = snapshot.persistedTimeline;
          throw error;
        }
      },
      async persistEntryCreation(input) {
        const snapshot = {
          persistedRecord,
          persistedEntries: persistedEntries.map((entry) => ({ ...entry })),
          persistedRevisions: persistedRevisions.map((revision) => ({ ...revision })),
          persistedTimeline: persistedTimeline.map((event) => ({ ...event }))
        };
        try {
          persistedRecord = { ...input.updatedRecord };
          persistedEntries = [...persistedEntries, { ...input.entry }];
          if (input.recordCreatedEvent) {
            persistedTimeline = [...persistedTimeline, { ...input.recordCreatedEvent }];
          }
          persistedTimeline = [...persistedTimeline, { ...input.entryEvent }];
          return {
            operation: 'entry_creation' as const,
            recordId: input.record.id,
            entryId: input.entry.id,
            timelineEventIds: [
              ...(input.recordCreatedEvent ? [input.recordCreatedEvent.id] : []),
              input.entryEvent.id
            ]
          };
        } catch (error) {
          persistedRecord = snapshot.persistedRecord;
          persistedEntries = snapshot.persistedEntries;
          persistedRevisions = snapshot.persistedRevisions;
          persistedTimeline = snapshot.persistedTimeline;
          throw error;
        }
      },
      async persistEntryMutation(input) {
        const snapshot = {
          persistedRecord,
          persistedEntries: persistedEntries.map((entry) => ({ ...entry })),
          persistedRevisions: persistedRevisions.map((revision) => ({ ...revision })),
          persistedTimeline: persistedTimeline.map((event) => ({ ...event }))
        };
        try {
          persistedEntries = persistedEntries.map((candidate) =>
            candidate.id === input.updatedEntry.id ? { ...input.updatedEntry } : candidate
          );
          persistedRevisions = [...persistedRevisions, { ...input.revision }];
          if (failTimelinePersistence) {
            throw new Error('timeline persistence unavailable');
          }
          persistedTimeline = [...persistedTimeline, { ...input.timelineEvent }];
          persistedRecord = { ...input.updatedRecord };
          return {
            operation: 'entry_mutation' as const,
            recordId: input.record.id,
            entryId: input.updatedEntry.id,
            revisionId: input.revision.id,
            timelineEventIds: [input.timelineEvent.id],
            persistedVersion: input.updatedEntry.version
          };
        } catch (error) {
          persistedRecord = snapshot.persistedRecord;
          persistedEntries = snapshot.persistedEntries;
          persistedRevisions = snapshot.persistedRevisions;
          persistedTimeline = snapshot.persistedTimeline;
          throw error;
        }
      }
    }
  });

  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_atomic_fallback',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Versão original',
    content: 'Conteúdo original'
  });
  await service.waitForPersistence();

  failTimelinePersistence = true;
  await assert.rejects(
    () =>
      service.updateEntryAtomically('acc_test' as never, 'doctor_1' as never, entry.id, {
        content: 'Não deve persistir',
        reason: 'Falha tardia'
      }),
    /timeline persistence unavailable/
  );

  assert.equal(persistedEntries[0]?.content, 'Conteúdo original');
  assert.equal(persistedRevisions.length, 0);
  assert.equal(
    persistedTimeline.some((event) => event.eventType === 'entry_updated'),
    false
  );
  assert.equal(
    service.listEntriesByEncounter('acc_test' as never, 'encounter_atomic_fallback' as never)[0]
      ?.content,
    'Conteúdo original'
  );
});

test('MedicalRecordsService rejects entry writes after encounter closure', async () => {
  const { service, setEncounterStatus } = createService();
  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Evolucao',
    content: 'Paciente estavel'
  });
  setEncounterStatus('closed');

  await assert.rejects(
    () =>
      service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_1',
        patientId: 'patient_1',
        entryType: 'progress_note',
        title: 'Alteracao tardia',
        content: 'Nao deve ser aceita'
      }),
    /Closed encounter is read-only/
  );
  await assert.rejects(
    () =>
      service.updateEntryAtomically('acc_test' as never, 'doctor_1' as never, entry.id as never, {
        content: 'Alteracao tardia',
        reason: 'Tentativa apos fechamento'
      }),
    /Closed encounter is read-only/
  );
  await assert.rejects(
    () =>
      service.archiveEntryAtomically('acc_test' as never, 'doctor_1' as never, entry.id as never, {
        reason: 'Tentativa apos fechamento'
      }),
    /Closed encounter is read-only/
  );
  assert.throws(
    () =>
      service.appendAttachmentEvent(
        'acc_test' as never,
        'encounter_1' as never,
        'doctor_1' as never,
        'attachment_1',
        'Exame tardio'
      ),
    /Closed encounter is read-only/
  );
  assert.throws(
    () =>
      service.appendAdvancedCareEvent(
        'acc_test' as never,
        'encounter_1' as never,
        'doctor_1' as never,
        'diagnostic_requested',
        'Pedido tardio'
      ),
    /Closed encounter is read-only/
  );
});

test('MedicalRecordsService does not create a missing record for a closed encounter', () => {
  const { service, setEncounterStatus } = createService();
  setEncounterStatus('closed');

  assert.throws(
    () => service.getRecordByEncounterOrThrow('acc_test' as never, 'encounter_1' as never),
    /Closed encounter is read-only/
  );
});

test('MedicalRecordsService hydrates repository entries before update after cache cold start', async () => {
  const record = {
    id: 'record_1',
    accountId: 'acc_test',
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    status: 'open',
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  };
  const entry = {
    id: 'entry_1',
    accountId: 'acc_test',
    medicalRecordId: 'record_1',
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Evolucao',
    content: 'Original',
    authoredByUserId: 'doctor_1',
    version: 1,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  };
  let persistedRecord: MedicalRecordSummary = record as never;
  let persistedEntry: ClinicalEntrySummary = entry as never;
  const persistedTimeline: ClinicalTimelineEventSummary[] = [];
  const persistedRevisions: EntryRevisionSummary[] = [];
  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow() {
        return {
          id: 'encounter_1',
          accountId: 'acc_test',
          patientId: 'patient_1',
          status: 'in_care',
          createdByUserId: 'user_creator'
        };
      }
    } as never,
    patients: {
      getOrThrow: () => ({ id: 'patient_1', accountId: 'acc_test' })
    } as never,
    medicalRecordRepository: {
      async create() {},
      async update(updatedRecord) {
        persistedRecord = { ...updatedRecord };
      },
      async findById() {
        return persistedRecord;
      },
      async findByEncounterId() {
        return persistedRecord;
      },
      async findAll() {
        return [persistedRecord];
      }
    },
    clinicalEntryRepository: {
      async create() {},
      async update(updatedEntry) {
        persistedEntry = { ...updatedEntry };
      },
      async findById() {
        return persistedEntry;
      },
      async findByMedicalRecordId() {
        return [persistedEntry];
      }
    },
    clinicalTimelineRepository: {
      async create(event) {
        persistedTimeline.push({ ...event });
      },
      async findByMedicalRecordId() {
        return persistedTimeline;
      }
    },
    entryRevisionRepository: {
      async create(revision) {
        persistedRevisions.push({ ...revision });
      },
      async findByEntryId() {
        return persistedRevisions;
      }
    },
    atomicPersistence: {
      async persistRecordCreation(input) {
        return {
          operation: 'record_creation' as const,
          recordId: input.record.id,
          timelineEventIds: [input.recordCreatedEvent.id]
        };
      },
      async persistEntryCreation(input) {
        return {
          operation: 'entry_creation' as const,
          recordId: input.record.id,
          entryId: input.entry.id,
          timelineEventIds: [
            ...(input.recordCreatedEvent ? [input.recordCreatedEvent.id] : []),
            input.entryEvent.id
          ]
        };
      },
      async persistEntryMutation(input) {
        persistedEntry = { ...input.updatedEntry };
        persistedRecord = { ...input.updatedRecord };
        persistedRevisions.push({ ...input.revision });
        persistedTimeline.push({ ...input.timelineEvent });
        return {
          operation: 'entry_mutation' as const,
          recordId: input.record.id,
          entryId: input.updatedEntry.id,
          revisionId: input.revision.id,
          timelineEventIds: [input.timelineEvent.id],
          persistedVersion: input.updatedEntry.version
        };
      }
    }
  });

  await service.getEntryOrThrowAsync('acc_test' as never, 'entry_1' as never);
  const updated = await service.updateEntryAtomically(
    'acc_test' as never,
    'doctor_1' as never,
    'entry_1' as never,
    {
      content: 'Atualizada após restart',
      reason: 'Correção clínica'
    }
  );

  assert.equal(updated.version, 2);
  assert.equal(updated.content, 'Atualizada após restart');
});

test('MedicalRecordsService updateEntry increments version and creates revision', async () => {
  const { service, revisions } = createService();

  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'anamnesis',
    title: 'Historico',
    content: 'Conteudo original'
  });

  assert.equal(entry.version, 1);

  const updated = await service.updateEntryAtomically(
    'acc_test' as never,
    'doctor_1' as never,
    entry.id as never,
    {
      title: 'Historico Atualizado',
      content: 'Conteudo revisado',
      reason: 'Correcao de informacao'
    }
  );

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

test('MedicalRecordsService updateEntry rejects non-existent entry', async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.updateEntryAtomically(
        'acc_test' as never,
        'doctor_1' as never,
        'nonexistent' as never,
        {
          title: 'Should fail'
        }
      ),
    NotFoundError
  );
});

test('MedicalRecordsService getEntryRevisions returns revision history', async () => {
  const { service } = createService();

  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Evolucao',
    content: 'Versao 1'
  });

  await service.updateEntryAtomically('acc_test' as never, 'doctor_1' as never, entry.id as never, {
    content: 'Versao 2',
    reason: 'Atualizacao 1'
  });

  await service.updateEntryAtomically('acc_test' as never, 'doctor_1' as never, entry.id as never, {
    content: 'Versao 3',
    reason: 'Atualizacao 2'
  });
  await service.waitForPersistence();

  const revisions = service.getEntryRevisions('acc_test' as never, entry.id as never);
  assert.equal(revisions.length, 2);
  assert.equal(revisions[0].version, 1);
  assert.equal(revisions[0].content, 'Versao 1');
  assert.equal(revisions[1].version, 2);
  assert.equal(revisions[1].content, 'Versao 2');

  const entries = service.listEntriesByEncounter('acc_test' as never, 'encounter_1' as never);
  assert.equal(entries[0].version, 3);
  assert.equal(entries[0].content, 'Versao 3');
});

test('MedicalRecordsService appends attachment and advanced-care events to timeline', () => {
  const { service } = createService();

  service.ensureRecord('acc_test' as never, 'encounter_1' as never);
  service.appendAttachmentEvent(
    'acc_test' as never,
    'encounter_1' as never,
    'doctor_1' as never,
    'att_1',
    'Anexo laboratorial'
  );
  service.appendAdvancedCareEvent(
    'acc_test' as never,
    'encounter_1' as never,
    'doctor_1' as never,
    'diagnostic_requested',
    'Ultrassom solicitado'
  );

  const timeline = service.listTimelineByEncounter('acc_test' as never, 'encounter_1' as never);
  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].eventType, 'diagnostic_requested');
  assert.equal(timeline[1].eventType, 'attachment_added');
});

test('MedicalRecordsService updateEntry records entry_updated in timeline', async () => {
  const { service } = createService();

  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'assessment',
    title: 'Diagnostico',
    content: 'Inicial'
  });

  await service.updateEntryAtomically('acc_test' as never, 'doctor_1' as never, entry.id as never, {
    content: 'Revisado',
    reason: 'Nova evidencia'
  });
  await service.waitForPersistence();

  const timeline = service.listTimelineByEncounter('acc_test' as never, 'encounter_1' as never);
  assert.equal(timeline[0].eventType, 'entry_updated');
  assert.ok(timeline[0].summary.includes('v2'));
});

test('MedicalRecordsService archiveEntry hides entry from active list and preserves history', async () => {
  const { service, revisions } = createService();

  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'assessment',
    title: 'Hipotese diagnostica',
    content: 'Conteudo clinico sensivel'
  });

  const archived = await service.archiveEntryAtomically(
    'acc_test' as never,
    'doctor_1' as never,
    entry.id as never,
    {
      reason: 'Lancamento duplicado',
      expectedVersion: 1
    }
  );
  await service.waitForPersistence();

  assert.equal(archived.version, 2);
  assert.equal(archived.deleteReason, 'Lancamento duplicado');
  assert.ok(archived.deletedAt);
  assert.equal(
    service.listEntriesByEncounter('acc_test' as never, 'encounter_1' as never).length,
    0
  );
  assert.equal(
    service.listEntriesByEncounter('acc_test' as never, 'encounter_1' as never, {
      includeArchived: true
    }).length,
    1
  );
  assert.equal(revisions.length, 1);

  const timeline = service.listTimelineByEncounter('acc_test' as never, 'encounter_1' as never);
  assert.equal(timeline[0].eventType, 'entry_archived');
});

test('MedicalRecordsService updateEntry blocks stale version updates', async () => {
  const { service } = createService();

  const entry = await service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Evolucao',
    content: 'Versao 1'
  });

  await service.updateEntryAtomically('acc_test' as never, 'doctor_1' as never, entry.id as never, {
    content: 'Versao 2',
    expectedVersion: 1,
    reason: 'Atualizacao valida'
  });

  await assert.rejects(
    () =>
      service.updateEntryAtomically('acc_test' as never, 'doctor_1' as never, entry.id as never, {
        content: 'Versao stale',
        expectedVersion: 1,
        reason: 'Tentativa stale'
      }),
    ValidationError
  );
});

test('MedicalRecordsService requires account scope for cached records and entries', async () => {
  const record = {
    id: 'record_account_a',
    accountId: 'account_a',
    encounterId: 'encounter_account_a',
    patientId: 'patient_account_a',
    status: 'open' as const,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  };
  const entry = {
    id: 'entry_account_a',
    accountId: 'account_a',
    medicalRecordId: record.id,
    encounterId: record.encounterId,
    patientId: record.patientId,
    entryType: 'progress_note' as const,
    title: 'Conta A',
    content: 'Conteúdo privado da conta A',
    authoredByUserId: 'doctor_a',
    version: 1,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
  let persistedRecord: MedicalRecordSummary = record as never;
  let persistedEntry: ClinicalEntrySummary = entry as never;
  const persistedRevisions: EntryRevisionSummary[] = [];
  const persistedTimeline: ClinicalTimelineEventSummary[] = [];
  let updateCalls = 0;
  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow() {
        return {
          id: record.encounterId,
          accountId: record.accountId,
          patientId: record.patientId,
          status: 'in_care',
          createdByUserId: 'doctor_a'
        };
      }
    } as never,
    patients: {
      getOrThrow: () => ({ id: record.patientId, accountId: record.accountId })
    } as never,
    medicalRecordRepository: {
      async create() {},
      async update(updatedRecord) {
        persistedRecord = { ...updatedRecord };
      },
      async findById() {
        return persistedRecord;
      },
      async findByEncounterId() {
        return persistedRecord;
      },
      async findAll() {
        return [persistedRecord];
      }
    },
    clinicalEntryRepository: {
      async create() {},
      async update(updatedEntry) {
        updateCalls += 1;
        persistedEntry = { ...updatedEntry };
      },
      async findById() {
        return persistedEntry;
      },
      async findByMedicalRecordId() {
        return [persistedEntry];
      }
    },
    clinicalTimelineRepository: {
      async create(event) {
        persistedTimeline.push({ ...event });
      },
      async findByMedicalRecordId() {
        return persistedTimeline;
      }
    },
    entryRevisionRepository: {
      async create(revision) {
        persistedRevisions.push({ ...revision });
      },
      async findByEntryId() {
        return persistedRevisions;
      }
    },
    atomicPersistence: {
      async persistRecordCreation(input) {
        return {
          operation: 'record_creation' as const,
          recordId: input.record.id,
          timelineEventIds: [input.recordCreatedEvent.id]
        };
      },
      async persistEntryCreation(input) {
        return {
          operation: 'entry_creation' as const,
          recordId: input.record.id,
          entryId: input.entry.id,
          timelineEventIds: [
            ...(input.recordCreatedEvent ? [input.recordCreatedEvent.id] : []),
            input.entryEvent.id
          ]
        };
      },
      async persistEntryMutation(input) {
        updateCalls += 1;
        persistedEntry = { ...input.updatedEntry };
        persistedRecord = { ...input.updatedRecord };
        persistedRevisions.push({ ...input.revision });
        persistedTimeline.push({ ...input.timelineEvent });
        return {
          operation: 'entry_mutation' as const,
          recordId: input.record.id,
          entryId: input.updatedEntry.id,
          revisionId: input.revision.id,
          timelineEventIds: [input.timelineEvent.id],
          persistedVersion: input.updatedEntry.version
        };
      }
    }
  });

  await assert.rejects(
    () => service.getRecordOrThrowAsync('account_b' as never, record.id as never),
    NotFoundError
  );
  await assert.rejects(
    () => service.getEntryOrThrowAsync('account_b' as never, entry.id as never),
    NotFoundError
  );
  await assert.rejects(
    () => service.listEntriesByEncounterAsync('account_b' as never, record.encounterId as never),
    NotFoundError
  );
  await assert.rejects(
    () =>
      service.updateEntryAtomically('account_b' as never, 'doctor_b' as never, entry.id as never, {
        content: 'Tentativa cross-account'
      }),
    NotFoundError
  );
  assert.equal(updateCalls, 0);

  const sameAccountEntry = await service.getEntryOrThrowAsync(
    'account_a' as never,
    entry.id as never
  );
  assert.equal(sameAccountEntry.id, entry.id);
  const updated = await service.updateEntryAtomically(
    'account_a' as never,
    'doctor_a' as never,
    entry.id as never,
    {
      content: 'Atualização legítima',
      reason: 'Correção clínica'
    }
  );
  await service.waitForPersistence();
  assert.equal(updated.content, 'Atualização legítima');
  assert.equal(updateCalls, 1);
});

test('MedicalRecordsService filters hydrated children and snapshots by account and parent linkage', async () => {
  const record = {
    id: 'record_filter_a',
    accountId: 'account_a',
    encounterId: 'encounter_filter_a',
    patientId: 'patient_filter_a',
    status: 'open' as const,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  };
  const validEntry = {
    id: 'entry_filter_valid',
    accountId: 'account_a',
    medicalRecordId: record.id,
    encounterId: record.encounterId,
    patientId: record.patientId,
    entryType: 'progress_note' as const,
    title: 'Valid entry',
    content: 'Visible only to account A',
    authoredByUserId: 'doctor_a',
    version: 1,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
  const foreignEntry = { ...validEntry, id: 'entry_filter_foreign', accountId: 'account_b' };
  const wrongParentEntry = {
    ...validEntry,
    id: 'entry_filter_wrong_parent',
    medicalRecordId: 'record_other'
  };
  const validEvent = {
    id: 'timeline_filter_valid',
    accountId: 'account_a',
    medicalRecordId: record.id,
    encounterId: record.encounterId,
    eventType: 'record_created' as const,
    summary: 'Valid event',
    actorUserId: 'doctor_a',
    occurredAt: record.createdAt
  };
  const foreignEvent = { ...validEvent, id: 'timeline_filter_foreign', accountId: 'account_b' };
  const wrongParentEvent = {
    ...validEvent,
    id: 'timeline_filter_wrong_parent',
    medicalRecordId: 'record_other'
  };
  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow() {
        return {
          id: record.encounterId,
          accountId: record.accountId,
          patientId: record.patientId,
          status: 'in_care',
          createdByUserId: 'doctor_a'
        };
      }
    } as never,
    patients: {
      getOrThrow: () => ({ id: record.patientId, accountId: record.accountId })
    } as never,
    medicalRecordRepository: {
      async create() {},
      async update() {},
      async findById() {
        return record as never;
      },
      async findByEncounterId() {
        return record as never;
      },
      async findAll() {
        return [record] as never;
      }
    },
    clinicalEntryRepository: {
      async create() {},
      async update() {},
      async findById() {
        return validEntry as never;
      },
      async findByMedicalRecordId() {
        return [validEntry, foreignEntry, wrongParentEntry] as never;
      }
    },
    clinicalTimelineRepository: {
      async create() {},
      async findByMedicalRecordId() {
        return [validEvent, foreignEvent, wrongParentEvent] as never;
      }
    }
  });

  await service.refreshAccount('account_a' as never);
  const entries = await service.listEntriesByEncounterAsync(
    'account_a' as never,
    record.encounterId as never
  );
  assert.deepEqual(
    entries.map((entry) => entry.id),
    [validEntry.id]
  );

  const timeline = await service.listTimelineByEncounterAsync(
    'account_a' as never,
    record.encounterId as never
  );
  assert.deepEqual(
    timeline.map((event) => event.id),
    [validEvent.id]
  );

  const snapshot = service.snapshotEncounter('account_a' as never, record.encounterId as never);
  assert.deepEqual(
    snapshot.entries.map((entry) => entry.id),
    [validEntry.id]
  );
  assert.deepEqual(
    snapshot.timeline.map((event) => event.id),
    [validEvent.id]
  );
  assert.throws(
    () => service.snapshotEncounter('account_b' as never, record.encounterId as never),
    NotFoundError
  );
  assert.throws(
    () => service.restoreEncounterSnapshot('account_b' as never, snapshot),
    NotFoundError
  );
});
