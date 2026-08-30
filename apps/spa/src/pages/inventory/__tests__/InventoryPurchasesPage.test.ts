import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryPurchasesPage from '../InventoryPurchasesPage.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listLots: vi.fn(),
    listPurchases: vi.fn()
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

const persistedPurchase = {
  id: 'purchase-persisted-1',
  accountId: 'acc-1',
  supplierName: 'Distribuidora Persistida',
  invoiceNumber: 'NF-2026-0042',
  status: 'draft' as const,
  totalAmount: 25,
  receivedAmount: 0,
  payableId: null,
  lines: [
    {
      id: 'purchase-line-1',
      purchaseId: 'purchase-persisted-1',
      inventoryItemId: 'item-low',
      sku: 'MED-001',
      itemName: 'Dipirona Injetavel',
      orderedQuantity: 2,
      receivedQuantity: 0,
      unit: 'ampola',
      unitCostAmount: 12.5,
      lotNumber: 'DIP-NEW',
      expiryDate: null,
      manufactureDate: null,
      location: null,
      supplier: 'Distribuidora Persistida'
    }
  ],
  createdByUserId: 'user-1',
  approvedByUserId: null,
  createdAt: '2026-04-25T00:00:00.000Z',
  updatedAt: '2026-04-25T00:00:00.000Z',
  receivedAt: null
};

const partiallyReceivedPurchase = {
  id: 'purchase-partial-1',
  accountId: 'acc-1',
  supplierName: 'Distribuidora Parcial',
  invoiceNumber: 'NF-2026-0043',
  status: 'partially_received' as const,
  totalAmount: 10.01,
  receivedAmount: 4.01,
  payableId: null,
  lines: [
    {
      ...persistedPurchase.lines[0],
      id: 'purchase-line-partial-received',
      purchaseId: 'purchase-partial-1',
      orderedQuantity: 1,
      receivedQuantity: 1,
      unitCostAmount: 4.01,
      lotNumber: 'PARTIAL-RECEIVED'
    },
    {
      ...persistedPurchase.lines[0],
      id: 'purchase-line-partial-open',
      purchaseId: 'purchase-partial-1',
      orderedQuantity: 2,
      receivedQuantity: 0,
      unitCostAmount: 3,
      lotNumber: 'PARTIAL-OPEN'
    }
  ],
  createdByUserId: 'user-1',
  approvedByUserId: 'user-2',
  createdAt: '2026-04-25T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z',
  receivedAt: '2026-04-26T00:00:00.000Z'
};

describe('InventoryPurchasesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryService.list).mockResolvedValue([lowStockItem, normalItem]);
    vi.mocked(inventoryService.listLots).mockResolvedValue([activeLot, expiredLot]);
    vi.mocked(inventoryService.listPurchases).mockResolvedValue([]);
  });

  it('renders Vetus-like purchase controls, filters and suggested rows', async () => {
    const wrapper = mount(InventoryPurchasesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Compras');
    expect(wrapper.text()).toContain('Fornecedor');
    expect(wrapper.text()).toContain('Condição');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Quantidade');
    expect(wrapper.text()).toContain('Custo Unit.');
    expect(wrapper.text()).toContain('Previsão');
    expect(wrapper.text()).toContain('Observação');
    expect(wrapper.text()).toContain('Preparar Pedido');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).toContain('Gaze Esteril');
    expect(wrapper.text()).toContain('PharmaVet');
    expect(wrapper.text()).toContain('VetSurgical');
    expect(wrapper.text()).toContain('Sugerida');
    expect(wrapper.text()).toContain('Cotação urgente');
    expect(wrapper.text()).toContain('Abrir');
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.listLots).toHaveBeenCalledOnce();
    expect(inventoryService.listPurchases).toHaveBeenCalledOnce();
  });

  it('renders persisted purchase lines from the purchase queue', async () => {
    vi.mocked(inventoryService.listPurchases).mockResolvedValue([persistedPurchase]);

    const wrapper = mount(InventoryPurchasesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Distribuidora Persistida');
    expect(wrapper.text()).toContain('Rascunho');
    expect(wrapper.text()).toContain('2 ampola');
    expect(wrapper.text()).toContain('—');
    expect(inventoryService.listPurchases).toHaveBeenCalledOnce();
  });

  it('clears all derived rows and surfaces the persisted queue error', async () => {
    vi.mocked(inventoryService.listPurchases).mockRejectedValueOnce(
      new Error('Falha ao carregar fila persistida')
    );

    const wrapper = mount(InventoryPurchasesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Falha ao carregar fila persistida');
    expect(wrapper.text()).not.toContain('Dipirona Injetavel');
    expect(wrapper.text()).not.toContain('Gaze Esteril');
  });

  it('uses the persisted outstanding amount for partially received purchases', async () => {
    vi.mocked(inventoryService.list).mockResolvedValue([]);
    vi.mocked(inventoryService.listLots).mockResolvedValue([]);
    vi.mocked(inventoryService.listPurchases).mockResolvedValue([partiallyReceivedPurchase]);

    const wrapper = mount(InventoryPurchasesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Distribuidora Parcial');
    expect(wrapper.text()).toContain('Recebimento parcial');
    expect(wrapper.text().replace(/\u00a0/g, ' ')).toContain('R$ 6,00 em aberto');
  });

  it('prepares a purchase order locally without mutating inventory APIs', async () => {
    const wrapper = mount(InventoryPurchasesPage);
    await flushPromises();

    await wrapper.get('[data-testid="purchase-product"]').setValue('item-low');
    await wrapper.get('[data-testid="purchase-supplier"]').setValue('Fornecedor CVG');
    await wrapper.get('[data-testid="purchase-quantity"]').setValue(6);
    await wrapper.get('[data-testid="purchase-cost"]').setValue(11.5);
    await wrapper.find('form[aria-label="Preparar compra de estoque"]').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Dipirona Injetavel preparado para compra com Fornecedor CVG');
    expect(wrapper.text()).toContain('Pedido');
    expect(wrapper.text()).toContain('Fornecedor CVG');
    expect(inventoryService.list).toHaveBeenCalledTimes(1);
    expect(inventoryService.listLots).toHaveBeenCalledTimes(1);
    expect(inventoryService.listPurchases).toHaveBeenCalledTimes(1);
  });

  it('blocks purchase preparation without a selected product', async () => {
    const wrapper = mount(InventoryPurchasesPage);
    await flushPromises();

    await wrapper.find('form[aria-label="Preparar compra de estoque"]').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Selecione um produto para preparar a compra');
  });

  it('sends product or code search to the inventory list endpoint when filtering', async () => {
    const wrapper = mount(InventoryPurchasesPage);
    await flushPromises();

    const productInput = wrapper.findAll('.filter-panel input')[1];
    await productInput.setValue('Gaze');
    await wrapper.find('.filter-panel form').trigger('submit');
    await flushPromises();

    expect(inventoryService.list).toHaveBeenLastCalledWith('Gaze');
    expect(inventoryService.listLots).toHaveBeenCalledTimes(2);
    expect(inventoryService.listPurchases).toHaveBeenCalledTimes(2);
  });
});
