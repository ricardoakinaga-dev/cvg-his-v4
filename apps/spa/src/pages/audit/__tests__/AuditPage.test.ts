import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockListEvents = vi.fn();
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
    listEvents: (...args: unknown[]) => mockListEvents(...args)
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
  }
];

describe('AuditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.mockReturnValue({ query: {} });
    mockListEvents.mockResolvedValue(auditEvents);
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

