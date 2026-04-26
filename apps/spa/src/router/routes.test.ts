import { describe, expect, it } from 'vitest';

import { flattenAllNavItems } from '../navigation';
import { routes } from './routes';

function findChildRoute(path: string) {
  const appShell = routes.find((route) => route.path === '/');
  const children = appShell?.children ?? [];
  return children.find((route) => route.path === path);
}

describe('router convergence', () => {
  it('keeps every navbar item backed by a SPA route', () => {
    const missingRoutes = flattenAllNavItems()
      .map((item) => item.path)
      .filter((path) => !findChildRoute(path === '/' ? '' : path.replace(/^\//, '')));

    expect(missingRoutes).toEqual([]);
  });

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
    expect(findChildRoute('fiscal')?.meta?.breadcrumbParent).toBe('Configurações Fiscais');
    expect(findChildRoute('fiscal/icms')?.meta?.breadcrumbParent).toBe('Configurações Fiscais');
    expect(findChildRoute('access-control')?.meta?.title).toBe('Grupos de Acesso');
    expect(findChildRoute('access-control')?.meta?.breadcrumbParent).toBe('RH');
  });

  it('adds concrete placeholder routes for the new menu items that do not have modules yet', () => {
    expect(findChildRoute('packages')?.name).toBe('Packages');
    expect(findChildRoute('laboratory/hemograms')?.meta?.breadcrumbParent).toBe('Laboratório');
    expect(findChildRoute('laboratory/hemograms')?.alias).toEqual(
      expect.arrayContaining([
        '/hemogramas',
        '/laboratorio/hemogramas',
        '/laboratorio/atendimentos/hemogramas',
        '/laboratorio/exames/hemogramas'
      ])
    );
    expect(findChildRoute('laboratory/urinalysis')?.alias).toEqual(
      expect.arrayContaining(['/urina', '/laboratorio/urina', '/laboratorio/exames/urina'])
    );
    expect(findChildRoute('laboratory/orders')?.alias).toEqual(
      expect.arrayContaining([
        '/laboratorio/exames',
        '/laboratorio/atendimentos/exames',
        '/laboratorio/pedidos-de-exame'
      ])
    );
    expect(findChildRoute('laboratory/results')?.alias).toEqual(
      expect.arrayContaining(['/laboratorio/laudos', '/laboratorio/atendimentos/laudos'])
    );
    expect(findChildRoute('exam-orders')?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(findChildRoute('exam-results')?.meta?.breadcrumbParent).toBe('Laboratório');
    expect(findChildRoute('inventory/pharmacy')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('inventory/price-consultation')?.meta?.title).toBe('Consulta de Preços');
    expect(findChildRoute('inventory/price-audit')?.meta?.title).toBe('Auditoria de Preços');
    expect(findChildRoute('finance/accounts-payable')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('finance/advance-payments')?.meta?.title).toBe('Pagamento Antecipado');
    expect(findChildRoute('finance/card-transactions')?.meta?.title).toBe('Transações de Cartão');
    expect(findChildRoute('marketing/vaccine-email')?.meta?.breadcrumbParent).toBe('Marketing');
    expect(findChildRoute('marketing/sms-settings')?.meta?.title).toBe('Configurações de SMS');
    expect(findChildRoute('administration/settings')?.meta?.breadcrumbParent).toBe('Administração');
    expect(findChildRoute('dashboards/multifilial')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('vaccines-dewormers')?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(findChildRoute('responsibility-terms')?.meta?.title).toBe('Termos de Responsabilidade');
    expect(findChildRoute('customer-groups')?.meta?.title).toBe('Grupos de Clientes');
    expect(findChildRoute('laboratory/hemogram-reference-values')?.meta?.title).toBe('Vlr. Ref. Hemograma');
    expect(findChildRoute('laboratory/biochemistry-reference-values')?.meta?.title).toBe('Vlr. Ref. Bioquímico');
  });

  it('uses concrete routes for cadastro auxiliary animal catalogs', () => {
    const breedsRoute = findChildRoute('breeds');
    const speciesRoute = findChildRoute('species');
    const coatColorsRoute = findChildRoute('coat-colors');
    const customerGroupsRoute = findChildRoute('customer-groups');

    expect(breedsRoute?.name).toBe('Breeds');
    expect(breedsRoute?.component).toBeTruthy();
    expect(breedsRoute?.meta?.title).toBe('Raças');
    expect(breedsRoute?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(breedsRoute?.alias).toEqual(
      expect.arrayContaining(['/racas', '/raças', '/cadastros/racas', '/cadastros/raças'])
    );
    expect(findChildRoute('breeds/new')?.name).toBe('BreedNew');
    expect(findChildRoute('breeds/:id')?.name).toBe('BreedDetail');
    expect(findChildRoute('breeds/:id/edit')?.name).toBe('BreedEdit');

    expect(speciesRoute?.name).toBe('Species');
    expect(speciesRoute?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(speciesRoute?.alias).toEqual(expect.arrayContaining(['/especies', '/cadastros/especies']));
    expect(findChildRoute('species/new')?.name).toBe('SpeciesNew');
    expect(findChildRoute('species/:id')?.name).toBe('SpeciesDetail');
    expect(findChildRoute('species/:id/edit')?.name).toBe('SpeciesEdit');
    expect(findChildRoute('cadastros/especies')?.redirect).toBe('/species');
    expect(findChildRoute('cadastro/especies')?.redirect).toBe('/species');
    expect(findChildRoute('cadastros/species')?.redirect).toBe('/species');

    expect(coatColorsRoute?.name).toBe('CoatColors');
    expect(coatColorsRoute?.meta?.title).toBe('Cores/Pelagens');
    expect(coatColorsRoute?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(coatColorsRoute?.alias).toEqual(expect.arrayContaining(['/cores', '/pelagens', '/cadastros/cores']));
    expect(findChildRoute('coat-colors/new')?.name).toBe('CoatColorNew');
    expect(findChildRoute('coat-colors/:id')?.name).toBe('CoatColorDetail');
    expect(findChildRoute('coat-colors/:id/edit')?.name).toBe('CoatColorEdit');
    expect(findChildRoute('cadastros/cores')?.redirect).toBe('/coat-colors');
    expect(findChildRoute('cadastro/cores')?.redirect).toBe('/coat-colors');
    expect(findChildRoute('cadastros/coat-colors')?.redirect).toBe('/coat-colors');
    expect(findChildRoute('cadastros/pelagens')?.redirect).toBe('/coat-colors');

    expect(customerGroupsRoute?.name).toBe('CustomerGroups');
    expect(customerGroupsRoute?.component).toBeTruthy();
    expect(customerGroupsRoute?.meta?.title).toBe('Grupos de Clientes');
    expect(customerGroupsRoute?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(customerGroupsRoute?.alias).toEqual(expect.arrayContaining(['/grupos-de-clientes', '/cadastros/grupos-de-clientes']));
    expect(findChildRoute('customer-groups/new')?.name).toBe('CustomerGroupNew');
    expect(findChildRoute('customer-groups/:id')?.name).toBe('CustomerGroupDetail');
    expect(findChildRoute('customer-groups/:id/edit')?.name).toBe('CustomerGroupEdit');
    expect(findChildRoute('cadastros/grupos-de-clientes')?.redirect).toBe('/customer-groups');
  });

  it('uses a concrete loyalty route for Vetus points redemption', () => {
    const loyaltyRoute = findChildRoute('loyalty');

    expect(loyaltyRoute?.name).toBe('Loyalty');
    expect(loyaltyRoute?.component).not.toBe(findChildRoute('breeds')?.component);
    expect(loyaltyRoute?.meta?.title).toBe('Resgate de Pontos');
    expect(loyaltyRoute?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(loyaltyRoute?.alias).toEqual(expect.arrayContaining(['/fidelidade', '/atendimento/fidelidade']));
  });

  it('uses concrete routes for beta price tables and point-of-sale sync', () => {
    expect(findChildRoute('tabelas-de-preco')?.meta?.title).toBe('Tabelas de Preço');
    expect(findChildRoute('tabelas-de-preco')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('pontos-de-venda')?.meta?.title).toBe('Pontos de venda');
    expect(findChildRoute('pontos-de-venda')?.meta?.breadcrumbParent).toBe('Estoque');
  });

  it('uses a concrete route for atendimento vendas', () => {
    const salesRoute = findChildRoute('sales');

    expect(salesRoute?.name).toBe('Sales');
    expect(salesRoute?.component).toBeTruthy();
    expect(salesRoute?.meta?.title).toBe('Vendas');
    expect(salesRoute?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(salesRoute?.alias).toEqual(expect.arrayContaining(['/vendas', '/atendimento/vendas']));
    expect(findChildRoute('sales/beta')?.redirect).toBe('/sales');
  });

  it('uses a concrete route for atendimento pacotes', () => {
    const packagesRoute = findChildRoute('packages');

    expect(packagesRoute?.name).toBe('Packages');
    expect(packagesRoute?.component).toBeTruthy();
    expect(packagesRoute?.meta?.title).toBe('Pacotes');
    expect(packagesRoute?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(packagesRoute?.alias).toEqual(expect.arrayContaining(['/pacotes', '/atendimento/pacotes']));
  });

  it('reuses existing report surfaces for the requested reporting and dashboard entries', () => {
    expect(findChildRoute('reports')?.meta?.breadcrumbParent).toBe('Relatórios');
    expect(findChildRoute('reports/dre')?.meta?.title).toBe('DRE');
    expect(findChildRoute('reports/accounts')?.meta?.title).toBe('Contas');
    expect(findChildRoute('reports/sales')?.meta?.title).toBe('Vendas');
    expect(findChildRoute('reports/financial')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('reports/production')?.meta?.breadcrumbParent).toBe('Produção');
    expect(findChildRoute('dashboards/financial')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('dashboards/curve-abc')?.meta?.title).toBe('Curva ABC');
    expect(findChildRoute('reports/audit/appointments')?.meta?.title).toBe('Auditoria de Agendamentos');
    expect(findChildRoute('reports/registers/services')?.meta?.title).toBe('Serviços');
    expect(findChildRoute('reports/inventory-products')?.meta?.title).toBe('Relatório de Produtos');
  });
});
