import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';

import { BillingService, type BillingRepository } from './index.js';

function createService() {
  return new BillingService({
    getOrThrow(encounterId: string) {
      return {
        id: encounterId,
        accountId: 'acc_test',
        patientId: 'patient_1',
        ownerId: 'owner_1'
      };
    }
  } as never);
}

function createRepository(overrides?: Partial<BillingRepository>): BillingRepository {
  const records = new Map<string, Parameters<BillingRepository['createRecord']>[0]>();
  const items = new Map<string, Parameters<BillingRepository['createItem']>[0][]>();
  return {
    async createRecord(record) {
      records.set(record.id, record);
      await overrides?.createRecord?.(record);
    },
    async updateRecord(record) {
      records.set(record.id, record);
      await overrides?.updateRecord?.(record);
    },
    async findRecordById(accountId, id) {
      if (overrides?.findRecordById) {
        const record = await overrides.findRecordById(accountId, id);
        if (record) records.set(record.id, record);
        return record;
      }
      const record = records.get(id);
      return record?.accountId === accountId ? record : null;
    },
    async findRecordByEncounter(accountId, encounterId) {
      if (overrides?.findRecordByEncounter) {
        const record = await overrides.findRecordByEncounter(accountId, encounterId);
        if (record) records.set(record.id, record);
        return record;
      }
      return (
        [...records.values()].find(
          (record) => record.accountId === accountId && record.encounterId === encounterId
        ) ?? null
      );
    },
    async findRecordsByAccountId(accountId) {
      if (overrides?.findRecordsByAccountId) {
        const persistedRecords = await overrides.findRecordsByAccountId(accountId);
        for (const record of persistedRecords) records.set(record.id, record);
        return persistedRecords;
      }
      return [...records.values()].filter((record) => record.accountId === accountId);
    },
    async findItemBySource(accountId, sourceEntityType, sourceEntityId) {
      if (overrides?.findItemBySource) {
        return overrides.findItemBySource(accountId, sourceEntityType, sourceEntityId);
      }
      return (
        [...items.values()]
          .flat()
          .find(
            (item) =>
              item.accountId === accountId &&
              item.sourceEntityType === sourceEntityType &&
              item.sourceEntityId === sourceEntityId
          ) ?? null
      );
    },
    async createItem(item) {
      const nextItems = [item, ...(items.get(item.billingRecordId) ?? [])];
      items.set(item.billingRecordId, nextItems);
      const record = records.get(item.billingRecordId);
      if (record) {
        records.set(record.id, {
          ...record,
          subtotalAmount: nextItems.reduce((total, current) => total + current.totalAmount, 0),
          updatedAt: item.createdAt
        });
      }
      await overrides?.createItem?.(item);
    },
    async findItemsByRecord(accountId, recordId) {
      if (overrides?.findItemsByRecord) {
        const persistedItems = await overrides.findItemsByRecord(accountId, recordId);
        items.set(recordId, [...persistedItems]);
        return persistedItems;
      }
      return (items.get(recordId) ?? []).filter((item) => item.accountId === accountId);
    }
  };
}

test('BillingService createEstimate moves billing record to estimated', async () => {
  const service = createService();

  const record = await service.createEstimate('acc_test' as never, {
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa inicial'
  });

  assert.equal(record.status, 'estimated');
  assert.equal(record.encounterId, 'encounter_1');
  assert.equal(record.administrativeNotes, 'Estimativa inicial');
});

test('BillingService replays a source-linked item without creating a duplicate', async () => {
  const repository = createRepository();
  const service = new BillingService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          ownerId: 'owner_1'
        };
      }
    } as never,
    { repository }
  );

  const payload = {
    encounterId: 'encounter_source_replay',
    itemType: 'daily_rate' as const,
    description: 'Diaria UTI',
    quantity: 1,
    unitPriceAmount: 180,
    sourceEntityType: 'inpatient_daily_charge' as const,
    sourceEntityId: 'stayday_123'
  };
  const first = await service.addItem('acc_test' as never, 'user_1' as never, payload);
  const replay = await service.addItem('acc_test' as never, 'user_1' as never, payload);

  assert.equal(replay.id, first.id);
  assert.equal(
    (await service.listItems('acc_test' as never, payload.encounterId as never)).length,
    1
  );
});

test('BillingService does not trust an uncommitted source item in the hot cache', async () => {
  let itemWrites = 0;
  const repository = createRepository({
    async createItem() {
      itemWrites += 1;
    },
    async findItemBySource() {
      // Model a row that was visible only to the request that later rolled
      // back. The authoritative repository must remain empty for the retry.
      return null;
    }
  });
  const service = new BillingService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          ownerId: 'owner_1'
        };
      }
    } as never,
    { repository }
  );

  const payload = {
    encounterId: 'encounter_uncommitted_cache',
    itemType: 'daily_rate' as const,
    description: 'Diaria UTI',
    quantity: 1,
    unitPriceAmount: 180,
    sourceEntityType: 'inpatient_daily_charge' as const,
    sourceEntityId: 'stayday_uncommitted'
  };
  const first = await service.addItem('acc_test' as never, 'user_1' as never, payload);
  const retry = await service.addItem('acc_test' as never, 'user_1' as never, payload);

  assert.notEqual(retry.id, first.id);
  assert.equal(itemWrites, 2);
});

test('BillingService read methods do not create billing records', async () => {
  let created = 0;
  const service = new BillingService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          ownerId: 'owner_1'
        };
      }
    } as never,
    {
      repository: createRepository({
        async createRecord() {
          created += 1;
        }
      })
    }
  );

  assert.equal(await service.findByEncounter('acc_test' as never, 'encounter_1' as never), null);
  assert.deepEqual(await service.listItems('acc_test' as never, 'encounter_1' as never), []);
  assert.equal(created, 0);
});

test('BillingService createEstimate explicitly creates repository record', async () => {
  let created = 0;
  const service = new BillingService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          ownerId: 'owner_1'
        };
      }
    } as never,
    {
      repository: createRepository({
        async createRecord(record) {
          created += 1;
          assert.equal(record.accountId, 'acc_test');
          assert.equal(record.encounterId, 'encounter_1');
        }
      })
    }
  );

  const record = await service.createEstimate('acc_test' as never, {
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa explicita'
  });

  assert.equal(created, 1);
  assert.equal(record.status, 'estimated');
});

test('BillingService addItem recalculates subtotal', async () => {
  const service = createService();

  await service.createEstimate('acc_test' as never, {
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa inicial'
  });

  const itemA = await service.addItem('acc_test' as never, 'finance_1' as never, {
    encounterId: 'encounter_1',
    itemType: 'service',
    description: 'Consulta',
    quantity: 1,
    unitPriceAmount: 120
  });
  const itemB = await service.addItem('acc_test' as never, 'finance_1' as never, {
    encounterId: 'encounter_1',
    itemType: 'exam',
    description: 'Hemograma',
    quantity: 2,
    unitPriceAmount: 35
  });

  const record = await service.getByEncounterOrThrow('acc_test' as never, 'encounter_1' as never);
  assert.equal(itemA.totalAmount, 120);
  assert.equal(itemB.totalAmount, 70);
  assert.equal(record.subtotalAmount, 190);
  assert.equal((await service.listItems('acc_test' as never, 'encounter_1' as never)).length, 2);
});

test('BillingService addItem explicitly creates record when missing and persists subtotal in memory', async () => {
  const createdRecords: string[] = [];
  const createdItems: string[] = [];
  const service = new BillingService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          ownerId: 'owner_1'
        };
      }
    } as never,
    {
      repository: createRepository({
        async createRecord(record) {
          createdRecords.push(record.id);
        },
        async createItem(item) {
          createdItems.push(item.id);
          assert.equal(item.accountId, 'acc_test');
          assert.equal(item.billingRecordId, createdRecords[0]);
        }
      })
    }
  );

  await service.addItem('acc_test' as never, 'finance_1' as never, {
    encounterId: 'encounter_1',
    itemType: 'service',
    description: 'Consulta',
    quantity: 2,
    unitPriceAmount: 100
  });

  const record = await service.getByEncounterOrThrow('acc_test' as never, 'encounter_1' as never);
  assert.equal(createdRecords.length, 1);
  assert.equal(createdItems.length, 1);
  assert.equal(record.subtotalAmount, 200);
});

test('BillingService updateStatus does not create a missing persistent record', async () => {
  let created = 0;
  const service = new BillingService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          ownerId: 'owner_1'
        };
      }
    } as never,
    {
      repository: createRepository({
        async createRecord() {
          created += 1;
        }
      })
    }
  );

  await assert.rejects(
    async () =>
      service.updateStatus('acc_test' as never, 'encounter_missing' as never, {
        status: 'open',
        administrativeNotes: 'Tentativa sem estimativa'
      }),
    NotFoundError
  );
  assert.equal(created, 0);
});

test('BillingService settleByRecordId moves record to settled', async () => {
  const service = createService();

  const record = await service.createEstimate('acc_test' as never, {
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa para liquidacao PIX'
  });

  assert.equal(record.status, 'estimated');

  const settled = await service.settleByRecordId('acc_test' as never, record.id);

  assert.equal(settled.status, 'settled');
});

test('BillingService blocks adding items to settled record', async () => {
  const service = createService();

  await service.createEstimate('acc_test' as never, {
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa inicial'
  });
  await service.updateStatus('acc_test' as never, 'encounter_1' as never, {
    status: 'settled'
  });

  await assert.rejects(
    async () =>
      service.addItem('acc_test' as never, 'finance_1' as never, {
        encounterId: 'encounter_1',
        itemType: 'service',
        description: 'Consulta',
        quantity: 1,
        unitPriceAmount: 120
      }),
    ConflictError
  );
});

test('BillingService rejects backwards status transitions', async () => {
  const service = createService();
  await service.createEstimate('acc_test' as never, { encounterId: 'encounter_1' });

  await assert.rejects(
    () => service.updateStatus('acc_test' as never, 'encounter_1' as never, { status: 'draft' }),
    ConflictError
  );
  assert.equal(
    (await service.updateStatus('acc_test' as never, 'encounter_1' as never, { status: 'open' }))
      .status,
    'open'
  );
  assert.equal(
    (await service.updateStatus('acc_test' as never, 'encounter_1' as never, { status: 'settled' }))
      .status,
    'settled'
  );
});

test('BillingService list filters by encounter', async () => {
  const service = createService();

  await service.createEstimate('acc_test' as never, {
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa inicial'
  });
  await service.createEstimate('acc_test' as never, {
    encounterId: 'encounter_2',
    administrativeNotes: 'Estimativa 2'
  });

  assert.equal(service.list('acc_test' as never).length, 2);
  assert.equal(service.list('acc_test' as never, 'encounter_1').length, 1);
  assert.equal(service.list('acc_test' as never, 'encounter_1')[0].encounterId, 'encounter_1');
});

test('BillingService list filters by patient and owner without losing encounter filter compatibility', async () => {
  const service = new BillingService({
    getOrThrow(encounterId: string) {
      const isSecondEncounter = encounterId === 'encounter_2';
      return {
        id: encounterId,
        accountId: 'acc_test',
        patientId: isSecondEncounter ? 'patient_2' : 'patient_1',
        ownerId: isSecondEncounter ? 'owner_2' : 'owner_1'
      };
    }
  } as never);

  await service.createEstimate('acc_test' as never, {
    encounterId: 'encounter_1',
    administrativeNotes: 'Comanda do paciente 1'
  });
  await service.createEstimate('acc_test' as never, {
    encounterId: 'encounter_2',
    administrativeNotes: 'Comanda do paciente 2'
  });

  assert.equal(service.list('acc_test' as never, { patientId: 'patient_1' }).length, 1);
  assert.equal(
    service.list('acc_test' as never, { patientId: 'patient_1' })[0].encounterId,
    'encounter_1'
  );
  assert.equal(service.list('acc_test' as never, { ownerId: 'owner_2' }).length, 1);
  assert.equal(service.list('acc_test' as never, { ownerId: 'owner_2' })[0].patientId, 'patient_2');
  assert.equal(
    service.list('acc_test' as never, { encounterId: 'encounter_2', patientId: 'patient_2' })
      .length,
    1
  );
  assert.equal(service.list('acc_test' as never, 'encounter_1').length, 1);
});

test('BillingService hydrates records and items from repository', async () => {
  const repository = createRepository({
    async findRecordsByAccountId() {
      return [
        {
          id: 'bill_repo_1' as never,
          accountId: 'acc_test' as never,
          encounterId: 'encounter_repo' as never,
          patientId: 'patient_1' as never,
          ownerId: 'owner_1' as never,
          status: 'open',
          subtotalAmount: 90,
          currency: 'BRL',
          createdAt: '2026-04-13T00:00:00.000Z',
          updatedAt: '2026-04-13T00:00:00.000Z'
        }
      ];
    },
    async findItemsByRecord(accountId, recordId) {
      assert.equal(accountId, 'acc_test');
      assert.equal(recordId, 'bill_repo_1');
      return [
        {
          id: 'bill_item_repo_1' as never,
          billingRecordId: 'bill_repo_1' as never,
          accountId: 'acc_test' as never,
          encounterId: 'encounter_repo' as never,
          itemType: 'service',
          description: 'Consulta carregada do repo',
          quantity: 1,
          unitPriceAmount: 90,
          totalAmount: 90,
          createdByUserId: 'finance_1' as never,
          createdAt: '2026-04-13T00:00:00.000Z'
        }
      ];
    }
  });

  const service = new BillingService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          ownerId: 'owner_1'
        };
      }
    } as never,
    { repository }
  );

  await service.hydrateFromDatabase('acc_test' as never);

  assert.equal(service.list('acc_test' as never).length, 1);
  assert.equal(service.getOrThrow('acc_test' as never, 'bill_repo_1' as never).status, 'open');
  assert.equal((await service.listItems('acc_test' as never, 'encounter_repo' as never)).length, 1);
});

test('BillingService filters foreign and malformed repository data during hydration', async () => {
  const record = {
    id: 'bill_repo_scoped' as never,
    accountId: 'acc_test' as never,
    encounterId: 'encounter_scoped' as never,
    patientId: 'patient_1' as never,
    ownerId: 'owner_1' as never,
    status: 'open' as const,
    subtotalAmount: 90,
    currency: 'BRL' as const,
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z'
  };
  const item = {
    id: 'bill_item_scoped' as never,
    billingRecordId: record.id,
    accountId: record.accountId,
    encounterId: record.encounterId,
    itemType: 'service' as const,
    description: 'Consulta valida',
    quantity: 1,
    unitPriceAmount: 90,
    totalAmount: 90,
    createdByUserId: 'finance_1' as never,
    createdAt: record.createdAt
  };
  const repository = createRepository({
    async findRecordsByAccountId() {
      return [
        record,
        { ...record, id: 'bill_repo_foreign' as never, accountId: 'acc_other' as never }
      ];
    },
    async findItemsByRecord() {
      return [
        item,
        { ...item, id: 'bill_item_foreign' as never, accountId: 'acc_other' as never },
        { ...item, id: 'bill_item_wrong_record' as never, billingRecordId: 'bill_other' as never },
        {
          ...item,
          id: 'bill_item_wrong_encounter' as never,
          encounterId: 'encounter_other' as never
        }
      ];
    }
  });
  const service = new BillingService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          ownerId: 'owner_1'
        };
      }
    } as never,
    { repository }
  );

  await service.hydrateFromDatabase('acc_test' as never);

  assert.deepEqual(service.list('acc_test' as never), [record]);
  assert.deepEqual(await service.listItems('acc_test' as never, 'encounter_scoped' as never), [
    item
  ]);
  assert.throws(
    () => service.getOrThrow('acc_test' as never, 'bill_repo_foreign' as never),
    NotFoundError
  );
});

test('BillingService never resurrects cached items after the repository becomes empty', async () => {
  const record = {
    id: 'bill_repo_rollback' as never,
    accountId: 'acc_test' as never,
    encounterId: 'encounter_rollback' as never,
    patientId: 'patient_1' as never,
    ownerId: 'owner_1' as never,
    status: 'open' as const,
    subtotalAmount: 90,
    currency: 'BRL' as const,
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z'
  };
  const item = {
    id: 'bill_item_rollback' as never,
    billingRecordId: record.id,
    accountId: record.accountId,
    encounterId: record.encounterId,
    itemType: 'service' as const,
    description: 'Item revertido',
    quantity: 1,
    unitPriceAmount: 90,
    totalAmount: 90,
    createdByUserId: 'finance_1' as never,
    createdAt: record.createdAt
  };
  let itemReads = 0;
  const repository = createRepository({
    async findRecordByEncounter() {
      return record;
    },
    async findItemsByRecord() {
      itemReads += 1;
      return itemReads === 1 ? [item] : [];
    }
  });
  const service = new BillingService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          ownerId: 'owner_1'
        };
      }
    } as never,
    { repository }
  );

  assert.deepEqual(await service.listItems('acc_test' as never, 'encounter_rollback' as never), []);
});

test('BillingService refreshes cached records from the authoritative repository', async () => {
  let persistedStatus: 'open' | 'settled' = 'open';
  const persistedRecord = () => ({
    id: 'bill_repo_authoritative' as never,
    accountId: 'acc_test' as never,
    encounterId: 'encounter_repo' as never,
    patientId: 'patient_1' as never,
    ownerId: 'owner_1' as never,
    status: persistedStatus,
    subtotalAmount: 90,
    currency: 'BRL' as const,
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z'
  });
  const repository = createRepository({
    async findRecordsByAccountId() {
      return [persistedRecord()];
    },
    async findRecordByEncounter() {
      return persistedRecord();
    }
  });
  const service = new BillingService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          ownerId: 'owner_1'
        };
      }
    } as never,
    { repository }
  );

  await service.hydrateFromDatabase('acc_test' as never);
  assert.equal(
    (await service.findByEncounter('acc_test' as never, 'encounter_repo' as never))?.status,
    'open'
  );

  persistedStatus = 'settled';

  assert.equal(
    (await service.findByEncounter('acc_test' as never, 'encounter_repo' as never))?.status,
    'settled'
  );
  await assert.rejects(
    () =>
      service.addItem('acc_test' as never, 'finance_1' as never, {
        encounterId: 'encounter_repo',
        itemType: 'service',
        description: 'Item tardio',
        quantity: 1,
        unitPriceAmount: 10
      }),
    ConflictError
  );
});

test('BillingService lists repository state authoritatively for a tenant', async () => {
  const repository = createRepository({
    async findRecordsByAccountId(accountId) {
      assert.equal(accountId, 'acc_test');
      return [
        {
          id: 'bill_repo_list' as never,
          accountId,
          encounterId: 'encounter_repo' as never,
          patientId: 'patient_1' as never,
          ownerId: 'owner_1' as never,
          status: 'settled',
          subtotalAmount: 90,
          currency: 'BRL',
          createdAt: '2026-04-13T00:00:00.000Z',
          updatedAt: '2026-04-13T00:00:00.000Z'
        }
      ];
    }
  });
  const service = new BillingService({ getOrThrow() {} } as never, { repository });

  const records = await service.listAuthoritative({ accountId: 'acc_test' as never });

  assert.equal(records.length, 1);
  assert.equal(records[0]?.status, 'settled');
});

test('BillingService reuses repository record and triggers callbacks only on real status changes', async () => {
  const created: string[] = [];
  const changes: string[] = [];
  const repository = createRepository({
    async findRecordByEncounter(accountId, encounterId) {
      assert.equal(accountId, 'acc_test');
      assert.equal(encounterId, 'encounter_repo');
      return {
        id: 'bill_repo_2' as never,
        accountId: 'acc_test' as never,
        encounterId: 'encounter_repo' as never,
        patientId: 'patient_1' as never,
        ownerId: 'owner_1' as never,
        status: 'draft',
        subtotalAmount: 0,
        currency: 'BRL',
        createdAt: '2026-04-13T00:00:00.000Z',
        updatedAt: '2026-04-13T00:00:00.000Z'
      };
    },
    async findItemsByRecord() {
      return [];
    }
  });

  const service = new BillingService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1',
          ownerId: 'owner_1'
        };
      }
    } as never,
    {
      repository,
      onRecordCreated: async (record) => {
        created.push(record.id);
      },
      onStatusChanged: async (record, previousStatus) => {
        changes.push(`${previousStatus}->${record.status}`);
      }
    }
  );

  const reused = await service.ensureRecord('acc_test' as never, 'encounter_repo' as never);
  const unchanged = await service.updateStatus('acc_test' as never, 'encounter_repo' as never, {
    status: 'draft'
  });
  const changed = await service.updateStatus('acc_test' as never, 'encounter_repo' as never, {
    status: 'open'
  });

  assert.equal(reused.id, 'bill_repo_2');
  assert.equal(unchanged.status, 'draft');
  assert.equal(changed.status, 'open');
  assert.equal(created.length, 0);
  assert.deepEqual(changes, ['draft->open']);
});

test('BillingService requires account scope for every record and command boundary', async () => {
  const encounters = new Map([
    [
      'encounter_a',
      {
        id: 'encounter_a',
        accountId: 'account_a',
        patientId: 'patient_a',
        ownerId: 'owner_a'
      }
    ],
    [
      'encounter_b',
      {
        id: 'encounter_b',
        accountId: 'account_b',
        patientId: 'patient_b',
        ownerId: 'owner_b'
      }
    ]
  ]);
  const service = new BillingService({
    getOrThrow(encounterId: string) {
      const encounter = encounters.get(encounterId);
      if (!encounter) throw new NotFoundError('Encounter not found', { encounterId });
      return encounter;
    }
  } as never);
  const scoped = service as unknown as {
    createEstimate: (
      ...args: unknown[]
    ) => Promise<{ id: string; encounterId: string; status: string }>;
    addItem: (...args: unknown[]) => Promise<{ id: string }>;
    findByEncounter: (...args: unknown[]) => Promise<{ id: string; status: string } | null>;
    getByEncounterOrThrow: (...args: unknown[]) => Promise<{ id: string; status: string }>;
    getOrThrow: (...args: unknown[]) => { id: string; status: string };
    list: (...args: unknown[]) => readonly { id: string }[];
    listItems: (...args: unknown[]) => Promise<readonly { id: string }[]>;
    updateStatus: (...args: unknown[]) => Promise<{ id: string; status: string }>;
    settleByRecordId: (...args: unknown[]) => Promise<{ id: string; status: string }>;
  };
  const estimatePayload = { encounterId: 'encounter_a', administrativeNotes: 'Tenant A' };
  const itemPayload = {
    encounterId: 'encounter_a',
    itemType: 'service' as const,
    description: 'Consulta A',
    quantity: 1,
    unitPriceAmount: 120
  };

  const record = await scoped.createEstimate('account_a', estimatePayload);
  await scoped.addItem('account_a', 'user_a', itemPayload);

  assert.equal((await scoped.findByEncounter('account_a', 'encounter_a'))?.id, record.id);
  assert.equal((await scoped.getByEncounterOrThrow('account_a', 'encounter_a')).id, record.id);
  assert.equal(scoped.getOrThrow('account_a', record.id).id, record.id);
  assert.equal(scoped.list('account_a').length, 1);
  assert.equal((await scoped.listItems('account_a', 'encounter_a')).length, 1);

  await assert.rejects(() => scoped.findByEncounter('account_b', 'encounter_a'), NotFoundError);
  await assert.rejects(
    () => scoped.getByEncounterOrThrow('account_b', 'encounter_a'),
    NotFoundError
  );
  assert.throws(() => scoped.getOrThrow('account_b', record.id), NotFoundError);
  assert.equal(scoped.list('account_b').length, 0);
  await assert.rejects(() => scoped.listItems('account_b', 'encounter_a'), NotFoundError);
  await assert.rejects(() => scoped.createEstimate('account_b', estimatePayload), NotFoundError);
  await assert.rejects(() => scoped.addItem('account_b', 'user_b', itemPayload), NotFoundError);
  await assert.rejects(
    () => scoped.updateStatus('account_b', 'encounter_a', { status: 'open' }),
    NotFoundError
  );
  await assert.rejects(() => scoped.settleByRecordId('account_b', record.id), NotFoundError);

  assert.equal((await scoped.findByEncounter('account_a', 'encounter_a'))?.status, 'estimated');
  assert.equal((await scoped.listItems('account_a', 'encounter_a')).length, 1);
  assert.equal(
    (await scoped.updateStatus('account_a', 'encounter_a', { status: 'open' })).status,
    'open'
  );
  assert.equal((await scoped.settleByRecordId('account_a', record.id)).status, 'settled');
});
