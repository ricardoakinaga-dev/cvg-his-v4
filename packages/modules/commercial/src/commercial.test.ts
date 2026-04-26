import assert from 'node:assert/strict';
import test from 'node:test';

import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { CommercialService } from './index.js';

const ACCOUNT = 'acc-commercial-test' as AccountId;
const OTHER_ACCOUNT = 'acc-commercial-other' as AccountId;
const USER = 'user-commercial-test' as UserId;

test('CommercialService tracks loyalty balance and redemptions by owner', async () => {
  const service = new CommercialService();
  const program = await service.createLoyaltyProgram(ACCOUNT, {
    name: 'Programa CVG',
    pointsPerReal: 1.5
  });
  await service.awardPoints(ACCOUNT, USER, {
    ownerId: 'owner-1',
    points: 150,
    programId: program.id,
    sourceType: 'purchase',
    sourceId: 'sale-1'
  });
  await service.awardPoints(ACCOUNT, USER, {
    ownerId: 'owner-1',
    points: 40,
    isBlocked: true
  });

  const redemption = await service.redeemPoints(ACCOUNT, USER, {
    ownerId: 'owner-1',
    pointsUsed: 50,
    rewardDescription: 'Banho premium',
    serviceQuantity: 1
  });

  assert.equal(redemption.status, 'completed');
  assert.deepEqual(service.getLoyaltyBalance(ACCOUNT, 'owner-1'), {
    ownerId: 'owner-1',
    availablePoints: 100,
    blockedPoints: 40,
    redeemedPoints: 50,
    redemptionCount: 1
  });
});

test('CommercialService rejects redemption above available balance', async () => {
  const service = new CommercialService();
  await service.awardPoints(ACCOUNT, USER, { ownerId: 'owner-1', points: 10 });

  await assert.rejects(
    () => service.redeemPoints(ACCOUNT, USER, {
      ownerId: 'owner-1',
      pointsUsed: 20,
      rewardDescription: 'Produto'
    }),
    ConflictError
  );
});

test('CommercialService isolates price tables by account', async () => {
  const service = new CommercialService();
  const table = await service.createPriceTable(ACCOUNT, {
    legacyId: '1',
    description: 'Tabela final de semana'
  });
  await service.createPriceTable(OTHER_ACCOUNT, {
    legacyId: '2',
    description: 'Tabela outra conta'
  });
  const item = await service.addPriceTableItem(ACCOUNT, table.id, {
    itemKind: 'service',
    itemId: 'svc-1',
    price: 120.55
  });

  assert.equal(item.price, 120.55);
  assert.equal(service.listPriceTables(ACCOUNT).length, 1);
  assert.equal(service.getPriceTableDetail(ACCOUNT, table.id).items.length, 1);
  assert.throws(() => service.getPriceTableDetail(OTHER_ACCOUNT, table.id), NotFoundError);

  const updated = await service.updatePriceTable(ACCOUNT, table.id, {
    legacyId: '1',
    description: 'Tabela final de semana premium',
    context: 'Final de semana e feriados',
    isActive: true
  });
  assert.equal(updated.description, 'Tabela final de semana premium');
  assert.equal(service.listPriceTables(ACCOUNT, { search: 'feriados' }).length, 1);

  const archived = await service.archivePriceTable(ACCOUNT, table.id);
  assert.equal(archived.isActive, false);
  assert.equal(service.listPriceTables(ACCOUNT, { active: true }).length, 0);
});

test('CommercialService validates price table windows', async () => {
  const service = new CommercialService();
  await assert.rejects(
    () => service.createPriceTable(ACCOUNT, {
      description: 'Janela invalida',
      startsAt: '2026-05-02T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z'
    }),
    ValidationError
  );
});

test('CommercialService creates and updates POS sync jobs', async () => {
  const service = new CommercialService();
  const job = await service.createPosSyncJob(ACCOUNT, USER, {
    syncKind: 'stock',
    metadata: { source: 'pdv' }
  });
  assert.equal(job.status, 'queued');

  const running = await service.updatePosSyncJob(ACCOUNT, job.id, {
    status: 'running'
  });
  assert.equal(running.status, 'running');
  assert.ok(running.startedAt);

  const completed = await service.updatePosSyncJob(ACCOUNT, job.id, {
    status: 'completed',
    processedCount: 42
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.processedCount, 42);
  assert.ok(completed.finishedAt);
});
