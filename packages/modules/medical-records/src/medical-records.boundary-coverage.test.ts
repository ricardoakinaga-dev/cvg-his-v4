import assert from 'node:assert/strict';
import { test } from 'vitest';

import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  ClinicalEntryId,
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  EncounterId,
  EntryRevisionId,
  EntryRevisionSummary,
  MedicalRecordId,
  MedicalRecordSummary,
  PatientId,
  UserId
} from '@cvg-his-v2/shared-types';

import {
  MedicalRecordsService,
  type MedicalRecordsAtomicPersistence,
  type MedicalRecordsEntryCreationPersistence
} from './index.js';

function createInMemoryService(patientAccountId = 'acc_test') {
  return new MedicalRecordsService({
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
        return { id: patientId, accountId: patientAccountId };
      }
    } as never
  });
}

function createNoOpPersistenceService(seedEntry = false) {
  const createdAt = '2026-07-12T00:00:00.000Z';
  const accountId = 'acc_test' as AccountId;
  const encounterId = 'encounter_noop_all_operations' as EncounterId;
  const patientId = 'patient_1' as PatientId;
  const doctorId = 'doctor_1' as UserId;
  const record: MedicalRecordSummary = {
    id: 'record_noop_all_operations' as MedicalRecordId,
    accountId,
    encounterId,
    patientId,
    status: 'open' as const,
    createdAt,
    updatedAt: createdAt
  };
  const entry: ClinicalEntrySummary = {
    id: 'entry_noop_all_operations' as ClinicalEntryId,
    accountId,
    medicalRecordId: record.id,
    encounterId: record.encounterId,
    patientId: record.patientId,
    entryType: 'progress_note' as const,
    title: 'Entrada original',
    content: 'Conteúdo original',
    authoredByUserId: doctorId,
    version: 1,
    createdAt,
    updatedAt: createdAt
  };
  const revision: EntryRevisionSummary = {
    id: 'revision_noop_all_operations' as EntryRevisionId,
    entryId: entry.id,
    version: 1,
    title: entry.title,
    content: entry.content,
    authorUserId: entry.authoredByUserId,
    reason: 'Initial clinical entry',
    createdAt
  };
  const recordCreatedEvent: ClinicalTimelineEventSummary = {
    id: 'timeline_record_noop_all_operations' as ClinicalTimelineEventSummary['id'],
    accountId: record.accountId,
    medicalRecordId: record.id,
    encounterId: record.encounterId,
    eventType: 'record_created' as const,
    summary: 'Medical record created',
    actorUserId: doctorId,
    occurredAt: createdAt
  };
  const entryEvent: ClinicalTimelineEventSummary = {
    id: 'timeline_entry_noop_all_operations' as ClinicalTimelineEventSummary['id'],
    accountId: entry.accountId,
    medicalRecordId: entry.medicalRecordId,
    encounterId: entry.encounterId,
    clinicalEntryId: entry.id,
    eventType: 'entry_added' as const,
    summary: 'Entry added',
    actorUserId: doctorId,
    occurredAt: createdAt
  };

  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          status: 'in_care',
          createdByUserId: 'doctor_1'
        };
      }
    } as never,
    patients: {
      getOrThrow(patientId: string) {
        return { id: patientId, accountId: 'acc_test' };
      }
    } as never,
    medicalRecordRepository: {
      async create() {},
      async update() {},
      async findById(id: string) {
        return seedEntry && id === record.id ? record : null;
      },
      async findByEncounterId(encounterId: string) {
        return seedEntry && encounterId === record.encounterId ? record : null;
      },
      async findAll() {
        return seedEntry ? [record] : [];
      }
    },
    clinicalEntryRepository: {
      async create() {},
      async update() {},
      async findById(id: string) {
        return seedEntry && id === entry.id ? entry : null;
      },
      async findByMedicalRecordId(medicalRecordId: string) {
        return seedEntry && medicalRecordId === record.id ? [entry] : [];
      }
    },
    clinicalTimelineRepository: {
      async create() {},
      async findByMedicalRecordId(medicalRecordId: string) {
        return seedEntry && medicalRecordId === record.id ? [recordCreatedEvent, entryEvent] : [];
      }
    },
    entryRevisionRepository: {
      async create() {},
      async findByEntryId(entryId: string) {
        return seedEntry && entryId === entry.id ? [revision] : [];
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

  return { entry, service };
}

test('MedicalRecordsService covers memory-only account, snapshot and async fallbacks', async () => {
  const service = createInMemoryService();

  await service.refreshAccount('acc_test' as never);
  const emptySnapshot = service.snapshotEncounter('acc_test' as never, 'encounter_empty' as never);
  assert.equal(emptySnapshot.record, undefined);
  assert.deepEqual(emptySnapshot.entries, []);
  assert.deepEqual(emptySnapshot.timeline, []);
  service.restoreEncounterSnapshot('acc_test' as never, emptySnapshot);

  assert.throws(
    () => service.getRecordOrThrow('acc_test' as never, 'missing_record' as never),
    NotFoundError
  );
  await assert.rejects(
    () => service.getRecordOrThrowAsync('acc_test' as never, 'missing_record' as never),
    NotFoundError
  );

  const entry = service.addEntry('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Evolução',
    content: 'Registro em memória'
  });
  assert.equal(
    (await service.getEntryOrThrowAsync('acc_test' as never, entry.id as never)).id,
    entry.id
  );
  await assert.rejects(
    () => service.getEntryOrThrowAsync('account_other' as never, entry.id as never),
    NotFoundError
  );
  assert.deepEqual(await service.getEntryRevisionsAsync('acc_test' as never, entry.id), []);
  assert.deepEqual(
    (
      await service.listEntriesByEncounterAsync('acc_test' as never, 'encounter_1' as never, {
        includeArchived: true
      })
    ).map((item) => item.id),
    [entry.id]
  );
  assert.equal(
    (await service.listTimelineByEncounterAsync('acc_test' as never, 'encounter_1' as never))
      .length,
    2
  );

  const snapshot = service.snapshotEncounter('acc_test' as never, 'encounter_1' as never);
  service.restoreEncounterSnapshot('acc_test' as never, {
    ...snapshot,
    record: undefined
  });
  const recreated = await service.getRecordByEncounterOrThrowAsync(
    'acc_test' as never,
    'encounter_1' as never
  );
  assert.equal(recreated.encounterId, 'encounter_1');
});

test('MedicalRecordsService covers repository refresh, list and hydrated-entry branches', async () => {
  const record = {
    id: 'record_coverage',
    accountId: 'acc_test',
    encounterId: 'encounter_coverage',
    patientId: 'patient_1',
    status: 'open' as const,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  };
  const entry = {
    id: 'entry_coverage',
    accountId: 'acc_test',
    medicalRecordId: record.id,
    encounterId: record.encounterId,
    patientId: record.patientId,
    entryType: 'progress_note' as const,
    title: 'Cobertura',
    content: 'Entrada hidratada',
    authoredByUserId: 'doctor_1',
    version: 1,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
  const revision = {
    id: 'revision_coverage',
    entryId: entry.id,
    version: 1,
    title: entry.title,
    content: entry.content,
    authorUserId: entry.authoredByUserId,
    reason: 'Cobertura',
    createdAt: record.createdAt
  };
  const foreignRevision = {
    ...revision,
    id: 'revision_foreign_coverage',
    entryId: 'entry_other_tenant' as never,
    content: 'Conteúdo de outra entrada que não pode atravessar o limite'
  };
  let currentRecords: readonly unknown[] = [record];

  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          status: 'in_care',
          createdByUserId: 'doctor_1'
        };
      }
    } as never,
    patients: {
      getOrThrow: (patientId: string) => ({ id: patientId, accountId: 'acc_test' })
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
        return currentRecords as never;
      }
    }
  });

  await service.getRecordOrThrowAsync('acc_test' as never, record.id as never);
  await assert.rejects(
    () =>
      service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: record.encounterId as never,
        patientId: record.patientId as never,
        entryType: 'progress_note',
        title: 'Persistência incompleta',
        content: 'A escrita deve falhar fechada sem o conjunto clínico atômico'
      }),
    /atomic persistence adapter is unavailable/
  );
  assert.equal((await service.listAll('acc_test' as never))[0]?.entryCount, 0);

  currentRecords = [];
  await service.refreshAccount('acc_test' as never);
  assert.deepEqual(await service.listAll('acc_test' as never), []);

  currentRecords = [record];
  await service.refreshAccount('acc_test' as never);
  assert.equal((await service.listAll('acc_test' as never))[0]?.entryCount, 0);
  assert.equal(
    (await service.getRecordOrThrowAsync('acc_test' as never, record.id as never)).id,
    record.id
  );

  let exposeEntry = true;
  let exposeHydratedChildren = true;
  const hydrated = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          status: 'in_care',
          createdByUserId: 'doctor_1'
        };
      }
    } as never,
    patients: { getOrThrow: () => ({ id: 'patient_1', accountId: 'acc_test' }) } as never,
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
        return exposeEntry ? (entry as never) : null;
      },
      async findByMedicalRecordId() {
        return exposeHydratedChildren ? ([entry] as never) : [];
      }
    },
    entryRevisionRepository: {
      async create() {},
      async findByEntryId() {
        return [revision, foreignRevision] as never;
      }
    }
  });

  await hydrated.refreshAccount('acc_test' as never);
  const revisions = await hydrated.getEntryRevisionsAsync('acc_test' as never, entry.id as never);
  assert.equal(revisions.length, 1);
  assert.equal(revisions[0]?.entryId, entry.id);
  exposeHydratedChildren = false;
  await assert.rejects(
    () => hydrated.getEntryOrThrowAsync('acc_test' as never, entry.id as never),
    NotFoundError
  );
  exposeEntry = false;
  await assert.rejects(
    () => hydrated.getEntryOrThrowAsync('acc_test' as never, entry.id as never),
    NotFoundError
  );
});

test('MedicalRecordsService rejects records whose encounter or patient parent is out of scope', async () => {
  const record = {
    id: 'record_bad_parent',
    accountId: 'acc_test',
    encounterId: 'encounter_bad_parent',
    patientId: 'patient_bad_parent',
    status: 'open' as const,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  };
  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_other',
          status: 'in_care',
          createdByUserId: 'doctor_1'
        };
      }
    } as never,
    patients: {
      getOrThrow(patientId: string) {
        return { id: patientId, accountId: 'acc_test' };
      }
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
    }
  });

  await assert.rejects(
    () => service.getRecordOrThrowAsync('acc_test' as never, record.id as never),
    NotFoundError
  );
  assert.deepEqual(await service.listAll('acc_test' as never), []);
  assert.throws(
    () =>
      service.restoreEncounterSnapshot('acc_test' as never, {
        encounterId: record.encounterId as never,
        record: record as never,
        entries: [],
        timeline: []
      }),
    NotFoundError
  );
});

test('MedicalRecordsService refuses to discard a stale foreign snapshot mapping', async () => {
  let encounterAccountId = 'acc_other';
  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
        return {
          id: encounterId,
          accountId: encounterAccountId,
          patientId: 'patient_1',
          status: 'in_care',
          createdByUserId: 'doctor_1'
        };
      }
    } as never,
    patients: {
      getOrThrow(patientId: string) {
        return { id: patientId, accountId: encounterAccountId };
      }
    } as never
  });

  const foreignEntry = service.addEntry('acc_other' as never, 'doctor_1' as never, {
    encounterId: 'encounter_stale_snapshot',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Registro estrangeiro',
    content: 'Não deve ser removido por outra conta'
  });
  encounterAccountId = 'acc_test';

  assert.throws(
    () =>
      service.restoreEncounterSnapshot('acc_test' as never, {
        encounterId: 'encounter_stale_snapshot' as never,
        entries: [],
        timeline: []
      }),
    NotFoundError
  );
  assert.throws(
    () => service.listEntriesByEncounter('acc_test' as never, 'encounter_stale_snapshot' as never),
    NotFoundError
  );

  encounterAccountId = 'acc_other';
  const ownRecord = service.getRecordByEncounterOrThrow(
    'acc_other' as never,
    'encounter_stale_snapshot' as never
  );
  assert.equal(ownRecord.accountId, 'acc_other');
  await assert.doesNotReject(async () => {
    const ownEntry = await service.getEntryOrThrowAsync('acc_other' as never, foreignEntry.id);
    assert.equal(ownEntry.content, 'Não deve ser removido por outra conta');
    assert.deepEqual(
      await service.getEntryRevisionsAsync('acc_other' as never, foreignEntry.id),
      []
    );
  });
});

test('MedicalRecordsService refreshAccount preserves another account revision cache', async () => {
  const createdAt = '2026-07-12T00:00:00.000Z';
  const recordA: MedicalRecordSummary = {
    id: 'record_refresh_a' as MedicalRecordId,
    accountId: 'account_a' as AccountId,
    encounterId: 'encounter_refresh_a' as EncounterId,
    patientId: 'patient_refresh_a' as PatientId,
    status: 'open',
    createdAt,
    updatedAt: createdAt
  };
  const recordB: MedicalRecordSummary = {
    ...recordA,
    id: 'record_refresh_b' as MedicalRecordId,
    accountId: 'account_b' as AccountId,
    encounterId: 'encounter_refresh_b' as EncounterId,
    patientId: 'patient_refresh_b' as PatientId
  };
  const entryA: ClinicalEntrySummary = {
    id: 'entry_refresh_a' as ClinicalEntryId,
    accountId: recordA.accountId,
    medicalRecordId: recordA.id,
    encounterId: recordA.encounterId,
    patientId: recordA.patientId,
    entryType: 'progress_note',
    title: 'A',
    content: 'Conteúdo A',
    authoredByUserId: 'doctor_a' as UserId,
    version: 1,
    createdAt,
    updatedAt: createdAt
  };
  const entryB: ClinicalEntrySummary = {
    ...entryA,
    id: 'entry_refresh_b' as ClinicalEntryId,
    accountId: recordB.accountId,
    medicalRecordId: recordB.id,
    encounterId: recordB.encounterId,
    patientId: recordB.patientId,
    title: 'B',
    content: 'Conteúdo B',
    authoredByUserId: 'doctor_b' as UserId
  };
  const revisionB: EntryRevisionSummary = {
    id: 'revision_refresh_b' as EntryRevisionId,
    entryId: entryB.id,
    version: 1,
    title: entryB.title,
    content: entryB.content,
    authorUserId: entryB.authoredByUserId,
    reason: 'Initial clinical entry',
    createdAt
  };
  const records = [recordA, recordB];
  const entries = [entryA, entryB];
  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
        const record = records.find((candidate) => candidate.encounterId === encounterId);
        if (!record) throw new Error('Encounter not found');
        return {
          id: record.encounterId,
          accountId: record.accountId,
          patientId: record.patientId,
          status: 'in_care',
          createdByUserId: record.accountId === 'account_a' ? 'doctor_a' : 'doctor_b'
        };
      }
    } as never,
    patients: {
      getOrThrow(patientId: string) {
        const record = records.find((candidate) => candidate.patientId === patientId);
        if (!record) throw new Error('Patient not found');
        return { id: patientId, accountId: record.accountId };
      }
    } as never,
    medicalRecordRepository: {
      async create() {},
      async update() {},
      async findById(id: string) {
        return records.find((record) => record.id === id) ?? null;
      },
      async findByEncounterId(encounterId: string) {
        return records.find((record) => record.encounterId === encounterId) ?? null;
      },
      async findAll(accountId: string) {
        return records.filter((record) => record.accountId === accountId);
      }
    },
    clinicalEntryRepository: {
      async create() {},
      async update() {},
      async findById(id: string) {
        return entries.find((entry) => entry.id === id) ?? null;
      },
      async findByMedicalRecordId(recordId: string) {
        return entries.filter((entry) => entry.medicalRecordId === recordId);
      }
    },
    clinicalTimelineRepository: {
      async create() {},
      async findByMedicalRecordId() {
        return [];
      }
    },
    entryRevisionRepository: {
      async create() {},
      async findByEntryId(entryId: string) {
        return entryId === entryB.id ? [revisionB] : [];
      }
    }
  });

  await service.refreshAccount('account_b' as never);
  assert.deepEqual(await service.getEntryRevisionsAsync('account_b' as never, entryB.id), [
    revisionB
  ]);

  await service.refreshAccount('account_a' as never);

  assert.equal(service.getRecordOrThrow('account_b' as never, recordB.id).id, recordB.id);
  assert.equal(
    service.listEntriesByEncounter('account_b' as never, recordB.encounterId)[0]?.content,
    'Conteúdo B'
  );
  assert.deepEqual(service.getEntryRevisions('account_b' as never, entryB.id), [revisionB]);
});

test('MedicalRecordsService fails closed without an atomic fallback adapter', async () => {
  let createCalls = 0;
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
      async create() {
        createCalls += 1;
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
    }
  });

  await assert.rejects(
    () =>
      service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_unbranded',
        patientId: 'patient_1',
        entryType: 'progress_note',
        title: 'Não deve iniciar persistência',
        content: 'Callback sem capability atômica'
      }),
    /atomic persistence adapter is unavailable/
  );
  assert.equal(createCalls, 0);
});

test('MedicalRecordsService rejects an atomic adapter that does not confirm its write set', async () => {
  let createCalls = 0;
  const noOpAdapter = {
    async persistRecordCreation() {
      return undefined;
    },
    async persistEntryCreation(input: MedicalRecordsEntryCreationPersistence) {
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
      return undefined;
    }
  } as unknown as MedicalRecordsAtomicPersistence;
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
      async create() {
        createCalls += 1;
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
    },
    clinicalEntryRepository: {
      async create() {},
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
    },
    atomicPersistence: noOpAdapter
  });

  await assert.rejects(
    () =>
      service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_noop',
        patientId: 'patient_1',
        entryType: 'progress_note',
        title: 'Não deve publicar cache',
        content: 'Adapter sem confirmação não pode ser aceito'
      }),
    /did not confirm the complete write set/
  );
  assert.equal(createCalls, 0);
  assert.deepEqual(await service.listAll('acc_test' as never), []);
});

test('MedicalRecordsService rejects matching forged receipts for every atomic write set', async () => {
  const recordCreation = createNoOpPersistenceService();
  recordCreation.service.ensureRecord(
    'acc_test' as never,
    'encounter_noop_all_operations' as never
  );
  await assert.rejects(
    () => recordCreation.service.waitForPersistence(),
    /did not confirm the complete write set/
  );
  assert.deepEqual(await recordCreation.service.listAll('acc_test' as never), []);

  const entryCreation = createNoOpPersistenceService();
  await assert.rejects(
    () =>
      entryCreation.service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_noop_all_operations',
        patientId: 'patient_1',
        entryType: 'progress_note',
        title: 'Entrada que não pode ser publicada',
        content: 'O recibo forjado não prova a escrita durável'
      }),
    /did not confirm the complete write set/
  );
  assert.deepEqual(await entryCreation.service.listAll('acc_test' as never), []);

  const entryMutation = createNoOpPersistenceService(true);
  await assert.rejects(
    () =>
      entryMutation.service.updateEntryAtomically(
        'acc_test' as never,
        'doctor_1' as never,
        entryMutation.entry.id as never,
        { title: 'Atualização que não pode ser publicada' }
      ),
    /did not confirm the complete write set/
  );
  assert.equal(
    (
      await entryMutation.service.getEntryOrThrowAsync(
        'acc_test' as never,
        entryMutation.entry.id as never
      )
    ).title,
    entryMutation.entry.title
  );
});

test('MedicalRecordsService revalidates cached entries after parent linkage drift', async () => {
  let encounterPatientId = 'patient_1';
  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: encounterPatientId,
          status: 'in_care',
          createdByUserId: 'doctor_1'
        };
      }
    } as never,
    patients: {
      getOrThrow(patientId: string) {
        return { id: patientId, accountId: 'acc_test' };
      }
    } as never
  });

  const entry = service.addEntry('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_drift',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Parent drift',
    content: 'Conteúdo que não pode ser exposto após a troca do paciente'
  });
  await service.waitForPersistence();
  assert.equal(
    (await service.getEntryOrThrowAsync('acc_test' as never, entry.id as never)).id,
    entry.id
  );

  encounterPatientId = 'patient_2';
  await assert.rejects(
    () => service.getEntryOrThrowAsync('acc_test' as never, entry.id as never),
    NotFoundError
  );
  await assert.rejects(
    () => service.getEntryRevisionsAsync('acc_test' as never, entry.id as never),
    NotFoundError
  );
  assert.throws(
    () => service.getEntryRevisions('acc_test' as never, entry.id as never),
    NotFoundError
  );
});

test('MedicalRecordsService rejects completed, oversized, foreign and archived writes', async () => {
  const service = createInMemoryService();
  const entry = service.addEntry('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'progress_note',
    title: 'Entrada original',
    content: 'Conteúdo original'
  });
  service.updateEntry('acc_test' as never, 'doctor_1' as never, entry.id as never, {
    reason: 'Atualização com campos herdados'
  });

  const secondEntry = service.addEntry('acc_test' as never, 'doctor_1' as never, {
    encounterId: 'encounter_1',
    patientId: 'patient_1',
    entryType: 'assessment',
    title: 'Entrada arquivável',
    content: 'Conteúdo arquivável'
  });
  assert.throws(
    () =>
      service.archiveEntry('acc_test' as never, 'doctor_1' as never, secondEntry.id as never, {
        reason: 'Versão incorreta',
        expectedVersion: 99
      }),
    ValidationError
  );
  assert.throws(
    () =>
      service.archiveEntry('acc_test' as never, 'doctor_1' as never, secondEntry.id as never, {
        reason: ''
      }),
    ValidationError
  );
  service.archiveEntry('acc_test' as never, 'doctor_1' as never, secondEntry.id as never, {
    reason: 'Arquivamento válido'
  });
  assert.throws(
    () =>
      service.archiveEntry('acc_test' as never, 'doctor_1' as never, secondEntry.id as never, {
        reason: 'Arquivamento duplicado'
      }),
    ValidationError
  );
  assert.throws(
    () =>
      service.updateEntry('acc_test' as never, 'doctor_1' as never, secondEntry.id as never, {
        content: 'Não deve atualizar'
      }),
    ValidationError
  );

  const foreignPatientService = createInMemoryService('account_other');
  await assert.rejects(
    () =>
      foreignPatientService.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_1',
        patientId: 'patient_1',
        entryType: 'anamnesis',
        title: 'Paciente estrangeiro',
        content: 'Não deve persistir'
      }),
    NotFoundError
  );
  await assert.rejects(
    () =>
      service.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_1',
        patientId: 'patient_1',
        entryType: 'anamnesis',
        title: 'x'.repeat(256),
        content: 'Conteúdo'
      }),
    ValidationError
  );

  const completedRecord = {
    id: 'record_completed',
    accountId: 'acc_test',
    encounterId: 'encounter_completed',
    patientId: 'patient_1',
    status: 'completed' as const,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  };
  const completedService = new MedicalRecordsService({
    encounters: {
      getOrThrow(_accountId: string, encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          status: 'in_care',
          createdByUserId: 'doctor_1'
        };
      }
    } as never,
    patients: { getOrThrow: () => ({ id: 'patient_1', accountId: 'acc_test' }) } as never,
    medicalRecordRepository: {
      async create() {},
      async update() {},
      async findById() {
        return completedRecord as never;
      },
      async findByEncounterId() {
        return completedRecord as never;
      },
      async findAll() {
        return [completedRecord] as never;
      }
    }
  });
  await assert.rejects(
    () =>
      completedService.createEntryAtomically('acc_test' as never, 'doctor_1' as never, {
        encounterId: completedRecord.encounterId as never,
        patientId: completedRecord.patientId as never,
        entryType: 'progress_note',
        title: 'Registro bloqueado',
        content: 'Não deve escrever'
      }),
    ValidationError
  );

  const completedMemoryService = createInMemoryService();
  completedMemoryService.restoreEncounterSnapshot('acc_test' as never, {
    encounterId: 'encounter_1' as never,
    record: { ...completedRecord, encounterId: 'encounter_1' } as never,
    entries: [],
    timeline: []
  });
  assert.throws(
    () =>
      completedMemoryService.addEntry('acc_test' as never, 'doctor_1' as never, {
        encounterId: 'encounter_1',
        patientId: 'patient_1',
        entryType: 'progress_note',
        title: 'Registro bloqueado em memória',
        content: 'Não deve escrever'
      }),
    /Completed medical record is read-only/
  );
});
