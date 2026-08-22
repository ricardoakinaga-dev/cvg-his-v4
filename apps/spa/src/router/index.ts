import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { clearChunkRecoveryTarget, recoverChunkLoadError } from './chunk-recovery';
import { fetchSetupState, type SetupState } from '@/services/setup';
import type { LocationQueryRaw, RouteLocationRaw } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes
});

interface SetupRedirectInput {
  readonly path: string;
  readonly fullPath: string;
  readonly nextPath?: string;
  readonly requiresAuth: boolean;
  readonly isAuthenticated: boolean;
  readonly needsMfa: boolean;
  readonly setupState: SetupState | null;
}

interface SanitizableRoute {
  readonly path: string;
  readonly query: Readonly<Record<string, unknown>>;
  readonly hash: string;
}

const SENSITIVE_ROUTE_KEYS = new Set([
  'accesstoken',
  'bootstraptoken',
  'refreshtoken',
  'setuptoken',
  'setupbootstraptoken'
]);

function normalizedRouteKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Removes credential-shaped route material without reading or persisting it. */
export function getSanitizedRoute(route: SanitizableRoute): RouteLocationRaw | undefined {
  const safeQuery = Object.fromEntries(
    Object.entries(route.query).filter(([key]) => !SENSITIVE_ROUTE_KEYS.has(normalizedRouteKey(key)))
  ) as LocationQueryRaw;
  const queryChanged = Object.keys(safeQuery).length !== Object.keys(route.query).length;
  const hashChanged = /(?:access|bootstrap|refresh|setup)[_-]?token/i.test(route.hash);

  if (!queryChanged && !hashChanged) {
    return undefined;
  }

  return {
    path: route.path,
    query: safeQuery,
    hash: hashChanged ? '' : route.hash
  };
}

/** Pure routing policy kept separate so redirect loops are unit-testable. */
export function resolveSetupRedirect(input: SetupRedirectInput): RouteLocationRaw | undefined {
  if (input.isAuthenticated && (input.path === '/login' || input.path === '/setup')) {
    return { path: '/' };
  }

  if (input.needsMfa && input.path !== '/auth/mfa') {
    const nextPath = input.nextPath ?? (input.requiresAuth ? input.fullPath : undefined);
    return nextPath
      ? { path: '/auth/mfa', query: { next: nextPath } }
      : { path: '/auth/mfa' };
  }

  if (input.setupState?.setupRequired && input.path !== '/setup') {
    return { path: '/setup' };
  }

  if (input.path === '/setup' && input.setupState?.setupRequired === false) {
    return { path: '/login' };
  }

  if (input.requiresAuth && !input.isAuthenticated) {
    return {
      path: '/login',
      query: { next: input.fullPath }
    };
  }

  return undefined;
}

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const requiresAuth = to.meta.requiresAuth !== false;
  const sanitizedRoute = getSanitizedRoute(to);

  if (sanitizedRoute) {
    return sanitizedRoute;
  }

  const shouldCheckSetup = !auth.isAuthenticated && !auth.needsMfa;
  const setupState = shouldCheckSetup ? await fetchSetupState().catch(() => null) : null;

  return resolveSetupRedirect({
    path: to.path,
    fullPath: to.fullPath,
    nextPath: typeof to.query.next === 'string' ? to.query.next : undefined,
    requiresAuth,
    isAuthenticated: auth.isAuthenticated,
    needsMfa: auth.needsMfa,
    setupState
  });
});

router.afterEach((to) => {
  clearChunkRecoveryTarget();

  const app = useAppStore();
  const title = typeof to.meta.title === 'string' && to.meta.title.trim().length > 0
    ? to.meta.title
    : 'CVG HIS SPA';

  app.setPageTitle(title);

  if (typeof to.meta.breadcrumb === 'string') {
    app.addRecentRoute({
      path: to.path,
      label: to.meta.breadcrumb,
      icon: typeof to.meta.icon === 'string' ? to.meta.icon : undefined
    });
  }

  if (typeof document !== 'undefined') {
    document.title = `${title} · CVG HIS SPA`;
  }
});

router.onError((error, to) => {
  if (recoverChunkLoadError(error, to)) {
    return;
  }

  console.error('router navigation failed', error);
});
