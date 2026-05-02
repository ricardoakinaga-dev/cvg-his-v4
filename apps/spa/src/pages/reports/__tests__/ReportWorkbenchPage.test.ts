import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReportWorkbenchPage from '../ReportWorkbenchPage.vue';
import { auditService } from '@/services/audit';
import { administrativeReportsService } from '@/services/administrativeReports';
import { appointmentService } from '@/services/appointment';
import {
  counterSalesService,
  type CounterSaleSummary
} from '@/services/counterSales';
import {
  expensesCatalogService,
  type ExpenseCatalogItem,
  type ExpenseCostCenterItem
} from '@/services/expensesCatalog';
import { inventoryService } from '@/services/inventory';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { servicesService, type ServiceSummary } from '@/services/services';
import type { AdministrativeReportsResponse } from '@/services/administrativeReports';
import type { AppointmentSummary } from '@/types/appointment';
import type { InventoryConsumptionSummary, InventoryItemSummary, InventoryLotSummary } from '@/types/inventory';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';
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

vi.mock('@/services/appointment', () => ({
  appointmentService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/counterSales', () => ({
  counterSalesService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/expensesCatalog', () => ({
  expensesCatalogService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listConsumptions: vi.fn(),
    listLots: vi.fn()
  }
}));

vi.mock('@/services/services', () => ({
  servicesService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/owner', () => ({
  ownerService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    list: vi.fn()
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

const appointments = [
  {
    id: 'apt-1',
    accountId: 'acc-1',
    patientId: 'patient-1',
    ownerId: 'owner-1',
    scheduledAt: '2026-04-30T12:00:00.000Z',
    durationMinutes: 30,
    visitType: 'scheduled',
    reason: 'Consulta de rotina',
    practitionerStaffId: 'staff-1',
    serviceId: 'service-1',
    unit: 'Clínica Centro',
    status: 'completed',
    createdAt: '2026-04-29T12:00:00.000Z',
    updatedAt: '2026-04-30T12:30:00.000Z'
  },
  {
    id: 'apt-2',
    accountId: 'acc-1',
    patientId: 'patient-2',
    ownerId: 'owner-2',
    scheduledAt: '2026-04-30T13:00:00.000Z',
    durationMinutes: 30,
    visitType: 'return',
    reason: 'Retorno cirúrgico',
    status: 'cancelled',
    createdAt: '2026-04-29T13:00:00.000Z',
    updatedAt: '2026-04-30T10:00:00.000Z'
  },
  {
    id: 'apt-3',
    accountId: 'acc-1',
    patientId: 'patient-3',
    ownerId: 'owner-3',
    scheduledAt: '2026-04-30T14:00:00.000Z',
    durationMinutes: 30,
    visitType: 'scheduled',
    reason: 'Vacina anual',
    practitionerStaffId: 'staff-1',
    serviceId: 'service-2',
    unit: 'Clínica Centro',
    status: 'checked_in',
    createdAt: '2026-04-29T14:00:00.000Z',
    updatedAt: '2026-04-30T14:00:00.000Z'
  }
] as AppointmentSummary[];

const services = [
  {
    id: 'service-1',
    accountId: 'acc-1',
    name: 'Consulta Teste',
    code: 'CONS',
    description: 'Consulta clínica geral',
    basePrice: 180,
    active: true,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z'
  },
  {
    id: 'service-2',
    accountId: 'acc-1',
    name: 'Vacina Teste',
    code: null,
    description: null,
    basePrice: 120,
    active: false,
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-02T00:00:00.000Z'
  }
] as ServiceSummary[];

const owners = [
  {
    id: 'owner-1',
    accountId: 'acc-1',
    fullName: 'Maria Cliente',
    documentId: '123.456.789-00',
    contacts: [
      { label: 'Celular', value: '(11) 99999-0000', type: 'whatsapp', primary: true }
    ],
    address: { city: 'Campinas', state: 'SP' },
    financialResponsible: true,
    status: 'active',
    createdAt: '2026-04-03T00:00:00.000Z',
    updatedAt: '2026-04-03T00:00:00.000Z'
  },
  {
    id: 'owner-2',
    accountId: 'acc-1',
    fullName: 'João Sem Contato',
    contacts: [],
    financialResponsible: false,
    status: 'inactive',
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z'
  }
] as OwnerSummary[];

const patients = [
  {
    id: 'patient-1',
    accountId: 'acc-1',
    name: 'Bolota',
    species: 'canine',
    breed: 'SRD',
    sex: 'female',
    microchip: '985141000000001',
    legacyVetusId: 'A-100',
    primaryOwnerId: 'owner-1',
    status: 'active',
    createdAt: '2026-04-05T00:00:00.000Z',
    updatedAt: '2026-04-05T00:00:00.000Z'
  },
  {
    id: 'patient-2',
    accountId: 'acc-1',
    name: 'Thor',
    species: 'feline',
    sex: 'male',
    primaryOwnerId: 'owner-2',
    status: 'deceased',
    createdAt: '2026-04-06T00:00:00.000Z',
    updatedAt: '2026-04-06T00:00:00.000Z'
  }
] as PatientSummary[];

const supplierCostCenters = [
  {
    code: 'ESTOQUE',
    name: 'Estoque',
    kind: 'Operacional',
    owner: 'Compras',
    description: 'Compras e fornecedores'
  }
] as ExpenseCostCenterItem[];

const suppliers = [
  {
    id: 'sup-1',
    name: 'Fornecedor CVG',
    kind: 'Operacional',
    category: 'FORNECEDOR',
    costCenterCode: 'ESTOQUE',
    costCenterName: 'Estoque',
    description: 'compras@cvg.test'
  },
  {
    id: 'sup-2',
    name: 'Despesa Energia',
    kind: 'Fixo',
    category: 'DESPESA',
    costCenterCode: 'ADM',
    costCenterName: '',
    description: ''
  }
] as ExpenseCatalogItem[];

const counterSales = [
  {
    id: 'sale-1',
    accountId: 'acc-1',
    number: 'CV-100',
    ownerId: 'owner-1',
    status: 'cancelled',
    subtotal: 250,
    discountAmount: 25,
    total: 225,
    paidAmount: 0,
    balanceDue: 225,
    notes: 'Cancelada por duplicidade',
    openedByUserId: 'user-caixa',
    closedByUserId: null,
    closedAt: null,
    createdAt: '2026-04-07T10:00:00.000Z',
    updatedAt: '2026-04-07T10:30:00.000Z'
  },
  {
    id: 'sale-2',
    accountId: 'acc-1',
    number: 'CV-101',
    ownerId: null,
    status: 'closed',
    subtotal: 180,
    discountAmount: 0,
    total: 180,
    paidAmount: 180,
    balanceDue: 0,
    notes: null,
    openedByUserId: 'user-caixa',
    closedByUserId: 'user-caixa',
    closedAt: '2026-04-07T12:00:00.000Z',
    createdAt: '2026-04-07T11:00:00.000Z',
    updatedAt: '2026-04-07T12:00:00.000Z'
  }
] as CounterSaleSummary[];

const inventoryItems = [
  {
    id: 'inv-1',
    accountId: 'acc-1',
    sku: 'MED-001',
    name: 'Dipirona Gotas',
    unit: 'un',
    onHandQuantity: 4,
    reorderLevel: 5,
    unitCostAmount: 12.5,
    createdAt: '2026-04-08T00:00:00.000Z',
    updatedAt: '2026-04-08T10:00:00.000Z'
  },
  {
    id: 'inv-2',
    accountId: 'acc-1',
    sku: 'VAC-010',
    name: 'Vacina V10',
    unit: 'dose',
    onHandQuantity: 20,
    reorderLevel: 3,
    unitCostAmount: 40,
    createdAt: '2026-04-09T00:00:00.000Z',
    updatedAt: '2026-04-09T10:00:00.000Z'
  }
] as InventoryItemSummary[];

const inventoryLots = [
  {
    id: 'lot-1',
    accountId: 'acc-1',
    inventoryItemId: 'inv-1',
    sku: 'MED-001',
    itemName: 'Dipirona Gotas',
    lotNumber: 'L-001',
    quantity: 4,
    unit: 'un',
    location: 'Farmácia',
    supplier: 'Fornecedor CVG',
    expiryDate: '2026-05-15T00:00:00.000Z',
    status: 'expiring',
    createdAt: '2026-04-08T00:00:00.000Z',
    updatedAt: '2026-04-08T10:00:00.000Z'
  },
  {
    id: 'lot-2',
    accountId: 'acc-1',
    inventoryItemId: 'inv-2',
    sku: 'VAC-010',
    itemName: 'Vacina V10',
    lotNumber: 'L-010',
    quantity: 20,
    unit: 'dose',
    location: 'Geladeira',
    supplier: 'Fornecedor CVG',
    expiryDate: '2026-10-01T00:00:00.000Z',
    status: 'active',
    createdAt: '2026-04-09T00:00:00.000Z',
    updatedAt: '2026-04-09T10:00:00.000Z'
  }
] as InventoryLotSummary[];

const inventoryConsumptions = [
  {
    id: 'cons-1',
    accountId: 'acc-1',
    inventoryItemId: 'inv-1',
    encounterId: 'enc-1',
    patientId: 'patient-1',
    quantity: 2,
    unit: 'un',
    costAmount: 25,
    sourceEntityType: 'encounter',
    sourceEntityId: 'enc-1',
    recordedByUserId: 'user-estoque',
    createdAt: '2026-04-10T09:00:00.000Z'
  },
  {
    id: 'cons-2',
    accountId: 'acc-1',
    inventoryItemId: 'inv-2',
    encounterId: 'enc-2',
    patientId: 'patient-2',
    quantity: 1,
    unit: 'dose',
    costAmount: 40,
    sourceEntityType: 'prescription',
    sourceEntityId: 'rx-1',
    recordedByUserId: 'user-farmacia',
    createdAt: '2026-04-11T09:00:00.000Z'
  }
] as InventoryConsumptionSummary[];

describe('ReportWorkbenchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(administrativeReportsService.getHubs).mockResolvedValue(report);
    vi.mocked(auditService.listEvents).mockResolvedValue(auditEvents);
    vi.mocked(appointmentService.list).mockResolvedValue(appointments);
    vi.mocked(servicesService.list).mockResolvedValue(services);
    vi.mocked(ownerService.list).mockResolvedValue(owners);
    vi.mocked(patientService.list).mockResolvedValue(patients);
    vi.mocked(counterSalesService.list).mockResolvedValue(counterSales);
    vi.mocked(inventoryService.list).mockResolvedValue(inventoryItems);
    vi.mocked(inventoryService.listConsumptions).mockResolvedValue(inventoryConsumptions);
    vi.mocked(inventoryService.listLots).mockResolvedValue(inventoryLots);
    vi.mocked(expensesCatalogService.list).mockResolvedValue({
      items: suppliers,
      categories: ['FORNECEDOR', 'DESPESA'],
      costCenters: supplierCostCenters,
      page: 1,
      pageSize: 500,
      totalItems: suppliers.length,
      totalPages: 1,
      sort: 'name',
      order: 'asc'
    });
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

  it('renders received accounts financial report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'received-accounts' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Contas Recebidas');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/ContasRecebidasRelatorio.htm');
    expect(wrapper.text()).toContain('Recebimentos no período');
    expect(wrapper.text()).toContain('Recebido confirmado');
    expect(wrapper.text()).toContain('Títulos quitados');
    expect(wrapper.text()).toContain('PIX concluídos');
    expect(wrapper.text()).toContain('Faturamentos quitados');
    expect(wrapper.text()).not.toContain('Abrir financeiro');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders accounts payable financial report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'accounts-payable' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Contas a Pagar');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Financeiro/ContasAPagar.htm');
    expect(wrapper.text()).toContain('Obrigações a pagar');
    expect(wrapper.text()).toContain('Fonte de títulos a pagar');
    expect(wrapper.text()).toContain('Catálogo operacional');
    expect(wrapper.text()).toContain('Estrutura operacional mapeada');
    expect(wrapper.text()).toContain('Baixa, conta avulsa e exportação');
    expect(wrapper.text()).not.toContain('Abrir financeiro');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders paid accounts financial report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'paid-accounts' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Contas Pagas');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/ContasPagasRelatorio.htm');
    expect(wrapper.text()).toContain('Pagamentos no período');
    expect(wrapper.text()).toContain('Fonte de contas pagas');
    expect(wrapper.text()).toContain('Desembolso realizado');
    expect(wrapper.text()).toContain('Subconjunto quitado de contas a pagar');
    expect(wrapper.text()).toContain('Baixa, fornecedor e exportação');
    expect(wrapper.text()).not.toContain('Abrir financeiro');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders cheques financial report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'cheques' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Cheques');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Financeiro/Cheques.htm');
    expect(wrapper.text()).toContain('Cheques no período');
    expect(wrapper.text()).toContain('Fonte operacional');
    expect(wrapper.text()).toContain('Fonte analítica');
    expect(wrapper.text()).toContain('Estrutura operacional mapeada');
    expect(wrapper.text()).toContain('Cadastro, baixa, devolução e exportação');
    expect(wrapper.text()).not.toContain('Abrir financeiro');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders advance payments financial report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'advance-payments' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Pagamento Antecipado');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Financeiro/PagamentoAntecipado.htm');
    expect(wrapper.text()).toContain('Pagamentos antecipados no período');
    expect(wrapper.text()).toContain('Fonte operacional');
    expect(wrapper.text()).toContain('Fonte analítica');
    expect(wrapper.text()).toContain('Estrutura operacional mapeada');
    expect(wrapper.text()).toContain('Geração, compensação e exportação');
    expect(wrapper.text()).not.toContain('Abrir financeiro');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders counter sales and sales attendance report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'sales-counter-sales' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Comandas/Vendas');
    expect(wrapper.text()).toContain('Relatórios de Atendimentos');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/ComandasVendasRelatorio.htm');
    expect(wrapper.text()).toContain('Comandas e vendas no período');
    expect(wrapper.text()).toContain('Receita bruta');
    expect(wrapper.text()).toContain('Ticket médio');
    expect(wrapper.text()).toContain('Volume transacional consolidado');
    expect(wrapper.text()).toContain('Comandas e vendas fechadas');
    expect(wrapper.text()).not.toContain('Hubs Administrativos');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders produced items attendance report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'produced-items' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Produtos/Serviços Produzidos');
    expect(wrapper.text()).toContain('Relatórios de Atendimentos');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/ProdutosEServicosProduzidos.htm');
    expect(wrapper.text()).toContain('Produtos e serviços produzidos');
    expect(wrapper.text()).toContain('Vendas fechadas');
    expect(wrapper.text()).toContain('Receita comercial');
    expect(wrapper.text()).toContain('Itens produzidos');
    expect(wrapper.text()).toContain('Consulta Teste');
    expect(wrapper.text()).toContain('Produto Teste');
    expect(wrapper.text()).not.toContain('Abrir vendas');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders production attendance report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'production' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Produção');
    expect(wrapper.text()).toContain('Relatórios de Atendimentos');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/ProducaoRelatorio.htm');
    expect(wrapper.text()).toContain('Produção no período');
    expect(wrapper.text()).toContain('Produção fechada');
    expect(wrapper.text()).toContain('Receita produzida');
    expect(wrapper.text()).toContain('Output operacional concluído');
    expect(wrapper.text()).toContain('Serviços produzidos');
    expect(wrapper.text()).toContain('Produtos produzidos');
    expect(wrapper.text()).not.toContain('Abrir hub executivo');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders appointments attendance report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'appointments' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Agenda');
    expect(wrapper.text()).toContain('Relatórios de Atendimentos');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/AgendaRelatorio.htm');
    expect(wrapper.text()).toContain('Agendamentos no período');
    expect(wrapper.text()).toContain('Agendamentos');
    expect(wrapper.text()).toContain('Comparecimentos');
    expect(wrapper.text()).toContain('Cancelamentos');
    expect(wrapper.text()).toContain('Consulta de rotina');
    expect(wrapper.text()).toContain('Retorno cirúrgico');
    expect(wrapper.text()).toContain('Executado');
    expect(wrapper.text()).toContain('Cancelado');
    expect(wrapper.text()).not.toContain('Abrir hub executivo');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(appointmentService.list).toHaveBeenCalledWith({
      startAt: undefined,
      endAt: undefined
    });
  });

  it('renders professional care attendance report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'professional-care' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Atendimento por Profissional');
    expect(wrapper.text()).toContain('Relatórios de Atendimentos');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/AtendimentoPorProfissional.htm');
    expect(wrapper.text()).toContain('Atendimentos por profissional');
    expect(wrapper.text()).toContain('Profissionais atendendo');
    expect(wrapper.text()).toContain('Atendimentos executados');
    expect(wrapper.text()).toContain('Agendamentos no período');
    expect(wrapper.text()).toContain('staff-1');
    expect(wrapper.text()).toContain('Sem profissional');
    expect(wrapper.text()).not.toContain('Abrir profissionais');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(appointmentService.list).toHaveBeenCalledWith({
      startAt: undefined,
      endAt: undefined
    });
  });

  it('renders service invoices custom report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'service-invoices' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Relatório de NF de Serviços Prestados');
    expect(wrapper.text()).toContain('Relatórios Personalizados');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/RelatorioNFServicosPrestados.htm');
    expect(wrapper.text()).toContain('NF de serviços prestados');
    expect(wrapper.text()).toContain('Layouts NFS-e');
    expect(wrapper.text()).toContain('Serviços prestados');
    expect(wrapper.text()).toContain('Faturamento bruto');
    expect(wrapper.text()).toContain('Configuração NFS-e disponível');
    expect(wrapper.text()).toContain('Serviços prestados consolidados');
    expect(wrapper.text()).toContain('Emissão, prefeitura e exportação');
    expect(wrapper.text()).not.toContain('Atualizar relatório de NF');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders services register report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-services' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Serviços');
    expect(wrapper.text()).toContain('Relatórios de Cadastros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/ServicosRelatorio.htm');
    expect(wrapper.text()).toContain('Serviços cadastrados');
    expect(wrapper.text()).toContain('Serviços ativos');
    expect(wrapper.text()).toContain('Preço médio');
    expect(wrapper.text()).toContain('Consulta Teste');
    expect(wrapper.text()).toContain('CONS');
    expect(wrapper.text()).toContain('Vacina Teste');
    expect(wrapper.text()).toContain('Sem código');
    expect(wrapper.text()).toContain('Inativo');
    expect(wrapper.text()).not.toContain('Abrir serviços');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(servicesService.list).toHaveBeenCalledWith();
  });

  it('renders owners register report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-owners' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Clientes');
    expect(wrapper.text()).toContain('Relatórios de Cadastros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/ClientesRelatorio.htm');
    expect(wrapper.text()).toContain('Clientes cadastrados');
    expect(wrapper.text()).toContain('Clientes ativos');
    expect(wrapper.text()).toContain('Responsáveis financeiros');
    expect(wrapper.text()).toContain('Com contato');
    expect(wrapper.text()).toContain('Maria Cliente');
    expect(wrapper.text()).toContain('123.456.789-00');
    expect(wrapper.text()).toContain('Celular: (11) 99999-0000');
    expect(wrapper.text()).toContain('Campinas');
    expect(wrapper.text()).toContain('João Sem Contato');
    expect(wrapper.text()).toContain('Sem documento');
    expect(wrapper.text()).toContain('Sem contato');
    expect(wrapper.text()).toContain('Inativo');
    expect(wrapper.text()).not.toContain('Abrir clientes');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(ownerService.list).toHaveBeenCalledWith({ pageSize: 500, status: 'all' });
  });

  it('renders patients register report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-patients' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Animais');
    expect(wrapper.text()).toContain('Relatórios de Cadastros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/AnimaisRelatorio.htm');
    expect(wrapper.text()).toContain('Animais cadastrados');
    expect(wrapper.text()).toContain('Animais ativos');
    expect(wrapper.text()).toContain('Falecidos');
    expect(wrapper.text()).toContain('Com microchip');
    expect(wrapper.text()).toContain('Bolota');
    expect(wrapper.text()).toContain('A-100');
    expect(wrapper.text()).toContain('Canina');
    expect(wrapper.text()).toContain('SRD');
    expect(wrapper.text()).toContain('Fêmea');
    expect(wrapper.text()).toContain('985141000000001');
    expect(wrapper.text()).toContain('Thor');
    expect(wrapper.text()).toContain('Felina');
    expect(wrapper.text()).toContain('Sem raça');
    expect(wrapper.text()).toContain('Sem chip');
    expect(wrapper.text()).not.toContain('Abrir animais');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(patientService.list).toHaveBeenCalledWith({ pageSize: 500, status: 'all' });
  });

  it('renders suppliers register report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-suppliers' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Fornecedores');
    expect(wrapper.text()).toContain('Relatórios de Cadastros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/FornecedoresRelatorio.htm');
    expect(wrapper.text()).toContain('Registros cadastrados');
    expect(wrapper.text()).toContain('Despesas');
    expect(wrapper.text()).toContain('Com contato');
    expect(wrapper.text()).toContain('Fornecedor CVG');
    expect(wrapper.text()).toContain('FORNECEDOR');
    expect(wrapper.text()).toContain('Operacional');
    expect(wrapper.text()).toContain('Estoque · ESTOQUE');
    expect(wrapper.text()).toContain('compras@cvg.test');
    expect(wrapper.text()).toContain('Despesa Energia');
    expect(wrapper.text()).toContain('DESPESA');
    expect(wrapper.text()).toContain('ADM');
    expect(wrapper.text()).toContain('Sem Contato - Cadastrado pela NFE');
    expect(wrapper.text()).not.toContain('Abrir fornecedores');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(expensesCatalogService.list).toHaveBeenCalledWith({ pageSize: 500, sort: 'name', order: 'asc' });
  });

  it('renders deleted sales and counter sales register report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'deleted-sales-counter-sales' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Exclusão de Vendas e Comandas');
    expect(wrapper.text()).toContain('Relatórios de Cadastros');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/ExclusaoVendasComandasRelatorio.htm');
    expect(wrapper.text()).toContain('Exclusões registradas');
    expect(wrapper.text()).toContain('Valor cancelado');
    expect(wrapper.text()).toContain('Descontos cancelados');
    expect(wrapper.text()).toContain('Com saldo aberto');
    expect(wrapper.text()).toContain('CV-100');
    expect(wrapper.text()).toContain('owner-1');
    expect(wrapper.text()).toContain('user-caixa');
    expect(wrapper.text()).toContain('Cancelada por duplicidade');
    expect(wrapper.text()).not.toContain('CV-101');
    expect(wrapper.text()).not.toContain('Abrir auditoria');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(counterSalesService.list).toHaveBeenCalledWith({
      status: 'all',
      dateFrom: undefined,
      dateTo: undefined
    });
  });

  it('renders inventory stock report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'inventory-stock' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Estoque');
    expect(wrapper.text()).toContain('Relatórios de Estoque');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/EstoqueRelatorio.htm');
    expect(wrapper.text()).toContain('Itens em estoque');
    expect(wrapper.text()).toContain('Valor em estoque');
    expect(wrapper.text()).toContain('Abaixo do mínimo');
    expect(wrapper.text()).toContain('Lotes críticos');
    expect(wrapper.text()).toContain('MED-001');
    expect(wrapper.text()).toContain('Dipirona Gotas');
    expect(wrapper.text()).toContain('un');
    expect(wrapper.text()).toContain('1 a vencer');
    expect(wrapper.text()).toContain('VAC-010');
    expect(wrapper.text()).toContain('Regular');
    expect(wrapper.text()).not.toContain('Abrir estoque');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(inventoryService.list).toHaveBeenCalledWith();
    expect(inventoryService.listLots).toHaveBeenCalledWith();
  });

  it('renders inventory movements report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'inventory-movements' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Movimentações no Estoque');
    expect(wrapper.text()).toContain('Relatórios de Estoque');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/MovimentacaoEstoqueRelatorio.htm');
    expect(wrapper.text()).toContain('Movimentações registradas');
    expect(wrapper.text()).toContain('Entradas em lotes');
    expect(wrapper.text()).toContain('Saídas consumidas');
    expect(wrapper.text()).toContain('Valor movimentado');
    expect(wrapper.text()).toContain('Saída');
    expect(wrapper.text()).toContain('Atendimento');
    expect(wrapper.text()).toContain('user-estoque');
    expect(wrapper.text()).toContain('Prescrição');
    expect(wrapper.text()).toContain('Entrada/lote');
    expect(wrapper.text()).toContain('L-001');
    expect(wrapper.text()).toContain('Fornecedor CVG');
    expect(wrapper.text()).not.toContain('Abrir estoque');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(inventoryService.list).toHaveBeenCalledWith();
    expect(inventoryService.listLots).toHaveBeenCalledWith();
    expect(inventoryService.listConsumptions).toHaveBeenCalledWith();
  });

  it('renders inventory invoices report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'inventory-invoices' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Entrada de NF');
    expect(wrapper.text()).toContain('Relatórios de Estoque');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('Sistema/Relatorio/EntradaNotaFiscalRelatorio.htm');
    expect(wrapper.text()).toContain('Entradas registradas');
    expect(wrapper.text()).toContain('Fornecedores');
    expect(wrapper.text()).toContain('Lotes conferidos');
    expect(wrapper.text()).toContain('Valor em NF');
    expect(wrapper.text()).toContain('Em atenção');
    expect(wrapper.text()).toContain('NF-L-001');
    expect(wrapper.text()).toContain('Fornecedor CVG');
    expect(wrapper.text()).toContain('MED-001');
    expect(wrapper.text()).toContain('Dipirona Gotas');
    expect(wrapper.text()).toContain('Atenção');
    expect(wrapper.text()).toContain('NF-L-010');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('Conferida');
    expect(wrapper.text()).not.toContain('Abrir estoque');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(inventoryService.list).toHaveBeenCalledWith();
    expect(inventoryService.listLots).toHaveBeenCalledWith();
    expect(inventoryService.listConsumptions).not.toHaveBeenCalled();
  });

  it('renders inventory products report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'inventory-products' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Relatório de Produtos');
    expect(wrapper.text()).toContain('Relatórios de Estoque');
    expect(wrapper.text()).toContain('Solicitar Excel');
    expect(wrapper.text()).toContain('não traz URL legacy funcional explícita');
    expect(wrapper.text()).toContain('Produtos cadastrados');
    expect(wrapper.text()).toContain('Com saldo');
    expect(wrapper.text()).toContain('Abaixo do mínimo');
    expect(wrapper.text()).toContain('Com lote');
    expect(wrapper.text()).toContain('Valor em estoque');
    expect(wrapper.text()).toContain('MED-001');
    expect(wrapper.text()).toContain('Dipirona Gotas');
    expect(wrapper.text()).toContain('Abaixo do mínimo');
    expect(wrapper.text()).toContain('VAC-010');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('Com saldo');
    expect(wrapper.text()).toContain('Estoque operacional');
    expect(wrapper.text()).not.toContain('Abrir estoque');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(inventoryService.list).toHaveBeenCalledWith();
    expect(inventoryService.listLots).toHaveBeenCalledWith();
    expect(inventoryService.listConsumptions).not.toHaveBeenCalled();
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
