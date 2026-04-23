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

describe('navigation groups', () => {
  it('publishes the ERP modules in the vetus-like layout order', () => {
    expect(navGroups.map((group) => group.label)).toEqual([
      'Dashboards',
      'Atendimento',
      'Cadastros',
      'Laboratório',
      'Estoque',
      'Fiscal',
      'Financeiro',
      'Marketing',
      'RH',
      'Relatórios',
      'Administração'
    ]);
  });

  it('finds direct nav items with the new labels exposed in the frontend', () => {
    expect(findMatchingNavItem('/patients')?.label).toBe('Animais');
    expect(findMatchingNavItem('/owners')?.label).toBe('Clientes');
    expect(findMatchingNavItem('/queue')?.label).toBe('Esteira');
    expect(findMatchingNavItem('/notifications')?.label).toBe('Campanhas');
    expect(findMatchingNavItem('/access-control')?.label).toBe('Grupos de Acesso');
    expect(findMatchingNavItem('/encounters')?.label).toBe('Atendimentos');
    expect(findMatchingNavItem('/triage')?.label).toBe('Triagem');
    expect(findMatchingNavItem('/appointments/availability')?.label).toBe('Disponibilidade');
    expect(findMatchingNavItem('/appointments/types')?.label).toBe('Tipos de Agendamento');
    expect(findMatchingNavItem('/prescriptions')?.label).toBe('Prescrições');
    expect(findMatchingNavItem('/exam-orders')?.label).toBe('Pedidos API');
    expect(findMatchingNavItem('/exam-results')?.label).toBe('Resultados API');
    expect(findMatchingNavItem('/pix')?.label).toBe('PIX');
    expect(findMatchingNavItem('/reports')?.label).toBe('Visão por Domínio');
  });

  it('keeps scheduling only as a legacy route outside the primary menu', () => {
    expect(findMatchingNavItem('/scheduling')).toBeUndefined();
    expect(findGroupPaths('atendimento')).not.toContain('/scheduling');
  });

  it('exposes the requested items for each key module', () => {
    expect(findGroupPaths('dashboards')).toEqual(
      expect.arrayContaining(['/', '/dashboards/financial', '/dashboards/multifilial', '/dashboards/curve-abc'])
    );

    expect(findGroupPaths('atendimento')).toEqual(
      expect.arrayContaining([
        '/appointments',
        '/appointments/availability',
        '/appointments/types',
        '/counter-sales',
        '/sales',
        '/packages',
        '/queue',
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
        '/sectors',
        '/beds'
      ])
    );

    expect(findGroupPaths('cadastros')).toEqual(
      expect.arrayContaining([
        '/patients',
        '/owners',
        '/services',
        '/breeds',
        '/species',
        '/coat-colors',
        '/webhooks',
        '/suppliers',
        '/manufacturers',
        '/product-groups',
        '/warehouses'
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
        '/laboratory/reference-values'
      ])
    );

    expect(findGroupPaths('estoque')).toEqual(
      expect.arrayContaining(['/inventory', '/products', '/inventory/movements', '/inventory/validity'])
    );

    expect(findGroupPaths('fiscal')).toEqual(
      expect.arrayContaining([
        '/fiscal',
        '/fiscal/icms',
        '/fiscal/ipi',
        '/fiscal/pis',
        '/fiscal/cofins',
        '/fiscal/cfop',
        '/fiscal/nfse',
        '/fiscal/ibs-cbs',
        '/fiscal/pis-cofins',
        '/fiscal/ncm',
        '/fiscal/icms-matrix'
      ])
    );

    expect(findGroupPaths('financeiro')).toEqual(
      expect.arrayContaining([
        '/billing',
        '/cash',
        '/cards',
        '/pix',
        '/payment-methods',
        '/banks',
        '/cost-centers',
        '/expenses'
      ])
    );

    expect(findGroupPaths('marketing')).toEqual(
      expect.arrayContaining(['/notifications', '/notifications/whatsapp'])
    );

    expect(findGroupPaths('rh')).toEqual(
      expect.arrayContaining(['/staff', '/commission-calculations', '/commission-rules', '/time-off'])
    );

    expect(findGroupPaths('relatorios')).toEqual(
      expect.arrayContaining([
        '/reports',
        '/reports/financial',
        '/reports/appointments',
        '/reports/encounters',
        '/reports/registers',
        '/administrative-reports'
      ])
    );
  });

  it('matches nested routes back to the new module group', () => {
    expect(findMatchingNavGroup('/patients/new')?.id).toBe('cadastros');
    expect(findMatchingNavGroup('/appointments/123')?.id).toBe('atendimento');
    expect(findMatchingNavGroup('/inventory/transfers/manual')?.id).toBe('estoque');
    expect(findMatchingNavGroup('/fiscal/icms/rules')?.id).toBe('fiscal');
    expect(findMatchingNavGroup('/dashboards/financial/detail')?.id).toBe('dashboards');
    expect(findMatchingNavGroup('/access-control/roles')?.id).toBe('administracao');
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
