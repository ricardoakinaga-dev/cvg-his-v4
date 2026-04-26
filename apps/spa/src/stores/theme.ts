import { defineStore } from 'pinia';

export const THEME_STORAGE_KEY = 'cvg-his-v2:theme';
const LIGHT_THEME_COLOR = '#0ea5e9';
const DARK_THEME_COLOR = '#0f172a';

export type ThemeMode = 'light' | 'dark';

export function detectSystemTheme(): ThemeMode {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

export function resolveInitialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* noop */
  }
  return detectSystemTheme();
}

export function getThemeMetaColor(theme: ThemeMode): string {
  return theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
}

function updateThemeMeta(theme: ThemeMode) {
  if (typeof document === 'undefined') {
    return;
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', getThemeMetaColor(theme));
  }
}

export function applyTheme(theme: ThemeMode, persist = true) {
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* noop */
    }
  }

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    updateThemeMeta(theme);
  }
}

export function bootstrapTheme() {
  const theme = resolveInitialTheme();
  applyTheme(theme);
  return theme;
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: resolveInitialTheme()
  }),

  actions: {
    toggle() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      applyTheme(this.theme);
    },

    set(theme: ThemeMode) {
      this.theme = theme;
      applyTheme(this.theme);
    }
  }
});
