import assert from 'node:assert/strict';
import test from 'node:test';

import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';

import { InventoryService } from './index.js';

function createService() {
  return new InventoryService({
    getOrThrow(encounterId: string) {
      return {
        id: encounterId,
        accountId: 'acc_test',
        patientId: 'patient_1'
      };
    }
  } as never);
}

test('InventoryService consume decrements stock and records consumption', () => {
  const service = createService();

  const initialItem = service.getItemOrThrow('inv_dipyrone' as never);
  const consumption = service.consume('nurse_1' as never, {
    encounterId: 'encounter_1',
    inventoryItemId: 'inv_dipyrone',
    quantity: 2,
    sourceEntityType: 'encounter',
    sourceEntityId: 'encounter_1'
  });

  const updatedItem = service.getItemOrThrow('inv_dipyrone' as never);
  assert.equal(consumption.quantity, 2);
  assert.equal(updatedItem.onHandQuantity, initialItem.onHandQuantity - 2);
  assert.equal(service.listConsumptions('encounter_1').length, 1);
});

test('InventoryService rejects consumption when stock is insufficient', () => {
  const service = createService();

  assert.throws(
    () =>
      service.consume('nurse_1' as never, {
        encounterId: 'encounter_1',
        inventoryItemId: 'inv_catheter',
        quantity: 999,
        sourceEntityType: 'encounter',
        sourceEntityId: 'encounter_1'
      }),
    ConflictError
  );
});

test('InventoryService getItemOrThrow rejects unknown item', () => {
  const service = createService();

  assert.throws(() => service.getItemOrThrow('inv_missing' as never), NotFoundError);
});

test('InventoryService listConsumptions filters by encounter', () => {
  const service = createService();

  service.consume('nurse_1' as never, {
    encounterId: 'encounter_1',
    inventoryItemId: 'inv_dipyrone',
    quantity: 1,
    sourceEntityType: 'encounter',
    sourceEntityId: 'encounter_1'
  });
  service.consume('nurse_1' as never, {
    encounterId: 'encounter_2',
    inventoryItemId: 'inv_gauze',
    quantity: 1,
    sourceEntityType: 'encounter',
    sourceEntityId: 'encounter_2'
  });

  assert.equal(service.listConsumptions().length, 2);
  assert.equal(service.listConsumptions('encounter_1').length, 1);
  assert.equal(service.listConsumptions('encounter_1')[0].encounterId, 'encounter_1');
});
