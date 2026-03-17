import { ApiError, MedicationDueDoseItem } from '../../lib/api';
import { AuthSession } from '../../lib/auth';

export const ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: ['*'],
    vet: ['medadmin.read', 'medlog.read'],
    enfermagem: ['medadmin.read', 'medadmin.write', 'medlog.read'],
    recepcao: []
};

export function resolvePermissions(session: AuthSession | null): Set<string> {
    const permissions = new Set<string>();
    if (!session) return permissions;

    const roleCandidates = [
        session.role,
        ...(Array.isArray(session.roles) ? session.roles : [])
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    for (const role of roleCandidates) {
        const fromRole = ROLE_PERMISSIONS[role] ?? [];
        fromRole.forEach(p => permissions.add(p));
    }

    const explicitPermissions = Array.isArray(session.permissions) ? session.permissions : [];
    explicitPermissions.forEach(p => permissions.add(p));

    return permissions;
}

export function can(permissions: Set<string>, permission: string): boolean {
    return permissions.has('*') || permissions.has(permission);
}

export function extractApiErrorMessage(error: unknown): string {
    if (error instanceof ApiError && error.payload && typeof error.payload === 'object') {
        const payload = error.payload as any;
        if (payload.message) return payload.message;
        if (payload.issues?.[0]?.message) return payload.issues[0].message;
        return `Falha na requisição (${error.status}).`;
    }
    if (error instanceof Error) return error.message;
    return 'Falha inesperada.';
}

export function formatDateTime(
    value: string | null | undefined,
    timezone?: string | null
): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return timezone
        ? parsed.toLocaleString('pt-BR', { timeZone: timezone })
        : parsed.toLocaleString('pt-BR');
}

export function itemLabel(item: MedicationDueDoseItem): string {
    return `${item.medication.name} • ${item.medication.doseValue} ${item.medication.doseUnit} • ${item.patient.name} • slot ${formatDateTime(item.scheduledFor, item.timezone)}`;
}

export function dueSort(left: MedicationDueDoseItem, right: MedicationDueDoseItem): number {
    return new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime();
}
