import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, beforeEach, vi } from 'vitest';

const mockCounterSalesList = vi.fn();
const mockCounterSalesGetById = vi.fn();
const mockCounterSalesClose = vi.fn();
const mockCounterSalesCancel = vi.fn();

vi.mock('@/services/counterSales', () => ({
  counterSalesService: {
    list: (...args: unknown[]) => mockCounterSalesList(...args),
    getById: (...args: unknown[]) => mockCounterSalesGetById(...args),
    close: (...args: unknown[]) => mockCounterSalesClose(...args),
    cancel: (...args: unknown[]) => mockCounterSalesCancel(...args)
  }
}));

const saleSummary = {
  id: 'cs-1',
  accountId: 'acc-1',
  number: 'VEN-0001',
  ownerId: 'owner-1',
  status: 'open',
  subtotal: 160,
  discountAmount: 10,
  total: 150,
  paidAmount: 50,
  balanceDue: 100,
  notes: 'Pagamento parcial registrado.',
  openedByUserId: 'user-1',
  closedByUserId: null,
  closedAt: null,
  createdAt: '2026-04-23T12:00:00Z',
  updatedAt: '2026-04-23T12:00:00Z'
};

const saleDetail = {
  ...saleSummary,
  items: [
    {
      id: 'item-1',
      counterSaleId: 'cs-1',
      accountId: 'acc-1',
      itemType: 'product',
      catalogItemId: 'prod-1',
      nameSnapshot: 'Antipulgas 10kg',
      codeSnapshot: 'SKU-123',
      unitPrice: 80,
      quantity: 2,
      discountAmount: 10,
      lineTotal: 150,
      notes: null,
      createdAt: '2026-04-23T12:05:00Z',
      updatedAt: '2026-04-23T12:05:00Z'
    }
  ],
  payments: [
    {
      id: 'pay-1',
      counterSaleId: 'cs-1',
      accountId: 'acc-1',
      method: 'pix',
      amount: 50,
      installments: 1,
      reference: 'PIX-001',
      notes: null,
      createdAt: '2026-04-23T12:10:00Z'
    }
  ]
};

describe('SalesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCounterSalesList.mockResolvedValue([saleSummary]);
    mockCounterSalesGetById.mockResolvedValue(saleDetail);
    mockCounterSalesClose.mockResolvedValue({ ...saleSummary, status: 'closed' });
    mockCounterSalesCancel.mockResolvedValue({ ...saleSummary, status: 'cancelled' });
  });

  it('renders the Vetus sales index backed by the counter-sales API', async () => {
    const SalesPage = (await import('../SalesPage.vue')).default;
    const wrapper = mount(SalesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Vendas');
    expect(wrapper.text()).toContain('Atendimento > Atendimentos > Vendas');
    expect(wrapper.text()).not.toContain('Índice beta');
    expect(wrapper.text()).not.toContain('Beta');
    expect(wrapper.text()).toContain('Vendas abertas');
    expect(wrapper.text()).toContain('Nova Venda');
    expect(wrapper.text()).toContain('Busque por ID, ID no PDV, Nome ou CPF do Cliente');
    expect(wrapper.text()).toContain('Selecionar Tudo');
    expect(wrapper.text()).toContain('Mostrando 1 - 1 pág. de 1 resultados');
    expect(wrapper.text()).toContain('20 resultados por página');
    expect(wrapper.text()).toContain('Produtos Vendidos');
    expect(wrapper.text()).toContain('Observações');
    expect(wrapper.text()).toContain('Pagamentos');
    expect(wrapper.text()).toContain('Detalhes');
    expect(wrapper.text()).toContain('Valor da Venda');
    expect(wrapper.text()).toContain('Desconto');
    expect(wrapper.text()).toContain('Valor descontado');
    expect(wrapper.text()).toContain('Valor Final');
    expect(wrapper.text()).toContain('Valor pago');
    expect(wrapper.text()).toContain('Saldo');
    expect(wrapper.text()).toContain('Incluir Produto');
    expect(wrapper.text()).toContain('Fechar');
    expect(wrapper.text()).toContain('Imprimir');
    expect(wrapper.text()).toContain('Insert: Inserir Produto');
    expect(wrapper.text()).toContain('End: Salvar/Fechar Venda');
    expect(wrapper.text()).toContain('Esc: Fechar Inclusão Itens');
    expect(wrapper.text()).toContain('Antipulgas 10kg');
    expect(wrapper.find('a[href="/counter-sales?ownerId=owner-1"]').exists()).toBe(true);
    expect(mockCounterSalesList).toHaveBeenCalledWith({ status: 'all' });
    expect(mockCounterSalesGetById).toHaveBeenCalledWith('cs-1');
  });

  it('filters sales by customer or sale id and opens the matching sale detail', async () => {
    const SalesPage = (await import('../SalesPage.vue')).default;
    const wrapper = mount(SalesPage);
    await flushPromises();

    await wrapper.find('input[type="search"]').setValue('VEN-0001');

    expect(wrapper.text()).toContain('Cliente owner-1');
    expect(wrapper.text()).toContain('Antipulgas 10kg');

    const detailButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Abrir venda'));
    expect(detailButton).toBeTruthy();
    await detailButton!.trigger('click');

    expect(wrapper.text()).toContain('Venda VEN-0001 selecionada');
    expect(wrapper.text()).toContain('Antipulgas 10kg');
    expect(wrapper.text()).toContain('Forma de Pagamento');
  });

  it('shows an API error state instead of falling back to local mock data', async () => {
    mockCounterSalesList.mockRejectedValue(new Error('API indisponível'));

    const SalesPage = (await import('../SalesPage.vue')).default;
    const wrapper = mount(SalesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Não foi possível carregar as vendas: API indisponível');
    expect(wrapper.text()).not.toContain('Roberto Lima');
    expect(wrapper.text()).not.toContain('Carla Martins');
  });

  it('closes a sale from the transaction sheet and refreshes its status', async () => {
    const closedDetail = {
      ...saleDetail,
      status: 'closed',
      paidAmount: 150,
      balanceDue: 0,
      closedAt: '2026-04-23T12:20:00Z'
    };
    mockCounterSalesGetById
      .mockResolvedValueOnce(saleDetail)
      .mockResolvedValueOnce(closedDetail);

    const SalesPage = (await import('../SalesPage.vue')).default;
    const wrapper = mount(SalesPage);
    await flushPromises();

    const closeButton = wrapper.findAll('button').find((button) => button.text() === 'Fechar');
    expect(closeButton).toBeTruthy();
    await closeButton!.trigger('click');
    await flushPromises();

    expect(mockCounterSalesClose).toHaveBeenCalledWith('cs-1');
    expect(mockCounterSalesGetById).toHaveBeenLastCalledWith('cs-1');
    expect(wrapper.text()).toContain('Venda fechada com sucesso.');
    expect(wrapper.text()).toContain('Fechada');
    expect(wrapper.text()).toMatch(/SaldoR\$\s*0,00/);
  });

  it('shows a business error when closing is rejected by the API', async () => {
    mockCounterSalesClose.mockRejectedValue(new Error('Sale must be fully paid before closing'));

    const SalesPage = (await import('../SalesPage.vue')).default;
    const wrapper = mount(SalesPage);
    await flushPromises();

    const closeButton = wrapper.findAll('button').find((button) => button.text() === 'Fechar');
    await closeButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain(
      'Não foi possível fechar a venda: Sale must be fully paid before closing'
    );
  });
});
