import { createRouter, createWebHistory } from 'vue-router';
import { publicRoutes } from './public-routes';
import { scrollBehavior } from './scroll-behavior';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { canAccessNavigationPath, hasNavigationPermissionRule } from '@/navigation-permissions';
import { clearChunkRecoveryTarget, recoverChunkLoadError } from './chunk-recovery';
import type { SetupState } from '@/services/setup';
import type {
  LocationQueryRaw,
  RouteLocationNormalized,
  RouteLocationRaw,
  RouteRecordRaw
} from 'vue-router';

const deferredPrivateRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'DeferredPrivateRoute',
  component: () => import('@/pages/NotFoundPage.vue'),
  meta: { title: 'Página não encontrada', requiresAuth: false }
};

export const router = createRouter({
  history: createWebHistory(),
  routes: [...publicRoutes, deferredPrivateRoute],
  scrollBehavior
});

let privateRoutesRequest: Promise<void> | null = null;
let privateRoutesLoaded = false;

async function ensurePrivateRoutes(): Promise<void> {
  if (!privateRoutesRequest) {
    privateRoutesRequest = import('./routes')
      .then(({ privateRoutes }) => {
        for (const route of privateRoutes) {
          router.addRoute(route);
        }
        privateRoutesLoaded = true;
      })
      .catch((error) => {
        privateRoutesRequest = null;
        throw error;
      });
  }

  await privateRoutesRequest;
}

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

interface SessionAccessResponse {
  access?: {
    permissionCodes?: string[];
  };
}

let permissionToken: string | null = null;
let permissionCodes: readonly string[] | null = null;
let permissionRequestToken: string | null = null;
let permissionRequest: Promise<readonly string[]> | null = null;

function normalizedRouteKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Removes credential-shaped route material without reading or persisting it. */
export function getSanitizedRoute(route: SanitizableRoute): RouteLocationRaw | undefined {
  const safeQuery = Object.fromEntries(
    Object.entries(route.query).filter(
      ([key]) => !SENSITIVE_ROUTE_KEYS.has(normalizedRouteKey(key))
    )
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
    return nextPath ? { path: '/auth/mfa', query: { next: nextPath } } : { path: '/auth/mfa' };
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

function routePermissionCandidates(to: RouteLocationNormalized): string[] {
  return [
    to.path,
    ...to.matched.flatMap((record) => [record.path, record.aliasOf?.path ?? ''])
  ].filter((path, index, candidates) => path && path !== '/' && candidates.indexOf(path) === index);
}

function routePermissionPath(to: RouteLocationNormalized): string | undefined {
  return routePermissionCandidates(to).find(hasNavigationPermissionRule);
}

async function loadNavigationPermissionCodes(
  auth: ReturnType<typeof useAuthStore>
): Promise<readonly string[] | null> {
  const token = auth.accessToken;
  if (!token) return null;

  if (permissionToken === token && permissionCodes !== null) {
    return permissionCodes;
  }

  if (permissionRequestToken === token && permissionRequest) {
    return permissionRequest;
  }

  permissionToken = token;
  permissionCodes = null;
  permissionRequestToken = token;
  permissionRequest = import('@/services/api')
    .then(({ apiRequest }) => apiRequest<SessionAccessResponse>('/auth/session'))
    .then((session) => session.access?.permissionCodes ?? [])
    .catch(() => [])
    .then((codes) => {
      if (permissionToken === token) {
        permissionCodes = codes;
      }
      return codes;
    })
    .finally(() => {
      if (permissionRequestToken === token) {
        permissionRequestToken = null;
        permissionRequest = null;
      }
    });

  return permissionRequest;
}

/** Pure route policy used by the global guard and by focused tests. */
export function resolveNavigationPermissionRedirect(
  to: Pick<RouteLocationNormalized, 'path'>,
  codes: readonly string[] | null
): RouteLocationRaw | undefined {
  return canAccessNavigationPath(to.path, codes) ? undefined : { path: '/' };
}

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const isDeferredRoute = to.name === 'DeferredPrivateRoute';
  if (isDeferredRoute && !privateRoutesLoaded) {
    // A legacy alias may not have a lightweight permission entry of its own.
    // Hydrate the private route table once, then let Vue Router resolve the
    // canonical record/alias and run the normal auth and permission guards.
    await ensurePrivateRoutes();
    return to.fullPath;
  }
  const knownPrivatePath = isDeferredRoute && hasNavigationPermissionRule(to.path);
  const requiresAuth = to.meta.requiresAuth !== false || knownPrivatePath;
  const sanitizedRoute = getSanitizedRoute(to);

  if (sanitizedRoute) {
    return sanitizedRoute;
  }

  const shouldCheckSetup = !auth.isAuthenticated && !auth.needsMfa;
  const setupState = shouldCheckSetup
    ? await import('@/services/setup')
        .then(({ fetchSetupState }) => fetchSetupState())
        .catch(() => null)
    : null;

  const setupRedirect = resolveSetupRedirect({
    path: to.path,
    fullPath: to.fullPath,
    nextPath: typeof to.query.next === 'string' ? to.query.next : undefined,
    requiresAuth,
    isAuthenticated: auth.isAuthenticated,
    needsMfa: auth.needsMfa,
    setupState
  });

  if (setupRedirect) return setupRedirect;

  // Presentation filtering is complemented by a route-level deny so a typed
  // deep link cannot mount a private module that is absent from the session.
  // Synthetic/public routes without the shell's private meta stay untouched.
  const privateShellRoute =
    requiresAuth && to.matched.some((record) => record.meta.requiresAuth === true);

  if (privateShellRoute && to.path !== '/') {
    const permissionPath = routePermissionPath(to);
    const sessionPermissionCodes = await loadNavigationPermissionCodes(auth);
    if (!permissionPath) return { path: '/' };

    const permissionRedirect = resolveNavigationPermissionRedirect(
      { path: permissionPath },
      sessionPermissionCodes
    );
    if (permissionRedirect) return permissionRedirect;
  }

  return undefined;
});

router.afterEach((to, _from, failure) => {
  // Aborted navigation leaves the current task active, including its title
  // and recent-route entry (for example when a dirty form stays open).
  if (failure) return;
  clearChunkRecoveryTarget();

  const app = useAppStore();
  const title =
    typeof to.meta.title === 'string' && to.meta.title.trim().length > 0
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
