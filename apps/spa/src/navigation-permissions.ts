import {
  navigationPermissionAliases,
  navigationPermissionCodes
} from '@/navigation-permission-catalog';
import type { AppNavItem } from '@/navigation';

export interface PersistedRoutePermissionRule {
  route: string;
  pattern: RegExp;
  permissionCodes: readonly string[];
}

export type SessionPermissionSnapshot = readonly string[] | null;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactPattern(route: string): RegExp {
  return new RegExp(`^${escapeRegExp(route)}$`);
}

function exactRule(
  route: string,
  permissionCodes: readonly string[]
): PersistedRoutePermissionRule {
  return { route, pattern: exactPattern(route), permissionCodes };
}

function parameterRule(
  route: string,
  pattern: RegExp,
  permissionCodes: readonly string[]
): PersistedRoutePermissionRule {
  return { route, pattern, permissionCodes };
}

/**
 * Routes that are real SPA entry points but are not themselves menu items.
 * Specific write/detail routes must precede their collection routes so a
 * read-only session cannot inherit a write permission from a parent path.
 */
const extraRoutePermissionAllowlist: readonly PersistedRoutePermissionRule[] = [
  exactRule('/notifications', ['notifications.read']),
  exactRule('/inventory', ['inventory.read']),
  exactRule('/fiscal', ['fiscal.read']),
  exactRule('/fiscal/ipi-operacional', ['fiscal.read']),
  exactRule('/fiscal/pis-cofins', ['fiscal.read']),
  exactRule('/fiscal/ncm', ['fiscal.read']),
  exactRule('/appointments/availability', ['scheduling.read']),
  exactRule('/appointments/types', ['scheduling.read']),
  exactRule('/scheduling', ['scheduling.read']),
  exactRule('/scheduling/legacy', ['scheduling.read']),
  exactRule('/scheduling/new', ['scheduling.manage']),
  exactRule('/scheduling/legacy/new', ['scheduling.manage']),
  exactRule('/appointments/new', ['scheduling.manage']),
  parameterRule('/appointments/:id', /^\/appointments\/[^/]+$/, ['scheduling.read']),
  parameterRule('/medical-records/:id', /^\/medical-records\/[^/]+$/, ['medical-records.read']),
  parameterRule('/counter-sales/:id', /^\/counter-sales\/[^/]+$/, ['counter_sale.read']),
  exactRule('/encounters/new', ['encounters.manage']),
  parameterRule('/encounters/:id', /^\/encounters\/[^/]+$/, ['encounters.read']),
  exactRule('/reports/accounts', ['billing.read']),
  exactRule('/reports/encounters', ['encounters.read']),
  exactRule('/reports/registers', [
    'billing.read',
    'owners.read',
    'patients.read',
    'inventory.read',
    'service.read'
  ]),
  exactRule('/owners/new', ['owners.manage']),
  parameterRule('/owners/:id/edit', /^\/owners\/[^/]+\/edit$/, ['owners.manage']),
  parameterRule('/owners/:id', /^\/owners\/[^/]+$/, ['owners.read']),
  exactRule('/patients/new', ['patients.manage']),
  parameterRule('/patients/:id/edit', /^\/patients\/[^/]+\/edit$/, ['patients.manage']),
  parameterRule('/patients/:id', /^\/patients\/[^/]+$/, ['patients.read']),
  exactRule('/breeds/new', ['service.write']),
  parameterRule('/breeds/:id/edit', /^\/breeds\/[^/]+\/edit$/, ['service.write']),
  parameterRule('/breeds/:id', /^\/breeds\/[^/]+$/, ['service.read']),
  exactRule('/species/new', ['service.write']),
  parameterRule('/species/:id/edit', /^\/species\/[^/]+\/edit$/, ['service.write']),
  parameterRule('/species/:id', /^\/species\/[^/]+$/, ['service.read']),
  exactRule('/coat-colors/new', ['service.write']),
  parameterRule('/coat-colors/:id/edit', /^\/coat-colors\/[^/]+\/edit$/, ['service.write']),
  parameterRule('/coat-colors/:id', /^\/coat-colors\/[^/]+$/, ['service.read']),
  exactRule('/customer-groups/new', ['service.write']),
  parameterRule('/customer-groups/:id/edit', /^\/customer-groups\/[^/]+\/edit$/, ['service.write']),
  parameterRule('/customer-groups/:id', /^\/customer-groups\/[^/]+$/, ['service.read']),
  exactRule('/beds/new', ['inpatient.manage']),
  parameterRule('/beds/:id/edit', /^\/beds\/[^/]+\/edit$/, ['inpatient.manage']),
  parameterRule('/beds/:id', /^\/beds\/[^/]+$/, ['inpatient.read']),
  exactRule('/laboratory/reference-values', ['diagnostics.read']),
  exactRule('/laboratory/equipment/new', ['diagnostics.read']),
  parameterRule('/laboratory/equipment/:id/edit', /^\/laboratory\/equipment\/[^/]+\/edit$/, [
    'diagnostics.read'
  ]),
  parameterRule('/laboratory/equipment/:id', /^\/laboratory\/equipment\/[^/]+$/, [
    'diagnostics.read'
  ]),
  exactRule('/laboratory/report-types/new', ['diagnostics.read']),
  parameterRule('/laboratory/report-types/:id/edit', /^\/laboratory\/report-types\/[^/]+\/edit$/, [
    'diagnostics.read'
  ]),
  parameterRule('/laboratory/report-types/:id', /^\/laboratory\/report-types\/[^/]+$/, [
    'diagnostics.read'
  ]),
  exactRule('/laboratory/hemogram-reference-values/new', ['diagnostics.read']),
  parameterRule(
    '/laboratory/hemogram-reference-values/:id/edit',
    /^\/laboratory\/hemogram-reference-values\/[^/]+\/edit$/,
    ['diagnostics.read']
  ),
  parameterRule(
    '/laboratory/hemogram-reference-values/:id',
    /^\/laboratory\/hemogram-reference-values\/[^/]+$/,
    ['diagnostics.read']
  ),
  exactRule('/laboratory/biochemistry-reference-values/new', ['diagnostics.read']),
  parameterRule(
    '/laboratory/biochemistry-reference-values/:id/edit',
    /^\/laboratory\/biochemistry-reference-values\/[^/]+\/edit$/,
    ['diagnostics.read']
  ),
  parameterRule(
    '/laboratory/biochemistry-reference-values/:id',
    /^\/laboratory\/biochemistry-reference-values\/[^/]+$/,
    ['diagnostics.read']
  ),
  parameterRule('/billing/:id', /^\/billing\/[^/]+$/, ['billing.read']),
  exactRule('/triage/new', ['triage.manage']),
  parameterRule('/triage/:id', /^\/triage\/[^/]+$/, ['triage.read']),
  exactRule('/inpatient/admit', ['inpatient.manage']),
  parameterRule('/inpatient/:id', /^\/inpatient\/[^/]+$/, ['inpatient.read']),
  exactRule('/users/new', ['users.manage']),
  parameterRule('/users/:id/edit', /^\/users\/[^/]+\/edit$/, ['users.manage']),
  parameterRule('/users/:id', /^\/users\/[^/]+$/, ['users.read']),
  exactRule('/staff/new', ['staff.manage']),
  parameterRule('/staff/:id/edit', /^\/staff\/[^/]+\/edit$/, ['staff.manage']),
  parameterRule('/staff/:id', /^\/staff\/[^/]+$/, ['staff.read']),
  exactRule('/webhooks/new', ['webhooks.manage']),
  parameterRule('/webhooks/:id/edit', /^\/webhooks\/[^/]+\/edit$/, ['webhooks.manage']),
  parameterRule('/webhooks/:id', /^\/webhooks\/[^/]+$/, ['webhooks.read']),
  exactRule('/inventory/new', ['inventory.manage']),
  parameterRule('/inventory/:id/edit', /^\/inventory\/[^/]+\/edit$/, ['inventory.manage']),
  parameterRule('/inventory/:id', /^\/inventory\/[^/]+$/, ['inventory.read']),
  parameterRule('/inventory/purchases/:purchaseId', /^\/inventory\/purchases\/[^/]+$/, [
    'inventory.read'
  ]),
  exactRule('/products/new', ['product.write']),
  parameterRule('/products/:id/edit', /^\/products\/[^/]+\/edit$/, ['product.write']),
  parameterRule('/products/:id', /^\/products\/[^/]+$/, ['product.read']),
  exactRule('/services/new', ['service.write']),
  exactRule('/services/import', ['service.write']),
  parameterRule('/services/:id/edit', /^\/services\/[^/]+\/edit$/, ['service.write']),
  parameterRule('/services/:id', /^\/services\/[^/]+$/, ['service.read']),
  exactRule('/cadastros/racas', ['service.read']),
  exactRule('/cadastros/raças', ['service.read']),
  exactRule('/cadastro/racas', ['service.read']),
  exactRule('/cadastro/raças', ['service.read']),
  exactRule('/cadastros/especies', ['service.read']),
  exactRule('/cadastros/espécies', ['service.read']),
  exactRule('/cadastro/especies', ['service.read']),
  exactRule('/cadastro/espécies', ['service.read']),
  exactRule('/cadastros/species', ['service.read']),
  exactRule('/cadastro/species', ['service.read']),
  exactRule('/cadastros/cores', ['service.read']),
  exactRule('/cadastro/cores', ['service.read']),
  exactRule('/cadastros/coat-colors', ['service.read']),
  exactRule('/cadastro/coat-colors', ['service.read']),
  exactRule('/cadastros/pelagens', ['service.read']),
  exactRule('/cadastro/pelagens', ['service.read']),
  exactRule('/cadastros/grupos-de-clientes', ['service.read']),
  exactRule('/cadastro/grupos-de-clientes', ['service.read']),
  exactRule('/responsibility-terms/new', ['service.write']),
  parameterRule('/responsibility-terms/:id/edit', /^\/responsibility-terms\/[^/]+\/edit$/, [
    'service.write'
  ]),
  parameterRule('/responsibility-terms/:id', /^\/responsibility-terms\/[^/]+$/, ['service.read'])
];

function navigationRouteRules(): PersistedRoutePermissionRule[] {
  return Object.entries(navigationPermissionCodes).flatMap(([route, permissionCodes]) => [
    exactRule(route, permissionCodes),
    ...(navigationPermissionAliases[route] ?? []).map((alias) => exactRule(alias, permissionCodes))
  ]);
}

/** Complete policy used by persisted links, menu filtering and command palette. */
export const persistedRoutePermissionAllowlist: readonly PersistedRoutePermissionRule[] = [
  ...extraRoutePermissionAllowlist,
  ...navigationRouteRules()
];

function persistedRoutePath(path: string): string {
  const [pathname] = path.trim().split(/[?#]/, 1);
  if (!pathname) return '';
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

function ruleForPath(path: string): PersistedRoutePermissionRule | undefined {
  const normalizedPath = persistedRoutePath(path);
  return persistedRoutePermissionAllowlist.find(({ pattern }) => pattern.test(normalizedPath));
}

/** Allows the router to distinguish an unreviewed route from a denied route. */
export function hasNavigationPermissionRule(path: string): boolean {
  return ruleForPath(path) !== undefined;
}

export function canAccessNavigationPath(
  path: string,
  permissionCodes: SessionPermissionSnapshot
): boolean {
  if (permissionCodes === null) return false;

  const rule = ruleForPath(path);
  if (!rule) return false;

  return (
    rule.permissionCodes.length === 0 ||
    rule.permissionCodes.some((permissionCode) => permissionCodes.includes(permissionCode))
  );
}

export function canAccessNavigationItem(
  item: Pick<AppNavItem, 'path'>,
  permissionCodes: SessionPermissionSnapshot
): boolean {
  return canAccessNavigationPath(item.path, permissionCodes);
}

/** Backwards-compatible name for persisted-link callers. */
export function canAccessPersistedRoute(
  path: string,
  permissionCodes: SessionPermissionSnapshot
): boolean {
  return canAccessNavigationPath(path, permissionCodes);
}
