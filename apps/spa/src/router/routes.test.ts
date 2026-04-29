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

  it('exposes Vetus-like aliases for the agenda flow', () => {
    expect(findChildRoute('appointments')?.alias).toEqual([
      '/agenda',
      '/agendamentos',
      '/atendimento/agenda',
      '/atendimento/atendimentos/agenda'
    ]);
    expect(findChildRoute('appointments/new')?.alias).toEqual([
      '/agenda/novo',
      '/agendamentos/novo',
      '/atendimento/atendimentos/agenda/novo'
    ]);
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
    expect(findChildRoute('billing')?.alias).toEqual([
      '/finance/accounts-receivable',
      '/financeiro/controles/contas-a-receber',
      '/contas-a-receber'
    ]);
    expect(findChildRoute('cash')?.meta?.title).toBe('Gaveta');
    expect(findChildRoute('cash')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('cash')?.alias).toEqual([
      '/cash-register',
      '/financeiro/gaveta',
      '/finance/gaveta'
    ]);
    expect(findChildRoute('cards')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('pix')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('fiscal')?.meta?.breadcrumbParent).toBe('Configurações Fiscais');
    expect(findChildRoute('fiscal/icms')?.meta?.breadcrumbParent).toBe('Configurações Fiscais');
    expect(findChildRoute('fiscal/ipi')?.meta?.title).toBe('Tabela IPI');
    expect(findChildRoute('fiscal/ipi')?.alias).toEqual([
      '/ipi',
      '/estoque/configuracoes-fiscais/ipi',
      '/estoque/configuracoes-fiscais/tabela-ipi'
    ]);
    expect(findChildRoute('fiscal/ipi-operacional')?.meta?.title).toBe('IPI Operacional');
    expect(findChildRoute('fiscal/pis')?.meta?.title).toBe('Tabela PIS');
    expect(findChildRoute('fiscal/pis')?.alias).toEqual([
      '/pis',
      '/estoque/configuracoes-fiscais/pis',
      '/estoque/configuracoes-fiscais/tabela-pis'
    ]);
    expect(findChildRoute('fiscal/cofins')?.meta?.title).toBe('Tabela COFINS');
    expect(findChildRoute('fiscal/cofins')?.alias).toEqual([
      '/cofins',
      '/estoque/configuracoes-fiscais/cofins',
      '/estoque/configuracoes-fiscais/tabela-cofins'
    ]);
    expect(findChildRoute('fiscal/cfop')?.meta?.title).toBe('Tabela CFOP');
    expect(findChildRoute('fiscal/cfop')?.alias).toEqual([
      '/cfop',
      '/estoque/configuracoes-fiscais/cfop',
      '/estoque/configuracoes-fiscais/tabela-cfop'
    ]);
    expect(findChildRoute('fiscal/ibs-cbs')?.meta?.title).toBe('Tabela IBS/CBS');
    expect(findChildRoute('fiscal/ibs-cbs')?.alias).toEqual([
      '/pacote-ibs-cbs',
      '/ibs-cbs',
      '/estoque/configuracoes-fiscais/ibs-cbs',
      '/estoque/configuracoes-fiscais/tabela-ibs-cbs',
      '/estoque/cadastros/tabelas-ibs-cbs'
    ]);
    expect(findChildRoute('fiscal/pis-cofins')?.meta?.title).toBe('PIS / COFINS');
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
      expect.arrayContaining([
        '/urina',
        '/laboratorio/urina',
        '/laboratorio/atendimentos/urina',
        '/laboratorio/exames/urina'
      ])
    );
    expect(findChildRoute('laboratory/biochemistry')?.alias).toEqual(
      expect.arrayContaining([
        '/bioquimico',
        '/bioquímico',
        '/laboratorio/bioquimico',
        '/laboratorio/atendimentos/bioquimico',
        '/laboratorio/exames/bioquimico'
      ])
    );
    expect(findChildRoute('laboratory/equipment')?.alias).toEqual(
      expect.arrayContaining([
        '/equipamentos',
        '/laboratorio/equipamentos',
        '/laboratorio/cadastros/equipamentos'
      ])
    );
    expect(findChildRoute('laboratory/equipment/new')?.name).toBe('LaboratoryEquipmentNew');
    expect(findChildRoute('laboratory/equipment/:id')?.name).toBe('LaboratoryEquipmentDetail');
    expect(findChildRoute('laboratory/equipment/:id/edit')?.name).toBe('LaboratoryEquipmentEdit');
    expect(findChildRoute('laboratory/report-types')?.alias).toEqual(
      expect.arrayContaining([
        '/tipos-de-laudo',
        '/laboratorio/tipos-de-laudo',
        '/laboratorio/cadastros/tipos-de-laudo'
      ])
    );
    expect(findChildRoute('laboratory/report-types/new')?.name).toBe('LaboratoryReportTypeNew');
    expect(findChildRoute('laboratory/report-types/:id')?.name).toBe('LaboratoryReportTypeDetail');
    expect(findChildRoute('laboratory/report-types/:id/edit')?.name).toBe('LaboratoryReportTypeEdit');
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
    expect(findChildRoute('inventory/pharmacy')?.meta?.title).toBe('Requisição à Farmácia');
    expect(findChildRoute('inventory/pharmacy')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('inventory/pharmacy')?.alias).toEqual(
      expect.arrayContaining([
        '/requisicao-farmacia',
        '/requisicao-a-farmacia',
        '/requisição-à-farmácia',
        '/estoque/requisicao-farmacia',
        '/estoque/controles/requisicao-farmacia'
      ])
    );
    expect(findChildRoute('inventory/validity')?.meta?.title).toBe('Validade de Produtos');
    expect(findChildRoute('inventory/validity')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('inventory/validity')?.alias).toEqual(
      expect.arrayContaining([
        '/validade-de-produtos',
        '/validade-produtos',
        '/estoque/validade-de-produtos',
        '/estoque/controles/validade-de-produtos'
      ])
    );
    expect(findChildRoute('inventory/audit')?.meta?.title).toBe('Auditoria de Estoque');
    expect(findChildRoute('inventory/audit')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('inventory/audit')?.alias).toEqual(
      expect.arrayContaining([
        '/auditoria-de-estoque',
        '/auditoria-estoque',
        '/estoque/auditoria-de-estoque',
        '/estoque/controles/auditoria-de-estoque'
      ])
    );
    expect(findChildRoute('inventory/price-audit')?.meta?.title).toBe('Auditoria de Preços');
    expect(findChildRoute('inventory/price-audit')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('inventory/price-audit')?.alias).toEqual(
      expect.arrayContaining([
        '/auditoria-de-precos',
        '/auditoria-de-preços',
        '/auditoria-precos',
        '/estoque/auditoria-de-precos',
        '/estoque/controles/auditoria-de-precos'
      ])
    );
    expect(findChildRoute('inventory/purchases')?.meta?.title).toBe('Compras');
    expect(findChildRoute('inventory/purchases')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('inventory/purchases')?.alias).toEqual(
      expect.arrayContaining([
        '/compras',
        '/estoque/compras',
        '/estoque/controles/compras',
        '/compras-estoque',
        '/compras-de-estoque'
      ])
    );
    expect(findChildRoute('inventory/price-adjustments')?.meta?.title).toBe('Reajuste de Preços');
    expect(findChildRoute('inventory/price-adjustments')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('inventory/price-adjustments')?.alias).toEqual(
      expect.arrayContaining([
        '/reajuste-de-precos',
        '/reajuste-de-preços',
        '/reajuste-precos',
        '/estoque/reajuste-de-precos',
        '/estoque/controles/reajuste-de-precos'
      ])
    );
    expect(findChildRoute('inventory/data-collectors')?.meta?.title).toBe('Coletores de Dados');
    expect(findChildRoute('inventory/data-collectors')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('inventory/data-collectors')?.alias).toEqual(
      expect.arrayContaining([
        '/coletores-de-dados',
        '/coletores',
        '/coletor-de-dados',
        '/estoque/coletores-de-dados',
        '/estoque/controles/coletores-de-dados'
      ])
    );
    expect(findChildRoute('products')?.meta?.title).toBe('Produtos');
    expect(findChildRoute('products')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('products')?.alias).toEqual(
      expect.arrayContaining(['/produtos', '/estoque/produtos', '/estoque/cadastros/produtos', '/cadastros/produtos'])
    );
    expect(findChildRoute('products/new')?.alias).toEqual(
      expect.arrayContaining(['/produtos/novo', '/estoque/cadastros/produtos/novo'])
    );
    expect(findChildRoute('products/import')?.meta?.title).toBe('Importar Dados Produtos');
    expect(findChildRoute('products/import')?.meta?.breadcrumbParent).toBe('Produtos');
    expect(findChildRoute('products/import')?.alias).toEqual(
      expect.arrayContaining([
        '/produtos/importar',
        '/estoque/produtos/importar',
        '/estoque/cadastros/importar-dados-produtos'
      ])
    );
    expect(findChildRoute('vetus-imports')?.meta?.title).toBe('Importação Assistida Vetus');
    expect(findChildRoute('vetus-imports')?.meta?.breadcrumbParent).toBe('Cadastros');
    expect(findChildRoute('vetus-imports')?.alias).toEqual(
      expect.arrayContaining([
        '/vetus/importacao-assistida',
        '/importacao-vetus',
        '/atendimento/importacao-vetus'
      ])
    );
    expect(findChildRoute('suppliers')?.meta?.title).toBe('Fornecedores e Despesas');
    expect(findChildRoute('suppliers')?.alias).toEqual(
      expect.arrayContaining([
        '/fornecedores-e-despesas',
        '/fornecedores',
        '/estoque/fornecedores-e-despesas',
        '/estoque/cadastros/fornecedores-e-despesas'
      ])
    );
    expect(findChildRoute('warehouses')?.meta?.title).toBe('Estoques');
    expect(findChildRoute('warehouses')?.alias).toEqual(
      expect.arrayContaining(['/estoques', '/estoque/estoques', '/estoque/cadastros/estoques'])
    );
    expect(findChildRoute('manufacturers')?.meta?.title).toBe('Fabricantes');
    expect(findChildRoute('manufacturers')?.alias).toEqual(
      expect.arrayContaining(['/fabricantes', '/estoque/fabricantes', '/estoque/cadastros/fabricantes'])
    );
    expect(findChildRoute('product-groups')?.meta?.title).toBe('Grupos de Produto');
    expect(findChildRoute('product-groups')?.alias).toEqual(
      expect.arrayContaining([
        '/grupos-de-produto',
        '/grupos-de-produtos',
        '/grupos-produto',
        '/grupos-produtos',
        '/estoque/grupos-de-produto',
        '/estoque/cadastros/grupos-de-produto'
      ])
    );
    expect(findChildRoute('company-sectors')?.meta?.title).toBe('Setores da Empresa');
    expect(findChildRoute('company-sectors')?.alias).toEqual(
      expect.arrayContaining([
        '/setores',
        '/setores-da-empresa',
        '/estoque/setores',
        '/estoque/setores-da-empresa',
        '/estoque/cadastros/setores'
      ])
    );
    expect(findChildRoute('measurement-units')?.meta?.title).toBe('Unidades de Medida');
    expect(findChildRoute('measurement-units')?.alias).toEqual(
      expect.arrayContaining([
        '/unidades-de-medida',
        '/unidades-medida',
        '/estoque/unidades-de-medida',
        '/estoque/cadastros/unidades-de-medida'
      ])
    );
    expect(findChildRoute('products/:id')?.alias).toEqual(expect.arrayContaining(['/produtos/:id']));
    expect(findChildRoute('products/:id/edit')?.alias).toEqual(expect.arrayContaining(['/produtos/:id/editar']));
    expect(findChildRoute('inventory/transfers')?.meta?.title).toBe('Transferência entre Estoques');
    expect(findChildRoute('inventory/transfers')?.meta?.breadcrumbParent).toBe('Estoque');
    expect(findChildRoute('inventory/transfers')?.alias).toEqual(
      expect.arrayContaining([
        '/transferencia-entre-estoques',
        '/transferência-entre-estoques',
        '/transferencia-estoques',
        '/estoque/transferencia-entre-estoques',
        '/estoque/controles/transferencia-entre-estoques'
      ])
    );
    expect(findChildRoute('inventory/price-consultation')?.meta?.title).toBe('Consulta de Preços');
    expect(findChildRoute('inventory/price-consultation')?.alias).toEqual(
      expect.arrayContaining([
        '/consulta-de-precos',
        '/estoque/consulta-de-precos',
        '/estoque/controles/consulta-de-precos'
      ])
    );
    expect(findChildRoute('inventory/nf')?.meta?.title).toBe('Entrada de Nota Fiscal');
    expect(findChildRoute('inventory/nf')?.alias).toEqual(
      expect.arrayContaining([
        '/entrada-nota-fiscal',
        '/entrada-de-nota-fiscal',
        '/estoque/entrada-nota-fiscal',
        '/estoque/controles/entrada-nota-fiscal'
      ])
    );
    expect(findChildRoute('inventory/movements')?.meta?.title).toBe('Transação no Estoque');
    expect(findChildRoute('inventory/movements')?.alias).toEqual(
      expect.arrayContaining([
        '/transacao-no-estoque',
        '/transação-no-estoque',
        '/estoque/transacao-no-estoque',
        '/estoque/controles/transacao-no-estoque'
      ])
    );
    expect(findChildRoute('inventory/price-audit')?.meta?.title).toBe('Auditoria de Preços');
    expect(findChildRoute('finance/accounts-payable')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('finance/accounts-payable')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/controles/contas-a-pagar',
        '/contas-a-pagar'
      ])
    );
    expect(findChildRoute('finance/advance-payments')?.meta?.title).toBe('Pagamento Antecipado');
    expect(findChildRoute('finance/advance-payments')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/controles/pagamento-antecipado',
        '/pagamento-antecipado'
      ])
    );
    expect(findChildRoute('finance/card-accounts')?.meta?.title).toBe('Contas Adm. Cartão');
    expect(findChildRoute('finance/card-accounts')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/controles/contas-adm-cartao',
        '/financeiro/controles/contas-adm-cartão',
        '/contas-adm-cartao',
        '/contas-adm-cartão'
      ])
    );
    expect(findChildRoute('finance/cheques')?.meta?.title).toBe('Cheques');
    expect(findChildRoute('finance/cheques')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/controles/cheques',
        '/cheques'
      ])
    );
    expect(findChildRoute('finance/cash-flow')?.meta?.title).toBe('Fluxo de Caixa');
    expect(findChildRoute('finance/cash-flow')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/controles/fluxo-de-caixa',
        '/fluxo-de-caixa'
      ])
    );
    expect(findChildRoute('dashboards/curve-abc-clients')?.meta?.title).toBe('Curva ABC Clientes');
    expect(findChildRoute('dashboards/curve-abc-clients')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/controles/curva-abc-clientes',
        '/curva-abc-clientes'
      ])
    );
    expect(findChildRoute('dashboards/curve-abc')?.meta?.title).toBe('Curva ABC Produtos');
    expect(findChildRoute('dashboards/curve-abc')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/controles/curva-abc-produtos',
        '/curva-abc-produtos'
      ])
    );
    expect(findChildRoute('dashboards/multifilial')?.meta?.title).toBe('DashBoard do Multifilial');
    expect(findChildRoute('dashboards/multifilial')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/controles/dashboard-multifilial',
        '/dashboard-multifilial',
        '/multifilial'
      ])
    );
    expect(findChildRoute('dashboards/financial')?.meta?.title).toBe('Dashboard Financeiro');
    expect(findChildRoute('dashboards/financial')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/controles/dashboard-financeiro',
        '/dashboard-financeiro'
      ])
    );
    expect(findChildRoute('finance/timeline')?.meta?.title).toBe('Linha do Tempo');
    expect(findChildRoute('finance/timeline')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/controles/linha-do-tempo',
        '/linha-do-tempo'
      ])
    );
    expect(findChildRoute('finance/split')?.meta?.title).toBe('Configuração do Split');
    expect(findChildRoute('finance/split')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/maquininha/configuracao-do-split',
        '/financeiro/maquininha-de-cartao/configuracao-do-split',
        '/configuracao-do-split'
      ])
    );
    expect(findChildRoute('finance/card-machines')?.meta?.title).toBe('Maquininhas');
    expect(findChildRoute('finance/card-machines')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/maquininha/maquininhas',
        '/financeiro/maquininha-de-cartao/maquininhas',
        '/maquininhas'
      ])
    );
    expect(findChildRoute('finance/split/simulator')?.meta?.title).toBe('Simulador de Split');
    expect(findChildRoute('finance/split/simulator')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/maquininha/simulador-de-split',
        '/financeiro/maquininha-de-cartao/simulador-de-split',
        '/simulador-de-split'
      ])
    );
    expect(findChildRoute('finance/card-transactions')?.meta?.title).toBe('Transações de Cartão');
    expect(findChildRoute('finance/card-transactions')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/maquininha/transacoes-de-cartao',
        '/financeiro/maquininha-de-cartao/transacoes-de-cartao',
        '/transacoes-de-cartao'
      ])
    );
    expect(findChildRoute('finance/split/export')?.meta?.title).toBe('Exportador de Split');
    expect(findChildRoute('finance/split/export')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/maquininha/exportador-de-split',
        '/financeiro/maquininha-de-cartao/exportador-de-split',
        '/exportador-de-split'
      ])
    );
    expect(findChildRoute('finance/payment-enablement')?.meta?.title).toBe('Habilitar Pagamento');
    expect(findChildRoute('finance/payment-enablement')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/maquininha/habilitar-pagamento',
        '/financeiro/maquininha-de-cartao/habilitar-pagamento',
        '/habilitar-pagamento'
      ])
    );
    expect(findChildRoute('finance/payments-dashboard')?.meta?.title).toBe('Pagamento Dashboard');
    expect(findChildRoute('finance/payments-dashboard')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/maquininha/pagamento-dashboard',
        '/financeiro/maquininha-de-cartao/pagamento-dashboard',
        '/pagamento-dashboard'
      ])
    );
    expect(findChildRoute('payment-methods')?.meta?.title).toBe('Formas de Pagamento');
    expect(findChildRoute('payment-methods')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/cadastros/formas-de-pagamento',
        '/financeiro/cadastros/formas-pagamento',
        '/formas-de-pagamento'
      ])
    );
    expect(findChildRoute('cost-centers')?.meta?.title).toBe('Centros de Custo');
    expect(findChildRoute('cost-centers')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/cadastros/centros-de-custo',
        '/financeiro/cadastros/centros-custo',
        '/centros-de-custo'
      ])
    );
    expect(findChildRoute('expenses')?.meta?.title).toBe('Custos e Despesas');
    expect(findChildRoute('expenses')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/cadastros/custos-e-despesas',
        '/financeiro/cadastros/custos-despesas',
        '/custos-e-despesas'
      ])
    );
    expect(findChildRoute('cards')?.meta?.title).toBe('Cartões Débito/Crédito');
    expect(findChildRoute('cards')?.alias).toEqual(
      expect.arrayContaining([
        '/financeiro/cadastros/cartoes-debito-credito',
        '/financeiro/cadastros/cartoes-debito-e-credito',
        '/cartoes-debito-credito'
      ])
    );
    expect(findChildRoute('banks')?.meta?.title).toBe('Bancos');
    expect(findChildRoute('banks')?.alias).toEqual(
      expect.arrayContaining(['/financeiro/cadastros/bancos', '/financeiro/bancos', '/bancos'])
    );
    expect(findChildRoute('marketing/sms')?.meta?.title).toBe('Envio de SMS Simples');
    expect(findChildRoute('marketing/sms')?.meta?.breadcrumbParent).toBe('Marketing');
    expect(findChildRoute('marketing/vaccine-email')?.meta?.breadcrumbParent).toBe('Marketing');
    expect(findChildRoute('marketing/sms-settings')?.meta?.title).toBe('Configurações de SMS');
    expect(findChildRoute('administration/settings')?.meta?.breadcrumbParent).toBe('Administração');
    expect(findChildRoute('dashboards/multifilial')?.meta?.breadcrumbParent).toBe('Financeiro');
    expect(findChildRoute('vaccines-dewormers')?.meta?.breadcrumbParent).toBe('Atendimento');
    expect(findChildRoute('responsibility-terms')?.meta?.title).toBe('Termos de Responsabilidade');
    expect(findChildRoute('customer-groups')?.meta?.title).toBe('Grupos de Clientes');
    expect(findChildRoute('laboratory/hemogram-reference-values')?.meta?.title).toBe('Vlr. Ref. Hemograma');
    expect(findChildRoute('laboratory/hemogram-reference-values')?.alias).toEqual(
      expect.arrayContaining([
        '/vlr-ref-hemograma',
        '/laboratorio/vlr-ref-hemograma',
        '/laboratorio/cadastros/vlr-ref-hemograma'
      ])
    );
    expect(findChildRoute('laboratory/hemogram-reference-values/new')?.name).toBe('LaboratoryHemogramReferenceValueNew');
    expect(findChildRoute('laboratory/hemogram-reference-values/:id')?.name).toBe('LaboratoryHemogramReferenceValueDetail');
    expect(findChildRoute('laboratory/hemogram-reference-values/:id/edit')?.name).toBe('LaboratoryHemogramReferenceValueEdit');
    expect(findChildRoute('laboratory/biochemistry-reference-values')?.meta?.title).toBe('Vlr. Ref. Bioquímico');
    expect(findChildRoute('laboratory/biochemistry-reference-values')?.alias).toEqual(
      expect.arrayContaining([
        '/vlr-ref-bioquimico',
        '/laboratorio/vlr-ref-bioquimico',
        '/laboratorio/cadastros/vlr-ref-bioquimico'
      ])
    );
    expect(findChildRoute('laboratory/biochemistry-reference-values/new')?.name).toBe('LaboratoryBiochemistryReferenceValueNew');
    expect(findChildRoute('laboratory/biochemistry-reference-values/:id')?.name).toBe('LaboratoryBiochemistryReferenceValueDetail');
    expect(findChildRoute('laboratory/biochemistry-reference-values/:id/edit')?.name).toBe('LaboratoryBiochemistryReferenceValueEdit');
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
    expect(findChildRoute('tabelas-de-preco')?.alias).toEqual(
      expect.arrayContaining([
        '/price-tables',
        '/tabelas-de-preços',
        '/estoque/tabelas-de-preco',
        '/estoque/cadastros/tabelas-de-preco'
      ])
    );
    expect(findChildRoute('pontos-de-venda')?.meta?.title).toBe('Pontos de venda');
    expect(findChildRoute('pontos-de-venda')?.meta?.breadcrumbParent).toBe('Estoque');
  });

  it('uses a Vetus-like concrete route for fiscal NFS-e table', () => {
    const nfseRoute = findChildRoute('fiscal/nfse');

    expect(nfseRoute?.name).toBe('FiscalNFSELayout');
    expect(nfseRoute?.component).toBeTruthy();
    expect(nfseRoute?.meta?.title).toBe('Tabela NFS-e');
    expect(nfseRoute?.meta?.breadcrumb).toBe('Tabela NFS-e');
    expect(nfseRoute?.meta?.breadcrumbParent).toBe('Configurações Fiscais');
    expect(nfseRoute?.alias).toEqual(
      expect.arrayContaining([
        '/nfse',
        '/estoque/configuracoes-fiscais/nfse',
        '/estoque/configuracoes-fiscais/tabela-nfse'
      ])
    );
  });

  it('uses a Vetus-like concrete route for fiscal ICMS state matrix', () => {
    const matrixRoute = findChildRoute('fiscal/icms-matrix');

    expect(matrixRoute?.name).toBe('FiscalICMSMatrix');
    expect(matrixRoute?.component).toBeTruthy();
    expect(matrixRoute?.meta?.title).toBe('Matriz Estado ICMS');
    expect(matrixRoute?.meta?.breadcrumb).toBe('Matriz Estado ICMS');
    expect(matrixRoute?.meta?.breadcrumbParent).toBe('Configurações Fiscais');
    expect(matrixRoute?.alias).toEqual(
      expect.arrayContaining([
        '/matriz-icms',
        '/estoque/configuracoes-fiscais/matriz-icms',
        '/estoque/configuracoes-fiscais/matriz-estado-icms'
      ])
    );
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
    expect(findChildRoute('dashboards/financial')?.meta?.title).toBe('Dashboard Financeiro');
    expect(findChildRoute('finance/timeline')?.meta?.title).toBe('Linha do Tempo');
    expect(findChildRoute('finance/split')?.meta?.title).toBe('Configuração do Split');
    expect(findChildRoute('finance/card-machines')?.meta?.title).toBe('Maquininhas');
    expect(findChildRoute('finance/split/simulator')?.meta?.title).toBe('Simulador de Split');
    expect(findChildRoute('finance/split/export')?.meta?.title).toBe('Exportador de Split');
    expect(findChildRoute('finance/payment-enablement')?.meta?.title).toBe('Habilitar Pagamento');
    expect(findChildRoute('finance/payments-dashboard')?.meta?.title).toBe('Pagamento Dashboard');
    expect(findChildRoute('payment-methods')?.meta?.title).toBe('Formas de Pagamento');
    expect(findChildRoute('cost-centers')?.meta?.title).toBe('Centros de Custo');
    expect(findChildRoute('expenses')?.meta?.title).toBe('Custos e Despesas');
    expect(findChildRoute('cards')?.meta?.title).toBe('Cartões Débito/Crédito');
    expect(findChildRoute('banks')?.meta?.title).toBe('Bancos');
    expect(findChildRoute('dashboards/curve-abc')?.meta?.title).toBe('Curva ABC Produtos');
    expect(findChildRoute('dashboards/multifilial')?.meta?.title).toBe('DashBoard do Multifilial');
    expect(findChildRoute('reports/audit/appointments')?.meta?.title).toBe('Auditoria de Agendamentos');
    expect(findChildRoute('reports/registers/services')?.meta?.title).toBe('Serviços');
    expect(findChildRoute('reports/inventory-products')?.meta?.title).toBe('Relatório de Produtos');
    expect(findChildRoute('rh/professions')?.meta?.title).toBe('Profissões');
  });
});
