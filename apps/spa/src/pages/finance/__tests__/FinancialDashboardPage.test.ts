import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetHubs = vi.fn();
const mockGetIncomeStatement = vi.fn();

vi.mock('@/services/administrativeReports', () => ({
  administrativeReportsService: {
    getHubs: (...args: unknown[]) => mockGetHubs(...args)
  }
}));

vi.mock('@/services/financialStatements', () => ({
  financialStatementsService: {
    getIncomeStatement: (...args: unknown[]) => mockGetIncomeStatement(...args)
  }
}));

function makeReport(overrides = {}) {
  return {
    generatedAt: '2026-04-29T12:00:00.000Z',
    filters: { dateFrom: null, dateTo: null },
    executive: {
      outstandingReceivables: 750,
      pixAttentionCount: 2,
      quotePipelineAmount: 350,
      commercialRevenue: 2400,
      openCashBalance: 900,
      fiscalCoverageScore: 85
    },
    domains: {
      financial: {
        billing: {
          totalRecords: 8,
          draftCount: 1,
          estimatedCount: 1,
          openCount: 3,
          settledCount: 4,
          grossAmount: 3200
        },
        receivables: {
          openCount: 3,
          currentCount: 2,
          overdueCount: 1,
          totalOutstanding: 750,
          currentAmount: 500,
          overdueAmount: 250,
          topOpenReceivables: [
            {
              receivableId: 'rec-1',
              encounterId: 'enc-1',
              installmentLabel: 'Parcela 1/2',
              patientName: 'Mel',
              ownerName: 'Ana Lima',
              dueAt: '2026-04-20T00:00:00.000Z',
              amountOutstanding: 250
            }
          ]
        },
        pix: {
          totalTransactions: 5,
          completedCount: 3,
          pendingCount: 1,
          expiredCount: 0,
          cancelledCount: 0,
          reconciledCount: 2,
          attentionRequiredCount: 2,
          completedAmount: 1200,
          byProvider: [{ provider: 'asaas', amount: 1200 }]
        }
      },
      commercial: {
        quotes: {
          issuedCount: 4,
          approvedCount: 1,
          convertedCount: 1,
          rejectedCount: 0,
          pipelineAmount: 350,
          convertedAmount: 600,
          recent: []
        },
        counterSales: {
          totalSales: 7,
          openCount: 1,
          closedCount: 6,
          cancelledCount: 0,
          grossRevenue: 2400,
          netRevenue: 2300,
          avgTicket: 400,
          byPaymentMethod: [{ method: 'pix', total: 1200 }],
          topProducts: [],
          topServices: []
        }
      },
      cash: {
        hasOpenRegister: true,
        openRegister: {
          id: 'cash-1',
          openedAt: '2026-04-29T08:00:00.000Z',
          openingAmount: 100,
          status: 'open',
          runningBalance: 900
        },
        registerCount: 1,
        recentRegisters: [],
        recentMovements: [],
        inflowAmount: 1400
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

function makeIncomeStatement(overrides = {}) {
  return {
    generatedAt: '2026-04-29T12:00:00.000Z',
    period: { dateFrom: '2026-04-01', dateTo: '2026-04-30' },
    revenue: {
      grossRevenue: 3200,
      realizedRevenue: 2100,
      outstandingReceivables: 750,
      receivableCount: 8,
      settledReceivableCount: 4,
      openReceivableCount: 3
    },
    expenses: {
      accruedExpenses: 1300,
      paidExpenses: 900,
      outstandingPayables: 400,
      payableCount: 5,
      paidPayableCount: 2,
      openPayableCount: 3,
      byCategory: [
        {
          category: 'Estoque',
          accruedAmount: 800,
          paidAmount: 600,
          outstandingAmount: 200
        }
      ]
    },
    result: {
      realizedNetResult: 1200,
      accrualNetResult: 1900,
      grossMarginPercent: 59.38,
      cashConversionPercent: 65.63
    },
    ...overrides
  };
}

describe('FinancialDashboardPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
    vi.clearAllMocks();
    mockGetHubs.mockResolvedValue(makeReport());
    mockGetIncomeStatement.mockResolvedValue(makeIncomeStatement());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a Vetus-like financial dashboard from administrative hubs', async () => {
    const FinancialDashboardPage = (await import('../FinancialDashboardPage.vue')).default;
    const wrapper = mount(FinancialDashboardPage, {
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

    expect(wrapper.text()).toContain('Dashboard Financeiro');
    expect(wrapper.text()).toContain('Indicadores financeiros, recebíveis, caixa, PIX e produção comercial');
    expect(wrapper.text()).toContain('De');
    expect(wrapper.text()).toContain('Até');
    expect(wrapper.text()).toContain('Visão');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Exportar Dashboard');
    expect(wrapper.text()).toContain('Contas a Receber');
    expect(wrapper.text()).toContain('Contas a Pagar');
    expect(wrapper.text()).toContain('Fluxo de Caixa');
    expect(wrapper.text()).toContain('Receita Comercial');
    expect(wrapper.text()).toContain('Recebíveis');
    expect(wrapper.text()).toContain('Caixa Aberto');
    expect(wrapper.text()).toContain('Resultado Realizado');
    expect(wrapper.text()).toContain('PIX em Atenção');
    expect(wrapper.text()).toContain('Pipeline');
    expect(wrapper.text()).toContain('R$\u00A02.400,00');
    expect(wrapper.text()).toContain('R$\u00A0750,00');
    expect(wrapper.text()).toContain('2 pendência(s)');
    expect(wrapper.text()).toContain('Faturamento');
    expect(wrapper.text()).toContain('DRE Realizado');
    expect(wrapper.text()).toContain('DRE Competência');
    expect(wrapper.text()).toContain('Recebíveis em Aberto');
    expect(wrapper.text()).toContain('PIX');
    expect(wrapper.text()).toContain('Abrir');
    expect(mockGetHubs).toHaveBeenCalledWith({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30'
    });
    expect(mockGetIncomeStatement).toHaveBeenCalledWith({
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30'
    });
  });

  it('shows empty and error states with financial wording', async () => {
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
        financial: {
          ...makeReport().domains.financial,
          billing: {
            ...makeReport().domains.financial.billing,
            totalRecords: 0,
            openCount: 0,
            settledCount: 0,
            grossAmount: 0
          },
          receivables: {
            ...makeReport().domains.financial.receivables,
            openCount: 0,
            currentCount: 0,
            overdueCount: 0,
            totalOutstanding: 0,
            currentAmount: 0,
            overdueAmount: 0,
            topOpenReceivables: []
          },
          pix: {
            ...makeReport().domains.financial.pix,
            totalTransactions: 0,
            completedCount: 0,
            attentionRequiredCount: 0,
            completedAmount: 0
          }
        },
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
    mockGetIncomeStatement.mockResolvedValueOnce(makeIncomeStatement({
      revenue: {
        grossRevenue: 0,
        realizedRevenue: 0,
        outstandingReceivables: 0,
        receivableCount: 0,
        settledReceivableCount: 0,
        openReceivableCount: 0
      },
      expenses: {
        accruedExpenses: 0,
        paidExpenses: 0,
        outstandingPayables: 0,
        payableCount: 0,
        paidPayableCount: 0,
        openPayableCount: 0,
        byCategory: []
      },
      result: {
        realizedNetResult: 0,
        accrualNetResult: 0,
        grossMarginPercent: null,
        cashConversionPercent: null
      }
    }));
    const FinancialDashboardPage = (await import('../FinancialDashboardPage.vue')).default;
    const emptyWrapper = mount(FinancialDashboardPage);

    await flushPromises();
    expect(emptyWrapper.text()).toContain('Nenhum indicador financeiro no período');

    mockGetHubs.mockRejectedValueOnce(new Error('Falha no dashboard financeiro'));
    mockGetIncomeStatement.mockResolvedValueOnce(makeIncomeStatement());
    const errorWrapper = mount(FinancialDashboardPage);

    await flushPromises();
    expect(errorWrapper.text()).toContain('Falha no dashboard financeiro');
  });

  it('opens the receivables surface from financial indicator rows', async () => {
    const FinancialDashboardPage = (await import('../FinancialDashboardPage.vue')).default;
    const wrapper = mount(FinancialDashboardPage, {
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
    expect(openLinks.some((anchor) => anchor.attributes('href') === '/billing')).toBe(true);
  });

  it('filters the dashboard to income statement rows', async () => {
    const FinancialDashboardPage = (await import('../FinancialDashboardPage.vue')).default;
    const wrapper = mount(FinancialDashboardPage);

    await flushPromises();
    await wrapper.find('#financial-dashboard-view').setValue('income');

    expect(wrapper.text()).toContain('DRE Realizado');
    expect(wrapper.text()).toContain('DRE Competência');
    expect(wrapper.text()).not.toContain('Recebíveis em Aberto');
  });
});
