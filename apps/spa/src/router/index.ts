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

  if (requiresAuth && !auth.isAuthenticated) {
    return {
      path: '/login',
      query: { next: to.fullPath }
    };
  }

  if (requiresAuth && auth.needsMfa) {
    return { path: '/auth/mfa' };
  }

  if (to.path === '/login' && auth.isAuthenticated) {
    return { path: '/' };
  }
});
