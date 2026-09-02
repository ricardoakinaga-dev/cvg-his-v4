import assert from 'node:assert/strict';
import { test, vi } from 'vitest';

import { ValidationError } from '@cvg-his-v2/shared-errors';

const transactionOperations: string[] = [];
let canonicalUpdateRows: readonly { id: string }[] = [{ id: 'canonical-entry' }];

vi.mock('@cvg-his-v2/shared-database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/shared-database')>();
  return {
    ...actual,
    withTenantTransaction: async (
      _accountId: string,
      callback: (transaction: unknown) => Promise<unknown>
    ) =>
      callback({
        insert() {
          transactionOperations.push('insert');
          return { values: async () => undefined };
        },
        update() {
          transactionOperations.push('update');
          return {
            set() {
              return {
                where() {
                  return {
                    returning: async () => canonicalUpdateRows
                  };
                }
              };
            }
          };
        }
      })
  };
});

import { MedicalRecordsService } from './index.js';

test('MedicalRecordsService writes canonical UUID entries and handles existing records', async () => {
  transactionOperations.length = 0;
  const accountId = '11111111-1111-1111-1111-111111111111' as never;
  const encounterId = 'encounter_canonical' as never;
  const patientId = 'patient_canonical' as never;
  let persistedRecord: Record<string, unknown> | null = null;

  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow() {
        return {
          id: encounterId,
          accountId,
          patientId,
          status: 'in_care',
          createdByUserId: 'doctor_canonical'
        };
      }
    } as never,
    patients: {
      getOrThrow() {
        return { id: patientId, accountId };
      }
    } as never,
    medicalRecordRepository: {
      async create(record) {
        persistedRecord = record as unknown as Record<string, unknown>;
      },
      async update() {},
      async findById() {
        return persistedRecord as never;
      },
      async findByEncounterId() {
        return persistedRecord as never;
      },
      async findAll() {
        return persistedRecord ? [persistedRecord as never] : [];
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
    }
  });

  const first = await service.createEntryAtomically(accountId, 'doctor_canonical' as never, {
    encounterId,
    patientId,
    entryType: 'anamnesis',
    title: 'Registro canônico',
    content: 'Primeira entrada persistida dentro da transação.'
  });
  const second = await service.createEntryAtomically(accountId, 'doctor_canonical' as never, {
    encounterId,
    patientId,
    entryType: 'progress_note',
    title: 'Evolução canônica',
    content: 'Segunda entrada atualiza o prontuário existente.'
  });

  if (first.medicalRecordId !== second.medicalRecordId) {
    throw new Error('canonical writes must reuse the existing medical record');
  }
  if (transactionOperations.join(',') !== 'insert,insert,insert,insert,update,insert,insert') {
    throw new Error(`unexpected transaction operations: ${transactionOperations.join(',')}`);
  }
});

test('MedicalRecordsService persists update and archive mutations in one canonical transaction', async () => {
  const accountId = '22222222-2222-2222-2222-222222222222' as never;
  const record = {
    id: 'record_mutation_canonical',
    accountId,
    encounterId: 'encounter_mutation_canonical' as never,
    patientId: 'patient_mutation_canonical' as never,
    status: 'open' as const,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  };
  const entry = {
    id: 'entry_mutation_canonical',
    accountId,
    medicalRecordId: record.id,
    encounterId: record.encounterId,
    patientId: record.patientId,
    entryType: 'progress_note' as const,
    title: 'Registro original',
    content: 'Conteúdo original',
    authoredByUserId: 'doctor_mutation_canonical' as never,
    version: 1,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };

  const createService = () =>
    new MedicalRecordsService({
      encounters: {
        getOrThrow() {
          return {
            id: record.encounterId,
            accountId,
            patientId: record.patientId,
            status: 'in_care',
            createdByUserId: 'doctor_mutation_canonical'
          };
        }
      } as never,
      patients: {
        getOrThrow() {
          return { id: record.patientId, accountId };
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
      },
      clinicalEntryRepository: {
        async create() {},
        async update() {},
        async findById() {
          return entry as never;
        },
        async findByMedicalRecordId() {
          return [entry] as never;
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
        async findByEntryId() {
          return [];
        }
      }
    });

  transactionOperations.length = 0;
  const updateResult = await createService().updateEntryAtomically(
    accountId,
    'doctor_mutation_canonical' as never,
    entry.id as never,
    { content: 'Conteúdo atualizado', reason: 'Revisão' }
  );
  if (
    updateResult.version !== 2 ||
    transactionOperations.join(',') !== 'update,update,insert,insert'
  ) {
    throw new Error(`unexpected canonical update: ${transactionOperations.join(',')}`);
  }

  transactionOperations.length = 0;
  const archiveResult = await createService().archiveEntryAtomically(
    accountId,
    'doctor_mutation_canonical' as never,
    entry.id as never,
    { reason: 'Arquivamento' }
  );
  if (
    archiveResult.version !== 2 ||
    !archiveResult.deletedAt ||
    transactionOperations.join(',') !== 'update,update,insert,insert'
  ) {
    throw new Error(`unexpected canonical archive: ${transactionOperations.join(',')}`);
  }
});

test('MedicalRecordsService rejects a stale canonical clinical-entry compare-and-set', async () => {
  const accountId = '33333333-3333-3333-3333-333333333333' as never;
  const record = {
    id: 'record_cas_canonical',
    accountId,
    encounterId: 'encounter_cas_canonical' as never,
    patientId: 'patient_cas_canonical' as never,
    status: 'open' as const,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  };
  const entry = {
    id: 'entry_cas_canonical',
    accountId,
    medicalRecordId: record.id,
    encounterId: record.encounterId,
    patientId: record.patientId,
    entryType: 'progress_note' as const,
    title: 'Registro original',
    content: 'Conteúdo original',
    authoredByUserId: 'doctor_cas_canonical' as never,
    version: 1,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };

  const service = new MedicalRecordsService({
    encounters: {
      getOrThrow() {
        return {
          id: record.encounterId,
          accountId,
          patientId: record.patientId,
          status: 'in_care',
          createdByUserId: 'doctor_cas_canonical'
        };
      }
    } as never,
    patients: {
      getOrThrow() {
        return { id: record.patientId, accountId };
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
    },
    clinicalEntryRepository: {
      async create() {},
      async update() {},
      async findById() {
        return entry as never;
      },
      async findByMedicalRecordId() {
        return [entry] as never;
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
      async findByEntryId() {
        return [];
      }
    }
  });

  canonicalUpdateRows = [];
  try {
    await assert.rejects(
      () =>
        service.updateEntryAtomically(
          accountId,
          'doctor_cas_canonical' as never,
          entry.id as never,
          { content: 'Atualização concorrente', reason: 'CAS' }
        ),
      ValidationError
    );
  } finally {
    canonicalUpdateRows = [{ id: 'canonical-entry' }];
  }
});
