import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryInvoicesPage from '../InventoryInvoicesPage.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listLots: vi.fn(),
    listPurchases: vi.fn(),
    createPurchase: vi.fn(),
    approvePurchase: vi.fn(),
    receivePurchase: vi.fn()
  }
}));

const inventoryItem = {
  id: 'inv-dipyrone',
  accountId: 'acc-1',
  sku: 'MED-001',
  name: 'Dipirona Injetavel',
  unit: 'ampola',
  onHandQuantity: 24,
  reorderLevel: 5,
  unitCostAmount: 12.5,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z'
};

const lot = {
  id: 'lot-1',
  accountId: 'acc-1',
  inventoryItemId: 'inv-dipyrone',
  sku: 'MED-001',
  itemName: 'Dipirona Injetavel',
  lotNumber: 'L-2026-04',
  quantity: 10,
  unit: 'ampola',
  location: 'Farmacia',
  supplier: 'Fornecedor Teste',
  manufactureDate: '2026-03-01T00:00:00.000Z',
  expiryDate: '2027-03-01T00:00:00.000Z',
  status: 'active' as const,
  createdAt: '2026-04-25T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z'
};

describe('InventoryInvoicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryService.list).mockResolvedValue([inventoryItem]);
    vi.mocked(inventoryService.listLots).mockResolvedValue([lot]);
    vi.mocked(inventoryService.listPurchases).mockResolvedValue([]);
  });

  it('renders Vetus-like fiscal entry columns with inventory lots', async () => {
    const wrapper = mount(InventoryInvoicesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Entrada de Nota Fiscal');
    expect(wrapper.text()).toContain('Nota Fiscal');
    expect(wrapper.text()).toContain('Fornecedor');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Lote');
    expect(wrapper.text()).toContain('Entrada');
    expect(wrapper.text()).toContain('Validade');
    expect(wrapper.text()).toContain('Quantidade');
    expect(wrapper.text()).toContain('Custo Unit.');
    expect(wrapper.text()).toContain('Valor');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Fornecedor Teste');
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).toContain('L-2026-04');
    expect(wrapper.text()).toContain('Conferida');
    expect(wrapper.text()).toContain('Abrir');
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.listLots).toHaveBeenCalledOnce();
  });

  it('uses typed Vetus-like filters when searching fiscal entries', async () => {
    const wrapper = mount(InventoryInvoicesPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('NF-2026');
    await searchInputs[1].setValue('Fornecedor');
    await searchInputs[2].setValue('Dipirona');
    await searchInputs[3].setValue('L-2026');
    await wrapper.find('form[aria-label="Filtros de entrada de nota fiscal"]').trigger('submit');
    await flushPromises();

    expect(inventoryService.list).toHaveBeenLastCalledWith('Dipirona');
    expect(inventoryService.listLots).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Fornecedor Teste');
  });

  it('registers a fiscal receipt through the persisted procurement workflow', async () => {
    vi.mocked(inventoryService.createPurchase).mockResolvedValue({
      id: 'purchase-1',
      lines: [{ id: 'purchase-line-1' }]
    } as never);
    vi.mocked(inventoryService.approvePurchase).mockResolvedValue({
      lines: [{ id: 'purchase-line-1' }]
    } as never);
    vi.mocked(inventoryService.receivePurchase).mockResolvedValue({} as never);

    const wrapper = mount(InventoryInvoicesPage);
    await flushPromises();

    await wrapper.get('[data-testid="invoice-supplier"]').setValue('Fornecedor Teste');
    await wrapper.get('[data-testid="invoice-number"]').setValue('NF-2026-0042');
    await wrapper.get('[data-testid="invoice-product"]').setValue('inv-dipyrone');
    await wrapper.get('[data-testid="invoice-quantity"]').setValue(3);
    await wrapper.get('[data-testid="invoice-cost"]').setValue(12.5);
    await wrapper.get('[data-testid="invoice-lot"]').setValue('L-2026-NEW');
    await wrapper.get('[data-testid="invoice-expiry"]').setValue('2027-04-01');
    await wrapper.get('[data-testid="invoice-location"]').setValue('Farmacia');
    await wrapper.get('form[aria-label="Registrar entrada de nota fiscal"]').trigger('submit');
    await flushPromises();

    expect(inventoryService.createPurchase).toHaveBeenCalledWith({
      supplierName: 'Fornecedor Teste',
      invoiceNumber: 'NF-2026-0042',
      lines: [{
        inventoryItemId: 'inv-dipyrone',
        quantity: 3,
        unitCostAmount: 12.5,
        lotNumber: 'L-2026-NEW',
        expiryDate: '2027-04-01T00:00:00.000Z',
        location: 'Farmacia'
      }]
    });
    expect(inventoryService.approvePurchase).toHaveBeenCalledWith('purchase-1');
    expect(inventoryService.receivePurchase).toHaveBeenCalledWith('purchase-1', {
      lines: [{ lineId: 'purchase-line-1', quantity: 3 }]
    });
    expect(wrapper.text()).toContain('Entrada NF registrada');
  });
});
