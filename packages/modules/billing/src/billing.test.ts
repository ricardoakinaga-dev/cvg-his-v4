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
  return {
    async createRecord() {},
    async updateRecord() {},
    async findRecordById() {
      return null;
    },
    async findRecordByEncounter() {
      return null;
    },
    async findRecordsByAccountId() {
      return [];
    },
    async createItem() {},
    async findItemsByRecord() {
      return [];
    },
    ...overrides
  };
}

test('BillingService createEstimate moves billing record to estimated', async () => {
  const service = createService();

  const record = await service.createEstimate({
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa inicial'
  });

  assert.equal(record.status, 'estimated');
  assert.equal(record.encounterId, 'encounter_1');
  assert.equal(record.administrativeNotes, 'Estimativa inicial');
});

test('BillingService rejects cross-account reads and writes before mutation', async () => {
  const service = createService();
  await assert.rejects(
    () => service.createEstimate({ encounterId: 'encounter_1' }, 'acc_other' as never),
    NotFoundError
  );
  const record = await service.createEstimate({ encounterId: 'encounter_1' }, 'acc_test' as never);
  assert.equal(record.accountId, 'acc_test');
  assert.equal(await service.findByEncounter('encounter_1' as never, 'acc_other' as never), null);
  await assert.rejects(
    () =>
      service.addItem(
        'user_other' as never,
        {
          encounterId: 'encounter_1',
          itemType: 'service',
          description: 'Tentativa entre contas',
          quantity: 1,
          unitPriceAmount: 10
        },
        'acc_other' as never
      ),
    NotFoundError
  );
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

  assert.equal(await service.findByEncounter('encounter_1' as never), null);
  assert.deepEqual(await service.listItems('encounter_1' as never), []);
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

  const record = await service.createEstimate({
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa explicita'
  });

  assert.equal(created, 1);
  assert.equal(record.status, 'estimated');
});

test('BillingService addItem recalculates subtotal', async () => {
  const service = createService();

  await service.createEstimate({
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa inicial'
  });

  const itemA = await service.addItem('finance_1' as never, {
    encounterId: 'encounter_1',
    itemType: 'service',
    description: 'Consulta',
    quantity: 1,
    unitPriceAmount: 120
  });
  const itemB = await service.addItem('finance_1' as never, {
    encounterId: 'encounter_1',
    itemType: 'exam',
    description: 'Hemograma',
    quantity: 2,
    unitPriceAmount: 35
  });

  const record = await service.getByEncounterOrThrow('encounter_1' as never);
  assert.equal(itemA.totalAmount, 120);
  assert.equal(itemB.totalAmount, 70);
  assert.equal(record.subtotalAmount, 190);
  assert.equal((await service.listItems('encounter_1' as never)).length, 2);
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

  await service.addItem('finance_1' as never, {
    encounterId: 'encounter_1',
    itemType: 'service',
    description: 'Consulta',
    quantity: 2,
    unitPriceAmount: 100
  });

  const record = await service.getByEncounterOrThrow('encounter_1' as never);
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
      service.updateStatus('encounter_missing' as never, {
        status: 'open',
        administrativeNotes: 'Tentativa sem estimativa'
      }),
    NotFoundError
  );
  assert.equal(created, 0);
});

test('BillingService settleByRecordId moves record to settled', async () => {
  const service = createService();

  const record = await service.createEstimate({
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa para liquidacao PIX'
  });

  assert.equal(record.status, 'estimated');

  const settled = await service.settleByRecordId(record.id);

  assert.equal(settled.status, 'settled');
});

test('BillingService blocks adding items to settled record', async () => {
  const service = createService();

  await service.createEstimate({
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa inicial'
  });
  await service.updateStatus('encounter_1' as never, {
    status: 'settled'
  });

  await assert.rejects(
    async () =>
      service.addItem('finance_1' as never, {
        encounterId: 'encounter_1',
        itemType: 'service',
        description: 'Consulta',
        quantity: 1,
        unitPriceAmount: 120
      }),
    ConflictError
  );
});

test('BillingService list filters by encounter', async () => {
  const service = createService();

  await service.createEstimate({
    encounterId: 'encounter_1',
    administrativeNotes: 'Estimativa inicial'
  });
  await service.createEstimate({
    encounterId: 'encounter_2',
    administrativeNotes: 'Estimativa 2'
  });

  assert.equal(service.list().length, 2);
  assert.equal(service.list('encounter_1').length, 1);
  assert.equal(service.list('encounter_1')[0].encounterId, 'encounter_1');
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

  await service.createEstimate({
    encounterId: 'encounter_1',
    administrativeNotes: 'Comanda do paciente 1'
  });
  await service.createEstimate({
    encounterId: 'encounter_2',
    administrativeNotes: 'Comanda do paciente 2'
  });

  assert.equal(service.list({ patientId: 'patient_1' }).length, 1);
  assert.equal(service.list({ patientId: 'patient_1' })[0].encounterId, 'encounter_1');
  assert.equal(service.list({ ownerId: 'owner_2' }).length, 1);
  assert.equal(service.list({ ownerId: 'owner_2' })[0].patientId, 'patient_2');
  assert.equal(service.list({ encounterId: 'encounter_2', patientId: 'patient_2' }).length, 1);
  assert.equal(service.list('encounter_1').length, 1);
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

  assert.equal(service.list().length, 1);
  assert.equal(service.getOrThrow('bill_repo_1' as never).status, 'open');
  assert.equal((await service.listItems('encounter_repo' as never)).length, 1);
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

  const reused = await service.ensureRecord('encounter_repo' as never);
  const unchanged = await service.updateStatus('encounter_repo' as never, { status: 'draft' });
  const changed = await service.updateStatus('encounter_repo' as never, { status: 'open' });

  assert.equal(reused.id, 'bill_repo_2');
  assert.equal(unchanged.status, 'draft');
  assert.equal(changed.status, 'open');
  assert.equal(created.length, 0);
  assert.deepEqual(changes, ['draft->open']);
});
