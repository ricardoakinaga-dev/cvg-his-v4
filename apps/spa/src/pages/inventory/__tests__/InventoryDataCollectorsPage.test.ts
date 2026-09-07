import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import InventoryDataCollectorsPage from '../InventoryDataCollectorsPage.vue';
import { inventoryService } from '@/services/inventory';
import type { InventoryItemSummary, InventoryLotSummary } from '@/types/inventory';

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
    expect(wrapper.text()).toContain('Preparar coleta');
    expect(wrapper.text()).toContain('Coletor');
    expect(wrapper.text()).toContain('Operação');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Código de Barras');
    expect(wrapper.text()).toContain('Lote');
    expect(wrapper.text()).toContain('Quantidade Coletada');
    expect(wrapper.text()).toContain('Responsável');
    expect(wrapper.text()).toContain('Observação');
    expect(wrapper.text()).toContain('Preparar rascunho');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Ração Renal');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('Atenção');
    expect(wrapper.text()).toContain('Pendente');
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.listLots).toHaveBeenCalled();
  });

  it('prepares a temporary collection draft retaining notes without inventory mutations', async () => {
    const wrapper = mount(InventoryDataCollectorsPage);
    await flushPromises();

    const stockBefore = JSON.stringify(inventoryItems[1]);
    const lotsBefore = JSON.stringify(inventoryLots);
    await wrapper.get('[data-testid="collector-product"]').setValue('inv-low');
    await wrapper.get('[data-testid="collector-quantity"]').setValue(1);
    await wrapper.get('[data-testid="collector-responsible"]').setValue('Operador Estoque');
    await wrapper.get('[data-testid="collector-notes"]').setValue('Conferir com responsável antes de continuar');
    await wrapper.find('form[aria-label="Preparar rascunho de coleta"]').trigger('submit');
    await flushPromises();

    const detail = wrapper.get('[data-testid="temporary-draft-detail"]');
    expect(detail.text()).toContain('Rascunho temporário');
    expect(detail.text()).toContain('Conferir com responsável antes de continuar');
    expect(detail.text()).toContain('Será perdido ao sair ou recarregar. Estoque não alterado.');
    expect((wrapper.get('[data-testid="collector-notes"]').element as HTMLInputElement).value).toBe('');
    expect(JSON.stringify(inventoryItems[1])).toBe(stockBefore);
    expect(JSON.stringify(inventoryLots)).toBe(lotsBefore);
    expect(inventoryService.createPurchase).not.toHaveBeenCalled();
    expect(inventoryService.approvePurchase).not.toHaveBeenCalled();
    expect(inventoryService.receivePurchase).not.toHaveBeenCalled();
    expect(inventoryService.createStockAdjustment).not.toHaveBeenCalled();
    expect(inventoryService.update).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Rascunho temporário de coleta: Vacina V10 pelo Coletor 01');
    expect(wrapper.text()).toContain('Divergência');
    expect(wrapper.text()).toContain('Operador Estoque');
    wrapper.unmount();
    const remounted = mount(InventoryDataCollectorsPage);
    await flushPromises();
    expect(remounted.find('[data-testid="temporary-draft-detail"]').exists()).toBe(false);
    expect(remounted.text()).not.toContain('Conferir com responsável antes de continuar');
    remounted.unmount();
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

  it('starts with unknown remote totals and blocks preparation until both reads complete', async () => {
    let resolveItems!: (items: InventoryItemSummary[]) => void;
    let resolveLots!: (lots: InventoryLotSummary[]) => void;
    vi.mocked(inventoryService.list).mockReturnValueOnce(new Promise(resolve => { resolveItems = resolve; }));
    vi.mocked(inventoryService.listLots).mockReturnValueOnce(new Promise(resolve => { resolveLots = resolve; }));
    const wrapper = mount(InventoryDataCollectorsPage);
    expect(wrapper.get('.collector-summary').text()).toContain('—');
    expect(wrapper.text()).not.toContain('Nenhuma coleta encontrada');
    expect(wrapper.get('.preparation-panel').attributes('open')).toBeUndefined();
    expect(wrapper.get('.filter-panel').attributes('open')).toBeUndefined();
    resolveItems(inventoryItems);
    await flushPromises();
    expect(wrapper.findAll('[data-testid="collector-product"] option')).toHaveLength(1);
    await wrapper.get('form[aria-label="Preparar rascunho de coleta"]').trigger('submit');
    expect(wrapper.find('[data-testid="temporary-draft-detail"]').exists()).toBe(false);
    resolveLots(inventoryLots);
    await flushPromises();
    expect(wrapper.get('.collector-summary').text()).not.toContain('—');
    expect(wrapper.text()).toContain('Vacina V10');
    wrapper.unmount();
  });

  it('opens preparation with focus and retains input across disclosure changes', async () => {
    const wrapper = mount(InventoryDataCollectorsPage, { attachTo: document.body });
    await flushPromises();
    await wrapper.get('[data-testid="collector-notes"]').setValue('Manter esta nota');
    await wrapper.findAll('button').find(button => button.text() === 'Novo rascunho')!.trigger('click');
    expect((wrapper.get('.preparation-panel').element as HTMLDetailsElement).open).toBe(true);
    expect(document.activeElement).toBe(wrapper.get('[data-testid="collector-device"]').element);
    (wrapper.get('.preparation-panel').element as HTMLDetailsElement).open = false;
    await wrapper.findAll('button').find(button => button.text() === 'Novo rascunho')!.trigger('click');
    expect((wrapper.get('[data-testid="collector-notes"]').element as HTMLInputElement).value).toBe('Manter esta nota');
    wrapper.unmount();
  });

  it('keeps drafts and unfinished notes through failure, alert dismissal and retry', async () => {
    const wrapper = mount(InventoryDataCollectorsPage);
    await flushPromises();
    await wrapper.get('[data-testid="collector-product"]').setValue('inv-low');
    await wrapper.get('[data-testid="collector-notes"]').setValue('Nota do rascunho');
    await wrapper.get('form[aria-label="Preparar rascunho de coleta"]').trigger('submit');
    await wrapper.get('[data-testid="collector-notes"]').setValue('Nota em edição');
    vi.mocked(inventoryService.listLots).mockRejectedValueOnce(new Error('Lotes indisponíveis'));
    await wrapper.findAll('button').find(button => button.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="temporary-draft-detail"]').text()).toContain('Nota do rascunho');
    expect(wrapper.get('.collector-summary').text()).toContain('—');
    const draftRow = wrapper.findAll('tbody tr').find(row => row.find('[data-testid="temporary-draft-detail"]').exists())!;
    expect(draftRow.findAll('td')[6].text()).toBe('—');
    expect(draftRow.findAll('td')[7].text()).toBe('—');
    expect(wrapper.findAll('.collector-summary dd')[2].text()).toBe('1');
    const alert = wrapper.findAllComponents(DsAlert).find(component => component.text().includes('Lotes indisponíveis'))!;
    alert.vm.$emit('dismiss');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Lotes indisponíveis');
    expect(wrapper.text()).toContain('Dados de estoque indisponíveis');
    await wrapper.get('[data-testid="collector-product"]').setValue('inv-low');
    await wrapper.get('form[aria-label="Preparar rascunho de coleta"]').trigger('submit');
    expect(wrapper.findAll('[data-testid="temporary-draft-detail"]')).toHaveLength(1);
    await wrapper.findAll('button').find(button => button.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Dados de estoque indisponíveis');
    expect(wrapper.get('[data-testid="temporary-draft-detail"]').text()).toContain('Nota do rascunho');
    expect((wrapper.get('[data-testid="collector-notes"]').element as HTMLInputElement).value).toBe('Nota em edição');
    wrapper.unmount();
  });

  it('allows retry after an initial failure without displaying a false empty state', async () => {
    vi.mocked(inventoryService.list).mockRejectedValueOnce(new Error('Falha inicial'));
    const wrapper = mount(InventoryDataCollectorsPage);
    await flushPromises();
    expect(wrapper.text()).not.toContain('Nenhuma coleta encontrada');
    expect(wrapper.get('.collector-summary').text()).toContain('—');
    await wrapper.findAll('button').find(button => button.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.get('.collector-summary').text()).not.toContain('—');
    wrapper.unmount();
  });

  it('keeps the latest query result when an older request fails late', async () => {
    const wrapper = mount(InventoryDataCollectorsPage);
    await flushPromises();
    let rejectOld!: (error: Error) => void;
    vi.mocked(inventoryService.list).mockReturnValueOnce(new Promise((_resolve, reject) => { rejectOld = reject; }));
    const product = wrapper.findAll('.filter-panel input[type="search"]')[1];
    await product.setValue('Antigo');
    await wrapper.get('.filters').trigger('submit');
    await product.setValue('Vacina');
    vi.mocked(inventoryService.list).mockResolvedValueOnce([inventoryItems[1]]);
    await wrapper.get('.filters').trigger('submit');
    await flushPromises();
    rejectOld(new Error('Falha antiga'));
    await flushPromises();
    expect(wrapper.text()).not.toContain('Falha antiga');
    expect(wrapper.text()).not.toContain('Dados de estoque indisponíveis');
    expect(wrapper.findAll('[data-testid="collector-product"] option')).toHaveLength(2);
    await product.setValue('Ainda não aplicado');
    await wrapper.findAll('button').find(button => button.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    expect(inventoryService.list).toHaveBeenLastCalledWith('Vacina');
    wrapper.unmount();
  });

  it('ignores an older successful load without clearing the active loading state', async () => {
    let resolveOld!: (items: InventoryItemSummary[]) => void;
    let resolveLatest!: (items: InventoryItemSummary[]) => void;
    vi.mocked(inventoryService.list).mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const wrapper = mount(InventoryDataCollectorsPage);
    vi.mocked(inventoryService.list).mockReturnValueOnce(new Promise(resolve => { resolveLatest = resolve; }));
    await wrapper.get('.filters').trigger('submit');
    resolveOld(inventoryItems);
    await flushPromises();
    expect(wrapper.text()).toContain('Carregando produtos e lotes');
    expect(wrapper.get('.collector-summary').text()).toContain('—');
    expect(wrapper.findAll('[data-testid="collector-product"] option')).toHaveLength(1);
    resolveLatest([inventoryItems[1]]);
    await flushPromises();
    expect(wrapper.findAll('[data-testid="collector-product"] option')).toHaveLength(2);
    expect(wrapper.get('[data-testid="collector-product"]').text()).not.toContain('Ração Renal');
    wrapper.unmount();
  });

  it('blocks collection without a selected product', async () => {
    const wrapper = mount(InventoryDataCollectorsPage);
    await flushPromises();

    await wrapper.find('form[aria-label="Preparar rascunho de coleta"]').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Selecione um produto para preparar o rascunho de coleta');
  });
});
