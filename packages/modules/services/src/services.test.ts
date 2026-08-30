import assert from 'node:assert/strict';
import { test } from 'vitest';

import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';

import { ServicesService } from './index.js';

function createService() {
  return new ServicesService();
}

const ACCOUNT_ID = 'acc_test_001' as AccountId;

test('ServicesService create returns a service with correct fields', async () => {
  const service = createService();
  const svc = await service.create(ACCOUNT_ID, {
    name: 'Consulta Clinica',
    code: 'SRV-001',
    description: 'Consulta veterinaria geral',
    basePrice: 120
  });

  assert.equal(svc.accountId, ACCOUNT_ID);
  assert.equal(svc.name, 'Consulta Clinica');
  assert.equal(svc.code, 'SRV-001');
  assert.equal(svc.description, 'Consulta veterinaria geral');
  assert.equal(svc.basePrice, 120);
  assert.equal(svc.active, true);
  assert.ok(svc.id);
  assert.ok(svc.createdAt);
  assert.ok(svc.updatedAt);
});

test('ServicesService create defaults active to true', async () => {
  const service = createService();
  const svc = await service.create(ACCOUNT_ID, {
    name: 'Service X',
    basePrice: 50
  });
  assert.equal(svc.active, true);
});

test('ServicesService create can set active to false', async () => {
  const service = createService();
  const svc = await service.create(ACCOUNT_ID, {
    name: 'Service Y',
    basePrice: 50,
    active: false
  });
  assert.equal(svc.active, false);
});

test('ServicesService findById returns service by id', async () => {
  const service = createService();
  const svc = await service.create(ACCOUNT_ID, { name: 'Test', basePrice: 5 });
  const found = service.findById(svc.id);
  assert.ok(found);
  assert.equal(found.id, svc.id);
  assert.equal(found.name, 'Test');
});

test('ServicesService findById returns undefined for unknown id', async () => {
  const service = createService();
  const found = service.findById('nonexistent');
  assert.equal(found, undefined);
});

test('ServicesService getOrThrow throws NotFoundError for unknown id', async () => {
  const service = createService();
  assert.throws(() => service.getOrThrow('nonexistent'), NotFoundError);
});

test('ServicesService update modifies fields', async () => {
  const service = createService();
  const svc = await service.create(ACCOUNT_ID, { name: 'Original', basePrice: 10 });
  await new Promise((r) => setTimeout(r, 2));
  const updated = await service.update(svc.id, { name: 'Updated', basePrice: 15 });
  assert.equal(updated.name, 'Updated');
  assert.equal(updated.basePrice, 15);
  assert.equal(updated.id, svc.id);
  assert.ok(updated.updatedAt >= svc.updatedAt);
});

test('ServicesService update throws NotFoundError for unknown id', async () => {
  const service = createService();
  await assert.rejects(() => service.update('nonexistent', { name: 'X' }), NotFoundError);
});

test('ServicesService update partial keeps unchanged fields', async () => {
  const service = createService();
  const svc = await service.create(ACCOUNT_ID, {
    name: 'Full',
    code: 'CODE-1',
    description: 'Desc',
    basePrice: 20
  });
  const updated = await service.update(svc.id, { basePrice: 25 });
  assert.equal(updated.name, 'Full');
  assert.equal(updated.code, 'CODE-1');
  assert.equal(updated.description, 'Desc');
  assert.equal(updated.basePrice, 25);
});

test('ServicesService list returns services for account', async () => {
  const service = createService();
  await service.create(ACCOUNT_ID, { name: 'Alpha', basePrice: 1 });
  await service.create(ACCOUNT_ID, { name: 'Beta', basePrice: 2 });
  const items = service.list(ACCOUNT_ID);
  assert.equal(items.length, 2);
  assert.equal(items[0].name, 'Alpha');
  assert.equal(items[1].name, 'Beta');
});

test('ServicesService list filters by active', async () => {
  const service = createService();
  await service.create(ACCOUNT_ID, { name: 'Active', basePrice: 1, active: true });
  await service.create(ACCOUNT_ID, { name: 'Inactive', basePrice: 1, active: false });
  const activeItems = service.list(ACCOUNT_ID, { active: true });
  const inactiveItems = service.list(ACCOUNT_ID, { active: false });
  assert.equal(activeItems.length, 1);
  assert.equal(activeItems[0].name, 'Active');
  assert.equal(inactiveItems.length, 1);
  assert.equal(inactiveItems[0].name, 'Inactive');
});

test('ServicesService list filters by search', async () => {
  const service = createService();
  await service.create(ACCOUNT_ID, { name: 'Consulta', code: 'SRV-001', basePrice: 1 });
  await service.create(ACCOUNT_ID, { name: 'Banho', code: 'SRV-002', basePrice: 1 });
  const searchName = service.list(ACCOUNT_ID, { search: 'cons' });
  const searchCode = service.list(ACCOUNT_ID, { search: 'SRV-002' });
  assert.equal(searchName.length, 1);
  assert.equal(searchName[0].name, 'Consulta');
  assert.equal(searchCode.length, 1);
  assert.equal(searchCode[0].code, 'SRV-002');
});

test('ServicesService list returns sorted by name', async () => {
  const service = createService();
  await service.create(ACCOUNT_ID, { name: 'Zebra', basePrice: 1 });
  await service.create(ACCOUNT_ID, { name: 'Alpha', basePrice: 1 });
  await service.create(ACCOUNT_ID, { name: 'Middle', basePrice: 1 });
  const items = service.list(ACCOUNT_ID);
  assert.equal(items[0].name, 'Alpha');
  assert.equal(items[1].name, 'Middle');
  assert.equal(items[2].name, 'Zebra');
});

test('ServicesService list isolates by account', async () => {
  const service = createService();
  await service.create('acc_A' as AccountId, { name: 'Service A', basePrice: 1 });
  await service.create('acc_B' as AccountId, { name: 'Service B', basePrice: 1 });
  const itemsA = service.list('acc_A' as AccountId);
  const itemsB = service.list('acc_B' as AccountId);
  assert.equal(itemsA.length, 1);
  assert.equal(itemsA[0].name, 'Service A');
  assert.equal(itemsB.length, 1);
  assert.equal(itemsB[0].name, 'Service B');
});

test('ServicesService toggle active via update', async () => {
  const service = createService();
  const svc = await service.create(ACCOUNT_ID, { name: 'Toggle', basePrice: 1, active: true });
  const deactivated = await service.update(svc.id, { active: false });
  assert.equal(deactivated.active, false);
  const reactivated = await service.update(svc.id, { active: true });
  assert.equal(reactivated.active, true);
});

test('ServicesService persistenceMode is in-memory without repository', () => {
  const service = createService();
  assert.equal(service.persistenceMode, 'in-memory');
});

test('ServicesService hydrates tenant-scoped records from a database repository', async () => {
  const persisted = {
    id: 'service-persisted-1',
    accountId: ACCOUNT_ID,
    name: 'Persisted Consultation',
    code: 'PERSISTED-001',
    description: 'Loaded from the services table',
    basePrice: 175.25,
    active: true,
    createdAt: '2026-08-26T10:00:00.000Z',
    updatedAt: '2026-08-26T10:00:00.000Z'
  };
  const service = new ServicesService({
    repository: {
      async create() {},
      async update() {},
      async findById() {
        return null;
      },
      async findByAccountId(accountId) {
        return accountId === ACCOUNT_ID ? [persisted] : [];
      }
    }
  });

  await service.hydrateFromDatabase(ACCOUNT_ID);

  assert.equal(service.persistenceMode, 'database');
  assert.deepEqual(service.list(ACCOUNT_ID), [persisted]);
  assert.deepEqual(service.list('acc_other' as AccountId), []);
});
