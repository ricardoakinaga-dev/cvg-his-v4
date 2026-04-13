import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  getThemeMetaColor,
  bootstrapTheme,
  resolveInitialTheme,
  useThemeStore
} from '../theme';

function mockMatchMedia(matches: boolean) {
  const implementation = vi.fn().mockImplementation((query: string) => ({
    matches: matches && query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: implementation
  });

  return implementation;
}

function resetDocument() {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = '';
  document.head.innerHTML = '';

  const meta = document.createElement('meta');
  meta.setAttribute('name', 'theme-color');
  meta.setAttribute('content', '#1e40af');
  document.head.appendChild(meta);
}

describe('theme store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    resetDocument();
  });

  it('prefers the stored theme over the system preference', () => {
    mockMatchMedia(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    expect(resolveInitialTheme()).toBe('light');
  });

  it('falls back to the system preference when there is no stored theme', () => {
    mockMatchMedia(true);

    expect(resolveInitialTheme()).toBe('dark');
  });

  it('bootstraps the initial theme before mount', () => {
    mockMatchMedia(false);

    expect(bootstrapTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#1e40af'
    );
  });

  it('applies a dark theme to the document and persists it', () => {
    mockMatchMedia(false);

    applyTheme('dark');

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#0f172a'
    );
  });

  it('resolves the theme-color meta value for both modes', () => {
    expect(getThemeMetaColor('light')).toBe('#1e40af');
    expect(getThemeMetaColor('dark')).toBe('#0f172a');
  });

  it('toggles between light and dark through the store', () => {
    mockMatchMedia(false);

    const themeStore = useThemeStore();

    expect(themeStore.theme).toBe('light');

    themeStore.toggle();

    expect(themeStore.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});
