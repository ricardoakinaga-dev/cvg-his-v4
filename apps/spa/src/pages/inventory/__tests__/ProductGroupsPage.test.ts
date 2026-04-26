import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductGroupsPage from '../ProductGroupsPage.vue';
import { productGroupsService } from '@/services/productGroups';
import { productsService } from '@/services/products';

vi.mock('@/services/productGroups', () => ({
  productGroupsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock('@/services/products', () => ({
  productsService: {
    list: vi.fn()
  }
}));

const productGroupResponse = {
  items: [
    {
      id: 'pg-1',
      accountId: 'account-1',
      displayId: 10,
      description: 'Produtos de Limpeza e Copa',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    },
    {
      id: 'pg-2',
      accountId: 'account-1',
      displayId: 4,
      description: 'Vacinas',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    }
  ],
  totalItems: 2
};

describe('ProductGroupsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productGroupsService.list).mockResolvedValue(structuredClone(productGroupResponse));
    vi.mocked(productGroupsService.create).mockResolvedValue({
      id: 'pg-3',
      accountId: 'account-1',
      displayId: 11,
      description: 'Farmacia',
      active: true,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z'
    });
    vi.mocked(productGroupsService.update).mockResolvedValue({
      ...productGroupResponse.items[0],
      description: 'Produtos de Limpeza Premium'
    });
    vi.mocked(productGroupsService.remove).mockResolvedValue(undefined);
    vi.mocked(productsService.list).mockResolvedValue([
      {
        id: 'prod-1',
        accountId: 'account-1',
        name: 'Produtos de Limpeza e Copa Sanitizante',
        code: 'LIMP-1',
        description: 'Grupo Produtos de Limpeza e Copa',
        basePrice: 39.9,
        active: true,
        createdAt: '2026-04-26T00:00:00.000Z',
        updatedAt: '2026-04-26T00:00:00.000Z'
      }
    ]);
  });

  it('renders the Vetus-like product groups catalog', async () => {
    const wrapper = mount(ProductGroupsPage);
    await flushPromises();

    expect(productGroupsService.list).toHaveBeenCalledWith({ search: undefined, active: true });
    expect(wrapper.text().replace(/\s+/g, '').replace(/\//g, '')).toContain('EstoqueCadastrosGruposdeProduto');
    expect(wrapper.text()).toContain('Incluir Novo Grupo');
    expect(wrapper.get('[data-testid="product-group-search"]').attributes('placeholder')).toBe('Buscar por ID ou descrição');
    expect(wrapper.text()).toContain('Descrição:');
    expect(wrapper.text()).toContain('Produtos de Limpeza e Copa');
    expect(wrapper.text()).toContain('ID:');
    expect(wrapper.text()).toContain('10');
    expect(wrapper.text()).toContain('Ver Detalhes');
  });

  it('filters by ID or description through the product groups API', async () => {
    const wrapper = mount(ProductGroupsPage);
    await flushPromises();

    await wrapper.get('[data-testid="product-group-search"]').setValue('10');
    await wrapper.findAll('button').find((button) => button.text() === 'Pesquisar')!.trigger('click');
    await flushPromises();

    expect(productGroupsService.list).toHaveBeenLastCalledWith({ search: '10', active: true });
  });

  it('creates and updates product groups through the durable catalog API', async () => {
    const wrapper = mount(ProductGroupsPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Incluir Novo Grupo')!.trigger('click');
    await wrapper.get('[data-testid="product-group-description"]').setValue('Farmacia');
    await wrapper.find('form[aria-label="Cadastro de grupo de produto"]').trigger('submit');
    await flushPromises();

    expect(productGroupsService.create).toHaveBeenCalledWith({
      description: 'Farmacia',
      active: true
    });
    expect(wrapper.text()).toContain('Grupo de produto cadastrado com sucesso.');

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await wrapper.get('[data-testid="product-group-description"]').setValue('Produtos de Limpeza Premium');
    await wrapper.find('form[aria-label="Cadastro de grupo de produto"]').trigger('submit');
    await flushPromises();

    expect(productGroupsService.update).toHaveBeenCalledWith('pg-3', {
      description: 'Produtos de Limpeza Premium',
      active: true
    });
  });

  it('archives product groups through the exclude action', async () => {
    const wrapper = mount(ProductGroupsPage);
    await flushPromises();

    await wrapper.findAll('button').find((button) => button.text() === 'Ver Detalhes')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Excluir')!.trigger('click');
    await flushPromises();

    expect(productGroupsService.remove).toHaveBeenCalledWith('pg-1');
    expect(wrapper.text()).toContain('Grupo de produto excluído com sucesso.');
  });
});
