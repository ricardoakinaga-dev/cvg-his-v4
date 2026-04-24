import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryOperationPage from '../InventoryOperationPage.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listLots: vi.fn()
  }
}));

const baseItem = {
  id: 'item-1',
  accountId: 'acc-1',
  sku: 'MED-001',
  name: 'Dipirona',
  unit: 'un',
  onHandQuantity: 1,
  reorderLevel: 5,
  unitCostAmount: 8,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z'
};

const baseLot = {
  id: 'lot-1',
  accountId: 'acc-1',
  inventoryItemId: 'item-1',
  sku: 'MED-001',
  itemName: 'Dipirona',
  lotNumber: 'L-001',
  quantity: 1,
  unit: 'un',
  supplier: 'Fornecedor Vetus',
  expiryDate: '2026-05-15T00:00:00.000Z',
  status: 'expiring' as const,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z'
};

describe('InventoryOperationPage', () => {
  beforeEach(() => {
    vi.mocked(inventoryService.list).mockResolvedValue([baseItem]);
    vi.mocked(inventoryService.listLots).mockResolvedValue([baseLot]);
  });

  it.each([
    ['purchases', 'Compras de Estoque', 'Comprar 4 un'],
    ['transfers', 'Transferências entre Estoques', 'Transferir para estoque principal'],
    ['invoices', 'Notas Fiscais de Estoque', 'Conferir NF de entrada']
  ] as const)('renders %s mode with API-backed stock data', async (mode, title, expectedAction) => {
    const wrapper = mount(InventoryOperationPage, {
      props: { mode },
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

    expect(wrapper.text()).toContain(title);
    expect(wrapper.text()).toContain('Dipirona');
    expect(wrapper.text()).toContain(expectedAction);
    expect(inventoryService.list).toHaveBeenCalled();
    expect(inventoryService.listLots).toHaveBeenCalled();
  });
});
