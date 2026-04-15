import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { clearChunkRecoveryTarget, recoverChunkLoadError } from './chunk-recovery';

export const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  const requiresAuth = to.meta.requiresAuth !== false;

  if (to.path === '/login' && auth.isAuthenticated) {
    return { path: '/' };
  }

  if (auth.needsMfa && to.path !== '/auth/mfa') {
    return {
      path: '/auth/mfa',
      query: typeof to.query.next === 'string' ? { next: to.query.next } : undefined
    };
  }

  if (requiresAuth && !auth.isAuthenticated) {
    return {
      path: '/login',
      query: { next: to.fullPath }
    };
  }
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
