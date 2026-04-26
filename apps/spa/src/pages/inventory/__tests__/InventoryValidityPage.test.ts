import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryValidityPage from '../InventoryValidityPage.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listLots: vi.fn()
  }
}));

const inventoryItems = [
  {
    id: 'inv-vaccine',
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
  },
  {
    id: 'inv-food',
    accountId: 'acc-1',
    sku: 'ALM-001',
    name: 'Ração Renal',
    unit: 'kg',
    onHandQuantity: 3,
    reorderLevel: 1,
    unitCostAmount: 30,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

const lots = [
  {
    id: 'lot-vaccine',
    accountId: 'acc-1',
    inventoryItemId: 'inv-vaccine',
    sku: 'VAC-010',
    itemName: 'Vacina V10',
    lotNumber: 'L-VAC-01',
    quantity: 4,
    unit: 'dose',
    location: 'Geladeira Vacinas',
    supplier: 'Fornecedor Teste',
    manufactureDate: '2025-01-10T00:00:00.000Z',
    expiryDate: '2026-01-15T00:00:00.000Z',
    status: 'expired' as const,
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  },
  {
    id: 'lot-dipyrone',
    accountId: 'acc-1',
    inventoryItemId: 'inv-dipyrone',
    sku: 'MED-001',
    itemName: 'Dipirona Injetavel',
    lotNumber: 'L-MED-02',
    quantity: 10,
    unit: 'ampola',
    location: 'Farmacia',
    supplier: 'Distribuidora Saúde',
    manufactureDate: '2026-01-01T00:00:00.000Z',
    expiryDate: '2026-05-10T00:00:00.000Z',
    status: 'expiring' as const,
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

describe('InventoryValidityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryService.list).mockResolvedValue(inventoryItems);
    vi.mocked(inventoryService.listLots).mockResolvedValue(lots);
  });

  it('renders Vetus-like validity controls, alerts and lot columns', async () => {
    const wrapper = mount(InventoryValidityPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Validade de Produtos');
    expect(wrapper.text()).toContain('Conferência');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Lote');
    expect(wrapper.text()).toContain('Fornecedor');
    expect(wrapper.text()).toContain('Fabricação');
    expect(wrapper.text()).toContain('Validade');
    expect(wrapper.text()).toContain('Dias');
    expect(wrapper.text()).toContain('Quantidade');
    expect(wrapper.text()).toContain('Situação');
    expect(wrapper.text()).toContain('Bloqueio');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('L-VAC-01');
    expect(wrapper.text()).toContain('Fornecedor Teste');
    expect(wrapper.text()).toContain('Vencido');
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).toContain('Vencendo');
    expect(wrapper.text()).toContain('Ração Renal');
    expect(wrapper.text()).toContain('Sem validade');
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.listLots).toHaveBeenCalledOnce();
  });

  it('uses typed filters when searching product validity', async () => {
    const wrapper = mount(InventoryValidityPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('MED');
    await searchInputs[1].setValue('Dipirona');
    await searchInputs[2].setValue('L-MED');
    await searchInputs[3].setValue('Distribuidora');
    await wrapper.find('input[type="date"]').setValue('2026-05-31');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(inventoryService.list).toHaveBeenLastCalledWith('Dipirona');
    expect(inventoryService.listLots).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Dipirona Injetavel');
  });

  it('shows the selected lot action without mutating inventory', async () => {
    const wrapper = mount(InventoryValidityPage);
    await flushPromises();

    await wrapper.find('[data-testid="validity-product"]').setValue('lot-vaccine');

    expect(wrapper.text()).toContain('Geladeira Vacinas');
    expect(wrapper.text()).toContain('L-VAC-01');
    expect(wrapper.text()).toContain('Bloquear saída e revisar lote');
    expect(inventoryService.listLots).toHaveBeenCalledOnce();
  });
});
