import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductDetailPage from '../ProductDetailPage.vue';
import ProductFormPage from '../ProductFormPage.vue';
import ProductsListPage from '../ProductsListPage.vue';
import { productsService, type ProductSummary } from '@/services/products';

const mockPush = vi.fn();
let routeParams: Record<string, string | undefined> = {};

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: routeParams })
}));

vi.mock('@/services/products', () => ({
  productsService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}));

const products: ProductSummary[] = [
  {
    id: 'prod-food',
    accountId: 'acc-1' as never,
    name: 'Ração Renal',
    code: 'PROD-001',
    description: 'Alimento terapeutico',
    basePrice: 129.9,
    active: true,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  },
  {
    id: 'prod-vaccine',
    accountId: 'acc-1' as never,
    name: 'Vacina V10',
    code: 'VAC-010',
    description: 'Imunizante',
    basePrice: 49.5,
    active: false,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
];

describe('Products pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParams = {};
    vi.mocked(productsService.list).mockResolvedValue(products);
    vi.mocked(productsService.getById).mockResolvedValue(products[0]);
    vi.mocked(productsService.create).mockResolvedValue(products[0]);
    vi.mocked(productsService.update).mockResolvedValue(products[0]);
  });

  it('renders Vetus-like product list controls, filters and rows', async () => {
    const wrapper = mount(ProductsListPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Estoque');
    expect(wrapper.text()).toContain('Cadastros');
    expect(wrapper.text()).toContain('Produtos');
    expect(wrapper.text()).toContain('Atualizar');
    expect(wrapper.text()).toContain('Importar');
    expect(wrapper.text()).toContain('Estoque');
    expect(wrapper.text()).toContain('Incluir');
    expect(wrapper.text()).toContain('Código');
    expect(wrapper.text()).toContain('Produto');
    expect(wrapper.text()).toContain('Situação');
    expect(wrapper.text()).toContain('Pesquisar');
    expect(wrapper.text()).toContain('Ração Renal');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('Ativo');
    expect(wrapper.text()).toContain('Inativo');
    expect(productsService.list).toHaveBeenCalledWith(undefined);
  });

  it('uses typed product filters when searching', async () => {
    const wrapper = mount(ProductsListPage);
    await flushPromises();

    await wrapper.get('[data-testid="products-code-filter"]').setValue('VAC');
    await wrapper.get('[data-testid="products-name-filter"]').setValue('Vacina');
    await wrapper.get('[data-testid="products-status-filter"]').setValue('inactive');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(productsService.list).toHaveBeenLastCalledWith('Vacina');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).not.toContain('Ração Renal');
  });

  it('creates a product through the product form', async () => {
    const wrapper = mount(ProductFormPage);
    await flushPromises();

    const inputs = wrapper.findAll('.ds-input');
    await inputs[0].setValue('Seringa 3ml');
    await inputs[1].setValue('SER-003');
    await inputs[2].setValue('Material de aplicação');
    await inputs[3].setValue(8.5);
    await wrapper.find('form[aria-label="Cadastro de produto"]').trigger('submit');
    await flushPromises();

    expect(productsService.create).toHaveBeenCalledWith({
      name: 'Seringa 3ml',
      code: 'SER-003',
      description: 'Material de aplicação',
      basePrice: 8.5,
      active: true
    });
    expect(wrapper.text()).toContain('Produto cadastrado com sucesso.');
  });

  it('renders product detail with operational shortcuts', async () => {
    routeParams = { id: 'prod-food' };
    const wrapper = mount(ProductDetailPage);
    await flushPromises();

    expect(productsService.getById).toHaveBeenCalledWith('prod-food');
    expect(wrapper.text()).toContain('Detalhes do Produto');
    expect(wrapper.text()).toContain('Ração Renal');
    expect(wrapper.text()).toContain('Consulta');
    expect(wrapper.text()).toContain('Auditoria');
    expect(wrapper.text()).toContain('Editar');
  });
});
