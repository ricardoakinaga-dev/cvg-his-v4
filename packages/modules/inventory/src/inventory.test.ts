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

test('InventoryService consume decrements stock and records consumption', async () => {
  const service = createService();

  const initialItem = service.getItemOrThrow('inv_dipyrone' as never);
  const consumption = await service.consume('nurse_1' as never, {
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

test('InventoryService rejects consumption when stock is insufficient', async () => {
  const service = createService();

  await assert.rejects(
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

test('InventoryService listConsumptions filters by encounter', async () => {
  const service = createService();

  await service.consume('nurse_1' as never, {
    encounterId: 'encounter_1',
    inventoryItemId: 'inv_dipyrone',
    quantity: 1,
    sourceEntityType: 'encounter',
    sourceEntityId: 'encounter_1'
  });
  await service.consume('nurse_1' as never, {
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

test('InventoryService listLots reflects tracked lot balances after consumption', async () => {
  const service = createService();

  const beforeTotal = service
    .listLots('acc_cvg_demo' as never)
    .filter((lot) => lot.inventoryItemId === 'inv_dipyrone')
    .reduce((sum, lot) => sum + lot.quantity, 0);

  await service.consume('nurse_1' as never, {
    encounterId: 'encounter_1',
    inventoryItemId: 'inv_dipyrone',
    quantity: 3,
    sourceEntityType: 'encounter',
    sourceEntityId: 'encounter_1'
  });

  const afterLots = service
    .listLots('acc_cvg_demo' as never)
    .filter((lot) => lot.inventoryItemId === 'inv_dipyrone');
  const afterTotal = afterLots.reduce((sum, lot) => sum + lot.quantity, 0);

  assert.equal(beforeTotal - afterTotal, 3);
  assert.equal(afterLots.length >= 1, true);
});

test('InventoryService hydrateFromDatabase loads persisted consumptions', async () => {
  const service = new InventoryService(
    {
      getOrThrow(encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_repo',
          patientId: 'patient_repo'
        };
      }
    } as never,
    [],
    {
      repository: {
        async createItem() {},
        async updateItem() {},
        async findItemById() {
          return null;
        },
        async findAllItems() {
          return [
            {
              id: 'inv_repo_1' as never,
              accountId: 'acc_repo' as never,
              sku: 'REP-001',
              name: 'Item Repositorio',
              unit: 'unidade',
              onHandQuantity: 7,
              reorderLevel: 2,
              unitCostAmount: 4.5,
              createdAt: '2026-04-12T09:00:00.000Z',
              updatedAt: '2026-04-12T09:00:00.000Z'
            }
          ];
        },
        async createConsumption() {},
        async findConsumptions() {
          return [
            {
              id: 'cons_repo_1' as never,
              accountId: 'acc_repo' as never,
              inventoryItemId: 'inv_repo_1' as never,
              encounterId: 'enc_repo_1' as never,
              patientId: 'patient_repo' as never,
              quantity: 2,
              unit: 'unidade',
              costAmount: 9,
              sourceEntityType: 'encounter',
              sourceEntityId: 'enc_repo_1',
              recordedByUserId: 'nurse_repo' as never,
              createdAt: '2026-04-12T10:00:00.000Z'
            }
          ];
        }
      }
    }
  );

  await service.hydrateFromDatabase('acc_repo' as never);

  assert.equal(service.listItems('acc_repo' as never).length, 1);
  assert.equal(service.listConsumptionsByAccount('acc_repo' as never).length, 1);
  assert.equal(service.listLots('acc_repo' as never)[0].inventoryItemId, 'inv_repo_1');
});
