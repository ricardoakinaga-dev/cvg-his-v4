import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockListAuditEvents = vi.fn();
const mockRoute = vi.fn();

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => mockRoute()
  };
});

vi.mock('@/services/costCentersCatalog', () => ({
  costCentersCatalogService: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args)
  }
}));

vi.mock('@/services/audit', () => ({
  auditService: {
    listEvents: (...args: unknown[]) => mockListAuditEvents(...args)
  }
}));

describe('CostCentersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.mockReturnValue({ query: {} });
    mockList.mockResolvedValue({
      items: [
        {
          code: 'CLI-ATD',
          name: 'Atendimento Clínico',
          kind: 'Operacional',
          owner: 'Coordenação Assistencial',
          description: 'Receita e custo ligados a consultas, procedimentos e jornada ambulatorial.'
        },
        {
          code: 'ESTOQUE',
          name: 'Suprimentos e Estoque',
          kind: 'Administrativo',
          owner: 'Backoffice',
          description: 'Rateio de reposição, compras e consumo estrutural do hospital.'
        }
      ],
      page: 1,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
      sort: 'name',
      order: 'asc'
    });
    mockListAuditEvents.mockResolvedValue([
      {
        id: 'audit-cc-1',
        occurredAt: '2026-04-22T12:15:00Z',
        actorId: 'user-1',
        module: 'billing',
        action: 'update_cost_center_catalog_item',
        entityType: 'cost-center-catalog',
        entityId: 'CLI-ATD',
        correlationId: 'corr-cc-1',
        riskLevel: 'medium',
        payloadSummary: 'Cost center catalog item updated | code=CLI-ATD | name=Atendimento Clínico Premium | kind=Operacional | owner=Coordenação Assistencial | changes=name: Atendimento Clínico → Atendimento Clínico Premium'
      },
      {
        id: 'audit-cc-2',
        occurredAt: '2026-04-22T12:10:00Z',
        actorId: 'user-2',
        module: 'billing',
        action: 'create_cost_center_catalog_item',
        entityType: 'cost-center-catalog',
        entityId: 'ADM-FIN',
        correlationId: 'corr-cc-1',
        riskLevel: 'medium',
        payloadSummary: 'Cost center catalog item created | code=ADM-FIN | name=Administrativo Financeiro | kind=Administrativo | owner=Gerência Financeira'
      },
      {
        id: 'audit-cc-3',
        occurredAt: '2026-04-22T12:00:00Z',
        actorId: 'user-3',
        module: 'integrations',
        action: 'webhook.updated',
        entityType: 'webhook',
        entityId: 'wh-1',
        correlationId: 'corr-ext-1',
        riskLevel: 'high',
        payloadSummary: 'Webhook sensível alterado'
      }
    ]);
    mockCreate.mockImplementation(async (payload) => ({ ...payload }));
    mockUpdate.mockImplementation(async (_code, payload) => ({ ...payload }));
    mockRemove.mockResolvedValue({ ok: true });
  });

  it('loads cost centers from backend, paginates, exposes grouped finance audit trail and supports CRUD actions', async () => {
    mockList
      .mockResolvedValueOnce({
        items: [
          {
            code: 'CLI-ATD',
            name: 'Atendimento Clínico',
            kind: 'Operacional',
            owner: 'Coordenação Assistencial',
            description: 'Receita e custo ligados a consultas, procedimentos e jornada ambulatorial.'
          },
          {
            code: 'ESTOQUE',
            name: 'Suprimentos e Estoque',
            kind: 'Administrativo',
            owner: 'Backoffice',
            description: 'Rateio de reposição, compras e consumo estrutural do hospital.'
          }
        ],
        page: 1,
        pageSize: 2,
        totalItems: 3,
        totalPages: 2,
        sort: 'name',
        order: 'asc'
      })
      .mockResolvedValueOnce({
        items: [
          {
            code: 'LAB-OP',
            name: 'Laboratório',
            kind: 'Operacional',
            owner: 'Coordenação Laboratorial',
            description: 'Estrutura inicial para separar leitura econômica do domínio laboratorial.'
          }
        ],
        page: 2,
        pageSize: 2,
        totalItems: 3,
        totalPages: 2,
        sort: 'name',
        order: 'asc'
      });

    const CostCentersPage = (await import('../CostCentersPage.vue')).default;
    const wrapper = mount(CostCentersPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Atendimento Clínico');
    expect(wrapper.text()).toContain('Página 1 de 2');
    expect(mockListAuditEvents).toHaveBeenCalledWith({
      module: 'billing',
      entityTypes: ['cost-center-catalog'],
      limit: 50
    });
    expect(wrapper.text()).toContain('Linha do tempo gerencial dos Centros de Custo');
    expect(wrapper.text()).toContain('corr-cc-1');
    expect(wrapper.text()).toContain('Administrativo Financeiro');
    expect(wrapper.text()).not.toContain('Webhook sensível alterado');
    expect(wrapper.text()).toContain('Abrir Auditoria');

    await wrapper.find('input[placeholder="Filtrar por correlationId da trilha"]').setValue('corr-cc-1');
    await flushPromises();
    expect(wrapper.text()).toContain('Atendimento Clínico Premium');
    expect(wrapper.text()).toContain('Administrativo Financeiro');

    await wrapper.find('input[placeholder="Código do centro"]').setValue('ADM-FIN');
    await wrapper.find('input[placeholder="Nome do centro"]').setValue('Administrativo Financeiro');
    await wrapper.find('select[aria-label="Tipo do centro de custo"]').setValue('Administrativo');
    await wrapper.find('input[placeholder="Responsável pelo centro"]').setValue('Gerência Financeira');
    await wrapper.find('input[placeholder="Descrição operacional do centro"]').setValue('Rateio administrativo do financeiro');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreate).toHaveBeenCalledWith({
      code: 'ADM-FIN',
      name: 'Administrativo Financeiro',
      kind: 'Administrativo',
      owner: 'Gerência Financeira',
      description: 'Rateio administrativo do financeiro'
    });
    expect(wrapper.text()).toContain('Administrativo Financeiro');

    const editButton = wrapper.findAll('button').find((button) => button.text() === 'Editar');
    expect(editButton).toBeTruthy();
    await editButton!.trigger('click');
    await flushPromises();

    await wrapper.find('input[placeholder="Nome do centro"]').setValue('Administrativo Financeiro Corporativo');
    await wrapper.find('input[placeholder="Responsável pelo centro"]').setValue('Diretoria Financeira');
    await wrapper.find('input[placeholder="Descrição operacional do centro"]').setValue('Rateio administrativo consolidado');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockUpdate).toHaveBeenCalledWith('ADM-FIN', {
      code: 'ADM-FIN',
      name: 'Administrativo Financeiro Corporativo',
      kind: 'Administrativo',
      owner: 'Diretoria Financeira',
      description: 'Rateio administrativo consolidado'
    });
    expect(wrapper.text()).toContain('Administrativo Financeiro Corporativo');

    await wrapper.findAll('button').find((button) => button.text() === 'Próxima página')!.trigger('click');
    await flushPromises();

    expect(mockList).toHaveBeenLastCalledWith({ page: 2, pageSize: 2, sort: 'name', order: 'asc' });
    expect(wrapper.text()).toContain('Laboratório');
    expect(wrapper.text()).toContain('Página 2 de 2');

    await wrapper.findAll('button').find((button) => button.text() === 'Remover')!.trigger('click');
    await flushPromises();

    expect(mockRemove).toHaveBeenCalledWith('LAB-OP');
    expect(wrapper.text()).toContain('Registro removido com sucesso');
  });
});
