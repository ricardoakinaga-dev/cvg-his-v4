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
        title: 'Internação',
        items: [
            { label: 'Painel Geral', href: '/inpatient/stays', permission: PERMISSIONS.BEDMAP_READ },
            { label: 'Mapa de Leitos', href: '/inpatient/bedmap', permission: PERMISSIONS.BEDMAP_READ },
            { label: 'MAR Console', href: '/inpatient/mar', permission: PERMISSIONS.MEDADMIN_READ },
            { label: 'Passagem Plantão', href: '/inpatient/handovers', permission: PERMISSIONS.HANDOVER_READ },
        ]
    }
];
