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
  it('keeps the official Vetus-aligned ERP shell groups', () => {
    expect(navGroups.map((group) => group.label)).toEqual([
      'Início',
      'Atendimento',
      'Laboratório',
      'Estoque',
      'Financeiro',
      'Marketing',
      'RH',
      'Relatórios'
    ]);
  });

  it('finds the direct nav item for canonical routes', () => {
    expect(findMatchingNavItem('/patients')?.label).toBe('Pacientes');
    expect(findMatchingNavItem('/appointments')?.label).toBe('Agenda');
    expect(findMatchingNavItem('/queue')?.label).toBe('Fila Operacional');
    expect(findMatchingNavItem('/notifications')?.label).toBe('Central de Notificações');
  });

  it('keeps scheduling only as a legacy route outside the primary menu', () => {
    expect(findMatchingNavItem('/scheduling')).toBeUndefined();
    expect(findGroupPaths('atendimento')).not.toContain('/scheduling');
  });

  it('publishes the mandatory laboratory, inventory, atendimento e finance routes in the official map', () => {
    expect(findGroupPaths('atendimento')).toEqual(
      expect.arrayContaining(['/patients', '/owners', '/appointments', '/encounters', '/counter-sales'])
    );

    expect(findGroupPaths('laboratorio')).toEqual(
      expect.arrayContaining([
        '/laboratory',
        '/laboratory/orders',
        '/laboratory/results',
        '/laboratory/equipment',
        '/laboratory/report-types',
        '/laboratory/reference-values',
        '/diagnostics'
      ])
    );

    expect(findGroupPaths('estoque')).toEqual(
      expect.arrayContaining([
        '/inventory',
        '/inventory/movements',
        '/inventory/validity',
        '/products',
        '/fiscal'
      ])
    );

    expect(findGroupPaths('financeiro')).toEqual(
      expect.arrayContaining(['/billing', '/cash', '/pix', '/quotes'])
    );
  });

  it('matches nested routes back to their domain group', () => {
    expect(findMatchingNavGroup('/patients/new')?.id).toBe('atendimento');
    expect(findMatchingNavGroup('/appointments/123')?.id).toBe('atendimento');
    expect(findMatchingNavGroup('/inventory/stock-adjustment')?.id).toBe('estoque');
    expect(findMatchingNavGroup('/laboratory/results/export')?.id).toBe('laboratorio');
    expect(findMatchingNavGroup('/fiscal/icms/rules')?.id).toBe('estoque');
    expect(findMatchingNavGroup('/quotes/123')?.id).toBe('financeiro');
  });

  it('detects enterprise console routes outside the primary ERP navbar', () => {
    const location = findMatchingNavLocation('/api-keys/new-token');
    expect(location?.area).toBe('enterprise');
    expect(location?.group.id).toBe(enterpriseConsole.id);
    expect(location?.item.label).toBe('Chaves de API');
  });

  it('falls back to the first group when the path is unknown', () => {
    expect(findMatchingNavGroup('/route-that-does-not-exist')?.id).toBe(navGroups[0].id);
  });
});
