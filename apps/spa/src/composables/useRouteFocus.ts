import { nextTick, onBeforeUnmount, type Ref } from 'vue';
import { useRouter, type Router, type RouteLocationNormalized } from 'vue-router';

const focusClaims = new WeakMap<Router, WeakMap<object, HTMLElement>>();

/** A guard can own focus for this exact navigation, regardless of hook order.
 * Redirects are new attempts and require their own claim. No field data is stored.
 */
export function preserveNavigationFocus(router: Router, to: RouteLocationNormalized, target: HTMLElement) {
  if (!target.isConnected || !isAvailable(target) || target.matches(':disabled, [aria-disabled="true"]')) return false;
  target.focus({ preventScroll: true });
  if (document.activeElement !== target) return false;
  let claims = focusClaims.get(router);
  if (!claims) focusClaims.set(router, claims = new WeakMap());
  claims.set(to, target);
  return true;
}

function isAvailable(element: HTMLElement) {
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    if (node.hidden || node.hasAttribute('inert') || node.getAttribute('aria-hidden') === 'true') return false;
    if (node.tagName === 'DETAILS' && !node.hasAttribute('open') && node !== element) {
      const summary = [...node.children].find(child => child.tagName === 'SUMMARY');
      if (!summary?.contains(element)) return false;
    }
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  }
  return true;
}

const actionable = 'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]';
type FocusIdentity = { kind: 'id' | 'data-focus-key' | 'href'; value: string; occurrence: number };
type ScrollSnapshot = {
  key?: string;
  occurrence: number;
  keyOccurrence: number;
  left: number;
  top: number;
};
type PendingRestore = {
  generation: number;
  returnFocus?: FocusIdentity;
  returnScroll: ScrollSnapshot[];
  activeAtNavigation: Element | null;
  claimedTarget?: HTMLElement;
  waitUntil?: number;
};

const localScrollSelector = '[data-scroll-container="local"]';
const pendingRenderWaitMs = 1000;

function normalizeScrollKey(value: string | null | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

function scrollRegionKey(region: HTMLElement): string | undefined {
  const explicitKey = normalizeScrollKey(region.getAttribute('data-scroll-key'));
  if (explicitKey) return explicitKey;

  // DataTable exposes an explicit key when it has a caption. For the many
  // legacy tables without one, use the stable semantic title of their card as
  // a non-visual fallback so two tables can still be restored after reorder.
  const cardTitle = region.closest<HTMLElement>('.ds-card')
    ?.querySelector<HTMLElement>('.ds-card__header .ds-card__title');
  return normalizeScrollKey(cardTitle?.textContent);
}

function identifyFocus(body: HTMLElement, element: HTMLElement): FocusIdentity | undefined {
  if (!body.contains(element) || !element.matches(actionable)) return;
  for (const kind of ['id', 'data-focus-key', 'href'] as const) {
    const value = element.getAttribute(kind);
    if (!value || (kind === 'href' && element.tagName !== 'A')) continue;
    const matches = [...body.querySelectorAll<HTMLElement>(kind === 'href' ? 'a[href]' : `[${kind}]`)]
      .filter(candidate => candidate.getAttribute(kind) === value);
    return { kind, value, occurrence: matches.indexOf(element) };
  }
}

function resolveFocus(body: HTMLElement, identity: FocusIdentity | undefined) {
  if (!identity) return;
  const candidate = [...body.querySelectorAll<HTMLElement>(identity.kind === 'href' ? 'a[href]' : `[${identity.kind}]`)]
    .filter(element => element.getAttribute(identity.kind) === identity.value)[identity.occurrence];
  if (candidate?.matches(actionable) && !candidate.matches(':disabled, [aria-disabled="true"]') && isAvailable(candidate)) return candidate;
}

function resolveScrollRegions(body: HTMLElement, snapshots: ScrollSnapshot[]) {
  const regions = [...body.querySelectorAll<HTMLElement>(localScrollSelector)];
  let allRegionsAvailable = true;
  for (const snapshot of snapshots) {
    const keyedRegions = snapshot.key
      ? regions.filter(region => scrollRegionKey(region) === snapshot.key)
      : [];
    const region = snapshot.key
      ? keyedRegions[snapshot.keyOccurrence]
      : regions[snapshot.occurrence];
    if (!region) {
      allRegionsAvailable = false;
      continue;
    }
    region.scrollLeft = snapshot.left;
    region.scrollTop = snapshot.top;
  }
  return allRegionsAvailable;
}

function resetLocalScrollRegions(body: HTMLElement | null) {
  if (!body?.isConnected) return;
  for (const region of body.querySelectorAll<HTMLElement>(localScrollSelector)) {
    region.scrollLeft = 0;
    region.scrollTop = 0;
  }
}

function hasPendingRender(body: HTMLElement) {
  // A state message can be a stable terminal result (empty, error, or
  // permission denied). Only explicit busy/loading markers are safe reasons
  // to defer the bounded focus fallback.
  return body.matches('[aria-busy="true"], .data-table-loading') ||
    body.querySelector('[aria-busy="true"], .data-table-loading') !== null;
}

/** Orient successful page navigation without interfering with scroll restoration or dialogs. */
export function useRouteFocus(workspaceBody: Ref<HTMLElement | null>) {
  const router = useRouter();
  let generation = 0;
  let frame: number | undefined;
  let restoreTabIndex: (() => void) | undefined;
  const history = router.options.history;
  const entries = new Map<number, FocusIdentity>();
  const scrollEntries = new Map<number, ScrollSnapshot[]>();
  const navigationFocus = new WeakMap<object, Element | null>();
  const readPosition = () => typeof history.state.position === 'number' ? history.state.position : undefined;
  let position = readPosition() ?? 0;
  let pendingPop: { path: string; position: number } | undefined;
  let restoreObserver: MutationObserver | undefined;
  let restoreFallbackTimer: number | undefined;
  let pendingRestore: PendingRestore | undefined;

  function captureDeparture() {
    // Clear the previous snapshot even when the active element has no stable
    // identity. Otherwise a later Back could resurrect an unrelated control.
    entries.delete(position);
    scrollEntries.delete(position);
    const body = workspaceBody.value;
    if (!body?.isConnected) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      const identity = identifyFocus(body, active);
      if (identity) entries.set(position, identity);
    }
    const keyOccurrences = new Map<string, number>();
    const scrollSnapshots = [...body.querySelectorAll<HTMLElement>(localScrollSelector)]
      .map((region, occurrence) => {
        const key = scrollRegionKey(region);
        const keyOccurrence = key ? keyOccurrences.get(key) ?? 0 : 0;
        if (key) keyOccurrences.set(key, keyOccurrence + 1);
        return { key, occurrence, keyOccurrence, left: region.scrollLeft, top: region.scrollTop };
      });
    if (scrollSnapshots.length) scrollEntries.set(position, scrollSnapshots);
    // Keep only structural focus identities in memory, never field values or text.
    if (entries.size > 50) entries.delete(entries.keys().next().value!);
    if (scrollEntries.size > 50) scrollEntries.delete(scrollEntries.keys().next().value!);
  }

  function clearRestoreObserver() {
    restoreObserver?.disconnect();
    restoreObserver = undefined;
  }

  function clearRestoreFallbackTimer() {
    if (restoreFallbackTimer !== undefined) window.clearTimeout(restoreFallbackTimer);
    restoreFallbackTimer = undefined;
  }

  function finishRestore() {
    clearRestoreObserver();
    clearRestoreFallbackTimer();
    pendingRestore = undefined;
  }

  function scheduleRestoreFrame() {
    if (frame !== undefined) return;
    const scheduledGeneration = generation;
    frame = window.requestAnimationFrame(() => {
      frame = undefined;
      if (scheduledGeneration !== generation) return;
      runRestore();
    });
  }

  function watchForRenderedReturnTarget(body: HTMLElement, task: PendingRestore) {
    if (restoreObserver || typeof MutationObserver === 'undefined') return false;
    restoreObserver = new MutationObserver(() => {
      if (pendingRestore !== task || task.generation !== generation) return;
      scheduleRestoreFrame();
    });
    restoreObserver.observe(body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'class', 'disabled', 'hidden', 'aria-disabled', 'style', 'data-scroll-key']
    });
    return true;
  }

  function scheduleRestoreFallback(task: PendingRestore) {
    task.waitUntil ??= Date.now() + pendingRenderWaitMs;
    if (restoreFallbackTimer !== undefined) return;
    restoreFallbackTimer = window.setTimeout(() => {
      restoreFallbackTimer = undefined;
      if (pendingRestore !== task || task.generation !== generation) return;
      scheduleRestoreFrame();
    }, Math.max(0, task.waitUntil - Date.now()));
  }

  function runRestore() {
    const task = pendingRestore;
    if (!task || task.generation !== generation) return;
    const body = workspaceBody.value;
    if (!body?.isConnected || !isAvailable(body)) {
      finishRestore();
      return;
    }

    if (task.claimedTarget?.isConnected && document.activeElement === task.claimedTarget &&
      isAvailable(task.claimedTarget) && !task.claimedTarget.matches(':disabled, [aria-disabled="true"]')) {
      finishRestore();
      return;
    }
    const modal = [...document.querySelectorAll<HTMLElement>('[aria-modal="true"], dialog[open]')]
      .some(isAvailable);
    const active = document.activeElement;
    const validUnclaimedFocus = active !== task.claimedTarget && active instanceof HTMLElement &&
      isAvailable(active) && !active.matches(':disabled, [aria-disabled="true"]');
    if (modal || (validUnclaimedFocus && active !== body && body.contains(active))) {
      finishRestore();
      return;
    }
    if (validUnclaimedFocus && active !== task.activeAtNavigation && active !== document.body && active.matches(actionable)) {
      finishRestore();
      return;
    }

    const target = resolveFocus(body, task.returnFocus);
    const scrollReady = resolveScrollRegions(body, task.returnScroll);
    const returnTargetMissing = Boolean(task.returnFocus && !target);
    const waitingForPendingRender = (returnTargetMissing || !scrollReady) && hasPendingRender(body);
    if (waitingForPendingRender && (task.waitUntil === undefined || Date.now() < task.waitUntil)) {
      // Beds and staff rows can arrive after the route's first paint. Observe
      // the loading surface briefly, then use the bounded heading/body
      // fallback even if a request never resolves.
      scheduleRestoreFallback(task);
      if (watchForRenderedReturnTarget(body, task)) return;
      scheduleRestoreFrame();
      return;
    }

    finishRestore();
    const focusTarget = target ?? [...body.querySelectorAll<HTMLElement>('h1')].find(isAvailable) ?? body;
    if (!focusTarget.hasAttribute('tabindex') &&
      !focusTarget.matches('a[href], button, input, select, textarea, [contenteditable="true"]')) {
      focusTarget.setAttribute('tabindex', '-1');
      const restore = () => {
        if (focusTarget.getAttribute('tabindex') === '-1') focusTarget.removeAttribute('tabindex');
        focusTarget.removeEventListener('blur', restore);
        if (restoreTabIndex === restore) restoreTabIndex = undefined;
      };
      restoreTabIndex = restore;
      focusTarget.addEventListener('blur', restore, { once: true });
    }
    focusTarget.focus({ preventScroll: true });
  }

  function cancelPending() {
    generation++;
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    frame = undefined;
    clearRestoreObserver();
    clearRestoreFallbackTimer();
    pendingRestore = undefined;
  }

  // A newer navigation also invalidates work queued by the previous page.
  const removeHistoryListener = history.listen((to, _from, information) => {
    captureDeparture();
    cancelPending();
    pendingPop = { path: to, position: readPosition() ?? position + information.delta };
  });
  const removeBeforeEach = router.beforeEach(to => {
    cancelPending();
    captureDeparture();
    navigationFocus.set(to, document.activeElement);
  });
  const removeAfterEach = router.afterEach(async (to, from, failure) => {
    cancelPending();
    const claimedTarget = focusClaims.get(router)?.get(to);
    focusClaims.get(router)?.delete(to);
    const pop = pendingPop?.path === to.fullPath ? pendingPop : undefined;
    pendingPop = undefined;
    if (failure) return;
    const previousPosition = position;
    position = readPosition() ?? pop?.position ?? position + 1;
    if (!pop && position > previousPosition) {
      // A push after Back discards the browser's former forward branch.
      for (const entry of entries.keys()) if (entry >= position) entries.delete(entry);
      for (const entry of scrollEntries.keys()) if (entry >= position) scrollEntries.delete(entry);
    }
    const returnFocus = pop ? entries.get(position) : undefined;
    const returnScroll = pop ? scrollEntries.get(position) ?? [] : [];
    if (to.path === from.path || !from.matched.length) return;
    restoreTabIndex?.();
    const currentGeneration = generation;
    const activeAtNavigation = navigationFocus.has(to) ? navigationFocus.get(to) : document.activeElement;
    navigationFocus.delete(to);
    await nextTick();
    if (currentGeneration !== generation) return;
    if (!pop) resetLocalScrollRegions(workspaceBody.value);
    // Let page mount hooks and closing dialogs finish their own focus work first.
    pendingRestore = {
      generation: currentGeneration,
      returnFocus,
      returnScroll,
      activeAtNavigation: activeAtNavigation ?? null,
      claimedTarget
    };
    scheduleRestoreFrame();
  });

  onBeforeUnmount(() => {
    cancelPending();
    removeBeforeEach();
    removeAfterEach();
    removeHistoryListener();
    entries.clear();
    scrollEntries.clear();
    clearRestoreObserver();
    pendingRestore = undefined;
    restoreTabIndex?.();
  });
}
