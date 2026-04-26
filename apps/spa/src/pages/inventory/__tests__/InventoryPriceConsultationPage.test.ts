import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryPriceConsultationPage from '../InventoryPriceConsultationPage.vue';
import { inventoryService } from '@/services/inventory';
import { productsService } from '@/services/products';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/products', () => ({
  productsService: {
    list: vi.fn()
  }
}));

const product = {
  id: 'prod-1',
  accountId: 'acc-1',
  name: 'Ração Renal',
  code: 'PROD-001',
  description: 'Alimento terapeutico',
  basePrice: 129.9,
  active: true,
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z'
};

const inventoryItem = {
  id: 'inv-1',
  accountId: 'acc-1',
  sku: 'MED-001',
  name: 'Dipirona Injetavel',
  unit: 'ampola',
  onHandQuantity: 2,
  reorderLevel: 5,
  unitCostAmount: 12.5,
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z'
};

describe('InventoryPriceConsultationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productsService.list).mockResolvedValue([product]);
    vi.mocked(inventoryService.list).mockResolvedValue([inventoryItem]);
  });

  it('renders Vetus-like price consultation with products and stock data', async () => {
    const wrapper = mount(InventoryPriceConsultationPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Consulta de Preços');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Origem');
    expect(wrapper.text()).toContain('Preço');
    expect(wrapper.text()).toContain('Custo');
    expect(wrapper.text()).toContain('Margem');
    expect(wrapper.text()).toContain('Saldo');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Ração Renal');
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).toContain('Abaixo do ponto');
    expect(wrapper.text()).toContain('Abrir');
    expect(productsService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
  });

  it('sends the typed Vetus-like search to both backing APIs', async () => {
    const wrapper = mount(InventoryPriceConsultationPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('MED');
    await searchInputs[1].setValue('Dipirona');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(productsService.list).toHaveBeenLastCalledWith('Dipirona');
    expect(inventoryService.list).toHaveBeenLastCalledWith('Dipirona');
  });
});
