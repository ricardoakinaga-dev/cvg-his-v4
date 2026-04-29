import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

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
    listEvents: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => ({ query: {} })
  };
});

const costCenterResponse = {
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
  pageSize: 100,
  totalItems: 2,
  totalPages: 1,
  sort: 'name',
  order: 'asc'
};

describe('CostCentersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(costCenterResponse);
    mockCreate.mockResolvedValue({});
    mockUpdate.mockResolvedValue({});
    mockRemove.mockResolvedValue({ ok: true });
  });

  it('renders a Vetus-like read-only cost centers catalog surface', async () => {
    const CostCentersPage = (await import('../CostCentersPage.vue')).default;
    const wrapper = mount(CostCentersPage);
    await flushPromises();

    expect(mockList).toHaveBeenCalledWith({ page: 1, pageSize: 100, sort: 'name', order: 'asc' });
    expect(wrapper.text()).toContain('Centros de Custo');
    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Atendimento Clínico');
    expect(wrapper.text()).toContain('Suprimentos e Estoque');
    expect(wrapper.text()).toContain('Operacional');
    expect(wrapper.text()).toContain('Administrativo');
    expect(wrapper.text()).toContain('Rateio');
    expect(wrapper.text()).toContain('Custos e Despesas');
    expect(wrapper.text()).toContain('Contas a Pagar');
    expect(wrapper.text()).toContain('Fluxo de Caixa');
    expect(wrapper.find('button[disabled]').text()).toContain('Novo Centro');
    expect(wrapper.text()).not.toContain('Editar');
    expect(wrapper.text()).not.toContain('Remover');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('filters cost centers by classification and status', async () => {
    const CostCentersPage = (await import('../CostCentersPage.vue')).default;
    const wrapper = mount(CostCentersPage);
    await flushPromises();

    await wrapper.find('#cost-centers-kind').setValue('operational');
    await wrapper.find('#cost-centers-status').setValue('active');

    expect(wrapper.text()).toContain('Atendimento Clínico');
    expect(wrapper.text()).not.toContain('Suprimentos e Estoque');
  });

  it('shows empty state wording when filters hide all cost centers', async () => {
    const CostCentersPage = (await import('../CostCentersPage.vue')).default;
    const wrapper = mount(CostCentersPage);
    await flushPromises();

    await wrapper.find('#cost-centers-search').setValue('sem resultado');

    expect(wrapper.text()).toContain('Nenhum centro de custo encontrado');
  });

  it('shows a loading failure without enabling writes', async () => {
    mockList.mockRejectedValueOnce(new Error('Falha ao carregar centros de custo'));

    const CostCentersPage = (await import('../CostCentersPage.vue')).default;
    const wrapper = mount(CostCentersPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Falha ao carregar centros de custo');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
