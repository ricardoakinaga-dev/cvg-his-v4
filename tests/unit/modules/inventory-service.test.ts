import { describe, expect, it } from 'vitest';

import { ConflictError } from '@cvg-his-v2/shared-errors';

import { InventoryService } from '../../../packages/modules/inventory/src/index.js';

function createService() {
  return new InventoryService(
    {
      getOrThrow(encounterId: string) {
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
  it('creates items with rounded values and searchable listing', () => {
    const service = createService();

    const created = service.createItem('acc_test' as never, {
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

  it('rejects duplicate SKU and updates lot projections when stock changes', () => {
    const service = createService();

    const created = service.createItem('acc_test' as never, {
      sku: 'MED-NEW',
      name: 'Novo insumo',
      unit: 'caixa',
      onHandQuantity: 5,
      reorderLevel: 1,
      unitCostAmount: 4
    });

    expect(() =>
      service.createItem('acc_test' as never, {
        sku: 'MED-NEW',
        name: 'Duplicado',
        unit: 'caixa',
        onHandQuantity: 3,
        reorderLevel: 1,
        unitCostAmount: 2
      })
    ).toThrow(ConflictError);

    const updated = service.updateItem(created.id, {
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

    expect(service.persistenceMode).toBe('database');

    await service.hydrateFromDatabase('acc_repo' as never);

    expect(service.listItems('acc_repo' as never)).toHaveLength(1);
    expect(service.listConsumptionsByAccount('acc_repo' as never)).toHaveLength(1);
    expect(
      service.listLots('acc_repo' as never).every((lot) => lot.inventoryItemId === 'inv_repo_1')
    ).toBe(true);
  });
});
