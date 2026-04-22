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
    const wrapper = mount(component);

    expect(wrapper.text().replace(/\s+/g, '').replace(/\//g, '')).toContain(breadcrumb.replace(/\s+/g, '').replace(/\//g, ''));
    expect(wrapper.text()).toContain(title);
  });
});
