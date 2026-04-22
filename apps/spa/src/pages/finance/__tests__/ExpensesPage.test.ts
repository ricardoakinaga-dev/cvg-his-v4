import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockListAuditEvents = vi.fn();

vi.mock('@/services/expensesCatalog', () => ({
  expensesCatalogService: {
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

const defaultCatalogResponse = {
  items: [
    {
      id: 'DES-101',
      name: 'Energia Elétrica',
      kind: 'Fixo',
      category: 'Infraestrutura',
      costCenterCode: 'ESTOQUE',
      costCenterName: 'Suprimentos e Estoque',
      description: 'Despesa estrutural da operação'
    },
    {
      id: 'DES-214',
      name: 'Frete de Suprimentos',
      kind: 'Operacional',
      category: 'Logística',
      costCenterCode: 'CLI-ATD',
      costCenterName: 'Atendimento Clínico',
      description: 'Reposição de estoque'
    }
  ],
  categories: ['Infraestrutura', 'Logística', 'Tecnologia'],
  costCenters: [
    { code: 'CLI-ATD', name: 'Atendimento Clínico', kind: 'Operacional' },
    { code: 'ESTOQUE', name: 'Suprimentos e Estoque', kind: 'Administrativo' },
    { code: 'LAB-OP', name: 'Laboratório', kind: 'Operacional' }
  ],
  page: 1,
  pageSize: 2,
  totalItems: 2,
  totalPages: 1,
  sort: 'name',
  order: 'asc'
};

const defaultAuditEvents = [
  {
    id: 'audit-1',
    occurredAt: '2026-04-22T12:10:00Z',
    actorId: 'user-1',
    module: 'billing',
    action: 'update_expense_catalog_item',
    entityType: 'expense-catalog',
    entityId: 'DES-101',
    correlationId: 'corr-fin-1',
    riskLevel: 'medium',
    payloadSummary: 'Expense catalog item updated | id=DES-101 | name=Energia Solar | kind=Fixo | category=Infraestrutura | costCenter=LAB-OP | costCenterName=Laboratório | changes=name: Energia Elétrica → Energia Solar'
  },
  {
    id: 'audit-2',
    occurredAt: '2026-04-22T12:00:00Z',
    actorId: 'user-2',
    module: 'billing',
    action: 'create_cost_center_catalog_item',
    entityType: 'cost-center-catalog',
    entityId: 'ADM-FIN',
    correlationId: 'corr-fin-2',
    riskLevel: 'medium',
    payloadSummary: 'Cost center catalog item created | code=ADM-FIN | name=Administrativo Financeiro | kind=Administrativo | owner=Gerência Financeira'
  },
  {
    id: 'audit-3',
    occurredAt: '2026-04-22T11:50:00Z',
    actorId: 'user-3',
    module: 'integrations',
    action: 'webhook.updated',
    entityType: 'webhook',
    entityId: 'wh-1',
    correlationId: 'corr-ext-1',
    riskLevel: 'high',
    payloadSummary: 'Webhook sensível alterado'
  }
];

describe('ExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(structuredClone(defaultCatalogResponse));
    mockListAuditEvents.mockResolvedValue(structuredClone(defaultAuditEvents));
    mockCreate.mockImplementation(async (payload) => ({
      id: 'DES-999',
      costCenterName: payload.costCenterCode === 'LAB-OP' ? 'Laboratório' : 'Atendimento Clínico',
      ...payload
    }));
    mockUpdate.mockImplementation(async (id, payload) => ({
      id,
      costCenterName: payload.costCenterCode === 'LAB-OP' ? 'Laboratório' : 'Suprimentos e Estoque',
      ...payload
    }));
    mockRemove.mockResolvedValue({ ok: true });
  });

  it('renders a semantic finance timeline filtered to billing audit events', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();

    expect(mockListAuditEvents).toHaveBeenCalledWith({
      module: 'billing',
      entityTypes: ['expense-catalog', 'cost-center-catalog'],
      limit: 50
    });
    expect(wrapper.text()).toContain('Linha do tempo operacional do Financeiro');
    expect(wrapper.text()).toContain('Abrir Auditoria');
    expect(wrapper.text()).toContain('Energia Solar');
    expect(wrapper.text()).toContain('Administrativo Financeiro');
    expect(wrapper.text()).toContain('corr-fin-1');
    expect(wrapper.text()).not.toContain('Webhook sensível alterado');
  });

  it('filters the finance timeline by action, entidade e correlationId', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();

    await wrapper.find('input[placeholder="Filtrar por ação ou resumo da trilha"]').setValue('cost center');
    await wrapper.find('input[placeholder="Filtrar por entidade ou id afetado"]').setValue('ADM-FIN');
    await wrapper.find('input[placeholder="Filtrar por correlationId"]').setValue('corr-fin-2');
    await flushPromises();

    expect(wrapper.text()).toContain('Administrativo Financeiro');
    expect(wrapper.text()).toContain('corr-fin-2');
    expect(wrapper.text()).not.toContain('Energia Solar');
  });

  it('loads existing expenses and renders the table with cost center metadata', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();

    expect(mockList).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Energia Elétrica');
    expect(wrapper.text()).toContain('Frete de Suprimentos');
    expect(wrapper.text()).toContain('Infraestrutura');
    expect(wrapper.text()).toContain('Suprimentos e Estoque');
    expect(wrapper.text()).toContain('3 categoria(s) padronizada(s)');
  });

  it('creates a new expense from the functional form with standardized category and cost center', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();

    await wrapper.find('input[placeholder="Nome do lançamento"]').setValue('Hospedagem Cloud');
    await wrapper.find('input[placeholder="Tipo (ex: Variável)"]').setValue('Variável');
    await wrapper.find('select[aria-label="Categoria do lançamento"]').setValue('Tecnologia');
    await wrapper.find('select[aria-label="Centro de custo do lançamento"]').setValue('CLI-ATD');
    await wrapper.find('input[placeholder="Descrição operacional"]').setValue('Infraestrutura de produção');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Hospedagem Cloud',
      kind: 'Variável',
      category: 'Tecnologia',
      costCenterCode: 'CLI-ATD',
      description: 'Infraestrutura de produção'
    });
    expect(wrapper.text()).toContain('Registro criado com sucesso');
    expect(wrapper.text()).toContain('Hospedagem Cloud');
    expect(wrapper.text()).toContain('Atendimento Clínico');
  });

  it('filters rows through server-side query params when pesquisar is acionado', async () => {
    mockList
      .mockResolvedValueOnce(structuredClone(defaultCatalogResponse))
      .mockResolvedValueOnce({
        ...structuredClone(defaultCatalogResponse),
        items: [structuredClone(defaultCatalogResponse.items[1])],
        totalItems: 1,
        totalPages: 1
      });

    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();
    await wrapper.find('input[placeholder="Nome"]').setValue('frete');
    await wrapper.find('input[placeholder="Categoria"]').setValue('log');
    await wrapper.find('input[placeholder="Centro de custo"]').setValue('cli-atd');
    await wrapper.findAll('button').find((button) => button.text() === 'Pesquisar')!.trigger('click');
    await flushPromises();

    expect(mockList).toHaveBeenLastCalledWith({
      search: 'frete',
      category: 'log',
      costCenter: 'cli-atd',
      page: 1,
      pageSize: 2,
      sort: 'name',
      order: 'asc'
    });
    expect(wrapper.find('.catalog-table').text()).toContain('Frete de Suprimentos');
    expect(wrapper.find('.catalog-table').text()).not.toContain('Energia Elétrica');
  });

  it('navigates to the next page using server-side pagination', async () => {
    mockList
      .mockResolvedValueOnce({
        ...structuredClone(defaultCatalogResponse),
        totalItems: 3,
        totalPages: 2,
        pageSize: 2
      })
      .mockResolvedValueOnce({
        ...structuredClone(defaultCatalogResponse),
        items: [
          {
            id: 'DES-318',
            name: 'Licenças de Software',
            kind: 'Fixo',
            category: 'Tecnologia',
            costCenterCode: 'LAB-OP',
            costCenterName: 'Laboratório',
            description: 'Base administrativa para serviços digitais'
          }
        ],
        page: 2,
        pageSize: 2,
        totalItems: 3,
        totalPages: 2,
        sort: 'name',
        order: 'asc'
      });

    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Página 1 de 2');
    await wrapper.findAll('button').find((button) => button.text() === 'Próxima página')!.trigger('click');
    await flushPromises();

    expect(mockList).toHaveBeenLastCalledWith({
      search: undefined,
      category: undefined,
      costCenter: undefined,
      page: 2,
      pageSize: 2,
      sort: 'name',
      order: 'asc'
    });
    expect(wrapper.text()).toContain('Licenças de Software');
    expect(wrapper.text()).toContain('Página 2 de 2');
  });

  it('updates an expense through edit mode including cost center reassignment', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();
    const editButton = wrapper.findAll('button').find((button) => button.text() === 'Editar');
    expect(editButton).toBeTruthy();
    await editButton!.trigger('click');
    await flushPromises();

    await wrapper.find('input[placeholder="Nome do lançamento"]').setValue('Energia Solar');
    await wrapper.find('input[placeholder="Tipo (ex: Variável)"]').setValue('Fixo');
    await wrapper.find('select[aria-label="Categoria do lançamento"]').setValue('Infraestrutura');
    await wrapper.find('select[aria-label="Centro de custo do lançamento"]').setValue('LAB-OP');
    await wrapper.find('input[placeholder="Descrição operacional"]').setValue('Conta de energia revisada');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockUpdate).toHaveBeenCalledWith('DES-101', {
      name: 'Energia Solar',
      kind: 'Fixo',
      category: 'Infraestrutura',
      costCenterCode: 'LAB-OP',
      description: 'Conta de energia revisada'
    });
    expect(wrapper.text()).toContain('Registro atualizado com sucesso');
    expect(wrapper.text()).toContain('Energia Solar');
    expect(wrapper.text()).toContain('Laboratório');
  });

  it('removes an expense from the list', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();
    const removeButton = wrapper.findAll('button').find((button) => button.text() === 'Remover');
    expect(removeButton).toBeTruthy();
    await removeButton!.trigger('click');
    await flushPromises();

    expect(mockRemove).toHaveBeenCalledWith('DES-101');
    expect(wrapper.text()).toContain('Registro removido com sucesso');
    expect(wrapper.find('.catalog-table').text()).not.toContain('Energia Elétrica');
  });

  it('shows validation error when creating without required fields', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreate).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Nome, categoria, centro de custo e descrição são obrigatórios');
  });
});
