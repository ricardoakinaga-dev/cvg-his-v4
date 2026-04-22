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

  it('keeps the queue route canonical inside Atendimento', () => {
    const queueRoute = findChildRoute('queue');
    expect(queueRoute?.meta?.title).toBe('Fila Operacional');
    expect(queueRoute?.meta?.breadcrumb).toBe('Fila Operacional');
    expect(queueRoute?.meta?.breadcrumbParent).toBe('Atendimentos');
  });

  it('aligns cadastros routes with the official atendimento taxonomy', () => {
    expect(findChildRoute('patients')?.meta?.title).toBe('Pacientes');
    expect(findChildRoute('patients')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('owners')?.meta?.title).toBe('Tutores');
    expect(findChildRoute('owners')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('services')?.meta?.title).toBe('Serviços');
    expect(findChildRoute('services')?.meta?.breadcrumbParent).toBe('Cadastros');
  });

  it('aligns finance and rh anchors with the target section labels', () => {
    expect(findChildRoute('billing')?.meta?.title).toBe('Faturamento');
    expect(findChildRoute('billing')?.meta?.breadcrumbParent).toBe('Controles');
    expect(findChildRoute('cash')?.meta?.title).toBe('Caixa');
    expect(findChildRoute('cash')?.meta?.breadcrumbParent).toBe('Gaveta');
    expect(findChildRoute('pix')?.meta?.title).toBe('PIX');
    expect(findChildRoute('pix')?.meta?.breadcrumbParent).toBe('Maquininha de Cartão');
    expect(findChildRoute('payment-methods')?.meta?.title).toBe('Formas de Pagamento');
    expect(findChildRoute('payment-methods')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('banks')?.meta?.title).toBe('Bancos');
    expect(findChildRoute('banks')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('cost-centers')?.meta?.title).toBe('Centros de Custo');
    expect(findChildRoute('cost-centers')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('cards')?.meta?.title).toBe('Cartões');
    expect(findChildRoute('cards')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('expenses')?.meta?.title).toBe('Custos e Despesas');
    expect(findChildRoute('expenses')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('users')?.meta?.title).toBe('Usuários');
    expect(findChildRoute('users')?.meta?.breadcrumbParent).toBe('Usuários');
    expect(findChildRoute('staff')?.meta?.title).toBe('Equipe');
    expect(findChildRoute('staff')?.meta?.breadcrumbParent).toBe('Usuários');
  });

  it('keeps enterprise routes attached to the correct console sections', () => {
    expect(findChildRoute('access-control')?.meta?.breadcrumbParent).toBe('Governança');
    expect(findChildRoute('audit')?.meta?.breadcrumbParent).toBe('Governança');
    expect(findChildRoute('lgpd')?.meta?.breadcrumbParent).toBe('Governança');
    expect(findChildRoute('api-client')?.meta?.breadcrumbParent).toBe('Integrações');
    expect(findChildRoute('api-keys')?.meta?.breadcrumbParent).toBe('Integrações');
    expect(findChildRoute('master-search')?.meta?.breadcrumbParent).toBe('Utilidades');
  });

  it('aligns stock and fiscal routes with the target section labels', () => {
    expect(findChildRoute('inventory')?.meta?.breadcrumbParent).toBe('Controles');
    expect(findChildRoute('inventory/movements')?.meta?.breadcrumbParent).toBe('Controles');
    expect(findChildRoute('inventory/validity')?.meta?.breadcrumbParent).toBe('Controles');
    expect(findChildRoute('products')?.meta?.title).toBe('Produtos');
    expect(findChildRoute('products')?.meta?.breadcrumbParent).toBe('Cadastrados');
    expect(findChildRoute('suppliers')?.meta?.title).toBe('Fornecedores');
    expect(findChildRoute('suppliers')?.meta?.breadcrumbParent).toBe('Cadastrados');
    expect(findChildRoute('manufacturers')?.meta?.title).toBe('Fabricantes');
    expect(findChildRoute('manufacturers')?.meta?.breadcrumbParent).toBe('Cadastrados');
    expect(findChildRoute('product-groups')?.meta?.title).toBe('Grupos de Produto');
    expect(findChildRoute('product-groups')?.meta?.breadcrumbParent).toBe('Cadastrados');
    expect(findChildRoute('warehouses')?.meta?.title).toBe('Estoques');
    expect(findChildRoute('warehouses')?.meta?.breadcrumbParent).toBe('Cadastrados');
    expect(findChildRoute('fiscal')?.meta?.breadcrumbParent).toBe('Configurações Fiscais');
    expect(findChildRoute('fiscal/icms')?.meta?.breadcrumbParent).toBe('Configurações Fiscais');
  });

  it('keeps reports exposed as a decomposed domain instead of a single generic hub', () => {
    const reportsRoute = findChildRoute('administrative-reports');
    expect(reportsRoute?.meta?.title).toBe('Hubs Administrativos');
    expect(reportsRoute?.meta?.breadcrumb).toBe('Hubs Administrativos');
    expect(reportsRoute?.meta?.breadcrumbParent).toBe('Relatórios');

    expect(findChildRoute('reports')?.meta?.title).toBe('Relatórios por Domínio');
    expect(findChildRoute('reports/financial')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('reports/appointments')?.meta?.breadcrumbParent).toBe('Agenda');
    expect(findChildRoute('reports/encounters')?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(findChildRoute('reports/registers')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('reports/inventory')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('reports/production')?.meta?.title).toBe('Relatórios de Produção');
    expect(findChildRoute('reports/production')?.meta?.breadcrumbParent).toBe('Produção');
  });
});
