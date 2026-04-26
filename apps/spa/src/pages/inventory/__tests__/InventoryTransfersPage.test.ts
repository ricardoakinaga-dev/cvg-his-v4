import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryTransfersPage from '../InventoryTransfersPage.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listLots: vi.fn()
  }
}));

const lowStockItem = {
  id: 'item-low',
  accountId: 'acc-1',
  sku: 'MED-001',
  name: 'Dipirona Injetavel',
  unit: 'ampola',
  onHandQuantity: 4,
  reorderLevel: 8,
  unitCostAmount: 12.5,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z'
};

const normalItem = {
  id: 'item-normal',
  accountId: 'acc-1',
  sku: 'MAT-014',
  name: 'Gaze Esteril',
  unit: 'pacote',
  onHandQuantity: 60,
  reorderLevel: 10,
  unitCostAmount: 4.2,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z'
};

const activeLot = {
  id: 'lot-active',
  accountId: 'acc-1',
  inventoryItemId: 'item-low',
  sku: 'MED-001',
  itemName: 'Dipirona Injetavel',
  lotNumber: 'DIP-240401-B',
  quantity: 4,
  unit: 'ampola',
  location: 'Farmacia fria A2',
  supplier: 'PharmaVet',
  manufactureDate: '2026-03-12T00:00:00.000Z',
  expiryDate: '2026-07-30T00:00:00.000Z',
  status: 'active' as const,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z'
};

const expiringLot = {
  id: 'lot-expiring',
  accountId: 'acc-1',
  inventoryItemId: 'item-normal',
  sku: 'MAT-014',
  itemName: 'Gaze Esteril',
  lotNumber: 'GAZ-240210-A',
  quantity: 12,
  unit: 'pacote',
  location: 'Almox central B3',
  supplier: 'VetSurgical',
  manufactureDate: '2026-01-20T00:00:00.000Z',
  expiryDate: '2026-05-12T00:00:00.000Z',
  status: 'expiring' as const,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z'
};

const expiredLot = {
  id: 'lot-expired',
  accountId: 'acc-1',
  inventoryItemId: 'item-normal',
  sku: 'MAT-014',
  itemName: 'Gaze Esteril',
  lotNumber: 'GAZ-OLD',
  quantity: 1,
  unit: 'pacote',
  location: 'Ajuste',
  supplier: 'VetSurgical',
  manufactureDate: '2025-12-20T00:00:00.000Z',
  expiryDate: '2026-04-01T00:00:00.000Z',
  status: 'expired' as const,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z'
};

describe('InventoryTransfersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryService.list).mockResolvedValue([lowStockItem, normalItem]);
    vi.mocked(inventoryService.listLots).mockResolvedValue([activeLot, expiringLot, expiredLot]);
  });

  it('renders Vetus-like transfer controls, filters and lot rows', async () => {
    const wrapper = mount(InventoryTransfersPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Transferência entre Estoques');
    expect(wrapper.text()).toContain('Origem');
    expect(wrapper.text()).toContain('Destino');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Código de Barras');
    expect(wrapper.text()).toContain('Lote');
    expect(wrapper.text()).toContain('Quantidade');
    expect(wrapper.text()).toContain('Responsável');
    expect(wrapper.text()).toContain('Observação');
    expect(wrapper.text()).toContain('Preparar');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).toContain('Gaze Esteril');
    expect(wrapper.text()).toContain('DIP-240401-B');
    expect(wrapper.text()).toContain('GAZ-240210-A');
    expect(wrapper.text()).toContain('Disponível');
    expect(wrapper.text()).toContain('Atenção');
    expect(wrapper.text()).toContain('Bloqueada');
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.listLots).toHaveBeenCalledOnce();
  });

  it('prepares a transfer locally without mutating inventory APIs', async () => {
    const wrapper = mount(InventoryTransfersPage);
    await flushPromises();

    await wrapper.get('[data-testid="transfer-product"]').setValue('item-low');
    await wrapper.get('[data-testid="transfer-destination"]').setValue('Estoque principal');
    await wrapper.get('[data-testid="transfer-quantity"]').setValue(2);
    await wrapper.get('[data-testid="transfer-responsible"]').setValue('Paula Estoque');
    await wrapper.find('form[aria-label="Preparar transferência entre estoques"]').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Dipirona Injetavel preparado para transferência');
    expect(wrapper.text()).toContain('Preparada');
    expect(wrapper.text()).toContain('Paula Estoque');
  });

  it('blocks transfer quantity greater than the selected origin balance', async () => {
    const wrapper = mount(InventoryTransfersPage);
    await flushPromises();

    await wrapper.get('[data-testid="transfer-product"]').setValue('item-low');
    await wrapper.get('[data-testid="transfer-quantity"]').setValue(20);
    await wrapper.find('form[aria-label="Preparar transferência entre estoques"]').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('A transferência não pode separar quantidade maior que o saldo de origem');
  });

  it('sends product or code search to the inventory list endpoint when filtering', async () => {
    const wrapper = mount(InventoryTransfersPage);
    await flushPromises();

    const productInput = wrapper.findAll('.filter-panel input')[1];
    expect(productInput).toBeTruthy();
    await productInput.setValue('Gaze');
    await wrapper.find('.filter-panel form').trigger('submit');
    await flushPromises();

    expect(inventoryService.list).toHaveBeenLastCalledWith('Gaze');
    expect(inventoryService.listLots).toHaveBeenCalledTimes(2);
  });
});
