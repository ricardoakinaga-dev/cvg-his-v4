import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductsImportPage from '../ProductsImportPage.vue';
import { productsService, type ProductSummary } from '@/services/products';

const mockPush = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

vi.mock('@/services/products', () => ({
  productsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
}));

const existingProduct: ProductSummary = {
  id: 'prod-vaccine',
  accountId: 'acc-1' as never,
  name: 'Vacina V10',
  code: 'VAC-010',
  description: 'Imunizante antigo',
  basePrice: 100,
  active: true,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-26T00:00:00.000Z'
};

describe('ProductsImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productsService.list).mockResolvedValue([existingProduct]);
    vi.mocked(productsService.create).mockResolvedValue({
      ...existingProduct,
      id: 'prod-seringe',
      name: 'Seringa 3ml',
      code: 'SER-003',
      basePrice: 8.5
    });
    vi.mocked(productsService.update).mockResolvedValue({
      ...existingProduct,
      description: 'Imunizante multiplo',
      basePrice: 120
    });
  });

  it('renders Vetus-like product import controls', async () => {
    const wrapper = mount(ProductsImportPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Importar Dados Produtos');
    expect(wrapper.text()).toContain('Cadastro de Produtos');
    expect(wrapper.text()).toContain('Modelo CSV');
    expect(wrapper.text()).toContain('Arquivo');
    expect(wrapper.text()).toContain('Dados');
    expect(wrapper.text()).toContain('Separador');
    expect(wrapper.text()).toContain('Duplicados');
    expect(wrapper.text()).toContain('Produtos Ativos');
    expect(wrapper.text()).toContain('Validar');
    expect(wrapper.text()).toContain('Importar');
    expect(productsService.list).toHaveBeenCalledWith();
  });

  it('validates pasted product rows and previews create/update operations', async () => {
    const wrapper = mount(ProductsImportPage);
    await flushPromises();

    await wrapper
      .get('[data-testid="products-import-data"]')
      .setValue('Codigo;Produto;Descricao;Preco Base;Ativo\nVAC-010;Vacina V10;Imunizante multiplo;120,00;Sim\nSER-003;Seringa 3ml;Material;8,50;Sim');
    await wrapper.findAll('button').find((button) => button.text() === 'Validar')!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('VAC-010');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('Atualizar');
    expect(wrapper.text()).toContain('SER-003');
    expect(wrapper.text()).toContain('Seringa 3ml');
    expect(wrapper.text()).toContain('Criar');
    expect(wrapper.text()).toMatch(/R\$\s*120,00/);
    expect(wrapper.text()).toContain('Pronto');
  });

  it('imports valid product rows through create and update APIs', async () => {
    const wrapper = mount(ProductsImportPage);
    await flushPromises();

    await wrapper
      .get('[data-testid="products-import-data"]')
      .setValue('Codigo;Produto;Descricao;Preco Base;Ativo\nVAC-010;Vacina V10;Imunizante multiplo;120,00;Sim\nSER-003;Seringa 3ml;Material;8,50;Sim');
    await wrapper.findAll('button').find((button) => button.text() === 'Validar')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Importar')!.trigger('click');
    await flushPromises();

    expect(productsService.update).toHaveBeenCalledWith('prod-vaccine', {
      name: 'Vacina V10',
      code: 'VAC-010',
      description: 'Imunizante multiplo',
      basePrice: 120,
      active: true
    });
    expect(productsService.create).toHaveBeenCalledWith({
      name: 'Seringa 3ml',
      code: 'SER-003',
      description: 'Material',
      basePrice: 8.5,
      active: true
    });
    expect(wrapper.text()).toContain('2 produto(s) importado(s).');
    expect(wrapper.text()).toContain('Importado');
  });

  it('does not show success when every product import fails', async () => {
    vi.mocked(productsService.create).mockRejectedValueOnce(new Error('Falha no banco'));
    const wrapper = mount(ProductsImportPage);
    await flushPromises();

    await wrapper
      .get('[data-testid="products-import-data"]')
      .setValue('Codigo;Produto;Descricao;Preco Base;Ativo\nSER-003;Seringa 3ml;Material;8,50;Sim');
    await wrapper.findAll('button').find((button) => button.text() === 'Validar')!.trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Importar')!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('0 produto(s) importado(s).');
    expect(wrapper.text()).toContain('1 produto(s) nao foram importados.');
    expect(wrapper.text()).toContain('Falha no banco');
  });
});
