import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';
import { useAuthStore } from '@/stores/auth';

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
