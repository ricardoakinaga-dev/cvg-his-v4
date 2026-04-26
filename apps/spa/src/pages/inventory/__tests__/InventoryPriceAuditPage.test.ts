import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryPriceAuditPage from '../InventoryPriceAuditPage.vue';
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
    list: vi.fn()
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
  },
  {
    id: 'inv-unpriced',
    accountId: 'acc-1',
    sku: 'MED-001',
    name: 'Dipirona Injetavel',
    unit: 'ampola',
    onHandQuantity: 24,
    reorderLevel: 5,
    unitCostAmount: 12.5,
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

describe('InventoryPriceAuditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productsService.list).mockResolvedValue(products);
    vi.mocked(inventoryService.list).mockResolvedValue(inventoryItems);
    vi.mocked(listPriceTables).mockResolvedValue(priceTables);
  });

  it('renders Vetus-like price audit controls and rows', async () => {
    const wrapper = mount(InventoryPriceAuditPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Auditoria de Preços');
    expect(wrapper.text()).toContain('Conferência');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Produto / Tabela');
    expect(wrapper.text()).toContain('Origem');
    expect(wrapper.text()).toContain('Tabela');
    expect(wrapper.text()).toContain('Preço');
    expect(wrapper.text()).toContain('Custo');
    expect(wrapper.text()).toContain('Margem');
    expect(wrapper.text()).toContain('Saldo');
    expect(wrapper.text()).toContain('Situação');
    expect(wrapper.text()).toContain('Ração Renal');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('Atenção');
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).toContain('Item de estoque sem cadastro comercial equivalente');
    expect(wrapper.text()).toContain('Tabela Balcão');
    expect(wrapper.text()).toContain('Tabela Inativa');
    expect(productsService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
    expect(listPriceTables).toHaveBeenCalledWith({ search: undefined });
  });

  it('uses typed filters when searching price audit', async () => {
    const wrapper = mount(InventoryPriceAuditPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('VAC');
    await searchInputs[1].setValue('Vacina');
    await searchInputs[2].setValue('Balcão');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(productsService.list).toHaveBeenLastCalledWith('Vacina');
    expect(inventoryService.list).toHaveBeenLastCalledWith('Vacina');
    expect(listPriceTables).toHaveBeenLastCalledWith({ search: 'Balcão' });
    expect(wrapper.text()).toContain('Vacina V10');
  });

  it('shows the selected price audit action without mutating prices', async () => {
    const wrapper = mount(InventoryPriceAuditPage);
    await flushPromises();

    await wrapper.find('[data-testid="price-audit-record"]').setValue('product-prod-low-margin');

    expect(wrapper.text()).toContain('Margem abaixo da política mínima');
    expect(wrapper.text()).toContain('Tabela: 1 tabela(s) ativa(s)');
    expect(productsService.list).toHaveBeenCalledOnce();
    expect(inventoryService.list).toHaveBeenCalledOnce();
  });
});
