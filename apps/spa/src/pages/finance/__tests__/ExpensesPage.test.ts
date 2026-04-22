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

describe('ExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([
      {
        id: 'DES-101',
        name: 'Energia Elétrica',
        kind: 'Fixo',
        category: 'Infraestrutura',
        description: 'Despesa estrutural da operação'
      },
      {
        id: 'DES-214',
        name: 'Frete de Suprimentos',
        kind: 'Operacional',
        category: 'Logística',
        description: 'Reposição de estoque'
      }
    ]);
    mockCreate.mockImplementation(async (payload) => ({
      id: 'DES-999',
      ...payload
    }));
    mockUpdate.mockImplementation(async (id, payload) => ({
      id,
      ...payload
    }));
    mockRemove.mockResolvedValue({ ok: true });
  });

  it('loads existing expenses and renders the table', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();

    expect(mockList).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Energia Elétrica');
    expect(wrapper.text()).toContain('Frete de Suprimentos');
    expect(wrapper.text()).toContain('Infraestrutura');
  });

  it('creates a new expense from the functional form', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();

    await wrapper.find('input[placeholder="Nome do lançamento"]').setValue('Hospedagem Cloud');
    await wrapper.find('input[placeholder="Tipo (ex: Variável)"]').setValue('Variável');
    await wrapper.find('input[placeholder="Categoria (ex: Tecnologia)"]').setValue('Tecnologia');
    await wrapper.find('input[placeholder="Descrição operacional"]').setValue('Infraestrutura de produção');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Hospedagem Cloud',
      kind: 'Variável',
      category: 'Tecnologia',
      description: 'Infraestrutura de produção'
    });
    expect(wrapper.text()).toContain('Registro criado com sucesso');
    expect(wrapper.text()).toContain('Hospedagem Cloud');
  });

  it('filters rows by typed criteria and category', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();
    await wrapper.find('input[placeholder="Nome"]').setValue('frete');
    await wrapper.find('input[placeholder="Categoria"]').setValue('log');
    await flushPromises();

    expect(wrapper.text()).toContain('Frete de Suprimentos');
    expect(wrapper.text()).not.toContain('Energia ElétricaDespesa estrutural');
  });

  it('updates an expense through edit mode', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();
    const editButton = wrapper.findAll('button').find((button) => button.text() === 'Editar');
    expect(editButton).toBeTruthy();
    await editButton!.trigger('click');
    await flushPromises();

    await wrapper.find('input[placeholder="Nome do lançamento"]').setValue('Energia Solar');
    await wrapper.find('input[placeholder="Tipo (ex: Variável)"]').setValue('Fixo');
    await wrapper.find('input[placeholder="Categoria (ex: Tecnologia)"]').setValue('Infraestrutura');
    await wrapper.find('input[placeholder="Descrição operacional"]').setValue('Conta de energia revisada');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockUpdate).toHaveBeenCalledWith('DES-101', {
      name: 'Energia Solar',
      kind: 'Fixo',
      category: 'Infraestrutura',
      description: 'Conta de energia revisada'
    });
    expect(wrapper.text()).toContain('Registro atualizado com sucesso');
    expect(wrapper.text()).toContain('Energia Solar');
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
    expect(wrapper.text()).not.toContain('Energia Elétrica');
  });

  it('shows validation error when creating without required fields', async () => {
    const ExpensesPage = (await import('../ExpensesPage.vue')).default;
    const wrapper = mount(ExpensesPage);

    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreate).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Nome, categoria e descrição são obrigatórios');
  });
});
