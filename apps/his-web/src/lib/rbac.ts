import { useMemo, useSyncExternalStore } from 'react';
import { AUTH_SESSION_CHANGED_EVENT, AUTH_STORAGE_KEY, getAuthSession } from './auth';
import { can, RbacPrincipal, PERMISSIONS } from '@cvg-his/rbac';

export { PERMISSIONS };

const EMPTY_PRINCIPAL: RbacPrincipal = {
    permissions: [],
    roles: []
};

export function getCurrentPrincipal(): RbacPrincipal {
    const session = getAuthSession();
    if (!session) {
        return EMPTY_PRINCIPAL;
    }

    return {
        role: session.role,
        roles: session.roles,
        permissions: session.permissions
    };
}

function subscribeAuthSession(onStoreChange: () => void): () => void {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const handleStorage = (event: StorageEvent) => {
        if (event.key === AUTH_STORAGE_KEY) {
            onStoreChange();
        }
    };

    const handleSessionChanged = () => {
        onStoreChange();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);

    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);
    };
}

function getAuthSessionSnapshot(): string {
    if (typeof window === 'undefined') {
        return '';
    }
    return window.localStorage.getItem(AUTH_STORAGE_KEY) ?? '';
}

function getServerAuthSessionSnapshot(): string {
    return '';
}

function useCurrentPrincipal(): RbacPrincipal {
    const snapshot = useSyncExternalStore(
        subscribeAuthSession,
        getAuthSessionSnapshot,
        getServerAuthSessionSnapshot
    );

    return useMemo(() => {
        if (!snapshot) {
            return EMPTY_PRINCIPAL;
        }
        return getCurrentPrincipal();
    }, [snapshot]);
}

export function usePermission(permission: string): boolean {
    const principal = useCurrentPrincipal();
    return can(principal, permission);
}

export function useRole(role: string): boolean {
    const principal = useCurrentPrincipal();
    if (principal.role === role) return true;
    if (principal.roles && principal.roles.includes(role)) return true;
    return false;
}
