import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';

import { InMemoryProcurementRepository, InventoryService, ProcurementService } from './index.js';

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

test('InventoryService consume decrements stock and records consumption', async () => {
  const service = createService();

  const initialItem = service.getItemOrThrow('inv_dipyrone' as never, 'acc_cvg_demo' as never);
  const consumption = await service.consume('nurse_1' as never, {
    encounterId: 'encounter_1',
    inventoryItemId: 'inv_dipyrone',
    quantity: 2,
    sourceEntityType: 'encounter',
    sourceEntityId: 'encounter_1'
  }, 'acc_cvg_demo' as never);

  const updatedItem = service.getItemOrThrow('inv_dipyrone' as never, 'acc_cvg_demo' as never);
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
      }, 'acc_cvg_demo' as never),
    ConflictError
  );
});

test('InventoryService getItemOrThrow rejects unknown item', () => {
  const service = createService();

  assert.throws(
    () => service.getItemOrThrow('inv_missing' as never, 'acc_cvg_demo' as never),
    NotFoundError
  );
});

test('InventoryService listConsumptions filters by encounter', async () => {
  const service = createService();

  await service.consume('nurse_1' as never, {
    encounterId: 'encounter_1',
    inventoryItemId: 'inv_dipyrone',
    quantity: 1,
    sourceEntityType: 'encounter',
    sourceEntityId: 'encounter_1'
  }, 'acc_cvg_demo' as never);
  await service.consume('nurse_1' as never, {
    encounterId: 'encounter_2',
    inventoryItemId: 'inv_gauze',
    quantity: 1,
    sourceEntityType: 'encounter',
    sourceEntityId: 'encounter_2'
  }, 'acc_cvg_demo' as never);

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
  }, 'acc_cvg_demo' as never);

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
    service.getItemOrThrow('inv_dipyrone' as never, 'acc_cvg_demo' as never).onHandQuantity
  );
});

test('InventoryService reserves by FEFO and supports consume, return and release transitions', async () => {
  const service = createService();

  const allocations = await service.reserve(
    'acc_cvg_demo' as never,
    'manager_1' as never,
    {
      inventoryItemId: 'inv_dipyrone',
      quantity: 12,
      sourceEntityType: 'encounter',
      sourceEntityId: 'encounter_1',
      reference: 'RX-001'
    }
  );

  assert.equal(allocations.length, 2);
  assert.equal(allocations[0]?.lotNumber, 'DIP-240318-A');
  assert.equal(allocations[0]?.quantity, 10.08);
  assert.equal(
    service.listLots('acc_cvg_demo' as never)
      .filter((lot) => lot.inventoryItemId === 'inv_dipyrone')
      .reduce((sum, lot) => sum + (lot.reservedQuantity ?? 0), 0),
    12
  );
  assert.equal(service.getItemOrThrow('inv_dipyrone' as never, 'acc_cvg_demo' as never).onHandQuantity, 24);

  const consumed = await service.consumeReservation(
    'acc_cvg_demo' as never,
    'manager_1' as never,
    allocations[0]!.id
  );
  assert.equal(consumed.status, 'consumed');
  assert.equal(
    service.getItemOrThrow('inv_dipyrone' as never, 'acc_cvg_demo' as never).onHandQuantity,
    13.92
  );

  const returned = await service.returnReservation(
    'acc_cvg_demo' as never,
    'manager_1' as never,
    consumed.id
  );
  assert.equal(returned.status, 'returned');
  assert.equal(
    service.getItemOrThrow('inv_dipyrone' as never, 'acc_cvg_demo' as never).onHandQuantity,
    24
  );

  const released = await service.releaseReservation(
    'acc_cvg_demo' as never,
    'manager_1' as never,
    allocations[1]!.id
  );
  assert.equal(released.status, 'released');
  assert.equal(
    service.listLots('acc_cvg_demo' as never)
      .filter((lot) => lot.inventoryItemId === 'inv_dipyrone')
      .reduce((sum, lot) => sum + (lot.reservedQuantity ?? 0), 0),
    0
  );
});

test('InventoryService creates audited stock adjustments and rejects negative balances', async () => {
  const service = createService();
  const before = service.getItemOrThrow('inv_gauze' as never, 'acc_cvg_demo' as never);

  const movement = await service.createStockAdjustment('acc_cvg_demo' as never, 'manager_1' as never, {
    inventoryItemId: 'inv_gauze',
    quantityDelta: 5,
    reason: 'Inventario rotativo',
    reference: 'INV-2026-001'
  });

  const after = service.getItemOrThrow('inv_gauze' as never, 'acc_cvg_demo' as never);
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

test('InventoryService preserves account A state after hydrating account B', async () => {
  const itemFor = (accountId: string) => ({
    id: `inv_${accountId}` as never,
    accountId: accountId as never,
    sku: `SKU-${accountId}`,
    name: `Item ${accountId}`,
    unit: 'un',
    onHandQuantity: 5,
    reorderLevel: 1,
    unitCostAmount: 2,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  });
  const service = new InventoryService({ getOrThrow() {} } as never, [], {
    repository: {
      async createItem() {},
      async updateItem() {},
      async findItemById() {
        return null;
      },
      async findAllItems(accountId) {
        return [itemFor(accountId)];
      },
      async createConsumption() {},
      async findConsumptions(accountId) {
        return [
          {
            id: `cons_${accountId}` as never,
            accountId,
            inventoryItemId: `inv_${accountId}` as never,
            encounterId: `enc_${accountId}` as never,
            patientId: `patient_${accountId}` as never,
            quantity: 1,
            unit: 'un',
            costAmount: 2,
            sourceEntityType: 'encounter',
            recordedByUserId: `user_${accountId}` as never,
            createdAt: '2026-07-11T00:00:00.000Z'
          }
        ];
      },
      async createStockMovement() {},
      async findStockMovements(accountId) {
        return [
          {
            id: `stockmov_${accountId}` as never,
            accountId,
            inventoryItemId: `inv_${accountId}` as never,
            movementType: 'adjustment',
            quantityDelta: 1,
            balanceBefore: 4,
            balanceAfter: 5,
            unitCostAmount: 2,
            reason: 'Hydration test',
            recordedByUserId: `user_${accountId}` as never,
            createdAt: '2026-07-11T00:00:00.000Z'
          }
        ];
      }
    }
  });

  await service.hydrateFromDatabase('account_a' as never);
  await service.hydrateFromDatabase('account_b' as never);

  assert.equal(service.listItems('account_a' as never).length, 1);
  assert.equal(service.listConsumptionsByAccount('account_a' as never).length, 1);
  assert.equal(service.listStockMovements('account_a' as never).length, 1);
});

test('InventoryService waits for item persistence before resolving create', async () => {
  const service = new InventoryService({ getOrThrow() {} } as never, [], {
    repository: {
      async createItem() {
        throw new Error('persistence failed');
      },
      async updateItem() {},
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
      }
    }
  });

  await assert.rejects(
    async () =>
      await service.createItem('account_a' as never, {
        sku: 'SKU-FAIL',
        name: 'Failure',
        unit: 'un',
        onHandQuantity: 1,
        reorderLevel: 0,
        unitCostAmount: 1
      }),
    /persistence failed/
  );
});

test('InventoryService hides an item from another account', () => {
  const service = createService();
  assert.throws(
    () => service.getItemOrThrow('inv_dipyrone' as never, 'account_b' as never),
    NotFoundError
  );
});

test('InventoryService rejects assistive consumption across accounts before changing stock', async () => {
  const service = new InventoryService(
    {
      getOrThrow() {
        return { id: 'enc_a', accountId: 'account_a', patientId: 'patient_a' };
      }
    } as never,
    [
      {
        id: 'inv_b' as never,
        accountId: 'account_b' as never,
        sku: 'SKU-B',
        name: 'Item B',
        unit: 'un',
        onHandQuantity: 10,
        reorderLevel: 1,
        unitCostAmount: 2,
        createdAt: '2026-07-11T00:00:00.000Z',
        updatedAt: '2026-07-11T00:00:00.000Z'
      }
    ]
  );

  await assert.rejects(
    () =>
      service.consume('user_a' as never, {
        encounterId: 'enc_a',
        inventoryItemId: 'inv_b',
        quantity: 1,
        sourceEntityType: 'encounter'
      }, 'account_a' as never),
    NotFoundError
  );
  assert.equal(service.getItemOrThrow('inv_b' as never, 'account_b' as never).onHandQuantity, 10);
});

test('InventoryService rejects commercial consumption across accounts', async () => {
  const service = createService();
  await assert.rejects(
    () => service.consumeForSale('account_b' as never, 'inv_dipyrone' as never, 1),
    NotFoundError
  );
});

test('InventoryService receives inbound stock with lot metadata and weighted cost', async () => {
  const service = createService();
  const before = service.getItemOrThrow('inv_gauze' as never, 'acc_cvg_demo' as never);

  const movement = await service.receiveInbound('acc_cvg_demo' as never, 'manager_1' as never, {
    inventoryItemId: 'inv_gauze',
    quantity: 10,
    unitCostAmount: 8,
    lotNumber: 'GAZ-NEW-01',
    expiryDate: '2027-12-31T00:00:00.000Z',
    location: 'Recebimento',
    supplier: 'Fornecedor Teste',
    reference: 'NF-001'
  });

  const after = service.getItemOrThrow('inv_gauze' as never, 'acc_cvg_demo' as never);
  const lot = service.listLots('acc_cvg_demo' as never).find((item) => item.lotNumber === 'GAZ-NEW-01');
  assert.equal(movement.movementType, 'inbound');
  assert.equal(after.onHandQuantity, before.onHandQuantity + 10);
  assert.equal(lot?.quantity, 10);
  assert.equal(lot?.location, 'Recebimento');
  assert.ok(after.unitCostAmount > before.unitCostAmount);
});

test('ProcurementService approves and receives a purchase partially until it is complete', async () => {
  const inventory = createService();
  const procurement = new ProcurementService(inventory);
  const before = inventory.getItemOrThrow('inv_catheter' as never, 'acc_cvg_demo' as never).onHandQuantity;
  const created = await procurement.createPurchase('acc_cvg_demo' as never, 'buyer_1' as never, {
    supplierName: 'CatMed',
    invoiceNumber: 'NF-2026-001',
    lines: [{
      inventoryItemId: 'inv_catheter',
      quantity: 6,
      unitCostAmount: 9.5,
      lotNumber: 'CAT-NEW-01',
      location: 'Recebimento'
    }]
  });
  const approved = await procurement.approvePurchase('acc_cvg_demo' as never, 'manager_1' as never, created.id);
  const partial = await procurement.receivePurchase('acc_cvg_demo' as never, 'warehouse_1' as never, created.id, {
    lines: [{ lineId: approved.lines[0]!.id, quantity: 2 }]
  });
  assert.equal(partial.status, 'partially_received');
  assert.equal(partial.lines[0]?.receivedQuantity, 2);
  const complete = await procurement.receivePurchase('acc_cvg_demo' as never, 'warehouse_1' as never, created.id, {
    lines: [{ lineId: approved.lines[0]!.id, quantity: 4 }]
  });
  assert.equal(complete.status, 'received');
  assert.equal(complete.receivedAmount, 57);
  assert.equal(inventory.getItemOrThrow('inv_catheter' as never, 'acc_cvg_demo' as never).onHandQuantity, before + 6);
});

test('ProcurementService transfers FEFO stock between locations and preserves global balance', async () => {
  const inventory = createService();
  const procurement = new ProcurementService(inventory);
  const before = inventory.getItemOrThrow('inv_dipyrone' as never, 'acc_cvg_demo' as never).onHandQuantity;
  const transfer = await procurement.createTransfer('acc_cvg_demo' as never, 'warehouse_1' as never, {
    inventoryItemId: 'inv_dipyrone',
    quantity: 2,
    fromLocation: 'Farmacia fria A1',
    toLocation: 'Farmacia fria B1',
    reference: 'TR-001'
  });
  assert.equal(transfer.status, 'completed');
  assert.equal(transfer.quantity, 2);
  assert.equal(inventory.getItemOrThrow('inv_dipyrone' as never, 'acc_cvg_demo' as never).onHandQuantity, before);
  assert.equal(inventory.listStockMovements('acc_cvg_demo' as never, 'inv_dipyrone').slice(0, 2).map((movement) => movement.movementType).sort().join(','), 'inbound,outbound');
  assert.equal(inventory.listLots('acc_cvg_demo' as never).some((lot) => lot.location === 'Farmacia fria B1' && lot.quantity === 2), true);
});

test('ProcurementService rejects invalid purchase transitions and tenant access', async () => {
  const inventory = createService();
  const procurement = new ProcurementService(inventory);

  await procurement.hydrateFromDatabase('acc_cvg_demo' as never);
  await assert.rejects(
    () => procurement.createPurchase('acc_cvg_demo' as never, 'buyer_1' as never, {
      supplierName: 'Fornecedor',
      lines: []
    }),
    ValidationError
  );
  await assert.rejects(
    () => procurement.createPurchase('acc_cvg_demo' as never, 'buyer_1' as never, {
      supplierName: ' ',
      lines: [{
        inventoryItemId: 'inv_gauze',
        quantity: 1,
        unitCostAmount: 0,
        lotNumber: 'GAZ-VALIDATION'
      }]
    }),
    ValidationError
  );

  const draft = await procurement.createPurchase('acc_cvg_demo' as never, 'buyer_1' as never, {
    supplierName: 'Fornecedor',
    lines: [{
      inventoryItemId: 'inv_gauze',
      quantity: 2,
      unitCostAmount: 3,
      lotNumber: 'GAZ-LIFECYCLE'
    }]
  });
  assert.equal(procurement.listPurchases('acc_cvg_demo' as never).length, 1);
  assert.equal(procurement.listPurchases('account_other' as never).length, 0);
  assert.throws(
    () => procurement.getPurchase('account_other' as never, draft.id),
    NotFoundError
  );
  await assert.rejects(
    () => procurement.receivePurchase('acc_cvg_demo' as never, 'warehouse_1' as never, draft.id, { lines: [] }),
    ConflictError
  );

  const approved = await procurement.approvePurchase('acc_cvg_demo' as never, 'manager_1' as never, draft.id);
  await assert.rejects(
    () => procurement.approvePurchase('acc_cvg_demo' as never, 'manager_1' as never, draft.id),
    ConflictError
  );
  await assert.rejects(
    () => procurement.receivePurchase('acc_cvg_demo' as never, 'warehouse_1' as never, approved.id, { lines: [] }),
    ValidationError
  );
  await assert.rejects(
    () => procurement.receivePurchase('acc_cvg_demo' as never, 'warehouse_1' as never, approved.id, {
      lines: [{ lineId: 'purchase-line-missing', quantity: 1 }]
    }),
    NotFoundError
  );
  await assert.rejects(
    () => procurement.receivePurchase('acc_cvg_demo' as never, 'warehouse_1' as never, approved.id, {
      lines: [{ lineId: approved.lines[0]!.id, quantity: 3 }]
    }),
    ConflictError
  );

  const cancelled = await procurement.cancelPurchase('acc_cvg_demo' as never, approved.id);
  assert.equal(cancelled.status, 'cancelled');
  await assert.rejects(
    () => procurement.receivePurchase('acc_cvg_demo' as never, 'warehouse_1' as never, approved.id, {
      lines: [{ lineId: approved.lines[0]!.id, quantity: 1 }]
    }),
    ConflictError
  );
});

test('ProcurementService rejects duplicate receipt lines before changing stock', async () => {
  const inventory = createService();
  const procurement = new ProcurementService(inventory);
  const created = await procurement.createPurchase('acc_cvg_demo' as never, 'buyer_1' as never, {
    supplierName: 'Fornecedor de recebimento',
    lines: [{
      inventoryItemId: 'inv_gauze',
      quantity: 4,
      unitCostAmount: 3,
      lotNumber: 'GAZ-DUPLICATE-RECEIPT'
    }]
  });
  const approved = await procurement.approvePurchase(
    'acc_cvg_demo' as never,
    'manager_1' as never,
    created.id
  );
  const before = inventory.getItemOrThrow('inv_gauze' as never, 'acc_cvg_demo' as never).onHandQuantity;

  await assert.rejects(
    () => procurement.receivePurchase('acc_cvg_demo' as never, 'warehouse_1' as never, approved.id, {
      lines: [
        { lineId: approved.lines[0]!.id, quantity: 1 },
        { lineId: approved.lines[0]!.id, quantity: 1 }
      ]
    }),
    ValidationError
  );

  assert.equal(
    inventory.getItemOrThrow('inv_gauze' as never, 'acc_cvg_demo' as never).onHandQuantity,
    before
  );
  assert.equal(procurement.getPurchase('acc_cvg_demo' as never, approved.id).status, 'approved');
});

test('ProcurementService validates every receipt line before applying any inbound movement', async () => {
  const inventory = createService();
  const procurement = new ProcurementService(inventory);
  const created = await procurement.createPurchase('acc_cvg_demo' as never, 'buyer_1' as never, {
    supplierName: 'Fornecedor de recebimento',
    lines: [{
      inventoryItemId: 'inv_gauze',
      quantity: 4,
      unitCostAmount: 3,
      lotNumber: 'GAZ-MIXED-RECEIPT'
    }]
  });
  const approved = await procurement.approvePurchase(
    'acc_cvg_demo' as never,
    'manager_1' as never,
    created.id
  );
  const before = inventory.getItemOrThrow('inv_gauze' as never, 'acc_cvg_demo' as never).onHandQuantity;

  await assert.rejects(
    () => procurement.receivePurchase('acc_cvg_demo' as never, 'warehouse_1' as never, approved.id, {
      lines: [
        { lineId: approved.lines[0]!.id, quantity: 1 },
        { lineId: 'purchase-line-does-not-exist', quantity: 1 }
      ]
    }),
    NotFoundError
  );

  assert.equal(
    inventory.getItemOrThrow('inv_gauze' as never, 'acc_cvg_demo' as never).onHandQuantity,
    before
  );
  assert.equal(procurement.getPurchase('acc_cvg_demo' as never, approved.id).status, 'approved');
});

test('ProcurementService requires an invoice number before receiving stock', async () => {
  const inventory = createService();
  const procurement = new ProcurementService(inventory);
  const created = await procurement.createPurchase('acc_cvg_demo' as never, 'buyer_1' as never, {
    supplierName: 'Fornecedor sem NF',
    lines: [{
      inventoryItemId: 'inv_gauze',
      quantity: 2,
      unitCostAmount: 3,
      lotNumber: 'GAZ-NF-REQUIRED'
    }]
  });
  const approved = await procurement.approvePurchase(
    'acc_cvg_demo' as never,
    'manager_1' as never,
    created.id
  );
  const before = inventory.getItemOrThrow('inv_gauze' as never, 'acc_cvg_demo' as never).onHandQuantity;

  await assert.rejects(
    () => procurement.receivePurchase('acc_cvg_demo' as never, 'warehouse_1' as never, approved.id, {
      lines: [{ lineId: approved.lines[0]!.id, quantity: 1 }]
    }),
    ValidationError
  );

  assert.equal(inventory.getItemOrThrow('inv_gauze' as never, 'acc_cvg_demo' as never).onHandQuantity, before);
  assert.equal(procurement.getPurchase('acc_cvg_demo' as never, approved.id).status, 'approved');
});

test('ProcurementService persists and rehydrates purchases and transfers', async () => {
  const inventory = createService();
  const repository = new InMemoryProcurementRepository();
  const writer = new ProcurementService(inventory, { repository });
  const purchase = await writer.createPurchase('acc_cvg_demo' as never, 'buyer_1' as never, {
    supplierName: 'Fornecedor Persistente',
    invoiceNumber: 'NF-REHYDRATE',
    payableId: 'payable-1',
    lines: [{
      inventoryItemId: 'inv_gauze',
      quantity: 1,
      unitCostAmount: 2,
      lotNumber: 'GAZ-REHYDRATE'
    }]
  });
  const transfer = await writer.createTransfer('acc_cvg_demo' as never, 'warehouse_1' as never, {
    inventoryItemId: 'inv_dipyrone',
    quantity: 1,
    fromLocation: 'Farmacia fria A1',
    toLocation: 'Farmacia fria C1'
  });
  const reader = new ProcurementService(inventory, { repository });
  await reader.hydrateFromDatabase('acc_cvg_demo' as never);

  assert.equal(reader.persistenceMode, 'database');
  assert.equal(reader.getPurchase('acc_cvg_demo' as never, purchase.id).payableId, 'payable-1');
  assert.equal(reader.listTransfers('acc_cvg_demo' as never)[0]?.id, transfer.id);
  assert.equal(reader.listTransfers('account_other' as never).length, 0);
});

test('ProcurementService creates a linked payable when an approved purchase has no payable', async () => {
  const inventory = createService();
  const created: Array<{ readonly totalAmount: number; readonly sourceExpenseId?: string | null }> = [];
  const procurement = new ProcurementService(inventory, {
    payableGateway: {
      async createPayable(_accountId, _userId, input) {
        created.push(input);
        return { id: 'payable-purchase-1' };
      }
    }
  });

  const draft = await procurement.createPurchase('acc_cvg_demo' as never, 'buyer_1' as never, {
    supplierName: 'Fornecedor Integrado',
    invoiceNumber: 'NF-INTEGRATED',
    lines: [{
      inventoryItemId: 'inv_gauze',
      quantity: 2,
      unitCostAmount: 5,
      lotNumber: 'GAZ-INTEGRATED'
    }]
  });
  const approved = await procurement.approvePurchase('acc_cvg_demo' as never, 'manager_1' as never, draft.id);

  assert.equal(approved.payableId, 'payable-purchase-1');
  assert.equal(created.length, 1);
  assert.equal(created[0]?.totalAmount, 10);
  assert.equal(created[0]?.sourceExpenseId, draft.id);
});

test('ProcurementService keeps payable linkage and purchase approval inside one transaction boundary', async () => {
  const operations: string[] = [];
  const inventory = createService();
  const procurement = new ProcurementService(inventory, {
    payableGateway: {
      async createPayable() {
        operations.push('create-payable');
        return { id: 'payable-purchase-transaction' };
      }
    },
    transaction: async (_accountId: string, operation: () => Promise<unknown>) => {
      operations.push('begin');
      const result = await operation();
      operations.push('commit');
      return result;
    }
  } as never);

  const draft = await procurement.createPurchase('acc_cvg_demo' as never, 'buyer_1' as never, {
    supplierName: 'Fornecedor Transacional',
    lines: [{
      inventoryItemId: 'inv_gauze',
      quantity: 2,
      unitCostAmount: 5,
      lotNumber: 'GAZ-TRANSACTION'
    }]
  });
  const approved = await procurement.approvePurchase(
    'acc_cvg_demo' as never,
    'manager_1' as never,
    draft.id
  );

  assert.equal(approved.payableId, 'payable-purchase-transaction');
  assert.deepEqual(operations, ['begin', 'create-payable', 'commit']);
});

test('ProcurementService restores the draft purchase when the transaction rolls back', async () => {
  let rollback = false;
  const inventory = createService();
  const procurement = new ProcurementService(inventory, {
    payableGateway: {
      async createPayable() {
        return { id: 'payable-purchase-rollback' };
      }
    },
    transaction: async (_accountId: string, operation: () => Promise<unknown>) => {
      const result = await operation();
      if (rollback) throw new Error('transaction rolled back');
      return result;
    }
  } as never);

  const draft = await procurement.createPurchase('acc_cvg_demo' as never, 'buyer_rollback' as never, {
    supplierName: 'Fornecedor Rollback',
    lines: [{
      inventoryItemId: 'inv_gauze',
      quantity: 2,
      unitCostAmount: 5,
      lotNumber: 'GAZ-ROLLBACK'
    }]
  });

  rollback = true;
  await assert.rejects(
    () => procurement.approvePurchase('acc_cvg_demo' as never, 'manager_rollback' as never, draft.id),
    /transaction rolled back/
  );

  assert.equal(procurement.getPurchase('acc_cvg_demo' as never, draft.id).status, 'draft');
  assert.equal(procurement.getPurchase('acc_cvg_demo' as never, draft.id).payableId, null);
});
