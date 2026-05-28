import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockListEvents = vi.fn();
const mockGetOperationalCoverage = vi.fn();
const mockRoute = vi.fn();

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => mockRoute()
  };
});

vi.mock('@/services/audit', () => ({
  auditService: {
    listEvents: (...args: unknown[]) => mockListEvents(...args),
    getOperationalCoverage: (...args: unknown[]) => mockGetOperationalCoverage(...args)
  }
}));

const auditEvents = [
  {
    id: 'evt-1',
    occurredAt: '2026-04-22T12:00:00Z',
    actorId: 'user-1',
    module: 'integrations',
    action: 'webhook.updated',
    entityType: 'webhook',
    entityId: 'wh-1',
    correlationId: 'corr-1',
    riskLevel: 'high',
    payloadSummary: 'Webhook sensível alterado'
  },
  {
    id: 'evt-2',
    occurredAt: '2026-04-22T10:00:00Z',
    actorId: 'user-2',
    module: 'access_control',
    action: 'role.updated',
    entityType: 'role',
    entityId: 'role-1',
    correlationId: 'corr-1',
    riskLevel: 'medium',
    payloadSummary: 'Permissões da role revisadas'
  },
  {
    id: 'evt-3',
    occurredAt: '2026-04-21T09:00:00Z',
    actorId: 'user-3',
    module: 'notifications',
    action: 'campaign.previewed',
    entityType: 'campaign',
    entityId: 'camp-1',
    correlationId: 'corr-2',
    riskLevel: 'low',
    payloadSummary: 'Prévia operacional consultada'
  },
  {
    id: 'evt-4',
    occurredAt: '2026-05-28T09:00:00Z',
    actorId: 'user-reports',
    module: 'reports',
    action: 'report_schedule_delivery_alerts_read',
    entityType: 'report-schedule-delivery-alert',
    entityId: 'schedule-1',
    correlationId: 'corr-reports',
    riskLevel: 'high',
    payloadSummary: 'Report schedule delivery alerts inspected for schedule-1 alerts=1'
  }
];

const coverageReport = {
  generatedAt: '2026-05-28T12:00:00Z',
  accountId: 'acc-1',
  totalEvents: 3,
  eventsByModule: { integrations: 1, access_control: 1, notifications: 1 },
  eventsByRiskLevel: { low: 1, medium: 1, high: 1 },
  coveredRequirements: 1,
  missingRequirements: 1,
  coveragePercent: 50,
  requirements: [
    {
      id: 'lgpd-personal-export',
      module: 'lgpd',
      action: 'personal_data_exported',
      minimumRiskLevel: 'high',
      description: 'Exportacao de dados pessoais precisa ser auditada.',
      covered: true,
      evidenceEventId: 'evt-1',
      evidenceOccurredAt: '2026-04-22T12:00:00Z'
    },
    {
      id: 'audit-read',
      module: 'audit',
      action: 'read',
      entityType: 'audit-event',
      minimumRiskLevel: 'high',
      description: 'Leitura do proprio log de auditoria precisa gerar evento.',
      covered: false
    },
    {
      id: 'reports-delivery-alerts-read',
      module: 'reports',
      action: 'report_schedule_delivery_alerts_read',
      entityType: 'report-schedule-delivery-alert',
      minimumRiskLevel: 'high',
      description: 'Alertas recorrentes de entrega de relatorios precisam ser auditados.',
      covered: true,
      evidenceEventId: 'evt-report-alert',
      evidenceOccurredAt: '2026-05-28T09:00:00Z'
    }
  ]
};

describe('AuditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.mockReturnValue({ query: {} });
    mockListEvents.mockResolvedValue(auditEvents);
    mockGetOperationalCoverage.mockResolvedValue(coverageReport);
  });

  it('renders timeline/list with risk insights after loading', async () => {
    const AuditPage = (await import('../AuditPage.vue')).default;
    const wrapper = mount(AuditPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Auditoria');
    expect(wrapper.text()).toContain('Eventos auditados');
    expect(wrapper.text()).toContain('Webhook sensível alterado');
    expect(wrapper.text()).toContain('Permissões da role revisadas');
    expect(wrapper.text()).toContain('Risco alto');
    expect(wrapper.text()).toContain('Ator recorrente');
    expect(wrapper.text()).toContain('Correlação reutilizada');
    expect(wrapper.text()).toContain('Cobertura operacional Enterprise');
    expect(wrapper.text()).toContain('lgpd · personal_data_exported');
    expect(wrapper.text()).toContain('audit · read');
    expect(wrapper.text()).toContain('reports · report_schedule_delivery_alerts_read');
    expect(wrapper.text()).toContain('Alertas de relatórios');
    expect(wrapper.text()).toContain('50%');
  });

  it('filters directly to audited report delivery alerts from the operations summary', async () => {
    const AuditPage = (await import('../AuditPage.vue')).default;
    const wrapper = mount(AuditPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Report schedule delivery alerts inspected');
    await wrapper.findAll('button').find((button) => button.text() === 'Filtrar alertas')?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Filtro ativo: alertas de relatórios');
    expect(wrapper.text()).toContain('Report schedule delivery alerts inspected');
    expect(wrapper.text()).not.toContain('Webhook sensível alterado');
    expect((wrapper.findAll('input')[1].element as HTMLInputElement).value).toBe('report-schedule-delivery-alert');
    const link = wrapper.findAll('a').find((anchor) => anchor.text() === 'Abrir agendamento');
    expect(link?.attributes('href')).toContain('/reports/engine?scheduleId=schedule-1');
  });

  it('filters events by risk level', async () => {
    const AuditPage = (await import('../AuditPage.vue')).default;
    const wrapper = mount(AuditPage);

    await flushPromises();

    const select = wrapper.find('select');
    await select.setValue('high');
    await flushPromises();

    expect(wrapper.text()).toContain('Webhook sensível alterado');
    expect(wrapper.text()).not.toContain('Permissões da role revisadas');
    expect(wrapper.text()).not.toContain('Prévia operacional consultada');
  });

  it('filters events by free-text query', async () => {
    const AuditPage = (await import('../AuditPage.vue')).default;
    const wrapper = mount(AuditPage);

    await flushPromises();

    const input = wrapper.find('input');
    await input.setValue('role');
    await flushPromises();

    expect(wrapper.text()).toContain('Permissões da role revisadas');
    expect(wrapper.text()).not.toContain('Webhook sensível alterado');
  });

  it('shows empty state when no events match the filters', async () => {
    const AuditPage = (await import('../AuditPage.vue')).default;
    const wrapper = mount(AuditPage);

    await flushPromises();

    const input = wrapper.find('input');
    await input.setValue('nao-existe');
    await flushPromises();

    expect(wrapper.text()).toContain('Nenhum evento de auditoria encontrado');
  });

  it('hydrates filters from route query for deep financial audit navigation', async () => {
    mockRoute.mockReturnValueOnce({
      query: {
        q: 'role',
        correlationId: 'corr-1',
        entity: 'role-1',
        origin: '/cost-centers?correlationId=corr-1',
        originLabel: 'Voltar para Centros de Custo'
      }
    });

    const AuditPage = (await import('../AuditPage.vue')).default;
    const wrapper = mount(AuditPage);

    await flushPromises();

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('role');
    expect(wrapper.text()).toContain('Permissões da role revisadas');
    expect(wrapper.text()).not.toContain('Webhook sensível alterado');
    expect(wrapper.text()).toContain('Voltar para Centros de Custo');
  });

  it('shows service error when loading fails', async () => {
    mockListEvents.mockRejectedValueOnce(new Error('Falha ao carregar auditoria remota'));

    const AuditPage = (await import('../AuditPage.vue')).default;
    const wrapper = mount(AuditPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Falha ao carregar auditoria remota');
  });
});
