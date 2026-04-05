<template>
  <div class="app-layout">
    <aside class="sidebar" :class="{ 'sidebar--collapsed': appStore.sidebarCollapsed }">
      <div class="sidebar__header">
        <span class="sidebar__logo">CVG HIS</span>
        <button
          class="sidebar__toggle"
          @click="appStore.toggleSidebar()"
          aria-label="Toggle sidebar"
        >
          {{ appStore.sidebarCollapsed ? '›' : '‹' }}
        </button>
      </div>
      <nav class="sidebar__nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="sidebar__link"
        >
          <span class="sidebar__link-icon">{{ item.icon }}</span>
          <span v-if="!appStore.sidebarCollapsed" class="sidebar__link-label">{{
            item.label
          }}</span>
        </router-link>
      </nav>
    </aside>
    <main class="main-content">
      <header class="topbar">
        <div class="topbar__breadcrumbs">
          <router-link to="/" class="topbar__breadcrumb-link">Home</router-link>
          <template v-for="(crumb, index) in breadcrumbs" :key="index">
            <span class="topbar__breadcrumb-sep">/</span>
            <router-link v-if="crumb.path" :to="crumb.path" class="topbar__breadcrumb-link">
              {{ crumb.label }}
            </router-link>
            <span v-else class="topbar__breadcrumb-item topbar__breadcrumb-item--active">
              {{ crumb.label }}
            </span>
          </template>
        </div>
        <div class="topbar__actions">
          <button
            class="topbar__theme-btn"
            @click="themeStore.toggle()"
            :aria-label="'Toggle theme'"
          >
            {{ themeStore.theme === 'dark' ? '☀️' : '🌙' }}
          </button>
          <span class="topbar__user">{{ authStore.userName }}</span>
          <button class="topbar__logout-btn" @click="handleLogout()">Sair</button>
        </div>
      </header>
      <div class="content-area">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useAppStore } from '@/stores/app';
import type { NavItem } from '@/types';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const appStore = useAppStore();

const breadcrumbs = computed(() => {
  const crumbs: { label: string; path?: string }[] = [];
  const current = route.meta;
  if (current.breadcrumb) {
    if (current.breadcrumbParent) {
      const parentRoute = router.getRoutes().find((r) => r.name === current.breadcrumbParent);
      if (parentRoute) {
        crumbs.push({ label: current.breadcrumbParent as string, path: parentRoute.path });
      }
    }
    crumbs.push({ label: current.breadcrumb as string });
  }
  return crumbs;
});

const navItems = computed<NavItem[]>(() => [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Tutores', path: '/owners', icon: '👤' },
  { label: 'Pacientes', path: '/patients', icon: '🐾' },
  { label: 'Atendimentos', path: '/encounters', icon: '🏥' },
  { label: 'Agenda', path: '/appointments', icon: '📅' },
  { label: 'Fila', path: '/queue', icon: '🏥' },
  { label: 'Triagem', path: '/triage', icon: '🏷️' },
  { label: 'Prontuário', path: '/medical-records', icon: '📋' },
  { label: 'Internação', path: '/inpatient', icon: '🛏️' },
  { label: 'Faturamento', path: '/billing', icon: '💰' },
  { label: 'Estoque', path: '/inventory', icon: '📦' },
  { label: 'Usuários', path: '/users', icon: '👥' }
]);

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  background: var(--color-surface, #ffffff);
  border-right: 1px solid var(--color-border, #e2e8f0);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  flex-shrink: 0;
}

.sidebar--collapsed {
  width: 64px;
}

.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.sidebar__logo {
  font-weight: 700;
  font-size: 18px;
  color: var(--color-primary-600, #2563eb);
}

.sidebar--collapsed .sidebar__logo {
  display: none;
}

.sidebar__toggle {
  background: none;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary, #475569);
}

.sidebar__nav {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--color-text-secondary, #475569);
  transition: all 0.15s ease;
  min-height: 44px;
}

.sidebar__link:hover {
  background: var(--color-surface-hover, #f8fafc);
  color: var(--color-text, #0f172a);
}

.sidebar__link.router-link-active {
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-primary-600, #2563eb);
  font-weight: 500;
}

.sidebar__link-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.sidebar__link-label {
  font-size: 14px;
  white-space: nowrap;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: var(--color-surface, #ffffff);
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.topbar__breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text-muted, #94a3b8);
}

.topbar__breadcrumb-item--active {
  color: var(--color-text, #0f172a);
  font-weight: 500;
}

.topbar__breadcrumb-link {
  color: var(--color-text-muted, #94a3b8);
  text-decoration: none;
  transition: color 0.15s ease;
}

.topbar__breadcrumb-link:hover {
  color: var(--color-primary-600, #2563eb);
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar__theme-btn {
  background: none;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
}

.topbar__user {
  font-size: 14px;
  color: var(--color-text-secondary, #475569);
}

.topbar__logout-btn {
  background: none;
  border: 1px solid var(--color-danger-200, #fecaca);
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 14px;
  color: var(--color-danger-600, #dc2626);
  cursor: pointer;
  min-height: 36px;
}

.content-area {
  flex: 1;
  padding: 24px;
  background: var(--color-bg, #f0f4f8);
}
</style>
