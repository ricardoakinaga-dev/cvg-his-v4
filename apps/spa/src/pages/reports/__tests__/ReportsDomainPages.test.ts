import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

const pages = [
  {
    loader: () => import('../ReportsDomainHubPage.vue'),
    title: 'Relatórios por Domínio',
    breadcrumb: 'RelatóriosVisão por Domínio'
  },
  {
    loader: () => import('../FinancialReportsPage.vue'),
    title: 'Relatórios Financeiros',
    breadcrumb: 'RelatóriosFinanceiroRelatórios Financeiros'
  },
  {
    loader: () => import('../AppointmentReportsPage.vue'),
    title: 'Relatórios de Agenda',
    breadcrumb: 'RelatóriosAgendaRelatórios de Agenda'
  },
  {
    loader: () => import('../EncounterReportsPage.vue'),
    title: 'Relatórios de Atendimento',
    breadcrumb: 'RelatóriosAtendimentoRelatórios de Atendimento'
  },
  {
    loader: () => import('../RegisterReportsPage.vue'),
    title: 'Relatórios de Cadastros',
    breadcrumb: 'RelatóriosCadastrosRelatórios de Cadastros'
  },
  {
    loader: () => import('../InventoryReportsPage.vue'),
    title: 'Relatórios de Estoque',
    breadcrumb: 'RelatóriosEstoqueRelatórios de Estoque'
  },
  {
    loader: () => import('../ProductionReportsPage.vue'),
    title: 'Relatórios de Produção',
    breadcrumb: 'RelatóriosProduçãoRelatórios de Produção'
  }
];

describe('Reports domain pages', () => {
  it.each(pages)('renders $title with explicit breadcrumbs', async ({ loader, title, breadcrumb }) => {
    const component = (await loader()).default;
    const wrapper = mount(component, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } });

    expect(wrapper.text().replace(/\s+/g, '').replace(/\//g, '')).toContain(breadcrumb.replace(/\s+/g, '').replace(/\//g, ''));
    expect(wrapper.text()).toContain(title);
  });
});

const categoryDestinations = [
  {
    loader: () => import('../FinancialReportsPage.vue'),
    paths: ['accounts-receivable', 'received-accounts', 'accounts-payable', 'paid-accounts', 'financial', 'dre', 'cash-drawer', 'cheques', 'advance-payments', 'packages']
  },
  {
    loader: () => import('../EncounterReportsPage.vue'),
    paths: ['sales', 'produced-items', 'professional-care', 'appointments']
  },
  {
    loader: () => import('../RegisterReportsPage.vue'),
    paths: ['registers/owners', 'registers/patients', 'registers/services', 'registers/suppliers', 'deleted-sales-counter-sales']
  }
];

describe('Report category navigation', () => {
  it.each(categoryDestinations)('links each consultation to an existing router destination', async ({ loader, paths }) => {
    const { createMemoryHistory, createRouter } = await import('vue-router');
    const { routes } = await import('@/router/routes');
    const router = createRouter({ history: createMemoryHistory(), routes });
    const wrapper = mount((await loader()).default, { global: { plugins: [router], stubs: { RouterLink: false } } });
    const links = wrapper.findAll('nav[aria-label] a');
    expect(links.map((link) => link.attributes('href'))).toEqual(paths.map((path) => `/reports/${path}`));
    for (const link of links) {
      const resolved = router.resolve(link.attributes('href')!);
      expect(resolved.matched.length).toBeGreaterThan(0);
      expect(resolved.name).not.toBe('NotFound');
      expect(link.text().trim().length).toBeGreaterThan(0);
    }
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/endpoints|materializados|fontes analíticas|dados simulados/i);
    wrapper.unmount();
  });
});
