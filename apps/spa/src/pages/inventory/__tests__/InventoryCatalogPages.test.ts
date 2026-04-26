import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

const pages = [
  {
    loader: () => import('../SuppliersPage.vue'),
    title: 'Fornecedores e Despesas',
    breadcrumb: 'EstoqueCadastrosFornecedoreseDespesas',
    placeholder: undefined
  },
  {
    loader: () => import('../ManufacturersPage.vue'),
    title: 'Fabricantes',
    breadcrumb: 'EstoqueCadastradosFabricantes',
    placeholder: 'Buscar por ID ou nome'
  },
  {
    loader: () => import('../ProductGroupsPage.vue'),
    title: 'Grupos de Produto',
    breadcrumb: 'EstoqueCadastradosGrupos de Produto',
    placeholder: 'Buscar por ID ou descrição'
  },
  {
    loader: () => import('../WarehousesPage.vue'),
    title: 'Estoques',
    breadcrumb: 'EstoqueCadastrosEstoques',
    placeholder: undefined
  }
];

describe('Inventory catalog starter pages', () => {
  it.each(pages)('renders $title with Vetus-aligned breadcrumbs and starter controls', async ({ loader, title, breadcrumb, placeholder }) => {
    const component = (await loader()).default;
    const wrapper = mount(component);

    expect(wrapper.text().replace(/\s+/g, '').replace(/\//g, '')).toContain(breadcrumb.replace(/\s+/g, '').replace(/\//g, ''));
    expect(wrapper.text()).toContain(title);
    if (placeholder) {
      expect(wrapper.find('input[type="search"]').attributes('placeholder')).toBe(placeholder);
    }
  });
});
