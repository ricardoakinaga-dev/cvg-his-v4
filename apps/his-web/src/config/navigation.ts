import { PERMISSIONS } from '../lib/rbac';

export type NavItem = {
    label: string;
    href: string;
    permission?: string;
};

export type NavSection = {
    title: string;
    items: NavItem[];
};

export const NAVIGATION_CONFIG: NavSection[] = [
    {
        title: 'Principal',
        items: [
            { label: 'Dashboard', href: '/', permission: PERMISSIONS.SYSTEM_HEALTH_READ },
            { label: 'Atendimento', href: '/reception', permission: PERMISSIONS.PATIENT_READ },
        ]
    },
    {
        title: 'Cadastros',
        items: [
            { label: 'Clientes', href: '/geral/clientes', permission: 'geral.clientes.read' },
            { label: 'Animais', href: '/geral/animais', permission: 'geral.animais.read' },
            { label: 'Tutores', href: '/owners', permission: PERMISSIONS.OWNER_READ },
            { label: 'Pacientes', href: '/patients', permission: PERMISSIONS.PATIENT_READ },
        ]
    },
    {
        title: 'Assistencial',
        items: [
            { label: 'Prontuário', href: '/encounters', permission: PERMISSIONS.ENCOUNTER_READ },
            { label: 'Protocolos', href: '/protocols' },
        ]
    },
    {
        title: 'Laboratório',
        items: [
            { label: 'Pedidos', href: '/laboratorio/pedidos', permission: 'laboratorio.pedidos.read' },
            { label: 'Coleta', href: '/laboratorio/coleta', permission: 'laboratorio.coleta.read' },
            { label: 'Resultados', href: '/laboratorio/resultados', permission: 'laboratorio.resultados.read' },
            { label: 'Laudos', href: '/laboratorio/laudos', permission: 'laboratorio.laudos.read' },
        ]
    },
    {
        title: 'Internação',
        items: [
            { label: 'Painel Geral', href: '/inpatient/stays', permission: PERMISSIONS.BEDMAP_READ },
            { label: 'Mapa de Leitos', href: '/inpatient/bedmap', permission: PERMISSIONS.BEDMAP_READ },
            { label: 'MAR Console', href: '/inpatient/mar', permission: PERMISSIONS.MEDADMIN_READ },
            { label: 'Passagem Plantão', href: '/inpatient/handovers', permission: PERMISSIONS.HANDOVER_READ },
        ]
    },
    {
        title: 'Financeiro',
        items: [
            { label: 'Faturas', href: '/financeiro/faturas', permission: 'financeiro.faturamento.read' },
            { label: 'Caixa do Dia', href: '/financeiro/caixa', permission: 'financeiro.caixa.read' },
            { label: 'Serviços', href: '/financeiro/servicos', permission: 'financeiro.servicos.read' },
        ]
    },
    {
        title: 'Administração',
        items: [
            { label: 'Usuários', href: '/admin/usuarios', permission: 'admin.usuarios.read' },
            { label: 'Perfis', href: '/admin/perfis', permission: 'admin.roles.read' },
            { label: 'Permissões', href: '/admin/permissoes', permission: 'admin.permissoes.read' },
            { label: 'Auditoria', href: '/admin/auditoria', permission: 'admin.auditoria.read' },
        ]
    }
];
