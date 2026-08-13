<template>
  <a href="#main-content" class="skip-link">Pular para o conteudo principal</a>

  <div
    class="app-layout"
    :class="{
      'app-layout--collapsed': appStore.sidebarCollapsed,
      'app-layout--compact': isCompactViewport,
      'app-layout--mobile-nav-open': isMobileNavigationOpen,
      'app-layout--dark': themeStore.theme === 'dark'
    }"
  >
    <header class="topbar">
      <div class="topbar__brand-pill">
        <img
          class="topbar__brand-logo"
          src="https://www.cevetguarapiranga.com.br/assets/uploads/gallery/img_6924fdbaa85a4.jpg"
          alt="Centro Veterinário Guarapiranga"
        />
        <div class="topbar__brand-copy">
          <strong>Centro Veterinário Guarapiranga</strong>
          <span>ERP operacional Premium</span>
        </div>
      </div>

      <button
        ref="navigationToggleEl"
        class="topbar__collapse-btn"
        type="button"
        data-testid="mobile-navigation-trigger"
        aria-controls="primary-navigation"
        :aria-expanded="isCompactViewport ? isMobileNavigationOpen : undefined"
        :aria-label="navigationToggleLabel"
        :title="navigationToggleLabel"
        @click="toggleNavigation"
      >
        <span class="topbar__collapse-icon">{{ navigationToggleIcon }}</span>
        <span class="topbar__collapse-label">{{ navigationToggleLabel }}</span>
      </button>

      <button class="topbar__search-shell" type="button" @click="openPalette">
        <span class="topbar__search-shell-icon">🔎</span>
        <span class="topbar__search-shell-copy">Buscar módulo, rotina ou relatório</span>
        <kbd>Ctrl+K</kbd>
      </button>

      <div class="topbar__actions">
        <button class="topbar__icon-btn topbar__icon-btn--notifications" type="button" title="Notificações" @click="navigateTo('/notifications')">
          🔔
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

        <button
          class="topbar__profile"
          type="button"
          aria-label="Abrir área do usuário"
          title="Configurar minha conta"
          :disabled="!authStore.user.id"
          @click="openUserProfile"
        >
          <strong>{{ authStore.userName }}</strong>
          <span>{{ userBadgeId }}</span>
        </button>

        <button class="topbar__logout-btn" @click="handleLogout()">Sair</button>
      </div>
    </header>

    <button
      v-if="isCompactViewport && isMobileNavigationOpen"
      class="sidebar-backdrop"
      type="button"
      data-testid="mobile-navigation-backdrop"
      aria-label="Fechar menu de navegação"
      @click="closeMobileNavigation"
    />

    <aside
      id="primary-navigation"
      ref="sidebarEl"
      class="sidebar"
      role="navigation"
      aria-label="Navegacao principal"
      :aria-hidden="isCompactViewport ? String(!isMobileNavigationOpen) : undefined"
    >
      <div class="sidebar__mobile-header">
        <div>
          <strong>Menu principal</strong>
          <span>Escolha uma área para continuar</span>
        </div>
        <button type="button" aria-label="Fechar menu de navegação" @click="closeMobileNavigation">×</button>
      </div>

      <div class="sidebar__search">
        <input
          v-model="searchQuery"
          type="search"
          class="sidebar__search-input"
          placeholder="Buscar"
          aria-label="Buscar módulo"
        />
      </div>

      <div
        ref="sidebarNavEl"
        class="sidebar__content"
        :class="{
          'sidebar__content--scrolled': isSidebarScrolled,
          'sidebar__content--top-fade': isSidebarScrolled,
          'sidebar__content--bottom-fade': !isSidebarNearBottom
        }"
      >
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
                <span v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__group-copy">
                  <span class="sidebar__group-label">{{ group.label }}</span>
                  <small class="sidebar__group-description">{{ group.description }}</small>
                </span>
              </span>
              <span v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__group-chevron">▾</span>
            </summary>

            <div class="sidebar__group-body">
              <section
                v-for="section in group.sections"
                :key="section.id"
                class="sidebar__section"
                :class="{ 'sidebar__section--active': currentLocation?.section.id === section.id }"
              >
                <p v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__section-label">
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
                  <span v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__link-label">
                    {{ item.label }}
                  </span>
                </router-link>
              </section>
            </div>
          </details>
        </nav>

        <section class="sidebar__utility-stack">
          <div v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__utility-label">Utilitários</div>
          <details
            v-if="filteredEnterpriseSections.length"
            class="sidebar__utility-group sidebar__utility-group--enterprise"
          >
            <summary class="sidebar__utility-summary">
              <span class="sidebar__eyebrow">Console Enterprise</span>
              <span v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__microcopy">Governança e integrações</span>
            </summary>
            <div class="sidebar__panel sidebar__panel--enterprise">
              <div class="sidebar__enterprise-groups">
                <section
                  v-for="section in filteredEnterpriseSections"
                  :key="section.id"
                  class="sidebar__section"
                >
                  <p v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__section-label">
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
                    <span v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__link-label">
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
              <span v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__microcopy">Atalhos pessoais</span>
            </summary>
            <section class="sidebar__panel">
              <div class="sidebar__panel-head">
                <button
                  v-if="!appStore.sidebarCollapsed || isCompactViewport"
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
                  <span v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__quick-link-label">
                    {{ item.label }}
                  </span>
                </router-link>
              </div>
            </section>
          </details>

          <details v-if="recentLinks.length" class="sidebar__utility-group">
            <summary class="sidebar__utility-summary">
              <span class="sidebar__eyebrow">Recentes</span>
              <span v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__microcopy">Histórico de navegação</span>
            </summary>
            <section class="sidebar__panel sidebar__panel--recent">
              <div class="sidebar__panel-head">
                <button
                  v-if="!appStore.sidebarCollapsed || isCompactViewport"
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
                  <span v-if="!appStore.sidebarCollapsed || isCompactViewport" class="sidebar__recent-link-label">
                    {{ item.label }}
                  </span>
                </router-link>
              </div>
            </section>
          </details>
        </section>
      </div>

      <div class="sidebar__mobile-actions" data-testid="mobile-account-actions">
        <button type="button" @click="themeStore.toggle()">
          <span aria-hidden="true">{{ themeStore.theme === 'dark' ? '☀️' : '🌙' }}</span>
          {{ themeStore.theme === 'dark' ? 'Tema claro' : 'Tema escuro' }}
        </button>
        <button type="button" :disabled="!authStore.user.id" @click="openUserProfile">
          <span aria-hidden="true">👤</span>
          Minha conta
        </button>
        <button type="button" @click="handleLogout">
          <span aria-hidden="true">↪</span>
          Sair
        </button>
      </div>
    </aside>

    <main class="workspace">
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
const historyPosition = ref(readHistoryPosition());
const maxHistoryPosition = ref(readHistoryPosition());
const sidebarEl = ref<HTMLElement | null>(null);
const navigationToggleEl = ref<HTMLButtonElement | null>(null);
const sidebarNavEl = ref<HTMLElement | null>(null);
const isSidebarScrolled = ref(false);
const isSidebarNearBottom = ref(false);
const isCompactViewport = ref(false);
const isMobileNavigationOpen = ref(false);
const compactViewportQuery = '(max-width: 1024px)';
let compactViewportMedia: MediaQueryList | null = null;

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
  if (route.path === '/') {
    return 'Início';
  }

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
  const current = route.path === '/'
    ? undefined
    : typeof route.meta.breadcrumb === 'string'
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
const canGoBack = computed(() => historyPosition.value > 0);
const canGoForward = computed(() => historyPosition.value < maxHistoryPosition.value);
const navigationToggleLabel = computed(() => {
  if (isCompactViewport.value) {
    return isMobileNavigationOpen.value ? 'Fechar menu de navegação' : 'Abrir menu de navegação';
  }

  return appStore.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral';
});
const navigationToggleIcon = computed(() => {
  if (isCompactViewport.value) {
    return isMobileNavigationOpen.value ? '×' : '☰';
  }

  return appStore.sidebarCollapsed ? '☰' : '⇤';
});

function readHistoryPosition() {
  if (typeof window === 'undefined') return 0;
  const state = window.history.state as { position?: number } | null;
  return typeof state?.position === 'number' ? state.position : 0;
}

function isActivePath(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`);
}

function shouldOpenGroup(groupId: string): boolean {
  if (searchQuery.value.trim()) return true;
  return matchingNavGroup.value?.id === groupId || groupId === 'dashboards';
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

function toggleNavigation() {
  if (!isCompactViewport.value) {
    appStore.toggleSidebar();
    return;
  }

  isMobileNavigationOpen.value = !isMobileNavigationOpen.value;
}

function closeMobileNavigation(restoreFocus = true) {
  const wasOpen = isMobileNavigationOpen.value;
  isMobileNavigationOpen.value = false;
  if (wasOpen && restoreFocus) {
    void nextTick(() => navigationToggleEl.value?.focus());
  }
}

function syncCompactViewport(eventOrMedia: MediaQueryListEvent | MediaQueryList) {
  isCompactViewport.value = eventOrMedia.matches;
  if (!eventOrMedia.matches) {
    closeMobileNavigation();
  }
}

function navigateTo(path: string) {
  closePalette();
  void router.push(path);
}

function openUserProfile() {
  const userId = authStore.user.id;
  if (!userId) return;

  navigateTo(`/users/${encodeURIComponent(userId)}/edit`);
}

function syncHistoryPosition() {
  const nextPosition = readHistoryPosition();
  historyPosition.value = nextPosition;
  if (nextPosition > maxHistoryPosition.value) {
    maxHistoryPosition.value = nextPosition;
  }
}

function goBack() {
  if (!canGoBack.value) return;
  router.back();
}

function goForward() {
  if (!canGoForward.value) return;
  router.forward();
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
    if (isMobileNavigationOpen.value) {
      event.preventDefault();
      closeMobileNavigation();
    } else if (commandPaletteOpen.value) {
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

function syncSidebarScrollState() {
  const container = sidebarNavEl.value;
  const scrollTop = container?.scrollTop ?? 0;
  const clientHeight = container?.clientHeight ?? 0;
  const scrollHeight = container?.scrollHeight ?? 0;

  isSidebarScrolled.value = scrollTop > 12;
  isSidebarNearBottom.value = scrollTop + clientHeight >= scrollHeight - 12;
}

function scrollActiveSidebarItemIntoView() {
  const container = sidebarNavEl.value;
  if (!container) return;

  const activeItem = container.querySelector<HTMLElement>(
    '.sidebar__link--active, .sidebar__quick-link--active, .sidebar__recent-link--active'
  );

  if (!activeItem) {
    syncSidebarScrollState();
    return;
  }

  activeItem.closest('details')?.setAttribute('open', 'true');

  window.requestAnimationFrame(() => {
    activeItem.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    syncSidebarScrollState();
  });
}

onMounted(async () => {
  compactViewportMedia = window.matchMedia(compactViewportQuery);
  syncCompactViewport(compactViewportMedia);
  compactViewportMedia.addEventListener('change', syncCompactViewport);
  window.addEventListener('keydown', onKeydown);
  sidebarNavEl.value?.addEventListener('scroll', syncSidebarScrollState, { passive: true });
  syncHistoryPosition();
  await nextTick();
  scrollActiveSidebarItemIntoView();
  syncSidebarScrollState();
});

onBeforeUnmount(() => {
  compactViewportMedia?.removeEventListener('change', syncCompactViewport);
  compactViewportMedia = null;
  window.removeEventListener('keydown', onKeydown);
  sidebarNavEl.value?.removeEventListener('scroll', syncSidebarScrollState);
  document.body.classList.remove('mobile-navigation-open');
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

watch(
  () => route.fullPath,
  async () => {
    closeMobileNavigation(false);
    syncHistoryPosition();
    await nextTick();
    scrollActiveSidebarItemIntoView();
    syncSidebarScrollState();
  }
);

watch(isMobileNavigationOpen, async (open) => {
  document.body.classList.toggle('mobile-navigation-open', open);
  if (!open) return;

  await nextTick();
  sidebarEl.value?.querySelector<HTMLElement>('.sidebar__search-input')?.focus();
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
  --brand-blue: #0ea5e9;
  --brand-blue-dark: #0284c7;
  --brand-blue-soft: #e0f2fe;
  --brand-blue-ink: #075985;
  --shell-border: #dbe5ee;
  --shell-text: #243140;
  --shell-muted: #64748b;
  --topbar-height: 72px;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  grid-template-rows: var(--topbar-height) minmax(0, 1fr);
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 24%),
    linear-gradient(180deg, #f7fbff, #edf3f8 58%, #e9f0f6);
  font-family:
    'Open Sans',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
}

.app-layout--collapsed {
  grid-template-columns: 64px minmax(0, 1fr);
}

.sidebar {
  position: sticky;
  top: var(--topbar-height);
  grid-column: 1;
  grid-row: 2;
  height: calc(100vh - var(--topbar-height));
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 8px;
  border-right: 1px solid var(--shell-border);
  background: linear-gradient(180deg, #f8fbfe, #f2f6fa 72%, #edf3f8);
  min-width: 0;
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.85);
}

.sidebar-backdrop,
.sidebar__mobile-header,
.sidebar__mobile-actions {
  display: none;
}

.sidebar__panel {
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
  border: 0;
}

.sidebar__panel--enterprise {
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.08), rgba(255, 255, 255, 0.88));
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
  color: var(--brand-blue-dark);
}

.sidebar__microcopy {
  font-size: 12px;
  color: #8893a0;
}

.sidebar__search {
  padding: 0;
}

.sidebar__search-input {
  width: 100%;
  min-height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  border: 0;
  background: rgba(255, 255, 255, 0.72);
  color: var(--shell-text);
  outline: none;
}

.app-layout--collapsed .sidebar__search {
  display: none;
}

.sidebar__search-input:focus {
  border-color: rgba(14, 165, 233, 0.55);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14);
}

.sidebar__content {
  position: relative;
  display: grid;
  gap: 8px;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 3px;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 138, 156, 0.42) transparent;
  transition: box-shadow 0.18s ease;
}

.sidebar__content::before,
.sidebar__content::after {
  content: '';
  position: sticky;
  left: 0;
  right: 0;
  display: block;
  height: 18px;
  z-index: 2;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.sidebar__content::before {
  top: 0;
  margin-bottom: -18px;
  background: linear-gradient(180deg, rgba(241, 243, 246, 0.98), rgba(241, 243, 246, 0));
}

.sidebar__content::after {
  bottom: 0;
  margin-top: -18px;
  background: linear-gradient(0deg, rgba(241, 243, 246, 0.98), rgba(241, 243, 246, 0));
}

.sidebar__content--top-fade::before,
.sidebar__content--bottom-fade::after {
  opacity: 1;
}

.sidebar__content::-webkit-scrollbar {
  width: 6px;
}

.sidebar__content::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(136, 153, 170, 0.72), rgba(115, 133, 151, 0.54));
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.sidebar__content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(118, 136, 154, 0.84), rgba(97, 116, 135, 0.66));
}

.sidebar__content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar__content--scrolled {
  box-shadow: inset 0 10px 14px rgba(36, 49, 64, 0.035);
}

.sidebar__nav {
  display: grid;
  gap: 6px;
  min-height: auto;
}

.sidebar__utility-stack {
  display: grid;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid rgba(220, 226, 233, 0.58);
}

.sidebar__utility-label {
  padding: 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9aa4af;
}

.sidebar__utility-group {
  border-radius: 8px;
  border: 0;
  background: rgba(255, 255, 255, 0.46);
  overflow: hidden;
}

.sidebar__utility-group--enterprise {
  background: rgba(224, 242, 254, 0.62);
}

.sidebar__utility-summary {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 9px;
  cursor: pointer;
}

.sidebar__utility-summary::-webkit-details-marker {
  display: none;
}

.sidebar__group {
  border-radius: 8px;
  border: 0;
  background: transparent;
  overflow: hidden;
}

.sidebar__group--active {
  background: rgba(255, 255, 255, 0.5);
  box-shadow: inset 2px 0 0 var(--brand-blue);
}

.sidebar__group-summary {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px;
  cursor: pointer;
  user-select: none;
}

.sidebar__group--active > .sidebar__group-summary {
  background: rgba(224, 242, 254, 0.72);
}

.sidebar__group-summary::-webkit-details-marker {
  display: none;
}

.sidebar__group-summary-text {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sidebar__group-copy {
  display: grid;
  min-width: 0;
}

.sidebar__group-icon {
  width: 22px;
  text-align: center;
}

.sidebar__group-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--shell-text);
}

.sidebar__group-description {
  font-size: 10px;
  line-height: 1.3;
  color: #8a95a2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__group-chevron {
  color: #9aa4af;
}

.sidebar__group-body,
.sidebar__enterprise-groups {
  display: grid;
  gap: 4px;
  padding: 2px 4px 6px;
}

.sidebar__group-body {
  background: transparent;
}

.sidebar__section {
  display: grid;
  gap: 2px;
  padding: 3px 2px;
  border-radius: 8px;
}

.sidebar__section--active {
  background: rgba(255, 255, 255, 0.46);
  border: 0;
}

.sidebar__section-label {
  margin: 0;
  padding: 2px 8px 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9aa4af;
}

.sidebar__quick-links,
.sidebar__recent-list {
  display: grid;
  gap: 2px;
}

.sidebar__quick-link,
.sidebar__recent-link,
.sidebar__link {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 7px 7px;
  border-radius: 7px;
  border: 0;
  color: #4e5b68;
  text-decoration: none;
  transition:
    transform 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}

.sidebar__quick-link:hover,
.sidebar__recent-link:hover,
.sidebar__link:hover {
  transform: none;
  background: rgba(14, 165, 233, 0.08);
  text-decoration: none;
}

.sidebar__quick-link--active,
.sidebar__recent-link--active,
.sidebar__link--active {
  background: rgba(224, 242, 254, 0.84);
  color: var(--brand-blue-ink);
  font-weight: 600;
}

.sidebar__link--utility {
  background: rgba(255, 255, 255, 0.42);
}

.sidebar__quick-link-icon,
.sidebar__recent-link-icon,
.sidebar__link-icon {
  width: 20px;
  flex-shrink: 0;
  text-align: center;
}

.sidebar__link-label,
.sidebar__quick-link-label,
.sidebar__recent-link-label {
  font-size: 13px;
  max-width: 154px;
  min-width: 0;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.sidebar__ghost-btn {
  background: none;
  border: 0;
  color: var(--brand-blue-dark);
  font-size: 12px;
  font-weight: 600;
  padding: 0;
}

.workspace {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  grid-column: 1 / -1;
  grid-row: 1;
  min-height: var(--topbar-height);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  border-bottom: 1px solid rgba(14, 116, 144, 0.14);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.97), rgba(240, 249, 255, 0.94)),
    linear-gradient(90deg, rgba(14, 165, 233, 0.16), rgba(2, 132, 199, 0.08));
  min-width: 0;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(16px);
}

.topbar__brand-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-shrink: 0;
}

.topbar__brand-logo {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid rgba(14, 165, 233, 0.22);
  box-shadow: 0 8px 18px rgba(2, 132, 199, 0.14);
}

.topbar__brand-copy {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.topbar__brand-copy strong {
  font-size: 14px;
  color: #0f172a;
  white-space: nowrap;
}

.topbar__brand-copy span {
  font-size: 11px;
  color: var(--brand-blue-dark);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.topbar__collapse-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 9px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.82);
  color: #475569;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.topbar__collapse-icon {
  font-size: 14px;
}

.topbar__collapse-label {
  display: none;
}

.topbar__search-shell {
  flex: 1;
  min-height: 42px;
  max-width: 620px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(14, 165, 233, 0.18);
  background: rgba(255, 255, 255, 0.9);
  color: #64748b;
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

.command-palette__item-shortcut {
  font-size: 11px;
  color: #98a1ab;
}

.topbar__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.topbar__icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(255, 255, 255, 0.84);
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.topbar__icon-btn--notifications,
.topbar__icon-btn--whatsapp {
  color: #475569;
  border-color: rgba(14, 165, 233, 0.16);
  background: rgba(255, 255, 255, 0.88);
}

.topbar__icon-btn--whatsapp {
  position: relative;
}

.topbar__icon-btn--whatsapp::after {
  content: '';
  position: absolute;
  right: 7px;
  bottom: 7px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #16a34a;
}

.topbar__profile {
  display: grid;
  align-items: center;
  min-height: 38px;
  max-width: 190px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(14, 165, 233, 0.22);
  background: linear-gradient(135deg, rgba(224, 242, 254, 0.78), rgba(255, 255, 255, 0.98));
  min-width: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.topbar__profile:hover,
.topbar__profile:focus-visible {
  border-color: rgba(14, 165, 233, 0.5);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  outline: none;
}

.topbar__profile:disabled {
  cursor: default;
  opacity: 0.7;
}

.topbar__profile strong {
  font-size: 13px;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar__profile span {
  font-size: 11px;
  color: var(--brand-blue-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar__logout-btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(14, 165, 233, 0.18);
  background: rgba(255, 255, 255, 0.88);
  color: var(--brand-blue-ink);
  font-weight: 600;
}

.workspace__body {
  padding: 24px;
  min-width: 0;
  background: transparent;
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
  border-color: rgba(14, 165, 233, 0.24);
  background: rgba(14, 165, 233, 0.06);
}

.command-palette__item--selected {
  border-color: rgba(14, 165, 233, 0.45);
  background: rgba(14, 165, 233, 0.1);
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

.app-layout--dark {
  --shell-border: #1e293b;
  --shell-text: #e2e8f0;
  --shell-muted: #94a3b8;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.18), transparent 24%),
    linear-gradient(180deg, #0f172a, #111827 58%, #0b1120);
}

.app-layout--dark .topbar {
  border-bottom-color: rgba(56, 189, 248, 0.16);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(12, 74, 110, 0.9)),
    linear-gradient(90deg, rgba(14, 165, 233, 0.16), rgba(15, 23, 42, 0.92));
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.24);
}

.app-layout--dark .sidebar {
  background: linear-gradient(180deg, #111827, #0f172a 72%, #0b1120);
  box-shadow: inset -1px 0 0 rgba(148, 163, 184, 0.08);
}

.app-layout--dark .sidebar__search-input,
.app-layout--dark .topbar__search-shell,
.app-layout--dark .topbar__collapse-btn,
.app-layout--dark .topbar__icon-btn,
.app-layout--dark .topbar__logout-btn,
.app-layout--dark .command-palette__input,
.app-layout--dark .command-palette__item {
  border-color: rgba(56, 189, 248, 0.18);
  background: rgba(15, 23, 42, 0.76);
  color: #cbd5e1;
}

.app-layout--dark .topbar__brand-copy strong,
.app-layout--dark .topbar__profile strong,
.app-layout--dark .sidebar__group-label {
  color: #f8fafc;
}

.app-layout--dark .topbar__profile,
.app-layout--dark .sidebar__group--active,
.app-layout--dark .sidebar__section--active,
.app-layout--dark .sidebar__utility-group,
.app-layout--dark .sidebar__panel {
  background: rgba(15, 23, 42, 0.62);
}

.app-layout--dark .sidebar__link,
.app-layout--dark .sidebar__quick-link,
.app-layout--dark .sidebar__recent-link {
  color: #cbd5e1;
}

.app-layout--dark .sidebar__link--active,
.app-layout--dark .sidebar__quick-link--active,
.app-layout--dark .sidebar__recent-link--active {
  background: rgba(14, 165, 233, 0.18);
  color: #7dd3fc;
}

@media (min-width: 1025px) and (max-width: 1200px) {
  .app-layout,
  .app-layout--collapsed {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .sidebar__search,
  .sidebar__group-label,
  .sidebar__group-description,
  .sidebar__link-label,
  .sidebar__quick-link-label,
  .sidebar__recent-link-label,
  .sidebar__microcopy,
  .sidebar__section-label,
  .sidebar__ghost-btn,
  .sidebar__utility-label {
    display: none;
  }
}

@media (min-width: 1025px) and (max-width: 1180px) {
  .app-layout {
    --topbar-height: 122px;
  }

  .topbar {
    flex-wrap: wrap;
    height: auto;
    min-height: var(--topbar-height);
    padding: 10px 14px;
  }

  .topbar__search-shell {
    order: 3;
    flex-basis: 100%;
    max-width: none;
    width: 100%;
  }

  .topbar__actions {
    margin-left: auto;
  }
}

@media (max-width: 1024px) {
  .app-layout,
  .app-layout--collapsed {
    --topbar-height: 64px;
    grid-template-columns: 1fr;
    grid-template-rows: var(--topbar-height) minmax(0, 1fr);
  }

  .topbar {
    position: sticky;
    grid-column: 1;
    grid-row: 1;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    min-height: var(--topbar-height);
    padding: max(8px, env(safe-area-inset-top)) 16px 8px;
  }

  .topbar__brand-pill {
    display: none;
  }

  .topbar__actions,
  .topbar__search-shell-copy,
  .topbar__search-shell kbd {
    display: none;
  }

  .topbar__collapse-btn,
  .topbar__search-shell {
    min-width: var(--touch-min, 44px);
    min-height: var(--touch-min, 44px);
  }

  .topbar__search-shell {
    justify-self: end;
    width: 44px;
    max-width: 44px;
    padding: 0;
    justify-content: center;
  }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 80;
    width: min(360px, 88vw);
    height: 100dvh;
    max-height: none;
    padding: max(14px, env(safe-area-inset-top)) 12px max(14px, env(safe-area-inset-bottom));
    border-right: 1px solid var(--shell-border);
    box-shadow: 20px 0 48px rgba(15, 23, 42, 0.22);
    transform: translateX(-105%);
    visibility: hidden;
    transition: transform 180ms ease, visibility 180ms step-end;
  }

  .app-layout--mobile-nav-open .sidebar {
    transform: translateX(0);
    visibility: visible;
    transition: transform 180ms ease, visibility 0s;
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: rgba(15, 23, 42, 0.48);
    backdrop-filter: blur(2px);
  }

  .sidebar__mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .sidebar__mobile-header > div {
    display: grid;
    gap: 2px;
  }

  .sidebar__mobile-header strong {
    color: var(--shell-text);
    font-size: 15px;
  }

  .sidebar__mobile-header span {
    color: var(--shell-muted);
    font-size: 12px;
  }

  .sidebar__mobile-header button {
    width: var(--touch-min, 44px);
    height: var(--touch-min, 44px);
    border: 0;
    border-radius: 10px;
    background: rgba(148, 163, 184, 0.12);
    color: var(--shell-text);
    font-size: 24px;
  }

  .sidebar__mobile-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--shell-border);
  }

  .sidebar__mobile-actions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
    min-height: var(--touch-min, 44px);
    padding: 8px;
    border: 1px solid var(--shell-border);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.72);
    color: var(--shell-text);
    font-size: 12px;
  }

  .sidebar__search,
  .sidebar__group-label,
  .sidebar__group-description,
  .sidebar__link-label,
  .sidebar__quick-link-label,
  .sidebar__recent-link-label,
  .sidebar__microcopy,
  .sidebar__section-label,
  .sidebar__ghost-btn,
  .sidebar__utility-label {
    display: initial;
  }

  .app-layout .sidebar__search {
    display: block;
  }

  .sidebar__link-label,
  .sidebar__quick-link-label,
  .sidebar__recent-link-label {
    max-width: none;
  }

  .sidebar__group-summary,
  .sidebar__quick-link,
  .sidebar__recent-link,
  .sidebar__link,
  .sidebar__utility-summary,
  .sidebar__search-input {
    min-height: var(--touch-min, 44px);
  }

  .workspace {
    grid-column: 1;
    grid-row: 2;
  }

  .workspace__body {
    width: 100%;
    padding: 20px;
    overflow-wrap: anywhere;
  }
}

:global(body.mobile-navigation-open) {
  overflow: hidden;
  overscroll-behavior: none;
}

@media (max-width: 600px) {
  .topbar {
    padding-inline: 12px;
  }

  .workspace__body {
    padding: 14px 12px calc(20px + env(safe-area-inset-bottom));
  }

  .sidebar {
    width: min(340px, 92vw);
  }

  .sidebar__mobile-actions {
    grid-template-columns: 1fr;
  }
}
</style>
