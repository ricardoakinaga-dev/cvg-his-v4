<template>
  <div class="app-layout" :class="{ 'app-layout--collapsed': appStore.sidebarCollapsed }">
    <aside class="sidebar">
      <div class="sidebar__brand">
        <div class="sidebar__brand-mark">🏥</div>
        <div v-if="!appStore.sidebarCollapsed" class="sidebar__brand-copy">
          <strong>CVG HIS</strong>
          <span>SPA oficial</span>
        </div>
        <button
          class="sidebar__toggle"
          @click="appStore.toggleSidebar()"
          :aria-label="appStore.sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'"
          :title="appStore.sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'"
        >
          {{ appStore.sidebarCollapsed ? '›' : '‹' }}
        </button>
      </div>

      <div class="sidebar__context">
        <div v-if="!appStore.sidebarCollapsed" class="sidebar__context-head">
          <span class="sidebar__eyebrow">Contexto</span>
          <span class="sidebar__microcopy">Operação premium em tempo real</span>
        </div>
        <div class="sidebar__context-chips">
          <span class="sidebar__chip">👤 {{ authStore.userName }}</span>
          <span class="sidebar__chip">🎯 {{ primaryRoleLabel }}</span>
          <span v-if="accountLabel" class="sidebar__chip">🏢 {{ accountLabel }}</span>
          <span v-if="activeGroupLabel" class="sidebar__chip">📚 {{ activeGroupLabel }}</span>
        </div>
      </div>

      <div class="sidebar__search">
        <input
          v-model="searchQuery"
          type="search"
          class="sidebar__search-input"
          placeholder="Buscar módulo, rota ou rotina..."
          aria-label="Buscar módulo"
        />
      </div>

      <section v-if="favoriteLinks.length" class="sidebar__panel">
        <div class="sidebar__panel-head">
          <span class="sidebar__eyebrow">Favoritos</span>
          <button class="sidebar__ghost-btn" type="button" @click="appStore.clearRecentRoutes()">
            Limpar recentes
          </button>
        </div>
        <div class="sidebar__quick-links">
          <router-link
            v-for="item in favoriteLinks"
            :key="item.path"
            :to="item.path"
            class="sidebar__quick-link"
            :class="{ 'sidebar__quick-link--active': isActivePath(item.path) }"
          >
            <span class="sidebar__quick-link-icon">{{ item.icon ?? '★' }}</span>
            <span v-if="!appStore.sidebarCollapsed" class="sidebar__quick-link-label">{{
              item.label
            }}</span>
          </router-link>
        </div>
      </section>

      <nav class="sidebar__nav" aria-label="Navegação principal">
        <details
          v-for="group in filteredGroups"
          :key="group.id"
          class="sidebar__group"
          :open="shouldOpenGroup(group.id)"
        >
          <summary class="sidebar__group-summary">
            <span class="sidebar__group-summary-text">
              <span class="sidebar__group-icon">{{ group.icon }}</span>
              <span v-if="!appStore.sidebarCollapsed" class="sidebar__group-label">{{
                group.label
              }}</span>
            </span>
            <span v-if="!appStore.sidebarCollapsed" class="sidebar__group-chevron">▾</span>
          </summary>
          <div class="sidebar__group-body">
            <router-link
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              class="sidebar__link"
              :class="{ 'sidebar__link--active': isActivePath(item.path) }"
              :title="item.label"
            >
              <span class="sidebar__link-icon">{{ item.icon ?? '•' }}</span>
              <span v-if="!appStore.sidebarCollapsed" class="sidebar__link-label">{{
                item.label
              }}</span>
            </router-link>
          </div>
        </details>
      </nav>

      <section v-if="recentLinks.length" class="sidebar__panel sidebar__panel--recent">
        <div class="sidebar__panel-head">
          <span class="sidebar__eyebrow">Recentes</span>
          <span class="sidebar__microcopy">{{ recentLinks.length }} rotas</span>
        </div>
        <div class="sidebar__recent-list">
          <router-link
            v-for="item in recentLinks"
            :key="item.path"
            :to="item.path"
            class="sidebar__recent-link"
            :class="{ 'sidebar__recent-link--active': isActivePath(item.path) }"
          >
            <span class="sidebar__recent-link-icon">{{ item.icon ?? '↗' }}</span>
            <span v-if="!appStore.sidebarCollapsed" class="sidebar__recent-link-label">{{
              item.label
            }}</span>
          </router-link>
        </div>
      </section>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div class="topbar__title-block">
          <div class="topbar__eyebrow">Frontend oficial · SPA</div>
          <div class="topbar__title-line">
            <span class="topbar__icon">{{ pageIcon }}</span>
            <div>
              <h1 class="topbar__title">{{ pageTitle }}</h1>
              <p class="topbar__subtitle">{{ pageSubtitle }}</p>
            </div>
          </div>
        </div>

        <div class="topbar__actions">
          <div class="topbar__breadcrumbs">
            <router-link to="/" class="topbar__breadcrumb-link">Início</router-link>
            <template v-for="crumb in breadcrumbs" :key="crumb.label + (crumb.path ?? '')">
              <span class="topbar__breadcrumb-sep">/</span>
              <router-link v-if="crumb.path" :to="crumb.path" class="topbar__breadcrumb-link">
                {{ crumb.label }}
              </router-link>
              <span v-else class="topbar__breadcrumb-item topbar__breadcrumb-item--active">
                {{ crumb.label }}
              </span>
            </template>
          </div>

          <div class="topbar__action-row">
            <button
              class="topbar__action-btn"
              :class="{ 'topbar__action-btn--active': isCurrentFavorite }"
              type="button"
              @click="toggleCurrentFavorite"
              :title="isCurrentFavorite ? 'Remover favorito' : 'Salvar favorito'"
            >
              {{ isCurrentFavorite ? '★' : '☆' }}
            </button>
            <button class="topbar__action-btn" type="button" @click="themeStore.toggle()">
              {{ themeStore.theme === 'dark' ? '☀️' : '🌙' }}
            </button>
            <button class="topbar__action-btn topbar__action-btn--search" type="button" @click="openPalette">
              ⌘K
            </button>
            <div class="topbar__user-box">
              <strong>{{ authStore.userName }}</strong>
              <span>{{ primaryRoleLabel }}</span>
            </div>
            <button class="topbar__logout-btn" @click="handleLogout()">Sair</button>
          </div>
        </div>
      </header>

      <section class="workspace__body">
        <router-view />
      </section>
    </main>

    <DsModal :open="commandPaletteOpen" title="Buscar rotina" size="lg" @close="closePalette">
      <div class="command-palette">
        <div class="command-palette__search">
          <input
            ref="commandInputEl"
            v-model.trim="commandQuery"
            class="command-palette__input"
            type="search"
            placeholder="Digite um módulo, rota ou rotina..."
            autocomplete="off"
            @keydown.enter.prevent="goToFirstCommand"
            @keydown.esc.prevent="closePalette"
          />
          <p class="command-palette__hint">
            Atalho: <kbd>Ctrl</kbd> + <kbd>K</kbd> para abrir a busca global.
          </p>
        </div>

        <div class="command-palette__results">
          <button
            v-for="item in filteredCommandItems"
            :key="item.path"
            type="button"
            class="command-palette__item"
            @click="navigateTo(item.path)"
          >
            <span class="command-palette__item-icon">{{ item.icon ?? '•' }}</span>
            <span class="command-palette__item-text">
              <strong>{{ item.label }}</strong>
              <small>{{ item.groupLabel }} · {{ item.path }}</small>
            </span>
            <kbd class="command-palette__item-shortcut">{{ item.shortcut }}</kbd>
          </button>

          <div v-if="filteredCommandItems.length === 0" class="command-palette__empty">
            Nenhuma rotina encontrada.
          </div>
        </div>
      </div>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useAppStore } from '@/stores/app';
import { findMatchingNavItem, findNavItem, navGroups } from '@/navigation';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const appStore = useAppStore();

const searchQuery = ref('');
const commandPaletteOpen = ref(false);
const commandQuery = ref('');
const commandInputEl = ref<HTMLInputElement | null>(null);

const matchingNavItem = computed(() => findMatchingNavItem(route.path));
const matchingNavGroup = computed(
  () => navGroups.find((group) => group.items.some((item) => isActivePath(item.path))) ?? navGroups[0]
);

const pageTitle = computed(() => {
  const metaTitle = typeof route.meta.title === 'string' ? route.meta.title : '';
  return metaTitle || matchingNavItem.value?.label || appStore.pageTitle || 'CVG HIS SPA';
});

const pageSubtitle = computed(() => {
  const breadcrumb = typeof route.meta.breadcrumb === 'string' ? route.meta.breadcrumb : '';
  return breadcrumb || matchingNavGroup.value?.description || 'Operação hospitalar em tempo real';
});

const pageIcon = computed(() => {
  return (typeof route.meta.icon === 'string' && route.meta.icon) || matchingNavItem.value?.icon || '🏥';
});

const primaryRoleLabel = computed(() => {
  if (authStore.user.roles.length === 0) return 'Operador';
  return authStore.user.roles[0]
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
});

const accountLabel = computed(() => authStore.user.accountId ?? '');

const activeGroupLabel = computed(() => matchingNavGroup.value?.label ?? '');

const filteredGroups = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return navGroups;
  }

  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        return (
          item.label.toLowerCase().includes(query) ||
          item.path.toLowerCase().includes(query) ||
          group.label.toLowerCase().includes(query)
        );
      })
    }))
    .filter((group) => group.items.length > 0);
});

const favoriteLinks = computed(() =>
  appStore.favoriteRoutes
    .map((path) => findNavItem(path))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
);

const recentLinks = computed(() =>
  appStore.recentRoutes
    .map((routeItem) => {
      const navItem = findNavItem(routeItem.path);
      return navItem
        ? { ...navItem, label: routeItem.label, icon: routeItem.icon ?? navItem.icon }
        : routeItem;
    })
    .filter((item) => Boolean(item?.path))
);

const commandItems = computed(() =>
  navGroups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupLabel: group.label,
      shortcut: item.path === '/' ? 'Home' : item.path.split('/').filter(Boolean).slice(-1)[0] ?? item.label
    }))
  )
);

const filteredCommandItems = computed(() => {
  const query = commandQuery.value.trim().toLowerCase();

  if (!query) {
    return commandItems.value.slice(0, 12);
  }

  return commandItems.value
    .filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.path.toLowerCase().includes(query) ||
        item.groupLabel.toLowerCase().includes(query)
      );
    })
    .slice(0, 12);
});

const breadcrumbs = computed(() => {
  const crumbs: { label: string; path?: string }[] = [];
  const current = route.meta;
  if (current.breadcrumb) {
    if (current.breadcrumbParent) {
      const parentRoute = router
        .getRoutes()
        .find((record) => record.name === current.breadcrumbParent);
      if (parentRoute) {
        crumbs.push({ label: current.breadcrumbParent as string, path: parentRoute.path });
      }
    }
    crumbs.push({ label: current.breadcrumb as string });
  }
  return crumbs;
});

const isCurrentFavorite = computed(() => appStore.favoriteRoutes.includes(route.path));

function isActivePath(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`);
}

function shouldOpenGroup(groupId: string): boolean {
  if (searchQuery.value.trim()) return true;
  return matchingNavGroup.value?.id === groupId || groupId === 'inicio';
}

function toggleCurrentFavorite() {
  if (route.path === '/login') return;
  appStore.toggleFavoriteRoute(route.path);
}

function openPalette() {
  commandPaletteOpen.value = true;
  commandQuery.value = '';
}

function closePalette() {
  commandPaletteOpen.value = false;
  commandQuery.value = '';
}

function navigateTo(path: string) {
  closePalette();
  void router.push(path);
}

function goToFirstCommand() {
  const first = filteredCommandItems.value[0];
  if (first) {
    navigateTo(first.path);
  }
}

function onKeydown(event: KeyboardEvent) {
  const isCommand = event.metaKey || event.ctrlKey;
  if (isCommand && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openPalette();
    return;
  }

  if (event.key === 'Escape' && commandPaletteOpen.value) {
    event.preventDefault();
    closePalette();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});

watch(commandPaletteOpen, async (open) => {
  if (!open) return;
  await nextTick();
  commandInputEl.value?.focus();
});

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 28%),
    radial-gradient(circle at top right, rgba(13, 148, 136, 0.08), transparent 24%),
    var(--color-bg, #f0f4f8);
}

.app-layout--collapsed {
  grid-template-columns: 96px minmax(0, 1fr);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 14px;
  border-right: 1px solid var(--color-border, #e2e8f0);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px);
  min-width: 0;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.12), rgba(13, 148, 136, 0.08));
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.sidebar__brand-mark {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: var(--color-surface, #ffffff);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.06));
  font-size: 20px;
}

.sidebar__brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sidebar__brand-copy strong {
  font-size: 14px;
  color: var(--color-text, #0f172a);
}

.sidebar__brand-copy span {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

.sidebar__toggle {
  margin-left: auto;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--color-border-strong, #cbd5e1);
  background: var(--color-surface, #ffffff);
  color: var(--color-text-secondary, #475569);
  flex-shrink: 0;
}

.sidebar__context,
.sidebar__panel {
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: var(--shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.04));
}

.sidebar__context-head,
.sidebar__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.sidebar__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary-600, #2563eb);
}

.sidebar__microcopy {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

.sidebar__context-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sidebar__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--color-text, #0f172a);
  border: 1px solid rgba(37, 99, 235, 0.12);
  font-size: 12px;
  white-space: nowrap;
}

.sidebar__search {
  padding: 0 2px;
}

.sidebar__search-input {
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-text, #0f172a);
  outline: none;
}

.sidebar__search-input:focus {
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.sidebar__quick-links,
.sidebar__recent-list {
  display: grid;
  gap: 6px;
}

.sidebar__quick-link,
.sidebar__recent-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid transparent;
  color: var(--color-text-secondary, #475569);
  text-decoration: none;
  transition:
    transform 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}

.sidebar__quick-link:hover,
.sidebar__recent-link:hover,
.sidebar__link:hover {
  transform: translateX(2px);
  background: rgba(37, 99, 235, 0.06);
  border-color: rgba(37, 99, 235, 0.1);
  text-decoration: none;
}

.sidebar__quick-link--active,
.sidebar__recent-link--active,
.sidebar__link--active {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(13, 148, 136, 0.08));
  border-color: rgba(37, 99, 235, 0.18);
  color: var(--color-primary-700, #1d4ed8);
  font-weight: 600;
}

.sidebar__quick-link-icon,
.sidebar__recent-link-icon,
.sidebar__link-icon {
  width: 24px;
  flex-shrink: 0;
  text-align: center;
}

.sidebar__nav {
  display: grid;
  gap: 10px;
  min-height: 0;
}

.sidebar__group {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.64);
  overflow: hidden;
}

.sidebar__group[open] {
  box-shadow: var(--shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.04));
}

.sidebar__group-summary {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 10px;
  cursor: pointer;
  user-select: none;
}

.sidebar__group-summary::-webkit-details-marker {
  display: none;
}

.sidebar__group-summary-text {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sidebar__group-icon {
  width: 24px;
  text-align: center;
}

.sidebar__group-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}

.sidebar__group-chevron {
  color: var(--color-text-muted, #94a3b8);
}

.sidebar__group-body {
  display: grid;
  gap: 4px;
  padding: 0 8px 10px;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 10px 10px;
  border-radius: 12px;
  color: var(--color-text-secondary, #475569);
  text-decoration: none;
}

.sidebar__link-label {
  font-size: 13px;
  white-space: nowrap;
}

.sidebar__ghost-btn {
  background: none;
  border: 0;
  color: var(--color-primary-600, #2563eb);
  font-size: 12px;
  font-weight: 600;
  padding: 0;
}

.workspace {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(16px);
}

.topbar__title-block {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.topbar__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary-600, #2563eb);
}

.topbar__title-line {
  display: flex;
  align-items: center;
  gap: 14px;
}

.topbar__icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(13, 148, 136, 0.08));
  border: 1px solid rgba(37, 99, 235, 0.14);
  font-size: 22px;
}

.topbar__title {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  color: var(--color-text, #0f172a);
}

.topbar__subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--color-text-muted, #94a3b8);
}

.topbar__actions {
  display: grid;
  gap: 10px;
  justify-items: end;
}

.topbar__breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-muted, #94a3b8);
  justify-content: flex-end;
}

.topbar__breadcrumb-link {
  color: var(--color-text-muted, #94a3b8);
  text-decoration: none;
}

.topbar__breadcrumb-link:hover {
  color: var(--color-primary-600, #2563eb);
  text-decoration: none;
}

.topbar__breadcrumb-item--active {
  color: var(--color-text, #0f172a);
  font-weight: 600;
}

.topbar__action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.topbar__action-btn {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text-secondary, #475569);
}

.topbar__action-btn--search {
  font-weight: 700;
  letter-spacing: 0.04em;
}

.topbar__action-btn--active {
  color: var(--color-primary-600, #2563eb);
  border-color: rgba(37, 99, 235, 0.24);
  background: rgba(37, 99, 235, 0.08);
}

.topbar__user-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.topbar__user-box strong {
  font-size: 13px;
  color: var(--color-text, #0f172a);
}

.topbar__user-box span {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

.topbar__logout-btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(239, 68, 68, 0.24);
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-danger-700, #b91c1c);
  font-weight: 600;
}

.workspace__body {
  padding: 24px;
  min-width: 0;
}

.command-palette {
  display: grid;
  gap: 16px;
}

.command-palette__search {
  display: grid;
  gap: 8px;
}

.command-palette__input {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.95);
  color: var(--color-text, #0f172a);
}

.command-palette__input:focus {
  outline: none;
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.command-palette__hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

.command-palette__results {
  display: grid;
  gap: 8px;
}

.command-palette__item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.88);
  text-align: left;
  color: var(--color-text, #0f172a);
}

.command-palette__item:hover {
  border-color: rgba(37, 99, 235, 0.24);
  background: rgba(37, 99, 235, 0.06);
}

.command-palette__item-icon {
  text-align: center;
}

.command-palette__item-text {
  display: grid;
  gap: 2px;
}

.command-palette__item-text strong {
  font-size: 14px;
}

.command-palette__item-text small {
  color: var(--color-text-muted, #94a3b8);
}

.command-palette__item-shortcut {
  font-size: 11px;
  color: var(--color-text-muted, #94a3b8);
}

.command-palette__empty {
  padding: 16px;
  border-radius: 14px;
  border: 1px dashed rgba(148, 163, 184, 0.28);
  color: var(--color-text-muted, #94a3b8);
  text-align: center;
}

@media (max-width: 1200px) {
  .app-layout {
    grid-template-columns: 96px minmax(0, 1fr);
  }

  .app-layout--collapsed {
    grid-template-columns: 96px minmax(0, 1fr);
  }

  .sidebar__brand-copy,
  .sidebar__context-head,
  .sidebar__group-label,
  .sidebar__link-label,
  .sidebar__quick-link-label,
  .sidebar__recent-link-label {
    display: none;
  }
}

@media (max-width: 860px) {
  .app-layout,
  .app-layout--collapsed {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: sticky;
    top: 0;
    z-index: 20;
    max-height: 44vh;
    overflow: auto;
  }

  .topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .topbar__actions {
    justify-items: stretch;
  }

  .topbar__breadcrumbs {
    justify-content: flex-start;
  }

  .workspace__body {
    padding: 16px;
  }
}
</style>
