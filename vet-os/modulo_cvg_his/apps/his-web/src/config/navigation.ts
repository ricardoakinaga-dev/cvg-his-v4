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
            { label: 'Tutores', href: '/owners', permission: PERMISSIONS.OWNER_READ },
            { label: 'Pacientes', href: '/patients', permission: PERMISSIONS.PATIENT_READ },
            { label: 'Serviços', href: '/services', permission: PERMISSIONS.SERVICE_READ },
            { label: 'Produtos', href: '/products', permission: PERMISSIONS.PRODUCT_READ },
            { label: 'Estoque', href: '/stock', permission: PERMISSIONS.PRODUCT_READ },
        ]
    },
    {
        title: 'Assistencial',
        items: [
            { label: 'Agenda', href: '/appointments', permission: PERMISSIONS.APPOINTMENT_READ },
            { label: 'Disponibilidade', href: '/availability', permission: PERMISSIONS.APPOINTMENT_WRITE },
            { label: 'Prontuário', href: '/encounters', permission: PERMISSIONS.ENCOUNTER_READ },
            { label: 'Exames', href: '/exams', permission: PERMISSIONS.ENCOUNTER_READ },
            { label: 'Protocolos', href: '/protocols' },
        ]
    },
    {
        title: 'Relatórios',
        items: [
            { label: 'Dashboard', href: '/reports', permission: PERMISSIONS.APPOINTMENT_READ },
        ]
    },
    {
        title: 'Configurações',
        items: [
            { label: 'Agenda Config', href: '/agenda-config', permission: PERMISSIONS.APPOINTMENT_WRITE },
        ]
    },
    {
        title: 'Financeiro',
        items: [
            { label: 'Contas a receber', href: '/financial', permission: PERMISSIONS.FINANCIAL_ACCOUNT_READ },
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
    }
];
