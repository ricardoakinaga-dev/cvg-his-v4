import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReportWorkbenchPage from '../ReportWorkbenchPage.vue';
import { administrativeReportsService } from '@/services/administrativeReports';
import type { AdministrativeReportsResponse } from '@/services/administrativeReports';

vi.mock('@/services/administrativeReports', () => ({
  administrativeReportsService: {
    getHubs: vi.fn()
  }
}));

const report = {
  generatedAt: '2026-04-28T00:00:00.000Z',
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
        totalRecords: 2,
        draftCount: 0,
        estimatedCount: 0,
        openCount: 1,
        settledCount: 1,
        grossAmount: 1200
      },
      receivables: {
        openCount: 1,
        currentCount: 1,
        overdueCount: 0,
        totalOutstanding: 250,
        currentAmount: 250,
        overdueAmount: 0,
        topOpenReceivables: [
          {
            receivableId: 'rec-1',
            encounterId: 'enc-1',
            installmentLabel: '1/1',
            patientName: 'Paciente Teste',
            ownerName: 'Tutor Teste',
            dueAt: '2026-04-30T00:00:00.000Z',
            amountOutstanding: 250
          }
        ]
      },
      pix: {
        totalTransactions: 1,
        completedCount: 1,
        pendingCount: 0,
        expiredCount: 0,
        cancelledCount: 0,
        reconciledCount: 0,
        attentionRequiredCount: 1,
        completedAmount: 250,
        byProvider: []
      }
    },
    commercial: {
      quotes: {
        issuedCount: 1,
        approvedCount: 0,
        convertedCount: 0,
        rejectedCount: 0,
        pipelineAmount: 300,
        convertedAmount: 0,
        recent: []
      },
      counterSales: {
        totalSales: 2,
        openCount: 0,
        closedCount: 2,
        cancelledCount: 0,
        grossRevenue: 1200,
        netRevenue: 1200,
        avgTicket: 600,
        byPaymentMethod: [],
        topProducts: [{ name: 'Produto Teste', quantity: 1, revenue: 400 }],
        topServices: [{ name: 'Consulta Teste', quantity: 2, revenue: 800 }]
      }
    },
    cash: {
      hasOpenRegister: true,
      openRegister: null,
      registerCount: 1,
      recentRegisters: [
        {
          id: 'cash-1',
          status: 'open',
          openedAt: '2026-04-28T00:00:00.000Z',
          closedAt: null,
          openingAmount: 100,
          closingAmount: null,
          difference: null,
          runningBalance: 500
        }
      ],
      recentMovements: [],
      inflowAmount: 500
    },
    fiscal: {
      activeTaxes: 4,
      cfopCount: 10,
      nfseLayouts: 1,
      icmsRules: 0,
      pisCofinsRules: 0,
      ncmEntries: 6,
      readOnly: false,
      backendScope: 'Fiscal',
      pendingScopes: [],
      alerts: []
    }
  },
  highlights: []
} as unknown as AdministrativeReportsResponse;

describe('ReportWorkbenchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(administrativeReportsService.getHubs).mockResolvedValue(report);
  });

  it('renders receivables report with live administrative hub data', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'accounts-receivable' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Contas a Receber');
    expect(wrapper.text()).toContain('Paciente Teste');
    expect(wrapper.text()).toContain('Tutor Teste');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders produced items report without using placeholder route content', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'produced-items' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Produtos/Serviços Produzidos');
    expect(wrapper.text()).toContain('Consulta Teste');
    expect(wrapper.text()).toContain('Produto Teste');
  });
});
