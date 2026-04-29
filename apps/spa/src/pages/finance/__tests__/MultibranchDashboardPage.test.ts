import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetHubs = vi.fn();

vi.mock('@/services/administrativeReports', () => ({
  administrativeReportsService: {
    getHubs: (...args: unknown[]) => mockGetHubs(...args)
  }
}));

function makeReport(overrides = {}) {
  return {
    generatedAt: '2026-04-29T12:00:00.000Z',
    filters: { dateFrom: null, dateTo: null },
    executive: {
      outstandingReceivables: 250,
      pixAttentionCount: 1,
      quotePipelineAmount: 300,
      commercialRevenue: 1200,
      openCashBalance: 500,
      fiscalCoverageScore: 80
    },
    domains: {
      financial: {
        billing: {
          totalRecords: 4,
          draftCount: 0,
          estimatedCount: 0,
          openCount: 1,
          settledCount: 3,
          grossAmount: 1500
        },
        receivables: {
          openCount: 1,
          currentCount: 1,
          overdueCount: 0,
          totalOutstanding: 250,
          currentAmount: 250,
          overdueAmount: 0,
          topOpenReceivables: []
        },
        pix: {
          totalTransactions: 2,
          completedCount: 2,
          pendingCount: 0,
          expiredCount: 0,
          cancelledCount: 0,
          reconciledCount: 1,
          attentionRequiredCount: 1,
          completedAmount: 450,
          byProvider: []
        }
      },
      commercial: {
        quotes: {
          issuedCount: 3,
          approvedCount: 1,
          convertedCount: 1,
          rejectedCount: 0,
          pipelineAmount: 300,
          convertedAmount: 400,
          recent: []
        },
        counterSales: {
          totalSales: 5,
          openCount: 1,
          closedCount: 4,
          cancelledCount: 0,
          grossRevenue: 1200,
          netRevenue: 1180,
          avgTicket: 300,
          byPaymentMethod: [{ method: 'pix', total: 700 }],
          topProducts: [{ name: 'Antipulgas Vetus', quantity: 3, revenue: 240 }],
          topServices: [{ name: 'Consulta clínica', quantity: 2, revenue: 360 }]
        }
      },
      cash: {
        hasOpenRegister: true,
        openRegister: {
          id: 'cash-1',
          openedAt: '2026-04-29T08:00:00.000Z',
          openingAmount: 100,
          status: 'open',
          runningBalance: 500
        },
        registerCount: 1,
        recentRegisters: [],
        recentMovements: [],
        inflowAmount: 600
      },
      fiscal: {
        activeTaxes: 4,
        cfopCount: 10,
        nfseLayouts: 1,
        icmsRules: 2,
        pisCofinsRules: 2,
        ncmEntries: 6,
        readOnly: false,
        backendScope: 'Fiscal',
        pendingScopes: [],
        alerts: []
      }
    },
    highlights: [],
    ...overrides
  };
}

describe('MultibranchDashboardPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
    vi.clearAllMocks();
    mockGetHubs.mockResolvedValue(makeReport());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a Vetus-like multibranch dashboard from administrative hubs', async () => {
    const MultibranchDashboardPage = (await import('../MultibranchDashboardPage.vue')).default;
    const wrapper = mount(MultibranchDashboardPage, {
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

    expect(wrapper.text()).toContain('DashBoard do Multifilial');
    expect(wrapper.text()).toContain('Visão consolidada de filiais');
    expect(wrapper.text()).toContain('Unidade');
    expect(wrapper.text()).toContain('De');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Exportar Dashboard');
    expect(wrapper.text()).toContain('Dashboard Financeiro');
    expect(wrapper.text()).toContain('Gaveta');
    expect(wrapper.text()).toContain('Unidade atual');
    expect(wrapper.text()).toContain('Receita');
    expect(wrapper.text()).toContain('Recebíveis');
    expect(wrapper.text()).toContain('Caixa');
    expect(wrapper.text()).toContain('Vendas');
    expect(wrapper.text()).toContain('Ticket Médio');
    expect(wrapper.text()).toContain('Cobertura Fiscal');
    expect(wrapper.text()).toContain('R$\u00A01.200,00');
    expect(wrapper.text()).toContain('R$\u00A0250,00');
    expect(wrapper.text()).toContain('4 venda(s)');
    expect(mockGetHubs).toHaveBeenCalledWith({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30'
    });
  });

  it('shows empty and error states with multibranch wording', async () => {
    mockGetHubs.mockResolvedValueOnce(makeReport({
      executive: {
        outstandingReceivables: 0,
        pixAttentionCount: 0,
        quotePipelineAmount: 0,
        commercialRevenue: 0,
        openCashBalance: null,
        fiscalCoverageScore: 0
      },
      domains: {
        ...makeReport().domains,
        commercial: {
          ...makeReport().domains.commercial,
          counterSales: {
            ...makeReport().domains.commercial.counterSales,
            totalSales: 0,
            closedCount: 0,
            grossRevenue: 0,
            netRevenue: 0,
            avgTicket: 0
          }
        }
      }
    }));
    const MultibranchDashboardPage = (await import('../MultibranchDashboardPage.vue')).default;
    const emptyWrapper = mount(MultibranchDashboardPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhuma unidade com movimento no período');

    mockGetHubs.mockRejectedValueOnce(new Error('Falha no hub administrativo'));
    const errorWrapper = mount(MultibranchDashboardPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha no hub administrativo');
  });

  it('opens the financial dashboard from the unit row', async () => {
    const MultibranchDashboardPage = (await import('../MultibranchDashboardPage.vue')).default;
    const wrapper = mount(MultibranchDashboardPage, {
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
    expect(openLinks[0].attributes('href')).toBe('/dashboards/financial');
  });
});
