import { getCurrentInstance, onBeforeUnmount, readonly, ref } from 'vue';
import * as vueRouter from 'vue-router';

export type SuccessRedirectHandle = { cancel: () => void };
type RedirectCallback = () => unknown;

const SUCCESS_FLASH_STORAGE_KEY = 'cvg-pulse.success-flash.v1';
const pendingSuccessFlash = ref(false);
let pendingSuccessActivationCancel: (() => void) | null = null;

/**
 * The shell calls this whenever the destination changes again before the
 * post-navigation announcement paints. A success belongs to the destination
 * that completed the write; it must never leak into a later route.
 */
export function cancelPendingSuccessFlashActivation() {
  const cancel = pendingSuccessActivationCancel;
  pendingSuccessActivationCancel = null;
  cancel?.();
}

function readStoredSuccessFlash(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const message = window.sessionStorage.getItem(SUCCESS_FLASH_STORAGE_KEY);
    window.sessionStorage.removeItem(SUCCESS_FLASH_STORAGE_KEY);
    return message?.trim() || null;
  } catch {
    return null;
  }
}

const successFlashMessage = ref<string | null>(readStoredSuccessFlash());

function persistSuccessFlash(message: string) {
  const normalized = message.trim();
  if (!normalized) return;
  if (typeof window === 'undefined') return;
  try {
    // The message is a generic confirmation, never a patient, tutor or
    // clinical payload. Storage keeps it available across full-page redirects.
    window.sessionStorage.setItem(SUCCESS_FLASH_STORAGE_KEY, normalized);
  } catch {
    // Private browsing and storage quotas must not turn a confirmed save into
    // a failed navigation.
  }
}

function removePersistedSuccessFlash() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SUCCESS_FLASH_STORAGE_KEY);
  } catch {
    // Storage is best effort; the in-memory notice remains authoritative.
  }
}

function activateSuccessFlash(message: string) {
  const normalized = message.trim();
  if (!normalized) return;
  successFlashMessage.value = normalized;
  pendingSuccessFlash.value = false;
  removePersistedSuccessFlash();
}

/** Publishes immediately for callers that are already on the destination view. */
export function publishSuccessFlash(message: string) {
  const normalized = message.trim();
  if (!normalized) return;
  persistSuccessFlash(normalized);
  successFlashMessage.value = normalized;
  pendingSuccessFlash.value = false;
}

export function clearSuccessFlash() {
  successFlashMessage.value = null;
  pendingSuccessFlash.value = false;
  removePersistedSuccessFlash();
}

export function useSuccessFlash() {
  return {
    message: readonly(successFlashMessage),
    pending: readonly(pendingSuccessFlash),
    clear: clearSuccessFlash
  };
}

type RouteGuardName = 'onBeforeRouteLeave' | 'onBeforeRouteUpdate';

function registerRouteGuard(name: RouteGuardName, callback: () => void) {
  // Vitest's minimal module mocks expose only the router APIs used by a
  // fixture. Checking ownership avoids touching a missing export through the
  // mock proxy, while production vue-router always owns both functions.
  if (!Object.prototype.hasOwnProperty.call(vueRouter, name)) return;
  const guard = (vueRouter as unknown as Record<string, unknown>)[name];
  if (typeof guard === 'function') {
    (guard as (callback: () => void) => void)(callback);
  }
}

function scheduleSuccessFlashActivation(
  message: string,
  onActivated: () => void
): SuccessRedirectHandle {
  let cancelled = false;
  let frame: number | undefined;

  const activate = () => {
    if (cancelled) return;
    activateSuccessFlash(message);
    onActivated();
  };

  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (
    !reducedMotion &&
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function'
  ) {
    // This frame belongs to the destination shell, after the route callback.
    // It prevents the source form's local alert and shell flash from coexisting.
    frame = window.requestAnimationFrame(activate);
    return {
      cancel() {
        cancelled = true;
        if (frame !== undefined && typeof window.cancelAnimationFrame === 'function') {
          window.cancelAnimationFrame(frame);
        }
      }
    };
  }

  queueMicrotask(activate);
  return {
    cancel() {
      cancelled = true;
    }
  };
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  ) && typeof (value as { then?: unknown }).then === 'function';
}

function isNavigationFailureResult(value: unknown): boolean {
  if (value == null) return false;
  const checker = (vueRouter as unknown as Record<string, unknown>).isNavigationFailure;
  if (typeof checker === 'function') {
    return (checker as (candidate: unknown) => boolean)(value);
  }
  // A real vue-router push resolves with undefined on success. Minimal test
  // doubles may omit isNavigationFailure, so any defined result is treated as
  // a failed navigation rather than displaying a false confirmation.
  return true;
}

/**
 * Lets the success state commit before navigation without introducing a
 * duration-based JavaScript wait. The route animation itself is owned by the
 * shell's CSS motion tokens; this boundary is a pair of cancelable paint
 * frames so the confirmed message is observable under real browser scheduling.
 */
export function scheduleSuccessRedirect(
  callback: RedirectCallback
): SuccessRedirectHandle {
  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cancelled = false;
  let firstFrame: number | undefined;
  let secondFrame: number | undefined;
  const commit = () => {
    if (!cancelled) callback();
  };
  const scheduleSecondFrame = () => {
    if (cancelled) return;
    secondFrame = window.requestAnimationFrame(commit);
  };

  if (!reducedMotion && typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    // The first frame lets Vue commit the success alert; the second keeps it
    // observable for one complete paint before the route is replaced. Both
    // frames remain cancelable, so a route change or unmount wins immediately.
    firstFrame = window.requestAnimationFrame(scheduleSecondFrame);
    return {
      cancel() {
        cancelled = true;
        if (typeof window.cancelAnimationFrame === 'function') {
          if (firstFrame !== undefined) window.cancelAnimationFrame(firstFrame);
          if (secondFrame !== undefined) window.cancelAnimationFrame(secondFrame);
        }
      }
    };
  }

  queueMicrotask(commit);
  return { cancel: () => { cancelled = true; } };
}

/**
 * Owns the feedback scheduling handle for a form instance. A standalone
 * callback cannot know when its component has left the route, so form pages
 * use this controller to cancel pending feedback on teardown, route updates
 * and a new submission.
 */
export function useSuccessRedirect() {
  let pendingHandle: SuccessRedirectHandle | null = null;
  let pendingActivationHandle: SuccessRedirectHandle | null = null;
  let pendingActivationCancel: (() => void) | null = null;
  let active = true;
  let generation = 0;
  let routeInvalidated = false;
  let phase: 'idle' | 'scheduled' | 'navigating' = 'idle';
  let navigationGeneration = 0;
  let navigationCancelled = false;
  const successPending = ref(false);

  function clearPendingRedirect() {
    if (pendingHandle !== null) {
      pendingHandle.cancel();
      pendingHandle = null;
    }
  }

  function clearPendingActivation() {
    if (pendingActivationHandle !== null) {
      pendingActivationHandle.cancel();
      pendingActivationHandle = null;
    }
    if (pendingActivationCancel !== null) {
      if (pendingSuccessActivationCancel === pendingActivationCancel) {
        pendingSuccessActivationCancel = null;
      }
      pendingActivationCancel = null;
    }
  }

  function cancel() {
    generation += 1;
    clearPendingRedirect();
    clearPendingActivation();
    if (phase === 'navigating') {
      navigationCancelled = true;
      removePersistedSuccessFlash();
    }
    phase = 'idle';
    successPending.value = false;
    pendingSuccessFlash.value = false;
  }

  /**
   * Starts a new write cycle. A form cannot start a second write while the
   * previous success announcement is still pending its route transition.
   */
  function begin() {
    if (!active || phase !== 'idle' || successPending.value) return false;
    routeInvalidated = false;
    generation += 1;
    clearPendingRedirect();
    clearPendingActivation();
    return true;
  }

  /** Invalidates the current route/write cycle until a new submission begins. */
  function invalidate() {
    // The route guard also runs for the expected SPA navigation started by
    // this controller. Keep that navigation alive; its resolved result is the
    // source of truth for whether the persisted flash may be activated.
    if (phase === 'navigating') return;
    routeInvalidated = true;
    cancel();
  }

  function settleNavigation(
    result: unknown,
    successMessage: string | undefined,
    settledGeneration: number
  ) {
    if (
      phase !== 'navigating' ||
      navigationGeneration !== settledGeneration ||
      navigationCancelled
    ) {
      return;
    }

    if (isNavigationFailureResult(result)) {
      removePersistedSuccessFlash();
      phase = 'idle';
      successPending.value = false;
      pendingSuccessFlash.value = false;
      return;
    }

    const normalizedSuccessMessage = successMessage?.trim();
    if (!normalizedSuccessMessage) {
      phase = 'idle';
      successPending.value = false;
      pendingSuccessFlash.value = false;
      return;
    }

    // A previous controller cannot keep a global announcement alive once a
    // later navigation has completed. Only one destination owns the global
    // flash at a time.
    cancelPendingSuccessFlashActivation();

    // Do not tie this destination-shell activation to the source component's
    // lifetime: a successful SPA navigation unmounts that component before
    // the next paint. The activation handle still prevents a second write on
    // a same-route form from racing the old flash.
    const activationHandle = scheduleSuccessFlashActivation(
      normalizedSuccessMessage,
      () => {
        pendingActivationHandle = null;
        if (pendingActivationCancel !== null) {
          if (pendingSuccessActivationCancel === pendingActivationCancel) {
            pendingSuccessActivationCancel = null;
          }
          pendingActivationCancel = null;
        }
        phase = 'idle';
        successPending.value = false;
      }
    );
    pendingActivationHandle = activationHandle;
    const cancelActivation = () => {
      if (pendingActivationHandle !== activationHandle) return;
      activationHandle.cancel();
      pendingActivationHandle = null;
      if (pendingSuccessActivationCancel === cancelActivation) {
        pendingSuccessActivationCancel = null;
      }
      pendingActivationCancel = null;
      removePersistedSuccessFlash();
      navigationCancelled = true;
      routeInvalidated = true;
      phase = 'idle';
      successPending.value = false;
      pendingSuccessFlash.value = false;
    };
    pendingActivationCancel = cancelActivation;
    pendingSuccessActivationCancel = cancelActivation;
  }

  function schedule(
    callback: RedirectCallback,
    successMessage?: string
  ): SuccessRedirectHandle | undefined {
    if (!active || routeInvalidated || phase !== 'idle' || pendingActivationHandle !== null) {
      return undefined;
    }
    clearPendingRedirect();
    const scheduledGeneration = ++generation;
    phase = 'scheduled';
    successPending.value = true;
    pendingSuccessFlash.value = Boolean(successMessage?.trim());
    pendingHandle = scheduleSuccessRedirect(() => {
      pendingHandle = null;
      const canRedirect =
        active && !routeInvalidated && generation === scheduledGeneration && phase === 'scheduled';
      if (!canRedirect) {
        pendingSuccessFlash.value = false;
        return;
      }
      const normalizedSuccessMessage = successMessage?.trim();
      if (normalizedSuccessMessage) persistSuccessFlash(normalizedSuccessMessage);
      phase = 'navigating';
      navigationCancelled = false;
      navigationGeneration = scheduledGeneration;
      let navigation: unknown;
      try {
        navigation = callback();
      } catch (error) {
        removePersistedSuccessFlash();
        phase = 'idle';
        successPending.value = false;
        pendingSuccessFlash.value = false;
        throw error;
      }

      if (isPromiseLike(navigation)) {
        // Vue Router resolves after its navigation guards have settled. The
        // following paint frame then belongs to the destination shell, but
        // only when the resolved value is not a NavigationFailure.
        void Promise.resolve(navigation).then(
          (result) => settleNavigation(result, normalizedSuccessMessage, scheduledGeneration),
          () => {
            removePersistedSuccessFlash();
            if (
              phase === 'navigating' &&
              navigationGeneration === scheduledGeneration &&
              !navigationCancelled
            ) {
              phase = 'idle';
              successPending.value = false;
              pendingSuccessFlash.value = false;
            }
          }
        );
      } else {
        // Full-page navigations do not return a promise; persistence above
        // carries the message into the new document. The same activation
        // path keeps synchronous test doubles deterministic.
        settleNavigation(undefined, normalizedSuccessMessage, scheduledGeneration);
      }
    });
    return pendingHandle;
  }

  // Some composable consumers are unit-tested outside a component setup. Do
  // not register lifecycle hooks in that context; the pure scheduler remains
  // usable there and the controller can still be cancelled explicitly.
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      active = false;
      if (phase !== 'navigating') invalidate();
    });
    registerRouteGuard('onBeforeRouteLeave', invalidate);
    registerRouteGuard('onBeforeRouteUpdate', invalidate);
  }

  return {
    schedule,
    begin,
    cancel,
    invalidate,
    successPending: readonly(successPending)
  };
}
