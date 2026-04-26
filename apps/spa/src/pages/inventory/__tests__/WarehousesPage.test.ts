import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WarehousesPage from '../WarehousesPage.vue';
import { inventoryService } from '@/services/inventory';
import { warehousesService } from '@/services/warehouses';

vi.mock('@/services/warehouses', () => ({
  warehousesService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listLots: vi.fn()
  }
}));

const warehouseResponse = {
  items: [
    {
      id: 'wh-1',
      accountId: 'account-1',
      displayId: 17,
      description: 'Estoque Refrigerado',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    },
    {
      id: 'wh-2',
      accountId: 'account-1',
      displayId: 14,
      description: 'Armario Clinico',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    }
  ],
  totalItems: 2
};

describe('WarehousesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(warehousesService.list).mockResolvedValue(structuredClone(warehouseResponse));
    vi.mocked(warehousesService.create).mockResolvedValue({
      id: 'wh-3',
      accountId: 'account-1',
      displayId: 18,
      description: 'Estoque CVG',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    });
    vi.mocked(warehousesService.update).mockResolvedValue({
      ...warehouseResponse.items[0],
      description: 'Estoque Refrigerado Principal'
    });
    vi.mocked(warehousesService.remove).mockResolvedValue(undefined);
    vi.mocked(inventoryService.list).mockResolvedValue([
      {
        id: 'inv-1',
        accountId: 'account-1',
        sku: 'SKU-1',
        name: 'Vacina CVG',
        unit: 'un',
        onHandQuantity: 10,
        reorderLevel: 2,
        unitCostAmount: 15,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z'
      }
    ]);
    vi.mocked(inventoryService.listLots).mockResolvedValue([
      {
        id: 'lot-1',
        accountId: 'account-1',
        inventoryItemId: 'inv-1',
        sku: 'SKU-1',
        itemName: 'Vacina CVG',
        lotNumber: 'L-1',
        quantity: 10,
        unit: 'un',
        location: 'Estoque Refrigerado',
        status: 'active',
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z'
      }
    ]);
  });

  it('renders the Vetus-like stock location catalog', async () => {
    const wrapper = mount(WarehousesPage);
    await flushPromises();

    expect(warehousesService.list).toHaveBeenCalledWith({ search: undefined, active: true });
    expect(wrapper.text().replace(/\s+/g, '').replace(/\//g, '')).toContain('EstoqueCadastrosEstoques');
    expect(wrapper.text()).toContain('Incluir Novo Estoque');
    expect(wrapper.get('[data-testid="warehouse-search"]').attributes('placeholder')).toBe('Buscar por ID ou descrição');
    expect(wrapper.text()).toContain('Descrição:');
    expect(wrapper.text()).toContain('Estoque Refrigerado');
    expect(wrapper.text()).toContain('ID:');
    expect(wrapper.text()).toContain('17');
    expect(wrapper.text()).toContain('Ver Detalhes');
  });

  it('filters by ID or description through the warehouse API', async () => {
    const wrapper = mount(WarehousesPage);
    await flushPromises();

    await wrapper.get('[data-testid="warehouse-search"]').setValue('17');
    await wrapper.findAll('button').find((button) => button.text() === 'Pesquisar')!.trigger('click');
    await flushPromises();

    expect(warehousesService.list).toHaveBeenLastCalledWith({ search: '17', active: true });
  });

  it('creates and updates warehouses through the durable catalog API', async () => {
    const wrapper = mount(WarehousesPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Incluir Novo Estoque')!.trigger('click');
    await wrapper.get('[data-testid="warehouse-description"]').setValue('Estoque CVG');
    await wrapper.find('form[aria-label="Cadastro de estoque"]').trigger('submit');
    await flushPromises();

    expect(warehousesService.create).toHaveBeenCalledWith({
      description: 'Estoque CVG',
      active: true
    });
    expect(wrapper.text()).toContain('Estoque cadastrado com sucesso.');

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await wrapper.get('[data-testid="warehouse-description"]').setValue('Estoque Refrigerado Principal');
    await wrapper.find('form[aria-label="Cadastro de estoque"]').trigger('submit');
    await flushPromises();

    expect(warehousesService.update).toHaveBeenCalledWith('wh-3', {
      description: 'Estoque Refrigerado Principal',
      active: true
    });
  });

  it('archives warehouses through the exclude action', async () => {
    const wrapper = mount(WarehousesPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Excluir')!.trigger('click');
    await flushPromises();

    expect(warehousesService.remove).toHaveBeenCalledWith('wh-1');
    expect(wrapper.text()).toContain('Estoque excluído com sucesso.');
  });
});
