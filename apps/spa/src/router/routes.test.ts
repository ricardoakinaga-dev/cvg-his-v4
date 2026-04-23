import { describe, expect, it } from 'vitest';

import { routes } from './routes';

function findChildRoute(path: string) {
  const appShell = routes.find((route) => route.path === '/');
  const children = appShell?.children ?? [];
  return children.find((route) => route.path === path);
}

describe('router convergence', () => {
  it('redirects legacy scheduling routes to the canonical agenda', () => {
    expect(findChildRoute('scheduling')?.redirect).toBe('/appointments');
    expect(findChildRoute('scheduling/new')?.redirect).toBe('/appointments/new');
  });

  it('anchors the renamed atendimento and cadastros routes to the new taxonomy', () => {
    expect(findChildRoute('encounters')?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(findChildRoute('queue')?.meta?.title).toBe('Esteira');
    expect(findChildRoute('queue')?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(findChildRoute('patients')?.meta?.title).toBe('Animais');
    expect(findChildRoute('patients')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('owners')?.meta?.title).toBe('Clientes');
    expect(findChildRoute('owners')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('quotes')?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(findChildRoute('triage')?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(findChildRoute('prescriptions')?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(findChildRoute('appointments/availability')?.meta?.breadcrumbParent).toBe('Agenda');
    expect(findChildRoute('appointments/types')?.meta?.title).toBe('Tipos de Agendamento');
  });

  it('aligns finance, fiscal and administration anchors with the requested layout', () => {
    expect(findChildRoute('billing')?.meta?.title).toBe('Contas a Receber');
    expect(findChildRoute('billing')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('cash')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('cards')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('pix')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('fiscal')?.meta?.breadcrumbParent).toBe('Fiscal');
    expect(findChildRoute('fiscal/icms')?.meta?.breadcrumbParent).toBe('Fiscal');
    expect(findChildRoute('access-control')?.meta?.title).toBe('Grupos de Acesso');
    expect(findChildRoute('access-control')?.meta?.breadcrumbParent).toBe('Administração');
  });

  it('adds concrete placeholder routes for the new menu items that do not have modules yet', () => {
    expect(findChildRoute('packages')?.name).toBe('Packages');
    expect(findChildRoute('loyalty')?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(findChildRoute('breeds')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('laboratory/hemograms')?.meta?.breadcrumbParent).toBe('Laboratório');
    expect(findChildRoute('exam-orders')?.meta?.breadcrumbParent).toBe('Laboratório');
    expect(findChildRoute('exam-results')?.meta?.breadcrumbParent).toBe('Laboratório');
    expect(findChildRoute('inventory/pharmacy')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('finance/accounts-payable')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('marketing/vaccine-email')?.meta?.breadcrumbParent).toBe('Marketing');
    expect(findChildRoute('administration/settings')?.meta?.breadcrumbParent).toBe('Administração');
    expect(findChildRoute('dashboards/multifilial')?.meta?.breadcrumbParent).toBe('Dashboards');
  });

  it('reuses existing report surfaces for the requested reporting and dashboard entries', () => {
    expect(findChildRoute('reports')?.meta?.breadcrumbParent).toBe('Relatórios');
    expect(findChildRoute('reports/dre')?.meta?.title).toBe('DRE');
    expect(findChildRoute('reports/accounts')?.meta?.title).toBe('Contas');
    expect(findChildRoute('reports/sales')?.meta?.title).toBe('Vendas');
    expect(findChildRoute('reports/financial')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('reports/production')?.meta?.breadcrumbParent).toBe('Produção');
    expect(findChildRoute('dashboards/financial')?.meta?.breadcrumbParent).toBe('Dashboards');
    expect(findChildRoute('dashboards/curve-abc')?.meta?.title).toBe('Curva ABC');
  });
});
