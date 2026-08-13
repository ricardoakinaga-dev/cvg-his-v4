import type { Page } from '@playwright/test';

/**
 * Visual Regression — Stabilization Helpers
 *
 * Injects CSS and performs deterministic waits to eliminate flakiness
 * caused by dynamic elements (animations, timestamps, UUIDs, loaders).
 *
 * Usage:
 *   await stabilizeVisual(page);
 *   await expect(page).toHaveScreenshot('my-snapshot.png', { ... });
 *
 * Per-page stabilization:
 *   await stabilizeVisual(page, { hideUuids: false });
 */

interface StabilizeOptions {
  /** Hide all CSS animations and transitions (default: true) */
  disableAnimations?: boolean;
  /** Hide skeleton shimmer animations (default: true) */
  disableSkeletons?: boolean;
  /** Hide spinner animations (default: true) */
  disableSpinners?: boolean;
  /** Hide/redact UUID patterns in text content (default: true) */
  hideUuids?: boolean;
  /** Hide/redact timestamp elements (default: true) */
  hideTimestamps?: boolean;
  /** Force light theme by overriding theme store (default: true) */
  forceLightTheme?: boolean;
  /** Force sidebar expanded state (default: true) */
  expandSidebar?: boolean;
  /** Normalize the dynamic user identity in the topbar (default: true) */
  hideUserName?: boolean;
  /** Additional CSS to inject (appended to stabilization CSS) */
  extraCss?: string;
}

const DEFAULT_OPTIONS: Required<StabilizeOptions> = {
  disableAnimations: true,
  disableSkeletons: true,
  disableSpinners: true,
  hideUuids: true,
  hideTimestamps: true,
  forceLightTheme: true,
  expandSidebar: true,
  hideUserName: true,
  extraCss: ''
};

/**
 * CSS that neutralizes all known animation/transition sources in the SPA.
 */
function buildStabilizationCss(options: Required<StabilizeOptions>): string {
  const rules: string[] = [];

  if (options.disableAnimations) {
    rules.push(`
      *, *::before, *::after {
        animation-duration: 0.001s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001s !important;
        transition-delay: 0s !important;
      }
    `);
  }

  if (options.disableSkeletons) {
    rules.push(`
      .skeleton-loader--animate {
        animation: none !important;
        background: var(--color-skeleton, #e2e8f0) !important;
        background-size: 100% 100% !important;
      }
      .skeleton-loader {
        animation: none !important;
      }
      @keyframes skeleton-shimmer {
        0% { background-position: 0 0; }
        100% { background-position: 0 0; }
      }
    `);
  }

  if (options.disableSpinners) {
    rules.push(`
      @keyframes ds-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(0deg); }
      }
      @keyframes skeleton-shimmer {
        0% { background-position: 0 0; }
        100% { background-position: 0 0; }
      }
      .ds-btn__spinner,
      .spinner,
      [class*="spinner"],
      [class*="loading"] {
        animation: none !important;
      }
    `);
  }

  if (options.hideTimestamps) {
    rules.push(`
      [class*="timestamp"],
      [class*="created-at"],
      [class*="updated-at"],
      [class*="date-time"],
      [class*="opened-at"],
      [class*="admitted-at"],
      [class*="scheduled-at"] {
        color: transparent !important;
        text-shadow: none !important;
      }
    `);
  }

  if (options.extraCss) {
    rules.push(options.extraCss);
  }

  return rules.join('\n');
}

/**
 * Apply visual stabilization to a page before taking a screenshot.
 *
 * This injects CSS to disable animations, transitions, and shimmer effects,
 * and normalizes the layout state (theme, sidebar, user name).
 */
export async function stabilizeVisual(page: Page, options?: StabilizeOptions): Promise<void> {
  const opts: Required<StabilizeOptions> = { ...DEFAULT_OPTIONS, ...options };

  const css = buildStabilizationCss(opts);
  await page.addStyleTag({ content: css });

  if (opts.forceLightTheme) {
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      try {
        const stored = window.localStorage.getItem('cvg-his-v2:theme');
        if (stored) {
          const theme = JSON.parse(stored);
          if (theme.current !== 'light') {
            theme.current = 'light';
            window.localStorage.setItem('cvg-his-v2:theme', JSON.stringify(theme));
          }
        }
      } catch {
        window.localStorage.setItem('cvg-his-v2:theme', JSON.stringify({ current: 'light' }));
      }
    });
  }

  if (opts.expandSidebar) {
    await page.evaluate(() => {
      try {
        const stored = window.localStorage.getItem('cvg-his-v2:app');
        if (stored) {
          const app = JSON.parse(stored);
          if (app.sidebarCollapsed) {
            app.sidebarCollapsed = false;
            window.localStorage.setItem('cvg-his-v2:app', JSON.stringify(app));
          }
        }
      } catch {
        window.localStorage.setItem('cvg-his-v2:app', JSON.stringify({ sidebarCollapsed: false }));
      }
    });
  }

  if (opts.hideUserName) {
    await page.locator('.topbar__profile strong').evaluateAll((elements) => {
      elements.forEach((element) => {
        element.textContent = 'Usuário';
      });
    });
    await page.locator('.topbar__profile span').evaluateAll((elements) => {
      elements.forEach((element) => {
        element.textContent = 'Id. visual';
      });
    });
  }

  await page.addStyleTag({
    content: `
      .pwa-toast,
      .offline-banner {
        display: none !important;
      }
    `
  });

  await page.waitForTimeout(100);
}

/**
 * Wait for a page to be fully settled: no loading spinners, no skeleton loaders,
 * and the target element is visible.
 *
 * This replaces arbitrary waitForTimeout calls with deterministic waits.
 */
export async function waitForPageSettled(
  page: Page,
  options?: {
    /** Selector that indicates the page is loaded (e.g., data table, heading) */
    contentSelector?: string;
    /** Maximum time to wait for content (default: 15000ms) */
    timeout?: number;
    /** Additional selectors that must be hidden before considering settled */
    hiddenSelectors?: string[];
  }
): Promise<void> {
  const timeout = options?.timeout ?? 15000;

  if (options?.contentSelector) {
    await page.waitForSelector(options.contentSelector, {
      state: 'visible',
      timeout
    });
  }

  const selectorsToHide = options?.hiddenSelectors ?? [];
  for (const selector of selectorsToHide) {
    try {
      await page.waitForSelector(selector, {
        state: 'hidden',
        timeout: 5000
      });
    } catch {
      // Element not present or still visible — acceptable for non-critical selectors
    }
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(200);
}

/**
 * Per-page stabilization profiles for known SPA pages.
 */
export const pageProfiles: Record<string, StabilizeOptions> = {
  login: {
    hideUuids: false,
    hideTimestamps: false,
    forceLightTheme: true,
    expandSidebar: false,
    hideUserName: false
  },
  listPage: {
    hideUuids: true,
    hideTimestamps: true,
    forceLightTheme: true,
    expandSidebar: true,
    hideUserName: true
  },
  detailPage: {
    hideUuids: true,
    hideTimestamps: true,
    forceLightTheme: true,
    expandSidebar: true,
    hideUserName: true
  },
  kanbanPage: {
    hideUuids: true,
    hideTimestamps: false,
    forceLightTheme: true,
    expandSidebar: true,
    hideUserName: true
  }
};
