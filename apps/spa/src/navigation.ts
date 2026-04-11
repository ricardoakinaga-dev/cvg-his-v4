import type { NavGroup, NavItem } from '@/types';

export interface AppNavGroup extends NavGroup {
  id: string;
  description: string;
}

export const navGroups: AppNavGroup[] = [
  {
    id: 'inicio',
    label: 'Início',
    icon: '🏠',
    description: 'Entrada, visão geral e atalhos principais',
    items: [
      { label: 'Dashboard', path: '/', icon: '📊' }
    ]
  },
  {
    id: 'cadastro',
    label: 'Cadastro',
    icon: '👤',
    description: 'Tutores, pacientes e entidades mestre',
    items: [
      { label: 'Tutores', path: '/owners', icon: '👤' },
      { label: 'Pacientes', path: '/patients', icon: '🐾' }
    ]
  },
  {
    id: 'operacao',
    label: 'Operação',
    icon: '📅',
    description: 'Agenda, fila e atendimento',
    items: [
      { label: 'Agendamentos', path: '/appointments', icon: '📅' },
      { label: 'Agenda Operacional', path: '/scheduling', icon: '🗓️' },
      { label: 'Fila', path: '/queue', icon: '🏥' },
      { label: 'Atendimentos', path: '/encounters', icon: '🩺' },
      { label: 'Prontuário', path: '/medical-records', icon: '📋' }
    ]
  },
  {
    id: 'assistencial',
    label: 'Assistencial',
    icon: '🧪',
    description: 'Jornadas clínicas avançadas',
    items: [
      { label: 'Triagem', path: '/triage', icon: '🏷️' },
      { label: 'Diagnósticos', path: '/diagnostics', icon: '🔬' },
      { label: 'Prescrições', path: '/prescriptions', icon: '💊' },
      { label: 'Execuções', path: '/prescription-executions', icon: '💉' },
      { label: 'Internação', path: '/inpatient', icon: '🛏️' },
      { label: 'Mapa de Leitos', path: '/inpatient/board', icon: '🗺️' },
      { label: 'Setores', path: '/sectors', icon: '🏢' },
      { label: 'Leitos', path: '/beds', icon: '🛏️' },
      { label: 'Cirurgias', path: '/surgery', icon: '🔪' },
      { label: 'Altas', path: '/discharges', icon: '🏠' }
    ]
  },
  {
    id: 'comercial',
    label: 'Comercial',
    icon: '💰',
    description: 'Financeiro, balcão e conversão',
    items: [
      { label: 'Faturamento', path: '/billing', icon: '💰' },
      { label: 'Caixa', path: '/cash', icon: '🧾' },
      { label: 'PIX', path: '/pix', icon: '💸' },
      { label: 'Vendas', path: '/counter-sales', icon: '🛒' },
      { label: 'Orçamentos', path: '/quotes', icon: '📝' },
      { label: 'Relatórios Comerciais', path: '/commercial-reports', icon: '📊' }
    ]
  },
  {
    id: 'estoque',
    label: 'Estoque',
    icon: '📦',
    description: 'Produtos, serviços e inventário',
    items: [
      { label: 'Estoque', path: '/inventory', icon: '📦' },
      { label: 'Produtos', path: '/products', icon: '🏷️' },
      { label: 'Serviços', path: '/services', icon: '🛠️' }
    ]
  },
  {
    id: 'plataforma',
    label: 'Plataforma',
    icon: '🔗',
    description: 'Equipe, acesso e integração',
    items: [
      { label: 'Usuários', path: '/users', icon: '👥' },
      { label: 'Equipe', path: '/staff', icon: '👨‍⚕️' },
      { label: 'Notificações', path: '/notifications', icon: '🔔' },
      { label: 'WhatsApp', path: '/notifications/whatsapp', icon: '💬' },
      { label: 'Chaves API', path: '/api-keys', icon: '🔐' },
      { label: 'Webhooks', path: '/webhooks', icon: '🔗' },
      { label: 'Cliente API', path: '/api-client', icon: '🛠️' }
    ]
  },
  {
    id: 'governanca',
    label: 'Governança',
    icon: '🧭',
    description: 'Acesso, auditoria e busca transversal',
    items: [
      { label: 'Governança de Acesso', path: '/access-control', icon: '🔐' },
      { label: 'Auditoria', path: '/audit', icon: '🧾' },
      { label: 'Busca mestre', path: '/master-search', icon: '🔎' }
    ]
  }
];

export function flattenNavGroups(groups: AppNavGroup[] = navGroups): NavItem[] {
  return groups.flatMap((group) => group.items);
}

export function findNavItem(path: string, groups: AppNavGroup[] = navGroups): NavItem | undefined {
  const items = flattenNavGroups(groups);
  return items.find((item) => item.path === path);
}

export function findMatchingNavItem(
  path: string,
  groups: AppNavGroup[] = navGroups
): NavItem | undefined {
  const items = flattenNavGroups(groups);
  const sorted = [...items].sort((a, b) => b.path.length - a.path.length);
  return sorted.find((item) => path === item.path || path.startsWith(`${item.path}/`));
}
