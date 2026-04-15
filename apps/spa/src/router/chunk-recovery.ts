const CHUNK_RECOVERY_STORAGE_KEY = 'cvg-his-v2:spa:chunk-recovery-target';

const DYNAMIC_IMPORT_FAILURE_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'css chunk load failed',
  'loading css chunk'
];

interface RouteLike {
  readonly fullPath?: string;
}

interface BrowserLocationLike {
  readonly href: string;
  assign(url: string): void;
}

interface BrowserLike {
  readonly location: BrowserLocationLike;
  readonly sessionStorage?: Storage;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }

  return '';
}

function getSessionStorage(browser?: BrowserLike): Storage | undefined {
  try {
    return browser?.sessionStorage;
  } catch {
    return undefined;
  }
}

function getBrowser(): BrowserLike | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window;
}

export function isDynamicImportFailure(error: unknown): boolean {
  const message = getErrorMessage(error).trim().toLowerCase();
  return DYNAMIC_IMPORT_FAILURE_PATTERNS.some((pattern) => message.includes(pattern));
}

export function clearChunkRecoveryTarget(browser = getBrowser()): void {
  const storage = getSessionStorage(browser);

  try {
    storage?.removeItem(CHUNK_RECOVERY_STORAGE_KEY);
  } catch {
    // Ignore storage failures and let navigation proceed.
  }
}

export function recoverChunkLoadError(
  error: unknown,
  to?: RouteLike,
  browser = getBrowser()
): boolean {
  if (!isDynamicImportFailure(error) || !browser) {
    return false;
  }

  const target = to?.fullPath?.trim() || browser.location.href;
  const storage = getSessionStorage(browser);

  try {
    if (storage?.getItem(CHUNK_RECOVERY_STORAGE_KEY) === target) {
      storage.removeItem(CHUNK_RECOVERY_STORAGE_KEY);
      return false;
    }

    storage?.setItem(CHUNK_RECOVERY_STORAGE_KEY, target);
  } catch {
    // Ignore storage failures and still attempt a hard reload.
  }

  browser.location.assign(target);
  return true;
}
