import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SuppliersPage from '../SuppliersPage.vue';
import { expensesCatalogService } from '@/services/expensesCatalog';

vi.mock('@/services/expensesCatalog', () => ({
  expensesCatalogService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}));

const catalogResponse = {
  items: [
    {
      id: 'SUP-001',
      name: 'ADIMAX INDUSTRIA E COMERCIO DE ALIMENTOS LTDA',
      kind: 'Operacional',
      category: 'FORNECEDOR',
      costCenterCode: 'ESTOQUE',
      costCenterName: 'Suprimentos e Estoque',
      description: 'Sem Contato - Cadastrado pela NFE'
    },
    {
      id: 'DES-001',
      name: 'Frete Refrigerado',
      kind: 'Fixo',
      category: 'DESPESA',
      costCenterCode: 'ADM',
      costCenterName: 'Administrativo',
      description: 'contato@frete.test'
    }
  ],
  categories: ['FORNECEDOR', 'DESPESA'],
  costCenters: [
    { code: 'ESTOQUE', name: 'Suprimentos e Estoque', kind: 'Operacional', owner: 'Estoque', description: '' },
    { code: 'ADM', name: 'Administrativo', kind: 'Administrativo', owner: 'Financeiro', description: '' }
  ],
  page: 1,
  pageSize: 10,
  totalItems: 26,
  totalPages: 3,
  sort: 'name',
  order: 'asc'
};

describe('SuppliersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(expensesCatalogService.list).mockResolvedValue(structuredClone(catalogResponse));
    vi.mocked(expensesCatalogService.create).mockResolvedValue({
      id: 'SUP-999',
      name: 'Fornecedor CVG',
      kind: 'Operacional',
      category: 'FORNECEDOR',
      costCenterCode: 'ESTOQUE',
      costCenterName: 'Suprimentos e Estoque',
      description: 'compras@cvg.test'
    });
    vi.mocked(expensesCatalogService.update).mockResolvedValue({
      ...catalogResponse.items[0],
      description: 'nfe@adimax.test'
    });
  });

  it('renders the Vetus-like supplier and expense list', async () => {
    const wrapper = mount(SuppliersPage);
    await flushPromises();

    expect(expensesCatalogService.list).toHaveBeenCalledWith({
      search: undefined,
      category: undefined,
      page: 1,
      pageSize: 10,
      sort: 'name',
      order: 'asc'
    });
    expect(wrapper.text()).toContain('Fornecedores e Despesas');
    expect(wrapper.text()).toContain('Busca Avançada');
    expect(wrapper.text()).toContain('Incluir Novo Registro');
    expect(wrapper.text()).toContain('Filtrar e Ordenar');
    expect(wrapper.text()).toContain('Mostrando 1 - 10 pág. de 26 resultados');
    expect(wrapper.text()).toContain('Descrição:');
    expect(wrapper.text()).toContain('ADIMAX INDUSTRIA E COMERCIO DE ALIMENTOS LTDA');
    expect(wrapper.text()).toContain('Categoria:');
    expect(wrapper.text()).toContain('FORNECEDOR');
    expect(wrapper.text()).toContain('Contato:');
    expect(wrapper.text()).toContain('Ver Detalhes');
  });

  it('uses advanced filters against the durable catalog endpoint', async () => {
    const wrapper = mount(SuppliersPage);
    await flushPromises();

    await wrapper.get('[data-testid="supplier-description-filter"]').setValue('ADIMAX');
    await wrapper.get('[data-testid="supplier-category-filter"]').setValue('FORNECEDOR');
    await wrapper.get('[data-testid="supplier-contact-filter"]').setValue('NFE');
    await wrapper.find('form[aria-label="Busca avançada"]').trigger('submit');
    await flushPromises();

    expect(expensesCatalogService.list).toHaveBeenLastCalledWith({
      search: 'ADIMAX NFE',
      category: 'FORNECEDOR',
      page: 1,
      pageSize: 10,
      sort: 'name',
      order: 'asc'
    });
  });

  it('creates records through the expenses catalog API', async () => {
    const wrapper = mount(SuppliersPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Incluir Novo Registro')!.trigger('click');
    await wrapper.get('[data-testid="supplier-name"]').setValue('Fornecedor CVG');
    await wrapper.get('[data-testid="supplier-category"]').setValue('FORNECEDOR');
    await wrapper.get('[data-testid="supplier-cost-center"]').setValue('ESTOQUE');
    await wrapper.get('[data-testid="supplier-contact"]').setValue('compras@cvg.test');
    await wrapper.find('form[aria-label="Cadastro de fornecedor ou despesa"]').trigger('submit');
    await flushPromises();

    expect(expensesCatalogService.create).toHaveBeenCalledWith({
      name: 'Fornecedor CVG',
      kind: 'Operacional',
      category: 'FORNECEDOR',
      costCenterCode: 'ESTOQUE',
      description: 'compras@cvg.test'
    });
    expect(wrapper.text()).toContain('Registro cadastrado com sucesso.');
  });

  it('updates records through the expenses catalog API', async () => {
    const wrapper = mount(SuppliersPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Editar')!.trigger('click');
    await wrapper.get('[data-testid="supplier-contact"]').setValue('nfe@adimax.test');
    await wrapper.find('form[aria-label="Cadastro de fornecedor ou despesa"]').trigger('submit');
    await flushPromises();

    expect(expensesCatalogService.update).toHaveBeenCalledWith('SUP-001', {
      name: 'ADIMAX INDUSTRIA E COMERCIO DE ALIMENTOS LTDA',
      kind: 'Operacional',
      category: 'FORNECEDOR',
      costCenterCode: 'ESTOQUE',
      description: 'nfe@adimax.test'
    });
    expect(wrapper.text()).toContain('Registro atualizado com sucesso.');
  });
});
