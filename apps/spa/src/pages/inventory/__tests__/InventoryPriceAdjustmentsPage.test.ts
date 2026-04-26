import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryPriceAdjustmentsPage from '../InventoryPriceAdjustmentsPage.vue';
import { listPriceTables } from '@/services/commercial';
import { inventoryService } from '@/services/inventory';
import { productsService } from '@/services/products';

vi.mock('@/services/commercial', () => ({
  listPriceTables: vi.fn()
}));

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/products', () => ({
  productsService: {
    list: vi.fn(),
    update: vi.fn()
  }
}));

const products = [
  {
    id: 'prod-food',
    accountId: 'acc-1',
    name: 'Ração Renal',
    code: 'PROD-001',
    description: 'Alimento terapeutico',
    basePrice: 129.9,
    active: true,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  },
  {
    id: 'prod-low-margin',
    accountId: 'acc-1',
    name: 'Vacina V10',
    code: 'VAC-010',
    description: 'Imunizante',
    basePrice: 45,
    active: true,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

const inventoryItems = [
  {
    id: 'inv-low-margin',
    accountId: 'acc-1',
    sku: 'VAC-010',
    name: 'Vacina V10',
    unit: 'dose',
    onHandQuantity: 8,
    reorderLevel: 2,
    unitCostAmount: 42,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

const priceTables = [
  {
    id: 'table-default',
    legacyId: 'TAB-001',
    description: 'Tabela Balcão',
    context: 'PDV e balcão',
    isActive: true
  },
  {
    id: 'table-old',
    legacyId: 'TAB-OLD',
    description: 'Tabela Inativa',
    context: 'Histórico',
    isActive: false
  }
];

describe('InventoryPriceAdjustmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productsService.list).mockResolvedValue(products);
    vi.mocked(inventoryService.list).mockResolvedValue(inventoryItems);
    vi.mocked(listPriceTables).mockResolvedValue(priceTables);
    vi.mocked(productsService.update).mockResolvedValue({
      ...products[1],
      basePrice: 49.5,
      updatedAt: '2026-04-26T12:00:00.000Z'
    });
  });

  it('renders Vetus-like price adjustment controls, filters and rows', async () => {
    const wrapper = mount(InventoryPriceAdjustmentsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Reajuste de Preços');
    expect(wrapper.text()).toContain('Reajuste');
    expect(wrapper.text()).toContain('Tabela');
    expect(wrapper.text()).toContain('Tipo');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Valor do Reajuste');
    expect(wrapper.text()).toContain('Arredondamento');
    expect(wrapper.text()).toContain('Margem mínima %');
    expect(wrapper.text()).toContain('Motivo');
    expect(wrapper.text()).toContain('Aplicar');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Ração Renal');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('Tabela Balcão');
    expect(wrapper.text()).toContain('Atenção');
    expect(wrapper.text()).toContain('Sugerido');
    expect(productsService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
    expect(listPriceTables).toHaveBeenCalledWith({ search: undefined });
  });

  it('applies a persisted product base price adjustment', async () => {
    const wrapper = mount(InventoryPriceAdjustmentsPage);
    await flushPromises();

    await wrapper.get('[data-testid="adjustment-product"]').setValue('prod-low-margin');
    await wrapper.get('[data-testid="adjustment-type"]').setValue('percent');
    await wrapper.get('[data-testid="adjustment-value"]').setValue(10);
    await wrapper.find('form[aria-label="Aplicar reajuste de preço"]').trigger('submit');
    await flushPromises();

    expect(productsService.update).toHaveBeenCalledWith('prod-low-margin', { basePrice: 49.5 });
    expect(wrapper.text().replace(/\u00a0/g, ' ')).toContain('Vacina V10 reajustado para R$ 49,50');
    expect(wrapper.text()).toContain('Aplicado');
  });

  it('uses typed filters when searching price adjustments', async () => {
    const wrapper = mount(InventoryPriceAdjustmentsPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('.filter-panel input[type="search"]');
    await searchInputs[0].setValue('VAC');
    await searchInputs[1].setValue('Vacina');
    await searchInputs[2].setValue('Balcão');
    await wrapper.find('.filter-panel form').trigger('submit');
    await flushPromises();

    expect(productsService.list).toHaveBeenLastCalledWith('Vacina');
    expect(inventoryService.list).toHaveBeenLastCalledWith('Vacina');
    expect(listPriceTables).toHaveBeenLastCalledWith({ search: 'Balcão' });
  });

  it('blocks adjustment without a selected product', async () => {
    const wrapper = mount(InventoryPriceAdjustmentsPage);
    await flushPromises();

    await wrapper.find('form[aria-label="Aplicar reajuste de preço"]').trigger('submit');
    await flushPromises();

    expect(productsService.update).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Selecione um produto para aplicar o reajuste');
  });
});
