<template>
  <a href="#main-content" class="skip-link">Pular para o conteudo principal</a>

  <div
    class="app-layout"
    :class="{
      'app-layout--collapsed': appStore.sidebarCollapsed,
      'app-layout--dark': themeStore.theme === 'dark'
    }"
    role="application"
    aria-label="CVG HIS - Sistema de Gestao de Saude"
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
        class="topbar__collapse-btn"
        type="button"
        @click="appStore.toggleSidebar()"
        :aria-label="appStore.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'"
        :title="appStore.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'"
      >
        <span class="topbar__collapse-icon">{{ appStore.sidebarCollapsed ? '☰' : '⇤' }}</span>
        <span class="topbar__collapse-label">{{
          appStore.sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'
        }}</span>
      </button>

      <button class="topbar__search-shell" type="button" @click="openPalette">
        <span class="topbar__search-shell-icon">🔎</span>
        <span class="topbar__search-shell-copy">Buscar módulo, rotina ou relatório</span>
        <kbd>Ctrl+K</kbd>
      </button>

      <div class="topbar__actions">
        <button
          class="topbar__icon-btn topbar__icon-btn--notifications"
          type="button"
          title="Notificações"
          @click="navigateTo('/notifications')"
        >
          🔔
        </button>

        <button
          class="topbar__icon-btn topbar__icon-btn--whatsapp"
          type="button"
          title="WhatsApp operacional"
          @click="navigateTo('/notifications/whatsapp')"
        >
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
    </header>

    <aside
      class="sidebar"
      role="navigation"
      aria-label="Navegacao principal"
      :aria-hidden="isCompactViewport && appStore.sidebarCollapsed ? 'true' : undefined"
      :inert="isCompactViewport && appStore.sidebarCollapsed"
    >
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
                <span v-if="!appStore.sidebarCollapsed" class="sidebar__group-copy">
                  <span class="sidebar__group-label">{{ group.label }}</span>
                  <small class="sidebar__group-description">{{ group.description }}</small>
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
              <span v-if="!appStore.sidebarCollapsed" class="sidebar__microcopy"
                >Governança e integrações</span
              >
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
              <span v-if="!appStore.sidebarCollapsed" class="sidebar__microcopy"
                >Atalhos pessoais</span
              >
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
              <span v-if="!appStore.sidebarCollapsed" class="sidebar__microcopy"
                >Histórico de navegação</span
              >
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
      </div>
    </aside>

    <button
      v-if="!appStore.sidebarCollapsed"
      class="sidebar__backdrop"
      type="button"
      aria-label="Fechar menu lateral"
      @click="appStore.toggleSidebar()"
    />

    <main id="main-content" class="workspace" aria-label="Conteúdo principal" tabindex="-1">
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
            placeholder="Digite um módulo, rota ou ação..."
            autocomplete="off"
            @keydown.enter.prevent="executeSelected"
            @keydown.esc.prevent="closePalette"
            @keydown.up.prevent="moveSelectionUp"
            @keydown.down.prevent="moveSelectionDown"
          />
          <p class="command-palette__hint">
            <kbd>↑</kbd><kbd>↓</kbd> navegar &nbsp;·&nbsp; <kbd>Enter</kbd> selecionar &nbsp;·&nbsp;
            <kbd>Esc</kbd> fechar
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
              <kbd v-if="item.shortcut" class="command-palette__item-shortcut">{{
                item.shortcut
              }}</kbd>
            </button>
          </template>

          <template v-if="filteredRouteItems.length">
            <div class="command-palette__section-label">Rotas</div>
            <button
              v-for="(item, index) in filteredRouteItems"
              :key="'route-' + item.path"
              type="button"
              class="command-palette__item"
              :class="{
                'command-palette__item--selected':
                  selectedIndex === filteredActionItems.length + index
              }"
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

          <div
            v-if="filteredActionItems.length === 0 && filteredRouteItems.length === 0"
            class="command-palette__empty"
          >
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
const sidebarNavEl = ref<HTMLElement | null>(null);
const isSidebarScrolled = ref(false);
const isSidebarNearBottom = ref(false);
const compactViewportQuery = window.matchMedia?.('(max-width: 860px)');
const isCompactViewport = ref(compactViewportQuery?.matches ?? false);

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
  const parent =
    typeof route.meta.breadcrumbParent === 'string' ? route.meta.breadcrumbParent : undefined;
  const current =
    route.path === '/'
      ? undefined
      : typeof route.meta.breadcrumb === 'string'
        ? route.meta.breadcrumb
        : (currentLocation.value?.item.label ?? currentPageTitle.value);

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

function itemMatchesQuery(
  item: AppNavItem,
  query: string,
  groupLabel: string,
  sectionLabel: string
): boolean {
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

  const groupMatches =
    group.label.toLowerCase().includes(query) || group.description.toLowerCase().includes(query);
  const nextSections = group.sections
    .map((section) => {
      if (groupMatches || section.label.toLowerCase().includes(query)) {
        return section;
      }

      const items = section.items.filter((item) =>
        itemMatchesQuery(item, query, group.label, section.label)
      );
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
      if (
        enterpriseConsole.label.toLowerCase().includes(query) ||
        section.label.toLowerCase().includes(query)
      ) {
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
            : (item.path.split('/').filter(Boolean).slice(-1)[0] ?? item.label)
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
    .filter(
      (item) =>
        item.label.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)
    )
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

const totalItems = computed(
  () => filteredActionItems.value.length + filteredRouteItems.value.length
);
const canGoBack = computed(() => historyPosition.value > 0);
const canGoForward = computed(() => historyPosition.value < maxHistoryPosition.value);

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

function navigateTo(path: string) {
  closePalette();
  void router.push(path);
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

function syncSidebarScrollState() {
  const container = sidebarNavEl.value;
  const scrollTop = container?.scrollTop ?? 0;
  const clientHeight = container?.clientHeight ?? 0;
  const scrollHeight = container?.scrollHeight ?? 0;

  isSidebarScrolled.value = scrollTop > 12;
  isSidebarNearBottom.value = scrollTop + clientHeight >= scrollHeight - 12;
}

function syncCompactViewport(event: MediaQueryListEvent) {
  isCompactViewport.value = event.matches;
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
  window.addEventListener('keydown', onKeydown);
  compactViewportQuery?.addEventListener('change', syncCompactViewport);
  sidebarNavEl.value?.addEventListener('scroll', syncSidebarScrollState, { passive: true });
  syncHistoryPosition();
  await nextTick();
  scrollActiveSidebarItemIntoView();
  syncSidebarScrollState();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  compactViewportQuery?.removeEventListener('change', syncCompactViewport);
  sidebarNavEl.value?.removeEventListener('scroll', syncSidebarScrollState);
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
    syncHistoryPosition();
    await nextTick();
    scrollActiveSidebarItemIntoView();
    syncSidebarScrollState();
  }
);

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
  --brand-blue: var(--color-primary-600, #2563eb);
  --brand-blue-dark: var(--color-primary-700, #1d4ed8);
  --brand-blue-soft: var(--color-primary-subtle, #eaf3ff);
  --brand-blue-ink: var(--color-primary-800, #1e40af);
  --shell-border: var(--color-border, #dbe4ee);
  --shell-text: var(--color-text, #162235);
  --shell-muted: var(--color-text-muted, #718198);
  --topbar-height: var(--app-topbar-height, 72px);
  min-height: 100vh;
  display: grid;
  grid-template-columns: var(--app-sidebar-width, 248px) minmax(0, 1fr);
  grid-template-rows: var(--topbar-height) minmax(0, 1fr);
  background: var(--color-bg, #f4f7fb);
  color: var(--shell-text);
  font-family: var(--font-family-sans, Inter, system-ui, sans-serif);
}

.app-layout--collapsed {
  grid-template-columns: var(--app-sidebar-collapsed-width, 64px) minmax(0, 1fr);
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
  background: var(--color-surface, #ffffff);
  min-width: 0;
  box-shadow: inset -1px 0 0 var(--color-border, #dbe4ee);
}

.sidebar__panel {
  padding: 8px;
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
  border: 1px solid var(--color-border, #dbe4ee);
}

.sidebar__panel--enterprise {
  background: var(--color-primary-surface, #f7fbff);
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
  color: var(--shell-muted);
}

.sidebar__search {
  padding: 0;
}

.sidebar__search-input {
  width: 100%;
  min-height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: var(--color-bg-subtle, #f8fafc);
  color: var(--shell-text);
  outline: none;
}

.app-layout--collapsed .sidebar__search {
  display: none;
}

.sidebar__search-input:focus {
  border-color: var(--color-primary-400, #60a5fa);
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.36));
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
  scrollbar-color: var(--color-border-strong, #c4d0de) transparent;
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
  background: linear-gradient(180deg, var(--color-surface, #ffffff), transparent);
}

.sidebar__content::after {
  bottom: 0;
  margin-top: -18px;
  background: linear-gradient(0deg, var(--color-surface, #ffffff), transparent);
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
  background: var(--color-border-strong, #c4d0de);
  border: 1px solid var(--color-surface, #ffffff);
}

.sidebar__content::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted, #718198);
}

.sidebar__content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar__content--scrolled {
  box-shadow: inset 0 10px 14px rgba(15, 23, 42, 0.04);
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
  border-top: 1px solid var(--color-border, #dbe4ee);
}

.sidebar__utility-label {
  padding: 0 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--shell-muted);
}

.sidebar__utility-group {
  border-radius: 8px;
  border: 0;
  background: var(--color-bg-subtle, #f8fafc);
  overflow: hidden;
}

.sidebar__utility-group--enterprise {
  background: var(--color-primary-subtle, #eaf3ff);
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
  background: var(--color-bg-subtle, #f8fafc);
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
  background: var(--color-primary-subtle, #eaf3ff);
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
  color: var(--shell-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__group-chevron {
  color: var(--shell-muted);
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
  background: var(--color-bg-subtle, #f8fafc);
  border: 0;
}

.sidebar__section-label {
  margin: 0;
  padding: 2px 8px 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--shell-muted);
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
  transform: none;
  background: var(--color-primary-subtle, #eaf3ff);
  text-decoration: none;
}

.sidebar__quick-link--active,
.sidebar__recent-link--active,
.sidebar__link--active {
  background: var(--color-primary-subtle, #eaf3ff);
  color: var(--brand-blue-ink);
  font-weight: 600;
}

.sidebar__link--utility {
  background: var(--color-bg-elevated, #ffffff);
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
  border-bottom: 1px solid var(--shell-border);
  background: var(--color-surface-glass, rgba(255, 255, 255, 0.86));
  min-width: 0;
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(15, 23, 42, 0.06));
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
  border: 2px solid var(--color-primary-200, #bfdbfe);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(15, 23, 42, 0.06));
}

.topbar__brand-copy {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.topbar__brand-copy strong {
  font-size: 14px;
  color: var(--shell-text);
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
  border: 1px solid var(--shell-border);
  background: var(--color-bg-elevated, #ffffff);
  color: var(--color-text-secondary, #475569);
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
  border: 1px solid var(--color-border, #dbe4ee);
  background: var(--color-bg-elevated, #ffffff);
  color: var(--color-text-muted, #718198);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-start;
  box-shadow: var(--shadow-inner, inset 0 1px 2px rgba(15, 23, 42, 0.04));
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
  color: var(--shell-muted);
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
  border: 1px solid var(--shell-border);
  background: var(--color-bg-elevated, #ffffff);
  color: var(--color-text-secondary, #475569);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.topbar__icon-btn--notifications,
.topbar__icon-btn--whatsapp {
  color: var(--color-text-secondary, #475569);
  border-color: var(--color-border, #dbe4ee);
  background: var(--color-bg-elevated, #ffffff);
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
  background: var(--color-success-600, #059669);
}

.topbar__profile {
  display: grid;
  align-items: center;
  min-height: 38px;
  max-width: 190px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-primary-200, #bfdbfe);
  background: var(--color-primary-subtle, #eaf3ff);
  min-width: 0;
}

.topbar__profile strong {
  font-size: 13px;
  color: var(--shell-text);
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
  border: 1px solid var(--color-border, #dbe4ee);
  background: var(--color-bg-elevated, #ffffff);
  color: var(--brand-blue-ink);
  font-weight: 600;
}

.workspace__body {
  padding: clamp(16px, 2.2vw, 28px);
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
  border: 1px solid var(--color-border, #dbe4ee);
  background: var(--color-bg-elevated, #ffffff);
  color: var(--color-text, #162235);
}

.command-palette__input:focus {
  outline: none;
  border-color: var(--color-primary-400, #60a5fa);
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.36));
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
  border: 1px solid var(--color-border, #dbe4ee);
  background: var(--color-bg-elevated, #ffffff);
  text-align: left;
  color: var(--color-text, #0f172a);
}

.command-palette__item:hover {
  border-color: var(--color-primary-300, #93c5fd);
  background: var(--color-primary-subtle, #eaf3ff);
}

.command-palette__item--selected {
  border-color: var(--color-primary-400, #60a5fa);
  background: var(--color-primary-subtle, #eaf3ff);
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
  border: 1px dashed var(--color-border-strong, #c4d0de);
  color: var(--color-text-muted, #94a3b8);
  text-align: center;
}

.app-layout--dark {
  color-scheme: dark;
  background: var(--color-bg, #0b1220);
}

.sidebar__backdrop {
  display: none;
}

.topbar button:focus-visible,
.sidebar a:focus-visible,
.sidebar summary:focus-visible,
.sidebar button:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus, 0 0 0 3px rgba(37, 99, 235, 0.36));
}

.topbar__collapse-btn:hover,
.topbar__icon-btn:hover,
.topbar__logout-btn:hover {
  border-color: var(--color-primary-300, #93c5fd);
  background: var(--color-primary-subtle, #eaf3ff);
}

@media (max-width: 1200px) {
  .app-layout,
  .app-layout--collapsed {
    grid-template-columns: var(--app-sidebar-collapsed-width, 64px) minmax(0, 1fr);
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

@media (max-width: 980px) {
  .app-layout {
    --topbar-height: 112px;
  }

  .topbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-areas:
      'brand collapse actions'
      'search search search';
    height: auto;
    min-height: var(--topbar-height);
    padding: 10px 14px;
  }

  .topbar__brand-pill {
    grid-area: brand;
  }

  .topbar__collapse-btn {
    grid-area: collapse;
  }

  .topbar__search-shell {
    grid-area: search;
    max-width: none;
    width: 100%;
  }

  .topbar__actions {
    grid-area: actions;
  }
}

@media (max-width: 860px) {
  .app-layout,
  .app-layout--collapsed {
    --topbar-height: 112px;
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 100dvh;
  }

  .topbar {
    position: sticky;
    grid-column: 1;
    grid-row: 1;
    z-index: 90;
  }

  .topbar__brand-copy strong {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .topbar__brand-copy span,
  .topbar__search-shell kbd {
    display: none;
  }

  .topbar__actions {
    flex: 0 0 auto;
    gap: 6px;
  }

  .topbar__profile {
    max-width: 150px;
    padding-inline: 10px;
  }

  .topbar__logout-btn {
    padding-inline: 10px;
  }

  .sidebar {
    position: fixed;
    inset: var(--topbar-height) auto 0 0;
    z-index: 80;
    width: min(88vw, 320px);
    height: auto;
    max-height: none;
    transform: translateX(0);
    transition: transform var(--duration-normal, 250ms) var(--ease-default, ease);
    box-shadow: var(--shadow-lg, 0 8px 32px rgba(15, 23, 42, 0.1));
  }

  .app-layout--collapsed .sidebar {
    transform: translateX(-105%);
  }

  .sidebar__backdrop {
    display: block;
    position: fixed;
    inset: var(--topbar-height) 0 0;
    z-index: 70;
    width: 100%;
    padding: 0;
    border: 0;
    background: var(--color-bg-overlay, rgba(15, 23, 42, 0.48));
    cursor: pointer;
  }

  .app-layout--collapsed .sidebar__backdrop {
    display: none;
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

  .workspace {
    grid-column: 1;
    grid-row: 2;
    min-height: calc(100dvh - var(--topbar-height));
  }

  .app-layout .sidebar__search {
    display: block;
  }

  .workspace__body {
    padding: 16px 12px 24px;
  }
}

@media (max-width: 600px) {
  .app-layout,
  .app-layout--collapsed {
    --topbar-height: 104px;
  }

  .topbar {
    padding: 8px 12px;
    gap: 8px;
  }

  .topbar__brand-logo {
    width: 36px;
    height: 36px;
  }

  .topbar__brand-copy {
    display: none;
  }

  .topbar__collapse-btn,
  .topbar__icon-btn {
    width: 36px;
    height: 36px;
  }

  .topbar__profile {
    max-width: 108px;
    min-height: 36px;
    padding-inline: 8px;
  }

  .topbar__profile span {
    display: none;
  }

  .topbar__logout-btn {
    width: 36px;
    min-height: 36px;
    padding: 0;
    font-size: 0;
  }

  .topbar__logout-btn::after {
    content: '↪';
    font-size: 18px;
  }

  .topbar__search-shell {
    min-height: 40px;
    padding-inline: 12px;
  }
}
</style>
