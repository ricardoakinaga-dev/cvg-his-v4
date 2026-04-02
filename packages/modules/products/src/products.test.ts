import assert from 'node:assert/strict';
import test from 'node:test';

import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';

import { ProductsService } from './index.js';

function createService() {
  return new ProductsService();
}

const ACCOUNT_ID = 'acc_test_001' as AccountId;

test('ProductsService create returns a product with correct fields', async () => {
  const service = createService();
  const product = await service.create(ACCOUNT_ID, {
    name: 'Dipirona 1g',
    code: 'MED-001',
    description: 'Analgésico injetável',
    basePrice: 12.5
  });

  assert.equal(product.accountId, ACCOUNT_ID);
  assert.equal(product.name, 'Dipirona 1g');
  assert.equal(product.code, 'MED-001');
  assert.equal(product.description, 'Analgésico injetável');
  assert.equal(product.basePrice, 12.5);
  assert.equal(product.active, true);
  assert.ok(product.id);
  assert.ok(product.createdAt);
  assert.ok(product.updatedAt);
});

test('ProductsService create defaults active to true', async () => {
  const service = createService();
  const product = await service.create(ACCOUNT_ID, {
    name: 'Product X',
    basePrice: 10
  });
  assert.equal(product.active, true);
});

test('ProductsService create can set active to false', async () => {
  const service = createService();
  const product = await service.create(ACCOUNT_ID, {
    name: 'Product Y',
    basePrice: 10,
    active: false
  });
  assert.equal(product.active, false);
});

test('ProductsService findById returns product by id', async () => {
  const service = createService();
  const product = await service.create(ACCOUNT_ID, { name: 'Test', basePrice: 5 });
  const found = service.findById(product.id);
  assert.ok(found);
  assert.equal(found.id, product.id);
  assert.equal(found.name, 'Test');
});

test('ProductsService findById returns undefined for unknown id', async () => {
  const service = createService();
  const found = service.findById('nonexistent');
  assert.equal(found, undefined);
});

test('ProductsService getOrThrow throws NotFoundError for unknown id', async () => {
  const service = createService();
  assert.throws(() => service.getOrThrow('nonexistent'), NotFoundError);
});

test('ProductsService update modifies fields', async () => {
  const service = createService();
  const product = await service.create(ACCOUNT_ID, { name: 'Original', basePrice: 10 });
  await new Promise((r) => setTimeout(r, 2));
  const updated = await service.update(product.id, { name: 'Updated', basePrice: 15 });
  assert.equal(updated.name, 'Updated');
  assert.equal(updated.basePrice, 15);
  assert.equal(updated.id, product.id);
  assert.ok(updated.updatedAt >= product.updatedAt);
});

test('ProductsService update throws NotFoundError for unknown id', async () => {
  const service = createService();
  await assert.rejects(() => service.update('nonexistent', { name: 'X' }), NotFoundError);
});

test('ProductsService update partial keeps unchanged fields', async () => {
  const service = createService();
  const product = await service.create(ACCOUNT_ID, {
    name: 'Full',
    code: 'CODE-1',
    description: 'Desc',
    basePrice: 20
  });
  const updated = await service.update(product.id, { basePrice: 25 });
  assert.equal(updated.name, 'Full');
  assert.equal(updated.code, 'CODE-1');
  assert.equal(updated.description, 'Desc');
  assert.equal(updated.basePrice, 25);
});

test('ProductsService list returns products for account', async () => {
  const service = createService();
  await service.create(ACCOUNT_ID, { name: 'Alpha', basePrice: 1 });
  await service.create(ACCOUNT_ID, { name: 'Beta', basePrice: 2 });
  const items = service.list(ACCOUNT_ID);
  assert.equal(items.length, 2);
  assert.equal(items[0].name, 'Alpha');
  assert.equal(items[1].name, 'Beta');
});

test('ProductsService list filters by active', async () => {
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

test('ProductsService list filters by search', async () => {
  const service = createService();
  await service.create(ACCOUNT_ID, { name: 'Dipirona', code: 'MED-001', basePrice: 1 });
  await service.create(ACCOUNT_ID, { name: 'Gaze', code: 'MAT-014', basePrice: 1 });
  const searchName = service.list(ACCOUNT_ID, { search: 'dip' });
  const searchCode = service.list(ACCOUNT_ID, { search: 'MAT' });
  assert.equal(searchName.length, 1);
  assert.equal(searchName[0].name, 'Dipirona');
  assert.equal(searchCode.length, 1);
  assert.equal(searchCode[0].code, 'MAT-014');
});

test('ProductsService list returns sorted by name', async () => {
  const service = createService();
  await service.create(ACCOUNT_ID, { name: 'Zebra', basePrice: 1 });
  await service.create(ACCOUNT_ID, { name: 'Alpha', basePrice: 1 });
  await service.create(ACCOUNT_ID, { name: 'Middle', basePrice: 1 });
  const items = service.list(ACCOUNT_ID);
  assert.equal(items[0].name, 'Alpha');
  assert.equal(items[1].name, 'Middle');
  assert.equal(items[2].name, 'Zebra');
});

test('ProductsService list isolates by account', async () => {
  const service = createService();
  await service.create('acc_A' as AccountId, { name: 'Product A', basePrice: 1 });
  await service.create('acc_B' as AccountId, { name: 'Product B', basePrice: 1 });
  const itemsA = service.list('acc_A' as AccountId);
  const itemsB = service.list('acc_B' as AccountId);
  assert.equal(itemsA.length, 1);
  assert.equal(itemsA[0].name, 'Product A');
  assert.equal(itemsB.length, 1);
  assert.equal(itemsB[0].name, 'Product B');
});

test('ProductsService toggle active via update', async () => {
  const service = createService();
  const product = await service.create(ACCOUNT_ID, { name: 'Toggle', basePrice: 1, active: true });
  const deactivated = await service.update(product.id, { active: false });
  assert.equal(deactivated.active, false);
  const reactivated = await service.update(product.id, { active: true });
  assert.equal(reactivated.active, true);
});

test('ProductsService persistenceMode is in-memory without repository', () => {
  const service = createService();
  assert.equal(service.persistenceMode, 'in-memory');
});
