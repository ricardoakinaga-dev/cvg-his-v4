/**
 * Session and RBAC Helpers for his-web
 * 
 * Provides:
 * - Session type definition
 * - useSession hook for accessing current user session
 * - can() helper for permission checking
 */

import { useMemo, useSyncExternalStore } from 'react';
import { can as rbacCan, type RbacPrincipal, PERMISSIONS } from '@cvg-his/rbac';
import { 
  AUTH_SESSION_CHANGED_EVENT, 
  AUTH_STORAGE_KEY, 
  getAuthSession, 
  type AuthSession 
} from '../auth';

// Re-export PERMISSIONS for convenience
export { PERMISSIONS };

/**
 * Session type representing the current authenticated user
 */
export type Session = {
  userId: string | null;
  accountId: string | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
};

/**
 * Empty session for unauthenticated users
 */
const EMPTY_SESSION: Session = {
  userId: null,
  accountId: null,
  roles: [],
  permissions: [],
  isAuthenticated: false
};

/**
 * Convert AuthSession to Session type
 */
function toSession(authSession: AuthSession | null): Session {
  if (!authSession) {
    return EMPTY_SESSION;
  }
  
  return {
    userId: authSession.userId ?? null,
    accountId: authSession.accountId ?? null,
    roles: authSession.roles ?? (authSession.role ? [authSession.role] : []),
    permissions: authSession.permissions ?? [],
    isAuthenticated: !!authSession.accountId
  };
}

/**
 * Get the current session synchronously
 * Use this for non-React code or server-side rendering
 */
export function getSession(): Session {
  const authSession = getAuthSession();
  return toSession(authSession);
}

/**
 * Get the current principal for RBAC checks
 */
export function getPrincipal(): RbacPrincipal {
  const session = getSession();
  return {
    roles: session.roles,
    permissions: session.permissions
  };
}

/**
 * Check if the current session has a specific permission
 * Use this for non-React code
 */
export function can(permission: string): boolean {
  const principal = getPrincipal();
  return rbacCan(principal, permission);
}

/**
 * Check if the current session has a specific role
 */
export function hasRole(role: string): boolean {
  const session = getSession();
  return session.roles.includes(role);
}

/**
 * Subscribe to session changes (for useSyncExternalStore)
 */
function subscribeToSessionChanges(onStoreChange: () => void): () => void {
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

/**
 * Get session snapshot for client-side
 */
function getSessionSnapshot(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(AUTH_STORAGE_KEY) ?? '';
}

/**
 * Get session snapshot for server-side (always empty)
 */
function getServerSessionSnapshot(): string {
  return '';
}

/**
 * React hook to access the current session
 * 
 * @example
 * function MyComponent() {
 *   const { userId, accountId, roles, permissions, isAuthenticated } = useSession();
 *   
 *   if (!isAuthenticated) {
 *     return <LoginPrompt />;
 *   }
 *   
 *   return <div>Welcome, {userId}</div>;
 * }
 */
export function useSession(): Session {
  // Subscribe to session changes
  const snapshot = useSyncExternalStore(
    subscribeToSessionChanges,
    getSessionSnapshot,
    getServerSessionSnapshot
  );
  
  // Memoize the session object
  return useMemo(() => {
    return getSession();
  }, [snapshot]);
}

/**
 * React hook to check if the current user has a specific permission
 * 
 * @example
 * function DeleteButton() {
 *   const canDelete = usePermission('patient.delete');
 *   
 *   return (
 *     <button disabled={!canDelete}>
 *       Delete
 *     </button>
 *   );
 * }
 */
export function usePermission(permission: string): boolean {
  const session = useSession();
  return useMemo(() => {
    const principal: RbacPrincipal = {
      roles: session.roles,
      permissions: session.permissions
    };
    return rbacCan(principal, permission);
  }, [session, permission]);
}

/**
 * React hook to check if the current user has a specific role
 * 
 * @example
 * function AdminPanel() {
 *   const isAdmin = useRole('admin');
 *   
 *   if (!isAdmin) {
 *     return null;
 *   }
 *   
 *   return <AdminControls />;
 * }
 */
export function useRole(role: string): boolean {
  const session = useSession();
  return useMemo(() => {
    return session.roles.includes(role);
  }, [session, role]);
}

/**
 * React hook to get all permissions for the current user
 * Useful for debugging or conditional rendering based on multiple permissions
 */
export function usePermissions(): string[] {
  const session = useSession();
  return session.permissions;
}

/**
 * React hook to get all roles for the current user
 */
export function useRoles(): string[] {
  const session = useSession();
  return session.roles;
}
