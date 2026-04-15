import { describe, expect, it, vi } from 'vitest';

import {
  clearChunkRecoveryTarget,
  isDynamicImportFailure,
  recoverChunkLoadError
} from './chunk-recovery';

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    }
  } as Storage;
}

function createBrowser() {
  const assign = vi.fn();

  return {
    location: {
      href: 'https://his.centroveterinarioguarapiranga.com/dashboard',
      assign
    },
    sessionStorage: createStorage(),
    assign
  };
}

describe('chunk recovery', () => {
  it('detects dynamic import failures emitted by browsers', () => {
    expect(isDynamicImportFailure(new Error('Failed to fetch dynamically imported module'))).toBe(true);
    expect(isDynamicImportFailure(new Error('Importing a module script failed.'))).toBe(true);
    expect(isDynamicImportFailure(new Error('Random API failure'))).toBe(false);
  });

  it('reloads the target route once when a lazy chunk fails to load', () => {
    const browser = createBrowser();

    const recovered = recoverChunkLoadError(
      new Error('Failed to fetch dynamically imported module'),
      { fullPath: '/owners' },
      browser
    );

    expect(recovered).toBe(true);
    expect(browser.sessionStorage.getItem('cvg-his-v2:spa:chunk-recovery-target')).toBe('/owners');
    expect(browser.assign).toHaveBeenCalledWith('/owners');
  });

  it('avoids an infinite reload loop for the same failing route', () => {
    const browser = createBrowser();

    browser.sessionStorage.setItem('cvg-his-v2:spa:chunk-recovery-target', '/owners');

    const recovered = recoverChunkLoadError(
      new Error('Failed to fetch dynamically imported module'),
      { fullPath: '/owners' },
      browser
    );

    expect(recovered).toBe(false);
    expect(browser.assign).not.toHaveBeenCalled();
    expect(browser.sessionStorage.getItem('cvg-his-v2:spa:chunk-recovery-target')).toBeNull();
  });

  it('clears the recovery marker after a successful navigation', () => {
    const browser = createBrowser();

    browser.sessionStorage.setItem('cvg-his-v2:spa:chunk-recovery-target', '/owners');
    clearChunkRecoveryTarget(browser);

    expect(browser.sessionStorage.getItem('cvg-his-v2:spa:chunk-recovery-target')).toBeNull();
  });
});
