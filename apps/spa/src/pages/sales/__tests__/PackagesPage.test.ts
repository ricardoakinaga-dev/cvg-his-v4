import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuoteList = vi.fn();
const mockQuoteGet = vi.fn();

vi.mock('@/services/quotes', () => ({
  quoteService: {
    list: (...args: unknown[]) => mockQuoteList(...args),
    get: (...args: unknown[]) => mockQuoteGet(...args)
  }
}));

const quoteSummary = {
  id: 'qt-1',
  accountId: 'acc-1',
  number: 'PKG-0001',
  ownerId: 'owner-1',
  status: 'approved',
  validUntil: '2026-07-31',
  subtotal: 180,
  discountAmount: 0,
  total: 180,
  notes: 'Contrato preventivo com vacinas seriadas e pagamento no nível do pacote.',
  createdByUserId: 'user-1',
  convertedToSaleId: null,
  convertedAt: null,
  createdAt: '2026-06-14T10:00:00Z',
  updatedAt: '2026-06-14T10:00:00Z'
};

const quoteDetail = {
  ...quoteSummary,
  items: [
    {
      id: 'qi-1',
      quoteId: 'qt-1',
      accountId: 'acc-1',
      itemType: 'service',
      catalogItemId: 'svc-1',
      nameSnapshot: 'VACINA V4 FELINA',
      codeSnapshot: 'VAC-V4',
      unitPrice: 60,
      quantity: 2,
      discountAmount: 0,
      lineTotal: 120,
      notes: null,
      createdAt: '2026-06-14T10:01:00Z',
      updatedAt: '2026-06-14T10:01:00Z'
    },
    {
      id: 'qi-2',
      quoteId: 'qt-1',
      accountId: 'acc-1',
      itemType: 'service',
      catalogItemId: 'svc-2',
      nameSnapshot: 'VACINA ANTI-RÁBICA',
      codeSnapshot: 'VAC-RAB',
      unitPrice: 60,
      quantity: 1,
      discountAmount: 0,
      lineTotal: 60,
      notes: null,
      createdAt: '2026-06-14T10:02:00Z',
      updatedAt: '2026-06-14T10:02:00Z'
    }
  ]
};

describe('PackagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuoteList.mockResolvedValue([quoteSummary]);
    mockQuoteGet.mockResolvedValue(quoteDetail);
  });

  it('renders the Vetus package cockpit backed by persisted quotes', async () => {
    const PackagesPage = (await import('../PackagesPage.vue')).default;
    const wrapper = mount(PackagesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Pacotes');
    expect(wrapper.text()).toContain('Atendimento > Atendimentos > Pacotes');
    expect(wrapper.text()).toContain('Contrato de consumo futuro');
    expect(wrapper.text()).toContain('Incluir Novo Pacote');
    expect(wrapper.text()).toContain('Filtrar');
    expect(wrapper.text()).toContain('Cliente e animal');
    expect(wrapper.text()).toContain('Cliente:');
    expect(wrapper.text()).toContain('Animal:');
    expect(wrapper.text()).toContain('Pagar pacote');
    expect(wrapper.text()).toContain('Ver serviços');
    expect(wrapper.text()).toContain('Observações gerais sobre o pacote');
    expect(wrapper.text()).toContain('VACINA V4 FELINA');
    expect(wrapper.text()).toContain('Agenda consome sessões');
    expect(wrapper.text()).toContain('Comanda materializa consumo');
    expect(wrapper.text()).toContain('Financeiro recebe pacote');
    expect(wrapper.text()).toContain('Excluir');
    expect(wrapper.text()).toContain('Imprimir');
    expect(wrapper.text()).toContain('Pagar Pacote');
    expect(wrapper.text()).toContain('Cancelar');
    expect(wrapper.text()).toContain('Salvar');
    expect(wrapper.text()).toContain('Cliente owner-1');
    expect(wrapper.find('a[href="/counter-sales?ownerId=owner-1"]').exists()).toBe(true);
    expect(mockQuoteList).toHaveBeenCalledWith();
    expect(mockQuoteGet).toHaveBeenCalledWith('qt-1');
  });

  it('filters packages by customer or package number and opens the matching detail', async () => {
    const PackagesPage = (await import('../PackagesPage.vue')).default;
    const wrapper = mount(PackagesPage);
    await flushPromises();

    const search = wrapper.find('input[type="search"]');
    await search.setValue('PKG-0001');

    expect(wrapper.text()).toContain('Cliente owner-1');
    expect(wrapper.text()).toContain('VACINA V4 FELINA');

    const detailButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Ver detalhes'));
    expect(detailButton).toBeTruthy();
    await detailButton!.trigger('click');

    expect(wrapper.text()).toContain('Editar Pacote');
    expect(wrapper.text()).toContain('Pacote PKG-0001 selecionado');
  });

  it('shows an API error state instead of falling back to local package data', async () => {
    mockQuoteList.mockRejectedValue(new Error('API indisponível'));

    const PackagesPage = (await import('../PackagesPage.vue')).default;
    const wrapper = mount(PackagesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Não foi possível carregar os pacotes: API indisponível');
    expect(wrapper.text()).not.toContain('Ariane Ferreira Costa');
    expect(wrapper.text()).not.toContain('ABOBORA');
  });
});
