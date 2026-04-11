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
        return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
      } catch {
        return false;
      }
    })(),
    loading: false,
    pageTitle: '',
    recentRoutes: readJson<RecentRoute[]>(STORAGE_KEYS.RECENT_ROUTES, []),
    favoriteRoutes: readJson<string[]>(STORAGE_KEYS.FAVORITE_ROUTES, [])
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

    addRecentRoute(route: RecentRoute) {
      const next = [route, ...this.recentRoutes.filter((item) => item.path !== route.path)].slice(
        0,
        6
      );
      this.recentRoutes = next;
      writeJson(STORAGE_KEYS.RECENT_ROUTES, next);
    },

    toggleFavoriteRoute(path: string) {
      if (this.favoriteRoutes.includes(path)) {
        this.favoriteRoutes = this.favoriteRoutes.filter((item) => item !== path);
      } else {
        this.favoriteRoutes = [path, ...this.favoriteRoutes];
      }
      writeJson(STORAGE_KEYS.FAVORITE_ROUTES, this.favoriteRoutes);
    },

    isFavoriteRoute(path: string) {
      return this.favoriteRoutes.includes(path);
    },

    clearRecentRoutes() {
      this.recentRoutes = [];
      writeJson(STORAGE_KEYS.RECENT_ROUTES, []);
    }
  }
});
