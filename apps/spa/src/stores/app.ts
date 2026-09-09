import { defineStore } from 'pinia';

interface RecentRoute {
  path: string;
  label: string;
  icon?: string;
}

const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: 'cvg-his-v2:spa:sidebar-collapsed',
  RECENT_ROUTES: 'cvg-his-v2:spa:recent-routes',
  FAVORITE_ROUTES: 'cvg-his-v2:spa:favorite-routes'
} as const;

function workspaceStorageKey(key: string, identity: string | null): string {
  return identity ? `${key}:workspace:${encodeURIComponent(identity)}` : key;
}

function hasStorageValue(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: (() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
        if (stored === 'true') return true;
        if (stored === 'false') return false;
        return window.matchMedia?.('(max-width: 860px)').matches ?? false;
      } catch {
        return false;
      }
    })(),
    loading: false,
    pageTitle: '',
    workspaceIdentity: null as string | null,
    recentRoutes: [] as RecentRoute[],
    favoriteRoutes: [] as string[]
  }),

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      try {
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(this.sidebarCollapsed));
      } catch {
        /* noop */
      }
    },

    setLoading(loading: boolean) {
      this.loading = loading;
    },

    setPageTitle(title: string) {
      this.pageTitle = title;
    },

    setWorkspaceIdentity(identity: string | null) {
      if (this.workspaceIdentity === identity) return;
      this.workspaceIdentity = identity;

      if (!identity) {
        this.recentRoutes = [];
        this.favoriteRoutes = [];
        return;
      }

      const recentKey = workspaceStorageKey(STORAGE_KEYS.RECENT_ROUTES, identity);
      const favoriteKey = workspaceStorageKey(STORAGE_KEYS.FAVORITE_ROUTES, identity);
      const hasScopedRecent = hasStorageValue(recentKey);
      const hasScopedFavorites = hasStorageValue(favoriteKey);
      const legacyRecent = readJson<RecentRoute[]>(STORAGE_KEYS.RECENT_ROUTES, []);
      const legacyFavorites = readJson<string[]>(STORAGE_KEYS.FAVORITE_ROUTES, []);

      this.recentRoutes = hasScopedRecent
        ? readJson<RecentRoute[]>(recentKey, [])
        : legacyRecent;
      this.favoriteRoutes = hasScopedFavorites
        ? readJson<string[]>(favoriteKey, [])
        : legacyFavorites;

      // One-time migration from the pre-workspace global keys. Removing the
      // legacy copy prevents a later user on the same browser from inheriting
      // the previous user's route identifiers.
      if (!hasScopedRecent && legacyRecent.length > 0) writeJson(recentKey, legacyRecent);
      if (!hasScopedFavorites && legacyFavorites.length > 0) {
        writeJson(favoriteKey, legacyFavorites);
      }
      if (!hasScopedRecent || !hasScopedFavorites) {
        try {
          localStorage.removeItem(STORAGE_KEYS.RECENT_ROUTES);
          localStorage.removeItem(STORAGE_KEYS.FAVORITE_ROUTES);
        } catch {
          /* noop */
        }
      }
    },

    clearWorkspaceState() {
      this.recentRoutes = [];
      this.favoriteRoutes = [];
    },

    addRecentRoute(route: RecentRoute) {
      const next = [route, ...this.recentRoutes.filter((item) => item.path !== route.path)].slice(
        0,
        6
      );
      this.recentRoutes = next;
      writeJson(workspaceStorageKey(STORAGE_KEYS.RECENT_ROUTES, this.workspaceIdentity), next);
    },

    toggleFavoriteRoute(path: string) {
      if (this.favoriteRoutes.includes(path)) {
        this.favoriteRoutes = this.favoriteRoutes.filter((item) => item !== path);
      } else {
        this.favoriteRoutes = [path, ...this.favoriteRoutes];
      }
      writeJson(
        workspaceStorageKey(STORAGE_KEYS.FAVORITE_ROUTES, this.workspaceIdentity),
        this.favoriteRoutes
      );
    },

    isFavoriteRoute(path: string) {
      return this.favoriteRoutes.includes(path);
    },

    clearRecentRoutes() {
      this.recentRoutes = [];
      writeJson(workspaceStorageKey(STORAGE_KEYS.RECENT_ROUTES, this.workspaceIdentity), []);
    }
  }
});
