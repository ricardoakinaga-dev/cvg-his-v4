import { defineStore } from 'pinia';

const THEME_STORAGE_KEY = 'cvg-his-v2:theme';

function loadTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* noop */
  }
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: loadTheme() as 'light' | 'dark'
  }),

  actions: {
    toggle() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      this.apply();
    },

    set(theme: 'light' | 'dark') {
      this.theme = theme;
      this.apply();
    },

    apply() {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, this.theme);
      } catch {
        /* noop */
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', this.theme);
      }
    }
  }
});
