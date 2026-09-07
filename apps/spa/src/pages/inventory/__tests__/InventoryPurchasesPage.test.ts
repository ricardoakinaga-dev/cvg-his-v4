import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryPurchasesPage from '../InventoryPurchasesPage.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    createPurchase: vi.fn(),
    approvePurchase: vi.fn(),
    receivePurchase: vi.fn(),
    createStockAdjustment: vi.fn(),
    update: vi.fn(),
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
    expect(wrapper.text()).toContain('Preparar rascunho');
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
    expect(wrapper.text().replace(/\u00a0/g, ' ')).toContain('R$ 6,00');
  });

  it('prepares a temporary purchase draft retaining notes without inventory mutations', async () => {
    const wrapper = mount(InventoryPurchasesPage);
    await flushPromises();

    const stockBefore = JSON.stringify(lowStockItem);
    const lotsBefore = JSON.stringify(activeLot);
    await wrapper.get('[data-testid="purchase-product"]').setValue('item-low');
    await wrapper.get('[data-testid="purchase-supplier"]').setValue('Fornecedor CVG');
    await wrapper.get('[data-testid="purchase-quantity"]').setValue(6);
    await wrapper.get('[data-testid="purchase-cost"]').setValue(11.5);
    await wrapper.get('[data-testid="purchase-notes"]').setValue('Conferir com responsável antes de continuar');
    await wrapper.find('form[aria-label="Preparar compra de estoque"]').trigger('submit');
    await flushPromises();

    const detail = wrapper.get('[data-testid="temporary-draft-detail"]');
    expect(detail.text()).toContain('Rascunho temporário');
    expect(detail.text()).toContain('Conferir com responsável antes de continuar');
    expect(detail.text()).toContain('Será perdido ao sair ou recarregar. Estoque não alterado.');
    expect((wrapper.get('[data-testid="purchase-notes"]').element as HTMLInputElement).value).toBe('');
    expect(JSON.stringify(lowStockItem)).toBe(stockBefore);
    expect(JSON.stringify(activeLot)).toBe(lotsBefore);
    expect(inventoryService.createPurchase).not.toHaveBeenCalled();
    expect(inventoryService.approvePurchase).not.toHaveBeenCalled();
    expect(inventoryService.receivePurchase).not.toHaveBeenCalled();
    expect(inventoryService.createStockAdjustment).not.toHaveBeenCalled();
    expect(inventoryService.update).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Rascunho temporário de compra: Dipirona Injetavel com Fornecedor CVG');
    expect(wrapper.text()).toContain('Rascunho temporário');
    expect(wrapper.text()).toContain('Fornecedor CVG');
    expect(wrapper.find('.purchase-summary').text().replace(/\u00a0/g, ' ')).toContain('R$ 0,00');
    expect(inventoryService.list).toHaveBeenCalledTimes(1);
    expect(inventoryService.listLots).toHaveBeenCalledTimes(1);
    expect(inventoryService.listPurchases).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    const remounted = mount(InventoryPurchasesPage);
    await flushPromises();
    expect(remounted.find('[data-testid="temporary-draft-detail"]').exists()).toBe(false);
    expect(remounted.text()).not.toContain('Conferir com responsável antes de continuar');
    remounted.unmount();
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('purchase loading and recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryService.list).mockResolvedValue([lowStockItem]);
    vi.mocked(inventoryService.listLots).mockResolvedValue([activeLot]);
    vi.mocked(inventoryService.listPurchases).mockResolvedValue([]);
  });

  it('opens preparation from the contextual action, focuses supplier and retains inputs on close', async () => {
    const wrapper = mount(InventoryPurchasesPage, { attachTo: document.body });
    await flushPromises();
    const panel = wrapper.get('.preparation-panel').element as HTMLDetailsElement;
    expect(panel.open).toBe(false);
    expect((wrapper.get('.filter-panel').element as HTMLDetailsElement).open).toBe(false);
    await wrapper.findAll('button').find(button => button.text() === 'Novo rascunho')!.trigger('click');
    expect(panel.open).toBe(true);
    expect(document.activeElement).toBe(wrapper.get('[data-testid="purchase-supplier"]').element);
    await wrapper.get('[data-testid="purchase-notes"]').setValue('Manter esta observação');
    panel.open = false;
    await wrapper.findAll('button').find(button => button.text() === 'Novo rascunho')!.trigger('click');
    expect((wrapper.get('[data-testid="purchase-notes"]').element as HTMLInputElement).value).toBe('Manter esta observação');
    wrapper.unmount();
  });

  it('starts with unknown remote totals and commits the complete snapshot atomically', async () => {
    const pending = deferred<typeof persistedPurchase[]>();
    vi.mocked(inventoryService.listPurchases).mockReturnValueOnce(pending.promise);
    const wrapper = mount(InventoryPurchasesPage);
    expect(wrapper.text()).toContain('Carregando compras');
    expect(wrapper.text()).not.toContain('Nenhuma compra encontrada');
    await flushPromises();
    expect(wrapper.get('.purchase-summary').findAll('dd').map(cell => cell.text())).toEqual(['—', '—', '—', '—', '0']);
    expect(wrapper.find('[data-testid="purchase-product"]').text()).not.toContain('Dipirona');
    pending.resolve([persistedPurchase]);
    await flushPromises();
    expect(wrapper.text()).toContain('Distribuidora Persistida');
    expect(wrapper.get('.purchase-summary').findAll('dd')[0].text()).toBe('1');
  });

  it('preserves notes and local drafts after failed refresh and retries after alert dismissal', async () => {
    const wrapper = mount(InventoryPurchasesPage);
    await flushPromises();
    await wrapper.get('[data-testid="purchase-product"]').setValue('item-low');
    await wrapper.get('[data-testid="purchase-notes"]').setValue('Nota do rascunho');
    await wrapper.get('.purchase-panel').trigger('submit');
    await wrapper.get('[data-testid="purchase-product"]').setValue('item-low');
    await wrapper.get('[data-testid="purchase-notes"]').setValue('Próxima preparação');
    const pending = deferred<typeof lowStockItem[]>();
    vi.mocked(inventoryService.list).mockReturnValueOnce(pending.promise);
    await wrapper.findAll('button').find(button => button.text() === 'Atualizar')!.trigger('click');
    await wrapper.get('.purchase-panel').trigger('submit');
    expect(wrapper.findAll('[data-testid="temporary-draft-detail"]')).toHaveLength(1);
    pending.reject(new Error('Falha remota'));
    await flushPromises();
    expect(wrapper.text()).toContain('Dados de compras indisponíveis');
    expect(wrapper.text()).toContain('Nota do rascunho');
    expect(wrapper.text()).not.toContain('Nenhuma compra encontrada');
    expect(wrapper.get('.purchase-summary').findAll('dd').map(cell => cell.text())).toEqual(['—', '—', '—', '—', '1']);
    wrapper.findComponent(DsAlert).vm.$emit('dismiss');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Falha remota');
    await wrapper.get('.purchase-panel').trigger('submit');
    expect(wrapper.findAll('[data-testid="temporary-draft-detail"]')).toHaveLength(1);
    await wrapper.findAll('button').find(button => button.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Dados de compras indisponíveis');
    expect(wrapper.text()).toContain('Nota do rascunho');
    expect((wrapper.get('[data-testid="purchase-notes"]').element as HTMLInputElement).value).toBe('Próxima preparação');
  });

  it.each(['resolve', 'reject'] as const)('ignores a stale request that later %ss and refreshes the applied query', async (outcome) => {
    const old = deferred<typeof lowStockItem[]>();
    vi.mocked(inventoryService.list).mockReturnValueOnce(old.promise);
    const wrapper = mount(InventoryPurchasesPage);
    const product = wrapper.findAll('.filter-panel input')[1];
    await product.setValue('Dipirona');
    await wrapper.get('.filter-panel form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    if (outcome === 'resolve') old.resolve([normalItem]);
    else old.reject(new Error('Erro antigo'));
    await flushPromises();
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).not.toContain('Erro antigo');
    await product.setValue('Gaze');
    await wrapper.findAll('button').find(button => button.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    expect(inventoryService.list).toHaveBeenLastCalledWith('Dipirona');
  });
});
