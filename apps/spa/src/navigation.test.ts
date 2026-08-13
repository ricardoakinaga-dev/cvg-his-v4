import { describe, expect, it } from 'vitest';

import {
  enterpriseConsole,
  findMatchingNavGroup,
  findMatchingNavItem,
  findMatchingNavLocation,
  navGroups
} from './navigation';

function findGroup(groupId: string) {
  return navGroups.find((group) => group.id === groupId);
}

function findGroupPaths(groupId: string) {
  return findGroup(groupId)?.sections.flatMap((section) => section.items.map((item) => item.path)) ?? [];
}

function findSectionLabels(groupId: string) {
  return findGroup(groupId)?.sections.map((section) => section.label) ?? [];
}

function findSectionItemLabels(groupId: string, sectionLabel: string) {
  return findGroup(groupId)?.sections.find((section) => section.label === sectionLabel)?.items.map((item) => item.label) ?? [];
}

describe('navigation groups', () => {
  it('publishes the ERP modules in the vetus-like layout order', () => {
    expect(navGroups.map((group) => group.label)).toEqual([
      'Início',
      'Atendimento',
      'Laboratório',
      'Estoque',
      'Financeiro',
      'Marketing',
      'RH',
      'Relatórios',
      'Administração'
    ]);
  });

  it('keeps the Vetus atendimento structure before CVG-specific assistential tools', () => {
    expect(findSectionLabels('atendimento')).toEqual([
      'Atendimentos',
      'Internação',
      'Cadastros',
      'Fluxo Assistencial CVG'
    ]);
    expect(findSectionItemLabels('atendimento', 'Atendimentos')).toEqual([
      'Recepção',
      'Agenda',
      'Comandas',
      'Vendas',
      'Pacotes',
      'Esteira',
      'Esteira de Exames',
      'Vacinas e Vermífugos',
      'Orçamentos',
      'Resgate de Pontos'
    ]);
    expect(findSectionItemLabels('atendimento', 'Internação')).toEqual(['Internação', 'Diárias de Internação']);
    expect(findSectionItemLabels('atendimento', 'Cadastros')).toEqual([
      'Animais',
      'Clientes',
      'Serviços',
      'Importar Dados Serviços',
      'Importação Assistida Vetus',
      'Termos de Responsabilidade',
      'Raças',
      'Espécies',
      'Cores',
      'Grupos de Clientes',
      'Boxes de Internação',
      'Webhooks'
    ]);
  });

  it('keeps Vetus laboratory, finance and marketing sections separate from CVG extras', () => {
    expect(findSectionLabels('laboratorio')).toEqual(['Atendimentos', 'Cadastros', 'Integrações CVG']);
    expect(findSectionItemLabels('laboratorio', 'Atendimentos')).toEqual([
      'Exames',
      'Laudos',
      'Hemogramas',
      'Urina',
      'Bioquímico'
    ]);
    expect(findSectionLabels('financeiro')).toEqual([
      'Gaveta',
      'Controles',
      'Maquininha de Cartão',
      'Cadastros',
      'Pagamentos CVG'
    ]);
    expect(findSectionItemLabels('financeiro', 'Cadastros')).toEqual([
      'Formas de Pagamento',
      'Centros de Custo',
      'Custos e Despesas',
      'Cartões Débito/Crédito',
      'Bancos'
    ]);
    expect(findSectionLabels('marketing')).toEqual(['Envios', 'Configurações', 'Canais CVG']);
    expect(findSectionItemLabels('marketing', 'Envios')).toEqual([
      'Envio de SMS Simples',
      'Campanhas de Marketing'
    ]);
  });

  it('finds direct nav items with the new labels exposed in the frontend', () => {
    expect(findMatchingNavItem('/patients')?.label).toBe('Animais');
    expect(findMatchingNavItem('/owners')?.label).toBe('Clientes');
    expect(findMatchingNavItem('/reception')?.label).toBe('Recepção');
    expect(findMatchingNavItem('/queue')?.label).toBe('Esteira');
    expect(findMatchingNavItem('/marketing/campaigns')?.label).toBe('Campanhas de Marketing');
    expect(findMatchingNavItem('/access-control')?.label).toBe('Grupos de Acesso');
    expect(findMatchingNavItem('/encounters')?.label).toBe('Atendimentos');
    expect(findMatchingNavItem('/triage')?.label).toBe('Triagem');
    expect(findMatchingNavItem('/prescriptions')?.label).toBe('Prescrições');
    expect(findMatchingNavItem('/exam-orders')?.label).toBe('Esteira de Exames');
    expect(findMatchingNavItem('/exam-results')?.label).toBe('Resultados API');
    expect(findMatchingNavItem('/sales/beta')?.label).toBe('Vendas');
    expect(findMatchingNavItem('/pix')?.label).toBe('PIX');
    expect(findMatchingNavItem('/reports')?.label).toBe('Visão por Domínio');
  });

  it('keeps scheduling only as a legacy route outside the primary menu', () => {
    expect(findMatchingNavItem('/scheduling')).toBeUndefined();
    expect(findGroupPaths('atendimento')).not.toContain('/scheduling');
  });

  it('keeps the legacy beta sales route out of the primary menu', () => {
    expect(findGroupPaths('atendimento')).not.toContain('/sales/beta');
  });

  it('exposes the requested items for each key module', () => {
    expect(findGroupPaths('inicio')).toEqual(expect.arrayContaining(['/']));

    expect(findGroupPaths('atendimento')).toEqual(
      expect.arrayContaining([
        '/appointments',
        '/reception',
        '/counter-sales',
        '/sales',
        '/packages',
        '/queue',
        '/exam-orders',
        '/vaccines-dewormers',
        '/quotes',
        '/loyalty',
        '/inpatient',
        '/encounters',
        '/medical-records',
        '/triage',
        '/prescriptions',
        '/prescription-executions',
        '/surgery',
        '/discharges',
        '/inpatient/board',
        '/beds',
        '/patients',
        '/owners',
        '/services',
        '/services/import',
        '/vetus-imports',
        '/responsibility-terms',
        '/breeds',
        '/species',
        '/coat-colors',
        '/customer-groups',
        '/webhooks'
      ])
    );

    expect(findGroupPaths('laboratorio')).toEqual(
      expect.arrayContaining([
        '/laboratory',
        '/laboratory/orders',
        '/laboratory/results',
        '/exam-orders',
        '/exam-results',
        '/laboratory/hemograms',
        '/laboratory/urinalysis',
        '/laboratory/biochemistry',
        '/laboratory/equipment',
        '/diagnostics',
        '/laboratory/report-types',
        '/laboratory/hemogram-reference-values',
        '/laboratory/biochemistry-reference-values'
      ])
    );

    expect(findGroupPaths('estoque')).toEqual(
      expect.arrayContaining([
        '/inventory/price-consultation',
        '/inventory/nf',
        '/inventory/movements',
        '/inventory/pharmacy',
        '/inventory/validity',
        '/inventory/audit',
        '/inventory/price-audit',
        '/inventory/transfers',
        '/inventory/purchases',
        '/inventory/price-adjustments',
        '/inventory/data-collectors',
        '/products',
        '/products/import',
        '/suppliers',
        '/warehouses',
        '/manufacturers',
        '/product-groups',
        '/company-sectors',
        '/measurement-units',
        '/tabelas-de-preco',
        '/pontos-de-venda',
        '/fiscal/icms',
        '/fiscal/ipi',
        '/fiscal/pis',
        '/fiscal/cofins',
        '/fiscal/cfop',
        '/fiscal/nfse',
        '/fiscal/ibs-cbs',
        '/fiscal/icms-matrix'
      ])
    );

    expect(findGroupPaths('financeiro')).toEqual(
      expect.arrayContaining([
        '/billing',
        '/finance/accounts-payable',
        '/finance/advance-payments',
        '/finance/card-accounts',
        '/cash',
        '/finance/cheques',
        '/finance/cash-flow',
        '/dashboards/curve-abc-clients',
        '/dashboards/curve-abc',
        '/dashboards/multifilial',
        '/dashboards/financial',
        '/finance/timeline',
        '/finance/split',
        '/finance/card-machines',
        '/finance/split/simulator',
        '/finance/card-transactions',
        '/finance/split/export',
        '/finance/payment-enablement',
        '/finance/payments-dashboard',
        '/cards',
        '/pix',
        '/payment-methods',
        '/banks',
        '/cost-centers',
        '/expenses'
      ])
    );

    expect(findGroupPaths('marketing')).toEqual(
      expect.arrayContaining(['/marketing/sms', '/marketing/campaigns', '/notifications/whatsapp', '/marketing/vaccine-email', '/marketing/sms-settings'])
    );

    expect(findGroupPaths('rh')).toEqual(
      expect.arrayContaining(['/users', '/access-control', '/staff', '/commission-calculations', '/commission-rules', '/time-off'])
    );

    expect(findGroupPaths('relatorios')).toEqual(
      expect.arrayContaining([
        '/reports',
        '/reports/financial',
        '/reports/dre',
        '/reports/appointments',
        '/reports/professional-care',
        '/reports/registers/services',
        '/reports/inventory',
        '/reports/inventory-products',
        '/administrative-reports'
      ])
    );
  });

  it('matches nested routes back to the new module group', () => {
    expect(findMatchingNavGroup('/patients/new')?.id).toBe('atendimento');
    expect(findMatchingNavGroup('/appointments/123')?.id).toBe('atendimento');
    expect(findMatchingNavGroup('/inventory/transfers/manual')?.id).toBe('estoque');
    expect(findMatchingNavGroup('/fiscal/icms/rules')?.id).toBe('estoque');
    expect(findMatchingNavGroup('/dashboards/financial/detail')?.id).toBe('financeiro');
    expect(findMatchingNavGroup('/access-control/roles')?.id).toBe('rh');
    expect(findMatchingNavGroup('/prescription-executions/enc-1')?.id).toBe('atendimento');
    expect(findMatchingNavGroup('/reports/appointments/monthly')?.id).toBe('relatorios');
  });

  it('keeps extra platform tools in the enterprise utility area', () => {
    const location = findMatchingNavLocation('/api-keys/new-token');
    expect(location?.area).toBe('enterprise');
    expect(location?.group.id).toBe(enterpriseConsole.id);
    expect(location?.item.label).toBe('Chaves de API');
  });

  it('falls back to the first group when the path is unknown', () => {
    expect(findMatchingNavGroup('/route-that-does-not-exist')?.id).toBe(navGroups[0].id);
  });
});
