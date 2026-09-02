import { describe, expect, it, vi } from 'vitest';

import { ConflictError } from '@cvg-his-v2/shared-errors';

import { InventoryService } from '../../../packages/modules/inventory/src/index.js';

function createService() {
  return new InventoryService(
    {
      getOrThrow(_accountId: string, encounterId: string) {
        return {
          id: encounterId,
          accountId: 'acc_test',
          patientId: 'patient_1'
        };
      }
    } as never
  );
}

describe('InventoryService coverage guard', () => {
  it('marks lots expiring within thirty days', async () => {
    vi.useFakeTimers({ now: new Date('2027-08-20T00:00:00.000Z') });
    try {
      const service = createService();
      const created = await service.createItem('acc_test' as never, {
        sku: 'EXP-001',
        name: 'Insumo proximo do vencimento',
        unit: 'unidade',
        onHandQuantity: 1,
        reorderLevel: 0,
        unitCostAmount: 1
      });

      expect(service.listLots('acc_test' as never).find((lot) => lot.inventoryItemId === created.id)?.status)
        .toBe('expiring');
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks zero-stock generated lots as depleted', async () => {
    const service = new InventoryService(
      {
        getOrThrow() {
          return { id: 'enc_zero', accountId: 'acc_zero', patientId: 'patient_zero' };
        }
      } as never,
      [{
        id: 'inv_zero' as never,
        accountId: 'acc_zero' as never,
        sku: 'ZERO-001',
        name: 'Sem estoque',
        unit: 'unidade',
        onHandQuantity: 0,
        reorderLevel: 1,
        unitCostAmount: 0,
        createdAt: '2026-04-12T09:00:00.000Z',
        updatedAt: '2026-04-12T09:00:00.000Z'
      } as never]
    );

    expect(service.listLots('acc_zero' as never)).toMatchObject([
      { inventoryItemId: 'inv_zero', quantity: 0, status: 'depleted' }
    ]);
    await service.hydrateFromDatabase('acc_zero' as never);
  });

  it('creates items with rounded values and searchable listing', async () => {
    const service = createService();

    const created = await service.createItem('acc_test' as never, {
      sku: ' LAB-100 ',
      name: ' Reagente Bioquimico ',
      unit: ' frasco ',
      onHandQuantity: 12.4,
      reorderLevel: 3.8,
      unitCostAmount: 15.239
    });

    expect(created.sku).toBe('LAB-100');
    expect(created.name).toBe('Reagente Bioquimico');
    expect(created.unit).toBe('frasco');
    expect(created.reorderLevel).toBe(3);
    expect(created.unitCostAmount).toBe(15.24);

    const listed = service.listItems('acc_test' as never, { search: 'lab-100' });
    expect(listed.map((item) => item.id)).toContain(created.id);

    const lots = service.listLots('acc_test' as never).filter((lot) => lot.inventoryItemId === created.id);
    expect(lots).toHaveLength(1);
    expect(lots[0]?.quantity).toBe(12.4);
    expect(lots[0]?.status).toBe('active');
  });

  it('rejects duplicate SKU and updates lot projections when stock changes', async () => {
    const service = createService();

    const created = await service.createItem('acc_test' as never, {
      sku: 'MED-NEW',
      name: 'Novo insumo',
      unit: 'caixa',
      onHandQuantity: 5,
      reorderLevel: 1,
      unitCostAmount: 4
    });

    await expect(
      service.createItem('acc_test' as never, {
        sku: 'MED-NEW',
        name: 'Duplicado',
        unit: 'caixa',
        onHandQuantity: 3,
        reorderLevel: 1,
        unitCostAmount: 2
      })
    ).rejects.toThrow(ConflictError);

    const updated = await service.updateItem('acc_test' as never, created.id, {
      onHandQuantity: 0.5,
      reorderLevel: 0.2,
      unitCostAmount: 10.678
    });

    expect(updated.reorderLevel).toBe(0);
    expect(updated.unitCostAmount).toBe(10.68);

    const lots = service.listLots('acc_test' as never).filter((lot) => lot.inventoryItemId === created.id);
    expect(lots).toHaveLength(1);
    expect(lots[0]?.quantity).toBe(0.5);
    expect(lots[0]?.status).toBe('active');
  });

  it('consumes lots by earliest expiry and records commercial sale consumptions', async () => {
    const service = createService();

    const beforeLots = service
      .listLots('acc_cvg_demo' as never)
      .filter((lot) => lot.inventoryItemId === 'inv_catheter');

    expect(beforeLots[0]?.lotNumber).toBe('CAT-240105-A');

    const commercial = await service.consumeForSale('acc_cvg_demo' as never, 'inv_catheter' as never, 7);

    expect(commercial.accountId).toBe('acc_cvg_demo');
    expect(commercial.sourceEntityType).toBe('other');
    expect(commercial.costAmount).toBe(62.3);

    const afterLots = service
      .listLots('acc_cvg_demo' as never)
      .filter((lot) => lot.inventoryItemId === 'inv_catheter');

    expect(afterLots[0]?.lotNumber).toBe('CAT-240105-A');
    expect(afterLots[0]?.quantity).toBe(0);
    expect(afterLots[0]?.status).toBe('depleted');
    expect(afterLots[1]?.quantity).toBe(11);
    expect(service.listConsumptionsByAccount('acc_cvg_demo' as never)).toHaveLength(1);
  });

  it('hydrates persisted inventory and consumptions from repository mode', async () => {
    const service = new InventoryService(
      {
        getOrThrow(_accountId: string, encounterId: string) {
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

    expect(service.persistenceMode).toBe('database');

    await service.hydrateFromDatabase('acc_repo' as never);

    expect(service.listItems('acc_repo' as never)).toHaveLength(1);
    expect(service.listConsumptionsByAccount('acc_repo' as never)).toHaveLength(1);
    expect(
      service.listLots('acc_repo' as never).every((lot) => lot.inventoryItemId === 'inv_repo_1')
    ).toBe(true);
  });

  it('does not consume an expired persisted lot', async () => {
    const service = new InventoryService(
      {
        getOrThrow() {
          return {
            id: 'enc_repo',
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
            return [{
              id: 'inv_expired' as never,
              accountId: 'acc_repo' as never,
              sku: 'EXP-001',
              name: 'Lote vencido',
              unit: 'unidade',
              onHandQuantity: 2,
              reorderLevel: 0,
              unitCostAmount: 1,
              createdAt: '2026-04-12T09:00:00.000Z',
              updatedAt: '2026-04-12T09:00:00.000Z'
            }];
          },
          async findConsumptions() {
            return [];
          },
          async findStockMovements() {
            return [];
          },
          async findLots() {
            return [{
              id: 'lot_expired' as never,
              accountId: 'acc_repo' as never,
              inventoryItemId: 'inv_expired' as never,
              sku: 'EXP-001',
              itemName: 'Lote vencido',
              lotNumber: 'EXP-001-A',
              quantity: 2,
              unit: 'unidade',
              expiryDate: '2020-01-01T00:00:00.000Z',
              status: 'active' as const,
              createdAt: '2026-04-12T09:00:00.000Z',
              updatedAt: '2026-04-12T09:00:00.000Z'
            }];
          }
        } as never
      }
    );

    await service.hydrateFromDatabase('acc_repo' as never);
    expect(service.listLots('acc_repo' as never)[0]?.status).toBe('expired');
    await expect(
      service.consume('user_repo' as never, {
        encounterId: 'enc_repo',
        inventoryItemId: 'inv_expired',
        quantity: 1,
        sourceEntityType: 'encounter',
        sourceEntityId: 'enc_repo'
      }, 'acc_repo' as never)
    ).rejects.toThrow(/lots out of sync/);
    expect(service.listLots('acc_repo' as never)[0]?.quantity).toBe(2);
  });
});
