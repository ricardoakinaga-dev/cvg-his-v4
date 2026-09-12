<template>
  <a href="#main-content" class="skip-link">Pular para o conteudo principal</a>

  <div
    class="app-layout"
    :class="{
      'app-layout--collapsed': appStore.sidebarCollapsed,
      'app-layout--dark': themeStore.theme === 'dark'
    }"
  >
    <header class="topbar" aria-label="Cabeçalho do sistema">
      <div class="topbar__brand-pill">
        <span class="topbar__brand-logo">
          <img
            src="/art/hospital-guarapiranga-logo.jpeg"
            alt="CVG Pulse · Centro Veterinário Guarapiranga"
            width="300"
            height="500"
          />
        </span>
        <div class="topbar__brand-copy" aria-hidden="true">
          <span class="topbar__brand-kicker">CVG PULSE</span>
          <strong>Centro Veterinário Guarapiranga</strong>
        </div>
      </div>

      <button
        ref="sidebarToggleEl"
        class="topbar__collapse-btn"
        type="button"
        aria-controls="primary-navigation"
        :aria-expanded="!appStore.sidebarCollapsed"
        @click="toggleSidebar"
        :aria-label="appStore.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'"
        :title="appStore.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'"
      >
        <span class="topbar__collapse-icon" aria-hidden="true">
          <IconSymbol :name="appStore.sidebarCollapsed ? 'menu' : 'panel-left'" :size="18" />
        </span>
        <span class="topbar__collapse-label">{{
          appStore.sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'
        }}</span>
      </button>

      <button
        class="topbar__search-shell"
        type="button"
        aria-label="Buscar módulo, rotina ou relatório (Ctrl+K)"
        @click="openPalette"
      >
        <span class="topbar__search-shell-icon" aria-hidden="true">
          <IconSymbol name="search" :size="18" />
        </span>
        <span class="topbar__search-shell-copy">Buscar módulo, rotina ou relatório</span>
        <kbd>Ctrl+K</kbd>
      </button>

      <div class="topbar__actions">
        <button
          v-if="canAccessNavigationPath('/notifications', sessionPermissionCodes)"
          class="topbar__icon-btn topbar__icon-btn--notifications"
          type="button"
          aria-label="Notificações"
          title="Notificações"
          @click="navigateTo('/notifications')"
        >
          <IconSymbol name="bell" :size="18" />
        </button>

        <button
          v-if="canAccessNavigationPath('/notifications/whatsapp', sessionPermissionCodes)"
          class="topbar__icon-btn topbar__icon-btn--whatsapp"
          type="button"
          aria-label="WhatsApp operacional"
          title="WhatsApp operacional"
          @click="navigateTo('/notifications/whatsapp')"
        >
          <IconSymbol name="message-circle" :size="18" />
        </button>

        <button
          class="topbar__icon-btn"
          type="button"
          :aria-label="
            themeStore.theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'
          "
          :title="themeStore.theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
          @click="themeStore.toggle()"
        >
          <IconSymbol :name="themeStore.theme === 'dark' ? 'sun' : 'moon'" :size="18" />
        </button>

        <div class="topbar__profile" aria-label="Sessão atual">
          <strong>{{ authStore.userName }}</strong>
          <span>{{ userBadgeId }}</span>
        </div>

        <button
          class="topbar__logout-btn"
          type="button"
          aria-label="Sair do sistema"
          title="Sair do sistema"
          @click="handleLogout()"
        >
          <IconSymbol class="topbar__logout-icon" name="log-out" :size="18" />
          <span class="topbar__logout-label">Sair</span>
        </button>
      </div>
    </header>

    <aside
      class="sidebar"
      aria-label="Navegação lateral"
      :aria-hidden="isCompactViewport && appStore.sidebarCollapsed ? 'true' : undefined"
      :inert="isCompactViewport && appStore.sidebarCollapsed"
    >
      <div class="sidebar__search">
        <label class="sr-only" for="sidebar-module-search">Buscar módulo</label>
        <input
          id="sidebar-module-search"
          ref="sidebarSearchInputEl"
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
        <nav id="primary-navigation" class="sidebar__nav" aria-label="Navegação principal">
          <details
            v-for="group in filteredGroups"
            :key="group.id"
            class="sidebar__group"
            :class="{ 'sidebar__group--active': matchingNavGroup?.id === group.id }"
            :open="shouldOpenGroup(group.id)"
          >
            <summary
              class="sidebar__group-summary"
              :aria-label="`${group.label}: ${group.description}`"
            >
              <span class="sidebar__group-summary-text">
                <span class="sidebar__group-icon" aria-hidden="true">
                  <IconSymbol :name="group.icon" :size="18" />
                </span>
                <span v-if="!appStore.sidebarCollapsed" class="sidebar__group-copy">
                  <span class="sidebar__group-label">{{ group.label }}</span>
                  <small class="sidebar__group-description">{{ group.description }}</small>
                </span>
              </span>
              <span
                v-if="!appStore.sidebarCollapsed"
                class="sidebar__group-chevron"
                aria-hidden="true"
              >
                <IconSymbol name="chevron-down" :size="15" />
              </span>
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
                  :aria-label="item.label"
                >
                  <span class="sidebar__link-icon" aria-hidden="true">
                    <IconSymbol :name="item.icon ?? 'dot'" :size="16" />
                  </span>
                  <span v-if="!appStore.sidebarCollapsed" class="sidebar__link-label">
                    {{ item.label }}
                  </span>
                </router-link>
              </section>
            </div>
          </details>
        </nav>

        <section class="sidebar__utility-stack" aria-label="Utilitários">
          <div v-if="!appStore.sidebarCollapsed" class="sidebar__utility-label">Utilitários</div>
          <details
            v-if="filteredEnterpriseSections.length"
            class="sidebar__utility-group sidebar__utility-group--enterprise"
            :class="{ 'sidebar__utility-group--active': currentLocation?.area === 'enterprise' }"
            :open="currentLocation?.area === 'enterprise' || undefined"
          >
            <summary
              class="sidebar__utility-summary"
              aria-label="Console Enterprise: Governança e integrações"
            >
              <span class="sidebar__eyebrow">Console Enterprise</span>
              <span v-if="!appStore.sidebarCollapsed" class="sidebar__microcopy"
                >Governança e integrações</span
              >
              <span class="sidebar__utility-chevron" aria-hidden="true">
                <IconSymbol name="chevron-down" :size="14" />
              </span>
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
                    :aria-label="item.label"
                  >
                    <span class="sidebar__link-icon" aria-hidden="true">
                      <IconSymbol :name="item.icon ?? 'dot'" :size="16" />
                    </span>
                    <span v-if="!appStore.sidebarCollapsed" class="sidebar__link-label">
                      {{ item.label }}
                    </span>
                  </router-link>
                </section>
              </div>
            </div>
          </details>

          <details v-if="favoriteLinks.length" class="sidebar__utility-group">
            <summary class="sidebar__utility-summary" aria-label="Favoritos: Atalhos pessoais">
              <span class="sidebar__eyebrow">Favoritos</span>
              <span v-if="!appStore.sidebarCollapsed" class="sidebar__microcopy"
                >Atalhos pessoais</span
              >
              <span class="sidebar__utility-chevron" aria-hidden="true">
                <IconSymbol name="chevron-down" :size="14" />
              </span>
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
                  :aria-label="item.label"
                  :title="item.label"
                >
                  <span class="sidebar__quick-link-icon" aria-hidden="true">
                    <IconSymbol :name="item.icon ?? 'star'" :size="16" />
                  </span>
                  <span v-if="!appStore.sidebarCollapsed" class="sidebar__quick-link-label">
                    {{ item.label }}
                  </span>
                </router-link>
              </div>
            </section>
          </details>

          <details v-if="recentLinks.length" class="sidebar__utility-group">
            <summary class="sidebar__utility-summary" aria-label="Recentes: Histórico de navegação">
              <span class="sidebar__eyebrow">Recentes</span>
              <span v-if="!appStore.sidebarCollapsed" class="sidebar__microcopy"
                >Histórico de navegação</span
              >
              <span class="sidebar__utility-chevron" aria-hidden="true">
                <IconSymbol name="chevron-down" :size="14" />
              </span>
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
                  :aria-label="item.label"
                  :title="item.label"
                >
                  <span class="sidebar__recent-link-icon" aria-hidden="true">
                    <IconSymbol :name="item.icon ?? 'arrow-up-right'" :size="16" />
                  </span>
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
      @click="toggleSidebar"
    />

    <main
      id="main-content"
      class="workspace"
      :class="{
        'workspace--page-header': route.meta.pageOwnsHeader === true,
        'workspace--success-flash-pending': successFlashPending || successFlashMessage
      }"
      aria-label="Conteúdo principal"
      tabindex="-1"
    >
      <div class="workspace__utility-bar">
        <div v-if="route.meta.pageOwnsHeader !== true" class="workspace__context">
          <span class="workspace__overline"
            >Operations OS <span aria-hidden="true">/</span> {{ currentAreaLabel }}</span
          >
          <strong v-if="route.meta.pageOwnsHeader !== true" class="workspace__title">{{
            currentPageTitle
          }}</strong>
          <nav
            v-if="shellBreadcrumbs.length > 1"
            class="workspace__breadcrumbs"
            aria-label="Contexto da página"
          >
            <span
              v-for="(crumb, index) in shellBreadcrumbs.slice(0, -1)"
              :key="`${crumb.label}-${index}`"
              class="workspace__breadcrumb"
            >
              <span v-if="index > 0" class="workspace__breadcrumb-separator" aria-hidden="true"
                >/</span
              >
              {{ crumb.label }}
            </span>
          </nav>
        </div>
        <div class="workspace__actions" aria-label="Ações do shell">
          <button
            class="workspace__history-btn"
            type="button"
            aria-label="Voltar"
            title="Voltar"
            :disabled="!canGoBack"
            @click="goBack"
          >
            <IconSymbol name="arrow-left" :size="16" />
          </button>
          <button
            class="workspace__history-btn"
            type="button"
            aria-label="Avançar"
            title="Avançar"
            :disabled="!canGoForward"
            @click="goForward"
          >
            <IconSymbol name="arrow-right" :size="16" />
          </button>
          <button
            class="workspace__support-btn"
            type="button"
            aria-label="Suporte"
            @click="openSupportCenter"
          >
            <IconSymbol name="life-buoy" :size="16" />
            <span>Suporte</span>
          </button>
        </div>
      </div>

      <div v-if="successFlashMessage" class="workspace__success-flash">
        <DsAlert variant="success" dismissible @dismiss="clearSuccessFlash">
          {{ successFlashMessage }}
        </DsAlert>
      </div>

      <section ref="workspaceBodyEl" class="workspace__body" :aria-label="currentPageTitle">
        <router-view />
      </section>
    </main>

    <DsModal
      :open="commandPaletteOpen"
      title="Buscar rotina"
      size="lg"
      initial-focus="#command-palette-input"
      @close="closePalette"
    >
      <div class="command-palette">
        <div class="command-palette__search">
          <label class="sr-only" for="command-palette-input">Buscar módulo, rota ou ação</label>
          <input
            id="command-palette-input"
            ref="commandInputEl"
            v-model.trim="commandQuery"
            class="command-palette__input"
            type="search"
            role="combobox"
            aria-controls="command-palette-results"
            aria-autocomplete="list"
            :aria-activedescendant="selectedCommandItemId"
            :aria-expanded="commandPaletteOpen"
            placeholder="Digite um módulo, rota ou ação..."
            autocomplete="off"
            @keydown.enter.prevent="executeSelected"
            @keydown.esc.prevent="closePalette"
            @keydown.up.prevent.stop="moveSelectionUp"
            @keydown.down.prevent.stop="moveSelectionDown"
          />
          <p class="command-palette__hint">
            <kbd>↑</kbd><kbd>↓</kbd> navegar &nbsp;·&nbsp; <kbd>Enter</kbd> selecionar &nbsp;·&nbsp;
            <kbd>Esc</kbd> fechar
          </p>
        </div>

        <div
          id="command-palette-results"
          class="command-palette__results"
          role="listbox"
          aria-label="Resultados da busca"
        >
          <template v-if="filteredActionItems.length">
            <div class="command-palette__section-label">Ações</div>
            <button
              v-for="(item, index) in filteredActionItems"
              :id="commandItemId('action', item.id)"
              :key="'action-' + item.id"
              type="button"
              class="command-palette__item"
              :class="{ 'command-palette__item--selected': selectedIndex === index }"
              role="option"
              :aria-selected="selectedIndex === index"
              @click="executeAction(item)"
              @mouseenter="selectedIndex = index"
            >
              <span class="command-palette__item-icon" aria-hidden="true">
                <IconSymbol :name="item.icon" :size="18" />
              </span>
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
              :id="commandItemId('route', item.path)"
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
              <span class="command-palette__item-icon" aria-hidden="true">
                <IconSymbol :name="item.icon ?? 'dot'" :size="18" />
              </span>
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
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import {
  createUnsavedChangesCoordinator,
  unsavedChangesCoordinatorKey
} from '@/composables/unsavedChangesCoordinator';
import { useRouteFocus } from '@/composables/useRouteFocus';
import { agendaContextKey } from '@/pages/appointments/agendaContext';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useAppStore } from '@/stores/app';
import { apiRequest } from '@/services/api';
import { canAccessNavigationItem, canAccessNavigationPath } from '@/navigation-permissions';
import {
  enterpriseConsole,
  findMatchingNavGroup,
  findMatchingNavLocation,
  findMatchingNavItem,
  findNavItem,
  navGroups,
  type AppNavGroup,
  type AppNavItem,
  type AppNavSection
} from '@/navigation';
import IconSymbol from '@/components/IconSymbol.vue';
import {
  cancelPendingSuccessFlashActivation,
  useSuccessFlash
} from '@/composables/successRedirect';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';

const route = useRoute();
const router = useRouter();
provide(agendaContextKey, { current: null });
const authStore = useAuthStore();
const themeStore = useThemeStore();
const appStore = useAppStore();
const {
  message: successFlashMessage,
  pending: successFlashPending,
  clear: clearSuccessFlash
} = useSuccessFlash();

const searchQuery = ref('');
const commandPaletteOpen = ref(false);
const commandQuery = ref('');
const commandInputEl = ref<HTMLInputElement | null>(null);
const selectedIndex = ref(0);
const historyPosition = ref(readHistoryPosition());
const maxHistoryPosition = ref(readHistoryPosition());
const sidebarToggleEl = ref<HTMLButtonElement | null>(null);
const sidebarSearchInputEl = ref<HTMLInputElement | null>(null);
const sidebarFocusReturnTarget = ref<HTMLElement | null>(null);
const sidebarNavEl = ref<HTMLElement | null>(null);
const workspaceBodyEl = ref<HTMLElement | null>(null);
const sessionPermissionCodes = ref<string[] | null>(null);
useRouteFocus(workspaceBodyEl);
let navigationAnimation: Animation | undefined;
let navigationAnimationGeneration = 0;
let layoutMounted = false;
let sessionLoadGeneration = 0;
const isSidebarScrolled = ref(false);
const isSidebarNearBottom = ref(false);
const compactViewportQuery = window.matchMedia?.('(max-width: 860px)');
const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const isCompactViewport = ref(compactViewportQuery?.matches ?? false);

function motionDuration(value: string, fallback: number) {
  const normalized = value.trim().toLowerCase();
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) return fallback;
  return normalized.endsWith('s') && !normalized.endsWith('ms') ? amount * 1000 : amount;
}

interface CommandAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  shortcut?: string;
  route?: string;
  action: () => void;
}

interface CommandRouteItem extends AppNavItem {
  groupLabel: string;
  shortcut: string;
}

interface SessionAccessResponse {
  access?: {
    permissionCodes?: string[];
  };
}

const currentLocation = computed(() => findMatchingNavLocation(route.path));
const matchingNavGroup = computed(() => findMatchingNavGroup(route.path) ?? navGroups[0]!);
const workspaceIdentity = computed(() => {
  const accountId = authStore.user.accountId;
  const userId = authStore.user.id;
  return accountId && userId ? `${accountId}:${userId}` : null;
});

watch(
  workspaceIdentity,
  (identity) => {
    appStore.setWorkspaceIdentity(identity);
    if (!identity) sessionPermissionCodes.value = [];
  },
  { immediate: true, flush: 'sync' }
);

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

const commandActions = computed<CommandAction[]>(() => {
  const permissionCodes = sessionPermissionCodes.value;
  if (permissionCodes === null) return [];

  const actions: CommandAction[] = [
    {
      id: 'toggle-theme',
      label: 'Alternar tema',
      description: themeStore.theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro',
      icon: themeStore.theme === 'dark' ? 'sun' : 'moon',
      shortcut: 'T',
      action: () => themeStore.toggle()
    },
    {
      id: 'toggle-sidebar',
      label: 'Recolher/Expandir menu',
      description: appStore.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral',
      icon: 'panel',
      shortcut: 'M',
      action: () => toggleSidebar()
    },
    {
      id: 'toggle-favorite',
      label: isCurrentRouteFavorite.value
        ? 'Remover favorito da rota atual'
        : 'Favoritar rota atual',
      description: favoriteTargetPath.value,
      icon: 'star',
      shortcut: 'F',
      route: favoriteTargetPath.value,
      action: () => toggleCurrentFavoriteRoute()
    },
    {
      id: 'create-patient',
      label: 'Novo paciente',
      description: 'Cadastrar um novo paciente no sistema',
      icon: 'plus',
      shortcut: 'P',
      route: '/patients/new',
      action: () => navigateTo('/patients/new')
    },
    {
      id: 'create-appointment',
      label: 'Novo agendamento',
      description: 'Criar um novo agendamento',
      icon: 'calendar',
      shortcut: 'A',
      route: '/appointments/new',
      action: () => navigateTo('/appointments/new')
    },
    {
      id: 'open-support',
      label: 'Abrir suporte operacional',
      description: 'Levar para a busca mestre e rotinas de ajuda',
      icon: 'life-buoy',
      shortcut: '?',
      route: '/master-search',
      action: () => navigateTo('/master-search')
    },
    {
      id: 'logout',
      label: 'Sair do sistema',
      description: 'Encerrar sessão e redirecionar para login',
      icon: 'log-out',
      shortcut: 'Sair',
      action: () => handleLogout()
    }
  ];

  return actions.filter(
    (action) => !action.route || canAccessNavigationPath(action.route, permissionCodes)
  );
});

function itemMatchesQuery(
  item: AppNavItem,
  query: string,
  groupLabel: string,
  sectionLabel: string
): boolean {
  return (
    item.label.toLowerCase().includes(query) ||
    item.path.toLowerCase().includes(query) ||
    item.aliases?.some((alias) => alias.toLowerCase().includes(query)) === true ||
    item.keywords?.some((keyword) => keyword.toLowerCase().includes(query)) === true ||
    groupLabel.toLowerCase().includes(query) ||
    sectionLabel.toLowerCase().includes(query)
  );
}

function filterGroup(
  group: AppNavGroup,
  query: string,
  permissionCodes: readonly string[] | null
): AppNavGroup | null {
  if (permissionCodes === null) return null;

  const groupMatches =
    group.label.toLowerCase().includes(query) || group.description.toLowerCase().includes(query);
  const nextSections = group.sections
    .map((section) => {
      const allowedItems = section.items.filter((item) =>
        canAccessNavigationItem(item, permissionCodes)
      );
      if (allowedItems.length === 0) return null;

      if (!query || groupMatches || section.label.toLowerCase().includes(query)) {
        return { ...section, items: allowedItems };
      }

      const items = allowedItems.filter((item) =>
        itemMatchesQuery(item, query, group.label, section.label)
      );
      return items.length > 0 ? { ...section, items } : null;
    })
    .filter((section): section is AppNavSection => Boolean(section));

  return nextSections.length > 0 ? { ...group, sections: nextSections } : null;
}

const filteredGroups = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (sessionPermissionCodes.value === null) return [];

  return navGroups
    .map((group) => filterGroup(group, query, sessionPermissionCodes.value))
    .filter((group): group is AppNavGroup => Boolean(group));
});

const filteredEnterpriseSections = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return filterGroup(enterpriseConsole, query, sessionPermissionCodes.value)?.sections ?? [];
});

const favoriteLinks = computed(() =>
  appStore.favoriteRoutes
    .filter((path) => canAccessNavigationPath(path, sessionPermissionCodes.value))
    .map((path) => findNavItem(path) ?? findMatchingNavItem(path))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
);

const recentLinks = computed(() =>
  appStore.recentRoutes
    .filter((routeItem) => canAccessNavigationPath(routeItem.path, sessionPermissionCodes.value))
    .map((routeItem) => {
      const navItem = findNavItem(routeItem.path) ?? findMatchingNavItem(routeItem.path);
      return navItem
        ? {
            ...navItem,
            path: routeItem.path,
            label: routeItem.label,
            icon: routeItem.icon ?? navItem.icon
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
);

const commandItems = computed<CommandRouteItem[]>(() => {
  const permissionCodes = sessionPermissionCodes.value;
  if (permissionCodes === null) return [];

  const mainItems = navGroups.flatMap((group) =>
    group.sections.flatMap((section) =>
      section.items
        .filter((item) => canAccessNavigationItem(item, permissionCodes))
        .map((item) => ({
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
    section.items
      .filter((item) => canAccessNavigationItem(item, permissionCodes))
      .map((item) => ({
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
const selectedCommandItemId = computed(() => {
  const actionItem = filteredActionItems.value[selectedIndex.value];
  if (actionItem) {
    return commandItemId('action', actionItem.id);
  }

  const routeIndex = selectedIndex.value - filteredActionItems.value.length;
  const routeItem = filteredRouteItems.value[routeIndex];
  return routeItem ? commandItemId('route', routeItem.path) : undefined;
});
const canGoBack = computed(() => historyPosition.value > 0);
const canGoForward = computed(() => historyPosition.value < maxHistoryPosition.value);

function readHistoryPosition() {
  if (typeof window === 'undefined') return 0;
  const state = window.history.state as { position?: number } | null;
  return typeof state?.position === 'number' ? state.position : 0;
}

function isActivePath(path: string): boolean {
  if (route.path === path || route.path.startsWith(`${path}/`)) return true;
  return findMatchingNavItem(route.path)?.path === path;
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

function commandItemId(kind: 'action' | 'route', value: string): string {
  const safeValue = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `command-palette-${kind}-${safeValue || 'item'}`;
}

function closePalette() {
  commandPaletteOpen.value = false;
  commandQuery.value = '';
  selectedIndex.value = 0;
}

function toggleSidebar() {
  if (!isCompactViewport.value) {
    appStore.toggleSidebar();
    return;
  }

  if (appStore.sidebarCollapsed) {
    const activeElement = document.activeElement;
    sidebarFocusReturnTarget.value =
      activeElement instanceof HTMLElement ? activeElement : sidebarToggleEl.value;
    appStore.toggleSidebar();
    void nextTick(() => {
      sidebarSearchInputEl.value?.focus({ preventScroll: true });
      scrollActiveSidebarItemIntoView();
    });
    return;
  }

  appStore.toggleSidebar();
  const returnTarget = sidebarFocusReturnTarget.value ?? sidebarToggleEl.value;
  sidebarFocusReturnTarget.value = null;
  void nextTick(() => {
    if (returnTarget?.isConnected) {
      returnTarget.focus({ preventScroll: true });
    }
  });
}

function navigateTo(path: string) {
  closePalette();
  if (!canAccessNavigationPath(path, sessionPermissionCodes.value)) return;
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
  if (item.route && !canAccessNavigationPath(item.route, sessionPermissionCodes.value)) return;
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
  if (!canAccessNavigationPath(favoriteTargetPath.value, sessionPermissionCodes.value)) return;
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
    } else if (isCompactViewport.value && !appStore.sidebarCollapsed) {
      event.preventDefault();
      toggleSidebar();
    } else if (searchQuery.value) {
      searchQuery.value = '';
    }
    return;
  }

  if (commandPaletteOpen.value && event.target !== commandInputEl.value) {
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
    activeItem.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reducedMotionQuery?.matches ? 'auto' : 'smooth'
    });
    syncSidebarScrollState();
  });
}

async function loadSessionPermissions() {
  const generation = ++sessionLoadGeneration;
  const token = authStore.accessToken;
  if (!token) {
    sessionPermissionCodes.value = [];
    return;
  }

  sessionPermissionCodes.value = null;
  try {
    const session = await apiRequest<SessionAccessResponse>('/auth/session');
    if (
      !layoutMounted ||
      generation !== sessionLoadGeneration ||
      authStore.accessToken !== token
    ) {
      return;
    }
    sessionPermissionCodes.value = session.access?.permissionCodes ?? [];
  } catch {
    if (
      layoutMounted &&
      generation === sessionLoadGeneration &&
      authStore.accessToken === token
    ) {
      // Persisted navigation is presentation state; fail closed if access cannot be confirmed.
      sessionPermissionCodes.value = [];
    }
  }
}

watch(
  () => authStore.accessToken,
  () => {
    if (layoutMounted) void loadSessionPermissions();
  },
  { flush: 'sync' }
);

onMounted(async () => {
  layoutMounted = true;
  window.addEventListener('keydown', onKeydown);
  compactViewportQuery?.addEventListener('change', syncCompactViewport);
  sidebarNavEl.value?.addEventListener('scroll', syncSidebarScrollState, { passive: true });
  syncHistoryPosition();
  await loadSessionPermissions();
  await nextTick();
  scrollActiveSidebarItemIntoView();
  syncSidebarScrollState();
});

onBeforeUnmount(() => {
  layoutMounted = false;
  sessionLoadGeneration += 1;
  navigationAnimationGeneration += 1;
  navigationAnimation?.cancel();
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
  () => route.path,
  async () => {
    const animationGeneration = ++navigationAnimationGeneration;
    navigationAnimation?.cancel();
    navigationAnimation = undefined;
    await nextTick();
    if (animationGeneration !== navigationAnimationGeneration) return;
    if (reducedMotionQuery?.matches) return;
    const body = workspaceBodyEl.value;
    if (!body) return;
    const styles = getComputedStyle(body);
    const distance = styles.getPropertyValue('--motion-distance-route').trim() || '6px';
    const easing =
      styles.getPropertyValue('--motion-ease-enter').trim() || 'cubic-bezier(0.2, 0.8, 0.2, 1)';
    navigationAnimation = body.animate?.(
      [
        { opacity: 0.72, transform: `translateY(${distance})` },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      { duration: motionDuration(styles.getPropertyValue('--motion-duration-route'), 160), easing }
    );
  }
);

watch(
  () => route.fullPath,
  async () => {
    // A later route must revoke a success that is still waiting for the
    // destination paint boundary; otherwise A→B→C could announce B on C.
    cancelPendingSuccessFlashActivation();
    syncHistoryPosition();
    await nextTick();
    scrollActiveSidebarItemIntoView();
    syncSidebarScrollState();
  }
);

const unsavedChanges = createUnsavedChangesCoordinator();
provide(unsavedChangesCoordinatorKey, unsavedChanges);
let logoutPending = false;

async function handleLogout() {
  if (logoutPending) return;
  logoutPending = true;
  try {
    if (!(await unsavedChanges.confirmAndDiscard())) return;
    appStore.clearWorkspaceState();
    authStore.logout();
    await router.replace('/login');
  } finally {
    logoutPending = false;
  }
}
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  top: -120px;
  left: 20px;
  z-index: 999;
  padding: 12px 16px;
  border: 1px solid var(--shell-accent, #22b8c3);
  border-radius: 10px;
  background: var(--shell-ink-deep, #081c2b);
  color: #f4fffd;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 12px 28px rgba(5, 25, 38, 0.24);
  transition: top 180ms ease;
}

.skip-link:focus {
  top: 20px;
  outline: 3px solid var(--shell-accent, #22b8c3);
  outline-offset: 3px;
}

.app-layout {
  --shell-ink-deep: #081c2b;
  --shell-ink: #102e40;
  --shell-ink-raised: #174357;
  --shell-nav-text: #d9eef0;
  --shell-nav-muted: #91b0b8;
  --shell-bg: #eef3f1;
  --shell-surface: #fbfcfa;
  --shell-surface-raised: #ffffff;
  --shell-surface-muted: #e8efed;
  --shell-border: #d5e1df;
  --shell-border-strong: #b8cbc9;
  --shell-text: #142b39;
  --shell-muted: #627580;
  --shell-accent: #22b8c3;
  --shell-accent-strong: #087c8b;
  --shell-accent-soft: #dff5f3;
  --shell-coral: #db624f;
  --shell-coral-soft: #fce8e2;
  --shell-mint: #9edfc6;
  --shell-mint-soft: #e2f5eb;
  --brand-blue: var(--shell-accent);
  --brand-blue-dark: var(--shell-accent-strong);
  --brand-blue-soft: var(--shell-accent-soft);
  --brand-blue-ink: var(--shell-accent-strong);
  --topbar-height: var(--app-topbar-height, 72px);
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: var(--app-sidebar-width, 264px) minmax(0, 1fr);
  grid-template-rows: var(--topbar-height) minmax(0, 1fr);
  overflow-x: hidden;
  background: var(--shell-bg);
  color: var(--shell-text);
  font-family: var(--font-family-sans, Inter, system-ui, sans-serif);
}

.app-layout--collapsed {
  grid-template-columns: var(--app-sidebar-collapsed-width, 72px) minmax(0, 1fr);
}

.app-layout--dark {
  color-scheme: dark;
  --shell-ink-deep: #061522;
  --shell-ink: #0c2233;
  --shell-ink-raised: #153b50;
  --shell-nav-text: #e0f3f2;
  --shell-nav-muted: #8eafb7;
  --shell-bg: #081722;
  --shell-surface: #0c2131;
  --shell-surface-raised: #112c3f;
  --shell-surface-muted: #102638;
  --shell-border: #234354;
  --shell-border-strong: #3a6070;
  --shell-text: #e4f0f1;
  --shell-muted: #9ab2b9;
  --shell-accent: #55d2d2;
  --shell-accent-strong: #8be4df;
  --shell-accent-soft: #143b45;
  --shell-coral: #ff8d76;
  --shell-coral-soft: #4a2728;
  --shell-mint: #8fddbe;
  --shell-mint-soft: #183b34;
}

.sidebar {
  position: sticky;
  top: var(--topbar-height);
  grid-column: 1;
  grid-row: 2;
  height: calc(100vh - var(--topbar-height));
  height: calc(100dvh - var(--topbar-height));
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 16px 12px 14px;
  overflow: hidden;
  border-right: 1px solid rgba(173, 221, 221, 0.14);
  background: var(--shell-ink-deep);
  color: var(--shell-nav-text);
  box-shadow: 14px 0 30px rgba(6, 21, 34, 0.08);
}

.sidebar__backdrop {
  display: none;
}

.sidebar__search {
  flex: 0 0 auto;
}

.sidebar__search-input {
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid rgba(173, 221, 221, 0.16);
  border-radius: 11px;
  outline: 0;
  background: rgba(255, 255, 255, 0.08);
  color: var(--shell-nav-text);
  box-shadow: inset 0 1px 1px rgba(4, 16, 26, 0.14);
}

.sidebar__search-input::placeholder {
  color: var(--shell-nav-muted);
}

.sidebar__search-input:focus {
  border-color: var(--shell-accent);
  box-shadow: 0 0 0 3px rgba(85, 210, 210, 0.22);
}

.app-layout--collapsed .sidebar__search {
  display: none;
}

.sidebar__content {
  position: relative;
  display: grid;
  flex: 1;
  gap: 12px;
  min-height: 0;
  padding-right: 4px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-color: rgba(173, 221, 221, 0.28) transparent;
  scrollbar-width: thin;
  transition: box-shadow 180ms ease;
}

.sidebar__content::before,
.sidebar__content::after {
  position: sticky;
  left: 0;
  right: 0;
  z-index: 2;
  display: block;
  height: 18px;
  content: '';
  pointer-events: none;
  opacity: 0;
  transition: opacity 180ms ease;
}

.sidebar__content::before {
  top: 0;
  margin-bottom: -18px;
  background: linear-gradient(180deg, var(--shell-ink-deep), transparent);
}

.sidebar__content::after {
  bottom: 0;
  margin-top: -18px;
  background: linear-gradient(0deg, var(--shell-ink-deep), transparent);
}

.sidebar__content--top-fade::before,
.sidebar__content--bottom-fade::after {
  opacity: 1;
}

.sidebar__content::-webkit-scrollbar {
  width: 6px;
}

.sidebar__content::-webkit-scrollbar-thumb {
  border: 1px solid var(--shell-ink-deep);
  border-radius: 999px;
  background: rgba(173, 221, 221, 0.28);
}

.sidebar__content::-webkit-scrollbar-thumb:hover {
  background: var(--shell-accent);
}

.sidebar__content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar__content--scrolled {
  box-shadow: inset 0 10px 16px rgba(2, 13, 22, 0.18);
}

.sidebar__nav {
  display: grid;
  gap: 8px;
  min-height: auto;
}

.sidebar__utility-stack {
  display: grid;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(173, 221, 221, 0.14);
}

.sidebar__utility-label {
  padding: 0 6px;
  color: var(--shell-nav-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sidebar__utility-group,
.sidebar__group {
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: transparent;
}

.sidebar__utility-group {
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.055);
}

.sidebar__utility-group--enterprise {
  background: rgba(34, 184, 195, 0.08);
}

.sidebar__utility-group--active {
  box-shadow: inset 3px 0 var(--shell-accent);
}

.sidebar__utility-group--active > .sidebar__utility-summary {
  background: rgba(34, 184, 195, 0.12);
}

.sidebar__utility-group--active > .sidebar__utility-summary .sidebar__eyebrow {
  color: var(--shell-mint);
}

.sidebar__utility-group--active > .sidebar__utility-summary .sidebar__microcopy {
  color: var(--shell-nav-text);
}

.sidebar__utility-summary,
.sidebar__group-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  transition: background-color 180ms ease;
}

.sidebar__group-summary {
  min-height: 48px;
  padding: 7px 9px;
}

.sidebar__utility-summary,
.sidebar__group-summary {
  list-style: none;
}

.sidebar__utility-summary::-webkit-details-marker,
.sidebar__group-summary::-webkit-details-marker {
  display: none;
}

.sidebar__group--active {
  background: rgba(34, 184, 195, 0.07);
  box-shadow: inset 3px 0 0 var(--shell-accent);
}

.sidebar__group--active > .sidebar__group-summary {
  background: rgba(34, 184, 195, 0.12);
}

.sidebar__group-summary:hover,
.sidebar__utility-summary:hover {
  background: rgba(255, 255, 255, 0.08);
}

.sidebar__group-summary-text {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sidebar__group-copy {
  display: grid;
  min-width: 0;
}

.sidebar__group-icon {
  width: 32px;
  height: 32px;
  display: inline-flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(173, 221, 221, 0.16);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.065);
  color: var(--shell-accent);
}

.sidebar__group-label {
  color: var(--shell-nav-text);
  font-size: 12px;
  font-weight: 700;
}

.sidebar__group-description {
  overflow: hidden;
  color: var(--shell-nav-muted);
  font-size: 10px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__group-chevron,
.sidebar__utility-chevron {
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--shell-nav-muted);
  transition: transform 180ms ease;
}

.sidebar__utility-group[open] > .sidebar__utility-summary .sidebar__utility-chevron,
.sidebar__group[open] > .sidebar__group-summary .sidebar__group-chevron {
  transform: rotate(180deg);
}

.sidebar__group-body,
.sidebar__enterprise-groups {
  display: grid;
  gap: 5px;
  padding: 4px 5px 8px;
}

.sidebar__section {
  display: grid;
  gap: 4px;
  padding: 4px 2px;
  border-radius: 9px;
}

.sidebar__section--active {
  background: rgba(255, 255, 255, 0.04);
}

.sidebar__section-label {
  margin: 0;
  padding: 2px 8px 3px;
  color: var(--shell-nav-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sidebar__quick-links,
.sidebar__recent-list {
  display: grid;
  gap: 3px;
}

.sidebar__quick-link,
.sidebar__recent-link,
.sidebar__link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 9px;
  color: var(--shell-nav-text);
  text-decoration: none;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}

.sidebar__quick-link:hover,
.sidebar__recent-link:hover,
.sidebar__link:hover {
  border-color: rgba(85, 210, 210, 0.2);
  background: rgba(85, 210, 210, 0.12);
  color: #f0ffff;
  text-decoration: none;
}

.sidebar__quick-link--active,
.sidebar__recent-link--active,
.sidebar__link--active {
  border-color: rgba(85, 210, 210, 0.28);
  background: rgba(85, 210, 210, 0.18);
  color: #f0ffff;
  font-weight: 600;
}

.sidebar__link--utility {
  background: rgba(5, 24, 37, 0.2);
}

.sidebar__quick-link-icon,
.sidebar__recent-link-icon,
.sidebar__link-icon {
  width: 20px;
  height: 24px;
  display: inline-flex;
  flex: 0 0 20px;
  align-items: center;
  justify-content: center;
  color: var(--shell-accent);
}

.sidebar__link-label,
.sidebar__quick-link-label,
.sidebar__recent-link-label {
  display: -webkit-box;
  min-width: 0;
  max-width: 172px;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.sidebar__panel {
  padding: 10px;
  border: 1px solid rgba(173, 221, 221, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.055);
}

.sidebar__panel--enterprise {
  border-color: rgba(85, 210, 210, 0.22);
  background: rgba(34, 184, 195, 0.12);
}

.sidebar__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.sidebar__eyebrow {
  color: var(--shell-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sidebar__microcopy {
  color: var(--shell-nav-muted);
  font-size: 12px;
  text-align: right;
}

.sidebar__ghost-btn {
  min-height: 44px;
  padding: 0 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--shell-accent);
  font-size: 12px;
  font-weight: 600;
}

.sidebar__ghost-btn:hover {
  background: rgba(85, 210, 210, 0.12);
  color: #f0ffff;
}

.workspace {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
}

.workspace__utility-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  min-width: 0;
  padding: 20px clamp(16px, 2.2vw, 30px) 16px;
  border-bottom: 1px solid var(--shell-border);
  background: var(--shell-surface);
}

.workspace__context {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.workspace__overline {
  min-width: 0;
  overflow: hidden;
  color: var(--shell-accent-strong);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1.4;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.workspace__title {
  overflow: hidden;
  color: var(--shell-text);
  font-size: clamp(19px, 2vw, 25px);
  letter-spacing: -0.025em;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace__breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  min-width: 0;
  overflow: visible;
  color: var(--shell-muted);
  font-size: 12px;
  white-space: normal;
}

.workspace__breadcrumb {
  overflow: visible;
  overflow-wrap: anywhere;
}

.workspace__breadcrumb:last-child {
  color: var(--shell-text);
  font-weight: 600;
}

.workspace__breadcrumb-separator {
  color: var(--shell-border-strong);
}

.workspace__actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 6px;
}

.workspace__history-btn,
.workspace__support-btn {
  min-height: 44px;
  border: 1px solid var(--shell-border);
  border-radius: 10px;
  background: var(--shell-surface-raised);
  color: var(--shell-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}

.workspace__history-btn {
  width: 44px;
}

.workspace__support-btn {
  gap: 7px;
  padding: 0 13px;
  color: var(--shell-accent-strong);
  font-size: 13px;
  font-weight: 700;
}

.workspace__history-btn:hover:not(:disabled),
.workspace__support-btn:hover {
  border-color: var(--shell-accent);
  background: var(--shell-accent-soft);
  color: var(--shell-accent-strong);
}

.workspace__history-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  min-height: var(--topbar-height);
  padding: 12px 20px;
  border-bottom: 1px solid var(--shell-border);
  background: var(--shell-surface);
  box-shadow: 0 8px 24px rgba(6, 25, 38, 0.06);
  backdrop-filter: blur(18px);
}

.topbar__brand-pill {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 11px;
  min-width: 0;
}

.topbar__brand-logo {
  position: relative;
  overflow: hidden;
  width: 44px;
  height: 44px;
  display: inline-flex;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(34, 184, 195, 0.34);
  border-radius: 50%;
  background: #fff;
  color: var(--shell-accent);
  box-shadow: 0 8px 18px rgba(6, 25, 38, 0.16);
}

.topbar__brand-logo img {
  position: absolute;
  width: 100%;
  height: auto;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -54%);
}

.topbar__brand-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.topbar__brand-kicker {
  color: var(--shell-accent-strong);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
}

.topbar__brand-copy strong {
  overflow: hidden;
  color: var(--shell-text);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar__brand-copy > span:not(.topbar__brand-kicker) {
  color: var(--shell-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.topbar__collapse-btn,
.topbar__icon-btn,
.topbar__logout-btn {
  min-height: 44px;
  border: 1px solid var(--shell-border);
  border-radius: 11px;
  background: var(--shell-surface-raised);
  color: var(--shell-text);
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}

.topbar__collapse-btn {
  width: 44px;
  height: 44px;
  display: inline-flex;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.topbar__collapse-icon,
.topbar__search-shell-icon,
.topbar__logout-icon {
  display: inline-flex;
}

.topbar__collapse-icon,
.topbar__search-shell-icon {
  color: var(--shell-accent-strong);
}

.topbar__collapse-label {
  display: none;
}

.topbar__search-shell {
  display: inline-flex;
  align-items: center;
  flex: 1 1 auto;
  gap: 10px;
  min-width: 0;
  min-height: 46px;
  max-width: 640px;
  padding: 0 16px;
  border: 1px solid var(--shell-border);
  border-radius: 999px;
  background: var(--shell-surface-raised);
  color: var(--shell-muted);
  text-align: left;
  box-shadow: inset 0 1px 2px rgba(6, 25, 38, 0.05);
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.topbar__search-shell:hover {
  border-color: var(--shell-accent);
  box-shadow: 0 0 0 3px rgba(34, 184, 195, 0.1);
}

.topbar__search-shell-copy {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 7px;
  min-width: 0;
}

.topbar__icon-btn {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.topbar__icon-btn--notifications,
.topbar__icon-btn--whatsapp {
  color: var(--shell-text);
}

.topbar__icon-btn--whatsapp {
  position: relative;
}

.topbar__icon-btn--whatsapp::after {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 7px;
  height: 7px;
  border: 2px solid var(--shell-surface-raised);
  border-radius: 999px;
  background: var(--shell-mint);
  content: '';
}

.topbar__profile {
  display: grid;
  align-items: center;
  min-width: 0;
  min-height: 44px;
  max-width: 190px;
  padding: 6px 13px;
  border: 1px solid var(--shell-border);
  border-radius: 12px;
  background: var(--shell-surface-muted);
}

.topbar__profile strong,
.topbar__profile span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar__profile strong {
  color: var(--shell-text);
  font-size: 13px;
}

.topbar__profile span {
  color: var(--shell-accent-strong);
  font-size: 11px;
}

.topbar__logout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  color: var(--shell-accent-strong);
  font-weight: 600;
}

.workspace__body {
  min-width: 0;
  padding: clamp(18px, 2.4vw, 32px);
  background: var(--shell-bg);
}

.workspace__success-flash {
  padding: 16px clamp(18px, 2.4vw, 32px) 0;
  background: var(--shell-bg);
}

/* The shell owns success announcements while a redirect is in flight or the
 * persisted flash is visible. This keeps a form's local success alert from
 * being announced a second time by the destination shell. */
.workspace--success-flash-pending .workspace__body :deep(.ds-alert--success) {
  display: none;
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
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--shell-border);
  border-radius: 12px;
  background: var(--shell-surface-raised);
  color: var(--shell-text);
}

.command-palette__input:focus {
  border-color: var(--shell-accent);
  outline: none;
  box-shadow: 0 0 0 3px rgba(34, 184, 195, 0.16);
}

.command-palette__hint,
.command-palette__section-label {
  color: var(--shell-muted);
}

.command-palette__hint {
  margin: 0;
  font-size: 12px;
}

.command-palette__section-label {
  padding: 4px 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.command-palette__results {
  display: grid;
  gap: 8px;
}

.command-palette__item {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 10px 13px;
  border: 1px solid var(--shell-border);
  border-radius: 12px;
  background: var(--shell-surface-raised);
  color: var(--shell-text);
  text-align: left;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.command-palette__item:hover,
.command-palette__item--selected {
  border-color: var(--shell-accent);
  background: var(--shell-accent-soft);
}

.command-palette__item--selected {
  box-shadow: inset 3px 0 0 var(--shell-accent);
}

.command-palette__item-icon {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: var(--shell-accent-soft);
  color: var(--shell-accent-strong);
}

.command-palette__item-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.command-palette__item-text strong,
.command-palette__item-text small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-palette__item-text strong {
  font-size: 14px;
}

.command-palette__item-text small {
  color: var(--shell-muted);
}

.command-palette__item-shortcut {
  color: var(--shell-muted);
  font-size: 11px;
}

.command-palette__empty {
  padding: 16px;
  border: 1px dashed var(--shell-border-strong);
  border-radius: 14px;
  color: var(--shell-muted);
  text-align: center;
}

.topbar button:focus-visible,
.sidebar a:focus-visible,
.sidebar summary:focus-visible,
.sidebar button:focus-visible,
.workspace button:focus-visible,
.skip-link:focus-visible {
  outline: 3px solid var(--shell-accent);
  outline-offset: 2px;
}

.topbar__collapse-btn:hover,
.topbar__icon-btn:hover,
.topbar__logout-btn:hover {
  border-color: var(--shell-accent);
  background: var(--shell-accent-soft);
  color: var(--shell-accent-strong);
}

@media (max-width: 1200px) {
  .app-layout {
    grid-template-columns: var(--app-sidebar-width, 248px) minmax(0, 1fr);
  }

  .app-layout--collapsed {
    grid-template-columns: var(--app-sidebar-collapsed-width, 72px) minmax(0, 1fr);
  }

  .app-layout--collapsed .sidebar__search,
  .app-layout--collapsed .sidebar__group-copy,
  .app-layout--collapsed .sidebar__link-label,
  .app-layout--collapsed .sidebar__quick-link-label,
  .app-layout--collapsed .sidebar__recent-link-label,
  .app-layout--collapsed .sidebar__microcopy,
  .app-layout--collapsed .sidebar__section-label,
  .app-layout--collapsed .sidebar__ghost-btn,
  .app-layout--collapsed .sidebar__utility-label {
    display: none;
  }

  .app-layout--collapsed .sidebar__group-summary {
    justify-content: center;
    padding-inline: 5px;
  }

  .app-layout--collapsed .sidebar__group-summary-text {
    justify-content: center;
    width: 100%;
  }

  .app-layout--collapsed .sidebar__group-icon {
    width: 36px;
    height: 36px;
    flex-basis: 36px;
  }

  .app-layout--collapsed .sidebar__utility-summary {
    justify-content: center;
    padding-inline: 4px;
  }

  .app-layout--collapsed .sidebar__eyebrow {
    max-width: 100%;
    overflow: hidden;
    font-size: 9px;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .app-layout--collapsed .sidebar__utility-chevron {
    display: none;
  }
}

@media (max-width: 980px) {
  .app-layout,
  .app-layout--collapsed {
    --topbar-height: 129px;
  }

  .topbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-areas:
      'brand collapse actions'
      'search search search';
    height: auto;
    min-height: var(--topbar-height);
    padding: 12px 16px;
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
    --topbar-height: 129px;
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 100dvh;
  }

  .topbar {
    grid-column: 1;
    grid-row: 1;
    z-index: 90;
    position: sticky;
  }

  .topbar__brand-copy strong {
    max-width: 180px;
  }

  .topbar__brand-copy > span {
    display: none;
  }

  .topbar__actions {
    gap: 5px;
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
    width: min(88vw, 344px);
    height: auto;
    max-height: none;
    transform: translateX(0);
    transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow: 18px 0 42px rgba(2, 13, 22, 0.26);
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
    background: rgba(3, 16, 27, 0.64);
    cursor: pointer;
  }

  .app-layout--collapsed .sidebar__backdrop {
    display: none;
  }

  .sidebar__search,
  .sidebar__link-label,
  .sidebar__quick-link-label,
  .sidebar__recent-link-label,
  .sidebar__microcopy,
  .sidebar__section-label,
  .sidebar__ghost-btn,
  .sidebar__utility-label {
    display: initial;
  }

  .sidebar__group-copy {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .workspace {
    grid-column: 1;
    grid-row: 2;
    min-height: calc(100dvh - var(--topbar-height));
  }

  .workspace__utility-bar {
    align-items: flex-start;
    padding: 16px 12px 13px;
  }

  .workspace__body {
    padding: 16px 12px 24px;
  }
}

@media (max-width: 600px) {
  .app-layout,
  .app-layout--collapsed {
    --topbar-height: 113px;
  }

  .topbar {
    gap: 8px;
    padding: 8px 12px;
  }

  .topbar__brand-logo,
  .topbar__collapse-btn,
  .topbar__icon-btn {
    width: 44px;
    height: 44px;
  }

  .topbar__brand-logo {
    flex-basis: 44px;
  }

  .topbar__brand-copy {
    display: none;
  }

  .topbar__profile {
    max-width: 108px;
    min-height: 44px;
    padding-inline: 8px;
  }

  .topbar__profile span {
    display: none;
  }

  .topbar__logout-btn {
    width: 44px;
    min-height: 44px;
    padding: 0;
  }

  .topbar__logout-label,
  .workspace__breadcrumbs,
  .workspace__support-btn span {
    display: none;
  }

  .topbar__search-shell {
    min-height: 44px;
    padding-inline: 12px;
  }

  .workspace__utility-bar {
    gap: 10px;
  }

  .workspace__overline {
    font-size: 9px;
  }

  .workspace__title {
    font-size: 18px;
  }

  .workspace__actions {
    gap: 4px;
  }

  .workspace__support-btn {
    width: 44px;
    padding: 0;
  }

  .sidebar__group-summary {
    align-items: flex-start;
  }

  .sidebar__group-copy {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }

  .sidebar__group-description {
    display: -webkit-box;
    overflow: hidden;
    white-space: normal;
    text-overflow: clip;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}

@media (max-width: 360px) {
  .topbar {
    gap: 6px;
    padding-inline: 8px;
  }

  .topbar__actions {
    gap: 4px;
  }

  /* Keep the compact shell usable at 320px. These secondary channels remain
     available through the command palette and the enterprise utility area. */
  .topbar__icon-btn--notifications,
  .topbar__icon-btn--whatsapp {
    display: none;
  }

  .topbar__brand-logo,
  .topbar__collapse-btn,
  .topbar__icon-btn,
  .topbar__logout-btn {
    width: var(--touch-min, 44px);
    height: var(--touch-min, 44px);
  }

  .topbar__brand-logo {
    flex-basis: var(--touch-min, 44px);
  }

  .topbar__profile {
    max-width: 64px;
    padding-inline: 6px;
  }

  .topbar__logout-btn {
    min-height: var(--touch-min, 44px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-layout *,
  .app-layout *::before,
  .app-layout *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
/* The page header owns its title; retain the utility title for headerless pages. */
.workspace:has(.app-page-header) .workspace__title {
  display: none;
}
.workspace:has(.app-page-header) .workspace__utility-bar {
  align-items: center;
  padding-block: 8px;
}
.workspace:has(.app-page-header) .workspace__breadcrumbs {
  display: flex;
}
.workspace--page-header .workspace__title {
  display: none;
}
.workspace--page-header .workspace__utility-bar {
  align-items: center;
  padding-block: 8px;
}
.workspace--page-header .workspace__breadcrumbs {
  display: flex;
}

@media (max-width: 260px) {
  /* At extreme zoom-proxy widths the action rail already consumes the useful
     horizontal space. Keep the overline as the compact context and remove the
     optional breadcrumb row instead of allowing one-character wrapping. */
  .workspace__breadcrumbs,
  .workspace:has(.app-page-header) .workspace__breadcrumbs,
  .workspace--page-header .workspace__breadcrumbs {
    display: none;
  }

  .workspace__utility-bar {
    gap: 6px;
    padding-inline: 8px;
  }

  .workspace__context {
    flex: 1 1 auto;
    min-width: 0;
  }
}
</style>
