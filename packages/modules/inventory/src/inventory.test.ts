import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';

import { InventoryService } from './index.js';
import type { InventoryRepository } from './repositories/database-inventory.repository.js';

function createPersistedItem(
  command: Parameters<InventoryRepository['createItem']>[0]
): Awaited<ReturnType<InventoryRepository['createItem']>> {
  return {
    item: command.item,
    movement: {
      id: command.movementId,
      accountId: command.item.accountId,
      inventoryItemId: command.item.id,
      movementType: 'inbound',
      quantityDelta: command.item.onHandQuantity,
      balanceBefore: 0,
      balanceAfter: command.item.onHandQuantity,
      unitCostAmount: command.item.unitCostAmount,
      reason: command.reason,
      reference: command.reference,
      recordedByUserId: command.recordedByUserId,
      createdAt: command.item.createdAt
    },
    stockVersion: 0
  };
}

function createService() {
  return new InventoryService({
    getOrThrow(encounterId: string) {
      return {
        id: encounterId,
        accountId: 'acc_cvg_demo',
        patientId: 'patient_1'
      };
    }
  } as never);
}

function createRepository(overrides: Partial<InventoryRepository> = {}): InventoryRepository {
  return {
    async createItem(command) {
      return createPersistedItem(command);
    },
    async updateItem() {
      throw new Error('updateItem not implemented by test repository');
    },
    async findItemById() {
      return null;
    },
    async findAllItems() {
      return [];
    },
    async createConsumption() {},
    async findConsumptions() {
      return [];
    },
    async createStockMovement() {},
    async findStockMovements() {
      return [];
    },
    async consumeStock() {
      throw new Error('consumeStock not implemented by test repository');
    },
    async adjustStock() {
      throw new Error('adjustStock not implemented by test repository');
    },
    ...overrides
  };
}

test('InventoryService consume decrements stock and records consumption', async () => {
  const service = createService();

  const initialItem = service.getItemOrThrow('acc_cvg_demo' as never, 'inv_dipyrone' as never);
  const consumption = await service.consume('acc_cvg_demo' as never, 'nurse_1' as never, {
    encounterId: 'encounter_1',
    inventoryItemId: 'inv_dipyrone',
    quantity: 2,
    sourceEntityType: 'encounter',
    sourceEntityId: 'encounter_1'
  });

  const updatedItem = service.getItemOrThrow('acc_cvg_demo' as never, 'inv_dipyrone' as never);
  assert.equal(consumption.quantity, 2);
  assert.equal(updatedItem.onHandQuantity, initialItem.onHandQuantity - 2);
  assert.equal(service.listConsumptions('encounter_1').length, 1);
});

test('InventoryService rejects consumption when stock is insufficient', async () => {
  const service = createService();

  await assert.rejects(
    () =>
      service.consume('acc_cvg_demo' as never, 'nurse_1' as never, {
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

  assert.throws(
    () => service.getItemOrThrow('acc_cvg_demo' as never, 'inv_missing' as never),
    NotFoundError
  );
});

test('InventoryService listConsumptions filters by encounter', async () => {
  const service = createService();

  await service.consume('acc_cvg_demo' as never, 'nurse_1' as never, {
    encounterId: 'encounter_1',
    inventoryItemId: 'inv_dipyrone',
    quantity: 1,
    sourceEntityType: 'encounter',
    sourceEntityId: 'encounter_1'
  });
  await service.consume('acc_cvg_demo' as never, 'nurse_1' as never, {
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

  await service.consume('acc_cvg_demo' as never, 'nurse_1' as never, {
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
  const movement = service.listStockMovements('acc_cvg_demo' as never, 'inv_dipyrone')[0];
  assert.equal(movement.movementType, 'consumption');
  assert.equal(movement.quantityDelta, -3);
  assert.equal(
    movement.balanceAfter,
    service.getItemOrThrow('acc_cvg_demo' as never, 'inv_dipyrone' as never).onHandQuantity
  );
});

test('InventoryService creates audited stock adjustments and rejects negative balances', async () => {
  const service = createService();
  const before = service.getItemOrThrow('acc_cvg_demo' as never, 'inv_gauze' as never);

  const movement = await service.createStockAdjustment(
    'acc_cvg_demo' as never,
    'manager_1' as never,
    {
      inventoryItemId: 'inv_gauze',
      quantityDelta: 5,
      reason: 'Inventario rotativo',
      reference: 'INV-2026-001'
    }
  );

  const after = service.getItemOrThrow('acc_cvg_demo' as never, 'inv_gauze' as never);
  assert.equal(after.onHandQuantity, before.onHandQuantity + 5);
  assert.equal(movement.movementType, 'adjustment');
  assert.equal(movement.balanceBefore, before.onHandQuantity);
  assert.equal(movement.balanceAfter, after.onHandQuantity);
  assert.equal(service.listStockMovements('acc_cvg_demo' as never, 'inv_gauze').length, 1);

  await assert.rejects(
    () =>
      service.createStockAdjustment('acc_cvg_demo' as never, 'manager_1' as never, {
        inventoryItemId: 'inv_gauze',
        quantityDelta: -999,
        reason: 'Erro'
      }),
    ConflictError
  );
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
        async createItem(command) {
          return createPersistedItem(command);
        },
        async updateItem() {
          throw new Error('updateItem not implemented by hydration repository');
        },
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
        },
        async createStockMovement() {},
        async findStockMovements() {
          return [
            {
              id: 'mov_repo_1' as never,
              accountId: 'acc_repo' as never,
              inventoryItemId: 'inv_repo_1' as never,
              movementType: 'adjustment',
              quantityDelta: 7,
              balanceBefore: 0,
              balanceAfter: 7,
              unitCostAmount: 4.5,
              reason: 'Carga inicial',
              reference: 'INIT',
              recordedByUserId: 'nurse_repo' as never,
              createdAt: '2026-04-12T08:00:00.000Z'
            }
          ];
        },
        async consumeStock() {
          throw new Error('consumeStock not implemented by hydration repository');
        },
        async adjustStock() {
          throw new Error('adjustStock not implemented by hydration repository');
        }
      }
    }
  );

  await service.hydrateFromDatabase('acc_repo' as never);

  assert.equal(service.listItems('acc_repo' as never).length, 1);
  assert.equal(service.listConsumptionsByAccount('acc_repo' as never).length, 1);
  assert.equal(service.listStockMovements('acc_repo' as never).length, 1);
  assert.equal(service.listLots('acc_repo' as never)[0].inventoryItemId, 'inv_repo_1');
});

test('InventoryService fails closed when item creation cannot be persisted', async () => {
  const service = new InventoryService({} as never, [], {
    repository: createRepository({
      async createItem() {
        throw new Error('inventory create failed');
      }
    })
  });

  await assert.rejects(
    () =>
      service.createItem('acc_test' as never, 'user_test' as never, {
        sku: 'FAIL-CREATE',
        name: 'Item não persistido',
        unit: 'unidade',
        onHandQuantity: 10,
        reorderLevel: 2,
        unitCostAmount: 5
      }),
    /inventory create failed/
  );
  assert.equal(service.listItems('acc_test' as never).length, 0);
});

test('InventoryService fails closed and preserves prior item state on update failure', async () => {
  const service = new InventoryService({} as never, [], {
    repository: createRepository({
      async updateItem() {
        throw new Error('inventory update failed');
      }
    })
  });
  const created = await service.createItem('acc_test' as never, 'user_test' as never, {
    sku: 'FAIL-UPDATE',
    name: 'Item persistido',
    unit: 'unidade',
    onHandQuantity: 10,
    reorderLevel: 2,
    unitCostAmount: 5
  });

  await assert.rejects(
    () =>
      service.updateItem('acc_test' as never, 'user_test' as never, created.id, {
        onHandQuantity: 7
      }),
    /inventory update failed/
  );
  assert.equal(service.getItemOrThrow('acc_test' as never, created.id).onHandQuantity, 10);
});

test('InventoryService scopes get, update, consume and adjustment by account', async () => {
  const accountA = 'acc_a' as never;
  const accountB = 'acc_b' as never;
  const foreignItem = {
    id: 'inv_foreign' as never,
    accountId: accountB,
    sku: 'FOREIGN-1',
    name: 'Foreign item',
    unit: 'unit',
    onHandQuantity: 9,
    reorderLevel: 1,
    unitCostAmount: 2,
    createdAt: '2026-08-12T10:00:00.000Z',
    updatedAt: '2026-08-12T10:00:00.000Z'
  };
  const service = new InventoryService(
    {
      getOrThrow(encounterId: string) {
        return { id: encounterId, accountId: accountA, patientId: 'patient_a' };
      }
    } as never,
    [foreignItem]
  );

  assert.throws(() => service.getItemOrThrow(accountA, foreignItem.id), NotFoundError);
  await assert.rejects(
    () =>
      service.updateItem(accountA, 'user_a' as never, foreignItem.id, { name: 'Leaked update' }),
    NotFoundError
  );
  await assert.rejects(
    () =>
      service.consume(accountA, 'user_a' as never, {
        encounterId: 'encounter_a',
        inventoryItemId: foreignItem.id,
        quantity: 1,
        sourceEntityType: 'encounter'
      }),
    NotFoundError
  );
  await assert.rejects(
    () =>
      service.createStockAdjustment(accountA, 'user_a' as never, {
        inventoryItemId: foreignItem.id,
        quantityDelta: 1,
        reason: 'Must not cross tenant'
      }),
    NotFoundError
  );

  assert.equal(service.getItemOrThrow(accountB, foreignItem.id).onHandQuantity, 9);
});

test('InventoryService preserves memory when atomic consumption persistence fails', async () => {
  const accountId = 'acc_atomic' as never;
  const item = {
    id: 'inv_atomic' as never,
    accountId,
    sku: 'ATOMIC-1',
    name: 'Atomic item',
    unit: 'unit',
    onHandQuantity: 10,
    reorderLevel: 1,
    unitCostAmount: 3,
    createdAt: '2026-08-12T10:00:00.000Z',
    updatedAt: '2026-08-12T10:00:00.000Z'
  };
  const repository = createRepository({
    async consumeStock() {
      throw new Error('atomic transaction rolled back');
    }
  });
  const service = new InventoryService(
    {
      getOrThrow(encounterId: string) {
        return { id: encounterId, accountId, patientId: 'patient_atomic' };
      }
    } as never,
    [item],
    { repository }
  );

  await assert.rejects(
    () =>
      service.consume(accountId, 'user_atomic' as never, {
        encounterId: 'encounter_atomic',
        inventoryItemId: item.id,
        quantity: 4,
        sourceEntityType: 'encounter'
      }),
    /atomic transaction rolled back/
  );

  assert.equal(service.getItemOrThrow(accountId, item.id).onHandQuantity, 10);
  assert.equal(service.listConsumptionsByAccount(accountId).length, 0);
  assert.equal(service.listStockMovements(accountId).length, 0);
});

test('InventoryService preserves memory when atomic adjustment persistence fails', async () => {
  const accountId = 'acc_atomic_adjustment' as never;
  const item = {
    id: 'inv_atomic_adjustment' as never,
    accountId,
    sku: 'ATOMIC-ADJUSTMENT-1',
    name: 'Atomic adjustment item',
    unit: 'unit',
    onHandQuantity: 10,
    reorderLevel: 1,
    unitCostAmount: 3,
    createdAt: '2026-08-12T10:00:00.000Z',
    updatedAt: '2026-08-12T10:00:00.000Z'
  };
  const repository = createRepository({
    async adjustStock() {
      throw new Error('atomic adjustment rolled back');
    }
  });
  const service = new InventoryService({} as never, [item], { repository });

  await assert.rejects(
    () =>
      service.createStockAdjustment(accountId, 'user_atomic' as never, {
        inventoryItemId: item.id,
        quantityDelta: -4,
        reason: 'Atomic rollback'
      }),
    /atomic adjustment rolled back/
  );

  assert.equal(service.getItemOrThrow(accountId, item.id).onHandQuantity, 10);
  assert.equal(service.listStockMovements(accountId).length, 0);
});

test('InventoryService records immutable actor-authored ledger entries for create and stock PATCH', async () => {
  const accountId = 'acc_item_ledger' as never;
  const creatorUserId = 'user_item_creator' as never;
  const editorUserId = 'user_item_editor' as never;
  const service = new InventoryService({} as never, []);

  const created = await service.createItem(accountId, creatorUserId, {
    sku: 'LEDGER-ITEM-1',
    name: 'Ledger item',
    unit: 'unit',
    onHandQuantity: 10,
    reorderLevel: 2,
    unitCostAmount: 3
  });

  const initialMovement = service.listStockMovements(accountId, created.id)[0];
  assert.equal(Object.isFrozen(created), true);
  assert.equal(Object.isFrozen(initialMovement), true);
  assert.deepEqual(
    {
      movementType: initialMovement?.movementType,
      quantityDelta: initialMovement?.quantityDelta,
      balanceBefore: initialMovement?.balanceBefore,
      balanceAfter: initialMovement?.balanceAfter,
      recordedByUserId: initialMovement?.recordedByUserId
    },
    {
      movementType: 'inbound',
      quantityDelta: 10,
      balanceBefore: 0,
      balanceAfter: 10,
      recordedByUserId: creatorUserId
    }
  );

  const updated = await service.updateItem(accountId, editorUserId, created.id, {
    onHandQuantity: 7
  });
  const editMovement = service.listStockMovements(accountId, created.id)[0];

  assert.equal(created.onHandQuantity, 10);
  assert.equal(updated.onHandQuantity, 7);
  assert.equal(Object.isFrozen(updated), true);
  assert.deepEqual(
    {
      movementType: editMovement?.movementType,
      quantityDelta: editMovement?.quantityDelta,
      balanceBefore: editMovement?.balanceBefore,
      balanceAfter: editMovement?.balanceAfter,
      recordedByUserId: editMovement?.recordedByUserId
    },
    {
      movementType: 'adjustment',
      quantityDelta: -3,
      balanceBefore: 10,
      balanceAfter: 7,
      recordedByUserId: editorUserId
    }
  );
});

test('InventoryService records the commercial sale actor in consumption and ledger', async () => {
  const service = createService();
  const actorUserId = 'user_counter_sale_closer' as never;

  const consumption = await service.consumeForSale(
    'acc_cvg_demo' as never,
    'inv_dipyrone' as never,
    2,
    actorUserId
  );
  const movement = service.listStockMovements('acc_cvg_demo' as never, 'inv_dipyrone')[0];

  assert.equal(consumption.recordedByUserId, actorUserId);
  assert.equal(movement?.recordedByUserId, actorUserId);
  assert.equal(movement?.reference, consumption.id);
});
