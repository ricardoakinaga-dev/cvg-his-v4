import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryMovementsPage from '../InventoryMovementsPage.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listStockMovements: vi.fn(),
    createStockAdjustment: vi.fn()
  }
}));

describe('InventoryMovementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryService.list).mockResolvedValue([
      {
        id: 'item-1',
        accountId: 'acc-1',
        sku: 'MED-001',
        name: 'Dipirona',
        unit: 'un',
        onHandQuantity: 10,
        reorderLevel: 2,
        unitCostAmount: 8,
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z'
      }
    ]);
    vi.mocked(inventoryService.listStockMovements).mockResolvedValue([
      {
        id: 'mov-1',
        accountId: 'acc-1',
        inventoryItemId: 'item-1',
        movementType: 'adjustment',
        quantityDelta: 5,
        balanceBefore: 10,
        balanceAfter: 15,
        unitCostAmount: 8,
        reason: 'Inventario rotativo',
        reference: 'INV-2026-001',
        recordedByUserId: 'user-1',
        createdAt: '2026-04-24T00:00:00.000Z'
      }
    ]);
    vi.mocked(inventoryService.createStockAdjustment).mockResolvedValue({
      id: 'mov-2',
      accountId: 'acc-1',
      inventoryItemId: 'item-1',
      movementType: 'adjustment',
      quantityDelta: -2,
      balanceBefore: 15,
      balanceAfter: 13,
      unitCostAmount: 8,
      reason: 'Quebra auditada',
      reference: 'AJ-2',
      recordedByUserId: 'user-1',
      createdAt: '2026-04-24T00:00:00.000Z'
    });
  });

  it('renders inventory audit mode with API-backed movements', async () => {
    const wrapper = mount(InventoryMovementsPage, {
      props: {
        title: 'Auditoria de Estoque',
        subtitle: 'Rastreabilidade operacional',
        breadcrumb: 'Auditoria'
      },
      global: {
        stubs: {
          AppPageHeader: {
            props: ['title', 'subtitle', 'breadcrumbs'],
            template: '<header><h1>{{ title }}</h1><p>{{ subtitle }}</p><span>{{ breadcrumbs.join("/") }}</span><slot name="actions" /></header>'
          }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Auditoria de Estoque');
    expect(wrapper.text()).toContain('Estoque/Controles/Auditoria');
    expect(wrapper.text()).toContain('Dipirona');
    expect(wrapper.text()).toContain('Ajuste');
    expect(wrapper.text()).toContain('+5 un');
    expect(wrapper.text()).toContain('15 un');
    expect(wrapper.text()).toContain('Inventario rotativo');
    expect(inventoryService.listStockMovements).toHaveBeenCalled();
  });

  it('registers audited stock adjustment', async () => {
    const wrapper = mount(InventoryMovementsPage, {
      global: {
        stubs: {
          AppPageHeader: {
            props: ['title', 'subtitle', 'breadcrumbs'],
            template: '<header><h1>{{ title }}</h1><slot name="actions" /></header>'
          }
        }
      }
    });

    await flushPromises();

    await wrapper.get('#adjustment-item').setValue('item-1');
    await wrapper.get('#adjustment-delta').setValue('-2');
    await wrapper.get('#adjustment-reason').setValue('Quebra auditada');
    await wrapper.get('#adjustment-reference').setValue('AJ-2');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(inventoryService.createStockAdjustment).toHaveBeenCalledWith({
      inventoryItemId: 'item-1',
      quantityDelta: -2,
      reason: 'Quebra auditada',
      reference: 'AJ-2'
    });
    expect(inventoryService.listStockMovements).toHaveBeenCalledTimes(2);
  });
});
