import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReportWorkbenchPage from '../ReportWorkbenchPage.vue';
import { auditService } from '@/services/audit';
import { administrativeReportsService } from '@/services/administrativeReports';
import type { AdministrativeReportsResponse } from '@/services/administrativeReports';
import type { AuditEventSummary } from '@cvg-his-v2/shared-types';

vi.mock('@/services/administrativeReports', () => ({
  administrativeReportsService: {
    getHubs: vi.fn()
  }
}));

vi.mock('@/services/audit', () => ({
  auditService: {
    listEvents: vi.fn()
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

const auditEvents = [
  {
    eventId: 'evt-apt-1',
    occurredAt: '2026-04-28T12:00:00.000Z',
    actorId: 'user-agenda',
    accountId: 'acc-1',
    module: 'scheduling',
    action: 'appointment.updated',
    entityType: 'appointment',
    entityId: 'apt-1',
    correlationId: 'corr-apt-1',
    payloadSummary: 'Cliente Maria teve horário do agendamento alterado',
    riskLevel: 'medium'
  },
  {
    eventId: 'evt-apt-2',
    occurredAt: '2026-04-28T13:00:00.000Z',
    actorId: 'user-sync',
    accountId: 'acc-1',
    module: 'google-calendar',
    action: 'appointment.sync.failed',
    entityType: 'appointment-sync',
    entityId: 'apt-2',
    correlationId: 'corr-apt-2',
    payloadSummary: 'Sincronização do agendamento com calendário falhou',
    riskLevel: 'low'
  }
] as unknown as AuditEventSummary[];

describe('ReportWorkbenchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(administrativeReportsService.getHubs).mockResolvedValue(report);
    vi.mocked(auditService.listEvents).mockResolvedValue(auditEvents);
  });

  it('renders accounts receivable financial report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'accounts-receivable' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Contas a Receber');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/ContasAReceberRelatorio.htm');
    expect(wrapper.text()).toContain('Maiores recebíveis em aberto');
    expect(wrapper.text()).toContain('Paciente Teste');
    expect(wrapper.text()).toContain('Tutor Teste');
    expect(wrapper.text()).toContain('1/1');
    expect(wrapper.text()).not.toContain('Abrir financeiro');
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

  it('renders cash drawer financial report as read-only Vetus report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'cash-drawer' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Gaveta');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/GavetaRelatorio.htm');
    expect(wrapper.text()).toContain('Gavetas no período');
    expect(wrapper.text()).toContain('Saldo aberto');
    expect(wrapper.text()).toMatch(/R\$\s*500,00/);
    expect(wrapper.text()).not.toContain('Abrir caixa');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders cash flow financial report without using the operational cash-flow page', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'cash-flow' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Fluxo de Caixa');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/FluxoDeCaixaRelatorio.htm');
    expect(wrapper.text()).toContain('Receita comercial');
    expect(wrapper.text()).toContain('Recebíveis abertos');
    expect(wrapper.text()).toContain('Saldo aberto');
    expect(wrapper.text()).toContain('Receita comercial consolidada');
    expect(wrapper.text()).not.toContain('Gerar Fluxo');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders DRE financial report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'dre' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('DRE - Demonstrativo de Resultados');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/DRE.htm');
    expect(wrapper.text()).toContain('Receita comercial');
    expect(wrapper.text()).toContain('Faturamento bruto');
    expect(wrapper.text()).toContain('Pipeline comercial');
    expect(wrapper.text()).toContain('Receita comercial consolidada');
    expect(wrapper.text()).toContain('Faturamento bruto registrado');
    expect(wrapper.text()).not.toContain('Relatórios Financeiros específicos no menu lateral');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders packages financial report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'packages' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Pacotes');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/PacoteRelatorio.htm');
    expect(wrapper.text()).toContain('Indicadores de pacotes');
    expect(wrapper.text()).toContain('Receita comercial relacionada');
    expect(wrapper.text()).toContain('Pipeline comercial relacionado');
    expect(wrapper.text()).toContain('Vendas fechadas relacionadas');
    expect(wrapper.text()).not.toContain('Abrir pacotes');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders appointment audit report with Vetus filters and audit events only', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'audit-appointments' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Auditoria de Agendamentos');
    expect(wrapper.text()).toContain('Data início');
    expect(wrapper.text()).toContain('Data fim');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Usuário');
    expect(wrapper.text()).toContain('Ação');
    expect(wrapper.text()).toContain('Tipo');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Cliente Maria teve horário do agendamento alterado');
    expect(wrapper.text()).toContain('appointment.updated');
    expect(wrapper.text()).not.toContain('PIX auditáveis');
    expect(wrapper.text()).not.toContain('Caixas recentes');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(auditService.listEvents).toHaveBeenCalledWith({
      entityTypes: ['appointment', 'appointment-recommendation', 'appointment-sync'],
      limit: 200
    });
  });
});
