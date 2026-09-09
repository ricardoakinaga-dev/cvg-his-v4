import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockApiRequest = vi.fn();
const mockInitWidgets = vi.fn();
const mockGetSloReport = vi.fn();
const mockGetOperationalCoverage = vi.fn();
const mockListAuditEvents = vi.fn();
const mockGetCommercialDashboard = vi.fn();
const mockListInpatient = vi.fn();
const mockListDailyChargeWorklist = vi.fn();
const mockListInventory = vi.fn();
const mockListLaboratoryOrders = vi.fn();

const mockAppStore = {
  recentRoutes: [] as Array<{ path: string; label: string; icon?: string }>,
  favoriteRoutes: [] as string[]
};

vi.mock('@/services/api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

vi.mock('@/stores/app', () => ({
  useAppStore: () => mockAppStore
}));

vi.mock('@/stores/widgets', () => ({
  useWidgetStore: () => ({
    initWidgets: mockInitWidgets
  })
}));

vi.mock('@/services/health', () => ({
  healthService: {
    getSloReport: (...args: unknown[]) => mockGetSloReport(...args)
  }
}));

vi.mock('@/services/audit', () => ({
  auditService: {
    getOperationalCoverage: (...args: unknown[]) => mockGetOperationalCoverage(...args),
    listEvents: (...args: unknown[]) => mockListAuditEvents(...args)
  }
}));

vi.mock('@/services/counterSales', () => ({
  counterSalesService: {
    getCommercialDashboard: (...args: unknown[]) => mockGetCommercialDashboard(...args)
  }
}));

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    list: (...args: unknown[]) => mockListInpatient(...args),
    listDailyChargeWorklist: (...args: unknown[]) => mockListDailyChargeWorklist(...args)
  }
}));

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: (...args: unknown[]) => mockListInventory(...args)
  }
}));

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listOrders: (...args: unknown[]) => mockListLaboratoryOrders(...args)
  }
}));

function currentMonthDayDate(year: string): string {
  return `${year}-${new Date().toISOString().slice(5, 10)}`;
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppStore.recentRoutes = [];
    mockAppStore.favoriteRoutes = [];
    mockApiRequest.mockReset();
    mockInitWidgets.mockReset();
    mockGetSloReport.mockReset();
    mockGetOperationalCoverage.mockReset();
    mockListAuditEvents.mockReset();
    mockGetCommercialDashboard.mockReset();
    mockListInpatient.mockReset();
    mockListDailyChargeWorklist.mockReset();
    mockListInventory.mockReset();
    mockListLaboratoryOrders.mockReset();
    mockGetSloReport.mockResolvedValue({
      generatedAt: '2026-05-28T12:00:00Z',
      snapshot: {
        requestCount5m: 120,
        requestCount1h: 980,
        p95LatencyMs: 184,
        p99LatencyMs: 315,
        availabilityPercent: 99.95,
        errorRatePercent: 0.1
      },
      report: {
        overallStatus: 'degraded',
        errorBudgetExhausted: false,
        slos: []
      },
      runbook: {
        metrics: '/metrics',
        readiness: '/health/ready',
        liveness: '/health/live'
      }
    });
    mockGetOperationalCoverage.mockResolvedValue({
      generatedAt: '2026-05-28T12:00:00Z',
      accountId: 'acc-1',
      totalEvents: 42,
      eventsByModule: { audit: 10, lgpd: 4 },
      eventsByRiskLevel: { low: 20, medium: 12, high: 10 },
      coveredRequirements: 5,
      missingRequirements: 1,
      coveragePercent: 83.3,
      requirements: [
        {
          id: 'inventory-adjustment',
          module: 'inventory',
          action: 'movement.adjusted',
          minimumRiskLevel: 'medium',
          description: 'Ajuste de estoque precisa gerar trilha auditável.',
          covered: false
        }
      ]
    });
    mockListAuditEvents.mockResolvedValue([
      {
        eventId: 'audit-report-retry-1',
        occurredAt: '2026-05-28T12:01:00Z',
        actorId: 'user-1',
        accountId: 'acc-1',
        module: 'reports',
        action: 'retry_report_schedule_delivery',
        entityType: 'report-schedule-delivery',
        entityId: 'delivery-1',
        correlationId: 'corr-1',
        payloadSummary: 'Report schedule delivery delivery-1 retried for diretoria@cvg.test',
        riskLevel: 'medium'
      },
      {
        eventId: 'audit-report-retry-2',
        occurredAt: '2026-05-28T12:02:00Z',
        actorId: 'user-1',
        accountId: 'acc-1',
        module: 'reports',
        action: 'retry_report_schedule_delivery',
        entityType: 'report-schedule-delivery',
        entityId: 'delivery-2',
        correlationId: 'corr-2',
        payloadSummary: 'Report schedule delivery delivery-2 retried for financeiro@cvg.test',
        riskLevel: 'medium'
      }
    ]);
    mockGetCommercialDashboard.mockResolvedValue({
      openSales: 3,
      closedToday: 8,
      grossRevenueToday: 1420.7,
      netRevenueToday: 1280.45,
      avgTicket: 160.05,
      salesByPaymentMethod: [],
      topProducts: [],
      topServices: [],
      quotesIssued: 2,
      quotesConverted: 1,
      lowStockAlerts: []
    });
    mockListInpatient.mockResolvedValue([
      {
        id: 'stay-1',
        accountId: 'acc-1',
        encounterId: 'enc-1',
        patientId: 'patient-1',
        unit: 'Internação',
        ward: 'Canil',
        bed: 'C01',
        status: 'admitted',
        admittedAt: '2026-05-28T08:00:00Z',
        updatedAt: '2026-05-28T08:00:00Z'
      },
      {
        id: 'stay-2',
        accountId: 'acc-1',
        encounterId: 'enc-2',
        patientId: 'patient-2',
        unit: 'UTI',
        ward: 'Felinos',
        bed: 'F01',
        status: 'stable',
        admittedAt: '2026-05-28T09:00:00Z',
        updatedAt: '2026-05-28T09:00:00Z'
      }
    ]);
    mockListDailyChargeWorklist.mockResolvedValue({
      items: [],
      totalPendingAmount: 450,
      totalBilledAmount: 900
    });
    mockListInventory.mockResolvedValue([
      {
        id: 'item-1',
        accountId: 'acc-1',
        sku: 'MED-001',
        name: 'Dipirona',
        unit: 'UN',
        onHandQuantity: 0,
        reorderLevel: 5,
        unitCostAmount: 12,
        createdAt: '2026-05-28T08:00:00Z',
        updatedAt: '2026-05-28T08:00:00Z'
      },
      {
        id: 'item-2',
        accountId: 'acc-1',
        sku: 'MED-002',
        name: 'Soro',
        unit: 'UN',
        onHandQuantity: 4,
        reorderLevel: 5,
        unitCostAmount: 22,
        createdAt: '2026-05-28T08:00:00Z',
        updatedAt: '2026-05-28T08:00:00Z'
      }
    ]);
    mockListLaboratoryOrders.mockResolvedValue([
      {
        id: 'lab-order-1',
        accountId: 'acc-1',
        encounterId: 'enc-1',
        patientId: 'patient-1',
        examType: 'HEM',
        reason: 'Hemograma pré-operatório',
        status: 'requested',
        createdAt: '2026-05-28T08:00:00Z',
        updatedAt: '2026-05-28T08:00:00Z'
      },
      {
        id: 'lab-order-2',
        accountId: 'acc-1',
        encounterId: 'enc-2',
        patientId: 'patient-2',
        examType: 'BIO',
        reason: 'Bioquímica',
        status: 'collected',
        collectedAt: '2026-05-28T09:00:00Z',
        createdAt: '2026-05-28T08:30:00Z',
        updatedAt: '2026-05-28T09:00:00Z'
      },
      {
        id: 'lab-order-3',
        accountId: 'acc-1',
        encounterId: 'enc-3',
        patientId: 'patient-3',
        examType: 'URIN',
        reason: 'Urinálise',
        status: 'resulted',
        resultSummary: 'Sem alterações',
        createdAt: '2026-05-28T07:00:00Z',
        updatedAt: '2026-05-28T10:00:00Z'
      }
    ]);
  });

  it('loads the Vetus-like home panels allowed by the current session permissions', async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          access: {
            permissionCodes: [
              'counter_sale.read',
              'owners.read',
              'patients.read',
              'scheduling.read',
              'product.read',
              'audit.read',
              'inpatient.read',
              'inventory.read',
              'diagnostics.read',
              'integrations.read'
            ],
            roleCodes: ['admin']
          }
        });
      }

      if (path === '/counter-sales?status=open') {
        return Promise.resolve({ items: [{ id: 'sale-open-tile' }, { id: 'sale-open-tile-2' }] });
      }

      if (typeof path === 'string' && path.startsWith('/counter-sales?status=open&dateFrom=')) {
        return Promise.resolve({
          items: [
            {
              id: 'sale-open-1',
              number: 'CS-000001',
              ownerId: null,
              balanceDue: 202.52,
              createdAt: '2026-04-25T10:00:00.000Z'
            }
          ]
        });
      }

      if (path === '/counter-sales?status=closed') {
        return Promise.resolve({ items: [{ id: 'sale-closed-1' }] });
      }

      if (path === '/owners') {
        return Promise.resolve({
          items: [
            {
              id: 'owner-1',
              fullName: 'Cliente Aniversariante',
              profile: { birthDate: currentMonthDayDate('1990') }
            },
            { id: 'owner-2', fullName: 'Cliente Sem Aniversário' }
          ]
        });
      }

      if (path === '/patients') {
        return Promise.resolve({
          items: [
            {
              id: 'patient-1',
              name: 'Animal Aniversariante',
              primaryOwnerId: 'owner-1',
              birthDateApproximate: currentMonthDayDate('2020')
            }
          ]
        });
      }

      if (path === '/appointments') {
        return Promise.resolve({ total: 3, items: [] });
      }

      if (path === '/products') {
        return Promise.resolve({ total: 4, items: [] });
      }

      return Promise.reject(new Error(`Unexpected path: ${path}`));
    });

    const DashboardPage = (await import('../DashboardPage.vue')).default;
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>'
          }
        }
      }
    });

    await flushPromises();

    expect(mockApiRequest).toHaveBeenCalledWith('/auth/session');
    expect(mockApiRequest).toHaveBeenCalledWith('/counter-sales?status=open');
    expect(mockApiRequest).toHaveBeenCalledWith('/counter-sales?status=closed');
    expect(mockApiRequest).toHaveBeenCalledWith('/owners');
    expect(mockApiRequest).toHaveBeenCalledWith('/patients');
    expect(mockApiRequest).not.toHaveBeenCalledWith('/queue');
    expect(mockApiRequest).toHaveBeenCalledWith('/appointments');
    expect(mockApiRequest).toHaveBeenCalledWith('/products');
    expect(
      mockApiRequest.mock.calls.some(
        ([path]) =>
          typeof path === 'string' && path.startsWith('/counter-sales?status=open&dateFrom=')
      )
    ).toBe(true);

    expect(wrapper.text()).toContain('Início');
    expect(wrapper.text()).toContain('Ver fila');
    expect(wrapper.find('[data-testid="session-priority"]').text()).toContain('Administração');
    expect(wrapper.text()).toContain('Indicadores do plantão');
    expect(wrapper.text()).toContain('Atendimento e financeiro');
    expect(wrapper.text()).toContain('Central executiva Premium');
    expect(wrapper.text()).toContain('SLO, auditoria operacional e próximos focos');
    expect(wrapper.text()).toContain('Operação degradada');
    expect(wrapper.text()).toContain('Degradado');
    expect(wrapper.text()).toContain('83,3%');
    expect(wrapper.text()).toContain('42');
    expect(wrapper.text()).toContain('Alertas resolvidos');
    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('Reprocessamentos auditados de entregas');
    expect(wrapper.text()).toContain('SLO degradado em observação');
    expect(wrapper.text()).toContain('inventory · movement.adjusted');
    expect(wrapper.text()).toContain('Lentes executivas');
    expect(wrapper.text()).toContain('Gestão clínica');
    const normalizedText = wrapper.text().replace(/\u00a0/g, ' ');
    expect(normalizedText).toContain('2 exame(s) pendente(s)');
    expect(normalizedText).toContain('R$ 450,00 em diárias pendentes');
    expect(wrapper.text()).toContain('Financeiro hoje');
    expect(normalizedText).toContain('R$ 1.280,45');
    expect(wrapper.text()).toContain('Operação comercial');
    expect(normalizedText).toContain('R$ 160,05 ticket médio');
    expect(wrapper.text()).toContain('Estoque crítico');
    expect(wrapper.text()).toContain('1 SKU(s) zerados');
    expect(wrapper.text()).toContain('Roteiro operacional Premium');
    expect(wrapper.text()).toContain('Demo, piloto e suporte com rotas reais');
    expect(wrapper.text()).toContain('Entrada pela recepção');
    expect(wrapper.text()).toContain('Busca federada');
    expect(wrapper.text()).toContain('Cockpit 360');
    expect(wrapper.text()).toContain('Auditoria e evidências');
    expect(wrapper.text()).toContain('SLO e suporte');
    expect(wrapper.text()).toContain('Agenda e lembretes');
    expect(wrapper.text()).toContain('Pendências do início');
    expect(wrapper.text()).toContain('Agenda com registros para revisar');
    expect(wrapper.text()).toContain('Comandas abertas aguardando cobrança');
    expect(wrapper.text()).toContain('Aniversariantes do dia');
    expect(wrapper.text()).toContain('Comandas abertas');
    expect(wrapper.text()).toContain('A receber');
    expect(wrapper.text()).toContain('Clientes');
    expect(wrapper.text()).toContain('Animais');
    expect(wrapper.text()).toContain('Produtos');
    expect(wrapper.text()).toContain('Vendas');
    expect(normalizedText).toContain('Total a pagar: R$ 202,52');
    expect(wrapper.text()).toContain('Cliente Aniversariante');
    expect(wrapper.text()).toContain('Animal Aniversariante');
    expect(wrapper.text()).not.toContain('Contexto');
    expect(mockGetSloReport).toHaveBeenCalledTimes(1);
    expect(mockGetOperationalCoverage).toHaveBeenCalledTimes(1);
    expect(mockListAuditEvents).toHaveBeenCalledWith({
      module: 'reports',
      entityTypes: ['report-schedule-delivery'],
      limit: 200
    });
    expect(mockGetCommercialDashboard).toHaveBeenCalledTimes(1);
    expect(mockListInpatient).toHaveBeenCalledWith({ includeDischarged: false });
    expect(mockListDailyChargeWorklist).toHaveBeenCalledWith({ status: 'pending' });
    expect(mockListInventory).toHaveBeenCalledTimes(1);
    expect(mockListLaboratoryOrders).toHaveBeenCalledTimes(1);
    expect(mockInitWidgets).toHaveBeenCalledTimes(1);
  });

  it('hides persisted routes until session permissions are known and filters revoked routes', async () => {
    const persistedRoutePaths = [
      '/',
      '/audit',
      '/access-control',
      '/api-client',
      '/appointments',
      '/triage',
      '/inpatient',
      '/medical-records',
      '/counter-sales',
      '/owners',
      '/patients',
      '/encounters',
      '/laboratory/orders',
      '/reports/inventory',
      '/dashboards/financial',
      '/unknown'
    ];
    mockAppStore.recentRoutes = persistedRoutePaths.map((path) => ({
      path,
      label: `persisted ${path}`,
      icon: 'route'
    }));
    mockAppStore.favoriteRoutes = [...persistedRoutePaths];

    let resolveSession!: (value: {
      access: { permissionCodes: string[]; roleCodes: string[] };
    }) => void;
    const sessionResponse = new Promise<{
      access: { permissionCodes: string[]; roleCodes: string[] };
    }>((resolve) => {
      resolveSession = resolve;
    });
    mockApiRequest.mockImplementation((path: string) => {
      if (path === '/auth/session') return sessionResponse;
      if (path === '/appointments') return Promise.resolve({ total: 0, items: [] });
      return Promise.reject(new Error(`Unexpected path: ${path}`));
    });

    const DashboardPage = (await import('../DashboardPage.vue')).default;
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :data-route="to"><slot /></a>'
          }
        }
      }
    });

    expect(wrapper.findAll('.link-list__item')).toHaveLength(0);

    resolveSession({
      access: { permissionCodes: ['scheduling.read'], roleCodes: ['reception'] }
    });
    await flushPromises();

    const persistedLinks = wrapper.findAll('.link-list__item');
    const renderedRoutes = persistedLinks.map((link) => link.attributes('data-route'));
    expect(renderedRoutes.filter((path) => path === '/appointments')).toHaveLength(2);
    expect(renderedRoutes.filter((path) => path === '/')).toHaveLength(2);
    expect(renderedRoutes).not.toEqual(
      expect.arrayContaining([
        '/audit',
        '/access-control',
        '/api-client',
        '/triage',
        '/inpatient',
        '/medical-records',
        '/counter-sales',
        '/owners',
        '/patients',
        '/encounters',
        '/laboratory/orders',
        '/reports/inventory',
        '/dashboards/financial',
        '/unknown'
      ])
    );
    expect(wrapper.text()).not.toContain('persisted /audit');
    expect(wrapper.text()).not.toContain('persisted /unknown');
  });

  it('does not call forbidden executive sources for reception-only permissions', async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          access: {
            permissionCodes: ['owners.read', 'patients.read', 'scheduling.read'],
            roleCodes: ['reception']
          }
        });
      }
      if (path === '/owners' || path === '/patients' || path === '/appointments') {
        return Promise.resolve({ items: [], total: 0 });
      }
      return Promise.reject(new Error(`Unexpected path: ${path}`));
    });

    const DashboardPage = (await import('../DashboardPage.vue')).default;
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: { RouterLink: { props: ['to'], template: '<a><slot /></a>' } }
      }
    });
    await flushPromises();

    expect(mockGetSloReport).not.toHaveBeenCalled();
    expect(mockGetOperationalCoverage).not.toHaveBeenCalled();
    expect(mockListAuditEvents).not.toHaveBeenCalled();
    expect(mockGetCommercialDashboard).not.toHaveBeenCalled();
    expect(mockListInpatient).not.toHaveBeenCalled();
    expect(mockListDailyChargeWorklist).not.toHaveBeenCalled();
    expect(mockListInventory).not.toHaveBeenCalled();
    expect(mockListLaboratoryOrders).not.toHaveBeenCalled();
    expect(wrapper.find('[aria-label="Central executiva Premium"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="session-priority"]').text()).toContain('Recepção');
    expect(wrapper.find('.premium-operation-guide').text()).not.toContain('Auditoria e evidências');
    expect(wrapper.find('.premium-operation-guide').text()).not.toContain('SLO e suporte');
  });

  it('does not mount operational panels without the corresponding session permission', async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          access: { permissionCodes: ['audit.read'], roleCodes: ['admin'] }
        });
      }
      return Promise.reject(new Error(`Unexpected path: ${path}`));
    });

    const DashboardPage = (await import('../DashboardPage.vue')).default;
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: { RouterLink: { props: ['to'], template: '<a><slot /></a>' } }
      }
    });
    await flushPromises();

    expect(wrapper.find('.home-panels').exists()).toBe(false);
    const panelTitles = wrapper
      .findAll('.home-panels .panel-card__title')
      .map((title) => title.text());
    expect(panelTitles).not.toEqual(
      expect.arrayContaining(['Comandas abertas', 'Agenda e lembretes', 'Aniversariantes do dia'])
    );
  });

  it('prioritizes clinical work from the current clinical permission set', async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          access: {
            permissionCodes: ['owners.read', 'patients.read', 'encounters.read', 'triage.read'],
            roleCodes: ['nurse']
          }
        });
      }
      if (path === '/owners' || path === '/patients') {
        return Promise.resolve({ items: [], total: 0 });
      }
      return Promise.reject(new Error(`Unexpected path: ${path}`));
    });

    const DashboardPage = (await import('../DashboardPage.vue')).default;
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: { RouterLink: { props: ['to'], template: '<a><slot /></a>' } }
      }
    });
    await flushPromises();

    const priority = wrapper.find('[data-testid="session-priority"]');
    expect(priority.text()).toContain('O que fazer agora');
    expect(priority.text()).toContain('Enfermagem');
    expect(priority.text()).toContain('Comece pela triagem');
    expect(priority.text()).toContain('Abrir triagem');
    expect(wrapper.find('.domain-shortcuts').text()).toContain('Triagem');
    expect(wrapper.find('.domain-shortcuts').text()).not.toContain('Comandas');
    expect(wrapper.find('.premium-operation-guide').text()).not.toContain('Auditoria e evidências');
    expect(wrapper.find('.premium-operation-guide').text()).not.toContain('SLO e suporte');
    expect(mockGetCommercialDashboard).not.toHaveBeenCalled();
  });

  it('prioritizes veterinarian clinical work with the canonical veterinarian role', async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          access: {
            permissionCodes: [
              'owners.read',
              'patients.read',
              'encounters.read',
              'medical-records.read'
            ],
            roleCodes: ['veterinarian']
          }
        });
      }
      if (path === '/owners' || path === '/patients') {
        return Promise.resolve({ items: [], total: 0 });
      }
      return Promise.reject(new Error(`Unexpected path: ${path}`));
    });

    const DashboardPage = (await import('../DashboardPage.vue')).default;
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :data-route="to"><slot /></a>'
          }
        }
      }
    });
    await flushPromises();

    const priority = wrapper.find('[data-testid="session-priority"]');
    expect(priority.text()).toContain('Médico-veterinário');
    expect(priority.text()).toContain('Revise o próximo atendimento clínico');
    expect(priority.text()).toContain('Abrir prontuários');
    expect(priority.find('[data-route="/medical-records"]').exists()).toBe(true);
    expect(priority.text()).not.toContain('doctor');
  });

  it('prioritizes finance without exposing clinical shortcuts', async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          access: {
            permissionCodes: ['billing.read', 'billing.manage', 'fiscal.read', 'counter_sale.read'],
            roleCodes: ['finance']
          }
        });
      }
      if (path === '/counter-sales?status=open' || path === '/counter-sales?status=closed') {
        return Promise.resolve({ items: [] });
      }
      if (typeof path === 'string' && path.startsWith('/counter-sales?status=open&dateFrom=')) {
        return Promise.resolve({ items: [] });
      }
      return Promise.reject(new Error(`Unexpected path: ${path}`));
    });

    const DashboardPage = (await import('../DashboardPage.vue')).default;
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: { RouterLink: { props: ['to'], template: '<a><slot /></a>' } }
      }
    });
    await flushPromises();

    const priority = wrapper.find('[data-testid="session-priority"]');
    expect(priority.text()).toContain('Financeiro');
    expect(priority.text()).toContain('Abrir dashboard financeiro');
    expect(wrapper.find('.domain-shortcuts').text()).toContain('Comandas');
    expect(wrapper.text()).not.toContain('Agenda e lembretes');
    expect(wrapper.text()).not.toContain('Agenda com registros para revisar');
    expect(wrapper.find('.domain-shortcuts').text()).not.toContain('Triagem');
    expect(wrapper.find('.domain-shortcuts').text()).not.toContain('Internação');
    expect(mockApiRequest).not.toHaveBeenCalledWith('/appointments');
    expect(wrapper.find('.premium-operation-guide').text()).not.toContain('Auditoria e evidências');
    expect(wrapper.find('.premium-operation-guide').text()).not.toContain('SLO e suporte');
    expect(mockGetSloReport).not.toHaveBeenCalled();
    expect(mockGetOperationalCoverage).not.toHaveBeenCalled();
  });

  it('ignores a stale session and data response after a newer dashboard refresh', async () => {
    let resolveFirstSession!: (value: unknown) => void;
    let resolveSecondSession!: (value: unknown) => void;
    const firstSession = new Promise((resolve) => {
      resolveFirstSession = resolve;
    });
    const secondSession = new Promise((resolve) => {
      resolveSecondSession = resolve;
    });
    let sessionRequest = 0;

    mockApiRequest.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        sessionRequest += 1;
        return sessionRequest === 1 ? firstSession : secondSession;
      }
      return Promise.resolve({ items: [], total: 0 });
    });

    const DashboardPage = (await import('../DashboardPage.vue')).default;
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: {
          AppPageHeader: {
            props: ['secondaryActions', 'primaryAction'],
            template:
              '<header><button v-for="action in secondaryActions" :key="action.key" @click="action.onClick">{{ action.label }}</button></header>'
          },
          RouterLink: { props: ['to'], template: '<a :data-route="to"><slot /></a>' }
        }
      }
    });

    const refresh = wrapper.findAll('button').find((button) => button.text() === 'Atualizar');
    expect(refresh).toBeDefined();
    await refresh!.trigger('click');

    resolveSecondSession({
      access: {
        permissionCodes: ['billing.read', 'billing.manage', 'counter_sale.read'],
        roleCodes: ['finance']
      }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).not.toContain('Agenda e lembretes');
    expect(wrapper.text()).not.toContain('Agenda com registros para revisar');
    expect(mockApiRequest).not.toHaveBeenCalledWith('/appointments');

    resolveFirstSession({
      access: {
        permissionCodes: [
          'audit.read',
          'owners.read',
          'patients.read',
          'scheduling.read',
          'counter_sale.read'
        ],
        roleCodes: ['admin']
      }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).not.toContain('Agenda e lembretes');
    expect(wrapper.text()).not.toContain('Central executiva Premium');
    expect(mockApiRequest).not.toHaveBeenCalledWith('/appointments');
  });

  it('keeps unavailable commercial reads distinct from a real zero value', async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          access: { permissionCodes: ['counter_sale.read', 'audit.read'] }
        });
      }
      if (path === '/counter-sales?status=open' || path === '/counter-sales?status=closed') {
        return Promise.resolve({ items: [] });
      }
      if (typeof path === 'string' && path.startsWith('/counter-sales?status=open&dateFrom=')) {
        return Promise.resolve({ items: [] });
      }
      return Promise.reject(new Error(`Unexpected path: ${path}`));
    });
    mockGetCommercialDashboard.mockRejectedValue(new Error('commercial source unavailable'));

    const DashboardPage = (await import('../DashboardPage.vue')).default;
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: { RouterLink: { props: ['to'], template: '<a><slot /></a>' } }
      }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Financeiro hoje');
    expect(wrapper.text()).toContain('Leitura comercial indisponível');
    expect(wrapper.text()).not.toContain('R$ 0,00 ticket médio');
  });
});
