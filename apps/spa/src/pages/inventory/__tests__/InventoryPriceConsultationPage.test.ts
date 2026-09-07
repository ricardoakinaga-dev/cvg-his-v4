import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InventoryPriceConsultationPage from '../InventoryPriceConsultationPage.vue';
import { inventoryService } from '@/services/inventory';
import { productsService } from '@/services/products';

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

const product = {
  id: 'prod-1',
  accountId: 'acc-1',
  name: 'Ração Renal',
  code: 'PROD-001',
  description: 'Alimento terapeutico',
  basePrice: 129.9,
  active: true,
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z'
};

const inventoryItem = {
  id: 'inv-1',
  accountId: 'acc-1',
  sku: 'MED-001',
  name: 'Dipirona Injetavel',
  unit: 'ampola',
  onHandQuantity: 2,
  reorderLevel: 5,
  unitCostAmount: 12.5,
  createdAt: '2026-04-26T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z'
};

describe('InventoryPriceConsultationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productsService.list).mockResolvedValue([product]);
    vi.mocked(inventoryService.list).mockResolvedValue([inventoryItem]);
  });

  it('renders Vetus-like price consultation with products and stock data', async () => {
    const wrapper = mount(InventoryPriceConsultationPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Consulta de Preços');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Origem');
    expect(wrapper.text()).toContain('Preço');
    expect(wrapper.text()).toContain('Custo');
    expect(wrapper.text()).toContain('Margem');
    expect(wrapper.text()).toContain('Saldo');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Ração Renal');
    expect(wrapper.text()).toContain('Dipirona Injetavel');
    expect(wrapper.text()).toContain('Abaixo do ponto');
    expect(wrapper.text()).toContain('Abrir');
    expect(productsService.list).toHaveBeenCalledWith(undefined);
    expect(inventoryService.list).toHaveBeenCalledWith(undefined);
  });

  it('filters both complete source lists consistently with the displayed codes and names', async () => {
    const wrapper = mount(InventoryPriceConsultationPage);
    await flushPromises();

    const searchInputs = wrapper.findAll('input[type="search"]');
    await searchInputs[0].setValue('MED');
    await searchInputs[1].setValue('Dipirona');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(productsService.list).toHaveBeenLastCalledWith(undefined);
    expect(inventoryService.list).toHaveBeenLastCalledWith(undefined);
  });
  it('shows only recorded monetary values and excludes unknown stock from availability', async () => {
    const wrapper = mount(InventoryPriceConsultationPage);
    await flushPromises();
    const tableRows = wrapper.findAll('tbody tr');
    const productRow = tableRows.find(row => row.text().includes('Ração Renal'))!;
    const stockRow = tableRows.find(row => row.text().includes('Dipirona'))!;
    expect(productRow.findAll('td')[3].text()).toContain('129,90');
    expect(productRow.findAll('td')[4].text()).toBe('—');
    expect(productRow.findAll('td')[5].text()).toBe('—');
    expect(stockRow.findAll('td')[3].text()).toBe('—');
    expect(stockRow.findAll('td')[4].text()).toContain('12,50');
    expect(stockRow.findAll('td')[5].text()).toBe('—');
    expect(wrapper.findAll('dd').map(x => x.text())).toEqual(['2', '1', '1', '—']);
  });

  it('keeps summaries tied to applied filters and includes genuine zero prices', async () => {
    vi.mocked(productsService.list).mockResolvedValue([{ ...product, basePrice: 0 }]);
    const wrapper = mount(InventoryPriceConsultationPage);
    await flushPromises();
    const productRow = wrapper.findAll('tbody tr').find(row => row.text().includes('Ração Renal'))!;
    expect(productRow.findAll('td')[3].text()).toContain('0,00');
    await wrapper.find('select').setValue('product');
    expect(wrapper.findAll('dd')[0].text()).toBe('2');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.findAll('dd').map(x => x.text())).toEqual(['1', '0', '0', '—']);
  });

  it('keeps failure distinct from empty after dismissal and retries both sources', async () => {
    vi.mocked(inventoryService.list).mockRejectedValueOnce(new Error('Saldo indisponível'));
    const wrapper = mount(InventoryPriceConsultationPage, { global: { stubs: { DsAlert: false } } });
    expect(wrapper.findAll('dd').every(x => x.text() === '—')).toBe(true);
    await flushPromises();
    expect(wrapper.text()).toContain('Consulta indisponível');
    expect(wrapper.text()).not.toContain('Nenhum registro encontrado');
    await wrapper.find('button[aria-label="Fechar alerta"]').trigger('click');
    expect(wrapper.text()).toContain('Consulta indisponível');
    expect(wrapper.findAll('dd').every(x => x.text() === '—')).toBe(true);
    await wrapper.findAll('button').find(x => x.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Consulta indisponível');
    expect(wrapper.text()).toContain('Ração Renal');
    expect(wrapper.text()).toContain('Dipirona');
  });

  it('clears an unmatched query and restores the unfiltered consultation', async () => {
    const wrapper = mount(InventoryPriceConsultationPage);
    await flushPromises();
    await wrapper.findAll('input[type="search"]')[0].setValue('no-match');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Tente outro código, nome ou origem.');
    expect(wrapper.findAll('dd').map(x => x.text())).toEqual(['0', '0', '0', '—']);
    await wrapper.findAll('button').find(x => x.text() === 'Limpar filtros')!.trigger('click');
    await flushPromises();
    expect(wrapper.findAll('dd')[0].text()).toBe('2');
    expect(productsService.list).toHaveBeenLastCalledWith(undefined);
  });

  it('ignores an older response after a newer query has completed', async () => {
    let resolveOlder!: (value: typeof product[]) => void;
    vi.mocked(productsService.list).mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }));
    const wrapper = mount(InventoryPriceConsultationPage);
    await wrapper.findAll('input[type="search"]')[1].setValue('Dipirona');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Dipirona');
    expect(wrapper.text()).not.toContain('Ração Renal');
    resolveOlder([product]);
    await flushPromises();
    expect(wrapper.text()).toContain('Dipirona');
    expect(wrapper.text()).not.toContain('Ração Renal');
  });

  it('matches accentless names and displayed fallback IDs without server search dropping them', async () => {
    vi.mocked(productsService.list).mockImplementation(async query => query ? [] : [{ ...product, code: null }]);
    const wrapper = mount(InventoryPriceConsultationPage);
    await flushPromises();
    const inputs = wrapper.findAll('input[type="search"]');
    await inputs[1].setValue('Racao');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('tbody').text()).toContain('Ração Renal');
    await inputs[1].setValue('');
    await inputs[0].setValue(product.id);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('tbody').text()).toContain('Ração Renal');
    expect(wrapper.findAll('dd')[0].text()).toBe('1');
  });

});
