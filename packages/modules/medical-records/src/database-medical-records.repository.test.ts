import { beforeEach, expect, test, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  tenant: undefined as { accountId: string } | undefined
}));

vi.mock('@cvg-his-v2/shared-database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/shared-database')>();
  return {
    ...actual,
    getPool: vi.fn(() => {
      throw new Error('Database pool not initialized. Call createDatabaseClient first.');
    })
  };
});

vi.mock('@cvg-his-v2/tenant-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/tenant-context')>();
  return {
    ...actual,
    getTenantContext: vi.fn(() => mockState.tenant),
    requireAccountId: vi.fn(() => {
      if (!mockState.tenant) throw new Error('account context is required');
      return mockState.tenant.accountId;
    })
  };
});

import {
  clinicalEntries,
  clinicalTimeline,
  entryRevisions,
  medicalRecords
} from '@cvg-his-v2/shared-database';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import {
  DatabaseClinicalEntryRepository,
  DatabaseClinicalTimelineRepository,
  DatabaseEntryRevisionRepository,
  DatabaseMedicalRecordRepository
} from './repositories/database-medical-records.repository.js';

type Table =
  | typeof medicalRecords
  | typeof clinicalEntries
  | typeof clinicalTimeline
  | typeof entryRevisions;

const timestamp = new Date('2026-09-16T12:00:00.000Z');

const recordRow = {
  id: 'record-1',
  accountId: 'account-1',
  encounterId: '11111111-1111-4111-8111-111111111111',
  patientId: 'patient-1',
  status: 'open',
  createdAt: timestamp,
  updatedAt: timestamp
};

const entryRow = {
  id: 'entry-1',
  accountId: 'account-1',
  medicalRecordId: 'record-1',
  encounterId: '11111111-1111-4111-8111-111111111111',
  patientId: 'patient-1',
  authorUserId: 'doctor-1',
  entryType: 'progress_note',
  title: 'Progress note',
  content: 'Stable',
  version: 2,
  deletedAt: null,
  deletedByUserId: null,
  deleteReason: null,
  createdAt: timestamp,
  updatedAt: timestamp
};

const timelineRow = {
  id: 'timeline-1',
  accountId: 'account-1',
  medicalRecordId: 'record-1',
  encounterId: '11111111-1111-4111-8111-111111111111',
  eventType: 'entry_added',
  summary: null,
  actorUserId: null,
  clinicalEntryId: null,
  attachmentId: null,
  occurredAt: timestamp
};

const revisionRow = {
  id: 'revision-1',
  entryId: 'entry-1',
  version: 2,
  title: 'Progress note',
  content: 'Stable',
  authorUserId: 'doctor-1',
  reason: null,
  createdAt: timestamp
};

function rowsFor(table: Table): readonly Record<string, unknown>[] {
  if (table === medicalRecords) return [recordRow];
  if (table === clinicalEntries) return [entryRow];
  if (table === clinicalTimeline) return [timelineRow];
  return [revisionRow];
}

function makeDatabaseDouble() {
  const selectQueue: Array<readonly Record<string, unknown>[] | Error> = [];
  const returningQueue: Array<readonly Record<string, unknown>[]> = [];

  const selectBuilder = () => {
    let table: Table | undefined;
    const builder = {
      from(nextTable: Table) {
        table = nextTable;
        return builder;
      },
      where() {
        return builder;
      },
      limit() {
        return builder;
      },
      orderBy() {
        return builder;
      },
      then(
        resolve: (value: readonly Record<string, unknown>[]) => unknown,
        reject: (reason: unknown) => unknown
      ) {
        const next = selectQueue.shift() ?? rowsFor(table as Table);
        return (next instanceof Error ? Promise.reject(next) : Promise.resolve(next)).then(
          resolve,
          reject
        );
      }
    };
    return builder;
  };

  const db = {
    select: vi.fn(() => selectBuilder()),
    insert: vi.fn((_table: Table) => ({
      values: vi.fn(async () => undefined)
    })),
    update: vi.fn((_table: Table) => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => returningQueue.shift() ?? [{ id: 'updated' }]),
          then: (
            resolve: (value: undefined) => unknown,
            reject: (reason: unknown) => unknown
          ) => Promise.resolve(undefined).then(resolve, reject)
        }))
      }))
    })),
    queueSelect(...rows: Array<readonly Record<string, unknown>[] | Error>) {
      selectQueue.push(...rows);
    },
    queueReturning(...rows: Array<readonly Record<string, unknown>[]>) {
      returningQueue.push(...rows);
    }
  };

  return db;
}

beforeEach(() => {
  mockState.tenant = undefined;
});

test('database medical-record repositories persist and hydrate all clinical projections', async () => {
  const db = makeDatabaseDouble();
  const recordRepository = new DatabaseMedicalRecordRepository(db as unknown as DatabaseClient);
  const entryRepository = new DatabaseClinicalEntryRepository(db as unknown as DatabaseClient);
  const timelineRepository = new DatabaseClinicalTimelineRepository(db as unknown as DatabaseClient);
  const revisionRepository = new DatabaseEntryRevisionRepository(db as unknown as DatabaseClient);

  const record = {
    id: 'record-1' as never,
    accountId: 'account-1' as never,
    encounterId: recordRow.encounterId as never,
    patientId: 'patient-1' as never,
    status: 'open' as const,
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString()
  };
  await recordRepository.create(record);
  await recordRepository.update(record);
  expect(await recordRepository.findById(record.id, record.accountId)).toMatchObject({
    id: record.id,
    status: 'open'
  });
  expect(await recordRepository.findByEncounterId('encounter_legacy' as never, record.accountId)).toBeNull();
  db.queueSelect([recordRow]);
  expect(
    await recordRepository.findByEncounterId(recordRow.encounterId as never, record.accountId)
  ).toMatchObject({ id: record.id });
  db.queueSelect([recordRow]);
  expect(await recordRepository.findAll(record.accountId)).toHaveLength(1);

  const entry = {
    id: 'entry-1' as never,
    accountId: 'account-1' as never,
    medicalRecordId: record.id,
    encounterId: record.encounterId,
    patientId: record.patientId,
    entryType: 'progress_note' as const,
    title: 'Progress note',
    content: 'Stable',
    authoredByUserId: 'doctor-1' as never,
    version: 2,
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString()
  };
  await entryRepository.create(entry);
  await entryRepository.update(entry);
  db.queueReturning([{ id: entry.id }]);
  await entryRepository.update(entry, 1);
  db.queueSelect([entryRow]);
  expect(await entryRepository.findById(entry.id)).toMatchObject({
    id: entry.id,
    deletedAt: undefined,
    deleteReason: undefined
  });
  db.queueSelect([entryRow]);
  expect(await entryRepository.findByMedicalRecordId(record.id)).toHaveLength(1);

  await timelineRepository.create({
    id: 'timeline-1' as never,
    accountId: record.accountId,
    medicalRecordId: record.id,
    encounterId: record.encounterId,
    eventType: 'entry_added',
    summary: 'added',
    actorUserId: 'doctor-1' as never,
    occurredAt: timestamp.toISOString()
  });
  db.queueSelect([timelineRow]);
  expect(await timelineRepository.findByMedicalRecordId(record.id)).toEqual([
    expect.objectContaining({ summary: '', actorUserId: 'system', clinicalEntryId: undefined })
  ]);

  await revisionRepository.create({
    id: 'revision-1' as never,
    entryId: entry.id,
    version: 2,
    title: entry.title,
    content: entry.content,
    authorUserId: entry.authoredByUserId,
    reason: undefined,
    createdAt: timestamp.toISOString()
  });
  db.queueSelect([revisionRow]);
  expect(await revisionRepository.findByEntryId(entry.id)).toEqual([
    expect.objectContaining({ reason: undefined, version: 2 })
  ]);
});

test('database medical-record repositories handle compatibility misses and compare-and-set failures', async () => {
  const db = makeDatabaseDouble();
  const recordRepository = new DatabaseMedicalRecordRepository(db as unknown as DatabaseClient);
  const entryRepository = new DatabaseClinicalEntryRepository(db as unknown as DatabaseClient);
  const timelineRepository = new DatabaseClinicalTimelineRepository(db as unknown as DatabaseClient);
  const revisionRepository = new DatabaseEntryRevisionRepository(db as unknown as DatabaseClient);

  const missingRelation = new Error('missing relation') as Error & { code?: string };
  missingRelation.code = '42P01';
  db.queueSelect(missingRelation);
  expect(await recordRepository.findById('missing' as never, 'account-1' as never)).toBeNull();

  const invalidUuid = new Error('invalid input syntax for type uuid: "bad"') as Error & {
    code?: string;
  };
  invalidUuid.code = '22P02';
  db.queueSelect(invalidUuid);
  expect(
    await recordRepository.findByEncounterId(
      '11111111-1111-4111-8111-111111111111' as never,
      'account-1' as never
    )
  ).toBeNull();

  const unexpected = new Error('database unavailable');
  db.queueSelect(unexpected);
  await expect(recordRepository.findAll('account-1' as never)).rejects.toThrow(
    'database unavailable'
  );

  db.queueReturning([]);
  await expect(
    entryRepository.update(
      {
        id: 'entry-1' as never,
        accountId: 'account-1' as never,
        medicalRecordId: 'record-1' as never,
        encounterId: 'encounter-1' as never,
        patientId: 'patient-1' as never,
        entryType: 'progress_note',
        title: 'title',
        content: 'content',
        authoredByUserId: 'doctor-1' as never,
        version: 2,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString()
      },
      1
    )
  ).rejects.toBeInstanceOf(ValidationError);

  db.queueSelect([]);
  expect(await entryRepository.findById('missing' as never)).toBeNull();
  db.queueSelect([]);
  expect(await entryRepository.findByMedicalRecordId('missing' as never)).toEqual([]);
  db.queueSelect([]);
  expect(await timelineRepository.findByMedicalRecordId('missing' as never)).toEqual([]);
  db.queueSelect([]);
  expect(await revisionRepository.findByEntryId('missing' as never)).toEqual([]);

  mockState.tenant = { accountId: 'account-1' };
  await expect(
    recordRepository.create({
      id: 'record-1' as never,
      accountId: 'account-other' as never,
      encounterId: 'encounter-1' as never,
      patientId: 'patient-1' as never,
      status: 'open',
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString()
    })
  ).rejects.toThrow('Medical-record account does not match tenant context');
});

test('database medical-record repositories preserve deletion, provenance and compatibility fallbacks', async () => {
  const db = makeDatabaseDouble();
  const recordRepository = new DatabaseMedicalRecordRepository(db as unknown as DatabaseClient);
  const entryRepository = new DatabaseClinicalEntryRepository(db as unknown as DatabaseClient);
  const timelineRepository = new DatabaseClinicalTimelineRepository(db as unknown as DatabaseClient);
  const revisionRepository = new DatabaseEntryRevisionRepository(db as unknown as DatabaseClient);

  const deletedEntry = {
    ...entryRow,
    deletedAt: timestamp,
    deletedByUserId: 'doctor-2',
    deleteReason: 'Correction requested'
  };
  await entryRepository.create({
    id: 'entry-2' as never,
    accountId: 'account-1' as never,
    medicalRecordId: 'record-1' as never,
    encounterId: recordRow.encounterId as never,
    patientId: 'patient-1' as never,
    entryType: 'progress_note',
    title: 'Deleted entry',
    content: 'Correction',
    authoredByUserId: 'doctor-1' as never,
    version: 3,
    deletedAt: timestamp.toISOString(),
    deletedByUserId: 'doctor-2' as never,
    deleteReason: 'Correction requested',
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString()
  });
  await entryRepository.update(
    {
      id: 'entry-2' as never,
      accountId: 'account-1' as never,
      medicalRecordId: 'record-1' as never,
      encounterId: recordRow.encounterId as never,
      patientId: 'patient-1' as never,
      entryType: 'progress_note',
      title: 'Deleted entry',
      content: 'Correction',
      authoredByUserId: 'doctor-1' as never,
      version: 3,
      deletedAt: timestamp.toISOString(),
      deletedByUserId: 'doctor-2' as never,
      deleteReason: 'Correction requested',
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString()
    },
    undefined
  );
  db.queueSelect([deletedEntry]);
  await expect(entryRepository.findById('entry-2' as never)).resolves.toMatchObject({
    deletedAt: timestamp.toISOString(),
    deletedByUserId: 'doctor-2',
    deleteReason: 'Correction requested'
  });

  db.queueSelect([
    {
      ...timelineRow,
      summary: 'Entry signed',
      actorUserId: 'doctor-1',
      clinicalEntryId: 'entry-2',
      attachmentId: 'attachment-1'
    }
  ]);
  await expect(timelineRepository.findByMedicalRecordId('record-1' as never)).resolves.toMatchObject([
    {
      summary: 'Entry signed',
      actorUserId: 'doctor-1',
      clinicalEntryId: 'entry-2',
      attachmentId: 'attachment-1'
    }
  ]);

  await revisionRepository.create({
    id: 'revision-2' as never,
    entryId: 'entry-2' as never,
    version: 3,
    title: 'Deleted entry',
    content: 'Correction',
    authorUserId: 'doctor-2' as never,
    reason: 'Correction requested',
    createdAt: timestamp.toISOString()
  });
  db.queueSelect([{ ...revisionRow, reason: 'Correction requested', version: 3 }]);
  await expect(revisionRepository.findByEntryId('entry-2' as never)).resolves.toMatchObject([
    { reason: 'Correction requested', version: 3 }
  ]);

  const missingRelation = new Error('missing relation') as Error & { code?: string };
  missingRelation.code = '42P01';
  db.queueSelect(missingRelation);
  await expect(entryRepository.findById('missing' as never)).resolves.toBeNull();
  db.queueSelect(missingRelation);
  await expect(entryRepository.findByMedicalRecordId('missing' as never)).resolves.toEqual([]);
  db.queueSelect(missingRelation);
  await expect(timelineRepository.findByMedicalRecordId('missing' as never)).resolves.toEqual([]);
  db.queueSelect(missingRelation);
  await expect(revisionRepository.findByEntryId('missing' as never)).resolves.toEqual([]);

  const unrelated = new Error('different database error') as Error & { code?: string };
  unrelated.code = '22P02';
  db.queueSelect(unrelated);
  await expect(entryRepository.findById('bad' as never)).rejects.toBe(unrelated);
});
