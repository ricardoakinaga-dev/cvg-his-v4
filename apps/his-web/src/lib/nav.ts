/**
 * Navigation Tree for CVG HIS
 * 
 * Provides:
 * - Complete navigation structure with groups and items
 * - Permission-based filtering
 * - Icon names for each item
 */

import { PERMISSIONS } from './rbac';

/**
 * Navigation item definition
 */
export type NavItem = {
  title: string;
  href: string;
  iconName: string;
  requiredPermissions?: string[];
};

/**
 * Navigation group definition
 */
export type NavGroup = {
  id: string;
  title: string;
  iconName: string;
  items: NavItem[];
};

/**
 * Complete navigation tree for CVG HIS
 * Organized by sectors/modules
 */
export const NAV_TREE: NavGroup[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    iconName: 'LayoutDashboard',
    items: [
      {
        title: 'Painel Principal',
        href: '/dashboard',
        iconName: 'LayoutDashboard',
      },
    ],
  },
  {
    id: 'agenda',
    title: 'Agenda',
    iconName: 'Calendar',
    items: [
      {
        title: 'Calendário',
        href: '/agenda',
        iconName: 'Calendar',
        requiredPermissions: [PERMISSIONS.AGENDA_AGENDAMENTOS_READ],
      },
      {
        title: 'Agendamentos',
        href: '/agenda/agendamentos',
        iconName: 'CalendarClock',
        requiredPermissions: [PERMISSIONS.AGENDA_AGENDAMENTOS_READ],
      },
      {
        title: 'Colaboradores',
        href: '/agenda/colaboradores',
        iconName: 'UserCog',
        requiredPermissions: [PERMISSIONS.AGENDA_COLABORADORES_READ],
      },
      {
        title: 'Recursos',
        href: '/agenda/recursos',
        iconName: 'DoorOpen',
        requiredPermissions: [PERMISSIONS.AGENDA_RECURSOS_READ],
      },
      {
        title: 'Tipos',
        href: '/agenda/tipos',
        iconName: 'Tags',
        requiredPermissions: [PERMISSIONS.AGENDA_CONFIG_READ],
      },
    ],
  },
  {
    id: 'geral',
    title: 'Geral',
    iconName: 'Users',
    items: [
      {
        title: 'Clientes',
        href: '/geral/clientes',
        iconName: 'Users',
        requiredPermissions: [PERMISSIONS.OWNER_READ],
      },
      {
        title: 'Animais',
        href: '/geral/animais',
        iconName: 'Heart',
        requiredPermissions: [PERMISSIONS.PATIENT_READ],
      },
    ],
  },
  {
    id: 'clinica',
    title: 'Clínica',
    iconName: 'Stethoscope',
    items: [
      {
        title: 'Atendimentos',
        href: '/clinica/atendimentos',
        iconName: 'ClipboardList',
        requiredPermissions: [PERMISSIONS.ENCOUNTER_READ],
      },
      {
        title: 'Prontuário',
        href: '/clinica/prontuario',
        iconName: 'FileText',
        requiredPermissions: [PERMISSIONS.NOTE_READ],
      },
      {
        title: 'Prescrições',
        href: '/clinica/prescricoes',
        iconName: 'Pill',
        requiredPermissions: [PERMISSIONS.MEDORDER_READ],
      },
      {
        title: 'Solicitações',
        href: '/clinica/solicitacoes',
        iconName: 'FilePlus',
        requiredPermissions: [PERMISSIONS.ENCOUNTER_READ],
      },
    ],
  },
  {
    id: 'internacao',
    title: 'Internação',
    iconName: 'Bed',
    items: [
      {
        title: 'Painel',
        href: '/internacao/painel',
        iconName: 'Monitor',
        requiredPermissions: [PERMISSIONS.BEDMAP_READ],
      },
      {
        title: 'Leitos',
        href: '/internacao/leitos',
        iconName: 'Bed',
        requiredPermissions: [PERMISSIONS.BED_READ],
      },
      {
        title: 'Evolução',
        href: '/internacao/evolucao',
        iconName: 'TrendingUp',
        requiredPermissions: [PERMISSIONS.INPATIENT_READ],
      },
      {
        title: 'Medicações',
        href: '/internacao/medicacoes',
        iconName: 'Syringe',
        requiredPermissions: [PERMISSIONS.MEDADMIN_READ],
      },
    ],
  },
  {
    id: 'imagem',
    title: 'Imagem',
    iconName: 'Scan',
    items: [
      {
        title: 'Pedidos',
        href: '/imagem/pedidos',
        iconName: 'FileSearch',
        requiredPermissions: [PERMISSIONS.DOCUMENT_READ],
      },
      {
        title: 'Agenda',
        href: '/imagem/agenda',
        iconName: 'Calendar',
        requiredPermissions: [PERMISSIONS.DOCUMENT_READ],
      },
      {
        title: 'Laudos',
        href: '/imagem/laudos',
        iconName: 'FileCheck',
        requiredPermissions: [PERMISSIONS.DOCUMENT_READ],
      },
    ],
  },
  {
    id: 'laboratorio',
    title: 'Laboratório',
    iconName: 'FlaskConical',
    items: [
      {
        title: 'Pedidos',
        href: '/laboratorio/pedidos',
        iconName: 'FileSearch',
        requiredPermissions: [PERMISSIONS.DOCUMENT_READ],
      },
      {
        title: 'Coleta',
        href: '/laboratorio/coleta',
        iconName: 'TestTube',
        requiredPermissions: [PERMISSIONS.DOCUMENT_WRITE],
      },
      {
        title: 'Resultados',
        href: '/laboratorio/resultados',
        iconName: 'ClipboardCheck',
        requiredPermissions: [PERMISSIONS.DOCUMENT_READ],
      },
      {
        title: 'Laudos',
        href: '/laboratorio/laudos',
        iconName: 'FileCheck',
        requiredPermissions: [PERMISSIONS.DOCUMENT_READ],
      },
    ],
  },
  {
    id: 'estoque',
    title: 'Estoque',
    iconName: 'Package',
    items: [
      {
        title: 'Produtos',
        href: '/estoque/produtos',
        iconName: 'Package',
      },
      {
        title: 'Movimentações',
        href: '/estoque/movimentacoes',
        iconName: 'ArrowLeftRight',
      },
      {
        title: 'Lotes',
        href: '/estoque/lotes',
        iconName: 'Layers',
      },
    ],
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    iconName: 'DollarSign',
    items: [
      {
        title: 'Serviços',
        href: '/financeiro/servicos',
        iconName: 'Briefcase',
      },
      {
        title: 'Orçamentos',
        href: '/financeiro/orcamentos',
        iconName: 'FileSpreadsheet',
      },
      {
        title: 'Comandas',
        href: '/financeiro/comandas',
        iconName: 'Receipt',
      },
      {
        title: 'Pagamentos',
        href: '/financeiro/pagamentos',
        iconName: 'CreditCard',
      },
    ],
  },
  {
    id: 'admin',
    title: 'Administração',
    iconName: 'Shield',
    items: [
      {
        title: 'Usuários',
        href: '/admin/usuarios',
        iconName: 'UserCog',
        requiredPermissions: [PERMISSIONS.RBAC_MANAGE],
      },
      {
        title: 'Perfis',
        href: '/admin/perfis',
        iconName: 'Users',
        requiredPermissions: [PERMISSIONS.RBAC_MANAGE],
      },
      {
        title: 'Permissões',
        href: '/admin/permissoes',
        iconName: 'Key',
        requiredPermissions: [PERMISSIONS.RBAC_MANAGE],
      },
      {
        title: 'Auditoria',
        href: '/admin/auditoria',
        iconName: 'ScrollText',
        requiredPermissions: [PERMISSIONS.AUDIT_READ],
      },
    ],
  },
  {
    id: 'settings',
    title: 'Configurações',
    iconName: 'Settings',
    items: [
      {
        title: 'Geral',
        href: '/settings/geral',
        iconName: 'Settings',
      },
      {
        title: 'Clínica',
        href: '/settings/clinica',
        iconName: 'Stethoscope',
      },
      {
        title: 'Internação',
        href: '/settings/internacao',
        iconName: 'Bed',
      },
      {
        title: 'Imagem',
        href: '/settings/imagem',
        iconName: 'Scan',
      },
      {
        title: 'Laboratório',
        href: '/settings/laboratorio',
        iconName: 'FlaskConical',
      },
      {
        title: 'Estoque',
        href: '/settings/estoque',
        iconName: 'Package',
      },
      {
        title: 'Financeiro',
        href: '/settings/financeiro',
        iconName: 'DollarSign',
      },
    ],
  },
];

/**
 * Check if a user with given permissions can access a nav item
 */
export function canAccessItem(item: NavItem, permissions: string[]): boolean {
  if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
    return true;
  }
  return item.requiredPermissions.some((perm) => permissions.includes(perm));
}

/**
 * Filter navigation groups by permissions
 * Returns only groups that have at least one accessible item
 */
export function filterNavByPermissions(
  nav: NavGroup[],
  permissions: string[]
): NavGroup[] {
  return nav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessItem(item, permissions)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Get all navigation items as a flat array
 */
export function flattenNavItems(nav: NavGroup[]): NavItem[] {
  return nav.flatMap((group) => group.items);
}

/**
 * Find a navigation item by href
 */
export function findNavItemByHref(nav: NavGroup[], href: string): NavItem | undefined {
  return flattenNavItems(nav).find((item) => item.href === href);
}

/**
 * Get the parent group for a navigation item
 */
export function findNavGroupForItem(nav: NavGroup[], href: string): NavGroup | undefined {
  return nav.find((group) => group.items.some((item) => item.href === href));
}

/**
 * Build breadcrumb path for a given href
 */
export function buildBreadcrumb(nav: NavGroup[], href: string): Array<{ title: string; href: string }> {
  const group = findNavGroupForItem(nav, href);
  const item = findNavItemByHref(nav, href);
  
  if (!group || !item) {
    return [];
  }
  
  return [
    { title: group.title, href: '#' },
    { title: item.title, href: item.href },
  ];
}
