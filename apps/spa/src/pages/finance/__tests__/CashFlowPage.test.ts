import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListReceivables = vi.fn();
const mockListCounterSales = vi.fn();
const mockListExpenses = vi.fn();

vi.mock('@/services/financialReceivables', () => ({
  financialReceivablesService: {
    get list() {
      return mockListReceivables;
    }
  }
}));

vi.mock('@/services/counterSales', () => ({
  counterSalesService: {
    get list() {
      return mockListCounterSales;
    }
  }
}));

vi.mock('@/services/expensesCatalog', () => ({
  expensesCatalogService: {
    get list() {
      return mockListExpenses;
    }
  }
}));

describe('CashFlowPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListReceivables.mockResolvedValue({
      data: [
        {
          id: 'rec-1',
          encounterId: 'enc-1',
          financialAccountId: 'fin-1',
          installmentNumber: 1,
          installmentLabel: 'Parcela 1/1',
          dueAt: '2026-04-30T00:00:00.000Z',
          status: 'open',
          amountOriginal: 350,
          amountPaid: 50,
          amountOutstanding: 300,
          issuedAt: '2026-04-20T00:00:00.000Z',
          settledAt: null,
          notes: 'Consulta',
          payments: [],
          encounterStatus: 'closed',
          patientId: 'pat-1',
          patientName: 'Nina',
          patientSpecies: 'canina',
          ownerId: 'own-1',
          ownerName: 'Maria Vetus',
          ownerPhoneMain: null,
          financialStatus: 'partial',
          totalAmount: 350,
          lastClosedAt: '2026-04-20T00:00:00.000Z'
        },
        {
          id: 'rec-2',
          encounterId: 'enc-2',
          financialAccountId: 'fin-2',
          installmentNumber: 1,
          installmentLabel: 'Parcela 1/1',
          dueAt: '2026-04-22T00:00:00.000Z',
          status: 'settled',
          amountOriginal: 120,
          amountPaid: 120,
          amountOutstanding: 0,
          issuedAt: '2026-04-21T00:00:00.000Z',
          settledAt: '2026-04-22T00:00:00.000Z',
          notes: null,
          payments: [],
          encounterStatus: 'closed',
          patientId: 'pat-2',
          patientName: 'Tito',
          patientSpecies: 'felina',
          ownerId: 'own-2',
          ownerName: 'Joao Vetus',
          ownerPhoneMain: null,
          financialStatus: 'paid',
          totalAmount: 120,
          lastClosedAt: '2026-04-21T00:00:00.000Z'
        }
      ],
      page: 1,
      pageSize: 100,
      total: 2,
      openCount: 1,
      settledCount: 1,
      totalOutstanding: 300,
      totalSettled: 120
    });
    mockListCounterSales.mockResolvedValue([
      {
        id: 'sale-1',
        accountId: 'acc-1',
        number: 'CMD-001',
        ownerId: 'own-1',
        status: 'closed',
        subtotal: 220,
        discountAmount: 20,
        total: 200,
        paidAmount: 200,
        balanceDue: 0,
        notes: 'Comanda fechada',
        openedByUserId: 'user-1',
        closedByUserId: 'user-2',
        closedAt: '2026-04-22T15:00:00.000Z',
        createdAt: '2026-04-22T14:00:00.000Z',
        updatedAt: '2026-04-22T15:00:00.000Z'
      }
    ]);
    mockListExpenses.mockResolvedValue({
      items: [
        {
          id: 'exp-1',
          name: 'Fornecedor de medicamentos',
          kind: 'Operacional',
          category: 'Compras',
          costCenterCode: 'EST',
          costCenterName: 'Estoque',
          description: 'Previsao sem valor lançado'
        }
      ],
      categories: ['Compras'],
      costCenters: [],
      page: 1,
      pageSize: 100,
      totalItems: 1,
      totalPages: 1,
      sort: 'name',
      order: 'asc'
    });
  });

  it('renders a Vetus-like cash flow projection from receivables, sales and expenses', async () => {
    const CashFlowPage = (await import('../CashFlowPage.vue')).default;
    const wrapper = mount(CashFlowPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Fluxo de Caixa');
    expect(wrapper.text()).toContain('Fluxo de');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Agrupar por');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Total de Receitas');
    expect(wrapper.text()).toContain('Total de Despesas');
    expect(wrapper.text()).toContain('Saldo Final');
    expect(wrapper.text()).toContain('Total Produzido');
    expect(wrapper.text()).toContain('Total Desconto');
    expect(wrapper.text()).toContain('Maria Vetus');
    expect(wrapper.text()).toContain('Joao Vetus');
    expect(wrapper.text()).toContain('Fornecedor de medicamentos');
    expect(wrapper.text()).toContain('Receita');
    expect(wrapper.text()).toContain('Despesa');
    expect(wrapper.text()).toContain('A Receber');
    expect(wrapper.text()).toContain('Recebido');
    expect(wrapper.text()).toContain('R$\u00A0420,00');
    expect(wrapper.text()).toContain('R$\u00A0200,00');
    expect(wrapper.text()).toContain('R$\u00A020,00');
    expect(mockListReceivables).toHaveBeenCalledWith({ page: 1, pageSize: 100 });
    expect(mockListCounterSales).toHaveBeenCalledWith(expect.objectContaining({ status: 'all' }));
    expect(mockListExpenses).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
      sort: 'name',
      order: 'asc'
    });
  });

  it('shows empty and error states with cash flow wording', async () => {
    mockListReceivables.mockResolvedValueOnce({
      data: [],
      page: 1,
      pageSize: 100,
      total: 0,
      openCount: 0,
      settledCount: 0,
      totalOutstanding: 0,
      totalSettled: 0
    });
    mockListCounterSales.mockResolvedValueOnce([]);
    mockListExpenses.mockResolvedValueOnce({
      items: [],
      categories: [],
      costCenters: [],
      page: 1,
      pageSize: 100,
      totalItems: 0,
      totalPages: 1,
      sort: 'name',
      order: 'asc'
    });
    const CashFlowPage = (await import('../CashFlowPage.vue')).default;
    const emptyWrapper = mount(CashFlowPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhuma linha de fluxo encontrada');

    mockListReceivables.mockRejectedValueOnce(new Error('Falha no financeiro'));
    const errorWrapper = mount(CashFlowPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha no financeiro');
  });
});
