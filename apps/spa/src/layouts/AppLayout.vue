<template>
  <a href="#main-content" class="skip-link">Pular para o conteudo principal</a>

  <div
    class="app-layout"
    :class="{ 'app-layout--collapsed': appStore.sidebarCollapsed }"
    role="application"
    aria-label="CVG HIS - Sistema de Gestao de Saude"
  >
    <aside class="sidebar" role="navigation" aria-label="Navegacao principal">
      <div class="sidebar__brand">
        <div v-if="!appStore.sidebarCollapsed" class="sidebar__brand-copy">
          <span class="sidebar__eyebrow">Menu</span>
          <strong>Navegação operacional</strong>
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

      <section class="sidebar__company-context" :class="{ 'sidebar__company-context--collapsed': appStore.sidebarCollapsed }">
        <div class="sidebar__company-head">
          <span class="sidebar__eyebrow">Empresa:</span>
          <span v-if="!appStore.sidebarCollapsed" class="sidebar__company-switch">↔ Trocar contexto</span>
        </div>
        <div class="sidebar__company-card">
          <span class="sidebar__company-icon">🏥</span>
          <div v-if="!appStore.sidebarCollapsed" class="sidebar__company-copy">
            <strong>Centro Veterinário Guarapiranga</strong>
            <span>Unidade principal ativa</span>
          </div>
        </div>
      </section>

      <div class="sidebar__search">
        <input
          v-model="searchQuery"
          type="search"
          class="sidebar__search-input"
          placeholder="Buscar módulo, rotina ou relatório..."
          aria-label="Buscar módulo"
        />
      </div>

      <nav class="sidebar__nav" aria-label="Navegação principal">
        <details
          v-for="group in filteredGroups"
          :key="group.id"
          class="sidebar__group"
          :class="{ 'sidebar__group--active': matchingNavGroup?.id === group.id }"
          :open="shouldOpenGroup(group.id)"
        >
          <summary class="sidebar__group-summary">
            <span class="sidebar__group-summary-text">
              <span class="sidebar__group-icon">{{ group.icon }}</span>
              <span v-if="!appStore.sidebarCollapsed" class="sidebar__group-label">
                {{ group.label }}
              </span>
            </span>
            <span v-if="!appStore.sidebarCollapsed" class="sidebar__group-chevron">▾</span>
          </summary>

          <div class="sidebar__group-body">
            <section
              v-for="section in group.sections"
              :key="section.id"
              class="sidebar__section"
              :class="{ 'sidebar__section--active': currentLocation?.section.id === section.id }"
            >
              <p v-if="!appStore.sidebarCollapsed" class="sidebar__section-label">
                {{ section.label }}
              </p>
              <router-link
                v-for="item in section.items"
                :key="item.path"
                :to="item.path"
                class="sidebar__link"
                :class="{ 'sidebar__link--active': isActivePath(item.path) }"
                :title="item.label"
              >
                <span class="sidebar__link-icon">{{ item.icon ?? '•' }}</span>
                <span v-if="!appStore.sidebarCollapsed" class="sidebar__link-label">
                  {{ item.label }}
                </span>
              </router-link>
            </section>
          </div>
        </details>
      </nav>

      <section class="sidebar__utility-stack">
        <div v-if="!appStore.sidebarCollapsed" class="sidebar__utility-label">Utilitários</div>
        <details
          v-if="filteredEnterpriseSections.length"
          class="sidebar__utility-group sidebar__utility-group--enterprise"
        >
          <summary class="sidebar__utility-summary">
            <span class="sidebar__eyebrow">Console Enterprise</span>
            <span v-if="!appStore.sidebarCollapsed" class="sidebar__microcopy">Governança e integrações</span>
          </summary>
          <div class="sidebar__panel sidebar__panel--enterprise">
            <div class="sidebar__enterprise-groups">
              <section
                v-for="section in filteredEnterpriseSections"
                :key="section.id"
                class="sidebar__section"
              >
                <p v-if="!appStore.sidebarCollapsed" class="sidebar__section-label">
                  {{ section.label }}
                </p>
                <router-link
                  v-for="item in section.items"
                  :key="item.path"
                  :to="item.path"
                  class="sidebar__link sidebar__link--utility"
                  :class="{ 'sidebar__link--active': isActivePath(item.path) }"
                  :title="item.label"
                >
                  <span class="sidebar__link-icon">{{ item.icon ?? '•' }}</span>
                  <span v-if="!appStore.sidebarCollapsed" class="sidebar__link-label">
                    {{ item.label }}
                  </span>
                </router-link>
              </section>
            </div>
          </div>
        </details>

        <details v-if="favoriteLinks.length" class="sidebar__utility-group">
          <summary class="sidebar__utility-summary">
            <span class="sidebar__eyebrow">Favoritos</span>
            <span v-if="!appStore.sidebarCollapsed" class="sidebar__microcopy">Atalhos pessoais</span>
          </summary>
          <section class="sidebar__panel">
            <div class="sidebar__panel-head">
              <button
                v-if="!appStore.sidebarCollapsed"
                class="sidebar__ghost-btn"
                type="button"
                @click="toggleCurrentFavoriteRoute()"
              >
                {{ isCurrentRouteFavorite ? 'Desfavoritar atual' : 'Favoritar atual' }}
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
                <span v-if="!appStore.sidebarCollapsed" class="sidebar__quick-link-label">
                  {{ item.label }}
                </span>
              </router-link>
            </div>
          </section>
        </details>

        <details v-if="recentLinks.length" class="sidebar__utility-group">
          <summary class="sidebar__utility-summary">
            <span class="sidebar__eyebrow">Recentes</span>
            <span v-if="!appStore.sidebarCollapsed" class="sidebar__microcopy">Histórico de navegação</span>
          </summary>
          <section class="sidebar__panel sidebar__panel--recent">
            <div class="sidebar__panel-head">
              <button
                v-if="!appStore.sidebarCollapsed"
                class="sidebar__ghost-btn"
                type="button"
                @click="appStore.clearRecentRoutes()"
              >
                Limpar
              </button>
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
                <span v-if="!appStore.sidebarCollapsed" class="sidebar__recent-link-label">
                  {{ item.label }}
                </span>
              </router-link>
            </div>
          </section>
        </details>
      </section>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div class="topbar__system-row">
          <div class="topbar__system-left">
            <div class="topbar__brand-pill">
              <div class="topbar__brand-logo">V</div>
              <div class="topbar__brand-copy">
                <strong>CVG HIS</strong>
                <span>Shell Vetus-aligned</span>
              </div>
            </div>

            <button
              class="topbar__collapse-btn"
              type="button"
              @click="appStore.toggleSidebar()"
              :aria-label="appStore.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'"
              :title="appStore.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'"
            >
              <span class="topbar__collapse-icon">{{ appStore.sidebarCollapsed ? '☰' : '⇤' }}</span>
              <span class="topbar__collapse-label">{{ appStore.sidebarCollapsed ? 'Expandir menu' : 'Recolher menu' }}</span>
            </button>

            <button class="topbar__search-shell" type="button" @click="openPalette">
              <span class="topbar__search-shell-icon">🔎</span>
              <span class="topbar__search-shell-copy">Buscar módulo, rotina ou relatório</span>
              <kbd>Ctrl+K</kbd>
            </button>
          </div>

          <div class="topbar__system-right">
            <button class="topbar__icon-btn topbar__icon-btn--notifications" type="button" title="Notificações" @click="navigateTo('/notifications')">
              🔔
            </button>

            <button class="topbar__icon-btn topbar__icon-btn--support" type="button" title="Suporte" @click="openSupportCenter()">
              ❔
            </button>

            <button class="topbar__icon-btn topbar__icon-btn--whatsapp" type="button" title="WhatsApp operacional" @click="navigateTo('/notifications/whatsapp')">
              💬
            </button>

            <button
              class="topbar__icon-btn"
              type="button"
              :title="themeStore.theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
              @click="themeStore.toggle()"
            >
              {{ themeStore.theme === 'dark' ? '☀️' : '🌙' }}
            </button>

            <div class="topbar__profile">
              <strong>{{ authStore.userName }}</strong>
              <span>{{ userBadgeId }}</span>
            </div>

            <button class="topbar__logout-btn" @click="handleLogout()">Sair</button>
          </div>
        </div>

        <div class="topbar__context-row">
          <div class="topbar__title-block">
            <div class="topbar__breadcrumbs" aria-label="Breadcrumbs">
              <span
                v-for="(crumb, index) in shellBreadcrumbs"
                :key="`${crumb.label}-${index}`"
                class="topbar__breadcrumb-item"
              >
                <span v-if="index > 0" class="topbar__breadcrumb-separator">/</span>
                <span>{{ crumb.label }}</span>
              </span>
            </div>
            <h1 class="topbar__title">{{ currentPageTitle }}</h1>
            <p class="topbar__subtitle">
              {{ currentAreaLabel }} · Centro Veterinário Guarapiranga
            </p>
          </div>
        </div>
      </header>

      <section class="workspace__body" id="main-content" role="main" aria-label="Conteudo principal">
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
            placeholder="Digite um módulo, rota ou ação..."
            autocomplete="off"
            @keydown.enter.prevent="executeSelected"
            @keydown.esc.prevent="closePalette"
            @keydown.up.prevent="moveSelectionUp"
            @keydown.down.prevent="moveSelectionDown"
          />
          <p class="command-palette__hint">
            <kbd>↑</kbd><kbd>↓</kbd> navegar &nbsp;·&nbsp; <kbd>Enter</kbd> selecionar
            &nbsp;·&nbsp; <kbd>Esc</kbd> fechar
          </p>
        </div>

        <div class="command-palette__results" role="listbox">
          <template v-if="filteredActionItems.length">
            <div class="command-palette__section-label">Ações</div>
            <button
              v-for="(item, index) in filteredActionItems"
              :key="'action-' + item.id"
              type="button"
              class="command-palette__item"
              :class="{ 'command-palette__item--selected': selectedIndex === index }"
              role="option"
              :aria-selected="selectedIndex === index"
              @click="executeAction(item)"
              @mouseenter="selectedIndex = index"
            >
              <span class="command-palette__item-icon">{{ item.icon }}</span>
              <span class="command-palette__item-text">
                <strong>{{ item.label }}</strong>
                <small>{{ item.description }}</small>
              </span>
              <kbd v-if="item.shortcut" class="command-palette__item-shortcut">{{ item.shortcut }}</kbd>
            </button>
          </template>

          <template v-if="filteredRouteItems.length">
            <div class="command-palette__section-label">Rotas</div>
            <button
              v-for="(item, index) in filteredRouteItems"
              :key="'route-' + item.path"
              type="button"
              class="command-palette__item"
              :class="{ 'command-palette__item--selected': selectedIndex === filteredActionItems.length + index }"
              role="option"
              :aria-selected="selectedIndex === filteredActionItems.length + index"
              @click="navigateTo(item.path)"
              @mouseenter="selectedIndex = filteredActionItems.length + index"
            >
              <span class="command-palette__item-icon">{{ item.icon ?? '•' }}</span>
              <span class="command-palette__item-text">
                <strong>{{ item.label }}</strong>
                <small>{{ item.groupLabel }}</small>
              </span>
              <kbd class="command-palette__item-shortcut">{{ item.shortcut }}</kbd>
            </button>
          </template>

          <div v-if="filteredActionItems.length === 0 && filteredRouteItems.length === 0" class="command-palette__empty">
            Nenhum resultado encontrado.
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
import {
  enterpriseConsole,
  findMatchingNavGroup,
  findMatchingNavLocation,
  findNavItem,
  navGroups,
  type AppNavGroup,
  type AppNavItem,
  type AppNavSection
} from '@/navigation';
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
const selectedIndex = ref(0);

interface CommandAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

interface CommandRouteItem extends AppNavItem {
  groupLabel: string;
  shortcut: string;
}

const currentLocation = computed(() => findMatchingNavLocation(route.path));
const matchingNavGroup = computed(() => findMatchingNavGroup(route.path) ?? navGroups[0]!);

const currentAreaLabel = computed(() => {
  if (currentLocation.value?.area === 'enterprise') {
    return 'Console Enterprise';
  }
  return currentLocation.value?.group.label ?? 'Início';
});

const currentPageTitle = computed(() => {
  const routeTitle = typeof route.meta.title === 'string' ? route.meta.title : undefined;
  if (routeTitle) {
    return routeTitle;
  }

  return currentLocation.value?.item.label ?? currentAreaLabel.value;
});

const userBadgeId = computed(() => {
  const rawId = authStore.user.id ?? authStore.user.accountId ?? null;
  if (!rawId) {
    return 'Id. --';
  }

  return `Id. ${rawId.slice(0, 8)}`;
});

const shellBreadcrumbs = computed(() => {
  const crumbs: Array<{ label: string }> = [];
  const area = currentAreaLabel.value;
  const parent = typeof route.meta.breadcrumbParent === 'string' ? route.meta.breadcrumbParent : undefined;
  const current = typeof route.meta.breadcrumb === 'string'
    ? route.meta.breadcrumb
    : currentLocation.value?.item.label ?? currentPageTitle.value;

  if (area) {
    crumbs.push({ label: area });
  }

  if (parent && parent !== area) {
    crumbs.push({ label: parent });
  }

  const lastCrumb = crumbs[crumbs.length - 1]?.label;
  if (current && current !== lastCrumb) {
    crumbs.push({ label: current });
  }

  return crumbs;
});

const favoriteTargetPath = computed(() => currentLocation.value?.item.path ?? route.path);
const isCurrentRouteFavorite = computed(() => appStore.isFavoriteRoute(favoriteTargetPath.value));

const commandActions = computed<CommandAction[]>(() => [
  {
    id: 'toggle-theme',
    label: 'Alternar tema',
    description: themeStore.theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro',
    icon: themeStore.theme === 'dark' ? '☀️' : '🌙',
    shortcut: 'T',
    action: () => themeStore.toggle()
  },
  {
    id: 'toggle-sidebar',
    label: 'Recolher/Expandir menu',
    description: appStore.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral',
    icon: '↔️',
    shortcut: 'M',
    action: () => appStore.toggleSidebar()
  },
  {
    id: 'toggle-favorite',
    label: isCurrentRouteFavorite.value ? 'Remover favorito da rota atual' : 'Favoritar rota atual',
    description: favoriteTargetPath.value,
    icon: isCurrentRouteFavorite.value ? '★' : '☆',
    shortcut: 'F',
    action: () => toggleCurrentFavoriteRoute()
  },
  {
    id: 'create-patient',
    label: 'Novo paciente',
    description: 'Cadastrar um novo paciente no sistema',
    icon: '➕',
    shortcut: 'P',
    action: () => navigateTo('/patients/new')
  },
  {
    id: 'create-appointment',
    label: 'Novo agendamento',
    description: 'Criar um novo agendamento',
    icon: '📅',
    shortcut: 'A',
    action: () => navigateTo('/appointments/new')
  },
  {
    id: 'open-support',
    label: 'Abrir suporte operacional',
    description: 'Levar para a busca mestre e rotinas de ajuda',
    icon: '🆘',
    shortcut: '?',
    action: () => navigateTo('/master-search')
  },
  {
    id: 'logout',
    label: 'Sair do sistema',
    description: 'Encerrar sessão e redirecionar para login',
    icon: '🚪',
    shortcut: 'Sair',
    action: () => handleLogout()
  }
]);

function itemMatchesQuery(item: AppNavItem, query: string, groupLabel: string, sectionLabel: string): boolean {
  return (
    item.label.toLowerCase().includes(query) ||
    item.path.toLowerCase().includes(query) ||
    item.keywords?.some((keyword) => keyword.toLowerCase().includes(query)) === true ||
    groupLabel.toLowerCase().includes(query) ||
    sectionLabel.toLowerCase().includes(query)
  );
}

function filterGroup(group: AppNavGroup, query: string): AppNavGroup | null {
  if (!query) return group;

  const groupMatches = group.label.toLowerCase().includes(query) || group.description.toLowerCase().includes(query);
  const nextSections = group.sections
    .map((section) => {
      if (groupMatches || section.label.toLowerCase().includes(query)) {
        return section;
      }

      const items = section.items.filter((item) => itemMatchesQuery(item, query, group.label, section.label));
      return items.length > 0 ? { ...section, items } : null;
    })
    .filter((section): section is AppNavSection => Boolean(section));

  if (groupMatches) return group;
  return nextSections.length > 0 ? { ...group, sections: nextSections } : null;
}

const filteredGroups = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return navGroups
    .map((group) => filterGroup(group, query))
    .filter((group): group is AppNavGroup => Boolean(group));
});

const filteredEnterpriseSections = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return enterpriseConsole.sections;
  }

  return enterpriseConsole.sections
    .map((section) => {
      if (enterpriseConsole.label.toLowerCase().includes(query) || section.label.toLowerCase().includes(query)) {
        return section;
      }

      const items = section.items.filter((item) =>
        itemMatchesQuery(item, query, enterpriseConsole.label, section.label)
      );
      return items.length > 0 ? { ...section, items } : null;
    })
    .filter((section): section is AppNavSection => Boolean(section));
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

const commandItems = computed<CommandRouteItem[]>(() => {
  const mainItems = navGroups.flatMap((group) =>
    group.sections.flatMap((section) =>
      section.items.map((item) => ({
        ...item,
        groupLabel: `${group.label} · ${section.label}`,
        shortcut:
          item.path === '/'
            ? 'Home'
            : item.path.split('/').filter(Boolean).slice(-1)[0] ?? item.label
      }))
    )
  );

  const enterpriseItems = enterpriseConsole.sections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      groupLabel: `${enterpriseConsole.label} · ${section.label}`,
      shortcut: item.path.split('/').filter(Boolean).slice(-1)[0] ?? item.label
    }))
  );

  return [...mainItems, ...enterpriseItems];
});

const filteredActionItems = computed(() => {
  const query = commandQuery.value.trim().toLowerCase();
  if (!query) {
    return commandActions.value.slice(0, 6);
  }

  return commandActions.value
    .filter((item) => item.label.toLowerCase().includes(query) || item.description.toLowerCase().includes(query))
    .slice(0, 6);
});

const filteredRouteItems = computed(() => {
  const query = commandQuery.value.trim().toLowerCase();

  if (!query) {
    return commandItems.value.slice(0, 12);
  }

  return commandItems.value
    .filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.path.toLowerCase().includes(query) ||
        item.groupLabel.toLowerCase().includes(query) ||
        item.keywords?.some((keyword) => keyword.toLowerCase().includes(query)) === true
      );
    })
    .slice(0, 12);
});

const totalItems = computed(() => filteredActionItems.value.length + filteredRouteItems.value.length);

function isActivePath(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`);
}

function shouldOpenGroup(groupId: string): boolean {
  if (searchQuery.value.trim()) return true;
  return matchingNavGroup.value?.id === groupId || groupId === 'inicio';
}

function openPalette() {
  commandPaletteOpen.value = true;
  commandQuery.value = '';
  selectedIndex.value = 0;
}

function closePalette() {
  commandPaletteOpen.value = false;
  commandQuery.value = '';
  selectedIndex.value = 0;
}

function navigateTo(path: string) {
  closePalette();
  void router.push(path);
}

function executeAction(item: CommandAction) {
  closePalette();
  item.action();
}

function executeSelected() {
  const actionCount = filteredActionItems.value.length;
  if (selectedIndex.value < actionCount) {
    executeAction(filteredActionItems.value[selectedIndex.value]);
    return;
  }

  const routeIndex = selectedIndex.value - actionCount;
  const routeItem = filteredRouteItems.value[routeIndex];
  if (routeItem) {
    navigateTo(routeItem.path);
  }
}

function moveSelectionUp() {
  const total = totalItems.value;
  if (total === 0) return;
  selectedIndex.value = selectedIndex.value <= 0 ? total - 1 : selectedIndex.value - 1;
}

function moveSelectionDown() {
  const total = totalItems.value;
  if (total === 0) return;
  selectedIndex.value = selectedIndex.value >= total - 1 ? 0 : selectedIndex.value + 1;
}

function toggleCurrentFavoriteRoute() {
  appStore.toggleFavoriteRoute(favoriteTargetPath.value);
}

function openSupportCenter() {
  navigateTo('/master-search');
}

function onKeydown(event: KeyboardEvent) {
  const isCommand = event.metaKey || event.ctrlKey;

  if (isCommand && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openPalette();
    return;
  }

  if (event.key === '/' && !isInInputField()) {
    event.preventDefault();
    const searchInput = document.querySelector('.sidebar__search-input') as HTMLInputElement | null;
    searchInput?.focus();
    return;
  }

  if (event.key === '?' && !isInInputField()) {
    event.preventDefault();
    openPalette();
    commandQuery.value = 'suporte';
    return;
  }

  if (event.key === 'Escape') {
    if (commandPaletteOpen.value) {
      event.preventDefault();
      closePalette();
    } else if (searchQuery.value) {
      searchQuery.value = '';
    }
    return;
  }

  if (commandPaletteOpen.value) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelectionUp();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelectionDown();
    }
  }
}

function isInInputField(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || active.getAttribute('contenteditable') === 'true';
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

watch(totalItems, (nextTotal) => {
  if (nextTotal <= 0) {
    selectedIndex.value = 0;
    return;
  }

  if (selectedIndex.value >= nextTotal) {
    selectedIndex.value = nextTotal - 1;
  }
});

function handleLogout() {
  authStore.logout();
  void router.push('/login');
}
</script>

<style scoped>
.skip-link {
  position: absolute;
  top: -100px;
  left: 16px;
  z-index: 9999;
  padding: 12px 16px;
  background: var(--color-primary-600, #2563eb);
  color: var(--color-text-inverse, #ffffff);
  font-weight: 600;
  border-radius: var(--radius-md, 6px);
  text-decoration: none;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 16px;
  outline: none;
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.4));
}

.app-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  background: var(--color-bg, #f3f6f9);
}

.app-layout--collapsed {
  grid-template-columns: 104px minmax(0, 1fr);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 14px;
  border-right: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
  min-width: 0;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px 2px;
}

.sidebar__brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sidebar__brand-copy strong {
  font-size: 13px;
  color: var(--color-text, #0f172a);
}

.sidebar__brand-copy span {
  font-size: 11px;
  color: var(--color-primary-600, #2563eb);
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

.sidebar__company-context {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(37, 99, 235, 0.12);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(239, 246, 255, 0.92));
}

.sidebar__company-context--collapsed {
  padding: 10px;
}

.sidebar__company-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.sidebar__company-switch {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.sidebar__company-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(37, 99, 235, 0.1);
}

.sidebar__company-icon {
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar__company-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.sidebar__company-copy strong {
  font-size: 13px;
  color: var(--color-text, #0f172a);
}

.sidebar__company-copy span {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.sidebar__panel {
  padding: 12px;
  border-radius: 14px;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
}

.sidebar__panel--enterprise {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.03), rgba(37, 99, 235, 0.02));
}

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

.sidebar__search {
  padding: 0 2px;
}

.sidebar__search-input {
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  outline: none;
}

.sidebar__search-input:focus {
  border-color: rgba(37, 99, 235, 0.45);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.sidebar__utility-stack {
  display: grid;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px dashed rgba(148, 163, 184, 0.26);
}

.sidebar__utility-label {
  padding: 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #94a3b8);
}

.sidebar__utility-group {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.72);
  overflow: hidden;
}

.sidebar__utility-group--enterprise {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.025), rgba(37, 99, 235, 0.015));
}

.sidebar__utility-summary {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
}

.sidebar__utility-summary::-webkit-details-marker {
  display: none;
}

.sidebar__nav {
  display: grid;
  gap: 10px;
  min-height: 0;
}

.sidebar__group {
  border-radius: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
  overflow: hidden;
}

.sidebar__group--active {
  border-color: rgba(37, 99, 235, 0.28);
  box-shadow: inset 4px 0 0 rgba(37, 99, 235, 0.96);
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

.sidebar__group--active > .sidebar__group-summary {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.04));
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

.sidebar__group-body,
.sidebar__enterprise-groups {
  display: grid;
  gap: 8px;
  padding: 0 8px 10px;
}

.sidebar__group-body {
  background: linear-gradient(180deg, rgba(250, 245, 235, 0.95), rgba(255, 248, 240, 0.72));
}

.sidebar__section {
  display: grid;
  gap: 4px;
  padding: 6px 4px;
  border-radius: 12px;
}

.sidebar__section--active {
  background: rgba(245, 158, 11, 0.14);
}

.sidebar__section-label {
  margin: 0;
  padding: 2px 10px 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #94a3b8);
}

.sidebar__quick-links,
.sidebar__recent-list {
  display: grid;
  gap: 6px;
}

.sidebar__quick-link,
.sidebar__recent-link,
.sidebar__link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 10px 10px;
  border-radius: 12px;
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

.sidebar__link--utility {
  background: rgba(15, 23, 42, 0.02);
}

.sidebar__quick-link-icon,
.sidebar__recent-link-icon,
.sidebar__link-icon {
  width: 24px;
  flex-shrink: 0;
  text-align: center;
}

.sidebar__link-label,
.sidebar__quick-link-label,
.sidebar__recent-link-label {
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
  display: grid;
  gap: 0;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
  min-width: 0;
}

.topbar__system-row,
.topbar__context-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding: 12px 24px;
}

.topbar__system-row {
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
}

.topbar__system-left,
.topbar__system-right {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.topbar__system-left {
  flex: 1;
}

.topbar__brand-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.topbar__brand-logo {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #f97316, #fb923c);
  color: #ffffff;
  font-weight: 800;
  box-shadow: 0 10px 25px rgba(249, 115, 22, 0.22);
}

.topbar__brand-copy {
  display: grid;
  gap: 2px;
}

.topbar__brand-copy strong {
  font-size: 14px;
  color: var(--color-text, #0f172a);
}

.topbar__brand-copy span {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.topbar__collapse-btn {
  min-height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(249, 115, 22, 0.22);
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.96), rgba(255, 255, 255, 1));
  color: #c2410c;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.topbar__collapse-icon {
  font-size: 14px;
}

.topbar__collapse-label {
  font-size: 12px;
  white-space: nowrap;
}

.topbar__search-shell {
  flex: 1;
  min-height: 40px;
  max-width: 520px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--color-border, #dbe3ee);
  background: #ffffff;
  color: var(--color-text-secondary, #475569);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-start;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.topbar__search-shell-copy {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar__search-shell-icon {
  font-size: 14px;
}

.topbar__context-row {
  align-items: flex-start;
}

.topbar__title-block {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.topbar__breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted, #64748b);
}

.topbar__breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.topbar__breadcrumb-separator {
  color: var(--color-border-strong, #94a3b8);
}

.topbar__title {
  margin: 0;
  font-size: 24px;
  line-height: 1.1;
  color: var(--color-text, #0f172a);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar__subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.topbar__action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.topbar__action-btn {
  min-height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
  color: var(--color-text-secondary, #475569);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.topbar__action-btn--search {
  font-weight: 700;
}

.topbar__action-btn kbd,
.command-palette__item-shortcut {
  font-size: 11px;
  color: var(--color-text-muted, #94a3b8);
}

.topbar__icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
  color: var(--color-text-secondary, #475569);
}

.topbar__icon-btn--notifications {
  color: #1d4ed8;
}

.topbar__icon-btn--support {
  color: #475569;
}

.topbar__icon-btn--whatsapp {
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.22);
  background: linear-gradient(135deg, rgba(240, 253, 244, 0.96), rgba(255, 255, 255, 1));
}

.topbar__profile {
  display: grid;
  align-items: center;
  min-height: 38px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(37, 99, 235, 0.26);
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.72), rgba(255, 255, 255, 0.98));
}

.topbar__profile strong {
  font-size: 13px;
  color: var(--color-text, #0f172a);
}

.topbar__profile span {
  font-size: 11px;
  color: var(--color-primary-700, #1d4ed8);
}

.topbar__logout-btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(239, 68, 68, 0.18);
  background: var(--color-surface, #ffffff);
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

.command-palette__section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #94a3b8);
  padding: 4px 0;
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

.command-palette__item--selected {
  border-color: rgba(37, 99, 235, 0.45);
  background: rgba(37, 99, 235, 0.1);
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

.command-palette__empty {
  padding: 16px;
  border-radius: 14px;
  border: 1px dashed rgba(148, 163, 184, 0.28);
  color: var(--color-text-muted, #94a3b8);
  text-align: center;
}

@media (max-width: 1200px) {
  .app-layout,
  .app-layout--collapsed {
    grid-template-columns: 104px minmax(0, 1fr);
  }

  .sidebar__brand-copy,
  .sidebar__group-label,
  .sidebar__link-label,
  .sidebar__quick-link-label,
  .sidebar__recent-link-label,
  .sidebar__microcopy,
  .sidebar__section-label,
  .sidebar__ghost-btn,
  .sidebar__utility-label,
  .topbar__collapse-label {
    display: none;
  }
}

@media (max-width: 980px) {
  .topbar__system-row,
  .topbar__context-row,
  .topbar__system-left,
  .topbar__system-right {
    flex-wrap: wrap;
  }

  .topbar__search-shell {
    max-width: none;
    width: 100%;
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
    max-height: 48vh;
    overflow: auto;
  }

  .workspace__body {
    padding: 16px;
  }
}
</style>
