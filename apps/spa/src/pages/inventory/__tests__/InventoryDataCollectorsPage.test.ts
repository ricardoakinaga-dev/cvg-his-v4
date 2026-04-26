import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryDataCollectorsPage from '../InventoryDataCollectorsPage.vue';
import { inventoryService } from '@/services/inventory';
import type { InventoryItemSummary, InventoryLotSummary } from '@/types/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listLots: vi.fn()
  }
}));

const inventoryItems: InventoryItemSummary[] = [
  {
    id: 'inv-food',
    accountId: 'acc-1',
    sku: 'PROD-001',
    name: 'Ração Renal',
    unit: 'un',
    onHandQuantity: 12,
    reorderLevel: 4,
    unitCostAmount: 80,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  },
  {
    id: 'inv-low',
    accountId: 'acc-1',
    sku: 'VAC-010',
    name: 'Vacina V10',
    unit: 'dose',
    onHandQuantity: 2,
    reorderLevel: 5,
    unitCostAmount: 42,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

const inventoryLots: InventoryLotSummary[] = [
  {
    id: 'lot-vac',
    accountId: 'acc-1',
    inventoryItemId: 'inv-low',
    sku: 'VAC-010',
    itemName: 'Vacina V10',
    lotNumber: 'L-2026',
    quantity: 2,
    unit: 'dose',
    location: 'Farmácia',
    supplier: 'Fornecedor Teste',
    manufactureDate: '2026-01-10',
    expiryDate: '2026-09-10',
    status: 'active',
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

describe('InventoryDataCollectorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryService.list).mockResolvedValue(inventoryItems);
    vi.mocked(inventoryService.listLots).mockResolvedValue(inventoryLots);
  });

  it('renders Vetus-like data collector controls, filters and rows', async () => {
    const wrapper = mount(InventoryDataCollectorsPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Coletores de Dados');
    expect(wrapper.text()).toContain('Coleta');
    expect(wrapper.text()).toContain('Coletor');
    expect(wrapper.text()).toContain('Operação');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Código de Barras');
    expect(wrapper.text()).toContain('Lote');
    expect(wrapper.text()).toContain('Quantidade Coletada');
    expect(wrapper.text()).toContain('Responsável');
    expect(wrapper.text()).toContain('Observação');
    expect(wrapper.text()).toContain('Registrar Coleta');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Ração Renal');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('Atenção');
    expect(wrapper.text()).toContain('Pendente');
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.listLots).toHaveBeenCalled();
  });

  it('registers a collected row with divergence in the runtime list', async () => {
    const wrapper = mount(InventoryDataCollectorsPage);
    await flushPromises();

    await wrapper.get('[data-testid="collector-product"]').setValue('inv-low');
    await wrapper.get('[data-testid="collector-quantity"]').setValue(1);
    await wrapper.get('[data-testid="collector-responsible"]').setValue('Operador Estoque');
    await wrapper.find('form[aria-label="Registrar coleta de dados"]').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Vacina V10 registrado pelo Coletor 01');
    expect(wrapper.text()).toContain('Divergência');
    expect(wrapper.text()).toContain('Operador Estoque');
  });

  it('uses typed filters when searching data collector rows', async () => {
    const wrapper = mount(InventoryDataCollectorsPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('.filter-panel input[type="search"]');
    await searchInputs[0].setValue('VAC');
    await searchInputs[1].setValue('Vacina');
    await searchInputs[2].setValue('Coletor 01');
    await wrapper.find('.filter-panel form').trigger('submit');
    await flushPromises();

    expect(inventoryService.list).toHaveBeenLastCalledWith('Vacina');
    expect(inventoryService.listLots).toHaveBeenCalledTimes(2);
  });

  it('blocks collection without a selected product', async () => {
    const wrapper = mount(InventoryDataCollectorsPage);
    await flushPromises();

    await wrapper.find('form[aria-label="Registrar coleta de dados"]').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Selecione um produto para registrar a coleta');
  });
});
