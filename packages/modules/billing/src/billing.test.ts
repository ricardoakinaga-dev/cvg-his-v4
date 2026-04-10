import assert from 'node:assert/strict';
import test from 'node:test';

import { ConflictError } from '@cvg-his-v2/shared-errors';

import { BillingService } from './index.js';

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
