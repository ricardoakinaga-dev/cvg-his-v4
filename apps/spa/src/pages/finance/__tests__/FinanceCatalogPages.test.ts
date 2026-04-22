import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

const pages = [
  {
    loader: () => import('../PaymentMethodsPage.vue'),
    title: 'Formas de Pagamento',
    breadcrumb: 'FinanceiroCadastrosFormas de Pagamento'
  },
  {
    loader: () => import('../BanksPage.vue'),
    title: 'Bancos',
    breadcrumb: 'FinanceiroCadastrosBancos'
  },
  {
    loader: () => import('../CostCentersPage.vue'),
    title: 'Centros de Custo',
    breadcrumb: 'FinanceiroCadastrosCentros de Custo'
  },
  {
    loader: () => import('../CardsPage.vue'),
    title: 'Cartões',
    breadcrumb: 'FinanceiroCadastrosCartões'
  },
  {
    loader: () => import('../ExpensesPage.vue'),
    title: 'Custos e Despesas',
    breadcrumb: 'FinanceiroCadastrosCustos e Despesas'
  }
];

describe('Finance catalog starter pages', () => {
  it.each(pages)('renders $title with explicit Vetus-aligned breadcrumbs', async ({ loader, title, breadcrumb }) => {
    const component = (await loader()).default;
    const wrapper = mount(component);

    expect(wrapper.text().replace(/\s+/g, '').replace(/\//g, '')).toContain(breadcrumb.replace(/\s+/g, '').replace(/\//g, ''));
    expect(wrapper.text()).toContain(title);
  });
});
