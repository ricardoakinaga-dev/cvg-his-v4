import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('FinanceTimelinePage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
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
        closedAt: '2026-04-23T15:00:00.000Z',
        createdAt: '2026-04-23T14:00:00.000Z',
        updatedAt: '2026-04-23T15:00:00.000Z'
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a Vetus-like financial timeline from existing financial surfaces', async () => {
    const FinanceTimelinePage = (await import('../FinanceTimelinePage.vue')).default;
    const wrapper = mount(FinanceTimelinePage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Linha do Tempo');
    expect(wrapper.text()).toContain('Eventos financeiros, vencimentos, recebimentos e marcos operacionais');
    expect(wrapper.text()).toContain('De');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Tipo');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Exportar Timeline');
    expect(wrapper.text()).toContain('Dashboard Financeiro');
    expect(wrapper.text()).toContain('Fluxo de Caixa');
    expect(wrapper.text()).toContain('Eventos');
    expect(wrapper.text()).toContain('Entradas');
    expect(wrapper.text()).toContain('Saídas Planejadas');
    expect(wrapper.text()).toContain('Pendências');
    expect(wrapper.text()).toContain('Conta a receber emitida');
    expect(wrapper.text()).toContain('Recebimento confirmado');
    expect(wrapper.text()).toContain('Comanda fechada');
    expect(wrapper.text()).toContain('Despesa catalogada');
    expect(wrapper.text()).toContain('Maria Vetus');
    expect(wrapper.text()).toContain('Joao Vetus');
    expect(wrapper.text()).toContain('CMD-001');
    expect(wrapper.text()).toContain('Fornecedor de medicamentos');
    expect(wrapper.text()).toContain('R$\u00A0300,00');
    expect(wrapper.text()).toContain('R$\u00A0120,00');
    expect(wrapper.text()).toContain('Pendente');
    expect(wrapper.text()).toContain('Concluído');
    expect(mockListReceivables).toHaveBeenCalledWith({ page: 1, pageSize: 100 });
    expect(mockListCounterSales).toHaveBeenCalledWith({
      status: 'all',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30'
    });
    expect(mockListExpenses).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
      sort: 'name',
      order: 'asc'
    });
  });

  it('shows empty and error states with timeline wording', async () => {
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
    const FinanceTimelinePage = (await import('../FinanceTimelinePage.vue')).default;
    const emptyWrapper = mount(FinanceTimelinePage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhum evento financeiro no período');

    mockListReceivables.mockRejectedValueOnce(new Error('Falha na linha do tempo'));
    const errorWrapper = mount(FinanceTimelinePage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha na linha do tempo');
  });

  it('opens the billing surface from receivable events', async () => {
    const FinanceTimelinePage = (await import('../FinanceTimelinePage.vue')).default;
    const wrapper = mount(FinanceTimelinePage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    await flushPromises();

    const openLinks = wrapper.findAll('a').filter((anchor) => anchor.text() === 'Abrir');
    expect(openLinks[0].attributes('href')).toBe('/billing?ownerId=own-1');
  });
});
