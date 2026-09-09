import { describe, expect, it } from 'vitest';
import {
  canAccessNavigationItem,
  canAccessNavigationPath,
  canAccessPersistedRoute,
  hasNavigationPermissionRule,
  persistedRoutePermissionAllowlist
} from './navigation-permissions';
import {
  navigationPermissionAliases,
  navigationPermissionCodes
} from './navigation-permission-catalog';
import { flattenAllNavItems } from './navigation';

describe('persisted navigation permissions', () => {
  it('fails closed while the session is not resolved or for unknown routes', () => {
    expect(canAccessPersistedRoute('/appointments', null)).toBe(false);
    expect(canAccessPersistedRoute('/module-that-was-added-later', [])).toBe(false);
    expect(hasNavigationPermissionRule('/module-that-was-added-later')).toBe(false);
  });

  it('allows the home route and strips query/hash before applying the rule', () => {
    expect(canAccessPersistedRoute('/', [])).toBe(true);
    expect(
      canAccessPersistedRoute('/appointments?date=2026-09-07#today', ['scheduling.read'])
    ).toBe(true);
    expect(canAccessPersistedRoute('/appointments?date=2026-09-07', ['owners.read'])).toBe(false);
  });

  it('requires the permission for parameterized detail routes too', () => {
    expect(canAccessPersistedRoute('/medical-records/encounter-1', ['medical-records.read'])).toBe(
      true
    );
    expect(canAccessPersistedRoute('/medical-records/encounter-1', ['triage.read'])).toBe(false);
  });

  it('has an explicit permission contract for every canonical menu item', () => {
    const canonicalPaths = new Set(flattenAllNavItems().map((item) => item.path));

    expect(
      [...canonicalPaths].filter((path) => !Object.hasOwn(navigationPermissionCodes, path))
    ).toEqual([]);
    expect(
      [...canonicalPaths].every((path) =>
        persistedRoutePermissionAllowlist.some((rule) => rule.route === path)
      )
    ).toBe(true);
  });

  it('keeps every legacy navigation alias in the same authorization catalog', () => {
    const treeAliases = flattenAllNavItems().flatMap((item) => item.aliases ?? []).sort();
    const catalogAliases = Object.values(navigationPermissionAliases).flat().sort();

    expect(catalogAliases).toEqual(treeAliases);

    for (const [canonicalPath, aliases] of Object.entries(navigationPermissionAliases)) {
      const permissionCodes = navigationPermissionCodes[canonicalPath];
      expect(permissionCodes).toBeDefined();
      for (const alias of aliases) {
        expect(canAccessNavigationPath(alias, permissionCodes ?? [])).toBe(true);
      }
    }
  });

  it('filters finance away from scheduling while keeping its commercial routes', () => {
    const financePermissions = [
      'billing.read',
      'billing.manage',
      'fiscal.read',
      'counter_sale.read',
      'product.read',
      'service.read',
      'quote.read',
      'owners.read',
      'patients.read',
      'encounters.read',
      'notifications.read'
    ];

    expect(canAccessNavigationPath('/appointments', financePermissions)).toBe(false);
    expect(canAccessNavigationPath('/queue', financePermissions)).toBe(false);
    expect(canAccessNavigationPath('/reports/appointments', financePermissions)).toBe(false);
    expect(canAccessNavigationPath('/counter-sales', financePermissions)).toBe(true);
    expect(canAccessNavigationPath('/dashboards/financial', financePermissions)).toBe(true);
    expect(canAccessNavigationPath('/services', financePermissions)).toBe(true);
    expect(canAccessNavigationPath('/services/import', financePermissions)).toBe(false);
  });

  it('applies the same guard to items, aliases and valid profiles', () => {
    const receptionPermissions = ['owners.read', 'patients.read', 'scheduling.read'];
    const adminPermissions = [
      'audit.read',
      'access.read',
      'flags.admin',
      'integrations.read',
      'diagnostics.read',
      'billing.read'
    ];
    const agenda = flattenAllNavItems().find((item) => item.path === '/appointments');
    const comandas = flattenAllNavItems().find((item) => item.path === '/counter-sales');

    expect(agenda).toBeDefined();
    expect(comandas).toBeDefined();
    expect(canAccessNavigationItem(agenda!, receptionPermissions)).toBe(true);
    expect(canAccessNavigationItem(agenda!, ['counter_sale.read'])).toBe(false);
    expect(canAccessNavigationItem(comandas!, ['counter_sale.read'])).toBe(true);
    expect(canAccessNavigationPath('/comandas', ['counter_sale.read'])).toBe(true);
    expect(canAccessNavigationPath('/administration/settings', adminPermissions)).toBe(true);
    expect(canAccessNavigationPath('/api-client', adminPermissions)).toBe(true);
    expect(canAccessNavigationPath('/laboratory/results', adminPermissions)).toBe(true);
    expect(canAccessNavigationPath('/route-added-without-review', adminPermissions)).toBe(false);
  });
});
