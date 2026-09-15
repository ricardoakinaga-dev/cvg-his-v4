import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import CommercialReportsPage from '@/pages/commercial-reports/CommercialReportsPage.vue';
import {
  administrativeReportsService,
  type AdministrativeReportsResponse
} from '@/services/administrativeReports';

vi.mock('@/services/administrativeReports', () => ({
  administrativeReportsService: {
    getHubs: vi.fn()
  }
}));

const report: AdministrativeReportsResponse = {
  generatedAt: '2026-09-14T10:00:00.000Z',
  filters: { dateFrom: null, dateTo: null },
  executive: {
    outstandingReceivables: 1250,
    pixAttentionCount: 1,
    quotePipelineAmount: 2400,
    commercialRevenue: 1800,
    openCashBalance: 900,
    fiscalCoverageScore: 88
  },
  domains: {
    financial: {
      billing: {
        totalRecords: 4,
        draftCount: 1,
        estimatedCount: 1,
        openCount: 1,
        settledCount: 1,
        grossAmount: 3050
      },
      receivables: {
        openCount: 1,
        currentCount: 1,
        overdueCount: 0,
        totalOutstanding: 1250,
        currentAmount: 1250,
        overdueAmount: 0,
        topOpenReceivables: [
          {
            receivableId: 'receivable-1',
            encounterId: 'encounter-1',
            installmentLabel: 'Parcela 1/1',
            patientName: 'Luna',
            ownerName: 'Maria',
            dueAt: '2026-09-30T00:00:00.000Z',
            amountOutstanding: 1250
          }
        ]
      },
      pix: {
        totalTransactions: 2,
        completedCount: 1,
        pendingCount: 1,
        expiredCount: 0,
        cancelledCount: 0,
        reconciledCount: 1,
        attentionRequiredCount: 1,
        completedAmount: 500,
        byProvider: [{ provider: 'efi', amount: 500 }]
      }
    },
    commercial: {
      quotes: {
        issuedCount: 3,
        approvedCount: 1,
        convertedCount: 0,
        rejectedCount: 0,
        pipelineAmount: 2400,
        convertedAmount: 0,
        recent: [
          {
            id: 'quote-1',
            number: 'ORC-001',
            status: 'open',
            total: 2400,
            convertedAt: null,
            createdAt: '2026-09-14T09:00:00.000Z'
          }
        ]
      },
      counterSales: {
        totalSales: 2,
        openCount: 1,
        closedCount: 1,
        cancelledCount: 0,
        grossRevenue: 1800,
        netRevenue: 1800,
        avgTicket: 900,
        byPaymentMethod: [{ method: 'pix', total: 1800 }],
        topProducts: [],
        topServices: []
      }
    },
    cash: {
      hasOpenRegister: true,
      openRegister: {
        id: 'cash-1',
        openedAt: '2026-09-14T08:00:00.000Z',
        openingAmount: 500,
        status: 'open',
        runningBalance: 900
      },
      registerCount: 1,
      recentRegisters: [
        {
          id: 'cash-1',
          status: 'open',
          openedAt: '2026-09-14T08:00:00.000Z',
          closedAt: null,
          openingAmount: 500,
          closingAmount: null,
          difference: null,
          runningBalance: 900
        }
      ],
      recentMovements: [],
      inflowAmount: 400
    },
    fiscal: {
      activeTaxes: 2,
      cfopCount: 4,
      nfseLayouts: 1,
      icmsRules: 2,
      pisCofinsRules: 2,
      ncmEntries: 4,
      readOnly: true,
      backendScope: 'leitura',
      pendingScopes: [],
      alerts: []
    }
  },
  highlights: []
};

describe('CommercialReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(administrativeReportsService.getHubs).mockResolvedValue(report);
  });

  it('mounts the real report surface and renders loaded domain data', async () => {
    const wrapper = mount(CommercialReportsPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Hubs Administrativos');
    expect(wrapper.text().replace(/\u00a0/g, ' ')).toContain('R$ 1.250,00');
    expect(wrapper.text()).toContain('ORC-001');
    expect(wrapper.text()).toContain('pix');
    expect(administrativeReportsService.getHubs).toHaveBeenCalledWith({
      dateFrom: undefined,
      dateTo: undefined
    });
  });

  it('applies the real date-filter action and exposes a real error state', async () => {
    const wrapper = mount(CommercialReportsPage);
    await flushPromises();

    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0].setValue('2026-09-01');
    await dateInputs[1].setValue('2026-09-14');
    await wrapper.findAll('button').find((button) => button.text() === 'Aplicar')!.trigger('click');
    await flushPromises();

    expect(administrativeReportsService.getHubs).toHaveBeenLastCalledWith({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-14'
    });

    vi.mocked(administrativeReportsService.getHubs).mockRejectedValueOnce(
      new Error('Falha realçada no relatório')
    );
    await wrapper.findAll('button').find((button) => button.text() === 'Atualizar')!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Falha realçada no relatório');
  });
});
