import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ConflictError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { PackagesService } from './index.js';

const ACCOUNT = 'acc-packages-test' as AccountId;
const OTHER_ACCOUNT = 'acc-packages-other' as AccountId;
const USER = 'user-packages-test' as UserId;

test('PackagesService creates, activates and tracks package balance', async () => {
  const service = new PackagesService();
  const pkg = await service.create(ACCOUNT, USER, {
    ownerId: 'owner-1',
    patientId: 'patient-1',
    startsAt: '2026-06-01',
    expiresAt: '2026-07-31',
    notes: 'Pacote preventivo anual'
  });
  const item = await service.addItem(ACCOUNT, pkg.id, {
    itemKind: 'service',
    catalogItemId: 'svc-vaccine',
    nameSnapshot: 'Vacina V10',
    quantityPurchased: 3,
    unitPrice: 90
  });

  const activated = await service.activate(ACCOUNT, pkg.id);

  assert.equal(activated.status, 'active');
  assert.equal(activated.number, 'PKG-000001');
  assert.equal(activated.items.length, 1);
  assert.deepEqual(activated.balance, [
    {
      packageItemId: item.id,
      itemKind: 'service',
      nameSnapshot: 'Vacina V10',
      quantityPurchased: 3,
      quantityConsumed: 0,
      quantityAvailable: 3,
      validUntil: '2026-07-31'
    }
  ]);
});

test('PackagesService consumes sessions and completes package when balance reaches zero', async () => {
  const service = new PackagesService();
  const pkg = await service.create(ACCOUNT, USER, {
    ownerId: 'owner-1',
    startsAt: '2026-06-01',
    expiresAt: '2026-07-31'
  });
  const item = await service.addItem(ACCOUNT, pkg.id, {
    itemKind: 'service',
    nameSnapshot: 'Fisioterapia',
    quantityPurchased: 2,
    unitPrice: 120
  });
  await service.activate(ACCOUNT, pkg.id);

  const firstUse = await service.consumeItem(ACCOUNT, item.id, USER, {
    quantity: 1,
    consumedAt: '2026-06-15',
    sourceType: 'appointment',
    sourceId: 'appt-1'
  });
  assert.equal(firstUse.status, 'active');
  assert.equal(firstUse.balance[0]?.quantityAvailable, 1);
  assert.equal(firstUse.consumptions.length, 1);

  const completed = await service.consumeItem(ACCOUNT, item.id, USER, {
    quantity: 1,
    consumedAt: '2026-06-20',
    sourceType: 'encounter',
    sourceId: 'enc-1'
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.balance[0]?.quantityAvailable, 0);
  assert.ok(completed.completedAt);
});

test('PackagesService rejects consumption outside validity or above balance', async () => {
  const service = new PackagesService();
  const pkg = await service.create(ACCOUNT, USER, {
    ownerId: 'owner-1',
    startsAt: '2026-06-01',
    expiresAt: '2026-06-30'
  });
  const item = await service.addItem(ACCOUNT, pkg.id, {
    itemKind: 'service',
    nameSnapshot: 'Banho',
    quantityPurchased: 1,
    unitPrice: 80
  });
  await service.activate(ACCOUNT, pkg.id);

  await assert.rejects(
    () => service.consumeItem(ACCOUNT, item.id, USER, { quantity: 1, consumedAt: '2026-07-01' }),
    ConflictError
  );
  await assert.rejects(
    () => service.consumeItem(ACCOUNT, item.id, USER, { quantity: 2, consumedAt: '2026-06-15' }),
    ConflictError
  );
});

test('PackagesService renews package preserving rules and linking lineage', async () => {
  const service = new PackagesService();
  const original = await service.create(ACCOUNT, USER, {
    ownerId: 'owner-1',
    patientId: 'patient-1',
    startsAt: '2026-01-01',
    expiresAt: '2026-01-31'
  });
  await service.addItem(ACCOUNT, original.id, {
    itemKind: 'product',
    catalogItemId: 'prod-1',
    nameSnapshot: 'Antipulgas',
    quantityPurchased: 1,
    unitPrice: 60
  });
  await service.activate(ACCOUNT, original.id);

  const renewed = await service.renew(ACCOUNT, original.id, USER, {
    startsAt: '2026-02-01',
    expiresAt: '2026-02-28',
    notes: 'Renovacao mensal'
  });

  assert.equal(renewed.status, 'active');
  assert.equal(renewed.renewedFromPackageId, original.id);
  assert.equal(renewed.ownerId, original.ownerId);
  assert.equal(renewed.patientId, original.patientId);
  assert.equal(renewed.items[0]?.nameSnapshot, 'Antipulgas');
  assert.equal(renewed.balance[0]?.quantityAvailable, 1);
});

test('PackagesService validates activation, tenancy and validity windows', async () => {
  const service = new PackagesService();
  const pkg = await service.create(ACCOUNT, USER, { ownerId: 'owner-1' });

  await assert.rejects(() => service.activate(ACCOUNT, pkg.id), ConflictError);
  assert.throws(() => service.detail(OTHER_ACCOUNT, pkg.id), Error);
  await assert.rejects(
    () => service.create(ACCOUNT, USER, {
      ownerId: 'owner-1',
      startsAt: '2026-07-01',
      expiresAt: '2026-06-01'
    }),
    ValidationError
  );
});
