import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryTransfersPage from '../InventoryTransfersPage.vue';
import { inventoryService } from '@/services/inventory';

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    createPurchase: vi.fn(),
    approvePurchase: vi.fn(),
    receivePurchase: vi.fn(),
    createStockAdjustment: vi.fn(),
    update: vi.fn(),
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

  it('prepares a temporary transfer draft retaining notes without inventory mutations', async () => {
    const wrapper = mount(InventoryTransfersPage);
    await flushPromises();

    const stockBefore = JSON.stringify(lowStockItem);
    const lotsBefore = JSON.stringify(activeLot);
    await wrapper.get('[data-testid="transfer-product"]').setValue('item-low');
    await wrapper.get('[data-testid="transfer-destination"]').setValue('Estoque principal');
    await wrapper.get('[data-testid="transfer-quantity"]').setValue(2);
    await wrapper.get('[data-testid="transfer-responsible"]').setValue('Paula Estoque');
    await wrapper.get('[data-testid="transfer-notes"]').setValue('Conferir com responsável antes de continuar');
    await wrapper.find('form[aria-label="Preparar transferência entre estoques"]').trigger('submit');
    await flushPromises();

    const detail = wrapper.get('[data-testid="temporary-draft-detail"]');
    expect(detail.text()).toContain('Rascunho temporário');
    expect(detail.text()).toContain('Conferir com responsável antes de continuar');
    expect(detail.text()).toContain('Será perdido ao sair ou recarregar. Estoque não alterado.');
    expect((wrapper.get('[data-testid="transfer-notes"]').element as HTMLInputElement).value).toBe('');
    expect(JSON.stringify(lowStockItem)).toBe(stockBefore);
    expect(JSON.stringify(activeLot)).toBe(lotsBefore);
    expect(inventoryService.createPurchase).not.toHaveBeenCalled();
    expect(inventoryService.approvePurchase).not.toHaveBeenCalled();
    expect(inventoryService.receivePurchase).not.toHaveBeenCalled();
    expect(inventoryService.createStockAdjustment).not.toHaveBeenCalled();
    expect(inventoryService.update).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Rascunho temporário de transferência: Dipirona Injetavel');
    expect(wrapper.text()).toContain('Rascunho temporário');
    expect(wrapper.text()).toContain('Paula Estoque');
    wrapper.unmount();
    const remounted = mount(InventoryTransfersPage);
    await flushPromises();
    expect(remounted.find('[data-testid="temporary-draft-detail"]').exists()).toBe(false);
    expect(remounted.text()).not.toContain('Conferir com responsável antes de continuar');
    remounted.unmount();
  });

  it('labels static locations as options even without loaded lots', async () => {
    vi.mocked(inventoryService.listLots).mockResolvedValue([]);
    const wrapper = mount(InventoryTransfersPage);
    await flushPromises();

    expect(wrapper.findAll('.routine-summary dt')[1].text()).toBe('Opções de local');
    expect(wrapper.findAll('.routine-summary dd')[1].text()).toBe('6');
    expect(wrapper.text()).toContain('incluem sugestões de locais');
    expect(wrapper.text()).not.toContain('6 local(is)');
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
  it('opens preparation from the primary action and focuses the first field', async () => {
    const wrapper = mount(InventoryTransfersPage, { attachTo: document.body });
    await flushPromises();
    expect((wrapper.get('.preparation-panel').element as HTMLDetailsElement).open).toBe(false);
    await wrapper.findAll('button').find(b => b.text() === 'Novo rascunho')!.trigger('click');
    await flushPromises();
    expect((wrapper.get('.preparation-panel').element as HTMLDetailsElement).open).toBe(true);
    expect(document.activeElement).toBe(wrapper.get('[data-testid="transfer-origin"]').element);
    wrapper.unmount();
  });

  it('retains local draft notes through failed refresh and dismissed error, then retries', async () => {
    const wrapper = mount(InventoryTransfersPage, { global: { stubs: { DsAlert: false } } });
    expect(wrapper.findAll('.routine-summary dd').slice(0, 3).every(d => d.text() === '—')).toBe(true);
    await flushPromises();
    await wrapper.get('[data-testid="transfer-product"]').setValue('item-low');
    await wrapper.get('[data-testid="transfer-destination"]').setValue('Estoque principal');
    await wrapper.get('[data-testid="transfer-notes"]').setValue('Conferir saldo e embalagem');
    await wrapper.find('form[aria-label="Preparar transferência entre estoques"]').trigger('submit');
    await flushPromises();
    vi.mocked(inventoryService.listLots).mockRejectedValueOnce(new Error('Lotes indisponíveis'));
    await wrapper.findAll('button').find(b => b.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    await wrapper.get('button[aria-label="Fechar alerta"]').trigger('click');
    expect(wrapper.text()).toContain('Dados de estoque indisponíveis');
    expect(wrapper.get('[data-testid="temporary-draft-detail"]').text()).toContain('Conferir saldo e embalagem');
    expect(wrapper.findAll('.routine-summary dd').map(d => d.text())).toEqual(['—', '—', '—', '1']);
    const before = wrapper.findAll('[data-testid="temporary-draft-detail"]').length;
    await wrapper.find('form[aria-label="Preparar transferência entre estoques"]').trigger('submit');
    expect(wrapper.findAll('[data-testid="temporary-draft-detail"]')).toHaveLength(before);
    await wrapper.findAll('button').find(b => b.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Dados de estoque indisponíveis');
    expect(wrapper.get('[data-testid="temporary-draft-detail"]').text()).toContain('Conferir saldo e embalagem');
    expect(wrapper.findAll('.routine-summary dd')[0].text()).toBe('2');
  });

  it('rejects an older failed lookup after a newer atomic query completes', async () => {
    let rejectOlder!: (reason: Error) => void;
    vi.mocked(inventoryService.list).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOlder = reject; }));
    const wrapper = mount(InventoryTransfersPage);
    await wrapper.findAll('.filter-panel input')[1].setValue('Gaze');
    await wrapper.find('.filter-panel form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('tbody').text()).toContain('Gaze');
    expect(wrapper.find('tbody').text()).not.toContain('Dipirona');
    rejectOlder(new Error('Resposta antiga'));
    await flushPromises();
    expect(wrapper.text()).not.toContain('Resposta antiga');
    expect(wrapper.find('tbody').text()).toContain('Gaze');
  });

});
