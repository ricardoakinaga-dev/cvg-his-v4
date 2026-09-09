import type { RouteRecordRaw } from 'vue-router';

/** Routes required before authentication; private route metadata is deferred. */
export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/auth/mfa',
    name: 'Mfa',
    component: () => import('@/pages/auth/MfaPage.vue'),
    meta: { requiresAuth: false, title: 'MFA', breadcrumb: 'MFA' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { requiresAuth: false, title: 'Login', breadcrumb: 'Login' }
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('@/pages/setup/SetupPage.vue'),
    meta: { requiresAuth: false, title: 'Configuração inicial', breadcrumb: 'Configuração inicial' }
  }
];
