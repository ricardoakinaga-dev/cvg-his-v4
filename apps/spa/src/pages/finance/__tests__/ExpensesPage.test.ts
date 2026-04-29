import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('@/services/expensesCatalog', () => ({
  expensesCatalogService: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args)
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
    {
      code: 'CLI-ATD',
      name: 'Atendimento Clínico',
      kind: 'Operacional',
      owner: 'Coordenação Assistencial',
      description: 'Receita e custo ligados a consultas.'
    },
    {
      code: 'ESTOQUE',
      name: 'Suprimentos e Estoque',
      kind: 'Administrativo',
      owner: 'Backoffice',
      description: 'Rateio de compras e consumo estrutural.'
    }
  ],
  page: 1,
  pageSize: 100,
  totalItems: 2,
  totalPages: 1,
  sort: 'name',
  order: 'asc'
};

describe('ExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(structuredClone(defaultCatalogResponse));
    mockCreate.mockResolvedValue({});
    mockUpdate.mockResolvedValue({});
    mockRemove.mockResolvedValue({ ok: true });
  });

  it('renders a Vetus-like read-only costs and expenses catalog surface', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);
    await flushPromises();

    expect(mockList).toHaveBeenCalledWith({ page: 1, pageSize: 100, sort: 'name', order: 'asc' });
    expect(wrapper.text()).toContain('Custos e Despesas');
    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Energia Elétrica');
    expect(wrapper.text()).toContain('Frete de Suprimentos');
    expect(wrapper.text()).toContain('Infraestrutura');
    expect(wrapper.text()).toContain('Atendimento Clínico');
    expect(wrapper.text()).toContain('Centro de Custo');
    expect(wrapper.text()).toContain('Contas a Pagar');
    expect(wrapper.text()).toContain('Fluxo de Caixa');
    expect(wrapper.find('button[disabled]').text()).toContain('Incluir Despesa');
    expect(wrapper.text()).not.toContain('Editar');
    expect(wrapper.text()).not.toContain('Remover');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('filters expenses by category and cost center', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);
    await flushPromises();

    await wrapper.find('#expenses-category').setValue('Infraestrutura');
    await wrapper.find('#expenses-cost-center').setValue('ESTOQUE');

    expect(wrapper.text()).toContain('Energia Elétrica');
    expect(wrapper.text()).not.toContain('Frete de Suprimentos');
  });

  it('shows empty state wording when filters hide all expenses', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);
    await flushPromises();

    await wrapper.find('#expenses-search').setValue('sem resultado');

    expect(wrapper.text()).toContain('Nenhuma despesa encontrada');
  });

  it('shows a loading failure without enabling writes', async () => {
    mockList.mockRejectedValueOnce(new Error('Falha ao carregar custos e despesas'));

    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Falha ao carregar custos e despesas');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
